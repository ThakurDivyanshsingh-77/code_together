import React from 'react';
import { TitleBar } from './TitleBar';
import { ActivityBar } from './ActivityBar';
import { FileTree } from './FileTree';
import { EditorTabs } from './EditorTabs';
import { MonacoEditor } from './MonacoEditor';
import { ChatPanel } from './ChatPanel';
import { AIAssistant } from './AIAssistant';
import { TerminalPanel } from './TerminalPanel';
import { StatusBar } from './StatusBar';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

export const IDELayout: React.FC = () => {
  const { 
    sidebarWidth,
    rightPanelWidth,
    bottomPanelHeight,
    activeRightPanel,
    activeBottomPanel,
    setActiveBottomPanel,
    activeActivityBar,
    tabs,
    activeTabId
  } = useEditorStore();

  // Get current file content and language for code execution
  const activeTab = tabs.find(t => t.id === activeTabId);
  const currentCode = activeTab?.content || '';
  const currentLanguage = activeTab?.language || 'plaintext';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        <div 
          className="flex flex-col bg-sidebar border-r border-border overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          {activeActivityBar === 'files' && <FileTree className="flex-1" />}
          {activeActivityBar === 'search' && (
            <div className="flex-1 p-4">
              <div className="panel-header mb-4">
                <span>Search</span>
              </div>
              <input
                type="text"
                placeholder="Search files..."
                className="w-full px-3 py-2 bg-input border border-border rounded text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          {activeActivityBar === 'git' && (
            <div className="flex-1 p-4">
              <div className="panel-header mb-4">
                <span>Source Control</span>
              </div>
              <p className="text-sm text-muted-foreground">No changes detected</p>
            </div>
          )}
          {activeActivityBar === 'extensions' && (
            <div className="flex-1 p-4">
              <div className="panel-header mb-4">
                <span>Extensions</span>
              </div>
              <p className="text-sm text-muted-foreground">Browse extensions</p>
            </div>
          )}
          {activeActivityBar === 'settings' && (
            <div className="flex-1 p-4">
              <div className="panel-header mb-4">
                <span>Settings</span>
              </div>
              <p className="text-sm text-muted-foreground">Editor settings</p>
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Editor with tabs */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <EditorTabs />
            <MonacoEditor className="flex-1" />
          </div>

          {/* Bottom Panel (Terminal) */}
          {activeBottomPanel && (
            <div 
              className="border-t border-border shrink-0"
              style={{ height: bottomPanelHeight }}
            >
              <TerminalPanel 
                className="h-full"
                onClose={() => setActiveBottomPanel(null)}
                codeToRun={currentCode}
                language={currentLanguage}
              />
            </div>
          )}
        </div>

        {/* Right Panel (Chat / AI) */}
        {activeRightPanel && (
          <div
            className="flex flex-col bg-card border-l border-border overflow-hidden animate-slide-in-right"
            style={{ width: rightPanelWidth }}
          >
            {activeRightPanel === 'chat' && <ChatPanel className="flex-1" />}
            {activeRightPanel === 'ai' && <AIAssistant className="flex-1" />}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};
