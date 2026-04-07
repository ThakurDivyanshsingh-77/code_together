import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Folder,
  ChevronRight,
  ArrowUp,
  Loader2,
  Keyboard,
  FolderUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

interface BrowseDir {
  name: string;
  path: string;
  type: string;
}

interface BrowseResponse {
  current?: string;
  parent: string | null;
  dirs: BrowseDir[];
}

interface ImportResponse {
  folders_created: number;
  files_created: number;
  total: number;
}

interface LoadFolderDialogProps {
  projectId: string;
  onImportComplete: () => void;
  trigger?: React.ReactNode;
}

export const LoadFolderDialog: React.FC<LoadFolderDialogProps> = ({
  projectId,
  onImportComplete,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');

  // Browse state
  const [dirs, setDirs] = useState<BrowseDir[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // Manual state
  const [manualPath, setManualPath] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);

  const browse = useCallback(async (dirPath?: string) => {
    setBrowsing(true);
    setBrowseError(null);
    try {
      const data = await apiRequest<BrowseResponse>('/local/browse', {
        method: 'POST',
        body: { dirPath: dirPath || '' },
      });
      setDirs(data.dirs);
      setCurrentPath(data.current || null);
      setParentPath(data.parent);
    } catch (err: unknown) {
      setBrowseError(err instanceof Error ? err.message : 'Failed to browse');
    } finally {
      setBrowsing(false);
    }
  }, []);

  useEffect(() => {
    if (open && mode === 'browse') {
      void browse();
    }
  }, [open, mode, browse]);

  const doImport = async (folderPath: string) => {
    setImporting(true);
    try {
      const result = await apiRequest<ImportResponse>('/local/import', {
        method: 'POST',
        body: { rootPath: folderPath, projectId },
      });
      toast.success(`Imported ${result.files_created} files and ${result.folders_created} folders`);
      setOpen(false);
      onImportComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to import folder');
    } finally {
      setImporting(false);
    }
  };

  const handleManualImport = () => {
    const trimmed = manualPath.trim();
    if (!trimmed) {
      toast.error('Please enter a directory path');
      return;
    }
    void doImport(trimmed);
  };

  const pathSegments = currentPath
    ? currentPath.split(/[\\/]/).filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FolderUp className="w-3.5 h-3.5" />
            Load Folder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load Local Folder</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          Import files from a local folder into this project. This will replace any existing files.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-md">
          <button
            onClick={() => setMode('browse')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              mode === 'browse' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              mode === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Type Path
          </button>
        </div>

        {importing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing files...</p>
          </div>
        ) : mode === 'browse' ? (
          <div className="space-y-3">
            {/* Breadcrumb */}
            {currentPath && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5 overflow-x-auto">
                <button
                  onClick={() => browse()}
                  className="hover:text-foreground transition-colors shrink-0 font-medium"
                >
                  Drives
                </button>
                {pathSegments.map((seg, i) => {
                  const reconstructed = pathSegments.slice(0, i + 1).join('\\');
                  const fullPath = reconstructed.length <= 2 ? reconstructed + '\\' : reconstructed;
                  return (
                    <span key={i} className="flex items-center gap-1 shrink-0">
                      <ChevronRight className="w-3 h-3" />
                      <button
                        onClick={() => browse(fullPath)}
                        className="hover:text-foreground transition-colors font-medium"
                      >
                        {seg}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Directory list */}
            {browsing ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : browseError ? (
              <div className="text-center py-6 text-sm text-destructive">{browseError}</div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-0.5 pr-3">
                  {parentPath && (
                    <button
                      onClick={() => browse(parentPath)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm hover:bg-accent/50 transition-colors text-muted-foreground"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span>..</span>
                    </button>
                  )}
                  {dirs.length === 0 && !parentPath && (
                    <p className="text-sm text-muted-foreground text-center py-8">No directories found</p>
                  )}
                  {dirs.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => browse(dir.path)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm hover:bg-accent/50 transition-colors group"
                    >
                      <Folder className="w-4 h-4 text-primary/70 shrink-0" />
                      <span className="truncate flex-1">{dir.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Import button */}
            {currentPath && (
              <Button onClick={() => doImport(currentPath)} className="w-full gap-2">
                <FolderUp className="w-4 h-4" />
                Import This Folder
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Directory Path
              </label>
              <Input
                placeholder="D:\Projects\my-app"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualImport()}
              />
            </div>
            <Button onClick={handleManualImport} className="w-full gap-2" disabled={!manualPath.trim()}>
              <FolderUp className="w-4 h-4" />
              Import Folder
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
