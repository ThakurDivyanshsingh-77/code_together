import React, { useDeferredValue, useMemo, useState } from 'react';
import { CornerDownLeft, FileCode2, FileJson, FileText, Search, X } from 'lucide-react';
import { countSearchableFiles, searchProjectFiles } from '@/lib/fileSearch';
import { useEditorStore } from '@/store/editorStore';
import { cn } from '@/lib/utils';

interface SearchPanelProps {
  className?: string;
}

const SearchResultIcon: React.FC<{ fileName: string; language?: string }> = ({ fileName, language }) => {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json') || language === 'json') {
    return <FileJson className="h-4 w-4 text-[#cbcb41]" />;
  }

  if (
    language === 'typescript' ||
    language === 'javascript' ||
    language === 'python' ||
    language === 'java' ||
    lowerName.endsWith('.ts') ||
    lowerName.endsWith('.tsx') ||
    lowerName.endsWith('.js') ||
    lowerName.endsWith('.jsx') ||
    lowerName.endsWith('.py')
  ) {
    return <FileCode2 className="h-4 w-4 text-[#519aba]" />;
  }

  return <FileText className="h-4 w-4 text-[#c5c5c5]" />;
};

const getResultLabel = (contentMatchCount: number, hasNameMatch: boolean, hasContentMatch: boolean) => {
  if (hasNameMatch && hasContentMatch) {
    return `${contentMatchCount} hit${contentMatchCount === 1 ? '' : 's'} + name`;
  }

  if (hasContentMatch) {
    return `${contentMatchCount} hit${contentMatchCount === 1 ? '' : 's'}`;
  }

  if (hasNameMatch) {
    return 'name';
  }

  return 'path';
};

export const SearchPanel: React.FC<SearchPanelProps> = ({ className }) => {
  const { files, openFile, activeFileId } = useEditorStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const totalFiles = useMemo(() => countSearchableFiles(files), [files]);
  const results = useMemo(() => searchProjectFiles(files, deferredQuery), [files, deferredQuery]);

  const openTopResult = () => {
    if (!results.length) {
      return;
    }

    openFile(results[0].fileId);
  };

  return (
    <div className={cn('flex h-full flex-col panel-enter', className)}>
      <div className="panel-header">
        <span>Search</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
          {query.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : `${totalFiles} files`}
        </span>
      </div>

      <div className="border-b border-border px-3 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                openTopResult();
              }
            }}
            placeholder="Search files, paths, content..."
            className="w-full rounded-sm border border-border bg-input py-2 pl-9 pr-9 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CornerDownLeft className="h-3 w-3" />
          <span>Press Enter to open the top result</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {!query.trim() && (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            Search by filename, full path, or file contents across the current project.
          </div>
        )}

        {query.trim() && !results.length && (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            No matches found for <span className="font-medium text-foreground">{query.trim()}</span>.
          </div>
        )}

        {results.map((result) => (
          <button
            key={result.fileId}
            type="button"
            onClick={() => openFile(result.fileId)}
            className={cn(
              'w-full border-b border-border/70 px-3 py-3 text-left transition-colors hover:bg-sidebar-hover',
              activeFileId === result.fileId && 'bg-sidebar-hover'
            )}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                <SearchResultIcon fileName={result.fileName} language={result.language} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{result.fileName}</span>
                  <span className="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {getResultLabel(result.contentMatchCount, result.hasNameMatch, result.hasContentMatch)}
                  </span>
                </div>

                <div className="mt-1 truncate text-[11px] text-muted-foreground">{result.filePath}</div>

                {result.preview && (
                  <div className="mt-1 break-words font-mono text-[11px] leading-5 text-foreground/85">
                    {result.lineNumber ? `L${result.lineNumber}: ` : ''}
                    {result.preview}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
