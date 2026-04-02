import { useState, useEffect, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "@/types/editor";
import { ChatMessageRow, resolveCurrentChatUser, toChatMessage } from "@/lib/chat";

export type { ChatMessageRow } from "@/lib/chat";

export const useChatMessages = (projectId: string) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const currentChatUser = useMemo(
    () =>
      resolveCurrentChatUser({
        userId: user?.id,
        profileUserId: profile?.user_id,
        displayName: profile?.display_name,
        color: profile?.color,
      }),
    [profile?.color, profile?.display_name, profile?.user_id, user?.id]
  );

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
        setMessages((data || []).map((row) => toChatMessage(row, currentChatUser)));
      } catch (error) {
        if (!silent) {
          console.error("Failed to load chat messages:", error);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [currentChatUser, projectId]
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
      if (!currentChatUser.id || !projectId) return;

      try {
        const newMessage = await apiRequest<ChatMessageRow>(`/projects/${projectId}/chat`, {
          method: "POST",
          body: { content, type: "text" },
        });

        setMessages((prev) => {
          const mappedMessage = toChatMessage(newMessage, currentChatUser);
          if (prev.some((message) => message.id === mappedMessage.id)) return prev;
          return [...prev, mappedMessage];
        });
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    },
    [currentChatUser, projectId]
  );

  return { messages, loading, sendMessage };
};
