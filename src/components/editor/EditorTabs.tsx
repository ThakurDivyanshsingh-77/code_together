import React from 'react';
import { X, Circle } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

interface EditorTabsProps {
  className?: string;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ className }) => {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorStore();

  if (tabs.length === 0) return null;

  return (
    <div className={cn(
      "flex items-stretch h-9 bg-tab overflow-x-auto border-b border-tab-border",
      className
    )}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "editor-tab group relative",
            activeTabId === tab.id && "active"
          )}
          onClick={() => setActiveTab(tab.id)}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            {tab.isDirty ? (
              <Circle className="w-2 h-2 fill-current text-foreground/80" />
            ) : (
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="truncate max-w-[150px]">{tab.name}</span>

          {tab.isDirty && (
            <button
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
