import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/store/editorStore';
import { Loader2, Lock, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isExecutableLanguage } from '@/lib/sandboxExecutor';

interface CollaboratorCursor {
  userId: string;
  userName: string;
  color: number;
  line: number;
  column: number;
  filePath: string;
}

interface MonacoEditorProps {
  className?: string;
  onContentChange?: (fileId: string, content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  collaboratorCursors?: CollaboratorCursor[];
  readOnly?: boolean;
  readOnlyReason?: string;
}

interface QuickExecutionResult {
  output: string[];
  error?: string;
  success: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onContentChange,
  onCursorChange,
  collaboratorCursors = [],
  readOnly = false,
  readOnlyReason,
}) => {
  const {
    tabs,
    activeTabId,
    updateFileContent,
    setActiveBottomPanel,
    setSelectedCode,
    editorFontSize,
    editorWordWrap,
    editorMinimap,
    htmlPreviewLayout,
    setHtmlPreviewLayout,
  } = useEditorStore();

  const [quickResult, setQuickResult] = useState<QuickExecutionResult | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  useEffect(() => {
    setSelectedCode('');
  }, [activeTabId, setSelectedCode]);

  const editorOptions = {
    fontSize: editorFontSize,
    fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: editorMinimap, scale: 1 },
    wordWrap: editorWordWrap,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: { enabled: true },
    padding: { top: 14 },
    lineNumbers: 'on' as const,
    glyphMargin: true,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 4,
    renderLineHighlight: 'all' as const,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false,
    },
    readOnly,
  };

  const handleEditorChange = (value: string | undefined) => {
    if (readOnly) return;

    if (activeTab && value !== undefined) {
      updateFileContent(activeTab.fileId, value);
      onContentChange?.(activeTab.fileId, value);
    }
  };

  const { setTriggerRun } = useEditorStore();

  const handleRunCode = () => {
    if (!activeTab) return;
    const language = activeTab.language;
    const isHtml = language.toLowerCase() === 'html' || language.toLowerCase() === 'css';
    if (isHtml) { if (htmlPreviewLayout === 'editor') setHtmlPreviewLayout('split'); return; }
    if (!isExecutableLanguage(language)) { setActiveBottomPanel('terminal'); return; }
    setActiveBottomPanel('terminal');
    setQuickResult(null);
    setTriggerRun(Date.now());
  };

  if (!activeTab) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full bg-editor text-muted-foreground', className)}>
        <Code className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-medium mb-2">No file open</h3>
        <p className="text-sm">Select a file from the explorer to start editing</p>
        <div className="mt-8 text-xs space-y-1">
          <p><span className="kbd">Ctrl</span> + <span className="kbd">P</span> Quick open</p>
          <p><span className="kbd">Ctrl</span> + <span className="kbd">Shift</span> + <span className="kbd">P</span> Command palette</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full bg-editor', className)}>
      {readOnly && (
        <div className="absolute top-2 left-4 z-20 flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
          <Lock className="h-3.5 w-3.5" />
          <span>{readOnlyReason || "Read-only: file is locked"}</span>
        </div>
      )}

      {collaboratorCursors.length > 0 && (
        <div className="absolute top-2 right-6 z-10 flex items-center gap-1.5">
          {collaboratorCursors
            .filter((cursor) => cursor.filePath === activeTab.path)
            .map((cursor) => (
              <div
                key={cursor.userId}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium"
                style={{ backgroundColor: `hsl(var(--user-${cursor.color}))` }}
              >
                <span className="text-primary-foreground">{cursor.userName}</span>
                <span className="text-primary-foreground/70">L{cursor.line}</span>
              </div>
            ))}
        </div>
      )}

      {quickResult && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-h-48 overflow-auto rounded-sm border border-border bg-card/95 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className={cn('text-xs font-medium', quickResult.success ? 'text-primary' : 'text-destructive')}>
              {quickResult.success ? '[ok] Execution Complete' : '[error] Execution Failed'}
            </span>
            <button onClick={() => setQuickResult(null)} className="text-muted-foreground hover:text-foreground text-xs">
              Close
            </button>
          </div>
          <div className="p-3 font-mono text-xs space-y-1">
            {quickResult.output.map((line, index) => (
              <div key={index} className="text-foreground whitespace-pre-wrap">{line}</div>
            ))}
            {quickResult.error && <div className="text-destructive whitespace-pre-wrap">{quickResult.error}</div>}
            {quickResult.output.length === 0 && !quickResult.error && (
              <div className="text-muted-foreground italic">No output</div>
            )}
          </div>
        </div>
      )}

      <Editor
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={editorOptions}
        loading={
          <div className="flex items-center justify-center h-full bg-editor">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
        beforeMount={(monaco) => {
          // ── TypeScript / JSX config ─────────────────────────
          const tsDefaults = monaco.languages.typescript.typescriptDefaults;
          const jsDefaults = monaco.languages.typescript.javascriptDefaults;

          const sharedCompilerOptions = {
            target: monaco.languages.typescript.ScriptTarget.Latest,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            allowJs: true,
            strict: false,
            noImplicitAny: false,
            skipLibCheck: true,
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
          };

          tsDefaults.setCompilerOptions(sharedCompilerOptions);
          jsDefaults.setCompilerOptions({ ...sharedCompilerOptions, checkJs: false });

          // Suppress "Cannot find module" errors by catching all unknown imports
          const moduleStub = `declare module '*';`;

          // Minimal React stubs so hooks / JSX / FC don't flag as unknown
          const reactStub = `
declare module 'react' {
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
  export type ReactElement = { type: any; props: any; key: any; };
  export type CSSProperties = { [key: string]: string | number | undefined };
  export type Ref<T> = { current: T | null };
  export type MutableRefObject<T> = { current: T };
  export type ChangeEvent<T> = { target: T & { value: string; checked: boolean } };
  export type MouseEvent<T = Element> = { target: T; currentTarget: T; preventDefault(): void; stopPropagation(): void };
  export type KeyboardEvent<T = Element> = { key: string; code: string; target: T; preventDefault(): void };
  export type FormEvent<T = Element> = { target: T; preventDefault(): void };
  export type ComponentType<P = {}> = FC<P>;
  export type Context<T> = { Provider: FC<{ value: T; children?: ReactNode }>; Consumer: any; displayName?: string };
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: () => (void | (() => void)), deps?: ReadonlyArray<unknown>): void;
  export function useLayoutEffect(effect: () => (void | (() => void)), deps?: ReadonlyArray<unknown>): void;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): Ref<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<unknown>): T;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<unknown> | null): T;
  export function useContext<T>(context: Context<T>): T;
  export function useReducer<R extends (prevState: any, action: any) => any>(reducer: R, initialState: Parameters<R>[0]): [Parameters<R>[0], Dispatch<Parameters<R>[1]>];
  export function createContext<T>(defaultValue: T): Context<T>;
  export function memo<T extends ComponentType<any>>(component: T): T;
  export function forwardRef<T, P = {}>(render: (props: P, ref: Ref<T>) => ReactElement | null): FC<P & { ref?: Ref<T> }>;
  export function createPortal(children: ReactNode, container: Element): ReactElement;
  export const Fragment: FC<{ children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;
  export const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>;
  export function lazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): T;
  export default React;
  declare namespace React {
    export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
    export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[];
    export type ReactElement = { type: any; props: any; key: any; };
    export type CSSProperties = { [key: string]: string | number | undefined };
  }
}
declare global {
  namespace JSX {
    interface Element {}
    interface IntrinsicElements { [elemName: string]: any }
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: string | number }
  }
}`;

          tsDefaults.addExtraLib(reactStub, 'ts:react.d.ts');
          tsDefaults.addExtraLib(moduleStub, 'ts:module-stub.d.ts');
          jsDefaults.addExtraLib(reactStub, 'ts:react.d.ts');
          jsDefaults.addExtraLib(moduleStub, 'ts:module-stub.d.ts');

          monaco.editor.defineTheme('vscode-dark-plus', {
            base: 'vs-dark',
            inherit: true,
            rules: [
              { token: 'comment', foreground: '6A9955' },
              { token: 'keyword', foreground: '569CD6' },
              { token: 'string', foreground: 'CE9178' },
              { token: 'number', foreground: 'B5CEA8' },
              { token: 'type', foreground: '4EC9B0' },
              { token: 'function', foreground: 'DCDCAA' },
              { token: 'variable', foreground: '9CDCFE' },
              { token: 'operator', foreground: 'D4D4D4' },
            ],
            colors: {
              'editor.background': '#1E1E1E',
              'editor.foreground': '#D4D4D4',
              'editor.lineHighlightBackground': '#2A2D2E',
              'editor.selectionBackground': '#264F78',
              'editorLineNumber.foreground': '#858585',
              'editorLineNumber.activeForeground': '#C6C6C6',
              'editorCursor.foreground': '#AEAFAD',
              'editor.selectionHighlightBackground': '#ADD6FF26',
              'editorBracketMatch.background': '#0064001A',
              'editorBracketMatch.border': '#888888',
              'editorGutter.background': '#1E1E1E',
              'editorWidget.background': '#252526',
              'editorWidget.border': '#454545',
              'input.background': '#3C3C3C',
              'input.border': '#3C3C3C',
              'dropdown.background': '#3C3C3C',
              'dropdown.border': '#3C3C3C',
              'list.hoverBackground': '#2A2D2E',
              'list.activeSelectionBackground': '#094771',
              'scrollbarSlider.background': '#79797966',
              'scrollbarSlider.hoverBackground': '#646464B3',
              'scrollbarSlider.activeBackground': '#BFBFBF66',
            },
          });
        }}
        onMount={(editor, monaco) => {
          monaco.editor.setTheme('vscode-dark-plus');

          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            handleRunCode();
          });

          editor.onDidChangeCursorPosition((event) => {
            onCursorChange?.(event.position.lineNumber, event.position.column);
          });

          editor.onDidChangeCursorSelection((event) => {
            const model = editor.getModel();
            const selection = event.selection;

            if (!model || selection.isEmpty()) {
              setSelectedCode('');
              return;
            }

            const selectionText = model.getValueInRange(selection).trim();
            setSelectedCode(selectionText);
          });
        }}
      />
    </div>
  );
};
