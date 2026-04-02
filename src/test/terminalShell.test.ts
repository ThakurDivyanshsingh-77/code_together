import { describe, expect, it } from 'vitest';
import { FileNode } from '@/types/editor';
import { buildHtmlPreviewDocument } from '@/lib/htmlPreview';
import {
  listDirectory,
  normalizeProjectPath,
  resolveProjectPath,
  tokenizeCommand,
} from '@/lib/terminalShell';

const files: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        id: 'html',
        name: 'index.html',
        type: 'file',
        path: '/src/index.html',
        language: 'html',
        content:
          '<!DOCTYPE html><html><head><link rel="stylesheet" href="./styles.css" /></head><body><script src="./main.js"></script></body></html>',
      },
      {
        id: 'css',
        name: 'styles.css',
        type: 'file',
        path: '/src/styles.css',
        language: 'css',
        content: 'body { background: black; color: white; }',
      },
      {
        id: 'js',
        name: 'main.js',
        type: 'file',
        path: '/src/main.js',
        language: 'javascript',
        content: "console.log('hello preview');",
      },
    ],
  },
];

describe('terminalShell helpers', () => {
  it('normalizes and resolves project paths', () => {
    expect(normalizeProjectPath('/src/./pages/../index.html')).toBe('/src/index.html');
    expect(resolveProjectPath('/src/components', '../index.html')).toBe('/src/index.html');
  });

  it('tokenizes quoted commands and lists directories', () => {
    expect(tokenizeCommand('cat "src/index.html"')).toEqual(['cat', 'src/index.html']);
    expect(listDirectory(files, '/src')?.map((entry) => entry.name)).toEqual([
      'index.html',
      'main.js',
      'styles.css',
    ]);
  });
});

describe('buildHtmlPreviewDocument', () => {
  it('inlines local stylesheets and scripts for preview', () => {
    const result = buildHtmlPreviewDocument({
      html: files[0].children?.[0]?.content || '',
      currentFilePath: '/src/index.html',
      files,
      sessionKey: 'preview-test',
    });

    expect(result.notices).toEqual([]);
    expect(result.document).toContain('body { background: black; color: white; }');
    expect(result.document).toContain("console.log('hello preview');");
    expect(result.document).toContain('codecollab-preview');
    expect(result.document).toContain('preview-test');
  });

  it('preserves script and style attributes when inlining', () => {
    const result = buildHtmlPreviewDocument({
      html: '<!DOCTYPE html><html><head><link rel="stylesheet" href="./styles.css" media="screen" /></head><body><script src="./main.js" type="module" defer></script></body></html>',
      currentFilePath: '/src/index.html',
      files,
      sessionKey: 'preview-attrs',
    });

    expect(result.document).toContain('media="screen"');
    expect(result.document).toContain('type="module"');
    expect(result.document).toContain('defer=""');
  });
});
