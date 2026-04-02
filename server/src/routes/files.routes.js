import express from "express";
import mongoose from "mongoose";
import File from "../models/File.js";
import FileVersion from "../models/FileVersion.js";
import Project from "../models/Project.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { createFileVersionSnapshot } from "../utils/fileVersioning.js";
import { serializeFile, serializeFileVersion } from "../utils/serializers.js";

const router = express.Router();
const LOCK_TTL_DEFAULT_SECONDS = 60;
const LOCK_TTL_MIN_SECONDS = 15;
const LOCK_TTL_MAX_SECONDS = 300;

const ensureProjectAccess = async (userId, projectId) => {
  const access = await getProjectAccess(userId, projectId);

  if (!access.exists) {
    return { status: 404, message: "Project not found" };
  }

  if (!access.hasAccess) {
    return { status: 403, message: "You do not have access to this project" };
  }

  return { status: 200, access };
};

const ensureProjectEditAccess = async (userId, projectId) => {
  const result = await ensureProjectAccess(userId, projectId);

  if (result.status !== 200) {
    return result;
  }

  if (!result.access?.canEdit) {
    return { status: 403, message: "Only editors can modify project files" };
  }

  return result;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nowMs = () => Date.now();
const normalizeParentPath = (value) => {
  const trimmed = String(value || "").trim().replace(/\\/g, "/");
  if (!trimmed || trimmed === "/") {
    return null;
  }

  return trimmed.replace(/\/+/g, "/").replace(/\/$/, "");
};

const normalizeFilePath = (value) => {
  const trimmed = String(value || "").trim().replace(/\\/g, "/");
  if (!trimmed) {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/$/, "") : collapsed;
};

const joinFilePath = (parentPath, name) =>
  parentPath ? `${normalizeParentPath(parentPath)}/${String(name).trim()}` : `/${String(name).trim()}`;

const replacePathPrefix = (value, currentPrefix, nextPrefix) => {
  if (value === currentPrefix) {
    return nextPrefix;
  }

  if (value.startsWith(`${currentPrefix}/`)) {
    return `${nextPrefix}${value.slice(currentPrefix.length)}`;
  }

  return value;
};

const normalizeLockTtlSeconds = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return LOCK_TTL_DEFAULT_SECONDS;
  }

  return Math.min(LOCK_TTL_MAX_SECONDS, Math.max(LOCK_TTL_MIN_SECONDS, Math.floor(parsed)));
};

const isFileLockActive = (file) => {
  if (!file?.lockOwner || !file?.lockExpiresAt) {
    return false;
  }

  const expiresAtMs = new Date(file.lockExpiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs();
};

const clearFileLock = (file) => {
  file.lockOwner = null;
  file.lockOwnerName = null;
  file.lockExpiresAt = null;
};

const clearExpiredLocksForProject = async (projectId) => {
  await File.updateMany(
    {
      project: projectId,
      lockExpiresAt: { $ne: null, $lte: new Date() },
    },
    {
      $set: {
        lockOwner: null,
        lockOwnerName: null,
        lockExpiresAt: null,
      },
    }
  );
};

const clearFileLockIfExpired = async (file) => {
  if (!file?.lockExpiresAt) {
    return false;
  }

  if (new Date(file.lockExpiresAt).getTime() > nowMs()) {
    return false;
  }

  clearFileLock(file);
  await file.save();
  return true;
};

const serializeActiveLock = (file) => {
  if (!isFileLockActive(file)) {
    return null;
  }

  return {
    user_id: file.lockOwner.toString(),
    user_name: file.lockOwnerName || null,
    expires_at: new Date(file.lockExpiresAt).toISOString(),
  };
};

const lockConflictResponse = (res, file) =>
  res.status(423).json({
    message: `File is locked by ${file.lockOwnerName || "another collaborator"}`,
    code: "FILE_LOCKED",
    lock: serializeActiveLock(file),
  });

const emitProjectFileEvent = (req, projectId, type, payload = {}) => {
  const collaboration = req.app.get("collaboration");
  collaboration?.emitProjectEvent?.(projectId, "project-file-event", {
    type,
    project_id: projectId,
    ...payload,
  });
};

router.get("/:projectId/files", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    await clearExpiredLocksForProject(projectId);

    const files = await File.find({ project: projectId }).sort({ path: 1 }).lean();

    return res.json(files.map(serializeFile));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load files" });
  }
});

router.post("/:projectId/files", async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await ensureProjectEditAccess(req.auth.userId, projectId);

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
      revision: type === "file" ? 1 : 0,
      parentPath: req.body?.parent_path ?? null,
    });

    if (type === "file") {
      await createFileVersionSnapshot({
        file,
        userId: req.auth.userId,
        userName: req.auth.user.displayName || req.auth.user.email || "Unknown",
        source: "system",
      });
    }

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });
    emitProjectFileEvent(req, projectId, "file-created", { file: serializeFile(file) });

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
    const access = await ensureProjectEditAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const updates = {};

    if (req.body?.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body?.path !== undefined) updates.path = normalizeFilePath(req.body.path);
    if (req.body?.type !== undefined) updates.type = String(req.body.type).trim();
    if (req.body?.content !== undefined) updates.content = req.body.content;
    if (req.body?.language !== undefined) updates.language = req.body.language;
    if (req.body?.parent_path !== undefined) updates.parentPath = normalizeParentPath(req.body.parent_path);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    if (updates.type && !["file", "folder"].includes(updates.type)) {
      return res.status(400).json({ message: "type must be either file or folder" });
    }

    const file = await File.findOne({ _id: fileId, project: projectId });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await clearFileLockIfExpired(file);

    const lockActive = isFileLockActive(file);
    const isLockOwner = lockActive && file.lockOwner.toString() === req.auth.userId;
    const hasContentUpdate = Object.prototype.hasOwnProperty.call(updates, "content");
    const hasNameUpdate = Object.prototype.hasOwnProperty.call(updates, "name");
    const hasPathUpdate = Object.prototype.hasOwnProperty.call(updates, "path");
    const hasParentPathUpdate = Object.prototype.hasOwnProperty.call(updates, "parentPath");

    const currentParentPath = file.parentPath || null;
    const nextName = hasNameUpdate ? updates.name : file.name;
    const nextParentPath = hasParentPathUpdate ? updates.parentPath : currentParentPath;
    const nextPath = hasPathUpdate
      ? normalizeFilePath(updates.path)
      : hasNameUpdate || hasParentPathUpdate
        ? normalizeFilePath(joinFilePath(nextParentPath, nextName))
        : file.path;

    if (lockActive && !isLockOwner) {
      return lockConflictResponse(res, file);
    }

    if (hasContentUpdate && file.type !== "file") {
      return res.status(400).json({ message: "Only files can store editable content" });
    }

    if (
      hasContentUpdate &&
      req.body?.base_revision !== undefined &&
      Number(req.body.base_revision) !== Number(file.revision || 0)
    ) {
      return res.status(409).json({
        message: "This file has been updated by another user. Refresh to load the latest version.",
        code: "REVISION_CONFLICT",
        file: serializeFile(file),
      });
    }

    if ((hasNameUpdate || hasPathUpdate || hasParentPathUpdate) && !nextName) {
      return res.status(400).json({ message: "name is required" });
    }

    if ((hasNameUpdate || hasPathUpdate || hasParentPathUpdate) && nextPath === "/") {
      return res.status(400).json({ message: "Invalid file path" });
    }

    if ((hasNameUpdate || hasPathUpdate || hasParentPathUpdate) && nextParentPath) {
      const parentFolder = await File.findOne({
        project: projectId,
        path: nextParentPath,
        type: "folder",
      }).lean();

      if (!parentFolder) {
        return res.status(400).json({ message: "Target folder does not exist" });
      }
    }

    if (
      file.type === "folder" &&
      nextPath !== file.path &&
      (nextPath === file.path || nextPath.startsWith(`${file.path}/`))
    ) {
      return res.status(400).json({ message: "Cannot move a folder into itself" });
    }

    if (nextPath !== file.path) {
      const subtreeRegex = new RegExp(`^${escapeRegex(file.path)}(?:/|$)`);
      const subtree = file.type === "folder"
        ? await File.find({ project: projectId, path: { $regex: subtreeRegex } }).lean()
        : [file.toObject()];
      const subtreeIds = subtree.map((entry) => entry._id);
      const targetPaths = subtree.map((entry) => replacePathPrefix(entry.path, file.path, nextPath));

      const conflictingNode = await File.findOne({
        project: projectId,
        _id: { $nin: subtreeIds },
        path: { $in: targetPaths },
      }).lean();

      if (conflictingNode) {
        return res.status(409).json({
          message: "A file or folder already exists at the target path",
        });
      }

      const lockedDescendant = await File.findOne({
        project: projectId,
        path: { $regex: subtreeRegex },
        lockExpiresAt: { $gt: new Date() },
        lockOwner: { $ne: req.auth.userId },
      }).lean();

      if (lockedDescendant) {
        return res.status(423).json({
          message: `Cannot move because ${lockedDescendant.lockOwnerName || "another collaborator"} currently holds a file lock`,
          code: "FILE_LOCKED",
        });
      }

      updates.path = nextPath;
      updates.name = nextName;
      updates.parentPath = nextParentPath;

      const previousPath = file.path;
      Object.assign(file, updates);
      await file.save();

      if (file.type === "folder") {
        const descendants = subtree.filter((entry) => entry._id.toString() !== file._id.toString());

        if (descendants.length > 0) {
          await File.bulkWrite(
            descendants.map((entry) => ({
              updateOne: {
                filter: { _id: entry._id },
                update: {
                  $set: {
                    path: replacePathPrefix(entry.path, previousPath, nextPath),
                    parentPath: entry.parentPath
                      ? replacePathPrefix(entry.parentPath, previousPath, nextPath)
                      : null,
                    updatedAt: new Date(),
                  },
                },
              },
            }))
          );
        }
      }

      await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

      return res.json(serializeFile(file));
    }

    const contentChanged = hasContentUpdate && updates.content !== file.content;
    Object.assign(file, updates);

    if (contentChanged) {
      file.revision = Number(file.revision || 0) + 1;
    }

    await file.save();

    if (contentChanged) {
      await createFileVersionSnapshot({
        file,
        userId: req.auth.userId,
        userName: req.auth.user.displayName || req.auth.user.email || "Unknown",
        source: "manual",
      });
    }

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });
    emitProjectFileEvent(req, projectId, "file-updated", { file: serializeFile(file) });

    return res.json(serializeFile(file));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A file or folder already exists at this path" });
    }

    return res.status(500).json({ message: "Failed to update file" });
  }
});

router.post("/:projectId/files/:fileId/lock", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectEditAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await File.findOne({ _id: fileId, project: projectId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await clearFileLockIfExpired(file);

    const lockActive = isFileLockActive(file);
    if (lockActive && file.lockOwner.toString() !== req.auth.userId) {
      return lockConflictResponse(res, file);
    }

    const ttlSeconds = normalizeLockTtlSeconds(req.body?.ttl_seconds);
    file.lockOwner = req.auth.userId;
    file.lockOwnerName = req.auth.user.displayName || req.auth.user.email || "Unknown";
    file.lockExpiresAt = new Date(nowMs() + ttlSeconds * 1000);
    await file.save();
    emitProjectFileEvent(req, projectId, "file-locked", { file: serializeFile(file) });

    return res.json({
      success: true,
      file: serializeFile(file),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to acquire file lock" });
  }
});

router.delete("/:projectId/files/:fileId/lock", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectEditAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await File.findOne({ _id: fileId, project: projectId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await clearFileLockIfExpired(file);

    if (!isFileLockActive(file)) {
      return res.json({
        success: true,
        released: false,
        file: serializeFile(file),
      });
    }

    if (file.lockOwner.toString() !== req.auth.userId) {
      return res.status(403).json({
        message: "Only the lock owner can release this lock",
      });
    }

    clearFileLock(file);
    await file.save();
    emitProjectFileEvent(req, projectId, "file-unlocked", { file: serializeFile(file) });

    return res.json({
      success: true,
      released: true,
      file: serializeFile(file),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to release file lock" });
  }
});

router.delete("/:projectId/files/:fileId", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectEditAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await File.findOne({ _id: fileId, project: projectId });

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await clearFileLockIfExpired(file);

    if (isFileLockActive(file) && file.lockOwner.toString() !== req.auth.userId) {
      return lockConflictResponse(res, file);
    }

    const pathRegex = new RegExp(`^${escapeRegex(file.path)}(?:/|$)`);
    const lockedChild = await File.findOne({
      project: projectId,
      path: { $regex: pathRegex },
      lockExpiresAt: { $gt: new Date() },
      lockOwner: { $ne: req.auth.userId },
    }).lean();

    if (lockedChild) {
      return res.status(423).json({
        message: `Cannot delete because ${lockedChild.lockOwnerName || "another collaborator"} currently holds a file lock`,
        code: "FILE_LOCKED",
      });
    }

    const deleteResult = await File.deleteMany({
      project: projectId,
      path: { $regex: pathRegex },
    });

    await FileVersion.deleteMany({
      project: projectId,
      path: { $regex: pathRegex },
    });

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });
    emitProjectFileEvent(req, projectId, "file-deleted", { file_id: fileId, path: file.path });

    return res.json({ success: true, deletedCount: deleteResult.deletedCount || 0 });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete file" });
  }
});

router.get("/:projectId/files/:fileId/history", async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const access = await ensureProjectAccess(req.auth.userId, projectId);

    if (access.status !== 200) {
      return res.status(access.status).json({ message: access.message });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(404).json({ message: "File not found" });
    }

    const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 20)));

    const file = await File.findOne({ _id: fileId, project: projectId }).lean();
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const versions = await FileVersion.find({ project: projectId, file: fileId })
      .sort({ revision: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      file: serializeFile(file),
      versions: versions.map(serializeFileVersion),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load file history" });
  }
});

export default router;
