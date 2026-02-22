import React, { useEffect, useState } from 'react';
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
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InviteCollaboratorDialog } from '@/components/projects/InviteCollaboratorDialog';
import { toast } from 'sonner';

interface CollaborativeEditorProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  projectId,
  projectName,
  onBack,
}) => {
  const { profile } = useAuth();
  const { files, loading, createFile, updateFileContent, deleteFile } = useProjectFiles(projectId);
  const { onlineUsers, joinProject, leaveProject, updateCursor } = usePresence(projectId);
  const [initialized, setInitialized] = useState(false);

  const {
    sidebarWidth,
    rightPanelWidth,
    bottomPanelHeight,
    activeRightPanel,
    activeBottomPanel,
    setActiveBottomPanel,
    activeActivityBar,
    tabs,
    activeTabId,
    setFilesFromDb,
    openFile,
    updateFileContentLocal,
  } = useEditorStore();

  // Join project on mount
  useEffect(() => {
    joinProject();
    return () => {
      leaveProject();
    };
  }, [joinProject, leaveProject]);

  // Sync files from database to store
  useEffect(() => {
    if (!loading && files.length > 0) {
      setFilesFromDb(files);
      setInitialized(true);
    } else if (!loading && files.length === 0) {
      // Initialize with default files for new project
      const initializeProject = async () => {
        await createFile(null, 'src', 'folder');
        await createFile('/src', 'index.ts', 'file');
        await createFile(null, 'README.md', 'file');
        toast.success('Project initialized with default files');
      };
      initializeProject();
    }
  }, [files, loading, setFilesFromDb, createFile]);

  // Handle file content updates with sync to database
  const handleContentChange = async (fileId: string, content: string) => {
    updateFileContentLocal(fileId, content);
    
    // Debounced sync to database happens in the hook
    const { error } = await updateFileContent(fileId, content);
    if (error) {
      console.error('Failed to save file:', error);
    }
  };

  // Handle file creation
  const handleCreateFile = async (parentPath: string, name: string) => {
    const { error } = await createFile(parentPath || null, name, 'file');
    if (error) {
      toast.error('Failed to create file');
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string, filePath: string) => {
    const { error } = await deleteFile(fileId, filePath);
    if (error) {
      toast.error('Failed to delete file');
    }
  };

  // Get current file content and language for code execution
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const currentCode = activeTab?.content || '';
  const currentLanguage = activeTab?.language || 'plaintext';

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="relative flex items-center justify-between h-9 px-3 bg-sidebar border-b border-border text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7 rounded-sm hover:bg-sidebar-hover">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[12px] text-muted-foreground">Explorer</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate max-w-[280px]">{projectName}</span>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-[12px] text-muted-foreground pointer-events-none">
          {projectName} - CodeCollab
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            <div
              className="w-6 h-6 rounded-sm border border-background flex items-center justify-center text-white text-[10px] font-medium"
              style={{ backgroundColor: `hsl(var(--user-${profile?.color || 1}))` }}
              title={`${profile?.display_name} (you)`}
            >
              {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {onlineUsers.slice(0, 3).map((user) => (
              <div
                key={user.user_id}
                className="w-6 h-6 rounded-sm border border-background flex items-center justify-center text-white text-[10px] font-medium"
                style={{ backgroundColor: `hsl(var(--user-${user.profile?.color || 1}))` }}
                title={user.profile?.display_name}
              >
                {user.profile?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
            ))}

            {onlineUsers.length > 3 && (
              <div className="w-6 h-6 rounded-sm border border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                +{onlineUsers.length - 3}
              </div>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {onlineUsers.length + 1} online
          </span>
          <InviteCollaboratorDialog projectId={projectId} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        <div
          className="flex flex-col bg-sidebar border-r border-border overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          {activeActivityBar === 'files' && (
            <FileTree 
              className="flex-1" 
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
          )}
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
            <MonacoEditor 
              className="flex-1" 
              onContentChange={handleContentChange}
              onCursorChange={(line, column) => {
                if (activeTab) {
                  updateCursor(activeTab.path, line, column);
                }
              }}
              collaboratorCursors={onlineUsers.map(u => ({
                userId: u.user_id,
                userName: u.profile?.display_name || 'Unknown',
                color: u.profile?.color || 1,
                line: u.cursor_line || 1,
                column: u.cursor_column || 1,
                filePath: u.file_path || '',
              }))}
            />
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
            {activeRightPanel === 'chat' && <ChatPanel className="flex-1" projectId={projectId} />}
            {activeRightPanel === 'ai' && <AIAssistant className="flex-1" />}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};
