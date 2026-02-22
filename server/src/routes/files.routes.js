import express from "express";
import mongoose from "mongoose";
import File from "../models/File.js";
import Project from "../models/Project.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { serializeFile } from "../utils/serializers.js";

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

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/:projectId/files", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const files = await File.find({ project: projectId }).sort({ path: 1 }).lean();

    return res.json(files.map(serializeFile));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load files" });
  }
});

router.post("/:projectId/files", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    const name = String(req.body?.name || "").trim();
    const path = String(req.body?.path || "").trim();
    const type = String(req.body?.type || "").trim();

    if (!name || !path || !type) {
      return res.status(400).json({ message: "name, path, and type are required" });
    }

    if (!["file", "folder"].includes(type)) {
      return res.status(400).json({ message: "type must be either file or folder" });
    }

    const file = await File.create({
      project: projectId,
      name,
      path,
      type,
      content: req.body?.content ?? null,
      language: req.body?.language ?? null,
      parentPath: req.body?.parent_path ?? null,
    });

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    return res.status(201).json(serializeFile(file));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A file or folder already exists at this path" });
    }

    return res.status(500).json({ message: "Failed to create file" });
  }
});

router.patch("/:projectId/files/:fileId", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const updates = {};

    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body?.path !== undefined) updates.path = String(req.body.path).trim();
    if (req.body?.type !== undefined) updates.type = String(req.body.type).trim();
    if (req.body?.content !== undefined) updates.content = req.body.content;
    if (req.body?.language !== undefined) updates.language = req.body.language;
    if (req.body?.parent_path !== undefined) updates.parentPath = req.body.parent_path;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const file = await File.findOneAndUpdate(
      { _id: fileId, project: projectId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    return res.json(serializeFile(file));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A file or folder already exists at this path" });
    }

    return res.status(500).json({ message: "Failed to update file" });
  }
});

router.delete("/:projectId/files/:fileId", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await File.findOne({ _id: fileId, project: projectId }).lean();

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const pathRegex = new RegExp(`^${escapeRegex(file.path)}(?:/|$)`);

    const deleteResult = await File.deleteMany({
      project: projectId,
      path: { $regex: pathRegex },
    });

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    return res.json({ success: true, deletedCount: deleteResult.deletedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete file" });
  }
});

export default router;
