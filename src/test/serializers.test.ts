// @vitest-environment node

import { describe, expect, it } from "vitest";
import User from "../../server/src/models/User.js";
import File from "../../server/src/models/File.js";
import { serializeFile, serializeProfile, serializeUser } from "../../server/src/utils/serializers.js";

describe("serializers", () => {
  it("serializes Mongoose documents backed by ObjectIds", () => {
    const objectId = File.db.base.Types.ObjectId;
    const user = new User({
      email: "tester@example.com",
      passwordHash: "hashed-password",
      displayName: "Tester",
      color: 2,
    });
    const projectId = new objectId();
    const file = new File({
      project: projectId,
      name: "index.ts",
      path: "/index.ts",
      type: "file",
      content: "console.log('hello')",
      language: "typescript",
      revision: 1,
      createdAt: new Date("2026-03-31T10:00:00.000Z"),
      updatedAt: new Date("2026-03-31T10:05:00.000Z"),
    });

    expect(serializeUser(user)).toMatchObject({
      id: user._id.toString(),
      email: "tester@example.com",
    });

    expect(serializeProfile(user)).toMatchObject({
      id: user._id.toString(),
      user_id: user._id.toString(),
      display_name: "Tester",
      color: 2,
    });

    expect(serializeFile(file)).toMatchObject({
      id: file._id.toString(),
      project_id: projectId.toString(),
      name: "index.ts",
      path: "/index.ts",
      revision: 1,
      language: "typescript",
      content: "console.log('hello')",
    });
  });
});
