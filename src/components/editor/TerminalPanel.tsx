import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Play,
  RefreshCcw,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  executeCode as runCode,
  getLanguageInfo,
  isExecutableLanguage,
  SupportedLanguage,
} from '@/lib/sandboxExecutor';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageFromFileName } from '@/types/editor';
import { buildHtmlPreviewDocument } from '@/lib/htmlPreview';
import {
  formatShellPath,
  getNodeByPath,
  getParentProjectPath,
  listDirectory,
  resolveProjectPath,
  tokenizeCommand,
} from '@/lib/terminalShell';

interface TerminalPanelProps {
  className?: string;
  onClose?: () => void;
  codeToRun?: string;
  language?: string;
  filePath?: string;
  fileName?: string;
}

interface TerminalLine {
  type: 'prompt' | 'output' | 'error' | 'info' | 'success';
  content: string;
}

interface PreviewMessage {
  level: string;
  message: string;
}

type TerminalSurface = 'terminal' | 'preview';

const INITIAL_LINES: TerminalLine[] = [
  { type: 'info', content: 'CodeCollab Shell [browser sandbox]' },
  { type: 'info', content: 'Use "help" for commands. HTML files open in Preview.' },
  { type: 'output', content: '' },
];

const spacerLine = (): TerminalLine => ({ type: 'output', content: '' });

const previewConsoleTypeToLineType = (
  level: string
): TerminalLine['type'] => {
  if (level === 'error') {
    return 'error';
  }

  if (level === 'warn') {
    return 'info';
  }

  return 'output';
};

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  className,
  onClose,
  codeToRun,
  language = 'javascript',
  filePath,
  fileName,
}) => {
  const { files, currentUser } = useEditorStore();
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const previewSessionRef = useRef<string>('');
  const historyDraftRef = useRef('');

  const homeDirectory = useMemo(
    () => (filePath ? getParentProjectPath(filePath) : '/'),
    [filePath]
  );

  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>(INITIAL_LINES);
  const [currentDirectory, setCurrentDirectory] = useState(homeDirectory);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [activeSurface, setActiveSurface] = useState<TerminalSurface>(
    language === 'html' ? 'preview' : 'terminal'
  );
  const [previewDocument, setPreviewDocument] = useState('');
  const [previewSourcePath, setPreviewSourcePath] = useState<string | null>(null);
  const [previewNotices, setPreviewNotices] = useState<string[]>([]);
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewKey, setPreviewKey] = useState(0);

  const shellUser =
    String(currentUser?.name || 'guest')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') || 'guest';
  const promptLabel = `${shellUser}@codecollab:${formatShellPath(
    currentDirectory,
    homeDirectory
  )}$`;
  const canPreviewCurrentFile = language === 'html' && Boolean(filePath);
  const canRunCurrentFile =
    Boolean(codeToRun) &&
    (canPreviewCurrentFile || isExecutableLanguage(language));

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (language === 'html' && filePath) {
      setActiveSurface('preview');
    }
  }, [language, filePath]);

  useEffect(() => {
    setCurrentDirectory(homeDirectory);
  }, [homeDirectory]);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (event.source !== previewFrameRef.current?.contentWindow) {
        return;
      }

      const data = event.data;
      if (
        !data ||
        data.type !== 'codecollab-preview' ||
        data.sessionKey !== previewSessionRef.current
      ) {
        return;
      }

      setLines((prev) => [
        ...prev,
        {
          type: previewConsoleTypeToLineType(String(data.level || 'log')),
          content: `[preview:${String(data.level || 'log')}] ${String(
            data.message || ''
          )}`,
        },
      ]);
      setPreviewMessages((prev) => [
        ...prev,
        {
          level: String(data.level || 'log'),
          message: String(data.message || ''),
        },
      ]);
    };

    window.addEventListener('message', handlePreviewMessage);
    return () => {
      window.removeEventListener('message', handlePreviewMessage);
    };
  }, []);

  useEffect(() => {
    if (!canPreviewCurrentFile || !filePath) {
      if (activeSurface === 'preview' && !previewSourcePath) {
        setActiveSurface('terminal');
      }
      return;
    }

    const sessionKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    previewSessionRef.current = sessionKey;

    const result = buildHtmlPreviewDocument({
      html: codeToRun || '',
      currentFilePath: filePath,
      files,
      sessionKey,
    });

    setPreviewDocument(result.document);
    setPreviewSourcePath(filePath);
    setPreviewNotices(result.notices);
    setPreviewMessages([]);
    setPreviewKey((prev) => prev + 1);
  }, [
    canPreviewCurrentFile,
    codeToRun,
    filePath,
    files,
    activeSurface,
    previewSourcePath,
  ]);

  const appendLines = (nextLines: TerminalLine[]) => {
    setLines((prev) => [...prev, ...nextLines]);
  };

  const executeCode = async (code: string, lang: SupportedLanguage) => {
    setIsRunning(true);

    const langInfo = getLanguageInfo(lang);
    const loadingMessage =
      lang === 'python'
        ? 'Loading Python environment (first run may take a moment)...'
        : `Executing ${langInfo.name}...`;

    appendLines([{ type: 'info', content: loadingMessage }]);

    try {
      const result = await runCode(code, lang);

      const outputLines: TerminalLine[] = result.output.map((line) => ({
        type: 'output',
        content: line,
      }));

      if (result.error) {
        outputLines.push({ type: 'error', content: `Error: ${result.error}` });
      }

      outputLines.push({
        type: result.success ? 'success' : 'error',
        content: result.success
          ? `[ok] Completed in ${result.executionTime.toFixed(2)}ms`
          : `[error] Failed after ${result.executionTime.toFixed(2)}ms`,
      });
      outputLines.push(spacerLine());

      appendLines(outputLines);
      setActiveSurface('terminal');
    } catch (error) {
      appendLines([
        {
          type: 'error',
          content: `Execution failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
        spacerLine(),
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const openHtmlPreview = (
    html: string,
    sourcePath: string,
    announce = true
  ) => {
    const sessionKey = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    previewSessionRef.current = sessionKey;

    const result = buildHtmlPreviewDocument({
      html,
      currentFilePath: sourcePath,
      files,
      sessionKey,
    });

    setPreviewDocument(result.document);
    setPreviewSourcePath(sourcePath);
    setPreviewNotices(result.notices);
    setPreviewMessages([]);
    setPreviewKey((prev) => prev + 1);
    setActiveSurface('preview');

    if (announce) {
      appendLines([
        { type: 'success', content: `[preview] Loaded ${sourcePath}` },
        ...result.notices.map((notice) => ({
          type: 'info' as const,
          content: `[preview] ${notice}`,
        })),
        spacerLine(),
      ]);
    }
  };

  const executeCurrentFile = async () => {
    if (canPreviewCurrentFile && filePath) {
      openHtmlPreview(codeToRun || '', filePath);
      return;
    }

    if (codeToRun && isExecutableLanguage(language)) {
      await executeCode(codeToRun, language as SupportedLanguage);
      return;
    }

    appendLines([
      {
        type: 'error',
        content: `Cannot run ${language || 'this file'} from the browser sandbox.`,
      },
      spacerLine(),
    ]);
  };

  const runFileAtPath = async (requestedPath: string) => {
    const resolvedPath = resolveProjectPath(
      currentDirectory,
      requestedPath,
      homeDirectory
    );
    const node = getNodeByPath(files, resolvedPath);

    if (!node) {
      appendLines([
        { type: 'error', content: `File not found: ${resolvedPath}` },
        spacerLine(),
      ]);
      return;
    }

    if (node.type !== 'file') {
      appendLines([
        { type: 'error', content: `Not a file: ${resolvedPath}` },
        spacerLine(),
      ]);
      return;
    }

    const nodeLanguage = node.language || getLanguageFromFileName(node.name);
    if (nodeLanguage === 'html') {
      openHtmlPreview(node.content || '', resolvedPath);
      return;
    }

    if (!isExecutableLanguage(nodeLanguage)) {
      appendLines([
        {
          type: 'error',
          content: `Cannot run ${node.name}. Supported: JavaScript, TypeScript, Python, HTML preview.`,
        },
        spacerLine(),
      ]);
      return;
    }

    await executeCode(node.content || '', nodeLanguage as SupportedLanguage);
  };

  const previewFileAtPath = (requestedPath?: string) => {
    if (!requestedPath) {
      if (canPreviewCurrentFile && filePath) {
        openHtmlPreview(codeToRun || '', filePath);
        return;
      }

      appendLines([
        { type: 'error', content: 'No HTML file selected. Use: preview path/to/file.html' },
        spacerLine(),
      ]);
      return;
    }

    const resolvedPath = resolveProjectPath(
      currentDirectory,
      requestedPath,
      homeDirectory
    );
    const node = getNodeByPath(files, resolvedPath);

    if (!node) {
      appendLines([
        { type: 'error', content: `File not found: ${resolvedPath}` },
        spacerLine(),
      ]);
      return;
    }

    if (node.type !== 'file') {
      appendLines([
        { type: 'error', content: `Not a file: ${resolvedPath}` },
        spacerLine(),
      ]);
      return;
    }

    const nodeLanguage = node.language || getLanguageFromFileName(node.name);
    if (nodeLanguage !== 'html') {
      appendLines([
        { type: 'error', content: `${node.name} is not an HTML file.` },
        spacerLine(),
      ]);
      return;
    }

    openHtmlPreview(node.content || '', resolvedPath);
  };

  const resetSession = () => {
    setLines(INITIAL_LINES);
    setInputValue('');
    setCommandHistory([]);
    setHistoryIndex(null);
    historyDraftRef.current = '';
    setCurrentDirectory(homeDirectory);

    if (canPreviewCurrentFile && filePath) {
      openHtmlPreview(codeToRun || '', filePath, false);
      setActiveSurface('preview');
      return;
    }

    setPreviewDocument('');
    setPreviewNotices([]);
    setPreviewMessages([]);
    setPreviewSourcePath(null);
    setActiveSurface('terminal');
  };

  const handleCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }

    appendLines([{ type: 'prompt', content: `${promptLabel} ${trimmed}` }]);
    setInputValue('');
    setCommandHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(null);
    historyDraftRef.current = '';

    if (trimmed.startsWith('js ')) {
      await executeCode(trimmed.slice(3), 'javascript');
      return;
    }

    if (trimmed.startsWith('ts ')) {
      await executeCode(trimmed.slice(3), 'typescript');
      return;
    }

    if (trimmed.startsWith('py ') || trimmed.startsWith('python ')) {
      const pythonCode = trimmed.startsWith('py ')
        ? trimmed.slice(3)
        : trimmed.slice(7);
      await executeCode(pythonCode, 'python');
      return;
    }

    const [commandName, ...args] = tokenizeCommand(trimmed);

    switch (commandName) {
      case 'help':
        appendLines([
          { type: 'output', content: 'Available commands:' },
          { type: 'info', content: '  help                Show this help message' },
          { type: 'info', content: '  clear               Clear the terminal output' },
          { type: 'info', content: '  pwd                 Print current directory' },
          { type: 'info', content: '  ls [path]           List files and folders' },
          { type: 'info', content: '  cd [path]           Change current directory' },
          { type: 'info', content: '  cat <file>          Print file contents' },
          { type: 'info', content: '  echo <text>         Print text' },
          { type: 'info', content: '  date                Show current local time' },
          { type: 'info', content: '  whoami              Show shell user' },
          { type: 'info', content: '  history             Show command history' },
          { type: 'info', content: '  run [file]          Run JS/TS/Python or preview HTML' },
          { type: 'info', content: '  preview [file]      Open an HTML preview' },
          { type: 'info', content: '  js|ts|py <code>     Run inline code' },
          spacerLine(),
        ]);
        return;

      case 'clear':
        setLines([]);
        return;

      case 'pwd':
        appendLines([
          { type: 'output', content: currentDirectory },
          spacerLine(),
        ]);
        return;

      case 'ls': {
        const targetPath = args[0]
          ? resolveProjectPath(currentDirectory, args[0], homeDirectory)
          : currentDirectory;
        const entries = listDirectory(files, targetPath);

        if (!entries) {
          appendLines([
            { type: 'error', content: `Directory not found: ${targetPath}` },
            spacerLine(),
          ]);
          return;
        }

        appendLines(
          entries.length
            ? [
                {
                  type: 'output',
                  content: entries
                    .map((entry) =>
                      entry.type === 'folder' ? `${entry.name}/` : entry.name
                    )
                    .join('  '),
                },
                spacerLine(),
              ]
            : [{ type: 'info', content: '(empty directory)' }, spacerLine()]
        );
        return;
      }

      case 'cd': {
        const nextDirectory = resolveProjectPath(
          currentDirectory,
          args[0] || '~',
          homeDirectory
        );

        if (nextDirectory !== '/') {
          const node = getNodeByPath(files, nextDirectory);
          if (!node || node.type !== 'folder') {
            appendLines([
              { type: 'error', content: `Directory not found: ${nextDirectory}` },
              spacerLine(),
            ]);
            return;
          }
        }

        setCurrentDirectory(nextDirectory);
        appendLines([spacerLine()]);
        return;
      }

      case 'cat': {
        const requestedPath = args[0];
        if (!requestedPath) {
          appendLines([
            { type: 'error', content: 'Usage: cat <file>' },
            spacerLine(),
          ]);
          return;
        }

        const resolvedPath = resolveProjectPath(
          currentDirectory,
          requestedPath,
          homeDirectory
        );
        const node = getNodeByPath(files, resolvedPath);

        if (!node) {
          appendLines([
            { type: 'error', content: `File not found: ${resolvedPath}` },
            spacerLine(),
          ]);
          return;
        }

        if (node.type !== 'file') {
          appendLines([
            { type: 'error', content: `Not a file: ${resolvedPath}` },
            spacerLine(),
          ]);
          return;
        }

        appendLines([
          {
            type: 'output',
            content: node.content && node.content.length ? node.content : '(empty file)',
          },
          spacerLine(),
        ]);
        return;
      }

      case 'echo':
        appendLines([
          { type: 'output', content: trimmed.slice(5) },
          spacerLine(),
        ]);
        return;

      case 'date':
        appendLines([
          { type: 'output', content: new Date().toLocaleString() },
          spacerLine(),
        ]);
        return;

      case 'whoami':
        appendLines([
          { type: 'output', content: shellUser },
          spacerLine(),
        ]);
        return;

      case 'history':
        appendLines([
          ...commandHistory.map((item, index) => ({
            type: 'output' as const,
            content: `${index + 1}  ${item}`,
          })),
          spacerLine(),
        ]);
        return;

      case 'run':
        if (args[0]) {
          await runFileAtPath(args[0]);
          return;
        }

        await executeCurrentFile();
        return;

      case 'preview':
      case 'open':
        previewFileAtPath(args[0]);
        return;

      default:
        appendLines([
          { type: 'error', content: `Command not found: ${commandName}` },
          { type: 'info', content: 'Type "help" to list supported commands.' },
          spacerLine(),
        ]);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isRunning) {
      handleCommand(inputValue);
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      setLines([]);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!commandHistory.length) {
        return;
      }

      event.preventDefault();

      if (historyIndex === null) {
        historyDraftRef.current = inputValue;
        const nextIndex = commandHistory.length - 1;
        setHistoryIndex(nextIndex);
        setInputValue(commandHistory[nextIndex]);
        return;
      }

      const nextIndex = Math.max(historyIndex - 1, 0);
      setHistoryIndex(nextIndex);
      setInputValue(commandHistory[nextIndex]);
      return;
    }

    if (event.key === 'ArrowDown') {
      if (historyIndex === null) {
        return;
      }

      event.preventDefault();

      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(null);
        setInputValue(historyDraftRef.current);
        return;
      }

      setHistoryIndex(nextIndex);
      setInputValue(commandHistory[nextIndex]);
    }
  };

  const primaryActionLabel = canPreviewCurrentFile ? 'Preview' : 'Run';

  return (
    <div
      className={cn(
        'flex flex-col bg-terminal border-t border-border',
        isMinimized && 'h-10',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 h-8 bg-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Terminal
          </span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-muted text-muted-foreground">
            sandbox
          </span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-sm border border-border text-muted-foreground truncate max-w-[220px]">
            {formatShellPath(currentDirectory, homeDirectory)}
          </span>
          {fileName && (
            <span className="hidden md:inline px-1.5 py-0.5 text-[10px] rounded-sm bg-primary/10 text-primary truncate max-w-[220px]">
              {fileName}
            </span>
          )}
          {isRunning && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-primary/20 text-primary animate-pulse">
              running...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <div className="mr-1 flex items-center rounded-sm border border-border p-0.5">
            <button
              className={cn(
                'px-2 py-1 rounded-sm text-[11px] transition-colors',
                activeSurface === 'terminal'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60'
              )}
              onClick={() => setActiveSurface('terminal')}
            >
              Shell
            </button>
            {previewDocument && (
              <button
                className={cn(
                  'px-2 py-1 rounded-sm text-[11px] transition-colors',
                  activeSurface === 'preview'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                )}
                onClick={() => setActiveSurface('preview')}
              >
                Preview
              </button>
            )}
          </div>

          {canRunCurrentFile && (
            <button
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-primary/40',
                'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
              onClick={executeCurrentFile}
              disabled={isRunning}
              title={canPreviewCurrentFile ? 'Preview current HTML file' : 'Run current file'}
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : canPreviewCurrentFile ? (
                <Eye className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span>{primaryActionLabel}</span>
            </button>
          )}

          <button
            className="p-1 rounded-sm hover:bg-muted"
            title="Clear terminal"
            onClick={() => setLines([])}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded-sm hover:bg-muted"
            title="Reset session"
            onClick={resetSession}
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded-sm hover:bg-muted"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button className="p-1 rounded-sm hover:bg-muted" title="Close" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && activeSurface === 'terminal' && (
        <div
          ref={terminalRef}
          className="flex-1 overflow-auto px-3 py-2 font-mono text-[13px]"
          onClick={() => inputRef.current?.focus()}
        >
          {lines.map((line, index) => (
            <div
              key={`${line.type}-${index}`}
              className={cn(
                'terminal-line whitespace-pre-wrap',
                line.type === 'prompt' && 'terminal-prompt',
                line.type === 'output' && 'terminal-output',
                line.type === 'error' && 'terminal-error',
                line.type === 'info' && 'text-muted-foreground',
                line.type === 'success' && 'text-green-400'
              )}
            >
              {line.content || '\u00A0'}
            </div>
          ))}

          <div className="mt-1 flex items-center">
            <span className="mr-2 terminal-prompt shrink-0">{promptLabel}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-terminal-foreground"
              disabled={isRunning}
              placeholder={isRunning ? 'Running...' : 'Type a command...'}
              autoFocus
            />
            {!isRunning && <span className="w-2 h-4 bg-primary animate-blink" />}
          </div>
        </div>
      )}

      {!isMinimized && activeSurface === 'preview' && (
        <div className="flex min-h-0 flex-1 flex-col bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
            <span className="truncate">
              Previewing {previewSourcePath || filePath || 'HTML file'}
            </span>
            {previewNotices.length > 0 && (
              <span className="rounded-sm bg-warning/10 px-2 py-0.5 text-warning">
                {previewNotices.length} notice{previewNotices.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="min-h-0 flex-1 bg-white">
            {previewDocument ? (
              <iframe
                key={previewKey}
                ref={previewFrameRef}
                title="HTML Preview"
                srcDoc={previewDocument}
                sandbox="allow-scripts"
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-editor text-sm text-muted-foreground">
                No HTML preview available.
              </div>
            )}
          </div>

          {(previewNotices.length > 0 || previewMessages.length > 0) && (
            <div className="max-h-24 overflow-auto border-t border-border bg-terminal px-3 py-2 font-mono text-[12px]">
              {previewNotices.map((notice, index) => (
                <div key={`${notice}-${index}`} className="text-warning">
                  {notice}
                </div>
              ))}
              {previewMessages.map((entry, index) => (
                <div
                  key={`${entry.level}-${entry.message}-${index}`}
                  className={cn(
                    entry.level === 'error' && 'text-destructive',
                    entry.level === 'warn' && 'text-warning',
                    entry.level !== 'error' && entry.level !== 'warn' && 'text-terminal-foreground'
                  )}
                >
                  [{entry.level}] {entry.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
