import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, FileEdit, FilePlus, Trash2, XCircle, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api';
import { useEditorStore } from '@/store/editorStore';

interface AIConsoleProps {
  className?: string;
  projectId: string;
  onClose?: () => void;
  onFilesChanged?: () => void;
}

interface AppliedChange {
  action: 'created' | 'modified' | 'deleted' | 'error';
  path: string;
  error?: string;
}

interface ConsoleEntry {
  id: string;
  type: 'command' | 'thinking' | 'result' | 'error' | 'info' | 'reply';
  text: string;
  timestamp: Date;
  changes?: AppliedChange[];
}

const actionIcon = (action: AppliedChange['action']) => {
  if (action === 'created') return <FilePlus className="w-3 h-3 shrink-0" style={{ color: '#50fa7b' }} />;
  if (action === 'modified') return <FileEdit className="w-3 h-3 shrink-0" style={{ color: '#ffb86c' }} />;
  if (action === 'deleted') return <Trash2 className="w-3 h-3 shrink-0" style={{ color: '#ff5555' }} />;
  return <XCircle className="w-3 h-3 shrink-0" style={{ color: '#ff5555' }} />;
};

const actionColor = (action: AppliedChange['action']) => {
  if (action === 'created') return '#50fa7b';
  if (action === 'modified') return '#ffb86c';
  if (action === 'deleted') return '#ff5555';
  return '#ff5555';
};

export const AIConsole: React.FC<AIConsoleProps> = ({ className, projectId, onClose, onFilesChanged }) => {
  const { tabs, activeTabId } = useEditorStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  const [entries, setEntries] = useState<ConsoleEntry[]>([
    {
      id: 'welcome',
      type: 'info',
      text: 'AI Console ready. Chat, ask questions, or give file commands.\nExamples: "Hi" · "explain this file" · "fix the error in App.tsx" · "create a utils/helpers.ts"',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries]);

  const addEntry = useCallback((entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => {
    setEntries(prev => [...prev, { ...entry, id: `entry-${Date.now()}-${Math.random()}`, timestamp: new Date() }]);
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim() || isLoading) return;

    addEntry({ type: 'command', text: command });
    addEntry({ type: 'thinking', text: '⠋ AI is thinking...' });
    setIsLoading(true);

    try {
      const result = await apiRequest<{ reply?: string; thoughts?: string; summary: string; applied: AppliedChange[] }>(
        '/ai/execute',
        {
          method: 'POST',
          body: {
            projectId,
            command,
            currentFilePath: activeTab?.path || null,
          },
        }
      );

      // Remove the "thinking" entry
      setEntries(prev => prev.filter(e => e.type !== 'thinking'));

      const hasChanges = result.applied && result.applied.length > 0;

      // Defensive: if reply is raw JSON (model nesting bug slipped through), extract clean text
      let replyText = result.reply || '';
      if (replyText.trim().startsWith('{')) {
        try {
          const nested = JSON.parse(replyText) as { reply?: string };
          if (nested.reply) replyText = nested.reply;
        } catch {
          const m = replyText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          replyText = m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
        }
      }

      if (replyText) {
        addEntry({ type: 'reply', text: replyText });
      }

      if (hasChanges) {
        addEntry({ type: 'result', text: result.summary || 'Changes applied:', changes: result.applied });
        onFilesChanged?.();
      } else if (!replyText) {
        addEntry({ type: 'info', text: 'No file changes were made.' });
      }
    } catch (err: unknown) {
      setEntries(prev => prev.filter(e => e.type !== 'thinking'));
      const message = err instanceof Error ? err.message : 'Unknown error';
      addEntry({ type: 'error', text: `✗ Error: ${message}` });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, projectId, activeTab, addEntry, onFilesChanged]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const cmd = inputValue.trim();
      setInputValue('');
      void executeCommand(cmd);
    }
  };

  return (
    <div
      className={cn('flex flex-col', isMinimized && 'h-10', className)}
      style={{ backgroundColor: '#1e1e1e', fontFamily: '"JetBrains Mono", monospace' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 h-8 border-b border-[#333] shrink-0"
        style={{ backgroundColor: '#252526' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: '#bd93f9' }} />
          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: '#bd93f9' }}>
            AI Console
          </span>
          {isLoading && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm animate-pulse" style={{ backgroundColor: 'rgba(189, 147, 249, 0.15)', color: '#bd93f9' }}>
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              processing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1 rounded-sm hover:bg-white/5 transition-colors"
            title="Clear console"
            onClick={() => setEntries([])}
          >
            <Trash2 className="w-3.5 h-3.5" style={{ color: '#6272a4' }} />
          </button>
          <button
            className="p-1 rounded-sm hover:bg-white/5 transition-colors"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized
              ? <ChevronUp className="w-4 h-4" style={{ color: '#6272a4' }} />
              : <ChevronDown className="w-4 h-4" style={{ color: '#6272a4' }} />}
          </button>
          {onClose && (
            <button className="p-1 rounded-sm hover:bg-white/5 transition-colors" onClick={onClose}>
              <X className="w-4 h-4" style={{ color: '#6272a4' }} />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div
          className="flex flex-col flex-1 overflow-hidden"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Output area */}
          <div
            ref={outputRef}
            className="flex-1 overflow-auto p-3 space-y-1 text-[12px]"
            style={{ backgroundColor: '#1e1e1e' }}
          >
            {entries.map(entry => (
              <div key={entry.id} className="leading-relaxed">
                {entry.type === 'command' && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <span style={{ color: '#50fa7b' }} className="shrink-0">❯</span>
                    <span style={{ color: '#f8f8f2' }} className="font-mono">{entry.text}</span>
                  </div>
                )}
                {entry.type === 'thinking' && (
                  <div className="flex items-center gap-1.5 ml-3">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: '#bd93f9' }} />
                    <span style={{ color: '#6272a4' }} className="italic text-[11px]">AI is thinking...</span>
                  </div>
                )}
                {entry.type === 'reply' && (
                  <div className="ml-3 whitespace-pre-wrap leading-relaxed" style={{ color: '#f8f8f2' }}>
                    <span className="mr-1.5 text-[11px]" style={{ color: '#bd93f9' }}>AI</span>
                    {entry.text}
                  </div>
                )}
                {entry.type === 'info' && (
                  <div className="ml-3 whitespace-pre-wrap" style={{ color: '#8be9fd' }}>
                    {entry.text}
                  </div>
                )}
                {entry.type === 'error' && (
                  <div className="ml-3 whitespace-pre-wrap" style={{ color: '#ff5555' }}>
                    {entry.text}
                  </div>
                )}
                {entry.type === 'result' && (
                  <div className="ml-3 space-y-0.5">
                    <div style={{ color: '#f8f8f2' }} className="mb-1">{entry.text}</div>
                    {entry.changes?.map((change, i) => (
                      <div key={i} className="flex items-center gap-1.5 pl-2">
                        {actionIcon(change.action)}
                        <span style={{ color: actionColor(change.action) }} className="text-[11px]">
                          {change.action}
                        </span>
                        <span style={{ color: '#f8f8f2' }} className="text-[11px] opacity-80">
                          {change.path}
                        </span>
                        {change.error && (
                          <span style={{ color: '#ff5555' }} className="text-[10px]">
                            ({change.error})
                          </span>
                        )}
                      </div>
                    ))}
                    {entry.changes && entry.changes.filter(c => c.action !== 'error').length > 0 && (
                      <div className="flex items-center gap-1.5 pl-2 mt-1">
                        <CheckCircle2 className="w-3 h-3" style={{ color: '#50fa7b' }} />
                        <span style={{ color: '#50fa7b' }} className="text-[11px]">
                          {entry.changes.filter(c => c.action !== 'error').length} file(s) updated — refresh the file tree to see changes
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input area */}
          <div
            className="flex items-center px-3 py-2 border-t border-[#333] shrink-0"
            style={{ backgroundColor: '#252526' }}
          >
            <span className="mr-2 text-[12px] shrink-0" style={{ color: '#bd93f9' }}>AI❯</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? 'AI is working...' : 'Type a command, e.g. "add dark mode to App.tsx"'}
              className="flex-1 bg-transparent outline-none border-none text-[12px] placeholder:opacity-40"
              style={{ color: '#f8f8f2', fontFamily: '"JetBrains Mono", monospace' }}
            />
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 ml-2" style={{ color: '#bd93f9' }} />}
          </div>
        </div>
      )}
    </div>
  );
};
