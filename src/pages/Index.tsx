import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Users, 
  Zap, 
  Bot, 
  GitBranch,
  Terminal,
  ArrowRight,
  Play,
  MessageSquare,
  Sparkles,
  Loader2
} from 'lucide-react';
import { IDELayout } from '@/components/editor';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProjectList } from '@/components/projects/ProjectList';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    description: 'Code together with live cursors, presence indicators, and instant sync across all connected users.',
  },
  {
    icon: Bot,
    title: 'AI Code Assistant',
    description: 'Get intelligent code suggestions, explanations, and debugging help powered by advanced AI models.',
  },
  {
    icon: Terminal,
    title: 'Integrated Terminal',
    description: 'Run your code directly in the browser with a fully-featured terminal environment.',
  },
  {
    icon: MessageSquare,
    title: 'Project Chat',
    description: 'Communicate with your team in real-time without leaving the code editor.',
  },
  {
    icon: GitBranch,
    title: 'Version Control',
    description: 'Track changes, create branches, and collaborate with Git integration built-in.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Monaco Editor engine ensures a smooth, responsive coding experience.',
  },
];

const LandingPage: React.FC<{ onEnterEditor: () => void; onSignIn: () => void }> = ({ onEnterEditor, onSignIn }) => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Code className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">CodeCollab</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onSignIn}>Sign In</Button>
          <Button size="sm" onClick={onSignIn}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm">Now with AI-powered code assistance</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="gradient-text">Code Together</span>
          <br />
          <span className="text-foreground">in Real Time</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          A powerful collaborative code editor built for modern development teams. 
          Edit code together, chat in real-time, and get AI assistance — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            onClick={onSignIn}
            className="gap-2 px-8 shadow-glow"
          >
            <Play className="w-4 h-4" />
            Get Started Free
          </Button>
          <Button variant="outline" size="lg" onClick={onEnterEditor} className="gap-2">
            <Code className="w-4 h-4" />
            Try Demo
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-12 mt-16 text-center">
          {[
            { value: '50K+', label: 'Developers' },
            { value: '99.9%', label: 'Uptime' },
            { value: '<50ms', label: 'Sync Latency' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Editor Preview */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div 
          className="relative rounded-xl border border-border overflow-hidden shadow-2xl cursor-pointer group"
          onClick={onEnterEditor}
        >
          {/* Mock editor preview */}
          <div className="bg-sidebar h-10 flex items-center px-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
            </div>
            <div className="flex-1 text-center text-sm text-muted-foreground">
              collaborative-editor — CodeCollab
            </div>
          </div>
          
          <div className="bg-editor p-8 font-mono text-sm leading-relaxed h-80 overflow-hidden">
            <div className="flex gap-8">
              {/* Line numbers */}
              <div className="text-editor-gutter text-right select-none">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1">
                <div><span className="syntax-keyword">import</span> <span className="syntax-variable">React</span> <span className="syntax-keyword">from</span> <span className="syntax-string">'react'</span>;</div>
                <div><span className="syntax-keyword">import</span> {'{'} <span className="syntax-variable">useState</span>, <span className="syntax-variable">useEffect</span> {'}'} <span className="syntax-keyword">from</span> <span className="syntax-string">'react'</span>;</div>
                <div></div>
                <div><span className="syntax-keyword">interface</span> <span className="syntax-type">CollaboratorProps</span> {'{'}</div>
                <div>  <span className="syntax-variable">name</span>: <span className="syntax-type">string</span>;</div>
                <div>  <span className="syntax-variable">cursor</span>: {'{'} <span className="syntax-variable">line</span>: <span className="syntax-type">number</span>; <span className="syntax-variable">col</span>: <span className="syntax-type">number</span> {'}'};</div>
                <div>{'}'}</div>
                <div></div>
                <div><span className="syntax-keyword">export const</span> <span className="syntax-function">Collaborator</span> = ({'{'} <span className="syntax-variable">name</span>, <span className="syntax-variable">cursor</span> {'}'}) {'=> {'}</div>
                <div>  <span className="syntax-keyword">const</span> [<span className="syntax-variable">isActive</span>, <span className="syntax-function">setIsActive</span>] = <span className="syntax-function">useState</span>(<span className="syntax-keyword">true</span>);</div>
                <div></div>
                <div>  <span className="syntax-function">useEffect</span>(() {'=> {'}</div>
                <div>    <span className="syntax-comment">// Track collaborator activity</span></div>
                <div>    <span className="syntax-keyword">const</span> <span className="syntax-variable">timer</span> = <span className="syntax-function">setInterval</span>(() {'=> {'}</div>
                <div>      <span className="syntax-function">setIsActive</span>(<span className="syntax-variable">prev</span> {'=> !'}<span className="syntax-variable">prev</span>);</div>
                <div>    {'}'}, <span className="syntax-number">3000</span>);</div>
              </div>
            </div>
            
            {/* Simulated cursor */}
            <div 
              className="absolute top-[200px] left-[380px] cursor-label"
              style={{ backgroundColor: 'hsl(var(--user-2))' }}
            >
              Alice
            </div>
            <div 
              className="absolute top-[200px] left-[380px] w-0.5 h-5 animate-blink"
              style={{ backgroundColor: 'hsl(var(--user-2))' }}
            />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-card px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              <span className="font-medium">Try Demo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything you need to <span className="gradient-text">code together</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built with modern technologies for the best collaborative coding experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.title}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border">
          <h2 className="text-3xl font-bold mb-4">Ready to collaborate?</h2>
          <p className="text-muted-foreground mb-8">
            Start coding with your team in real-time. No setup required.
          </p>
          <Button size="lg" onClick={onSignIn} className="gap-2 shadow-glow">
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code className="w-4 h-4" />
            <span>CodeCollab — Built for developers who love to collaborate</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

type View = 'landing' | 'auth' | 'projects' | 'editor' | 'demo';

const Index = () => {
  const { user, loading } = useAuth();
  const { projects } = useProjects();
  const [view, setView] = useState<View>('landing');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('');

  // Redirect to projects if user is logged in
  useEffect(() => {
    if (!loading && user && view === 'landing') {
      setView('projects');
    }
  }, [user, loading, view]);

  const handleSelectProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProjectId(projectId);
    setSelectedProjectName(project?.name || 'Untitled Project');
    setView('editor');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Demo mode (no auth)
  if (view === 'demo') {
    return <IDELayout />;
  }

  // Auth flow
  if (view === 'auth' && !user) {
    return <AuthForm onSuccess={() => setView('projects')} />;
  }

  // Project list (authenticated)
  if (view === 'projects' && user) {
    return <ProjectList onSelectProject={handleSelectProject} />;
  }

  // Collaborative editor (authenticated with project selected)
  if (view === 'editor' && user && selectedProjectId) {
    return (
      <CollaborativeEditor
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        onBack={() => {
          setSelectedProjectId(null);
          setView('projects');
        }}
      />
    );
  }

  // Landing page
  return (
    <LandingPage 
      onEnterEditor={() => setView('demo')} 
      onSignIn={() => setView(user ? 'projects' : 'auth')}
    />
  );
};

export default Index;
