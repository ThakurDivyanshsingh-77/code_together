import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Lock, LockOpen, Save, ShieldAlert, Users, Wifi } from 'lucide-react';
import { ActivityBar } from './ActivityBar';
import { ActiveUsersPanel } from './ActiveUsersPanel';
import { AIAssistant } from './AIAssistant';
import { BottomPanel } from './BottomPanel';
import { ChatPanel } from './ChatPanel';
import { EditorTabs } from './EditorTabs';
import { FileHistoryPanel } from './FileHistoryPanel';
import { FileTree } from './FileTree';
import { MonacoEditor } from './MonacoEditor';
import { SearchPanel } from './SearchPanel';
import { StatusBar } from './StatusBar';
import { TerminalPanel } from './TerminalPanel';
import { SettingsPanel } from './SettingsPanel';
import { ExtensionsPanel } from './ExtensionsPanel';
import { InviteCollaboratorDialog } from '@/components/projects/InviteCollaboratorDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCollaborationSession } from '@/hooks/useCollaborationSession';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useEditorStore } from '@/store/editorStore';
import { FileNode } from '@/types/editor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CollaborativeEditorProps {
  projectId: string;
  projectName: string;
  projectOwnerId: string;
  projectRole: string | null;
  onBack: () => void;
}

const findFileNodeById = (nodes: FileNode[], fileId: string): FileNode | null => {
  for (const node of nodes) {
    if (node.id === fileId) return node;
    if (node.children) {
      const found = findFileNodeById(node.children, fileId);
      if (found) return found;
    }
  }

  return null;
};

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  projectId,
  projectName,
  projectOwnerId,
  projectRole,
  onBack,
}) => {
  const { user, profile } = useAuth();
  const {
    files: dbFiles,
    loading,
    createFile,
    renameNode,
    moveNode,
    acquireFileLock,
    releaseFileLock,
    deleteFile,
    refetch,
  } = useProjectFiles(projectId);
  const [initialized, setInitialized] = useState(false);
  const [isLockMutating, setIsLockMutating] = useState(false);

  const {
    files,
    sidebarWidth,
    rightPanelWidth,
    bottomPanelHeight,
    activeRightPanel,
    activeBottomPanel,
    setActiveBottomPanel,
    setBottomPanelHeight,
    activeActivityBar,
    tabs,
    activeTabId,
    setFilesFromDb,
    setCollaborators,
  } = useEditorStore();

  useEffect(() => {
    if (!loading && dbFiles.length > 0) {
      setFilesFromDb(dbFiles);
      setInitialized(true);
    } else if (!loading && dbFiles.length === 0 && projectRole !== 'viewer') {
      const initializeProject = async () => {
        await createFile(null, 'src', 'folder');
        await createFile('/src', 'index.js', 'file');
        await createFile(null, 'styles.css', 'file');
        toast.success('Project initialized with starter files');
      };

      void initializeProject();
    }
  }, [dbFiles, loading, projectRole, setFilesFromDb, createFile]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;
  const activeFileId = activeTab?.fileId || null;
  const activeFileNode = useMemo(
    () => (activeFileId ? findFileNodeById(files, activeFileId) : null),
    [files, activeFileId]
  );

  const {
    participants,
    onlineUsers,
    role: liveRole,
    connectionStatus,
    saveStatus,
    lastSavedAt,
    sendCodeChange,
    updateCursor,
  } = useCollaborationSession({
    projectId,
    activeFile: activeFileNode,
    refetchFiles: refetch,
  });

  useEffect(() => {
    setCollaborators(
      participants
        .filter((participant) => participant.user_id !== user?.id)
        .map((participant) => ({
          id: participant.user_id,
          name: participant.profile?.display_name || 'Unknown',
          email: '',
          color: participant.profile?.color || 1,
          isOnline: participant.is_online,
        }))
    );
  }, [participants, setCollaborators, user?.id]);

  const effectiveRole = projectRole || liveRole || (user?.id === projectOwnerId ? 'owner' : null);
  const canEditProject =
    user?.id === projectOwnerId || effectiveRole === 'editor' || effectiveRole === 'admin' || effectiveRole === 'owner';
  const isProjectOwner = user?.id === projectOwnerId;

  const activeLock = activeFileNode?.lock || null;
  const isActiveLockValid =
    Boolean(activeLock?.expiresAt) && new Date(activeLock.expiresAt).getTime() > Date.now();
  const isLockedByCurrentUser = Boolean(isActiveLockValid && activeLock?.userId === user?.id);
  const isLockedByAnotherUser = Boolean(isActiveLockValid && activeLock?.userId !== user?.id);
  const lockOwnerName = activeLock?.userName || 'another collaborator';
  const isReadOnly = !canEditProject || isLockedByAnotherUser;
  const readOnlyReason = !canEditProject
    ? 'Viewer access: read-only mode'
    : isLockedByAnotherUser
      ? `This file is locked by ${lockOwnerName}`
      : undefined;

  const currentCode = activeTab?.content || '';
  const currentLanguage = activeTab?.language || 'plaintext';
  const rightSidebarWidth = Math.max(280, Math.min(rightPanelWidth, 360));

  useEffect(() => {
    if (!activeFileId || !isLockedByCurrentUser) {
      return;
    }

    const interval = window.setInterval(() => {
      void acquireFileLock(activeFileId, 60, true);
    }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeFileId, isLockedByCurrentUser, acquireFileLock]);

  const handleContentChange = async (_fileId: string, content: string) => {
    if (isReadOnly) {
      return;
    }

    sendCodeChange(content);
  };

  const handleToggleLock = async () => {
    if (!activeFileId || !activeFileNode || !canEditProject) {
      return;
    }

    setIsLockMutating(true);
    const action = isLockedByCurrentUser ? releaseFileLock(activeFileId) : acquireFileLock(activeFileId, 60);
    const { error } = await action;
    setIsLockMutating(false);

    if (error) {
      toast.error(error.message || (isLockedByCurrentUser ? 'Failed to unlock file' : 'Failed to lock file'));
      return;
    }

    toast.success(isLockedByCurrentUser ? 'File unlocked' : 'File locked');
    await refetch(true);
  };

  const handleCreateFile = async (parentPath: string, name: string) => {
    const { error } = await createFile(parentPath || null, name, 'file');
    if (error) {
      toast.error(error.message || 'Failed to create file');
    } else {
      await refetch(true);
    }
  };

  const handleCreateFolder = async (parentPath: string, name: string) => {
    const { error } = await createFile(parentPath || null, name, 'folder');
    if (error) {
      toast.error(error.message || 'Failed to create folder');
    } else {
      await refetch(true);
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    const { error } = await deleteFile(fileId, filePath);
    if (error) {
      toast.error(error.message || 'Failed to delete file');
    } else {
      await refetch(true);
    }
  };

  const handleRenameNode = async (node: FileNode, nextName: string) => {
    const { error } = await renameNode(node, nextName);
    if (error) {
      toast.error(error.message || 'Failed to rename');
    } else {
      await refetch(true);
    }
  };

  const handleMoveNode = async (node: FileNode, destinationParentPath: string | null) => {
    const { error } = await moveNode(node, destinationParentPath);
    if (error) {
      toast.error(error.message || 'Failed to move item');
    } else {
      await refetch(true);
    }
  };

  if (loading && !initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="relative flex h-11 items-center justify-between border-b border-border bg-sidebar px-3 text-xs">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-sm hover:bg-sidebar-hover">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-foreground">{projectName}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {activeTab?.name || 'Open a file to start collaborating'}
            </div>
          </div>

          <span className="rounded-sm border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {effectiveRole || 'viewer'}
          </span>
        </div>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[12px] text-muted-foreground xl:flex">
          <span>{activeTab?.path || 'Collaborative Code Editor'}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-sm border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground md:flex">
            <Wifi className={cn('h-3 w-3', connectionStatus === 'connected' ? 'text-success' : 'text-warning')} />
            <span>{connectionStatus}</span>
          </div>

          <div className="hidden items-center gap-1 rounded-sm border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground lg:flex">
            <Save className={cn('h-3 w-3', saveStatus === 'saved' ? 'text-success' : saveStatus === 'saving' ? 'text-warning' : 'text-destructive')} />
            <span>
              {saveStatus === 'saving'
                ? 'Autosaving...'
                : lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : 'Autosave ready'}
            </span>
          </div>

          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
            <Users className="h-3 w-3" />
            {onlineUsers.length} online
          </span>

          {activeFileNode?.type === 'file' && canEditProject && (
            <Button
              variant={isLockedByCurrentUser ? 'outline' : 'default'}
              size="sm"
              onClick={() => void handleToggleLock()}
              disabled={isLockMutating || isLockedByAnotherUser}
              className="gap-2"
            >
              {isLockMutating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isLockedByCurrentUser ? (
                <LockOpen className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {isLockedByCurrentUser ? 'Unlock File' : 'Lock File'}
            </Button>
          )}

          {isLockedByAnotherUser && (
            <div className="hidden items-center gap-1 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 lg:flex">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>This file is locked by {lockOwnerName}</span>
            </div>
          )}

          {isProjectOwner && <InviteCollaboratorDialog projectId={projectId} />}
          <div
            className="hidden h-7 w-7 items-center justify-center rounded-sm text-[10px] font-medium text-white sm:flex"
            style={{ backgroundColor: `hsl(var(--user-${profile?.color || 1}))` }}
            title={`${profile?.display_name || 'You'} (you)`}
          >
            {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />

        <div
          className="flex flex-col overflow-hidden border-r border-border bg-sidebar"
          style={{ width: sidebarWidth }}
        >
          {activeActivityBar === 'files' && (
            <FileTree
              className="flex-1"
              readOnly={!canEditProject}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameNode={handleRenameNode}
              onMoveNode={handleMoveNode}
              onDeleteFile={handleDeleteFile}
            />
          )}
          {activeActivityBar === 'search' && <SearchPanel className="flex-1" />}
          {activeActivityBar === 'git' && (
            <FileHistoryPanel
              className="flex-1 border-none"
              projectId={projectId}
              file={activeFileNode}
              refreshKey={lastSavedAt}
            />
          )}
          {activeActivityBar === 'extensions' && (
            <ExtensionsPanel className="flex-1" />
          )}
          {activeActivityBar === 'settings' && (
            <div className="flex flex-col h-full overflow-hidden">
              <SettingsPanel className="flex-1" />
              <div className="p-4 border-t border-border/50 shrink-0">
                <div className="panel-header mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Permissions</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {canEditProject ? 'Editor access enabled for this project.' : 'Viewer access is read-only.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <EditorTabs />
              <MonacoEditor
                className="flex-1"
                onContentChange={handleContentChange}
                readOnly={isReadOnly}
                readOnlyReason={readOnlyReason}
                onCursorChange={(line, column) => {
                  updateCursor(line, column);
                }}
                collaboratorCursors={onlineUsers
                  .filter((participant) => participant.user_id !== user?.id)
                  .map((participant) => ({
                    userId: participant.user_id,
                    userName: participant.profile?.display_name || 'Unknown',
                    color: participant.profile?.color || 1,
                    line: participant.cursor_line || 1,
                    column: participant.cursor_column || 1,
                    filePath: participant.file_path || '',
                  }))}
              />
            </div>

            <div
              className="flex flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightSidebarWidth }}
            >
              <ActiveUsersPanel
                users={onlineUsers}
                currentUserId={user?.id || null}
                activeFilePath={activeTab?.path || null}
              />

              <div className="min-h-0 flex-1 overflow-hidden">
                {activeRightPanel === 'chat' && <ChatPanel className="h-full" projectId={projectId} />}
                {activeRightPanel === 'ai' && <AIAssistant className="h-full" />}
                {!activeRightPanel && (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Collaboration</p>
                    <p className="text-xs mt-1">Open Chat or AI Assistant to collaborate with your team.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {activeBottomPanel && (
            <BottomPanel height={bottomPanelHeight} onResize={setBottomPanelHeight}>
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
      </div>

      <StatusBar />
    </div>
  );
};
