import { ChatMessage } from "@/types/editor";

export interface ChatMessageRow {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  type: string;
  created_at: string;
  user_name: string;
  user_color: number;
  reactions?: Record<string, string[]>;
}

export interface ChatCurrentUser {
  id: string;
  displayName: string;
  color: number;
}

export const normalizeChatId = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    if ("_id" in value) {
      return normalizeChatId((value as { _id?: unknown })._id);
    }

    if ("id" in value) {
      return normalizeChatId((value as { id?: unknown }).id);
    }
  }

  return String(value);
};

export const resolveCurrentChatUser = ({
  userId,
  profileUserId,
  displayName,
  color,
  fallbackDisplayName,
  fallbackColor,
}: {
  userId?: unknown;
  profileUserId?: unknown;
  displayName?: string | null;
  color?: number | null;
  fallbackDisplayName?: string | null;
  fallbackColor?: number | null;
}): ChatCurrentUser => ({
  id: normalizeChatId(userId || profileUserId),
  displayName: String(displayName || fallbackDisplayName || "").trim(),
  color:
    typeof color === "number"
      ? color
      : typeof fallbackColor === "number"
        ? fallbackColor
        : 1,
});

export const isOwnChatMessage = (messageUserId: unknown, currentUserId: unknown): boolean => {
  const normalizedMessageUserId = normalizeChatId(messageUserId);
  const normalizedCurrentUserId = normalizeChatId(currentUserId);

  return Boolean(normalizedMessageUserId && normalizedCurrentUserId && normalizedMessageUserId === normalizedCurrentUserId);
};

export const toChatMessage = (
  row: ChatMessageRow,
  currentUser?: Partial<ChatCurrentUser> | null
): ChatMessage => {
  const userId = normalizeChatId(row.user_id);
  const isOwn = isOwnChatMessage(userId, currentUser?.id);
  const normalizedDisplayName = String(currentUser?.displayName || "").trim();

  return {
    id: normalizeChatId(row.id),
    userId,
    userName: isOwn ? normalizedDisplayName || "You" : row.user_name || "Unknown",
    userColor:
      isOwn && typeof currentUser?.color === "number"
        ? currentUser.color
        : row.user_color || 1,
    content: row.content,
    timestamp: new Date(row.created_at),
    type: row.type === "code" ? "code" : "text",
    reactions: row.reactions || {},
  };
};
