import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Plus,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Play,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  executeCode as runCode,
  isExecutableLanguage,
  getLanguageInfo,
  SupportedLanguage
} from '@/lib/sandboxExecutor';

interface TerminalPanelProps {
  className?: string;
  onClose?: () => void;
  codeToRun?: string;
  language?: string;
}

interface TerminalLine {
  type: 'prompt' | 'output' | 'error' | 'info' | 'success';
  content: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  className,
  onClose,
  codeToRun,
  language = 'javascript'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'info', content: 'CodeCollab Terminal' },
    { type: 'info', content: 'Supports JavaScript, TypeScript, and Python' },
    { type: 'info', content: 'Type "help" for available commands' },
    { type: 'output', content: '' },
  ]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCode = async (code: string, lang: string = 'javascript') => {
    if (!isExecutableLanguage(lang)) {
      setLines((prev) => [
        ...prev,
        { type: 'error', content: `Language "${lang}" is not supported for execution.` },
        { type: 'info', content: 'Supported languages: JavaScript, TypeScript, Python' },
        { type: 'output', content: '' },
      ]);
      return;
    }

    setIsRunning(true);

    const langInfo = getLanguageInfo(lang);
    const loadingMessage =
      lang === 'python'
        ? 'Loading Python environment (first run may take a moment)...'
        : `Executing ${langInfo.name} code...`;

    setLines((prev) => [...prev, { type: 'info', content: loadingMessage }]);

    try {
      const result = await runCode(code, lang as SupportedLanguage);

      const outputLines: TerminalLine[] = [];

      result.output.forEach((line) => {
        outputLines.push({ type: 'output', content: line });
      });

      if (result.error) {
        outputLines.push({ type: 'error', content: `Error: ${result.error}` });
      }

      outputLines.push({
        type: result.success ? 'success' : 'error',
        content: result.success
          ? `[ok] Completed in ${result.executionTime.toFixed(2)}ms`
          : `[error] Failed after ${result.executionTime.toFixed(2)}ms`,
      });
      outputLines.push({ type: 'output', content: '' });

      setLines((prev) => [...prev, ...outputLines]);
    } catch (error) {
      setLines((prev) => [
        ...prev,
        { type: 'error', content: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { type: 'output', content: '' },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setLines((prev) => [...prev, { type: 'prompt', content: `$ ${trimmed}` }]);
    setInputValue('');

    if (trimmed === 'help') {
      setLines((prev) => [
        ...prev,
        { type: 'output', content: 'Available commands:' },
        { type: 'info', content: '  help      - Show this help message' },
        { type: 'info', content: '  clear     - Clear terminal' },
        { type: 'info', content: '  run       - Execute current file' },
        { type: 'info', content: '  js <code> - Execute inline JavaScript' },
        { type: 'info', content: '  py <code> - Execute inline Python' },
        { type: 'output', content: '' },
      ]);
      return;
    }

    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    if (trimmed === 'run') {
      if (codeToRun && isExecutableLanguage(language)) {
        await executeCode(codeToRun, language);
      } else {
        setLines((prev) => [
          ...prev,
          { type: 'error', content: `Cannot execute ${language} files.` },
          { type: 'info', content: 'Supported: JavaScript, TypeScript, Python' },
          { type: 'output', content: '' },
        ]);
      }
      return;
    }

    if (trimmed.startsWith('js ')) {
      await executeCode(trimmed.slice(3), 'javascript');
      return;
    }

    if (trimmed.startsWith('py ') || trimmed.startsWith('python ')) {
      const code = trimmed.startsWith('py ') ? trimmed.slice(3) : trimmed.slice(7);
      await executeCode(code, 'python');
      return;
    }

    await executeCode(trimmed, 'javascript');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isRunning) {
      handleCommand(inputValue);
    }
  };

  const handleRunCurrentFile = () => {
    if (codeToRun && isExecutableLanguage(language)) {
      executeCode(codeToRun, language);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-terminal border-t border-border',
        isMinimized && 'h-10',
        className
      )}
    >
      <div className="flex items-center justify-between px-3 h-8 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Terminal</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-muted text-muted-foreground">sandbox</span>
          {isRunning && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-primary/20 text-primary animate-pulse">
              running...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {codeToRun && isExecutableLanguage(language) && (
            <button
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border border-primary/40',
                'bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
                isRunning && 'opacity-50 cursor-not-allowed'
              )}
              onClick={handleRunCurrentFile}
              disabled={isRunning}
              title="Run current file"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              <span>Run</span>
            </button>
          )}
          <button className="p-1 rounded-sm hover:bg-muted" title="Clear terminal" onClick={() => setLines([])}>
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-sm hover:bg-muted" title="New Terminal">
            <Plus className="w-4 h-4" />
          </button>
          <button
            className="p-1 rounded-sm hover:bg-muted"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button className="p-1 rounded-sm hover:bg-muted" title="Maximize">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-sm hover:bg-muted" title="Close" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div ref={terminalRef} className="flex-1 overflow-auto px-3 py-2 font-mono text-[13px]" onClick={() => inputRef.current?.focus()}>
          {lines.map((line, index) => (
            <div
              key={index}
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

          <div className="flex items-center mt-1">
            <span className="terminal-prompt mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-terminal-foreground"
              disabled={isRunning}
              placeholder={isRunning ? 'Running...' : 'Type command...'}
              autoFocus
            />
            {!isRunning && <span className="w-2 h-4 bg-primary animate-blink" />}
          </div>
        </div>
      )}
    </div>
  );
};
