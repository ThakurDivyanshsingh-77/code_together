import express from "express";
import fs from "fs/promises";
import path from "path";
import { readFileSync } from "fs";
import File from "../models/File.js";
import Project from "../models/Project.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { createFileVersionSnapshot } from "../utils/fileVersioning.js";
import { serializeFile } from "../utils/serializers.js";

const router = express.Router();

// Binary / large file extensions to skip content reading
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".mp3", ".mp4", ".wav", ".ogg", ".webm", ".avi", ".mov",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".lock", ".lockb",
]);

// Directories to always skip when scanning
const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", ".nuxt", "dist", "build",
  "__pycache__", ".cache", ".parcel-cache", ".turbo",
  "coverage", ".nyc_output", ".vscode", ".idea",
]);

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_DEPTH = 8;

const isBinaryFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
};

const getLanguageFromExt = (ext) => {
  const map = {
    ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript",
    ".py": "python", ".rb": "ruby", ".go": "go", ".rs": "rust",
    ".java": "java", ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
    ".html": "html", ".css": "css", ".scss": "scss", ".less": "less",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml",
    ".xml": "xml", ".svg": "xml",
    ".md": "markdown", ".mdx": "markdown",
    ".sql": "sql", ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".ps1": "powershell", ".bat": "bat", ".cmd": "bat",
    ".dockerfile": "dockerfile",
    ".env": "plaintext", ".txt": "plaintext", ".log": "plaintext",
    ".gitignore": "plaintext", ".editorconfig": "plaintext",
  };
  return map[ext.toLowerCase()] || "plaintext";
};

/**
 * POST /api/local/tree
 * Body: { rootPath: string }
 * Returns the directory tree as a flat list of entries.
 */
router.post("/tree", async (req, res) => {
  try {
    const rootPath = String(req.body?.rootPath || "").trim();
    if (!rootPath) {
      return res.status(400).json({ message: "rootPath is required" });
    }

    const resolvedRoot = path.resolve(rootPath);

    try {
      await fs.access(resolvedRoot);
    } catch {
      return res.status(404).json({ message: "Directory not found" });
    }

    const stat = await fs.stat(resolvedRoot);
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: "Path is not a directory" });
    }

    const entries = [];

    const scan = async (dirPath, parentRelative, depth) => {
      if (depth > MAX_DEPTH) return;

      let items;
      try {
        items = await fs.readdir(dirPath, { withFileTypes: true });
      } catch {
        return;
      }

      // Sort: folders first, then alphabetical
      items.sort((a, b) => {
        const aIsDir = a.isDirectory() ? 0 : 1;
        const bIsDir = b.isDirectory() ? 0 : 1;
        if (aIsDir !== bIsDir) return aIsDir - bIsDir;
        return a.name.localeCompare(b.name);
      });

      for (const item of items) {
        if (item.name.startsWith(".") && IGNORED_DIRS.has(item.name)) continue;
        if (IGNORED_DIRS.has(item.name)) continue;

        const fullPath = path.join(dirPath, item.name);
        const relativePath = parentRelative
          ? `${parentRelative}/${item.name}`
          : `/${item.name}`;

        if (item.isDirectory()) {
          entries.push({
            name: item.name,
            path: relativePath,
            type: "folder",
            parent_path: parentRelative || null,
          });
          await scan(fullPath, relativePath, depth + 1);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          entries.push({
            name: item.name,
            path: relativePath,
            type: "file",
            parent_path: parentRelative || null,
            language: getLanguageFromExt(ext),
            is_binary: isBinaryFile(item.name),
          });
        }
      }
    };

    await scan(resolvedRoot, null, 0);

    return res.json({
      root: resolvedRoot,
      project_name: path.basename(resolvedRoot),
      entries,
    });
  } catch (error) {
    console.error("local/tree error:", error);
    return res.status(500).json({ message: "Failed to read directory" });
  }
});

/**
 * POST /api/local/read
 * Body: { rootPath: string, filePath: string }
 * Returns the file content.
 */
router.post("/read", async (req, res) => {
  try {
    const rootPath = String(req.body?.rootPath || "").trim();
    const filePath = String(req.body?.filePath || "").trim();

    if (!rootPath || !filePath) {
      return res.status(400).json({ message: "rootPath and filePath are required" });
    }

    const resolvedRoot = path.resolve(rootPath);
    const resolvedFile = path.resolve(resolvedRoot, filePath.replace(/^\//, ""));

    // Security: ensure the file is inside the root
    if (!resolvedFile.startsWith(resolvedRoot)) {
      return res.status(403).json({ message: "Access denied: path traversal detected" });
    }

    try {
      await fs.access(resolvedFile);
    } catch {
      return res.status(404).json({ message: "File not found" });
    }

    const stat = await fs.stat(resolvedFile);
    if (!stat.isFile()) {
      return res.status(400).json({ message: "Path is not a file" });
    }

    if (stat.size > MAX_FILE_SIZE_BYTES) {
      return res.status(413).json({ message: "File is too large to open (>2 MB)" });
    }

    if (isBinaryFile(resolvedFile)) {
      return res.status(415).json({ message: "Binary files cannot be opened in the editor" });
    }

    const content = await fs.readFile(resolvedFile, "utf-8");
    const ext = path.extname(resolvedFile).toLowerCase();

    return res.json({
      path: filePath,
      name: path.basename(resolvedFile),
      content,
      language: getLanguageFromExt(ext),
    });
  } catch (error) {
    console.error("local/read error:", error);
    return res.status(500).json({ message: "Failed to read file" });
  }
});

/**
 * POST /api/local/save
 * Body: { rootPath: string, filePath: string, content: string }
 * Saves content to the file on disk.
 */
router.post("/save", async (req, res) => {
  try {
    const rootPath = String(req.body?.rootPath || "").trim();
    const filePath = String(req.body?.filePath || "").trim();
    const content = req.body?.content;

    if (!rootPath || !filePath || content === undefined) {
      return res.status(400).json({ message: "rootPath, filePath, and content are required" });
    }

    const resolvedRoot = path.resolve(rootPath);
    const resolvedFile = path.resolve(resolvedRoot, filePath.replace(/^\//, ""));

    // Security: ensure the file is inside the root
    if (!resolvedFile.startsWith(resolvedRoot)) {
      return res.status(403).json({ message: "Access denied: path traversal detected" });
    }

    await fs.writeFile(resolvedFile, content, "utf-8");

    return res.json({ success: true, path: filePath });
  } catch (error) {
    console.error("local/save error:", error);
    return res.status(500).json({ message: "Failed to save file" });
  }
});

/**
 * POST /api/local/browse
 * Body: { dirPath?: string }
 * Lists child directories of the given path.
 * If dirPath is empty / omitted, returns filesystem roots (drive letters on Windows, "/" on Unix).
 */
router.post("/browse", async (req, res) => {
  try {
    const dirPath = String(req.body?.dirPath || "").trim();

    // No path → return filesystem roots
    if (!dirPath) {
      // Detect WSL: /proc/version contains "microsoft" or "WSL"
      const isWSL = (() => {
        try {
          const v = readFileSync("/proc/version", "utf8").toLowerCase();
          return v.includes("microsoft") || v.includes("wsl");
        } catch { return false; }
      })();

      if (process.platform === "win32") {
        // Native Windows — list drive letters A-Z
        const drives = [];
        for (let code = 65; code <= 90; code++) {
          const letter = String.fromCharCode(code);
          const root = `${letter}:\\`;
          try {
            await fs.access(root);
            drives.push({ name: `${letter}:`, path: root, type: "drive" });
          } catch { /* skip */ }
        }
        return res.json({ parent: null, dirs: drives });
      } else if (isWSL) {
        // WSL — Windows drives are mounted at /mnt/[a-z]
        const drives = [];
        for (let code = 97; code <= 122; code++) {
          const letter = String.fromCharCode(code);
          const mountPath = `/mnt/${letter}`;
          try {
            const stat = await fs.stat(mountPath);
            if (stat.isDirectory()) {
              drives.push({ name: `${letter.toUpperCase()}:`, path: mountPath, type: "drive" });
            }
          } catch { /* skip */ }
        }
        if (drives.length > 0) {
          return res.json({ parent: null, dirs: drives });
        }
        // WSL but no /mnt drives found — fall through to "/"
        return res.json({ parent: null, dirs: [{ name: "/", path: "/", type: "drive" }] });
      } else {
        return res.json({ parent: null, dirs: [{ name: "/", path: "/", type: "drive" }] });
      }
    }

    const resolved = path.resolve(dirPath);

    try {
      await fs.access(resolved);
    } catch {
      return res.status(404).json({ message: "Directory not found" });
    }

    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: "Path is not a directory" });
    }

    const items = await fs.readdir(resolved, { withFileTypes: true });
    const dirs = items
      .filter((item) => item.isDirectory() && !item.name.startsWith(".") && !IGNORED_DIRS.has(item.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        name: item.name,
        path: path.join(resolved, item.name),
        type: "folder",
      }));

    const parent = path.dirname(resolved);

    return res.json({
      current: resolved,
      parent: parent !== resolved ? parent : null,
      dirs,
    });
  } catch (error) {
    console.error("local/browse error:", error);
    return res.status(500).json({ message: "Failed to browse directory" });
  }
});

/**
 * POST /api/local/import
 * Body: { rootPath: string, projectId: string }
 * Scans a local folder and imports all files/folders into the given cloud project.
 */
router.post("/import", async (req, res) => {
  try {
    const rootPath = String(req.body?.rootPath || "").trim();
    const projectId = String(req.body?.projectId || "").trim();

    if (!rootPath || !projectId) {
      return res.status(400).json({ message: "rootPath and projectId are required" });
    }

    // Verify project access
    const access = await getProjectAccess(req.auth.userId, projectId);
    if (!access.exists) {
      return res.status(404).json({ message: "Project not found" });
    }
    if (!access.hasAccess || !access.canEdit) {
      return res.status(403).json({ message: "You do not have edit access to this project" });
    }

    const resolvedRoot = path.resolve(rootPath);

    try {
      await fs.access(resolvedRoot);
    } catch {
      return res.status(404).json({ message: "Directory not found" });
    }

    const stat = await fs.stat(resolvedRoot);
    if (!stat.isDirectory()) {
      return res.status(400).json({ message: "Path is not a directory" });
    }

    // Collect entries
    const folders = [];
    const files = [];

    const scan = async (dirPath, parentRelative, depth) => {
      if (depth > MAX_DEPTH) return;

      let items;
      try {
        items = await fs.readdir(dirPath, { withFileTypes: true });
      } catch {
        return;
      }

      items.sort((a, b) => {
        const aIsDir = a.isDirectory() ? 0 : 1;
        const bIsDir = b.isDirectory() ? 0 : 1;
        if (aIsDir !== bIsDir) return aIsDir - bIsDir;
        return a.name.localeCompare(b.name);
      });

      for (const item of items) {
        if (item.name.startsWith(".") && IGNORED_DIRS.has(item.name)) continue;
        if (IGNORED_DIRS.has(item.name)) continue;

        const fullPath = path.join(dirPath, item.name);
        const relativePath = parentRelative
          ? `${parentRelative}/${item.name}`
          : `/${item.name}`;

        if (item.isDirectory()) {
          folders.push({
            name: item.name,
            path: relativePath,
            parentPath: parentRelative || null,
          });
          await scan(fullPath, relativePath, depth + 1);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          const isBinary = isBinaryFile(item.name);

          let content = null;
          if (!isBinary) {
            try {
              const fileStat = await fs.stat(fullPath);
              if (fileStat.size <= MAX_FILE_SIZE_BYTES) {
                content = await fs.readFile(fullPath, "utf-8");
              }
            } catch {
              // skip unreadable files
              continue;
            }
          }

          files.push({
            name: item.name,
            path: relativePath,
            parentPath: parentRelative || null,
            language: getLanguageFromExt(ext),
            content,
          });
        }
      }
    };

    await scan(resolvedRoot, null, 0);

    // Delete existing files in the project (fresh import)
    await File.deleteMany({ project: projectId });

    // Bulk-create folders
    const folderDocs = [];
    for (const folder of folders) {
      const doc = await File.create({
        project: projectId,
        name: folder.name,
        path: folder.path,
        type: "folder",
        content: null,
        language: null,
        revision: 0,
        parentPath: folder.parentPath,
      });
      folderDocs.push(doc);
    }

    // Bulk-create files
    const fileDocs = [];
    const userName = req.auth.user?.displayName || req.auth.user?.email || "Unknown";
    for (const file of files) {
      const doc = await File.create({
        project: projectId,
        name: file.name,
        path: file.path,
        type: "file",
        content: file.content,
        language: file.language,
        revision: 1,
        parentPath: file.parentPath,
      });

      await createFileVersionSnapshot({
        file: doc,
        userId: req.auth.userId,
        userName,
        source: "import",
      });

      fileDocs.push(doc);
    }

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    // Emit real-time event so collaborators see the change
    const collaboration = req.app.get("collaboration");
    collaboration?.emitProjectEvent?.(projectId, "project-file-event", {
      type: "files-imported",
      project_id: projectId,
    });

    return res.json({
      folders_created: folderDocs.length,
      files_created: fileDocs.length,
      total: folderDocs.length + fileDocs.length,
    });
  } catch (error) {
    console.error("local/import error:", error);
    return res.status(500).json({ message: "Failed to import folder" });
  }
});

// Write project files from DB to a local temp directory so the terminal can run them
// POST /api/local/projects/:projectId/write-to-disk
router.post("/projects/:projectId/write-to-disk", async (req, res) => {
  try {
    const { projectId } = req.params;
    const { folderPath } = req.body; // optional: only export a specific subfolder
    const userId = req.auth.userId;

    const accessResult = await getProjectAccess(userId, projectId);
    if (!accessResult.hasAccess) {
      return res.status(accessResult.exists ? 403 : 404).json({
        message: accessResult.exists ? "Access denied" : "Project not found",
      });
    }

    const project = await Project.findById(projectId).lean();
    const projectSlug = (project?.name || projectId).replace(/[^a-zA-Z0-9_-]/g, "_");

    const os = await import("os");
    const isWin = os.default.platform() === "win32";
    const tempRoot = isWin ? "D:\\Temp" : os.default.tmpdir();
    const tempBase = path.join(tempRoot, `ct_${projectSlug}_${projectId.slice(-6)}`);

    // Fetch all files for this project
    const query = { project: projectId, type: "file" };
    const allFiles = await File.find(query).lean();

    const written = [];

    for (const file of allFiles) {
      // If a specific folderPath was requested, only export files under it
      if (folderPath && !file.path.startsWith(folderPath)) continue;

      // Construct real disk path — strip leading slash from virtual path
      const relativePath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
      const diskPath = path.join(tempBase, relativePath);

      await fs.mkdir(path.dirname(diskPath), { recursive: true });
      await fs.writeFile(diskPath, file.content || "", "utf8");
      written.push(relativePath);
    }

    // Determine the cd target: tempBase + folderPath (if provided)
    let targetPath = tempBase;
    if (folderPath) {
      const rel = folderPath.startsWith("/") ? folderPath.slice(1) : folderPath;
      targetPath = path.join(tempBase, rel);
    }

    return res.json({ path: targetPath, filesWritten: written.length });
  } catch (error) {
    console.error("write-to-disk error:", error);
    return res.status(500).json({ message: "Failed to write project to disk" });
  }
});

/**
 * POST /api/local/upload
 * Body: { projectId: string, files: [{ path, name, content, language, parentPath }] }
 * Accepts file contents sent directly from the browser — no server filesystem access needed.
 * Replaces all existing project files (same behaviour as /import).
 */
router.post("/upload", async (req, res) => {
  try {
    const projectId = String(req.body?.projectId || "").trim();
    const files = req.body?.files;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "files array is required and must not be empty" });
    }

    const access = await getProjectAccess(req.auth.userId, projectId);
    if (!access.exists) return res.status(404).json({ message: "Project not found" });
    if (!access.hasAccess || !access.canEdit) {
      return res.status(403).json({ message: "You do not have edit access to this project" });
    }

    // Wipe existing files
    await File.deleteMany({ project: projectId });

    // Derive unique folder paths from file paths and create folder docs
    const folderPaths = new Set();
    for (const file of files) {
      const parts = String(file.path || "").split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        folderPaths.add("/" + parts.slice(0, i).join("/"));
      }
    }

    const folderDocs = [];
    for (const folderPath of folderPaths) {
      const parts = folderPath.split("/").filter(Boolean);
      const name = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? "/" + parts.slice(0, -1).join("/") : null;
      const doc = await File.create({
        project: projectId,
        name,
        path: folderPath,
        type: "folder",
        content: null,
        language: null,
        revision: 0,
        parentPath,
      });
      folderDocs.push(doc);
    }

    // Create file docs
    const fileDocs = [];
    const userName = req.auth.user?.displayName || req.auth.user?.email || "Unknown";
    for (const file of files) {
      const doc = await File.create({
        project: projectId,
        name: String(file.name || ""),
        path: String(file.path || ""),
        type: "file",
        content: file.content ?? "",
        language: file.language || "plaintext",
        revision: 1,
        parentPath: file.parentPath ?? null,
      });

      await createFileVersionSnapshot({
        file: doc,
        userId: req.auth.userId,
        userName,
        source: "import",
      });

      fileDocs.push(doc);
    }

    await Project.findByIdAndUpdate(projectId, { updatedAt: new Date() });

    const collaboration = req.app.get("collaboration");
    collaboration?.emitProjectEvent?.(projectId, "project-file-event", {
      type: "files-imported",
      project_id: projectId,
    });

    return res.json({
      folders_created: folderDocs.length,
      files_created: fileDocs.length,
      total: folderDocs.length + fileDocs.length,
    });
  } catch (error) {
    console.error("local/upload error:", error);
    return res.status(500).json({ message: "Failed to upload files" });
  }
});

export default router;
