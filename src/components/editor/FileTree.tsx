import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { FileNode } from '@/types/editor';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

type FileLanguageOption = {
  key: string;
  label: string;
  extension: string;
  placeholder: string;
};

type DialogMode = 'create-file' | 'create-folder' | 'rename';

interface DragState {
  id: string;
  path: string;
  type: 'file' | 'folder';
}

const FILE_LANGUAGE_OPTIONS: FileLanguageOption[] = [
  { key: 'js', label: 'JavaScript (.js)', extension: '.js', placeholder: 'script.js' },
  { key: 'ts', label: 'TypeScript (.ts)', extension: '.ts', placeholder: 'index.ts' },
  { key: 'jsx', label: 'React JSX (.jsx)', extension: '.jsx', placeholder: 'Component.jsx' },
  { key: 'tsx', label: 'React TSX (.tsx)', extension: '.tsx', placeholder: 'Component.tsx' },
  { key: 'py', label: 'Python (.py)', extension: '.py', placeholder: 'main.py' },
  { key: 'html', label: 'HTML (.html)', extension: '.html', placeholder: 'index.html' },
  { key: 'css', label: 'CSS (.css)', extension: '.css', placeholder: 'styles.css' },
  { key: 'json', label: 'JSON (.json)', extension: '.json', placeholder: 'config.json' },
  { key: 'md', label: 'Markdown (.md)', extension: '.md', placeholder: 'README.md' },
  { key: 'java', label: 'Java (.java)', extension: '.java', placeholder: 'Main.java' },
  { key: 'go', label: 'Go (.go)', extension: '.go', placeholder: 'main.go' },
  { key: 'rs', label: 'Rust (.rs)', extension: '.rs', placeholder: 'main.rs' },
  { key: 'php', label: 'PHP (.php)', extension: '.php', placeholder: 'index.php' },
  { key: 'sql', label: 'SQL (.sql)', extension: '.sql', placeholder: 'query.sql' },
  { key: 'sh', label: 'Shell (.sh)', extension: '.sh', placeholder: 'script.sh' },
  { key: 'txt', label: 'Text (.txt)', extension: '.txt', placeholder: 'notes.txt' },
];

const FileIcon: React.FC<{ name: string; type: 'file' | 'folder'; isOpen?: boolean; useMaterialIcons?: boolean }> = ({
  name,
  type,
  isOpen,
  useMaterialIcons,
}) => {
  if (useMaterialIcons) {
    if (type === 'folder') return <span className="text-sm leading-none mr-2">{isOpen ? '📂' : '📁'}</span>;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'ts': case 'tsx': return <span className="text-sm leading-none mr-2">📘</span>;
      case 'js': case 'jsx': return <span className="text-sm leading-none mr-2">🟨</span>;
      case 'py': return <span className="text-sm leading-none mr-2">🐍</span>;
      case 'json': return <span className="text-sm leading-none mr-2">⚙️</span>;
      case 'md': return <span className="text-sm leading-none mr-2">📝</span>;
      case 'css': case 'scss': return <span className="text-sm leading-none mr-2">🎨</span>;
      case 'html': return <span className="text-sm leading-none mr-2">🌐</span>;
      case 'png': case 'jpg': case 'svg': return <span className="text-sm leading-none mr-2">🖼️</span>;
      case 'env': return <span className="text-sm leading-none mr-2">🔒</span>;
      default: return <span className="text-sm leading-none mr-2">📄</span>;
    }
  }

  if (type === 'folder') {
    return isOpen ? (
      <FolderOpen className="h-4 w-4 mr-1 text-[#dcb67a]" />
    ) : (
      <Folder className="h-4 w-4 mr-1 text-[#dcb67a]" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="h-4 w-4 mr-1 text-[#519aba]" />;
    case 'js':
    case 'jsx':
      return <FileCode className="h-4 w-4 mr-1 text-[#cbcb41]" />;
    case 'py':
      return <FileCode className="h-4 w-4 mr-1 text-[#3572a5]" />;
    case 'json':
      return <FileJson className="h-4 w-4 mr-1 text-[#cbcb41]" />;
    case 'md':
      return <FileText className="h-4 w-4 mr-1 text-[#7fb7ff]" />;
    case 'css':
    case 'scss':
      return <FileType className="h-4 w-4 mr-1 text-[#7fb7ff]" />;
    default:
      return <File className="h-4 w-4 mr-1 text-[#c5c5c5]" />;
  }
};

const getParentLocationLabel = (path: string) => {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return '/';
  }

  return path.slice(0, lastSlashIndex);
};

const normalizeDestinationParentPath = (path: string | null) =>
  !path || path === '/' ? null : path;

const findFileById = (fileList: FileNode[], id: string): FileNode | null => {
  for (const file of fileList) {
    if (file.id === id) return file;
    if (file.children) {
      const found = findFileById(file.children, id);
      if (found) return found;
    }
  }

  return null;
};

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  readOnly: boolean;
  activeFileId: string | null;
  focusedFolderPath: string | null;
  dropTargetPath: string | null;
  useMaterialIcons?: boolean;
  onFileClick: (id: string) => void;
  onFolderToggle: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDragStart: (node: FileNode, event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOverFolder: (targetPath: string, event: React.DragEvent<HTMLDivElement>) => void;
  onDropOnFolder: (targetNode: FileNode, event: React.DragEvent<HTMLDivElement>) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  readOnly,
  activeFileId,
  focusedFolderPath,
  dropTargetPath,
  useMaterialIcons,
  onFileClick,
  onFolderToggle,
  onDelete,
  onRename,
  onCreateFile,
  onCreateFolder,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDropOnFolder,
}) => {
  const isFolder = node.type === 'folder';
  const isActive = node.id === activeFileId || (isFolder && node.path === focusedFolderPath);
  const isDropTarget = isFolder && dropTargetPath === node.path;

  const handleClick = () => {
    if (isFolder) {
      onFolderToggle(node);
      return;
    }

    onFileClick(node.id);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'file-tree-item group',
              isActive && 'active',
              isDropTarget && 'bg-primary/10 ring-1 ring-primary/40'
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleClick}
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : (event) => onDragStart(node, event)}
            onDragEnd={readOnly ? undefined : onDragEnd}
            onDragOver={readOnly ? undefined : isFolder ? (event) => onDragOverFolder(node.path, event) : undefined}
            onDrop={readOnly ? undefined : isFolder ? (event) => onDropOnFolder(node, event) : undefined}
          >
            {isFolder && (
              <span className="flex h-4 w-4 items-center justify-center mr-1">
                {node.isOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            )}
            {!isFolder && <span className="w-5" />}
            {!useMaterialIcons && <FileIcon name={node.name} type={node.type} isOpen={node.isOpen} />}
            {useMaterialIcons && <FileIcon name={node.name} type={node.type} isOpen={node.isOpen} useMaterialIcons={true} />}
            <span className="flex-1 truncate">{node.name}</span>
            {!readOnly && (
              <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {isFolder && (
                  <>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-sidebar-hover"
                      title={`New file in ${node.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateFile(node.path);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-sidebar-hover"
                      title={`New folder in ${node.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCreateFolder(node.path);
                      }}
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-sidebar-hover"
                    title={`Rename ${node.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRename(node);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-sidebar-hover text-destructive"
                    title={`Delete ${node.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(node);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        {!readOnly && (
          <ContextMenuContent className="w-48">
            {isFolder && (
              <>
                <ContextMenuItem onClick={() => onCreateFile(node.path)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCreateFolder(node.path)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => onRename(node)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete(node)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>

      {isFolder && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              readOnly={readOnly}
              activeFileId={activeFileId}
              focusedFolderPath={focusedFolderPath}
              dropTargetPath={dropTargetPath}
              useMaterialIcons={useMaterialIcons}
              onFileClick={onFileClick}
              onFolderToggle={onFolderToggle}
              onDelete={onDelete}
              onRename={onRename}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverFolder={onDragOverFolder}
              onDropOnFolder={onDropOnFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  className?: string;
  readOnly?: boolean;
  onCreateFile?: (parentPath: string, name: string) => void | Promise<void>;
  onCreateFolder?: (parentPath: string, name: string) => void | Promise<void>;
  onRenameNode?: (node: FileNode, nextName: string) => void | Promise<void>;
  onMoveNode?: (node: FileNode, destinationParentPath: string | null) => void | Promise<void>;
  onDeleteFile?: (fileId: string, filePath: string) => void | Promise<void>;
}

export const FileTree: React.FC<FileTreeProps> = ({
  className,
  readOnly = false,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onMoveNode,
  onDeleteFile,
}) => {
  const {
    files,
    activeFileId,
    openFile,
    toggleFolder,
    deleteFile,
    createFile,
    createFolder,
    renameNode: renameNodeLocal,
    moveNode: moveNodeLocal,
  } = useEditorStore();
  const [isHovered, setIsHovered] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [focusedFolderPath, setFocusedFolderPath] = useState<string | null>(null);
  const [targetNode, setTargetNode] = useState<FileNode | null>(null);
  const [entryName, setEntryName] = useState('');
  const [fileType, setFileType] = useState<string>('js');
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  const openCreateDialog = (parentPath: string, mode: 'create-file' | 'create-folder') => {
    setSelectedFolderPath(parentPath);
    setDialogMode(mode);
    setTargetNode(null);
    setEntryName('');
    setFileType('js');
  };

  const openRenameDialog = (node: FileNode) => {
    setTargetNode(node);
    setSelectedFolderPath(getParentLocationLabel(node.path));
    setDialogMode('rename');
    setEntryName(node.name);
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedFolderPath(null);
    setTargetNode(null);
    setEntryName('');
    setFileType('js');
  };

  const handleCreateFile = (parentPath: string) => {
    openCreateDialog(parentPath, 'create-file');
  };

  const handleCreateFolder = (parentPath: string) => {
    openCreateDialog(parentPath, 'create-folder');
  };

  const handleDelete = async (node: FileNode) => {
    if (!window.confirm(`Are you sure you want to delete "${node.name}"?`)) {
      return;
    }

    if (onDeleteFile) {
      await Promise.resolve(onDeleteFile(node.id, node.path));
      return;
    }

    deleteFile(node.id);
  };

  const handleConfirmDialog = async () => {
    const trimmedValue = entryName.trim();
    if (!trimmedValue) {
      return;
    }

    if (dialogMode === 'rename' && targetNode) {
      if (onRenameNode) {
        await Promise.resolve(onRenameNode(targetNode, trimmedValue));
      } else {
        renameNodeLocal(targetNode.id, trimmedValue);
      }

      closeDialog();
      return;
    }

    if (!selectedFolderPath) {
      return;
    }

    if (dialogMode === 'create-folder') {
      if (onCreateFolder) {
        await Promise.resolve(onCreateFolder(selectedFolderPath, trimmedValue));
      } else {
        createFolder(selectedFolderPath, trimmedValue);
      }

      closeDialog();
      return;
    }

    const selectedOption =
      FILE_LANGUAGE_OPTIONS.find((option) => option.key === fileType) || FILE_LANGUAGE_OPTIONS[0];
    const extension = selectedOption.extension;
    const fullName = trimmedValue.toLowerCase().endsWith(extension)
      ? trimmedValue
      : `${trimmedValue}${extension}`;

    if (onCreateFile) {
      await Promise.resolve(onCreateFile(selectedFolderPath, fullName));
    } else {
      createFile(selectedFolderPath, fullName);
    }

    closeDialog();
  };

  const handleFolderToggle = (node: FileNode) => {
    setFocusedFolderPath(node.path);
    toggleFolder(node.id);
  };

  const resolveCreateParentPath = () => focusedFolderPath || '/';

  const handleMoveNode = async (node: FileNode, destinationParentPath: string | null) => {
    const normalizedDestination = normalizeDestinationParentPath(destinationParentPath);

    if (
      node.type === 'folder' &&
      normalizedDestination &&
      (normalizedDestination === node.path ||
        normalizedDestination.startsWith(`${node.path}/`))
    ) {
      return;
    }

    if (onMoveNode) {
      await Promise.resolve(onMoveNode(node, normalizedDestination));
      return;
    }

    moveNodeLocal(node.id, normalizedDestination);
  };

  const handleDragStart = (node: FileNode, event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.id);
    setDragState({
      id: node.id,
      path: node.path,
      type: node.type,
    });
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDropTargetPath(null);
  };

  const handleDragOverFolder = (targetPath: string, event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    if (
      dragState.path === targetPath ||
      (dragState.type === 'folder' && targetPath.startsWith(`${dragState.path}/`))
    ) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath(targetPath);
  };

  const handleDropOnFolder = async (targetNode: FileNode, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!dragState) {
      return;
    }

    const draggedNode = findFileById(files, dragState.id);
    if (!draggedNode || draggedNode.id === targetNode.id || targetNode.type !== 'folder') {
      handleDragEnd();
      return;
    }

    await handleMoveNode(draggedNode, targetNode.path);
    setFocusedFolderPath(targetNode.path);
    handleDragEnd();
  };

  const handleDragOverRoot = (event: React.DragEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetPath('/');
  };

  const handleDropOnRoot = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!dragState) {
      return;
    }

    const draggedNode = findFileById(files, dragState.id);
    if (!draggedNode) {
      handleDragEnd();
      return;
    }

    await handleMoveNode(draggedNode, null);
    setFocusedFolderPath(null);
    handleDragEnd();
  };

  const locationLabel =
    dialogMode === 'rename'
      ? selectedFolderPath || '/'
      : selectedFolderPath || resolveCreateParentPath();

  const useMaterialIcons = useEditorStore((state) => state.installedExtensions.includes('vscode-icons'));

  return (
    <div
      className={cn('flex h-full flex-col', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="panel-header">
        <span>Explorer</span>
        {!readOnly && (
          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <button
              className="rounded p-1 hover:bg-sidebar-hover"
              title={focusedFolderPath ? `New File in ${focusedFolderPath}` : 'New File'}
              onClick={() => handleCreateFile(resolveCreateParentPath())}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              className="rounded p-1 hover:bg-sidebar-hover"
              title={focusedFolderPath ? `New Folder in ${focusedFolderPath}` : 'New Folder'}
              onClick={() => handleCreateFolder(resolveCreateParentPath())}
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex items-center gap-1.5 border-b border-border/60 px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/90',
          dropTargetPath === '/' && 'bg-primary/10 ring-1 ring-inset ring-primary/40'
        )}
        onDragOver={readOnly ? undefined : handleDragOverRoot}
        onDrop={readOnly ? undefined : handleDropOnRoot}
      >
        <ChevronDown className="h-3 w-3" />
        <span>CodeCollab Workspace</span>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {files.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            level={0}
            readOnly={readOnly}
            activeFileId={activeFileId}
            focusedFolderPath={focusedFolderPath}
            dropTargetPath={dropTargetPath}
            useMaterialIcons={useMaterialIcons}
            onFileClick={openFile}
            onFolderToggle={handleFolderToggle}
            onDelete={handleDelete}
            onRename={openRenameDialog}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverFolder={handleDragOverFolder}
            onDropOnFolder={handleDropOnFolder}
          />
        ))}
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-sm border border-sidebar-border bg-sidebar p-4 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {dialogMode === 'create-file' && 'Create New File'}
              {dialogMode === 'create-folder' && 'Create New Folder'}
              {dialogMode === 'rename' && 'Rename Item'}
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">Location: {locationLabel}</p>

            <div className="space-y-4">
              {dialogMode === 'create-file' && (
                <div>
                  <label className="mb-2 block text-sm font-medium">Language</label>
                  <select
                    value={fileType}
                    onChange={(event) => setFileType(event.target.value)}
                    className="w-full rounded-sm border border-sidebar-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {FILE_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  {dialogMode === 'create-folder' ? 'Folder Name' : 'Name'}
                </label>
                <input
                  type="text"
                  value={entryName}
                  onChange={(event) => setEntryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleConfirmDialog();
                    }

                    if (event.key === 'Escape') {
                      closeDialog();
                    }
                  }}
                  placeholder={
                    dialogMode === 'create-folder'
                      ? 'components'
                      : dialogMode === 'rename'
                        ? 'new-name'
                        : FILE_LANGUAGE_OPTIONS.find((option) => option.key === fileType)?.placeholder || 'script.js'
                  }
                  className="w-full rounded-sm border border-sidebar-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {dialogMode === 'create-file' && 'Extension will be added automatically'}
                  {dialogMode === 'create-folder' && 'Folder will be created in the selected location'}
                  {dialogMode === 'rename' && 'This updates the file or folder name'}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => void handleConfirmDialog()}
                  disabled={!entryName.trim()}
                  className="flex-1 rounded-sm bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dialogMode === 'rename' ? 'Save' : 'Create'}
                </button>
                <button
                  onClick={closeDialog}
                  className="flex-1 rounded-sm border border-sidebar-border px-4 py-2 text-xs font-medium hover:bg-sidebar-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
