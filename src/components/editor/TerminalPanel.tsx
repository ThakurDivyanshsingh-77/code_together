import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  X,
  StopCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useTerminalSocket } from '@/hooks/useTerminalSocket';

interface TerminalPanelProps {
  className?: string;
  onClose?: () => void;
  codeToRun?: string;
  language?: string;
  filePath?: string;
  fileName?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  className,
  onClose,
  codeToRun,
  language = 'javascript',
  filePath,
  fileName,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const { triggerRun } = useEditorStore();

  const {
    lines,
    isRunning,
    isWaitingInput,
    runCode,
    sendInput,
    killProcess,
    clearTerminal,
  } = useTerminalSocket();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, isWaitingInput]);

  useEffect(() => {
    if (triggerRun > 0 && codeToRun) {
      // Evaluate if this trigger was fired recently (within the last 2 seconds)
      // This prevents stale triggers from executing when manually re-mounting the Terminal Panel
      const isRecentTrigger = (Date.now() - triggerRun) < 2000;
      
      if (isRecentTrigger) {
        runCode(codeToRun, language);
      }
    }
  }, [triggerRun]);

  const executeCurrentFile = () => {
    if (!codeToRun) {
       clearTerminal();
       return;
    }
    runCode(codeToRun, language);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const text = inputValue;
      setInputValue('');
      sendInput(text);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col border-t border-[#333]',
        isMinimized && 'h-10',
        className
      )}
      style={{ backgroundColor: '#1e1e1e', fontFamily: '"JetBrains Mono", monospace' }}
    >
      <div className="flex items-center justify-between px-3 h-8 border-b border-[#333] shrink-0" style={{ backgroundColor: '#252526' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: '#ffb86c' }}>
            Terminal
          </span>
          {fileName && (
            <span className="hidden md:inline px-1.5 py-0.5 text-[10px] rounded-sm truncate max-w-[220px]" style={{ backgroundColor: 'rgba(255, 184, 108, 0.1)', color: '#ffb86c' }}>
              {fileName} ({language})
            </span>
          )}
          {isRunning && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-sm animate-pulse" style={{ backgroundColor: 'rgba(248, 248, 242, 0.1)', color: '#f8f8f2' }}>
              running...
            </span>
          )}
          {isWaitingInput && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-sm animate-pulse" style={{ backgroundColor: 'rgba(80, 250, 123, 0.2)', color: '#50fa7b' }}>
              Awaiting Input...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isRunning && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border transition-colors"
              style={{ borderColor: 'rgba(255, 85, 85, 0.4)', backgroundColor: 'rgba(255, 85, 85, 0.1)', color: '#ff5555' }}
              onClick={killProcess}
              title='Kill Process'
            >
              <StopCircle className="w-3 h-3" />
              <span>Kill</span>
            </button>
          )}

          <button
            className="p-1 rounded-sm hover:bg-white/5 transition-colors"
            title="Clear terminal"
            onClick={clearTerminal}
          >
            <Trash2 className="w-4 h-4" style={{ color: '#6272a4' }} />
          </button>
          <button
            className="p-1 rounded-sm hover:bg-white/5 transition-colors"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" style={{ color: '#6272a4' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: '#6272a4' }} />
            )}
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
          ref={terminalRef}
          className="flex-1 overflow-auto p-3 text-[13px] scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent flex flex-col"
          style={{ backgroundColor: '#1e1e1e' }}
        >
          {/* Output Lines Array */}
          <div className="flex-1">
            {lines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  'whitespace-pre-wrap flex font-mono',
                  line.type === 'error' && '',
                  line.type === 'system' && 'italic',
                )}
                style={{
                  color: 
                    line.type === 'error' ? '#ff5555' : 
                    line.type === 'system' ? '#6272a4' : 
                    line.content.startsWith('>') ? '#50fa7b' : // Handle explicit input echo
                    '#f8f8f2'
                }}
              >
                <span>{line.content}</span>
              </div>
            ))}
          </div>

          {/* Persistent Input Box */}
          <div className="flex w-full items-center mt-2 border-t border-[#333] pt-2 shrink-0">
            <span className="mr-2 text-lg leading-none shrink-0" style={{ color: '#50fa7b', transform: 'translateY(1px)' }}>›</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              className="flex-1 bg-transparent outline-none border-none py-0.5"
              style={{ color: '#50fa7b' }}
              placeholder={isWaitingInput ? "type input and press enter..." : "send command to running process..."}
              disabled={!isRunning}
            />
          </div>
        </div>
      )}
    </div>
  );
};
