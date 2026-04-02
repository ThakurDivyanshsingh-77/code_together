// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const chatMessageCreateMock = vi.fn();
const chatMessageFindMock = vi.fn();
const userFindMock = vi.fn();
const getProjectAccessMock = vi.fn();

vi.mock("../../server/src/models/ChatMessage.js", () => ({
  default: {
    create: chatMessageCreateMock,
    find: chatMessageFindMock,
  },
}));

vi.mock("../../server/src/models/User.js", () => ({
  default: {
    find: userFindMock,
  },
}));

vi.mock("../../server/src/utils/projectAccess.js", () => ({
  getProjectAccess: getProjectAccessMock,
}));

let postChatHandler: (req: Record<string, unknown>, res: ReturnType<typeof createResponse>) => Promise<unknown>;

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
  };

  return response;
};

beforeAll(async () => {
  const { default: chatRoutes } = await import("../../server/src/routes/chat.routes.js");
  postChatHandler = chatRoutes.stack.find(
    (layer: { route?: { path?: string; methods?: Record<string, boolean>; stack?: Array<{ handle: typeof postChatHandler }> } }) =>
      layer.route?.path === "/:projectId/chat" && layer.route?.methods?.post
  )?.route?.stack?.[0]?.handle as typeof postChatHandler;
});

describe("POST /:projectId/chat", () => {
  beforeEach(() => {
    chatMessageCreateMock.mockReset();
    chatMessageFindMock.mockReset();
    userFindMock.mockReset();
    getProjectAccessMock.mockReset();

    getProjectAccessMock.mockResolvedValue({
      exists: true,
      hasAccess: true,
    });
  });

  it.each([
    {
      userId: "user-a",
      displayName: "User A",
      color: 2,
    },
    {
      userId: "user-b",
      displayName: "User B",
      color: 5,
    },
  ])("returns the authenticated sender identity for $displayName", async ({ userId, displayName, color }) => {
    chatMessageCreateMock.mockImplementationOnce(async ({ project, user, content, type }) => ({
      _id: "message-1",
      project,
      user: {
        _id: user,
        toString: () => "[object Object]",
      },
      content,
      type,
      createdAt: new Date("2026-03-31T10:00:00.000Z"),
    }));

    const req = {
      params: { projectId: "project-1" },
      body: { content: "hello world", type: "text" },
      auth: {
        userId,
        user: {
          displayName,
          color,
        },
      },
    };
    const res = createResponse();

    await postChatHandler(req, res);

    expect(getProjectAccessMock).toHaveBeenCalledWith(userId, "project-1");
    expect(chatMessageCreateMock).toHaveBeenCalledWith({
      project: "project-1",
      user: userId,
      content: "hello world",
      type: "text",
    });
    expect(res.statusCode).toBe(201);
    expect(res.payload).toMatchObject({
      project_id: "project-1",
      user_id: userId,
      user_name: displayName,
      user_color: color,
      content: "hello world",
      type: "text",
    });
  });
});
