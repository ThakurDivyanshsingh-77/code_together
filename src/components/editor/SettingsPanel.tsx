import React from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Settings, Type, AlignLeft, Code } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SettingsPanelProps {
  className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ className }) => {
  const {
    editorFontSize,
    setEditorFontSize,
    editorWordWrap,
    setEditorWordWrap,
    editorMinimap,
    setEditorMinimap
  } = useEditorStore();

  return (
    <div className={`flex flex-col h-full bg-sidebar ${className || ''}`}>
      <div className="panel-header mb-4 p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        
        {/* Editor Settings Section */}
        <div className="space-y-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Editor
          </h3>

          {/* Font Size */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="font-size" className="text-sm font-medium">Font Size</Label>
              </div>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                {editorFontSize}px
              </span>
            </div>
            <Slider
              id="font-size"
              min={10}
              max={28}
              step={1}
              value={[editorFontSize]}
              onValueChange={(val) => setEditorFontSize(val[0])}
            />
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="word-wrap" className="text-sm font-medium">Word Wrap</Label>
                  <p className="text-xs text-muted-foreground">Wrap lines that exceed editor width</p>
                </div>
              </div>
              <Switch
                id="word-wrap"
                checked={editorWordWrap === 'on'}
                onCheckedChange={(checked) => setEditorWordWrap(checked ? 'on' : 'off')}
              />
            </div>
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="minimap" className="text-sm font-medium">Minimap</Label>
                  <p className="text-xs text-muted-foreground">Show code minimap sidebar</p>
                </div>
              </div>
              <Switch
                id="minimap"
                checked={editorMinimap}
                onCheckedChange={setEditorMinimap}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
