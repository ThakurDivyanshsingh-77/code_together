import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface BottomPanelProps {
  className?: string;
  height: number;
  minHeight?: number;
  maxHeight?: number;
  onResize: (height: number) => void;
  maxHeightFill?: boolean;
  children: React.ReactNode;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  className,
  height,
  minHeight = 120,
  maxHeight = 2000,
  onResize,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current || !panelRef.current) {
        return;
      }

      const rect = panelRef.current.getBoundingClientRect();
      const nextHeight = rect.bottom - event.clientY;
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, nextHeight));
      onResize(clampedHeight);
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) {
        return;
      }

      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [maxHeight, minHeight, onResize]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={panelRef}
      className={cn('relative shrink-0 border-t border-border', className)}
      style={{ height }}
    >
      <div
        className="resizer resizer-vertical absolute inset-x-0 top-0 z-20 h-1.5"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize bottom panel"
      />
      <div className="h-full pt-1">{children}</div>
    </div>
  );
};
