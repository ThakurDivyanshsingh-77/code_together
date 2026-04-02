import React, { useState } from 'react';
import { Package, Search, CheckCircle2, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/store/editorStore';

interface Extension {
  id: string;
  name: string;
  description: string;
  author: string;
  downloads: string;
  icon: string;
}

const mockExtensions: Extension[] = [
  { id: 'vscode-icons', name: 'Material Icon Theme', description: 'Material Design Icons for VS Code', author: 'Philipp Kief', downloads: '25.3M', icon: '🎨' },
  { id: 'prettier', name: 'Prettier - Code formatter', description: 'Code formatter using prettier', author: 'Prettier', downloads: '38.5M', icon: '✨' },
  { id: 'eslint', name: 'ESLint', description: 'Integrates ESLint JavaScript into VS Code.', author: 'Microsoft', downloads: '30.2M', icon: '🔍' },
  { id: 'tailwind', name: 'Tailwind CSS IntelliSense', description: 'Intelligent Tailwind CSS tooling for Code Together.', author: 'Tailwind Labs', downloads: '8.4M', icon: '🌊' },
  { id: 'python', name: 'Python', description: 'IntelliSense (Pylance), Linting, Debugging, code formatting, and more.', author: 'Microsoft', downloads: '102.1M', icon: '🐍' },
  { id: 'react-snippets', name: 'ES7+ React/Redux/React-Native snippets', description: 'Extensions for React, React-Native and Redux.', author: 'dsznajder', downloads: '9.1M', icon: '⚛️' },
  { id: 'gitlens', name: 'GitLens — Git supercharged', description: 'Supercharge Git within VS Code.', author: 'GitKraken', downloads: '29.3M', icon: '🔎' },
  { id: 'copilot', name: 'GitHub Copilot', description: 'Your AI pair programmer', author: 'GitHub', downloads: '12.8M', icon: '🤖' },
  { id: 'docker', name: 'Docker', description: 'Makes it easy to create, manage, and debug containerized applications.', author: 'Microsoft', downloads: '24.1M', icon: '🐋' },
  { id: 'live-server', name: 'Live Server', description: 'Launch a local development server with live reload.', author: 'Ritwick Dey', downloads: '39.8M', icon: '⚡' },
  { id: 'cpp', name: 'C/C++', description: 'C/C++ IntelliSense, debugging, and code navigation.', author: 'Microsoft', downloads: '55.2M', icon: '©️' },
  { id: 'jupyter', name: 'Jupyter', description: 'Jupyter notebook support, interactive programming and computing.', author: 'Microsoft', downloads: '75.4M', icon: '📓' },
  { id: 'bracket-pair', name: 'Bracket Pair Colorizer 2', description: 'A customizable extension for colorizing matching brackets.', author: 'CoenraadS', downloads: '12.4M', icon: '][ ' },
  { id: 'vue', name: 'Vue - Official (Volar)', description: 'Vue language server features for VS Code.', author: 'Vue', downloads: '6.2M', icon: '💚' },
  { id: 'vscode-pdf', name: 'vscode-pdf', description: 'Display pdf file in VSCode.', author: 'tomoki1207', downloads: '2.1M', icon: '📄' },
  { id: 'ruby', name: 'Ruby', description: 'Ruby language support and debugging.', author: 'Peng Lv', downloads: '4.8M', icon: '💎' },
  { id: 'rust', name: 'rust-analyzer', description: 'Rust language support for Visual Studio Code.', author: 'rust-lang.org', downloads: '2.9M', icon: '🦀' },
  { id: 'go', name: 'Go', description: 'Rich Go language support for Visual Studio Code.', author: 'Go Team at Google', downloads: '11.5M', icon: '🐹' },
  { id: 'java', name: 'Language Support for Java™', description: 'Java Linting, Intellisense, formatting, refactoring, and more.', author: 'Red Hat', downloads: '28.9M', icon: '☕' },
  { id: 'csharp', name: 'C#', description: 'C# editing support, including Syntax Highlighting, IntelliSense.', author: 'Microsoft', downloads: '21.3M', icon: '#️⃣' },
  { id: 'angular', name: 'Angular Language Service', description: 'Editor services for Angular templates.', author: 'Angular', downloads: '5.4M', icon: '🅰️' },
  { id: 'dart', name: 'Dart', description: 'Dart language support and debugger.', author: 'Dart Code', downloads: '6.1M', icon: '🎯' },
  { id: 'flutter', name: 'Flutter', description: 'Flutter support and debugger.', author: 'Dart Code', downloads: '8.2M', icon: '🦋' },
  { id: 'yaml', name: 'YAML', description: 'YAML Language Support by Red Hat.', author: 'Red Hat', downloads: '19.4M', icon: '📋' },
  { id: 'vscode-icons-mac', name: 'Macism Icon Theme', description: 'Mac like icons for VS Code.', author: 'Mano', downloads: '1.2M', icon: '🍎' },
  { id: 'dracula', name: 'Dracula Official', description: 'Official Dracula Theme.', author: 'Dracula Theme', downloads: '5.8M', icon: '🧛' },
  { id: 'one-dark', name: 'One Dark Pro', description: 'Atom\'s iconic One Dark theme.', author: 'zhuangtongfa', downloads: '8.9M', icon: '🌙' },
  { id: 'github-theme', name: 'GitHub Theme', description: 'GitHub theme for VS Code.', author: 'GitHub', downloads: '9.2M', icon: '😸' },
  { id: 'cobalt2', name: 'Cobalt2 Theme Official', description: 'Official Cobalt2 Theme by Wes Bos.', author: 'Wes Bos', downloads: '1.4M', icon: '💙' },
  { id: 'path-intellisense', name: 'Path Intellisense', description: 'Visual Studio Code plugin that autocompletes filenames.', author: 'Christian Kohler', downloads: '10.5M', icon: '📁' },
  { id: 'auto-rename-tag', name: 'Auto Rename Tag', description: 'Auto rename paired HTML/XML tag.', author: 'Jun Han', downloads: '14.2M', icon: '🏷️' },
  { id: 'color-highlight', name: 'Color Highlight', description: 'Highlight web colors in your editor.', author: 'Sergii N', downloads: '5.1M', icon: '🌈' },
  { id: 'thunder-client', name: 'Thunder Client', description: 'Lightweight Rest API Client for VS Code.', author: 'Ranga Vadhineni', downloads: '4.7M', icon: '⚡' },
];

interface ExtensionsPanelProps {
  className?: string;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ className }) => {
  const { installedExtensions, toggleExtension } = useEditorStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExtensions = mockExtensions.filter(ext => 
    ext.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col h-full bg-sidebar", className)}>
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Extensions</span>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md text-muted-foreground hover:text-foreground">
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input 
            placeholder="Search Extensions in Marketplace" 
            className="pl-8 h-9 text-xs bg-background/50 border-border focus-visible:ring-1 focus-visible:ring-primary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 pb-1 flex justify-between items-center">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Installed & Recommended
          </h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
            {installedExtensions.length} / {mockExtensions.length}
          </span>
        </div>
        
        <div className="space-y-1 pb-4">
          {filteredExtensions.map((ext) => {
            const isInstalled = installedExtensions.includes(ext.id);
            return (
              <div 
                key={ext.id} 
                className="group flex flex-col gap-2 p-3 mx-2 rounded-md hover:bg-secondary/50 transition-colors border border-transparent hover:border-border/50 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-md bg-background border border-border flex items-center justify-center text-lg shrink-0 shadow-sm">
                    {ext.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{ext.name}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {ext.author}
                    </p>
                  </div>
                </div>
                
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {ext.description}
                </p>
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                    {ext.downloads}
                  </span>
                  <Button 
                    variant={isInstalled ? "secondary" : "default"}
                    size="sm" 
                    className={cn(
                      "h-6 text-[10px] px-2.5 shadow-none", 
                      isInstalled 
                        ? "bg-secondary hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExtension(ext.id);
                    }}
                  >
                    {isInstalled ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1.5 group-hover:hidden" /><span className="group-hover:hidden">Installed</span><span className="hidden group-hover:inline">Uninstall</span></>
                    ) : (
                      <><Download className="w-3 h-3 mr-1.5" /> Install</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          
          {filteredExtensions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Package className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">No extensions found</p>
              <p className="text-xs mt-1 text-muted-foreground max-w-[200px]">
                We couldn't find any extensions matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
