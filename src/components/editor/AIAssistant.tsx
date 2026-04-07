import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Sparkles, Loader2, Code, Wand2, Bug, RefreshCw, MessageSquareText, Copy, Search } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface AIAssistantProps {
  className?: string;
  projectId?: string;
}

type AIAction = 'explain_selected_code' | 'fix_bugs' | 'refactor_code' | 'generate_function' | 'chat_about_file' | 'read_file' | 'write_file' | 'create_file' | 'analyze_project' | 'fix_errors' | 'fix_ui';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: AIAction;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    icon: Code,
    label: 'Explain Selected',
    action: 'explain_selected_code',
    prompt: 'Explain the selected code in detail.',
  },
  {
    icon: Bug,
    label: 'Fix Bugs',
    action: 'fix_bugs',
    prompt: 'Find and fix bugs in this code.',
  },
  {
    icon: RefreshCw,
    label: 'Refactor',
    action: 'refactor_code',
    prompt: 'Refactor this code for readability and maintainability.',
  },
  {
    icon: Wand2,
    label: 'Generate Function',
    action: 'generate_function',
    prompt: 'Generate a function based on this requirement:',
  },
  {
    icon: MessageSquareText,
    label: 'Chat About File',
    action: 'chat_about_file',
    prompt: 'Review this file and help me understand it.',
  },
  {
    icon: Code,
    label: 'Read File',
    action: 'read_file',
    prompt: 'What do you want to know about this file?',
  },
  {
    icon: Wand2,
    label: 'Write File',
    action: 'write_file',
    prompt: 'What changes do you want to make to this file?',
  },
  {
    icon: Code,
    label: 'Create File',
    action: 'create_file',
    prompt: 'What kind of file do you want to create?',
  },
  {
    icon: Bug,
    label: 'Fix Errors',
    action: 'fix_errors',
    prompt: 'What kind of errors should I look for?',
  },
  {
    icon: Search,
    label: 'Analyze Project',
    action: 'analyze_project',
    prompt: 'What aspects of the project should I analyze?',
  },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ className, projectId }) => {
  const { aiMessages, sendAIMessage, isAILoading, tabs, activeTabId, selectedCode } = useEditorStore();
  const { getFileContent, updateFileByAI, createFileByAI, getAllFilesContent } = useProjectFiles(projectId);
  const [inputValue, setInputValue] = useState('');
  const [fileOperationMode, setFileOperationMode] = useState<'read' | 'write' | 'create' | null>(null);
  const [targetFilePath, setTargetFilePath] = useState('');
  const [promptMode, setPromptMode] = useState<{ action: AIAction; placeholder: string } | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use projectId or 'local' for local projects
  const currentProjectId = projectId || 'local';
  const currentMessages = aiMessages[currentProjectId] || [];
  const currentLoading = isAILoading[currentProjectId] || false;

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) || null, [tabs, activeTabId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, currentLoading]);

  const handleSend = (action: AIAction = 'chat_about_file', presetPrompt?: string) => {
    const prompt = (presetPrompt || inputValue).trim();
    if (!prompt) return;

    if (action === 'explain_selected_code' && !selectedCode) {
      toast.error('Select code in editor first');
      return;
    }

    // Handle file operations
    if (action === 'read_file' || action === 'write_file' || action === 'create_file') {
      if (!activeTab && action !== 'create_file') {
        toast.error('No file is currently open');
        return;
      }
      
      const filePath = action === 'create_file' ? targetFilePath : activeTab.path;
      
      sendAIMessage({
        action,
        prompt,
        selectedCode: selectedCode || undefined,
        fileName: activeTab?.name,
        fileLanguage: activeTab?.language,
        fileContent: activeTab?.content,
        projectId: currentProjectId,
        filePath,
      });
    } else {
      sendAIMessage({
        action,
        prompt,
        selectedCode: selectedCode || undefined,
        fileName: activeTab?.name,
        fileLanguage: activeTab?.language,
        fileContent: activeTab?.content,
        projectId: currentProjectId,
      });
    }

    if (!presetPrompt) {
      setInputValue('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend('chat_about_file');
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>AI Assistant</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">Groq</span>
      </div>

      <div className="px-2 py-2 border-b border-border space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                // For file operations, show prompt input
                if (['read_file', 'write_file', 'create_file', 'fix_errors', 'analyze_project'].includes(action.action)) {
                  setPromptMode({ action: action.action, placeholder: action.prompt });
                  setPromptInput('');
                } else if (action.action === 'create_file') {
                  setFileOperationMode('create');
                } else {
                  setPromptMode(null);
                  setFileOperationMode(null);
                  handleSend(action.action, action.prompt);
                }
              }}
              disabled={currentLoading}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-sm border border-border',
                'bg-secondary hover:bg-sidebar-hover transition-colors',
                currentLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>

        {/* Prompt input mode */}
        {promptMode && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder={promptMode.placeholder}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="w-full px-2 py-1 text-[11px] bg-input border border-border rounded-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && promptInput.trim()) {
                  handleSend(promptMode.action, promptInput);
                  setPromptMode(null);
                  setPromptInput('');
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (promptInput.trim()) {
                    handleSend(promptMode.action, promptInput);
                    setPromptMode(null);
                    setPromptInput('');
                  }
                }}
                disabled={!promptInput.trim() || currentLoading}
                className="px-2 py-1 text-[11px] bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setPromptMode(null);
                  setPromptInput('');
                }}
                className="px-2 py-1 text-[11px] bg-muted border border-border rounded-sm hover:bg-sidebar-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {fileOperationMode === 'create' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Enter file path (e.g., /src/components/NewComponent.tsx)"
              value={targetFilePath}
              onChange={(e) => setTargetFilePath(e.target.value)}
              className="w-full px-2 py-1 text-[11px] bg-input border border-border rounded-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && targetFilePath.trim()) {
                  setPromptMode({ action: 'create_file', placeholder: 'What should this file contain?' });
                  setFileOperationMode(null);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (targetFilePath.trim()) {
                    setPromptMode({ action: 'create_file', placeholder: 'What should this file contain?' });
                    setFileOperationMode(null);
                  }
                }}
                disabled={!targetFilePath.trim() || currentLoading}
                className="px-2 py-1 text-[11px] bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Next
              </button>
              <button
                onClick={() => {
                  setFileOperationMode(null);
                  setTargetFilePath('');
                }}
                className="px-2 py-1 text-[11px] bg-muted border border-border rounded-sm hover:bg-sidebar-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          {activeTab ? `File: ${activeTab.name}` : 'No file open'}
          {selectedCode ? ` | Selected: ${selectedCode.length} chars` : ' | No selection'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {currentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">AI Code Assistant</p>
            <p className="text-xs mt-1">Explain, fix, refactor, generate functions, or chat about the active file.</p>
          </div>
        )}

        {currentMessages.map((message) => (
          <div key={message.id} className={cn('flex flex-col gap-1', message.role === 'user' && 'items-end')}>
            <div
              className={cn(
                'rounded-sm px-2.5 py-2 text-[13px] max-w-[94%] border',
                message.role === 'user'
                  ? 'bg-primary/20 border-primary/40 text-foreground'
                  : 'bg-secondary border-border text-secondary-foreground'
              )}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ className: codeClassName, children, ...props }) => {
                        const isInline = !codeClassName;
                        return isInline ? (
                          <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <div className="relative group">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                toast.success('Code copied to clipboard');
                              }}
                              className="absolute top-2 right-2 p-1 rounded-sm bg-sidebar text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sidebar-hover hover:text-foreground z-10"
                              title="Copy code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <pre className="code-block mt-2 mb-2">
                              <code className="text-xs" {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      },
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}

        {currentLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-border">
        <div className="flex items-center gap-2 bg-input border border-border rounded-sm px-2 py-1.5">
          <textarea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this file, or ask to generate/fix/refactor..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground resize-none"
          />
          <button
            onClick={() => handleSend('chat_about_file')}
            disabled={!inputValue.trim() || currentLoading}
            className={cn(
              'p-1.5 rounded-sm transition-colors border border-transparent',
              inputValue.trim() && !currentLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/70'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {currentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">AI can make mistakes. Verify important output.</p>
      </div>
    </div>
  );
};
