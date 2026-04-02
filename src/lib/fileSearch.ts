import { FileNode } from '@/types/editor';

export interface FileSearchResult {
  fileId: string;
  fileName: string;
  filePath: string;
  language?: string;
  preview: string | null;
  lineNumber: number | null;
  contentMatchCount: number;
  hasNameMatch: boolean;
  hasPathMatch: boolean;
  hasContentMatch: boolean;
  score: number;
}

const MAX_PREVIEW_LENGTH = 110;

const collectFileNodes = (nodes: FileNode[]): FileNode[] =>
  nodes.flatMap((node) => {
    if (node.type === 'file') {
      return [node];
    }

    return node.children ? collectFileNodes(node.children) : [];
  });

const countOccurrences = (content: string, query: string) => {
  if (!content || !query) {
    return 0;
  }

  let count = 0;
  let searchIndex = 0;

  while (searchIndex < content.length) {
    const matchIndex = content.indexOf(query, searchIndex);
    if (matchIndex === -1) {
      break;
    }

    count += 1;
    searchIndex = matchIndex + query.length;
  }

  return count;
};

const buildPreview = (content: string, query: string) => {
  if (!content || !query) {
    return { preview: null, lineNumber: null };
  }

  const lowerContent = content.toLowerCase();
  const matchIndex = lowerContent.indexOf(query);

  if (matchIndex === -1) {
    return { preview: null, lineNumber: null };
  }

  const lineStart = content.lastIndexOf('\n', matchIndex) + 1;
  const lineEndIndex = content.indexOf('\n', matchIndex);
  const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex;
  const rawLine = content.slice(lineStart, lineEnd).trim();
  const lineNumber = content.slice(0, matchIndex).split('\n').length;

  if (rawLine.length <= MAX_PREVIEW_LENGTH) {
    return { preview: rawLine, lineNumber };
  }

  const columnIndex = matchIndex - lineStart;
  const previewStart = Math.max(0, columnIndex - 28);
  const previewEnd = Math.min(rawLine.length, columnIndex + query.length + 56);
  const prefix = previewStart > 0 ? '...' : '';
  const suffix = previewEnd < rawLine.length ? '...' : '';

  return {
    preview: `${prefix}${rawLine.slice(previewStart, previewEnd).trim()}${suffix}`,
    lineNumber,
  };
};

export const countSearchableFiles = (files: FileNode[]) => collectFileNodes(files).length;

export const searchProjectFiles = (files: FileNode[], rawQuery: string): FileSearchResult[] => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [];
  }

  return collectFileNodes(files)
    .map((file) => {
      const lowerName = file.name.toLowerCase();
      const lowerPath = file.path.toLowerCase();
      const lowerContent = (file.content || '').toLowerCase();
      const hasNameMatch = lowerName.includes(query);
      const hasPathMatch = lowerPath.includes(query);
      const hasContentMatch = lowerContent.includes(query);

      if (!hasNameMatch && !hasPathMatch && !hasContentMatch) {
        return null;
      }

      const contentMatchCount = hasContentMatch ? countOccurrences(lowerContent, query) : 0;
      const { preview, lineNumber } = buildPreview(file.content || '', query);

      let score = 0;
      if (lowerName === query) {
        score += 120;
      } else if (lowerName.startsWith(query)) {
        score += 90;
      } else if (hasNameMatch) {
        score += 70;
      }

      if (hasPathMatch) {
        score += 25;
      }

      if (hasContentMatch) {
        score += 20 + Math.min(contentMatchCount, 5) * 3;
      }

      return {
        fileId: file.id,
        fileName: file.name,
        filePath: file.path,
        language: file.language,
        preview,
        lineNumber,
        contentMatchCount,
        hasNameMatch,
        hasPathMatch,
        hasContentMatch,
        score,
      } satisfies FileSearchResult;
    })
    .filter((result): result is FileSearchResult => Boolean(result))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.filePath.localeCompare(right.filePath);
    });
};
