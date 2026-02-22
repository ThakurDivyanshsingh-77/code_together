import React from 'react';
import { 
  GitBranch, 
  Check,
  Bell, 
  Wifi, 
  ShieldCheck,
  Users
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const { tabs, activeTabId, collaborators } = useEditorStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  const onlineCount = collaborators.filter(c => c.isOnline).length + 1;

  return (
    <div className={cn(
      "flex items-center justify-between h-6 px-2 bg-statusbar text-statusbar-foreground text-xs",
      className
    )}>
      <div className="flex items-center">
        <div className="statusbar-item">
          <GitBranch className="w-3.5 h-3.5" />
          <span>main</span>
        </div>

        <div className="statusbar-item">
          <Check className="w-3.5 h-3.5" />
          <span>Synced</span>
        </div>

        <div className="statusbar-item">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Protected</span>
        </div>
      </div>

      <div className="flex items-center">
        <div className="statusbar-item">
          <Users className="w-3.5 h-3.5" />
          <span>{onlineCount} online</span>
        </div>

        <div className="statusbar-item">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live Share</span>
        </div>

        {activeTab && (
          <>
            <div className="statusbar-item">
              <span>Ln 1, Col 1</span>
            </div>
            <div className="statusbar-item">
              <span>Spaces: 2</span>
            </div>
            <div className="statusbar-item">
              <span>UTF-8</span>
            </div>
            <div className="statusbar-item">
              <span className="capitalize">{activeTab.language}</span>
            </div>
          </>
        )}

        <div className="statusbar-item">
          <Bell className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
