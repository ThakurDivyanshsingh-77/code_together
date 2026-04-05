import React from 'react';
import { Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { getLanguageInfo } from '@/lib/sandboxExecutor';

interface RunButtonProps {
  className?: string;
}

export const RunButton: React.FC<RunButtonProps> = ({ className }) => {
  const {
    tabs,
    activeTabId,
    setActiveBottomPanel,
    setTriggerRun,
    isTerminalRunning
  } = useEditorStore();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  if (!activeTab) return null;

  const langInfo = getLanguageInfo(activeTab.language);

  // Exclude non-programmatic tabs
  const isRunnable = activeTab.language !== 'json' && activeTab.language !== 'markdown' && activeTab.language !== 'plaintext';
  if (!isRunnable) return null;

  const isHtml = activeTab.language.toLowerCase() === 'html' || activeTab.language.toLowerCase() === 'css';

  const handleRunCode = () => {
    if (!activeTab) return;
    
    if (isHtml) {
       setActiveBottomPanel('output');
       return;
    }

    if (isTerminalRunning) return;

    // Switch to Terminal automatically
    setActiveBottomPanel('terminal');
    
    // Setting timestamp dynamically fires trigger inside TerminalPanel useEffect mapping
    setTriggerRun(Date.now());
  };

  return (
    <button
      onClick={handleRunCode}
      disabled={isTerminalRunning && !isHtml}
      title={`Run ${langInfo.name}`}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium border transition-colors',
        isTerminalRunning && !isHtml
          ? 'border-[#ffb86c]/30 bg-[#ffb86c]/10 text-[#ffb86c]' 
          : 'border-primary/50 bg-primary/90 text-primary-foreground hover:bg-primary',
        'disabled:opacity-80 disabled:cursor-not-allowed',
        className
      )}
    >
      {isTerminalRunning && !isHtml ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Running...</span>
        </>
      ) : (
        <>
          <Play className="w-3.5 h-3.5" />
          <span>Run {langInfo.icon}</span>
        </>
      )}
    </button>
  );
};
