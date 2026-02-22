import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen,
  Plus,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Trash2,
} from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';
import { FileNode } from '@/types/editor';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

// File icon component
const FileIcon: React.FC<{ name: string; type: 'file' | 'folder'; isOpen?: boolean }> = ({ 
  name, 
  type, 
  isOpen 
}) => {
  if (type === 'folder') {
    return isOpen ? (
      <FolderOpen className="w-4 h-4 text-[#dcb67a]" />
    ) : (
      <Folder className="w-4 h-4 text-[#dcb67a]" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-[#519aba]" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-[#cbcb41]" />;
    case 'py':
      return <FileCode className="w-4 h-4 text-[#3572a5]" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-[#cbcb41]" />;
    case 'md':
      return <FileText className="w-4 h-4 text-[#7fb7ff]" />;
    case 'css':
    case 'scss':
      return <FileType className="w-4 h-4 text-[#7fb7ff]" />;
    default:
      return <File className="w-4 h-4 text-[#c5c5c5]" />;
  }
};

// File tree item component
const FileTreeItem: React.FC<{ 
  node: FileNode; 
  level: number;
  activeFileId: string | null;
  onFileClick: (id: string) => void;
  onFolderToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateFile: (parentPath: string) => void;
}> = ({ node, level, activeFileId, onFileClick, onFolderToggle, onDelete, onCreateFile }) => {
  const isFolder = node.type === 'folder';
  const isActive = node.id === activeFileId;
  
  const handleClick = () => {
    if (isFolder) {
      onFolderToggle(node.id);
    } else {
      onFileClick(node.id);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "file-tree-item group",
              isActive && "active"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={handleClick}
          >
            {isFolder && (
              <span className="w-4 h-4 flex items-center justify-center">
                {node.isOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </span>
            )}
            {!isFolder && <span className="w-4" />}
            <FileIcon name={node.name} type={node.type} isOpen={node.isOpen} />
            <span className="truncate flex-1">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {isFolder && (
            <>
              <ContextMenuItem onClick={() => onCreateFile(node.path)}>
                <Plus className="w-4 h-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => onDelete(node.id)} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Render children if folder is open */}
      {isFolder && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeFileId={activeFileId}
              onFileClick={onFileClick}
              onFolderToggle={onFolderToggle}
              onDelete={onDelete}
              onCreateFile={onCreateFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileTreeProps {
  className?: string;
  onCreateFile?: (parentPath: string, name: string) => void;
  onDeleteFile?: (fileId: string, filePath: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ className, onCreateFile, onDeleteFile }) => {
  const { files, activeFileId, openFile, toggleFolder, deleteFile, createFile } = useEditorStore();
  const [isHovered, setIsHovered] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'js' | 'py'>('js');

  const handleCreateFile = (parentPath: string) => {
    setSelectedFolderPath(parentPath);
    setShowFileDialog(true);
    setFileName('');
  };

  const handleConfirmCreate = () => {
    if (fileName.trim() && selectedFolderPath !== null) {
      const extension = fileType === 'py' ? '.py' : '.js';
      const fullName = fileName.endsWith(extension) ? fileName : fileName + extension;
      
      // Use callback if provided, otherwise use local store
      if (onCreateFile) {
        onCreateFile(selectedFolderPath, fullName);
      } else {
        createFile(selectedFolderPath, fullName);
      }
      
      setShowFileDialog(false);
      setFileName('');
    }
  };

  const handleDelete = (fileId: string) => {
    const file = findFileById(files, fileId);
    if (file && window.confirm(`Are you sure you want to delete "${file.name}"?`)) {
      // Use callback if provided, otherwise use local store
      if (onDeleteFile) {
        onDeleteFile(fileId, file.path);
      } else {
        deleteFile(fileId);
      }
    }
  };

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

  return (
    <div 
      className={cn("flex flex-col h-full", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="panel-header">
        <span>Explorer</span>
        <div className={cn(
          "flex items-center gap-1 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <button 
            className="p-1 rounded hover:bg-sidebar-hover" 
            title="New File"
            onClick={() => handleCreateFile('/')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project name */}
      <div className="px-2 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground/90 flex items-center gap-1.5 border-b border-border/60">
        <ChevronDown className="w-3 h-3" />
        <span>CodeCollab Workspace</span>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto py-1">
        {files.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            level={0}
            activeFileId={activeFileId}
            onFileClick={openFile}
            onFolderToggle={toggleFolder}
            onDelete={handleDelete}
            onCreateFile={handleCreateFile}
          />
        ))}
      </div>

      {/* File creation dialog */}
      {showFileDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-sidebar rounded-sm p-4 w-96 shadow-lg border border-sidebar-border">
            <h3 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Create New File</h3>
            
            <div className="space-y-4">
              {/* File type selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFileType('js')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-sm border text-xs font-medium transition-colors",
                      fileType === 'js'
                        ? "bg-primary text-primary-foreground border-primary/80"
                        : "border-sidebar-border hover:bg-sidebar-hover text-muted-foreground"
                    )}
                  >
                    JavaScript
                  </button>
                  <button
                    onClick={() => setFileType('py')}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-sm border text-xs font-medium transition-colors",
                      fileType === 'py'
                        ? "bg-primary text-primary-foreground border-primary/80"
                        : "border-sidebar-border hover:bg-sidebar-hover text-muted-foreground"
                    )}
                  >
                    Python
                  </button>
                </div>
              </div>

              {/* File name input */}
              <div>
                <label className="block text-sm font-medium mb-2">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmCreate();
                    if (e.key === 'Escape') setShowFileDialog(false);
                  }}
                  placeholder={`script.${fileType === 'py' ? 'py' : 'js'}`}
                  className="w-full px-3 py-2 bg-input rounded-sm border border-sidebar-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Extension will be added automatically
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleConfirmCreate}
                  disabled={!fileName.trim()}
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-sm text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowFileDialog(false)}
                  className="flex-1 py-2 px-4 border border-sidebar-border rounded-sm text-xs font-medium hover:bg-sidebar-hover"
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
