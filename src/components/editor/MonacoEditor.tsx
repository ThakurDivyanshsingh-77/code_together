import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '@/store/editorStore';
import { Loader2, Code, Play, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { executeCode, isExecutableLanguage, getLanguageInfo, SupportedLanguage } from '@/lib/sandboxExecutor';

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
}) => {
  const {
    tabs,
    activeTabId,
    updateFileContent,
    collaborators,
    cursors,
    setActiveBottomPanel,
    activeBottomPanel
  } = useEditorStore();

  const [isRunning, setIsRunning] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickExecutionResult | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const editorOptions = {
    fontSize: 13,
    fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    fontLigatures: true,
    minimap: { enabled: true, scale: 1 },
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
  };

  const handleEditorChange = (value: string | undefined) => {
    if (activeTab && value !== undefined) {
      updateFileContent(activeTab.fileId, value);
      onContentChange?.(activeTab.fileId, value);
    }
  };

  const handleRunCode = async () => {
    if (!activeTab || isRunning) return;

    const language = activeTab.language;
    if (!isExecutableLanguage(language)) return;

    setIsRunning(true);
    setQuickResult(null);

    try {
      const result = await executeCode(activeTab.content, language as SupportedLanguage);

      setQuickResult({
        output: result.output,
        error: result.error,
        success: result.success,
      });
    } catch (error) {
      setQuickResult({
        output: [],
        error: error instanceof Error ? error.message : 'Execution failed',
        success: false,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenTerminal = () => {
    setActiveBottomPanel('terminal');
    setQuickResult(null);
  };

  const isExecutable = activeTab && isExecutableLanguage(activeTab.language);

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
      {isExecutable && (
        <div className="absolute top-2 left-4 z-10 flex items-center gap-2">
          {(() => {
            const langInfo = getLanguageInfo(activeTab.language);
            return (
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium border border-primary/50',
                  'bg-primary/90 text-primary-foreground hover:bg-primary transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{activeTab.language === 'python' ? 'Loading Python...' : 'Running...'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run {langInfo.icon}</span>
                  </>
                )}
              </button>
            );
          })()}

          <button
            onClick={handleOpenTerminal}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium border border-border',
              'bg-muted text-muted-foreground hover:bg-muted/80 transition-colors',
              activeBottomPanel === 'terminal' && 'ring-1 ring-primary'
            )}
            title="Open Terminal"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {(cursors.length > 0 || collaboratorCursors.length > 0) && (
        <div className="absolute top-2 right-4 z-10 flex items-center gap-2">
          {cursors
            .filter((cursor) => cursor.fileName === activeTab.name)
            .map((cursor) => {
              const user = collaborators.find((entry) => entry.id === cursor.userId);
              if (!user) return null;

              return (
                <div
                  key={cursor.userId}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium"
                  style={{ backgroundColor: `hsl(var(--user-${user.color}))` }}
                >
                  <span className="text-primary-foreground">{user.name}</span>
                  <span className="text-primary-foreground/70">Line {cursor.line}</span>
                </div>
              );
            })}

          {collaboratorCursors
            .filter((cursor) => cursor.filePath === activeTab.path)
            .map((cursor) => (
              <div
                key={cursor.userId}
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium"
                style={{ backgroundColor: `hsl(var(--user-${cursor.color}))` }}
              >
                <span className="text-primary-foreground">{cursor.userName}</span>
                <span className="text-primary-foreground/70">Line {cursor.line}</span>
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
        }}
      />
    </div>
  );
};
