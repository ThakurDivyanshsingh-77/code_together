import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Loader2 } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useAuth } from '@/hooks/useAuth';
import { useChatMessages } from '@/hooks/useChatMessages';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/time';

interface ChatPanelProps {
  className?: string;
  projectId?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className, projectId }) => {
  const { currentUser, collaborators } = useEditorStore();
  const { user, profile } = useAuth();
  const { messages, loading, sendMessage } = useChatMessages(projectId || '');
  const storeMessages = useEditorStore(s => s.messages);
  const storeSend = useEditorStore(s => s.sendMessage);

  const isPersisted = !!projectId;
  const displayMessages = isPersisted ? messages : storeMessages;

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    if (isPersisted) {
      sendMessage(inputValue.trim());
    } else {
      storeSend(inputValue.trim());
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onlineUsers = collaborators.filter(u => u.isOnline);
  const currentUserId = isPersisted ? user?.id : currentUser.id;

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span>Chat</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-success/20 text-success">
            {onlineUsers.length + 1} online
          </span>
        </div>
        <button className="p-1 rounded hover:bg-sidebar-hover">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="px-2 py-2 border-b border-border flex items-center gap-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-secondary text-[11px]">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: `hsl(var(--user-${isPersisted ? (profile?.color || 1) : currentUser.color}))` }}
          />
          <span>You</span>
        </div>
        {onlineUsers.map((u) => (
          <div 
            key={u.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-secondary text-[11px]"
          >
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `hsl(var(--user-${u.color}))` }}
            />
            <span>{u.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {loading && isPersisted ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : displayMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          displayMessages.map((message) => {
            const isOwn = message.userId === currentUserId;
            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-1",
                  isOwn && "items-end"
                )}
              >
                {!isOwn && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `hsl(var(--user-${message.userColor}))` }}
                    />
                    <span>{message.userName}</span>
                  </div>
                )}
                <div className={cn("chat-message", isOwn ? "own" : "other")}>
                  {message.content}
                </div>
                <span className="text-[10px] text-muted-foreground/80">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-border">
        <div className="flex items-center gap-2 bg-input border border-border rounded-sm px-2 py-1.5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              "p-1.5 rounded-sm transition-colors border border-transparent",
              inputValue.trim() 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/70" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
