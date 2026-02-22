import express from "express";
import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { serializeChatMessage } from "../utils/serializers.js";

const router = express.Router();

const ensureProjectAccess = async (userId, projectId) => {
  const access = await getProjectAccess(userId, projectId);

  if (!access.exists) {
    return { status: 404, message: "Project not found" };
  }

  if (!access.hasAccess) {
    return { status: 403, message: "You do not have access to this project" };
  }

  return { status: 200 };
};

router.get("/:projectId/chat", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const limitParam = Number(req.query.limit || 200);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 200;

    const messages = await ChatMessage.find({ project: projectId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    const userIds = [...new Set(messages.map((message) => message.user.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("displayName color")
      .lean();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    return res.json(messages.map((message) => serializeChatMessage(message, userMap.get(message.user.toString()))));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load chat messages" });
  }
});

router.post("/:projectId/chat", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const content = String(req.body?.content || "").trim();
    const type = String(req.body?.type || "text").trim();

    if (!content) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await ChatMessage.create({
      project: projectId,
      user: req.auth.userId,
      content,
      type,
    });

    return res.status(201).json(
      serializeChatMessage(message, {
        displayName: req.auth.user.displayName,
        color: req.auth.user.color,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to send chat message" });
  }
});

export default router;
