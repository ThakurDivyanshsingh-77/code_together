import React, { useState } from 'react';

import { 
  FolderOpen, 
  Plus, 
  Clock, 
  Users, 
  MoreVertical,
  Trash2,
  LogOut,
  Loader2,
  UserPlus,
  Pencil
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog';
import { ManageCollaboratorsDialog } from './ManageCollaboratorsDialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from '@/lib/time';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject }) => {
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const { user, profile, signOut } = useAuth();
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditProject = (project: { id: string; name: string; description: string | null }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject({ id: project.id, name: project.name, description: project.description || '' });
    setEditDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!editingProject || !editingProject.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setIsSaving(true);
    const { error } = await updateProject(editingProject.id, {
      name: editingProject.name.trim(),
      description: editingProject.description.trim() || null,
    });
    setIsSaving(false);
    if (error) {
      toast.error('Failed to update project');
    } else {
      toast.success('Project updated');
      setEditDialogOpen(false);
      setEditingProject(null);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);
    const { data, error } = await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
    setIsCreating(false);

    if (error) {
      toast.error('Failed to create project');
      return;
    }

    toast.success('Project created!');
    setNewProjectName('');
    setNewProjectDesc('');
    setDialogOpen(false);
    
    if (data) {
      onSelectProject(data.id);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }

    const { error } = await deleteProject(projectId);
    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <FolderOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold gradient-text">Your Projects</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: `hsl(var(--user-${profile?.color || 1}))` }}
            >
              {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {profile?.display_name}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Projects</h1>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Project Name
                  </label>
                  <Input
                    placeholder="My Awesome Project"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Description (optional)
                  </label>
                  <Input
                    placeholder="A brief description..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateProject} 
                  className="w-full gap-2"
                  disabled={isCreating}
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first project to start coding collaboratively
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="group p-6 bg-card border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Owner
                      </span>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {project.owner_id === user?.id && (
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleEditProject(project, e as any); }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename / Edit
                        </DropdownMenuItem>
                      )}
                      <ManageCollaboratorsDialog
                        projectId={project.id}
                        projectOwnerId={project.owner_id}
                        trigger={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Users className="w-4 h-4 mr-2" />
                            Manage Collaborators
                          </DropdownMenuItem>
                        }
                      />
                      {project.owner_id === user?.id && (
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => handleDeleteProject(project.id, e as any)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Project Name</label>
              <Input
                value={editingProject?.name || ''}
                onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Description (optional)</label>
              <Input
                value={editingProject?.description || ''}
                onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>
            <Button onClick={handleSaveProject} className="w-full gap-2" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
