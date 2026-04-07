import React from 'react';
import { 
  Files, 
  Search, 
  GitBranch, 
  Package, 
  Settings, 
  MessageSquare, 
  Terminal,
  SquareTerminal
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

interface ActivityBarProps {
  className?: string;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ className }) => {
  const { 
    activeActivityBar, 
    setActiveActivityBar,
    activeRightPanel,
    setActiveRightPanel,
    activeBottomPanel,
    setActiveBottomPanel
  } = useEditorStore();

  const topItems = [
    { id: 'files' as const, icon: Files, label: 'Explorer' },
    { id: 'search' as const, icon: Search, label: 'Search' },
    { id: 'git' as const, icon: GitBranch, label: 'Source Control' },
    { id: 'extensions' as const, icon: Package, label: 'Extensions' },
  ];

  const bottomItems = [
    { id: 'chat' as const, icon: MessageSquare, label: 'Chat', panel: 'chat' as const, panelType: 'right' as const },
    { id: 'terminal' as const, icon: Terminal, label: 'Terminal', panel: 'terminal' as const, panelType: 'bottom' as const },
    { id: 'ai-console' as const, icon: SquareTerminal, label: 'AI Console', panel: 'ai' as const, panelType: 'bottom' as const },
    { id: 'settings' as const, icon: Settings, label: 'Settings', panelType: 'activity' as const },
  ];

  return (
    <div className={cn(
      "flex flex-col items-center w-12 bg-sidebar border-r border-sidebar-border/80",
      className
    )}>
      {/* Top icons */}
      <div className="flex flex-col items-center py-2 flex-1">
        {topItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveActivityBar(item.id)}
            className={cn(
              "activity-bar-icon",
              activeActivityBar === item.id && "active"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center py-2 border-t border-sidebar-border">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.panelType === 'bottom' && item.panel) {
                const bottomPanel = item.panel as 'terminal' | 'ai';
                setActiveBottomPanel(activeBottomPanel === bottomPanel ? null : bottomPanel);
              } else if (item.panelType === 'right' && item.panel) {
                const rightPanel = item.panel as 'chat' | 'ai';
                setActiveRightPanel(activeRightPanel === rightPanel ? null : rightPanel);
              } else {
                setActiveActivityBar(item.id as any);
              }
            }}
            className={cn(
              "activity-bar-icon",
              (item.panelType === 'bottom' && activeBottomPanel === item.panel) && "active",
              (item.panelType === 'right' && activeRightPanel === item.panel) && "active",
              (item.panelType === 'activity' && activeActivityBar === item.id) && "active"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
};
