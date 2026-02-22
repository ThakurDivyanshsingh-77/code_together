import { create } from 'zustand';
import { FileNode, EditorTab, User, ChatMessage, CursorPosition, AIMessage, getLanguageFromFileName } from '@/types/editor';

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
  aiMessages: AIMessage[];
  isAILoading: boolean;
  
  // UI state
  sidebarWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  activeRightPanel: 'chat' | 'ai' | null;
  activeBottomPanel: 'terminal' | 'output' | null;
  activeActivityBar: 'files' | 'search' | 'git' | 'extensions' | 'settings';
  
  // Actions
  openFile: (fileId: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateFileContent: (fileId: string, content: string) => void;
  updateFileContentLocal: (fileId: string, content: string) => void;
  toggleFolder: (folderId: string) => void;
  sendMessage: (content: string) => void;
  sendAIMessage: (content: string) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveRightPanel: (panel: 'chat' | 'ai' | null) => void;
  setActiveBottomPanel: (panel: 'terminal' | 'output' | null) => void;
  setActiveActivityBar: (activity: 'files' | 'search' | 'git' | 'extensions' | 'settings') => void;
  createFile: (parentPath: string, name: string) => void;
  createFolder: (parentPath: string, name: string) => void;
  deleteFile: (fileId: string) => void;
  setFilesFromDb: (files: FileNode[]) => void;
  setCurrentUser: (user: User) => void;
  setCollaborators: (collaborators: User[]) => void;
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
  aiMessages: [],
  isAILoading: false,
  sidebarWidth: 280,
  rightPanelWidth: 320,
  bottomPanelHeight: 200,
  activeRightPanel: null,
  activeBottomPanel: null,
  activeActivityBar: 'files',

  // Actions
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

  sendAIMessage: async (content: string) => {
    const state = get();
    
    // Add user message
    const userMessage: AIMessage = {
      id: `ai-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    set({ 
      aiMessages: [...state.aiMessages, userMessage],
      isAILoading: true 
    });

    // Simulate AI response (will be replaced with actual API call)
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: `ai-${Date.now() + 1}`,
        role: 'assistant',
        content: `I analyzed your code. Here's what I found:\n\n\`\`\`typescript\n// Your code looks good! Here are some suggestions:\n// 1. Consider adding error boundaries\n// 2. You could memoize the expensive calculations\n// 3. Add TypeScript strict mode\n\`\`\`\n\nWould you like me to implement any of these improvements?`,
        timestamp: new Date(),
      };
      
      set(state => ({
        aiMessages: [...state.aiMessages, aiResponse],
        isAILoading: false,
      }));
    }, 1500);
  },

  setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),
  setRightPanelWidth: (width: number) => set({ rightPanelWidth: Math.max(250, Math.min(500, width)) }),
  setBottomPanelHeight: (height: number) => set({ bottomPanelHeight: Math.max(100, Math.min(400, height)) }),
  setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
  setActiveBottomPanel: (panel) => set({ activeBottomPanel: panel }),
  setActiveActivityBar: (activity) => set({ activeActivityBar: activity }),

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
    
    // Close any open tabs for this file
    const tabToClose = state.tabs.find(tab => tab.fileId === fileId);
    if (tabToClose) {
      get().closeTab(tabToClose.id);
    }
    
    set({ files: removeFromTree(state.files) });
  },

  // New methods for database sync
  setFilesFromDb: (files: FileNode[]) => {
    set({ files });
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

  setCurrentUser: (user: User) => {
    set({ currentUser: user });
  },

  setCollaborators: (collaborators: User[]) => {
    set({ collaborators });
  },
}));
