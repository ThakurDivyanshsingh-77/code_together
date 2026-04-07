import { useState, useEffect, useCallback, useMemo } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage } from "@/types/editor";
import { ChatMessageRow, resolveCurrentChatUser, toChatMessage } from "@/lib/chat";
import { useAblyChat } from "@/lib/ably";

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

    // Polling as fallback if Ably is not available
    const interval = window.setInterval(() => {
      fetchMessages(true);
    }, 5000); // Reduced polling frequency since we have Ably

    return () => window.clearInterval(interval);
  }, [projectId, fetchMessages]);

  // Ably real-time message handler
  const handleAblyMessage = useCallback((message: any) => {
    const mappedMessage = toChatMessage(message, currentChatUser);
    setMessages((prev) => {
      if (prev.some((m) => m.id === mappedMessage.id)) return prev;
      return [...prev, mappedMessage];
    });
  }, [currentChatUser]);

  // Ably real-time reaction handler
  const handleAblyReaction = useCallback((data: { messageId: string; reactions: Record<string, string[]> }) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === data.messageId) {
          return { ...msg, reactions: data.reactions };
        }
        return msg;
      })
    );
  }, []);

  // Subscribe to Ably channel
  useAblyChat(projectId || undefined, handleAblyMessage, handleAblyReaction);

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

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentChatUser.id || !projectId) return;

      try {
        const response = await apiRequest<{ messageId: string; reactions: Record<string, string[]> }>(
          `/projects/${projectId}/chat/${messageId}/reaction`,
          {
            method: "POST",
            body: { emoji },
          }
        );

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              return { ...msg, reactions: response.reactions || {} };
            }
            return msg;
          })
        );
      } catch (error) {
        console.error("Failed to toggle reaction:", error);
      }
    },
    [currentChatUser.id, projectId]
  );

  return { messages, loading, sendMessage, toggleReaction };
};
