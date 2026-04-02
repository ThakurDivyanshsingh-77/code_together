import { describe, expect, it } from 'vitest';
import { searchProjectFiles } from '@/lib/fileSearch';
import { FileNode } from '@/types/editor';

const files: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        id: 'panel',
        name: 'SearchPanel.tsx',
        type: 'file',
        path: '/src/components/SearchPanel.tsx',
        language: 'typescript',
        content: [
          "export const SearchPanel = () => {",
          "  return <div>Search panel</div>;",
          '};',
        ].join('\n'),
      },
      {
        id: 'helper',
        name: 'search-helper.ts',
        type: 'file',
        path: '/src/lib/search-helper.ts',
        language: 'typescript',
        content: [
          'export const buildSearchSnippet = () => {',
          "  const value = 'matchNeedle';",
          "  return `matchNeedle:${value}`;",
          '};',
        ].join('\n'),
      },
    ],
  },
  {
    id: 'readme',
    name: 'README.md',
    type: 'file',
    path: '/README.md',
    language: 'markdown',
    content: 'The workspace supports searching by file name and content.',
  },
];

describe('searchProjectFiles', () => {
  it('returns no results for empty queries', () => {
    expect(searchProjectFiles(files, '   ')).toEqual([]);
  });

  it('prioritizes filename matches ahead of content-only matches', () => {
    const results = searchProjectFiles(files, 'searchpanel');

    expect(results[0]?.fileId).toBe('panel');
    expect(results[0]?.hasNameMatch).toBe(true);
    expect(results[0]?.filePath).toBe('/src/components/SearchPanel.tsx');
  });

  it('finds content matches case-insensitively and returns snippet metadata', () => {
    const results = searchProjectFiles(files, 'MATCHNEEDLE');
    const helperResult = results.find((result) => result.fileId === 'helper');

    expect(helperResult).toMatchObject({
      contentMatchCount: 2,
      hasContentMatch: true,
      lineNumber: 2,
      preview: "const value = 'matchNeedle';",
    });
  });
});
