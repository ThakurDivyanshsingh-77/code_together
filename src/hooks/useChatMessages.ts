import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessageRow {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  type: string;
  created_at: string;
  user_name: string;
  user_color: number;
}

interface ChatMessageWithProfile {
  id: string;
  userId: string;
  userName: string;
  userColor: number;
  content: string;
  timestamp: Date;
  type: "text" | "code";
}

const toMessageWithProfile = (row: ChatMessageRow): ChatMessageWithProfile => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name || "Unknown",
  userColor: row.user_color || 1,
  content: row.content,
  timestamp: new Date(row.created_at),
  type: (row.type as "text" | "code") || "text",
});

export const useChatMessages = (projectId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(
    async (silent: boolean = false) => {
      if (!projectId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        const data = await apiRequest<ChatMessageRow[]>(`/projects/${projectId}/chat`);
        setMessages((data || []).map(toMessageWithProfile));
      } catch (error) {
        if (!silent) {
          console.error("Failed to load chat messages:", error);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!projectId) return;

    const interval = window.setInterval(() => {
      fetchMessages(true);
    }, 2000);

    return () => window.clearInterval(interval);
  }, [projectId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !projectId) return;

      try {
        const newMessage = await apiRequest<ChatMessageRow>(`/projects/${projectId}/chat`, {
          method: "POST",
          body: { content, type: "text" },
        });

        setMessages((prev) => {
          const mappedMessage = toMessageWithProfile(newMessage);
          if (prev.some((message) => message.id === mappedMessage.id)) return prev;
          return [...prev, mappedMessage];
        });
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [projectId, user]
  );

  return { messages, loading, sendMessage };
};
