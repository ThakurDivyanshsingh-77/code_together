import React, { useEffect, useState } from 'react';
import { Clock3, FileClock, History, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { FileVersion, FileNode } from '@/types/editor';
import { formatDistanceToNow } from '@/lib/time';
import { cn } from '@/lib/utils';

interface FileHistoryPanelProps {
  className?: string;
  projectId: string;
  file: FileNode | null;
  refreshKey?: string | number | null;
}

interface FileHistoryResponse {
  file: {
    id: string;
  };
  versions: FileVersion[];
}

export const FileHistoryPanel: React.FC<FileHistoryPanelProps> = ({
  className,
  projectId,
  file,
  refreshKey,
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!projectId || !file?.id || file.type !== 'file') {
        setVersions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest<FileHistoryResponse>(
          `/projects/${projectId}/files/${file.id}/history?limit=12`
        );
        setVersions(response.versions || []);
      } catch {
        setVersions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, [projectId, file?.id, file?.type, refreshKey]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="panel-header">
        <span>Version History</span>
        {file?.type === 'file' && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            {versions.length} snapshots
          </span>
        )}
      </div>

      {!file || file.type !== 'file' ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          Open a file to inspect autosaves and previous revisions.
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading history...
        </div>
      ) : versions.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          No saved versions yet for this file.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {versions.map((version) => (
            <div key={version.id} className="border-b border-border/60 px-4 py-3 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="h-3.5 w-3.5 text-primary" />
                  <span>Revision {version.revision}</span>
                </div>
                <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {version.source}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}</span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileClock className="h-3 w-3" />
                <span>{version.updated_by_name || 'Unknown collaborator'}</span>
              </div>

              <pre className="mt-2 max-h-28 overflow-auto rounded-sm border border-border bg-editor px-2.5 py-2 font-mono text-[11px] leading-5 text-foreground/80">
                {version.content.slice(0, 220) || '// empty file'}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
