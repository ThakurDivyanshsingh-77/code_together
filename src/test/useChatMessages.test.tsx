import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useChatMessages } from "@/hooks/useChatMessages";

const apiRequestMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

describe("useChatMessages", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    useAuthMock.mockReset();
  });

  it("maps the current user's persisted messages to the active profile identity", async () => {
    useAuthMock.mockReturnValue({
      user: null,
      profile: {
        id: "profile-1",
        user_id: "user-1",
        display_name: "Divya",
        avatar_url: null,
        color: 4,
      },
      loading: false,
    });

    apiRequestMock.mockResolvedValue([
      {
        id: "message-1",
        project_id: "project-1",
        user_id: "user-1",
        content: "hello",
        type: "text",
        created_at: "2026-03-31T10:00:00.000Z",
        user_name: "Someone Else",
        user_color: 2,
      },
    ]);

    const { result, unmount } = renderHook(() => useChatMessages("project-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]).toMatchObject({
      id: "message-1",
      userId: "user-1",
      userName: "Divya",
      userColor: 4,
      content: "hello",
      type: "text",
    });

    unmount();
  });
});
