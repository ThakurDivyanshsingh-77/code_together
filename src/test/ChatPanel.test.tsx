import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/editor/ChatPanel";

const useAuthMock = vi.fn();
const useChatMessagesMock = vi.fn();
const useEditorStoreMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/hooks/useChatMessages", () => ({
  useChatMessages: (projectId: string) => useChatMessagesMock(projectId),
}));

vi.mock("@/store/editorStore", () => ({
  useEditorStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      currentUser: {
        id: "demo-user",
        name: "Demo User",
        email: "demo@example.com",
        color: 1,
        isOnline: true,
      },
      collaborators: [
        {
          id: "collab-1",
          name: "Alice Chen",
          email: "alice@example.com",
          color: 2,
          isOnline: true,
        },
      ],
      messages: [],
      sendMessage: vi.fn(),
    };

    return selector ? selector(state) : state;
  },
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useChatMessagesMock.mockReset();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders persisted messages from the profile owner as own messages", () => {
    useAuthMock.mockReturnValue({
      user: null,
      profile: {
        id: "profile-1",
        user_id: "user-1",
        display_name: "Divya",
        avatar_url: null,
        color: 4,
      },
    });

    useChatMessagesMock.mockReturnValue({
      loading: false,
      sendMessage: vi.fn(),
      messages: [
        {
          id: "message-1",
          userId: "user-1",
          userName: "Alice Chen",
          userColor: 2,
          content: "This should stay mine",
          timestamp: new Date("2026-03-31T10:00:00.000Z"),
          type: "text",
        },
      ],
    });

    const { container } = render(<ChatPanel projectId="project-1" />);

    expect(screen.getByText("This should stay mine")).toBeInTheDocument();
    expect(screen.queryByText("Alice Chen")).not.toBeInTheDocument();
    expect(container.querySelector(".chat-message.own")).toBeTruthy();
  });
});
