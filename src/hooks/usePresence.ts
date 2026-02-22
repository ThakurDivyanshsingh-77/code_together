import { useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./useAuth";

interface UserPresence {
  id: string;
  user_id: string;
  project_id: string;
  file_path: string | null;
  cursor_line: number | null;
  cursor_column: number | null;
  is_online: boolean;
  last_seen: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    color: number;
  };
}

export const usePresence = (projectId: string | null) => {
  const { user } = useAuth();
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const updateTimeoutRef = useRef<number>();

  const fetchPresence = useCallback(
    async (silent: boolean = false) => {
      if (!projectId) {
        setPresence([]);
        setOnlineUsers([]);
        return;
      }

      try {
        const data = await apiRequest<UserPresence[]>(`/projects/${projectId}/presence`);
        setPresence(data || []);
      } catch (error) {
        if (!silent) {
          console.error("Failed to fetch presence:", error);
        }
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchPresence();
  }, [fetchPresence]);

  useEffect(() => {
    if (!projectId) return;

    const interval = window.setInterval(() => {
      fetchPresence(true);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [projectId, fetchPresence]);

  useEffect(() => {
    setOnlineUsers(presence.filter((p) => p.is_online && p.user_id !== user?.id));
  }, [presence, user?.id]);

  const joinProject = useCallback(async () => {
    if (!projectId || !user) return;

    try {
      await apiRequest(`/projects/${projectId}/presence`, {
        method: "PUT",
        body: {
          is_online: true,
        },
      });

      fetchPresence(true);
    } catch (error) {
      console.error("Failed to join project presence:", error);
    }
  }, [projectId, user, fetchPresence]);

  const leaveProject = useCallback(async () => {
    if (!projectId || !user) return;

    try {
      await apiRequest(`/projects/${projectId}/presence`, {
        method: "PUT",
        body: {
          is_online: false,
        },
      });

      setPresence((prev) => prev.filter((item) => item.user_id !== user.id));
    } catch (error) {
      console.error("Failed to leave project presence:", error);
    }
  }, [projectId, user]);

  const updateCursor = useCallback(
    (filePath: string, line: number, column: number) => {
      if (!projectId || !user) return;

      if (updateTimeoutRef.current) {
        window.clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = window.setTimeout(async () => {
        try {
          await apiRequest(`/projects/${projectId}/presence`, {
            method: "PUT",
            body: {
              file_path: filePath,
              cursor_line: line,
              cursor_column: column,
              is_online: true,
            },
          });
        } catch (error) {
          console.error("Failed to update cursor presence:", error);
        }
      }, 120);
    },
    [projectId, user]
  );

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    presence,
    onlineUsers,
    joinProject,
    leaveProject,
    updateCursor,
    refetch: fetchPresence,
  };
};
