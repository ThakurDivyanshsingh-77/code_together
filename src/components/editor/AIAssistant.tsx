import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Code, Wand2, Bug, RefreshCw } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  className?: string;
}

const quickActions = [
  { icon: Code, label: 'Explain code', prompt: 'Explain the selected code in detail' },
  { icon: Bug, label: 'Debug', prompt: 'Help me debug this code and find potential issues' },
  { icon: RefreshCw, label: 'Refactor', prompt: 'Suggest ways to refactor and improve this code' },
  { icon: Wand2, label: 'Generate', prompt: 'Generate code based on my description' },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ className }) => {
  const { aiMessages, sendAIMessage, isAILoading, tabs, activeTabId } = useEditorStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const handleSend = (prompt?: string) => {
    const message = prompt || inputValue.trim();
    if (message) {
      // Include context about current file
      const activeTab = tabs.find(t => t.id === activeTabId);
      const context = activeTab 
        ? `[Currently editing: ${activeTab.name}]\n\n${message}`
        : message;
      
      sendAIMessage(context);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>AI Assistant</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">
          Beta
        </span>
      </div>

      {/* Quick actions */}
      <div className="px-2 py-2 border-b border-border">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleSend(action.prompt)}
              disabled={isAILoading}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-sm border border-border",
                "bg-secondary hover:bg-sidebar-hover transition-colors",
                isAILoading && "opacity-50 cursor-not-allowed"
              )}
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {aiMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">AI Code Assistant</p>
            <p className="text-xs mt-1">
              Ask questions about your code, get explanations, or request help debugging.
            </p>
          </div>
        )}

        {aiMessages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-1",
              message.role === 'user' && "items-end"
            )}
          >
            <div 
              className={cn(
                "rounded-sm px-2.5 py-2 text-[13px] max-w-[94%] border",
                message.role === 'user' 
                  ? "bg-primary/20 border-primary/40 text-foreground" 
                  : "bg-secondary border-border text-secondary-foreground"
              )}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ node, className, children, ...props }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="code-block mt-2 mb-2">
                            <code className="text-xs" {...props}>
                              {children}
                            </code>
                          </pre>
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

        {isAILoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border">
        <div className="flex items-center gap-2 bg-input border border-border rounded-sm px-2 py-1.5">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about your code..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground resize-none"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isAILoading}
            className={cn(
              "p-1.5 rounded-sm transition-colors border border-transparent",
              inputValue.trim() && !isAILoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/70" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {isAILoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};
