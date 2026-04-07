import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Loader2, Save, HardDrive } from 'lucide-react';
import { ActivityBar } from './ActivityBar';
import { AIAssistant } from './AIAssistant';
import { BottomPanel } from './BottomPanel';
import { EditorTabs } from './EditorTabs';
import { FileTree } from './FileTree';
import { HTMLPreview } from './HTMLPreview';
import { MonacoEditor } from './MonacoEditor';
import { SearchPanel } from './SearchPanel';
import { StatusBar } from './StatusBar';
import { TerminalPanel } from './TerminalPanel';
import { SettingsPanel } from './SettingsPanel';
import { ExtensionsPanel } from './ExtensionsPanel';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLocalProject } from '@/hooks/useLocalProject';
import { useEditorStore } from '@/store/editorStore';
import { FileNode, getLanguageFromFileName, EditorTab } from '@/types/editor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

const updateNodeInTree = (nodes: FileNode[], fileId: string, updates: Partial<FileNode>): FileNode[] =>
  nodes.map((n) => {
    if (n.id === fileId) return { ...n, ...updates };
    if (n.children) return { ...n, children: updateNodeInTree(n.children, fileId, updates) };
    return n;
  });

export const LocalProjectEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dirPath = searchParams.get('path') || '';

  const { profile } = useAuth();
  const {
    files: localFiles,
    loading,
    rootPath,
    projectName,
    openProject,
    readFile,
    saveFile,
  } = useLocalProject();

  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const readFileRef = useRef(readFile);
  readFileRef.current = readFile;

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
    htmlPreviewLayout,
    setHtmlPreviewLayout,
    tabs,
    activeTabId,
    setFilesFromDb,
  } = useEditorStore();

  // Open the project on mount
  useEffect(() => {
    if (!dirPath) return;

    const init = async () => {
      const { error } = await openProject(dirPath);
      if (error) {
        toast.error(`Failed to open project: ${error.message}`);
      }
    };

    void init();
  }, [dirPath, openProject]);

  // When local files load, push them to the editor store
  useEffect(() => {
    if (!loading && localFiles.length > 0) {
      setFilesFromDb(localFiles);
      setInitialized(true);
    } else if (!loading && localFiles.length === 0 && dirPath) {
      setFilesFromDb([]);
      setInitialized(true);
    }
  }, [localFiles, loading, setFilesFromDb, dirPath]);

  // Patch the store's openFile to lazy-load content from disk for local files
  useEffect(() => {
    const originalOpenFile = useEditorStore.getState().openFile;

    const patchedOpenFile = (fileId: string) => {
      const state = useEditorStore.getState();
      const file = findFileNodeById(state.files, fileId);

      if (!file || file.type === 'folder') return;

      // If file already has content loaded, use the original open
      if (file.content !== undefined && file.content !== null && file.content !== '') {
        originalOpenFile(fileId);
        return;
      }

      // Check if tab already exists (content was already loaded before)
      const existingTab = state.tabs.find((tab) => tab.fileId === fileId);
      if (existingTab) {
        useEditorStore.setState({ activeTabId: existingTab.id, activeFileId: fileId });
        return;
      }

      // Lazy-load from disk
      readFileRef.current(file.path).then(({ data, error }) => {
        if (error) {
          toast.error(`Failed to read file: ${error.message}`);
          return;
        }

        if (data) {
          // Update the file node content in the store
          const currentState = useEditorStore.getState();
          const updatedFiles = updateNodeInTree(
            currentState.files,
            fileId,
            { content: data.content, language: data.language }
          );

          // Create a new tab manually
          const newTab: EditorTab = {
            id: `tab-${fileId}`,
            fileId,
            name: file.name,
            path: file.path,
            language: data.language || getLanguageFromFileName(file.name),
            content: data.content,
            revision: 0,
            isDirty: false,
          };

          useEditorStore.setState({
            files: updatedFiles,
            tabs: [...currentState.tabs, newTab],
            activeTabId: newTab.id,
            activeFileId: fileId,
          });
        }
      });
    };

    useEditorStore.setState({ openFile: patchedOpenFile });

    return () => {
      useEditorStore.setState({ openFile: originalOpenFile });
    };
  }, []);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null;
  const activeFileId = activeTab?.fileId || null;
  const activeFileNode = useMemo(
    () => (activeFileId ? findFileNodeById(files, activeFileId) : null),
    [files, activeFileId]
  );

  const currentCode = activeTab?.content || '';
  const currentLanguage = activeTab?.language || 'plaintext';
  const isHtmlFile = currentLanguage.toLowerCase() === 'html' || currentLanguage.toLowerCase() === 'css';

  useEffect(() => {
    if (!isHtmlFile && htmlPreviewLayout !== 'editor') {
      setHtmlPreviewLayout('editor');
    }
  }, [isHtmlFile]);

  const rightSidebarWidth = Math.max(280, Math.min(rightPanelWidth, 360));

  // Save file to disk
  const handleSave = useCallback(async () => {
    if (!activeTab || !activeFileNode) return;

    setSaveStatus('saving');
    const { error } = await saveFile(activeFileNode.path, activeTab.content);

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      setSaveStatus('unsaved');
    } else {
      setSaveStatus('saved');
      useEditorStore.getState().markFileSaved(activeTab.fileId);
      toast.success('File saved to disk');
    }
  }, [activeTab, activeFileNode, saveFile]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Track dirty state
  useEffect(() => {
    if (activeTab?.isDirty) {
      setSaveStatus('unsaved');
    }
  }, [activeTab?.isDirty]);

  const handleContentChange = async (_fileId: string, content: string) => {
    useEditorStore.getState().updateFileContent(_fileId, content);
  };

  const [terminalCwd, setTerminalCwd] = useState<string>('C:\\Projects');
  const [displayCwd, setDisplayCwd] = useState<string>('C:\\Projects');

  // Update terminal directory when rootPath loads from API
  useEffect(() => {
    const defaultDir = 'C:\\Projects'; // Default project directory
    
    if (rootPath && rootPath.trim() !== '') {
      setTerminalCwd(rootPath);
      setDisplayCwd(rootPath);
    } else if (dirPath && dirPath.trim() !== '') {
      setTerminalCwd(dirPath);
      setDisplayCwd(dirPath);
    } else {
      // Use default directory as fallback
      setTerminalCwd(defaultDir);
      setDisplayCwd(defaultDir);
    }
  }, [rootPath, dirPath]);

  const handleOpenInTerminal = useCallback((folderPath: string) => {
    const basePath = rootPath && rootPath.trim() !== '' ? rootPath : dirPath;
    if (!basePath || basePath.trim() === '') {
      toast.error('Project path not loaded yet. Please wait...');
      return;
    }
    
    // Build absolute path from virtual folder path
    let absolutePath: string;
    if (folderPath === '/') {
      absolutePath = basePath;
    } else {
      // Remove leading slash and convert to Windows path
      const cleanPath = folderPath.replace(/^\//, '').replace(/\//g, '\\');
      absolutePath = `${basePath}\\${cleanPath}`;
    }
    
    setTerminalCwd(absolutePath);
    setDisplayCwd(absolutePath);
    setActiveBottomPanel('terminal');
    toast.success(`Terminal opened at: ${absolutePath}`);
  }, [rootPath, dirPath, setActiveBottomPanel]);

  if (loading && !initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Title Bar */}
      <div className="flex h-11 items-center border-b border-border bg-sidebar px-3 text-xs">
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8 rounded-sm hover:bg-sidebar-hover">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-foreground flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              {projectName || 'Local Project'}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {activeTab?.name || rootPath || 'Open a file to start editing'}
            </div>
          </div>

          <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
            local
          </span>
        </div>

        <div className="mx-3 hidden min-w-0 flex-1 items-center justify-center gap-2 text-[12px] text-muted-foreground xl:flex">
          <span className="truncate">{activeTab?.path || 'Local Project Editor'}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1 rounded-sm border border-border bg-muted px-2 py-1 text-[11px] text-muted-foreground md:flex">
            <Save className={cn('h-3 w-3', saveStatus === 'saved' ? 'text-success' : saveStatus === 'saving' ? 'text-warning' : 'text-destructive')} />
            <span>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : 'Unsaved — Ctrl+S to save'}
            </span>
          </div>

          {activeTab?.isDirty && (
            <Button variant="default" size="sm" onClick={() => void handleSave()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          )}

          <div
            className="hidden h-7 w-7 items-center justify-center rounded-sm text-[10px] font-medium text-white sm:flex"
            style={{ backgroundColor: `hsl(var(--user-${profile?.color || 1}))` }}
            title={`${profile?.display_name || 'You'} (you)`}
          >
            {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />

        <div
          className="flex flex-col overflow-hidden border-r border-border bg-sidebar"
          style={{ width: sidebarWidth }}
        >
          {activeActivityBar === 'files' && (
            <FileTree
              className="flex-1"
              readOnly={true}
              onOpenInTerminal={handleOpenInTerminal}
            />
          )}
          {activeActivityBar === 'search' && <SearchPanel className="flex-1" />}
          {activeActivityBar === 'extensions' && <ExtensionsPanel className="flex-1" />}
          {activeActivityBar === 'settings' && (
            <div className="flex flex-col h-full overflow-hidden">
              <SettingsPanel className="flex-1" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 overflow-hidden">
              {(htmlPreviewLayout === 'editor' || htmlPreviewLayout === 'split' || !isHtmlFile) && (
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  <EditorTabs />
                  <MonacoEditor
                    className="flex-1"
                    onContentChange={handleContentChange}
                    readOnly={false}
                    onCursorChange={() => {}}
                    collaboratorCursors={[]}
                  />
                </div>
              )}

              {(htmlPreviewLayout === 'split' || htmlPreviewLayout === 'preview') && isHtmlFile && (
                <div
                  className="flex min-w-0 flex-col overflow-hidden border-l border-border"
                  style={{ flex: htmlPreviewLayout === 'preview' ? '1 1 100%' : '1 1 50%' }}
                >
                  <HTMLPreview code={currentCode} />
                </div>
              )}
            </div>

            <div
              className="flex flex-col overflow-hidden border-l border-border bg-card"
              style={{ width: rightSidebarWidth }}
            >
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeRightPanel === 'ai' && <AIAssistant className="h-full" projectId="local" />}
                {!activeRightPanel && (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
                    <HardDrive className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Local Project</p>
                    <p className="text-xs mt-1">Editing files directly from your filesystem. Press Ctrl+S to save.</p>
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
                cwd={displayCwd}
              />
            </BottomPanel>
          )}
        </div>
      </div>

      <StatusBar />
    </div>
  );
};
