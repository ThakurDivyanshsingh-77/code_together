import express from "express";
import Presence from "../models/Presence.js";
import User from "../models/User.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { serializePresence } from "../utils/serializers.js";

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

router.get("/:projectId/presence", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const presenceRows = await Presence.find({ project: projectId, isOnline: true }).lean();
    const userIds = [...new Set(presenceRows.map((row) => row.user.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select("displayName avatarUrl color")
      .lean();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    return res.json(
      presenceRows.map((row) => serializePresence(row, userMap.get(row.user.toString())))
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to load presence data" });
  }
});

router.put("/:projectId/presence", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const updates = {
      lastSeen: new Date(),
    };

    if (req.body?.is_online !== undefined) updates.isOnline = Boolean(req.body.is_online);
    if (req.body?.file_path !== undefined) updates.filePath = req.body.file_path || null;
    if (req.body?.cursor_line !== undefined) updates.cursorLine = req.body.cursor_line ?? null;
    if (req.body?.cursor_column !== undefined) updates.cursorColumn = req.body.cursor_column ?? null;

    const presence = await Presence.findOneAndUpdate(
      {
        project: projectId,
        user: req.auth.userId,
      },
      {
        $set: updates,
        $setOnInsert: {
          project: projectId,
          user: req.auth.userId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).lean();

    return res.json(serializePresence(presence, req.auth.user));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update presence" });
  }
});

export default router;
