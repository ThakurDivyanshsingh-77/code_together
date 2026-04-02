// Editor Types
export interface FileLock {
  userId: string;
  userName: string | null;
  expiresAt: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  language?: string;
  content?: string;
  revision?: number;
  lock?: FileLock | null;
  locked?: boolean;
  updatedAt?: string;
  createdAt?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

export interface EditorTab {
  id: string;
  fileId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  revision?: number;
  isDirty: boolean;
}

export interface FileVersion {
  id: string;
  file_id: string;
  project_id: string;
  revision: number;
  name: string;
  path: string;
  language: string | null;
  content: string;
  updated_by: string;
  updated_by_name: string;
  source: 'manual' | 'autosave' | 'system';
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: number; // 1-6 for user colors
  isOnline: boolean;
}

export interface CursorPosition {
  userId: string;
  line: number;
  column: number;
  fileName: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: number;
  content: string;
  timestamp: Date;
  type: 'text' | 'code';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  collaborators: User[];
}

export interface Terminal {
  id: string;
  name: string;
  output: TerminalLine[];
}

export interface TerminalLine {
  type: 'prompt' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Language detection by file extension
export const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    dockerfile: 'dockerfile',
  };
  return languageMap[ext] || 'plaintext';
};

// File icon by type
export const getFileIcon = (fileName: string, type: 'file' | 'folder'): string => {
  if (type === 'folder') return 'folder';
  
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'react',
    js: 'javascript',
    jsx: 'react',
    py: 'python',
    json: 'json',
    html: 'html',
    css: 'css',
    md: 'markdown',
    git: 'git',
    env: 'settings',
  };
  return iconMap[ext] || 'file';
};
