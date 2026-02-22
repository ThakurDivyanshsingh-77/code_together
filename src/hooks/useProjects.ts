import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./useAuth";

interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface CollaboratorApi {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  avatar_url: string | null;
  color: number;
}

interface Collaborator {
  user_id: string;
  role: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    color: number;
  };
}

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<Project[]>("/projects");
      setProjects(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (name: string, description?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    try {
      const data = await apiRequest<Project>("/projects", {
        method: "POST",
        body: { name, description: description || null },
      });

      setProjects((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateProject = async (
    projectId: string,
    updates: { name?: string; description?: string | null }
  ) => {
    try {
      const data = await apiRequest<Project>(`/projects/${projectId}`, {
        method: "PATCH",
        body: updates,
      });

      setProjects((prev) => prev.map((project) => (project.id === projectId ? data : project)));
      return { data, error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await apiRequest(`/projects/${projectId}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const getCollaborators = async (projectId: string): Promise<Collaborator[]> => {
    const collaborators = await apiRequest<CollaboratorApi[]>(`/projects/${projectId}/collaborators`);

    return collaborators.map((collaborator) => ({
      user_id: collaborator.user_id,
      role: collaborator.role,
      profile: {
        display_name: collaborator.display_name,
        avatar_url: collaborator.avatar_url,
        color: collaborator.color,
      },
    }));
  };

  const addCollaborator = async (projectId: string, email: string, role: string = "editor") => {
    try {
      await apiRequest(`/projects/${projectId}/collaborators`, {
        method: "POST",
        body: { email, role },
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getCollaborators,
    addCollaborator,
    refetch: fetchProjects,
  };
};
