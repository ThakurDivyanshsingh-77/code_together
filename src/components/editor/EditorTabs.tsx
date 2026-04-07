import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Circle, ChevronLeft, ChevronRight, Terminal, Code, Columns, Globe } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';
import { RunButton } from './RunButton';
import { isExecutableLanguage } from '@/lib/sandboxExecutor';

interface EditorTabsProps {
  className?: string;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({ className }) => {
  const {
    tabs, activeTabId, setActiveTab, closeTab,
    htmlPreviewLayout, setHtmlPreviewLayout,
    setActiveBottomPanel, activeBottomPanel,
  } = useEditorStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
  }, [tabs, updateScrollState]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isHtmlPreviewable = activeTab?.language.toLowerCase() === 'html' || activeTab?.language.toLowerCase() === 'css';
  const isExecutable = activeTab && isExecutableLanguage(activeTab.language);
  const hasActions = activeTab && (isHtmlPreviewable || isExecutable);
  const hasOverflow = canScrollLeft || canScrollRight;

  if (tabs.length === 0) return null;

  return (
    <div className={cn('flex items-stretch h-9 bg-tab border-b border-tab-border', className)}>

      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex items-center justify-center w-6 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-hover transition-colors border-r border-tab-border"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Scrollable tabs with fade edges */}
      <div className="relative flex-1 min-w-0">
        <div
          ref={scrollRef}
          className="flex items-stretch h-full overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn('editor-tab group relative flex-shrink-0', activeTabId === tab.id && 'active')}
              onClick={() => setActiveTab(tab.id)}
            >
              <div className="w-4 h-4 flex items-center justify-center">
                {tab.isDirty ? (
                  <Circle className="w-2 h-2 fill-current text-foreground/80" />
                ) : (
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-opacity"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="truncate max-w-[150px]">{tab.name}</span>
              {tab.isDirty && (
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted transition-opacity"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Left fade when scrolled right */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 h-full w-8 pointer-events-none bg-gradient-to-r from-tab to-transparent" />
        )}
        {/* Right fade when more tabs hidden */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 h-full w-8 pointer-events-none bg-gradient-to-l from-tab to-transparent" />
        )}
      </div>

      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex items-center justify-center w-6 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-hover transition-colors border-l border-tab-border"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Action buttons */}
      {hasActions && (
        <div className={cn(
          'flex items-center gap-1 px-2 flex-shrink-0 border-l border-tab-border',
          hasOverflow && 'border-l-0 pl-0'
        )}>
          {isHtmlPreviewable && (
            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-sm border border-border/50">
              <button
                onClick={() => setHtmlPreviewLayout('editor')}
                title="Editor Only"
                className={cn('px-2 py-0.5 rounded-sm text-xs transition-colors flex items-center gap-1',
                  htmlPreviewLayout === 'editor' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Code className="w-3 h-3" /><span>Editor</span>
              </button>
              <button
                onClick={() => setHtmlPreviewLayout('split')}
                title="Split View"
                className={cn('px-2 py-0.5 rounded-sm text-xs transition-colors flex items-center gap-1',
                  htmlPreviewLayout === 'split' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Columns className="w-3 h-3" /><span>Split</span>
              </button>
              <button
                onClick={() => setHtmlPreviewLayout('preview')}
                title="Preview Only"
                className={cn('px-2 py-0.5 rounded-sm text-xs transition-colors flex items-center gap-1',
                  htmlPreviewLayout === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                <Globe className="w-3 h-3" /><span>Preview</span>
              </button>
            </div>
          )}

          {isExecutable && !isHtmlPreviewable && (
            <>
              <RunButton />
              <button
                onClick={() => setActiveBottomPanel('terminal')}
                title="Open Terminal"
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors',
                  activeBottomPanel === 'terminal' && 'ring-1 ring-primary text-primary'
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
