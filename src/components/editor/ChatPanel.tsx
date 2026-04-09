import { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Loader2, SmilePlus } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { useAuth } from '@/hooks/useAuth';
import { useChatMessages } from '@/hooks/useChatMessages';
import { isOwnChatMessage, resolveCurrentChatUser } from '@/lib/chat';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/time';

interface ChatPanelProps {
  className?: string;
  projectId?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className, projectId }) => {
  const { currentUser, collaborators } = useEditorStore();
  const { user, profile } = useAuth();
  const { messages, loading, sendMessage, toggleReaction } = useChatMessages(projectId || "");
  const storeMessages = useEditorStore(s => s.messages);
  const storeSend = useEditorStore(s => s.sendMessage);

  const isPersisted = !!projectId;
  const displayMessages = isPersisted ? messages : storeMessages;
  const persistedCurrentUser = resolveCurrentChatUser({
    userId: user?.id,
    profileUserId: profile?.user_id,
    displayName: profile?.display_name,
    color: profile?.color,
    fallbackDisplayName: currentUser.name,
    fallbackColor: currentUser.color,
  });

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
  const currentUserId = isPersisted ? persistedCurrentUser.id : currentUser.id;

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

      <div className="px-2 py-2 border-b border-border flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-secondary text-[11px]">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: `hsl(var(--user-${isPersisted ? persistedCurrentUser.color : currentUser.color}))` }}
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2">
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
            const isOwn = isOwnChatMessage(message.userId, currentUserId);
            const processedContent = message.content.replace(/@([A-Za-z0-9_]+)/g, '**@$1**');

            return (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-1 group relative",
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
                
                <div className="relative max-w-full">
                  <div className={cn(
                    "chat-message px-2 py-1 rounded-md text-sm shadow-sm relative z-10 max-w-full", 
                    isOwn ? "bg-primary/20 border border-primary/30 text-primary-foreground own" : "bg-secondary/50 border border-border text-foreground other",
                  )}>
                    <span className="whitespace-normal break-words" style={{ overflowWrap: 'anywhere' }}>{message.content}</span>
                  </div>
                  
                  {isPersisted && (
                    <div className={cn(
                      "absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-card border border-border rounded-full px-1 py-0.5 shadow-md z-20",
                      isOwn ? "left-0" : "right-0"
                    )}>
                      {['👍', '❤️', '🔥'].map(emoji => (
                         <button 
                           key={emoji}
                           onClick={() => toggleReaction && toggleReaction(message.id, emoji)}
                           className="hover:scale-125 transition-transform text-xs"
                         >
                           {emoji}
                         </button>
                      ))}
                    </div>
                  )}
                </div>

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className={cn("flex flex-wrap gap-1 mt-0.5", isOwn ? "justify-end" : "justify-start")}>
                    {Object.entries(message.reactions).map(([emoji, users]) => {
                      if (!users || users.length === 0) return null;
                      const hasReacted = users.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => isPersisted && toggleReaction && toggleReaction(message.id, emoji)}
                          className={cn(
                            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors",
                            hasReacted ? "bg-primary/20 border-primary/50 text-primary-foreground" : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                          )}
                        >
                          <span>{emoji}</span>
                          <span className="font-medium">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <span className="text-[10px] text-muted-foreground/80 py-1">
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
