import { useState, useRef } from 'react';
import { FolderOpen, FolderUp, Loader2, X, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'build',
  '__pycache__', '.cache', '.parcel-cache', '.turbo',
  'coverage', '.nyc_output', '.vscode', '.idea',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.lock', '.lockb',
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.hpp': 'cpp',
  '.html': 'html', '.css': 'css', '.scss': 'scss', '.less': 'less',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.xml': 'xml', '.md': 'markdown', '.mdx': 'markdown',
  '.sql': 'sql', '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
  '.ps1': 'powershell', '.bat': 'bat', '.cmd': 'bat',
  '.env': 'plaintext', '.txt': 'plaintext', '.log': 'plaintext',
  '.gitignore': 'plaintext', '.editorconfig': 'plaintext',
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const getLanguage = (filename: string): string => {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return 'plaintext';
  const ext = filename.slice(dotIdx).toLowerCase();
  return LANGUAGE_MAP[ext] || 'plaintext';
};

interface ProcessedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  parentPath: string | null;
}

interface UploadResponse {
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
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    setReading(true);
    setFiles([]);
    setFolderName(null);

    try {
      const rootName = selected[0].webkitRelativePath.split('/')[0];
      setFolderName(rootName);

      const processed: ProcessedFile[] = [];

      for (const file of selected) {
        const parts = file.webkitRelativePath.split('/');

        // Skip anything inside an ignored directory
        if (parts.some((p) => IGNORED_DIRS.has(p))) continue;

        // Skip binary files
        const dotIdx = file.name.lastIndexOf('.');
        const ext = dotIdx !== -1 ? file.name.slice(dotIdx).toLowerCase() : '';
        if (BINARY_EXTENSIONS.has(ext)) continue;

        // Skip oversized files
        if (file.size > MAX_FILE_SIZE) continue;

        // Build virtual path relative to the selected folder root
        const virtualParts = parts.slice(1);
        const virtualPath = '/' + virtualParts.join('/');
        const parentPath = virtualParts.length > 1
          ? '/' + virtualParts.slice(0, -1).join('/')
          : null;

        try {
          const content = await file.text();
          processed.push({
            path: virtualPath,
            name: file.name,
            content,
            language: getLanguage(file.name),
            parentPath,
          });
        } catch {
          // skip unreadable files
        }
      }

      setFiles(processed);
    } finally {
      setReading(false);
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!files.length) return;
    setImporting(true);
    try {
      const result = await apiRequest<UploadResponse>('/local/upload', {
        method: 'POST',
        body: { projectId, files },
      });
      toast.success(`Imported ${result.files_created} files and ${result.folders_created} folders`);
      setOpen(false);
      setFiles([]);
      setFolderName(null);
      onImportComplete();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to import folder');
    } finally {
      setImporting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (importing) return;
    setOpen(next);
    if (!next) {
      setFiles([]);
      setFolderName(null);
    }
  };

  const reset = () => {
    setFiles([]);
    setFolderName(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        {/* Hidden native folder picker */}
        <input
          ref={inputRef}
          type="file"
          // @ts-ignore – webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          className="hidden"
          onChange={handleFolderSelect}
        />

        {importing ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importing files...</p>
          </div>
        ) : reading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <FolderOpen className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Click to select a folder</p>
              <p className="text-xs text-muted-foreground mt-1">
                node_modules, .git, and binary files are excluded automatically
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              <FolderOpen className="w-3.5 h-3.5" />
              Choose Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FolderOpen className="w-4 h-4 text-primary" />
                <span className="font-medium truncate max-w-[200px]">{folderName}</span>
                <span className="text-muted-foreground shrink-0">({files.length} files)</span>
              </div>
              <button onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ScrollArea className="h-[220px] border border-border rounded-md">
              <div className="p-2 space-y-0.5">
                {files.map((f) => (
                  <div key={f.path} className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground">
                    <FileIcon className="w-3 h-3 shrink-0 text-primary/50" />
                    <span className="truncate">{f.path}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => inputRef.current?.click()}>
                <FolderOpen className="w-3.5 h-3.5" />
                Change
              </Button>
              <Button onClick={handleImport} className="flex-1 gap-2">
                <FolderUp className="w-4 h-4" />
                Import {files.length} Files
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
