import { create } from 'zustand';
import { FileNode, EditorTab, User, ChatMessage, CursorPosition, AIMessage, getLanguageFromFileName } from '@/types/editor';
import { apiRequest } from '@/lib/api';

// Sample file structure for demo
const sampleFiles: FileNode[] = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    path: '/src',
    isOpen: true,
    children: [
      {
        id: '2',
        name: 'components',
        type: 'folder',
        path: '/src/components',
        isOpen: true,
        children: [
          {
            id: '3',
            name: 'App.tsx',
            type: 'file',
            path: '/src/components/App.tsx',
            language: 'typescript',
            content: `import React from 'react';
import { useState, useEffect } from 'react';

interface AppProps {
  title: string;
}

export const App: React.FC<AppProps> = ({ title }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="app">
      <h1>{title}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
};

export default App;`,
          },
          {
            id: '4',
            name: 'Button.tsx',
            type: 'file',
            path: '/src/components/Button.tsx',
            language: 'typescript',
            content: `import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}) => {
  const baseStyles = 'rounded font-medium transition-colors';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-gray-300 hover:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={\`\${baseStyles} \${variants[variant]} \${sizes[size]}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};`,
          },
        ],
      },
      {
        id: '5',
        name: 'utils',
        type: 'folder',
        path: '/src/utils',
        isOpen: false,
        children: [
          {
            id: '6',
            name: 'helpers.ts',
            type: 'file',
            path: '/src/utils/helpers.ts',
            language: 'typescript',
            content: `// Utility functions

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};`,
          },
        ],
      },
      {
        id: '7',
        name: 'index.ts',
        type: 'file',
        path: '/src/index.ts',
        language: 'typescript',
        content: `import { App } from './components/App';

// Application entry point
const root = document.getElementById('root');

if (root) {
  // Initialize the application
  console.log('Starting application...');
}

export { App };`,
      },
    ],
  },
  {
    id: '8',
    name: 'package.json',
    type: 'file',
    path: '/package.json',
    language: 'json',
    content: `{
  "name": "collaborative-editor",
  "version": "1.0.0",
  "description": "Real-time collaborative code editor",
  "main": "src/index.ts",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
  },
  {
    id: '9',
    name: 'README.md',
    type: 'file',
    path: '/README.md',
    language: 'markdown',
    content: `# Collaborative Code Editor

A real-time collaborative code editor built with React and Monaco Editor.

## Features

- 🔄 Real-time collaboration
- 👥 Live cursors & presence
- 💬 In-editor chat
- 🤖 AI code assistant
- 📁 File management
- ⚡ Instant code execution

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## License

MIT`,
  },
  {
    id: '10',
    name: 'scripts',
    type: 'folder',
    path: '/scripts',
    isOpen: true,
    children: [
      {
        id: '11',
        name: 'hello.py',
        type: 'file',
        path: '/scripts/hello.py',
        language: 'python',
        content: `# Python Example - Hello World
# Click "Run" or type "run" in terminal to execute

def greet(name):
    """Return a greeting message."""
    return f"Hello, {name}! Welcome to CodeCollab 🐍"

def fibonacci(n):
    """Generate first n Fibonacci numbers."""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

# Main execution
print(greet("Developer"))
print()
print("First 10 Fibonacci numbers:")
print(fibonacci(10))
print()
print("Python math:")
print(f"2 ** 10 = {2 ** 10}")
print(f"sum(range(1, 101)) = {sum(range(1, 101))}")
`,
      },
      {
        id: '12',
        name: 'demo.js',
        type: 'file',
        path: '/scripts/demo.js',
        language: 'javascript',
        content: `// JavaScript Demo - Array Operations
// Click "Run" to execute this file

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

console.log("Original array:", numbers);

// Map - double each number
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

// Filter - get even numbers
const evens = numbers.filter(n => n % 2 === 0);
console.log("Even numbers:", evens);

// Reduce - sum all numbers
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log("Sum:", sum);

// Object manipulation
const user = {
  name: "Developer",
  skills: ["JavaScript", "Python", "TypeScript"],
  level: "Expert"
};
console.log("User:", JSON.stringify(user, null, 2));
`,
      },
    ],
  },
];

// Sample users
const sampleUsers: User[] = [
  { id: '1', name: 'You', email: 'you@example.com', color: 1, isOnline: true },
  { id: '2', name: 'Alice Chen', email: 'alice@example.com', color: 2, isOnline: true },
  { id: '3', name: 'Bob Smith', email: 'bob@example.com', color: 3, isOnline: true },
  { id: '4', name: 'Carol Davis', email: 'carol@example.com', color: 4, isOnline: false },
];

// Sample chat messages
const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Alice Chen',
    userColor: 2,
    content: 'Hey, I just pushed the new button component!',
    timestamp: new Date(Date.now() - 300000),
    type: 'text',
  },
  {
    id: '2',
    userId: '3',
    userName: 'Bob Smith',
    userColor: 3,
    content: 'Nice! Can you add a loading state to it?',
    timestamp: new Date(Date.now() - 240000),
    type: 'text',
  },
  {
    id: '3',
    userId: '2',
    userName: 'Alice Chen',
    userColor: 2,
    content: 'Sure, will do that now.',
    timestamp: new Date(Date.now() - 180000),
    type: 'text',
  },
];

type AIAction = 'explain_selected_code' | 'fix_bugs' | 'refactor_code' | 'generate_function' | 'chat_about_file' | 'read_file' | 'write_file' | 'create_file' | 'analyze_project' | 'fix_errors' | 'fix_ui';

interface SendAIMessageInput {
  action: AIAction;
  prompt: string;
  fileName?: string;
  fileLanguage?: string;
  fileContent?: string;
  selectedCode?: string;
  projectId?: string;
  filePath?: string;
}

interface AIChatResponse {
  reply: string;
  model: string;
}

interface FlatFileNode extends Omit<FileNode, 'children'> {
  parentPath: string | null;
}

interface EditorState {
  // File system
  files: FileNode[];
  activeFileId: string | null;
  
  // Tabs
  tabs: EditorTab[];
  activeTabId: string | null;
  
  // Users & presence
  currentUser: User;
  collaborators: User[];
  cursors: CursorPosition[];
  
  // Chat
  messages: ChatMessage[];
  
  // AI Assistant
  aiMessages: Record<string, AIMessage[]>; // project_id -> messages
  isAILoading: Record<string, boolean>; // project_id -> loading state
  selectedCode: string;
  
  // UI state
  editorFontSize: number;
  editorWordWrap: 'on' | 'off';
  editorMinimap: boolean;
  sidebarWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  activeRightPanel: 'chat' | 'ai' | null;
  activeBottomPanel: 'terminal' | 'output' | 'ai' | null;
  activeActivityBar: 'files' | 'search' | 'git' | 'extensions' | 'settings';
  pendingTerminalCommand: string | null;
  
  // HTML Preview
  htmlPreviewLayout: 'editor' | 'split' | 'preview';
  
  // Extensions
  installedExtensions: string[];
  
  // Actions
  openFile: (fileId: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  updateFileContentLocal: (fileId: string, content: string) => void;
  applyRemoteFileContent: (fileId: string, content: string, revision?: number) => void;
  markFileSaved: (fileId: string, updates?: Partial<FileNode>) => void;
  toggleFolder: (folderId: string) => void;
  sendMessage: (content: string) => void;
  sendAIMessage: (input: SendAIMessageInput) => Promise<void>;
  setSelectedCode: (content: string) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveRightPanel: (panel: 'chat' | 'ai' | null) => void;
  setActiveBottomPanel: (panel: 'terminal' | 'output' | 'ai' | null) => void;
  setPendingTerminalCommand: (cmd: string | null) => void;
  setActiveActivityBar: (activity: 'files' | 'search' | 'git' | 'extensions' | 'settings') => void;
  setHtmlPreviewLayout: (layout: 'editor' | 'split' | 'preview') => void;
  setEditorFontSize: (size: number) => void;
  setEditorWordWrap: (wrap: 'on' | 'off') => void;
  setEditorMinimap: (enabled: boolean) => void;
  toggleExtension: (id: string) => void;
  createFile: (parentPath: string, name: string) => void;
  createFolder: (parentPath: string, name: string) => void;
  renameNode: (nodeId: string, nextName: string) => void;
  moveNode: (nodeId: string, destinationParentPath: string | null) => void;
  deleteFile: (fileId: string) => void;
  setFilesFromDb: (files: FileNode[]) => void;
  setCurrentUser: (user: User) => void;
  setCollaborators: (collaborators: User[]) => void;
  triggerRun: number;
  setTriggerRun: (timestamp: number) => void;
  isTerminalRunning: boolean;
  setIsTerminalRunning: (isRunning: boolean) => void;
  getAllFiles: () => FlatFileNode[];
  clearAIMessages: (projectId: string) => void;
}

// Helper function to find file by ID
const findFileById = (files: FileNode[], id: string): FileNode | null => {
  for (const file of files) {
    if (file.id === id) return file;
    if (file.children) {
      const found = findFileById(file.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to update file in tree
const updateFileInTree = (files: FileNode[], id: string, updates: Partial<FileNode>): FileNode[] => {
  return files.map(file => {
    if (file.id === id) {
      return { ...file, ...updates };
    }
    if (file.children) {
      return { ...file, children: updateFileInTree(file.children, id, updates) };
    }
    return file;
  });
};

const getParentPathFromPath = (path: string): string | null => {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return null;
  }

  return path.slice(0, lastSlashIndex);
};

const joinNodePath = (parentPath: string | null, name: string) =>
  parentPath ? `${parentPath}/${name}` : `/${name}`;

const replacePathPrefix = (path: string, currentPrefix: string, nextPrefix: string): string => {
  if (path === currentPrefix) {
    return nextPrefix;
  }

  if (path.startsWith(`${currentPrefix}/`)) {
    return `${nextPrefix}${path.slice(currentPrefix.length)}`;
  }

  return path;
};

const flattenFilesWithParents = (
  files: FileNode[],
  parentPath: string | null = null
): FlatFileNode[] => {
  return files.flatMap((file) => {
    const { children, ...rest } = file;
    const flatNode: FlatFileNode = {
      ...rest,
      parentPath,
    };

    if (!children?.length) {
      return [flatNode];
    }

    return [flatNode, ...flattenFilesWithParents(children, file.path)];
  });
};

const buildTreeFromFlatNodes = (flatNodes: FlatFileNode[]): FileNode[] => {
  const nodeMap = new Map<string, FileNode>();
  const roots: FileNode[] = [];

  flatNodes.forEach((node) => {
    nodeMap.set(node.path, {
      id: node.id,
      name: node.name,
      type: node.type,
      path: node.path,
      language: node.language,
      content: node.content,
      revision: node.revision,
      locked: node.locked,
      lock: node.lock,
      updatedAt: node.updatedAt,
      createdAt: node.createdAt,
      isOpen: node.isOpen,
      children: node.type === 'folder' ? [] : undefined,
    });
  });

  flatNodes.forEach((node) => {
    const currentNode = nodeMap.get(node.path);
    if (!currentNode) return;

    if (node.parentPath && nodeMap.has(node.parentPath)) {
      const parentNode = nodeMap.get(node.parentPath);
      if (parentNode) {
        parentNode.children = parentNode.children || [];
        parentNode.children.push(currentNode);
      }
    } else {
      roots.push(currentNode);
    }
  });

  const sortTree = (nodes: FileNode[]): FileNode[] =>
    nodes
      .sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'folder' ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortTree(node.children) : undefined,
      }));

  return sortTree(roots);
};

const syncTabsWithFiles = (tabs: EditorTab[], files: FileNode[]) => {
  const fileMap = new Map(
    flattenFilesWithParents(files)
      .filter((node) => node.type === 'file')
      .map((node) => [node.id, node])
  );

  return tabs
    .filter((tab) => fileMap.has(tab.fileId))
    .map((tab) => {
      const file = fileMap.get(tab.fileId);
      if (!file) {
        return tab;
      }

      return {
        ...tab,
        name: file.name,
        path: file.path,
        language: file.language || getLanguageFromFileName(file.name),
        content: tab.isDirty ? tab.content : file.content ?? tab.content,
        revision: tab.isDirty ? tab.revision : file.revision ?? tab.revision,
      };
    });
};

const getNextActiveTabId = (tabs: EditorTab[], activeTabId: string | null) => {
  if (!tabs.length) {
    return null;
  }

  if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) {
    return activeTabId;
  }

  return tabs[tabs.length - 1].id;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  files: sampleFiles,
  activeFileId: null,
  tabs: [],
  activeTabId: null,
  currentUser: sampleUsers[0],
  collaborators: sampleUsers.slice(1),
  cursors: [
    { userId: '2', line: 15, column: 8, fileName: 'App.tsx' },
    { userId: '3', line: 23, column: 12, fileName: 'App.tsx' },
  ],
  messages: sampleMessages,
  aiMessages: {},
  isAILoading: {},
  selectedCode: '',
  editorFontSize: 13,
  editorWordWrap: 'off',
  editorMinimap: true,
  sidebarWidth: 280,
  rightPanelWidth: 320,
  bottomPanelHeight: 350,
  activeRightPanel: null,
  activeBottomPanel: null,
  activeActivityBar: 'files',
  pendingTerminalCommand: null,
  installedExtensions: ['vscode-icons'],
  triggerRun: 0,
  isTerminalRunning: false,
  htmlPreviewLayout: 'editor',

  // Actions
  getAllFiles: () => flattenFilesWithParents(get().files),
  setHtmlPreviewLayout: (layout) => set({ htmlPreviewLayout: layout }),
  setTriggerRun: (timestamp) => set({ triggerRun: timestamp }),
  setIsTerminalRunning: (isRunning) => set({ isTerminalRunning: isRunning }),
  openFile: (fileId: string) => {
    const state = get();
    const file = findFileById(state.files, fileId);
    
    if (!file || file.type === 'folder') return;
    
    // Check if tab already exists
    const existingTab = state.tabs.find(tab => tab.fileId === fileId);
    
    if (existingTab) {
      set({ activeTabId: existingTab.id, activeFileId: fileId });
    } else {
      const newTab: EditorTab = {
        id: `tab-${fileId}`,
        fileId: fileId,
        name: file.name,
        path: file.path,
        language: file.language || getLanguageFromFileName(file.name),
        content: file.content || '',
        revision: file.revision || 0,
        isDirty: false,
      };
      
      set({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
        activeFileId: fileId,
      });
    }
  },

  closeTab: (tabId: string) => {
    const state = get();
    const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
    const newTabs = state.tabs.filter(tab => tab.id !== tabId);
    
    let newActiveTabId = state.activeTabId;
    if (state.activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      } else {
        newActiveTabId = null;
      }
    }
    
    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
      activeFileId: newActiveTabId ? newTabs.find(t => t.id === newActiveTabId)?.fileId || null : null,
    });
  },

  setActiveTab: (tabId: string) => {
    const state = get();
    const tab = state.tabs.find(t => t.id === tabId);
    if (tab) {
      set({ activeTabId: tabId, activeFileId: tab.fileId });
    }
  },

  updateFileContent: (fileId: string, content: string) => {
    const state = get();
    
    // Update file in tree
    const newFiles = updateFileInTree(state.files, fileId, { content });
    
    // Update tab content and mark as dirty
    const newTabs = state.tabs.map(tab => {
      if (tab.fileId === fileId) {
        return { ...tab, content, isDirty: true };
      }
      return tab;
    });
    
    set({ files: newFiles, tabs: newTabs });
  },

  toggleFolder: (folderId: string) => {
    const state = get();
    const newFiles = updateFileInTree(state.files, folderId, { 
      isOpen: !findFileById(state.files, folderId)?.isOpen 
    });
    set({ files: newFiles });
  },

  sendMessage: (content: string) => {
    const state = get();
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      userId: state.currentUser.id,
      userName: state.currentUser.name,
      userColor: state.currentUser.color,
      content,
      timestamp: new Date(),
      type: 'text',
    };
    set({ messages: [...state.messages, newMessage] });
  },

  sendAIMessage: async (input: SendAIMessageInput) => {
    const prompt = String(input?.prompt || '').trim();
    if (!prompt) return;

    const state = get();
    const projectId = input.projectId || 'local'; // Use provided projectId or 'local' as fallback
    
    const userMessage: AIMessage = {
      id: `ai-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    const currentMessages = state.aiMessages[projectId] || [];
    const priorConversation = currentMessages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    set((currentState) => ({
      aiMessages: {
        ...currentState.aiMessages,
        [projectId]: [...currentMessages, userMessage]
      },
      isAILoading: {
        ...currentState.isAILoading,
        [projectId]: true
      },
    }));

    try {
      const response = await apiRequest<AIChatResponse>('/ai/chat', {
        method: 'POST',
        body: {
          action: input.action,
          prompt,
          fileName: input.fileName || null,
          fileLanguage: input.fileLanguage || null,
          fileContent: input.fileContent || null,
          selectedCode: input.selectedCode || null,
          conversation: priorConversation,
        },
      });

      const assistantMessage: AIMessage = {
        id: `ai-${Date.now() + 1}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
      };

      set((currentState) => {
        const projectMessages = currentState.aiMessages[projectId] || [];
        return {
          aiMessages: {
            ...currentState.aiMessages,
            [projectId]: [...projectMessages, assistantMessage]
          },
          isAILoading: {
            ...currentState.isAILoading,
            [projectId]: false
          },
        };
      });
    } catch (error) {
      const assistantMessage: AIMessage = {
        id: `ai-${Date.now() + 1}`,
        role: 'assistant',
        content: `AI request failed: ${(error as Error).message}`,
        timestamp: new Date(),
      };

      set((currentState) => {
        const projectMessages = currentState.aiMessages[projectId] || [];
        return {
          aiMessages: {
            ...currentState.aiMessages,
            [projectId]: [...projectMessages, assistantMessage]
          },
          isAILoading: {
            ...currentState.isAILoading,
            [projectId]: false
          },
        };
      });
    }
  },

  setSelectedCode: (content: string) => {
    set({ selectedCode: content });
  },

  setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),
  setRightPanelWidth: (width: number) => set({ rightPanelWidth: Math.max(250, Math.min(500, width)) }),
  setBottomPanelHeight: (height: number) => set({ bottomPanelHeight: Math.max(120, Math.min(2000, height)) }),
  setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
  setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),
  setPendingTerminalCommand: (cmd: string | null) => set({ pendingTerminalCommand: cmd }),
  setActiveActivityBar: (activity) => set({ activeActivityBar: activity }),
  setEditorFontSize: (size) => set({ editorFontSize: size }),
  setEditorWordWrap: (wrap) => set({ editorWordWrap: wrap }),
  setEditorMinimap: (enabled) => set({ editorMinimap: enabled }),
  toggleExtension: (id) => set((state) => ({
    installedExtensions: state.installedExtensions.includes(id) 
      ? state.installedExtensions.filter(e => e !== id)
      : [...state.installedExtensions, id]
  })),

  createFile: (parentPath: string, name: string) => {
    const state = get();
    
    // Determine template based on file extension
    const getTemplate = (filename: string): string => {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const templates: Record<string, string> = {
        js: `// ${filename}
// Created at ${new Date().toLocaleDateString()}

console.log('Hello from ${filename}');
`,
        jsx: `import React from 'react';

export const Component = () => {
  return <div>Hello from ${filename}</div>;
};
`,
        ts: `// ${filename}
// Created at ${new Date().toLocaleDateString()}

const greeting = 'Hello from ${filename}';
console.log(greeting);
`,
        tsx: `import React from 'react';

interface Props {}

export const Component: React.FC<Props> = () => {
  return <div>Hello from ${filename}</div>;
};
`,
        py: `# ${filename}
# Created at ${new Date().toLocaleDateString()}

def main():
    print('Hello from ${filename}')

if __name__ == '__main__':
    main()
`,
        html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${filename}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #111827, #1f2937);
        color: #f9fafb;
      }

      .card {
        padding: 2rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      }

      h1 {
        margin: 0 0 0.75rem;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Hello from ${filename}</h1>
      <p>Edit this page and use Preview in the terminal panel.</p>
    </main>
  </body>
</html>
`,
        css: `/* ${filename} */
body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
}
`,
        json: `{
  "name": "${filename.replace('.json', '')}",
  "version": "1.0.0",
  "description": ""
}
`,
      };
      return templates[ext] || `// ${filename}\n`;
    };

    const addFileToTree = (files: FileNode[]): FileNode[] => {
      return files.map(file => {
        if (file.path === parentPath && file.type === 'folder') {
          const newFile: FileNode = {
            id: `file-${Date.now()}-${Math.random()}`,
            name,
            type: 'file',
            path: `${parentPath}/${name}`,
            language: getLanguageFromFileName(name),
            content: getTemplate(name),
          };
          return { ...file, children: [...(file.children || []), newFile] };
        }
        if (file.children) {
          return { ...file, children: addFileToTree(file.children) };
        }
        return file;
      });
    };

    // If no parent path, add to root
    if (!parentPath || parentPath === '/') {
      const newFile: FileNode = {
        id: `file-${Date.now()}-${Math.random()}`,
        name,
        type: 'file',
        path: `/${name}`,
        language: getLanguageFromFileName(name),
        content: getTemplate(name),
      };
      set({ files: [...state.files, newFile] });
    } else {
      set({ files: addFileToTree(state.files) });
    }
  },

  createFolder: (parentPath: string, name: string) => {
    const state = get();

    const addFolderToTree = (files: FileNode[]): FileNode[] => {
      return files.map(file => {
        if (file.path === parentPath && file.type === 'folder') {
          const newFolder: FileNode = {
            id: `folder-${Date.now()}-${Math.random()}`,
            name,
            type: 'folder',
            path: `${parentPath}/${name}`,
            isOpen: true,
            children: [],
          };
          return { ...file, children: [...(file.children || []), newFolder] };
        }
        if (file.children) {
          return { ...file, children: addFolderToTree(file.children) };
        }
        return file;
      });
    };

    // If no parent path, add to root
    if (!parentPath || parentPath === '/') {
      const newFolder: FileNode = {
        id: `folder-${Date.now()}-${Math.random()}`,
        name,
        type: 'folder',
        path: `/${name}`,
        isOpen: true,
        children: [],
      };
      set({ files: [...state.files, newFolder] });
    } else {
      set({ files: addFolderToTree(state.files) });
    }
  },

  renameNode: (nodeId: string, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName) {
      return;
    }

    const state = get();
    const flatNodes = flattenFilesWithParents(state.files);
    const targetNode = flatNodes.find((node) => node.id === nodeId);

    if (!targetNode) {
      return;
    }

    const nextPath = joinNodePath(targetNode.parentPath, trimmedName);
    if (nextPath === targetNode.path) {
      return;
    }

    const subtreeNodes = flatNodes.filter(
      (node) => node.path === targetNode.path || node.path.startsWith(`${targetNode.path}/`)
    );
    const subtreeIds = new Set(subtreeNodes.map((node) => node.id));
    const nextPaths = new Set(
      subtreeNodes.map((node) => replacePathPrefix(node.path, targetNode.path, nextPath))
    );

    const hasConflict = flatNodes.some(
      (node) => !subtreeIds.has(node.id) && nextPaths.has(node.path)
    );
    if (hasConflict) {
      return;
    }

    const updatedNodes = flatNodes.map((node) => {
      if (node.path === targetNode.path || node.path.startsWith(`${targetNode.path}/`)) {
        const updatedPath = replacePathPrefix(node.path, targetNode.path, nextPath);
        const updatedParentPath =
          node.id === targetNode.id
            ? targetNode.parentPath
            : node.parentPath
              ? replacePathPrefix(node.parentPath, targetNode.path, nextPath)
              : null;

        return {
          ...node,
          name: node.id === targetNode.id ? trimmedName : node.name,
          path: updatedPath,
          parentPath: updatedParentPath,
        };
      }

      return node;
    });

    const nextFiles = buildTreeFromFlatNodes(updatedNodes);
    const nextTabs = syncTabsWithFiles(state.tabs, nextFiles);
    const nextActiveTabId = getNextActiveTabId(nextTabs, state.activeTabId);

    set({
      files: nextFiles,
      tabs: nextTabs,
      activeTabId: nextActiveTabId,
      activeFileId: nextActiveTabId
        ? nextTabs.find((tab) => tab.id === nextActiveTabId)?.fileId || null
        : null,
    });
  },

  moveNode: (nodeId: string, destinationParentPath: string | null) => {
    const normalizedDestination =
      !destinationParentPath || destinationParentPath === '/' ? null : destinationParentPath;

    const state = get();
    const flatNodes = flattenFilesWithParents(state.files);
    const targetNode = flatNodes.find((node) => node.id === nodeId);

    if (!targetNode) {
      return;
    }

    if (
      targetNode.type === 'folder' &&
      normalizedDestination &&
      (normalizedDestination === targetNode.path ||
        normalizedDestination.startsWith(`${targetNode.path}/`))
    ) {
      return;
    }

    const nextPath = joinNodePath(normalizedDestination, targetNode.name);
    if (nextPath === targetNode.path) {
      return;
    }

    const subtreeNodes = flatNodes.filter(
      (node) => node.path === targetNode.path || node.path.startsWith(`${targetNode.path}/`)
    );
    const subtreeIds = new Set(subtreeNodes.map((node) => node.id));
    const nextPaths = new Set(
      subtreeNodes.map((node) => replacePathPrefix(node.path, targetNode.path, nextPath))
    );

    const hasConflict = flatNodes.some(
      (node) => !subtreeIds.has(node.id) && nextPaths.has(node.path)
    );
    if (hasConflict) {
      return;
    }

    const updatedNodes = flatNodes.map((node) => {
      if (node.path === targetNode.path || node.path.startsWith(`${targetNode.path}/`)) {
        const updatedPath = replacePathPrefix(node.path, targetNode.path, nextPath);
        const updatedParentPath =
          node.id === targetNode.id
            ? normalizedDestination
            : node.parentPath
              ? replacePathPrefix(node.parentPath, targetNode.path, nextPath)
              : null;

        return {
          ...node,
          path: updatedPath,
          parentPath: updatedParentPath,
        };
      }

      return node;
    });

    const nextFiles = buildTreeFromFlatNodes(updatedNodes);
    const nextTabs = syncTabsWithFiles(state.tabs, nextFiles);
    const nextActiveTabId = getNextActiveTabId(nextTabs, state.activeTabId);

    set({
      files: nextFiles,
      tabs: nextTabs,
      activeTabId: nextActiveTabId,
      activeFileId: nextActiveTabId
        ? nextTabs.find((tab) => tab.id === nextActiveTabId)?.fileId || null
        : null,
    });
  },

  deleteFile: (fileId: string) => {
    const state = get();
    
    const removeFromTree = (files: FileNode[]): FileNode[] => {
      return files.filter(file => {
        if (file.id === fileId) return false;
        if (file.children) {
          file.children = removeFromTree(file.children);
        }
        return true;
      });
    };
    
    const nextFiles = removeFromTree(state.files);
    const nextTabs = syncTabsWithFiles(state.tabs, nextFiles);
    const nextActiveTabId = getNextActiveTabId(nextTabs, state.activeTabId);

    set({
      files: nextFiles,
      tabs: nextTabs,
      activeTabId: nextActiveTabId,
      activeFileId: nextActiveTabId
        ? nextTabs.find((tab) => tab.id === nextActiveTabId)?.fileId || null
        : null,
    });
  },

  // New methods for database sync
  setFilesFromDb: (files: FileNode[]) => {
    const state = get();
    const nextTabs = syncTabsWithFiles(state.tabs, files);
    const nextActiveTabId = getNextActiveTabId(nextTabs, state.activeTabId);

    set({
      files,
      tabs: nextTabs,
      activeTabId: nextActiveTabId,
      activeFileId: nextActiveTabId
        ? nextTabs.find((tab) => tab.id === nextActiveTabId)?.fileId || null
        : null,
    });
  },

  updateFileContentLocal: (fileId: string, content: string) => {
    const state = get();
    
    // Update file in tree
    const newFiles = updateFileInTree(state.files, fileId, { content });
    
    // Update tab content and mark as dirty
    const newTabs = state.tabs.map(tab => {
      if (tab.fileId === fileId) {
        return { ...tab, content, isDirty: true };
      }
      return tab;
    });
    
    set({ files: newFiles, tabs: newTabs });
  },

  applyRemoteFileContent: (fileId: string, content: string, revision?: number) => {
    const state = get();
    const newFiles = updateFileInTree(state.files, fileId, {
      content,
      ...(revision !== undefined ? { revision } : {}),
    });

    const newTabs = state.tabs.map((tab) => {
      if (tab.fileId !== fileId) {
        return tab;
      }

      return {
        ...tab,
        content,
        ...(revision !== undefined ? { revision } : {}),
      };
    });

    set({ files: newFiles, tabs: newTabs });
  },

  markFileSaved: (fileId: string, updates: Partial<FileNode> = {}) => {
    const state = get();
    const newFiles = updateFileInTree(state.files, fileId, updates);
    const shouldClearDirty =
      updates.content !== undefined || updates.revision !== undefined || updates.updatedAt !== undefined;

    const newTabs = state.tabs.map((tab) => {
      if (tab.fileId !== fileId) {
        return tab;
      }

      return {
        ...tab,
        name: updates.name ?? tab.name,
        path: updates.path ?? tab.path,
        language: updates.language || tab.language,
        content: updates.content ?? tab.content,
        revision: updates.revision ?? tab.revision,
        isDirty: shouldClearDirty ? false : tab.isDirty,
      };
    });

    set({ files: newFiles, tabs: newTabs });
  },

  setCurrentUser: (user: User) => {
    set({ currentUser: user });
  },

  setCollaborators: (collaborators: User[]) => {
    set({ collaborators });
  },

  clearAIMessages: (projectId: string) => {
    set((currentState) => ({
      aiMessages: {
        ...currentState.aiMessages,
        [projectId]: []
      },
      isAILoading: {
        ...currentState.isAILoading,
        [projectId]: false
      },
    }));
  },
}));
