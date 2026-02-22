import React from 'react';
import { 
  Minus,
  Square,
  X
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

interface TitleBarProps {
  className?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ className }) => {
  const { collaborators, tabs, activeTabId } = useEditorStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  const onlineCollaborators = collaborators.filter(c => c.isOnline);

  return (
    <div className={cn(
      "relative flex items-center justify-between h-9 px-3 bg-sidebar border-b border-border text-xs select-none",
      className
    )}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-primary flex items-center justify-center text-[9px] font-semibold text-primary-foreground">
            C
          </div>
          <span className="text-[12px] font-medium text-foreground/90">CodeCollab</span>
        </div>

        <div className="flex items-center gap-1 text-[12px] text-foreground/80">
          {['File', 'Edit', 'View', 'Run', 'Help'].map((item) => (
            <button
              key={item}
              className="px-2 py-0.5 rounded-sm hover:bg-sidebar-hover hover:text-foreground transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-[12px] pointer-events-none">
        <span className="text-muted-foreground">CodeCollab</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-foreground/90">{activeTab ? activeTab.name : 'Visual Studio Code Style Editor'}</span>
        {activeTab?.isDirty && <span className="text-warning">●</span>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          {onlineCollaborators.slice(0, 3).map((user, i) => (
            <div
              key={user.id}
              className={cn(
                "w-5 h-5 rounded-sm border border-sidebar flex items-center justify-center text-[10px] font-medium",
              )}
              style={{ 
                backgroundColor: `hsl(var(--user-${user.color}))`,
                zIndex: 3 - i 
              }}
              title={user.name}
            >
              {user.name.charAt(0)}
            </div>
          ))}
          {onlineCollaborators.length > 3 && (
            <div className="w-5 h-5 rounded-sm border border-sidebar bg-muted flex items-center justify-center text-[10px]">
              +{onlineCollaborators.length - 3}
            </div>
          )}
        </div>

        <div className="flex items-center">
          <button className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-hover text-foreground/70">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-hover text-foreground/70">
            <Square className="w-3 h-3" />
          </button>
          <button className="h-9 w-9 flex items-center justify-center hover:bg-destructive/80 hover:text-white text-foreground/70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
