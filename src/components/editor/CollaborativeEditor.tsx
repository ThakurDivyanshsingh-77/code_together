import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Lock, LockOpen, Save, ShieldAlert, Users, Wifi } from 'lucide-react';
import { LoadFolderDialog } from './LoadFolderDialog';
import { ActivityBar } from './ActivityBar';
import { ActiveUsersPanel } from './ActiveUsersPanel';
import { BottomPanel } from './BottomPanel';
import { ChatPanel } from './ChatPanel';
import { EditorTabs } from './EditorTabs';
import { FileHistoryPanel } from './FileHistoryPanel';
import { FileTree } from './FileTree';
import { HTMLPreview } from './HTMLPreview';
import { MonacoEditor } from './MonacoEditor';
import { SearchPanel } from './SearchPanel';
import { StatusBar } from './StatusBar';
import { TerminalPanel } from './TerminalPanel';
import { AIConsole } from './AIConsole';
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

import { useParams, useLocation, useNavigate } from 'react-router-dom';

interface CollaborativeEditorProps {
  projectId?: string;
  projectName?: string;
  projectOwnerId?: string;
  projectRole?: string | null;
  onBack?: () => void;
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

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = (props) => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const projectId = props.projectId || roomId || '';
  const projectName = props.projectName && props.projectName !== 'Loading...' 
      ? props.projectName 
      : location.state?.projectName || 'Collaborative Code Session';
  const projectOwnerId = props.projectOwnerId || location.state?.projectOwnerId || '';
  const projectRole = props.projectRole !== undefined && props.projectRole !== null
      ? props.projectRole 
      : location.state?.projectRole || null;
  const onBack = props.onBack || (() => navigate('/dashboard'));

  const { user, profile } = useAuth();
  const {
    files: dbFiles,
    loading,
    projectNotFound,
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
    setSidebarWidth,
    setRightPanelWidth,
    setPendingTerminalCommand,
    activeActivityBar,
    htmlPreviewLayout,
    setHtmlPreviewLayout,
    tabs,
    activeTabId,
    setFilesFromDb,
    setCollaborators,
  } = useEditorStore();

  const handleOpenInTerminal = async (folderPath: string) => {
    try {
      const { apiRequest } = await import('@/lib/api');
      const result = await apiRequest<{ path: string; filesWritten: number }>(
        `/local/projects/${projectId}/write-to-disk`,
        { method: 'POST', body: { folderPath } }
      );
      setActiveBottomPanel('terminal');
      setPendingTerminalCommand(`cd "${result.path}"`);
      toast.success(`Project written to disk (${result.filesWritten} files). Opening terminal…`);
    } catch {
      // fallback: just open terminal
      setActiveBottomPanel('terminal');
      toast.error('Could not export project to disk. Terminal opened at current directory.');
    }
  };

  useEffect(() => {
    if (!loading && dbFiles.length > 0) {
      setFilesFromDb(dbFiles);
      setInitialized(true);
    } else if (!loading && dbFiles.length === 0) {
      setFilesFromDb([]);
      setInitialized(true);
    }
  }, [dbFiles, loading, setFilesFromDb]);

  // Redirect to dashboard if project not found
  useEffect(() => {
    if (projectNotFound) {
      toast.error('Project not found or has been deleted');
      navigate('/dashboard');
    }
  }, [projectNotFound, navigate]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;
  const activeFileId = activeTab?.fileId || null;
  const activeFileNode = useMemo(
    () => (activeFileId ? findFileNodeById(files, activeFileId) : null),
    [files, activeFileId]
  );

  // Derived values for HTML preview
  const currentCode = activeTab?.content || '';
  const currentLanguage = activeTab?.language || 'plaintext';
  const isHtmlFile = currentLanguage.toLowerCase() === 'html' || currentLanguage.toLowerCase() === 'css';

  // Reset preview layout when switching away from HTML/CSS files
  useEffect(() => {
    if (!isHtmlFile && htmlPreviewLayout !== 'editor') {
      setHtmlPreviewLayout('editor');
    }
  }, [isHtmlFile]);

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

  const rightSidebarWidth = rightPanelWidth;

  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => setSidebarWidth(startWidth + ev.clientX - startX);
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth, setSidebarWidth]);

  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;
    const onMove = (ev: MouseEvent) => setRightPanelWidth(startWidth - (ev.clientX - startX));
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [rightPanelWidth, setRightPanelWidth]);

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
      <div className="flex h-11 items-center border-b border-border bg-sidebar px-3 text-xs">
        <div className="flex shrink-0 items-center gap-3">
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

        <div className="mx-3 hidden min-w-0 flex-1 items-center justify-center gap-2 text-[12px] text-muted-foreground xl:flex">
          <span className="truncate">{activeTab?.path || 'Collaborative Code Editor'}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

          {canEditProject && (
            <LoadFolderDialog
              projectId={projectId}
              onImportComplete={() => void refetch(true)}
            />
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

        <div className="flex overflow-hidden" style={{ width: sidebarWidth, flexShrink: 0 }}>
          <div className="flex flex-col overflow-hidden border-r border-border bg-sidebar flex-1 min-w-0">
          {activeActivityBar === 'files' && (
            <FileTree
              className="flex-1"
              readOnly={!canEditProject}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameNode={handleRenameNode}
              onMoveNode={handleMoveNode}
              onDeleteFile={handleDeleteFile}
              onOpenInTerminal={handleOpenInTerminal}
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
          {/* Left sidebar resize handle */}
          <div
            onMouseDown={startSidebarResize}
            className="resizer resizer-horizontal w-1 flex-shrink-0 z-10"
            title="Drag to resize explorer"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">

            {/* Editor column — terminal/AI console only affects this column */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

              {/* Editor + Preview Split Container */}
              <div className="flex min-w-0 flex-1 overflow-hidden">

                {/* Monaco Editor — always shown unless Preview-only mode */}
                {(htmlPreviewLayout === 'editor' || htmlPreviewLayout === 'split' || !isHtmlFile) && (
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
                )}

                {/* HTML Preview — shown in split & preview modes for html/css files */}
                {(htmlPreviewLayout === 'split' || htmlPreviewLayout === 'preview') && isHtmlFile && (
                  <div
                    className="flex min-w-0 flex-col overflow-hidden border-l border-border"
                    style={{ flex: htmlPreviewLayout === 'preview' ? '1 1 100%' : '1 1 50%' }}
                  >
                    <HTMLPreview code={currentCode} onClose={() => setHtmlPreviewLayout('editor')} />
                  </div>
                )}

              </div>

              {/* Bottom panel — only inside editor column, right panel unaffected */}
              {activeBottomPanel && (
                <BottomPanel height={bottomPanelHeight} onResize={setBottomPanelHeight}>
                  <div className="flex flex-col h-full">
                    <div className="flex items-center border-b border-[#333] shrink-0" style={{ backgroundColor: '#252526' }}>
                      <button
                        onClick={() => setActiveBottomPanel('terminal')}
                        className="px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors border-t-2"
                        style={{
                          borderTopColor: activeBottomPanel === 'terminal' ? '#ffb86c' : 'transparent',
                          color: activeBottomPanel === 'terminal' ? '#ffb86c' : '#6272a4',
                          backgroundColor: activeBottomPanel === 'terminal' ? 'rgba(255,184,108,0.07)' : 'transparent',
                        }}
                      >
                        Terminal
                      </button>
                      <button
                        onClick={() => setActiveBottomPanel('ai')}
                        className="px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors border-t-2"
                        style={{
                          borderTopColor: activeBottomPanel === 'ai' ? '#bd93f9' : 'transparent',
                          color: activeBottomPanel === 'ai' ? '#bd93f9' : '#6272a4',
                          backgroundColor: activeBottomPanel === 'ai' ? 'rgba(189,147,249,0.07)' : 'transparent',
                        }}
                      >
                        AI Console
                      </button>
                      <div className="flex-1" />
                      <button
                        className="px-2 py-1 text-[11px] hover:bg-white/5 transition-colors"
                        style={{ color: '#6272a4' }}
                        onClick={() => setActiveBottomPanel(null)}
                        title="Close panel"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {activeBottomPanel === 'terminal' && (
                        <TerminalPanel
                          className="h-full"
                          codeToRun={currentCode}
                          language={currentLanguage}
                          filePath={activeTab?.path}
                          fileName={activeTab?.name}
                        />
                      )}
                      {activeBottomPanel === 'ai' && (
                        <AIConsole
                          className="h-full"
                          projectId={projectId}
                          onFilesChanged={() => void refetch(true)}
                        />
                      )}
                    </div>
                  </div>
                </BottomPanel>
              )}
            </div>

            {/* Right panel — always full height, never affected by bottom panel */}
            <div className="flex overflow-hidden" style={{ width: rightSidebarWidth, flexShrink: 0 }}>
              {/* Right panel resize handle */}
              <div
                onMouseDown={startRightResize}
                className="resizer resizer-horizontal w-1 flex-shrink-0 z-10"
                title="Drag to resize panel"
              />
              <div
                className="flex flex-col overflow-hidden border-l border-border bg-card flex-1 min-w-0">
              <ActiveUsersPanel
                users={onlineUsers}
                currentUserId={user?.id || null}
                activeFilePath={activeTab?.path || null}
              />

              <div className="min-h-0 flex-1 overflow-hidden">
                {activeRightPanel === 'chat' && <ChatPanel className="h-full" projectId={projectId} />}
                {!activeRightPanel && (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Collaboration</p>
                    <p className="text-xs mt-1">Open Chat to collaborate with your team.</p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  );
};
