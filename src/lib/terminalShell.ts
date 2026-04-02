import { FileNode } from '@/types/editor';

const ROOT_PATH = '/';

const sortNodes = (left: FileNode, right: FileNode) => {
  if (left.type !== right.type) {
    return left.type === 'folder' ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
};

export const normalizeProjectPath = (input: string): string => {
  if (!input || input === ROOT_PATH) {
    return ROOT_PATH;
  }

  const parts: string[] = [];
  const segments = input.replace(/\\/g, '/').split('/');

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      parts.pop();
      continue;
    }

    parts.push(segment);
  }

  return parts.length ? `/${parts.join('/')}` : ROOT_PATH;
};

export const getParentProjectPath = (input: string): string => {
  const normalized = normalizeProjectPath(input);
  if (normalized === ROOT_PATH) {
    return ROOT_PATH;
  }

  const segments = normalized.split('/').filter(Boolean);
  segments.pop();

  return segments.length ? `/${segments.join('/')}` : ROOT_PATH;
};

export const resolveProjectPath = (
  currentDirectory: string,
  targetPath: string,
  homeDirectory = ROOT_PATH
): string => {
  const target = targetPath.trim();

  if (!target || target === '~') {
    return normalizeProjectPath(homeDirectory);
  }

  if (target.startsWith('~/')) {
    return normalizeProjectPath(`${homeDirectory}/${target.slice(2)}`);
  }

  if (target.startsWith('/')) {
    return normalizeProjectPath(target);
  }

  return normalizeProjectPath(`${currentDirectory}/${target}`);
};

export const flattenFileTree = (files: FileNode[]): FileNode[] => {
  const flattened: FileNode[] = [];

  const visit = (nodes: FileNode[]) => {
    for (const node of nodes) {
      flattened.push(node);

      if (node.children?.length) {
        visit(node.children);
      }
    }
  };

  visit(files);
  return flattened;
};

export const getNodeByPath = (files: FileNode[], targetPath: string): FileNode | null => {
  const normalizedTarget = normalizeProjectPath(targetPath);

  const visit = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (normalizeProjectPath(node.path) === normalizedTarget) {
        return node;
      }

      if (node.children?.length) {
        const nested = visit(node.children);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  };

  return visit(files);
};

export const listDirectory = (files: FileNode[], targetPath: string): FileNode[] | null => {
  const normalizedTarget = normalizeProjectPath(targetPath);

  if (normalizedTarget === ROOT_PATH) {
    return [...files].sort(sortNodes);
  }

  const node = getNodeByPath(files, normalizedTarget);
  if (!node || node.type !== 'folder') {
    return null;
  }

  return [...(node.children || [])].sort(sortNodes);
};

export const formatShellPath = (path: string, homeDirectory = ROOT_PATH): string => {
  const normalizedPath = normalizeProjectPath(path);
  const normalizedHome = normalizeProjectPath(homeDirectory);

  if (
    normalizedHome !== ROOT_PATH &&
    (normalizedPath === normalizedHome || normalizedPath.startsWith(`${normalizedHome}/`))
  ) {
    const suffix = normalizedPath.slice(normalizedHome.length);
    return `~${suffix || ''}`;
  }

  return normalizedPath;
};

export const tokenizeCommand = (input: string): string[] => {
  const tokens: string[] = [];
  const pattern = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[0]);
  }

  return tokens;
};
