import { useState, useEffect } from 'react';
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
  Loader2,
  Lock
} from 'lucide-react';
import { IDELayout } from '@/components/editor';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { AuthForm } from '@/components/auth/AuthForm';
import { ProjectList } from '@/components/projects/ProjectList';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
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

import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const onSignIn = () => navigate(user ? '/dashboard' : '/login');
  const onEnterEditor = () => navigate('/editor/demo');

  return (
    <div className="min-h-screen bg-[#060608] overflow-hidden text-foreground font-sans relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-circuit opacity-30 pointer-events-none" />
      <div className="absolute inset-0 scanlines pointer-events-none opacity-50" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 font-mono text-primary font-bold text-xl tracking-tight">
          <span className="text-primary">&gt;_</span>
          <span>CODE_TOGETHER.</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 font-mono text-sm text-muted-foreground select-none">
          <a href="#features" className="hover:text-primary transition-colors">[FEATURES]</a>
          <a href="#" className="hover:text-primary transition-colors">[PRICING]</a>
          <a href="#" className="hover:text-primary transition-colors">[ABOUT]</a>
        </nav>

        <div className="flex items-center gap-6 font-mono text-sm">
          <button onClick={onSignIn} className="hover:text-primary transition-colors text-muted-foreground font-semibold">
            LOG_IN
          </button>
          <button 
            onClick={onSignIn}
            className="border border-primary text-primary px-4 py-1.5 uppercase hover:bg-primary/10 transition-colors shadow-glow"
          >
            INIT_SYSTEM
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Content */}
        <div className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary/30 text-primary font-mono text-xs mb-4 shadow-inner-glow uppercase select-none">
            SYSTEM_STATUS: ONLINE
          </div>
          
          <h1 className="text-[5rem] md:text-[6.5rem] font-black font-heading uppercase tracking-tighter leading-[0.85] flex flex-col items-start">
            <span className="heavy-glitch" data-text="CODE">CODE</span>
            <span className="bg-gradient-to-r from-primary via-secondary to-accent-tertiary bg-clip-text text-transparent transform">
              TOGETHER
            </span>
            <span className="text-accent-tertiary">IN REAL TIME</span>
          </h1>

          <div className="mt-8 font-mono text-muted-foreground leading-relax border-l-2 border-primary/50 pl-4 py-1 text-sm md:text-base max-w-lg">
            <p><span className="text-primary">&gt;</span> Code Together brings your team together with powerful tools designed to streamline workflows, boost productivity, and drive results immediately.</p>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-10 font-mono text-sm">
            <button 
              onClick={onSignIn}
              className="border border-primary text-primary px-6 py-3 uppercase hover:bg-primary/10 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.2)]"
            >
              START FREE TRIAL &rarr;
            </button>
            <button onClick={onEnterEditor} className="text-muted-foreground hover:text-white uppercase tracking-wider transition-colors">
              WATCH DEMO
            </button>
          </div>
        </div>

        {/* Right HUD Display Panel */}
        <div className="relative w-full aspect-[5/4] flex items-center justify-center p-4">
           {/* Outer HUD Frame */}
           <div className="absolute inset-0 border-[0.5px] border-primary/20 bg-[#0a0a0f]/90 shadow-[0_0_50px_rgba(0,0,0,0.8)] cyber-chamfer overflow-hidden flex flex-col p-8">
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/60" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/60" />
              
              {/* HUD Header */}
              <div className="flex justify-end mb-10 relative">
                <div className="text-[10px] font-mono text-primary/80 uppercase tracking-widest relative z-10 px-2 py-0.5 bg-primary/10 border border-primary/30">
                  HUD_DISPLAY_V_0.9
                </div>
                {/* Horizontal & Vertical HUD traces */}
                <div className="absolute -right-8 top-1/2 w-[150%] h-[1px] bg-primary/20 -translate-y-1/2 -z-0" />
                <div className="absolute right-[120px] top-[-30px] w-[1px] h-[300px] bg-primary/20 -z-0" />
              </div>

              {/* HUD Modules Grid */}
              <div className="grid grid-cols-2 gap-6 flex-1 relative z-10">
                {/* Module 1: CPU Box */}
                <div className="flex flex-col items-center justify-center border border-primary/30 bg-[#12121a] relative cyber-chamfer-sm group transition-all">
                  <div className="absolute -top-3 -left-3 w-4 h-4 border-t border-l border-primary/50" />
                  <div className="absolute -bottom-3 -right-3 w-4 h-4 border-b border-r border-primary/50" />
                  <Zap className="w-10 h-10 text-primary mb-2 opacity-80" />
                  <div className="w-12 h-1 bg-primary/20 mt-2 mb-1 overflow-hidden relative rounded-full">
                     <div className="absolute top-0 left-0 h-full bg-primary w-2/3 shadow-glow" />
                  </div>
                </div>

                {/* Module 2: CPU Load */}
                <div className="flex flex-col items-center justify-center border border-secondary/30 bg-[#12121a] relative group">
                   <div className="absolute top-2 left-2 w-2 h-2 bg-secondary/50" />
                   <div className="absolute bottom-2 right-2 w-2 h-2 border border-secondary/50" />
                   
                   <div className="text-4xl md:text-5xl font-bold text-secondary font-heading tracking-tighter shadow-secondary drop-shadow-[0_0_10px_rgba(255,0,255,0.6)]">
                     98%
                   </div>
                   <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mt-1">
                     CPU_LOAD
                   </div>
                </div>

                {/* Module 3: Network (Spans 2 cols) */}
                <div className="col-span-2 flex items-center justify-between p-5 border border-accent-tertiary/40 bg-[#12121a] relative mt-2 cyber-chamfer-sm">
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-accent-tertiary" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-accent-tertiary" />
                  
                  <div className="flex items-center gap-4">
                    <div className="p-2 border border-accent-tertiary/50 bg-accent-tertiary/10">
                      <div className="w-6 h-6 rounded-full border border-accent-tertiary flex items-center justify-center relative">
                        <div className="w-4 h-[1px] bg-accent-tertiary absolute shadow-[0_0_5px_rgba(0,255,255,1)]" />
                        <div className="h-4 w-[1px] bg-accent-tertiary absolute shadow-[0_0_5px_rgba(0,255,255,1)]" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                       <span className="text-[11px] font-mono text-accent-tertiary uppercase">Global_Sync</span>
                       <span className="text-[9px] font-mono text-muted-foreground uppercase">Active_Nodes: 402</span>
                    </div>
                  </div>

                  <div className="flex-1 mx-8 h-[1px] border-b border-dashed border-accent-tertiary/30 relative hidden sm:block">
                     <div className="absolute top-0 left-0 w-[40px] h-full bg-accent-tertiary shadow-[0_0_8px_rgba(0,255,255,0.8)] skeleton" style={{ animation: 'scanline 2s linear infinite' }} />
                  </div>

                  <div className="text-[10px] font-mono text-primary flex items-center gap-2">
                     <span className="w-2 h-2 bg-primary rounded-full animate-blink flex-shrink-0" />
                     PING: 14MS
                  </div>
                </div>
              </div>
           </div>
        </div>
      </main>

      {/* Editor Preview (Try Demo) */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <div 
          className="relative rounded-xl border border-primary/20 overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.1)] cursor-pointer group cyber-chamfer bg-[#12121a]"
          onClick={onEnterEditor}
        >
          {/* Mock editor preview */}
          <div className="bg-[#0a0a0f] h-10 flex items-center px-4 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-destructive bg-destructive/20" />
              <div className="w-3 h-3 border border-warning bg-warning/20" />
              <div className="w-3 h-3 border border-success bg-success/20" />
            </div>
            <div className="flex-1 text-center text-xs font-mono text-muted-foreground uppercase">
              collaborative-editor_v2.0 — CodeTogether
            </div>
          </div>
          
          <div className="p-8 font-mono text-sm leading-relaxed h-80 overflow-hidden relative">
            <div className="absolute inset-0 bg-circuit opacity-10 pointer-events-none" />
            <div className="flex gap-8 relative z-10">
              {/* Line numbers */}
              <div className="text-primary/30 text-right select-none">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              
              {/* Code */}
              <div className="flex-1">
                <div><span className="text-secondary">import</span> <span className="text-foreground">React</span> <span className="text-secondary">from</span> <span className="text-accent-tertiary">'react'</span>;</div>
                <div><span className="text-secondary">import</span> {'{'} <span className="text-foreground">useState</span>, <span className="text-foreground">useEffect</span> {'}'} <span className="text-secondary">from</span> <span className="text-accent-tertiary">'react'</span>;</div>
                <div></div>
                <div><span className="text-secondary">interface</span> <span className="text-accent-tertiary">CollaboratorProps</span> {'{'}</div>
                <div>  <span className="text-foreground">name</span>: <span className="text-accent-tertiary">string</span>;</div>
                <div>  <span className="text-foreground">cursor</span>: {'{'} <span className="text-foreground">line</span>: <span className="text-accent-tertiary">number</span>; <span className="text-foreground">col</span>: <span className="text-accent-tertiary">number</span> {'}'};</div>
                <div>{'}'}</div>
                <div></div>
                <div><span className="text-secondary">export const</span> <span className="text-primary">Collaborator</span> = ({'{'} <span className="text-foreground">name</span>, <span className="text-foreground">cursor</span> {'}'}) {'=> {'}</div>
                <div>  <span className="text-secondary">const</span> [<span className="text-foreground">isActive</span>, <span className="text-primary">setIsActive</span>] = <span className="text-primary">useState</span>(<span className="text-secondary">true</span>);</div>
                <div></div>
                <div>  <span className="text-primary">useEffect</span>(() {'=> {'}</div>
                <div>    <span className="text-muted-foreground text-xs uppercase">// Track connection pulse</span></div>
                <div>    <span className="text-secondary">const</span> <span className="text-foreground">timer</span> = <span className="text-primary">setInterval</span>(() {'=> {'}</div>
                <div>      <span className="text-primary">setIsActive</span>(<span className="text-foreground">prev</span> {'=> !'}<span className="text-foreground">prev</span>);</div>
                <div>    {'}'}, <span className="text-accent-tertiary">3000</span>);</div>
              </div>
            </div>
            
            {/* Simulated cursor */}
            <div className="absolute top-[180px] left-[380px] z-20">
               <div className="px-1.5 py-0.5 text-[10px] font-mono font-medium whitespace-nowrap bg-secondary text-secondary-foreground border border-secondary shadow-[0_0_10px_rgba(255,0,255,0.5)]">
                 Alice_Node
               </div>
               <div className="w-0.5 h-5 bg-secondary animate-blink shadow-[0_0_8px_rgba(255,0,255,0.8)] mt-1" />
            </div>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm z-30">
            <div className="border border-primary px-8 py-4 bg-primary/10 flex items-center gap-3">
              <Play className="w-5 h-5 text-primary" />
              <span className="font-mono font-bold text-primary tracking-widest uppercase">INIT_DEMO_ENV</span>
            </div>
          </div>
        </div>
      </section>
      {/* Precision Engineering Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-32 bg-circuit my-16 border-y border-border/50">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold font-heading uppercase mb-6 text-foreground tracking-widest">
            Precision Engineering
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for teams that demand zero friction and maximum throughput. Our infrastructure scales as fast as your ideas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Real-time Sync Engine (Col Span 2) */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-[#1e232d]/80 border border-white/5 p-8 flex flex-col group">
            <div className="flex items-start justify-between z-10">
              <div className="max-w-md">
                <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Real-time Sync Engine</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Our proprietary protocol ensures every keystroke is propagated globally in under 50ms. No conflicts, just seamless flow.
                </p>
              </div>
              <div className="w-10 h-10 flex items-center justify-center text-slate-600">
                <Zap className="w-full h-full fill-slate-700/50" />
              </div>
            </div>
            
            {/* Visual Decorative Element for Sync */}
            <div className="mt-8 flex-1 relative rounded-xl overflow-hidden bg-black/40 min-h-[180px] border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1e232d]/80 via-transparent to-[#1e232d]/80 z-10 pointer-events-none" />
              {/* Circuit board lines simulation */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[20%] w-64 h-64 bg-[#111318] rotate-45 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-sm">
                 <div className="absolute inset-2 border border-white/5 rounded-sm" />
                 <div className="absolute inset-4 border border-white/5 rounded-sm bg-[#1a1d24]" />
              </div>
            </div>
          </div>

          {/* Card 2: AI Pair Programmer (Col Span 1) */}
          <div className="col-span-1 rounded-2xl bg-[#1e232d]/80 border border-white/5 p-8 flex flex-col hover:bg-[#232936] transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white tracking-tight mt-auto">AI Pair Programmer</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              Context-aware suggestions that understand your entire codebase, not just the file you're in.
            </p>
          </div>

          {/* Card 3: Secure Rooms (Col Span 1) */}
          <div className="col-span-1 rounded-2xl bg-[#1e232d]/80 border border-white/5 p-8 flex flex-col hover:bg-[#232936] transition-colors">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center mb-6 text-teal-400">
              <Lock className="w-5 h-5 fill-teal-500/20" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white tracking-tight mt-auto">Secure Rooms</h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              E2E encryption for all collaborative sessions. Your source code remains yours alone.
            </p>
          </div>

          {/* Card 4: Integrated Studio Chat (Col Span 2) */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-[#1e232d]/80 border border-white/5 p-8 flex flex-col md:flex-row items-center gap-8 group">
            {/* 3D Sphere Visual Placeholder */}
            <div className="w-full md:w-[220px] h-[220px] shrink-0 relative flex items-center justify-center bg-black/40 rounded-xl border border-white/5 overflow-hidden">
              <div className="absolute inset-0 bg-teal-500/5 saturate-150 blur-xl mix-blend-screen pointer-events-none" />
              {/* Globe illusion */}
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border border-teal-500/30 shadow-[0_0_40px_rgba(20,184,166,0.1)]" />
                <div className="absolute inset-0 border border-teal-500/20 rounded-full rotate-45 scale-y-50 shadow-[0_0_20px_rgba(20,184,166,0.2)]" />
                <div className="absolute inset-0 border border-teal-500/20 rounded-full -rotate-45 scale-y-50 shadow-[0_0_20px_rgba(20,184,166,0.2)]" />
                <div className="absolute inset-0 border border-teal-500/20 rounded-full scale-x-50 shadow-[0_0_20px_rgba(20,184,166,0.2)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-teal-400/50 shadow-[0_0_10px_1px_rgba(45,212,191,0.5)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-32 bg-teal-400/50 shadow-[0_0_10px_1px_rgba(45,212,191,0.5)]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_15px_5px_rgba(255,255,255,0.8)]" />
              </div>
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 L100 0 M0 0 L100 100" stroke="teal" strokeWidth="0.5" />
              </svg>
            </div>
            <div className="w-full flex-1 flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">Integrated Studio Chat</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Don't switch tabs. Discuss logic, share snippets, and review PRs directly within the environment.
              </p>
            </div>
          </div>

        </div>
        
        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 pt-12 border-t border-white/5 relative">
          
          {/* Decorative quotes graphic left */}
          <div className="absolute left-0 top-8 text-6xl text-slate-800/30 font-serif leading-none select-none -translate-x-4">"</div>
          
          <div className="rounded-2xl bg-[#1e232d]/40 border border-white/5 p-8 relative flex flex-col">
            <p className="text-[15px] italic text-slate-300 mb-8 leading-relaxed flex-1">
              "CodeCollab has completely transformed our remote pair programming sessions. The latency is practically invisible."
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <img src="https://i.pravatar.cc/100?img=47" alt="Sarah Chen" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">Sarah Chen</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Senior Dev, Vercel</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#1e232d]/40 border border-white/5 p-8 relative flex flex-col">
            <p className="text-[15px] italic text-slate-300 mb-8 leading-relaxed flex-1">
              "The UI is a work of art. It's the first collaborative tool that actually feels like it was built for professional developers."
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <img src="https://i.pravatar.cc/100?img=11" alt="Marcus Thorne" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 shadow-sm" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight">Marcus Thorne</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Lead Architect, Linear</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border">
          <h2 className="text-3xl font-bold mb-4">Ready to collaborate?</h2>
          <p className="text-muted-foreground mb-8">
            Start coding with your team in real-time. No setup required.
          </p>
          <button onClick={onSignIn} className="border border-primary text-primary px-8 py-3 uppercase hover:bg-primary/10 transition-colors flex items-center gap-2 mx-auto shadow-[0_0_15px_rgba(0,255,136,0.2)]">
            Get Started Free
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Code className="w-4 h-4" />
            <span>Code_Together — Built for elite developers</span>
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

export default Index;
