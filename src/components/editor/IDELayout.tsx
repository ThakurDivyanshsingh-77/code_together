import React from 'react';
import { TitleBar } from './TitleBar';
import { ActivityBar } from './ActivityBar';
import { FileTree } from './FileTree';
import { SearchPanel } from './SearchPanel';
import { EditorTabs } from './EditorTabs';
import { MonacoEditor } from './MonacoEditor';
import { ChatPanel } from './ChatPanel';
import { AIAssistant } from './AIAssistant';
import { TerminalPanel } from './TerminalPanel';
import { BottomPanel } from './BottomPanel';
import { StatusBar } from './StatusBar';
import { SettingsPanel } from './SettingsPanel';
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
    setBottomPanelHeight,
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
          {activeActivityBar === 'search' && <SearchPanel className="flex-1" />}
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
          {activeActivityBar === 'settings' && <SettingsPanel className="flex-1" />}
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
            <BottomPanel
              height={bottomPanelHeight}
              onResize={setBottomPanelHeight}
            >
              <TerminalPanel 
                className="h-full"
                onClose={() => setActiveBottomPanel(null)}
                codeToRun={currentCode}
                language={currentLanguage}
                filePath={activeTab?.path}
                fileName={activeTab?.name}
              />
            </BottomPanel>
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
