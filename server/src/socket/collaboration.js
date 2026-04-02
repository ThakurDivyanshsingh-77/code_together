import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import File from "../models/File.js";
import Project from "../models/Project.js";
import Presence from "../models/Presence.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { createFileVersionSnapshot } from "../utils/fileVersioning.js";
import { serializeFile, serializePresence } from "../utils/serializers.js";

const AUTOSAVE_DELAY_MS = 2500;

const liveFileSessions = new Map();

const projectRoom = (projectId) => `project:${projectId}`;
const fileRoom = (projectId, fileId) => `file:${projectId}:${fileId}`;
const fileSessionKey = (projectId, fileId) => `${projectId}:${fileId}`;

const now = () => new Date();

const isFileLockActive = (file) => {
  if (!file?.lockOwner || !file?.lockExpiresAt) {
    return false;
  }

  return new Date(file.lockExpiresAt).getTime() > Date.now();
};

const resolveSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return String(authToken);
  }

  const authHeader = socket.handshake.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

const loadProjectPresence = async (projectId) => {
  const rows = await Presence.find({ project: projectId, isOnline: true }).lean();
  const userIds = [...new Set(rows.map((row) => row.user.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("displayName avatarUrl color")
    .lean();

  const userMap = new Map(users.map((user) => [user._id.toString(), user]));
  return rows.map((row) => serializePresence(row, userMap.get(row.user.toString())));
};

const normalizeAck = (ack) => (typeof ack === "function" ? ack : () => {});

const getOrCreateSession = (file) => {
  const key = fileSessionKey(file.project.toString(), file._id.toString());
  const existing = liveFileSessions.get(key);
  if (existing) {
    return existing;
  }

  const created = {
    key,
    projectId: file.project.toString(),
    fileId: file._id.toString(),
    filePath: file.path,
    content: file.content || "",
    language: file.language || null,
    liveRevision: Number(file.revision || 0),
    savedRevision: Number(file.revision || 0),
    dirty: false,
    saveTimer: null,
    lastUpdatedBy: null,
    lastUpdatedByName: null,
  };

  liveFileSessions.set(key, created);
  return created;
};

const scheduleAutosave = (session, flush) => {
  if (session.saveTimer) {
    clearTimeout(session.saveTimer);
  }

  session.saveTimer = setTimeout(() => {
    void flush(session.projectId, session.fileId);
  }, AUTOSAVE_DELAY_MS);
};

export const initializeCollaborationSocket = ({ server, app, corsOrigins }) => {
  const io = new Server(server, {
    cors: {
      origin: corsOrigins?.length ? corsOrigins : true,
      credentials: true,
    },
  });

  const emitProjectEvent = (projectId, event, payload) => {
    io.to(projectRoom(projectId)).emit(event, payload);
  };

  const emitPresenceSnapshot = async (projectId) => {
    const presence = await loadProjectPresence(projectId);
    emitProjectEvent(projectId, "presence-snapshot", presence);
  };

  const flushLiveSession = async (projectId, fileId) => {
    const key = fileSessionKey(projectId, fileId);
    const session = liveFileSessions.get(key);

    if (!session) {
      return null;
    }

    if (session.saveTimer) {
      clearTimeout(session.saveTimer);
      session.saveTimer = null;
    }

    if (!session.dirty) {
      return null;
    }

    const file = await File.findOne({ _id: fileId, project: projectId });
    if (!file) {
      liveFileSessions.delete(key);
      return null;
    }

    const nextRevision =
      session.liveRevision > Number(file.revision || 0)
        ? session.liveRevision
        : Number(file.revision || 0) + 1;

    file.content = session.content;
    file.language = session.language || file.language;
    file.revision = nextRevision;
    await file.save();
    await Project.findByIdAndUpdate(projectId, { updatedAt: now() });

    session.savedRevision = file.revision;
    session.liveRevision = file.revision;
    session.dirty = false;

    await createFileVersionSnapshot({
      file,
      userId: session.lastUpdatedBy,
      userName: session.lastUpdatedByName,
      source: "autosave",
    });

    const serializedFile = serializeFile(file);
    emitProjectEvent(projectId, "project-file-event", {
      type: "file-saved",
      project_id: projectId,
      file: serializedFile,
      saved_at: now().toISOString(),
    });

    io.to(fileRoom(projectId, fileId)).emit("file-state", {
      project_id: projectId,
      file_id: fileId,
      content: session.content,
      revision: file.revision,
      file: serializedFile,
    });

    return serializedFile;
  };

  io.use(async (socket, next) => {
    try {
      const token = resolveSocketToken(socket);
      if (!token) {
        return next(new Error("Authentication token is missing"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error("JWT_SECRET is not configured"));
      }

      const payload = jwt.verify(token, jwtSecret);
      const user = await User.findById(payload.userId).lean();
      if (!user) {
        return next(new Error("Invalid authentication token"));
      }

      socket.data.auth = {
        token,
        userId: user._id.toString(),
        user,
      };

      return next();
    } catch (error) {
      return next(new Error("Invalid or expired authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const { user, userId } = socket.data.auth;

    const upsertPresence = async ({
      projectId,
      isOnline = true,
      filePath = null,
      cursorLine = null,
      cursorColumn = null,
    }) => {
      await Presence.findOneAndUpdate(
        { project: projectId, user: userId },
        {
          $set: {
            isOnline,
            filePath,
            cursorLine,
            cursorColumn,
            lastSeen: now(),
          },
          $setOnInsert: {
            project: projectId,
            user: userId,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );
    };

    socket.on("join-file", async (payload, ack) => {
      const done = normalizeAck(ack);

      try {
        const projectId = String(payload?.projectId || "").trim();
        const fileId = String(payload?.fileId || "").trim();

        if (!projectId || !fileId) {
          return done({ ok: false, message: "projectId and fileId are required" });
        }

        const access = await getProjectAccess(userId, projectId);
        if (!access.exists) {
          return done({ ok: false, message: "Project not found" });
        }

        if (!access.hasAccess) {
          return done({ ok: false, message: "You do not have access to this project" });
        }

        const file = await File.findOne({ _id: fileId, project: projectId });
        if (!file) {
          return done({ ok: false, message: "File not found" });
        }

        if (socket.data.currentProjectId && socket.data.currentFileId) {
          socket.leave(fileRoom(socket.data.currentProjectId, socket.data.currentFileId));
        }

        socket.join(projectRoom(projectId));
        socket.join(fileRoom(projectId, fileId));
        socket.data.currentProjectId = projectId;
        socket.data.currentFileId = fileId;
        socket.data.currentFilePath = file.path;
        socket.data.currentRole = access.role;

        await upsertPresence({
          projectId,
          isOnline: true,
          filePath: file.path,
          cursorLine: null,
          cursorColumn: null,
        });

        const session = getOrCreateSession(file);
        await emitPresenceSnapshot(projectId);

        socket.to(projectRoom(projectId)).emit("user-joined", {
          project_id: projectId,
          file_id: fileId,
          file_path: file.path,
          user_id: userId,
          profile: {
            display_name: user.displayName,
            avatar_url: user.avatarUrl || null,
            color: user.color,
          },
        });

        return done({
          ok: true,
          role: access.role,
          can_edit: access.canEdit,
          file: serializeFile(file),
          content: session.content,
          revision: session.liveRevision,
        });
      } catch (error) {
        return done({ ok: false, message: "Failed to join file" });
      }
    });

    socket.on("leave-file", async (payload, ack) => {
      const done = normalizeAck(ack);

      try {
        const projectId = String(payload?.projectId || socket.data.currentProjectId || "").trim();
        const fileId = String(payload?.fileId || socket.data.currentFileId || "").trim();

        if (!projectId) {
          return done({ ok: true });
        }

        if (fileId) {
          socket.leave(fileRoom(projectId, fileId));
        }

        socket.data.currentFileId = null;
        socket.data.currentFilePath = null;

        await upsertPresence({
          projectId,
          isOnline: true,
          filePath: null,
          cursorLine: null,
          cursorColumn: null,
        });

        await emitPresenceSnapshot(projectId);
        socket.to(projectRoom(projectId)).emit("user-left", {
          project_id: projectId,
          file_id: fileId || null,
          user_id: userId,
        });

        return done({ ok: true });
      } catch (error) {
        return done({ ok: false, message: "Failed to leave file" });
      }
    });

    socket.on("cursor-move", async (payload) => {
      try {
        const projectId = String(payload?.projectId || socket.data.currentProjectId || "").trim();
        if (!projectId) {
          return;
        }

        const filePath = String(payload?.filePath || socket.data.currentFilePath || "").trim() || null;
        const cursorLine =
          payload?.line === null || payload?.line === undefined ? null : Number(payload.line);
        const cursorColumn =
          payload?.column === null || payload?.column === undefined ? null : Number(payload.column);

        await upsertPresence({
          projectId,
          isOnline: true,
          filePath,
          cursorLine,
          cursorColumn,
        });

        socket.to(projectRoom(projectId)).emit("cursor-move", {
          project_id: projectId,
          user_id: userId,
          file_path: filePath,
          cursor_line: cursorLine,
          cursor_column: cursorColumn,
          profile: {
            display_name: user.displayName,
            avatar_url: user.avatarUrl || null,
            color: user.color,
          },
        });
      } catch (error) {
        // Ignore noisy cursor failures.
      }
    });

    socket.on("code-change", async (payload, ack) => {
      const done = normalizeAck(ack);

      try {
        const projectId = String(payload?.projectId || socket.data.currentProjectId || "").trim();
        const fileId = String(payload?.fileId || socket.data.currentFileId || "").trim();
        const content = typeof payload?.content === "string" ? payload.content : null;

        if (!projectId || !fileId || content === null) {
          return done({ ok: false, message: "Invalid file change payload" });
        }

        const access = await getProjectAccess(userId, projectId);
        if (!access.exists) {
          return done({ ok: false, message: "Project not found" });
        }

        if (!access.hasAccess) {
          return done({ ok: false, message: "You do not have access to this project" });
        }

        if (!access.canEdit) {
          return done({ ok: false, message: "Viewer access is read-only", code: "READ_ONLY" });
        }

        const file = await File.findOne({ _id: fileId, project: projectId });
        if (!file) {
          return done({ ok: false, message: "File not found" });
        }

        if (isFileLockActive(file) && file.lockOwner.toString() !== userId) {
          return done({
            ok: false,
            message: `This file is locked by ${file.lockOwnerName || "another collaborator"}`,
            code: "FILE_LOCKED",
          });
        }

        const session = getOrCreateSession(file);
        session.content = content;
        session.language = file.language || session.language;
        session.liveRevision += 1;
        session.dirty = true;
        session.lastUpdatedBy = userId;
        session.lastUpdatedByName = user.displayName || user.email || "Unknown";

        scheduleAutosave(session, flushLiveSession);

        socket.to(fileRoom(projectId, fileId)).emit("code-change", {
          project_id: projectId,
          file_id: fileId,
          content,
          revision: session.liveRevision,
          updated_by: userId,
        });

        return done({
          ok: true,
          revision: session.liveRevision,
        });
      } catch (error) {
        return done({ ok: false, message: "Failed to sync code change" });
      }
    });

    socket.on("disconnect", async () => {
      try {
        const projectId = socket.data.currentProjectId;
        const fileId = socket.data.currentFileId;

        if (projectId && fileId) {
          await flushLiveSession(projectId, fileId);
        }

        if (projectId) {
          await upsertPresence({
            projectId,
            isOnline: false,
            filePath: null,
            cursorLine: null,
            cursorColumn: null,
          });

          await emitPresenceSnapshot(projectId);
          socket.to(projectRoom(projectId)).emit("user-left", {
            project_id: projectId,
            file_id: fileId || null,
            user_id: userId,
          });
        }
      } catch (error) {
        // Disconnect cleanup is best-effort.
      }
    });
  });

  const collaboration = {
    io,
    emitProjectEvent,
    emitPresenceSnapshot,
    flushLiveSession,
    getLiveSession(projectId, fileId) {
      return liveFileSessions.get(fileSessionKey(projectId, fileId)) || null;
    },
  };

  app.set("io", io);
  app.set("collaboration", collaboration);

  return collaboration;
};
