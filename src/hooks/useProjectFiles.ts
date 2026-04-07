import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { FileLock, FileNode, getLanguageFromFileName } from "@/types/editor";

interface DbFileLock {
  user_id: string;
  user_name: string | null;
  expires_at: string;
}

interface DbFile {
  id: string;
  project_id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  content: string | null;
  language: string | null;
  revision: number;
  locked: boolean;
  parent_path: string | null;
  lock: DbFileLock | null;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

interface FileLockMutationResponse {
  success: boolean;
  released?: boolean;
  file: DbFile;
}

interface UpdateFileMetadataInput {
  name?: string;
  path?: string;
  parent_path?: string | null;
}

const DEFAULT_LOCK_TTL_SECONDS = 60;

const toFileLock = (lock: DbFileLock | null): FileLock | null => {
  if (!lock) return null;

  return {
    userId: lock.user_id,
    userName: lock.user_name,
    expiresAt: lock.expires_at,
  };
};

// Convert flat DB files to nested FileNode tree
const buildFileTree = (files: DbFile[]): FileNode[] => {
  const nodeMap = new Map<string, FileNode>();
  const rootNodes: FileNode[] = [];

  files.forEach((file) => {
    nodeMap.set(file.path, {
      id: file.id,
      name: file.name,
      type: file.type,
      path: file.path,
      language: file.language || (file.type === "file" ? getLanguageFromFileName(file.name) : undefined),
      content: file.content || undefined,
      revision: file.revision || 0,
      locked: Boolean(file.locked),
      lock: toFileLock(file.lock),
      createdAt: file.created_at,
      updatedAt: file.updated_at,
      children: file.type === "folder" ? [] : undefined,
      isOpen: file.type === "folder",
    });
  });

  files.forEach((file) => {
    const node = nodeMap.get(file.path);
    if (!node) return;

    if (file.parent_path && nodeMap.has(file.parent_path)) {
      const parent = nodeMap.get(file.parent_path);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: node.children ? sortNodes(node.children) : undefined,
      }));

  return sortNodes(rootNodes);
};

const upsertDbFile = (files: DbFile[], updatedFile: DbFile): DbFile[] => {
  const index = files.findIndex((entry) => entry.id === updatedFile.id);
  if (index === -1) {
    return [...files, updatedFile];
  }

  const nextFiles = [...files];
  nextFiles[index] = updatedFile;
  return nextFiles;
};

const getParentPath = (path: string): string | null => {
  const normalizedPath = path.trim();
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  if (lastSlashIndex <= 0) {
    return null;
  }

  return normalizedPath.slice(0, lastSlashIndex);
};

const joinFilePath = (parentPath: string | null, name: string) =>
  parentPath ? `${parentPath}/${name}` : `/${name}`;

export const useProjectFiles = (projectId: string | null) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [dbFiles, setDbFiles] = useState<DbFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectNotFound, setProjectNotFound] = useState(false);

  const fetchFiles = useCallback(
    async (silent: boolean = false) => {
      if (!projectId) {
        setFiles([]);
        setDbFiles([]);
        setLoading(false);
        setProjectNotFound(false);
        return;
      }

      try {
        if (!silent) setLoading(true);
        setProjectNotFound(false);

        const data = await apiRequest<DbFile[]>(`/projects/${projectId}/files`);
        const typedData = data || [];

        setDbFiles(typedData);
        setFiles(buildFileTree(typedData));
      } catch (error) {
        if (!silent) {
          console.error("Error fetching files:", error);
        }
        // Check if it's a 404 error (project not found)
        if (error instanceof Error && (error.message.includes('404') || error.message.includes('not found'))) {
          console.log('Project not found detected for:', projectId);
          setProjectNotFound(true);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId]
  );

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const createFile = useCallback(
    async (parentPath: string | null, name: string, type: "file" | "folder") => {
      if (!projectId) return { error: new Error("No project selected") };

      const normalizedParentPath = !parentPath || parentPath === "/" ? null : parentPath;
      const path = normalizedParentPath ? `${normalizedParentPath}/${name}` : `/${name}`;
      const language = type === "file" ? getLanguageFromFileName(name) : null;

      const getContent = () => {
        if (type === "folder") return null;

        const ext = name.split(".").pop()?.toLowerCase();
        const templates: Record<string, string> = {
          js: `// ${name}\nconsole.log('Hello from ${name}');\n`,
          ts: `// ${name}\nconst greeting: string = 'Hello from ${name}';\nconsole.log(greeting);\n`,
          py: `# ${name}\n\ndef main():\n    print('Hello from ${name}')\n\nif __name__ == '__main__':\n    main()\n`,
          json: `{\n  "name": "${name.replace(".json", "")}"\n}\n`,
        };

        return templates[ext || ""] || `// ${name}\n`;
      };

      try {
        const data = await apiRequest<DbFile>(`/projects/${projectId}/files`, {
          method: "POST",
          body: {
            name,
            path,
            type,
            content: getContent(),
            language,
            parent_path: normalizedParentPath,
          },
        });

        setDbFiles((prev) => {
          const nextFiles = [...prev, data];
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { data, error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const updateFileContent = useCallback(
    async (fileId: string, content: string) => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        const updated = await apiRequest<DbFile>(`/projects/${projectId}/files/${fileId}`, {
          method: "PATCH",
          body: { content },
        });

        setDbFiles((prev) => {
          const nextFiles = upsertDbFile(prev, updated);
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { data: updated, error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const updateFileMetadata = useCallback(
    async (fileId: string, updates: UpdateFileMetadataInput) => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        const updated = await apiRequest<DbFile>(`/projects/${projectId}/files/${fileId}`, {
          method: "PATCH",
          body: updates,
        });

        await fetchFiles(true);
        return { data: updated, error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [fetchFiles, projectId]
  );

  const renameNode = useCallback(
    async (node: FileNode, nextName: string) => {
      const trimmedName = nextName.trim();
      if (!trimmedName) {
        return { error: new Error("Name is required") };
      }

      const parentPath = getParentPath(node.path);
      return updateFileMetadata(node.id, {
        name: trimmedName,
        parent_path: parentPath,
        path: joinFilePath(parentPath, trimmedName),
      });
    },
    [updateFileMetadata]
  );

  const moveNode = useCallback(
    async (node: FileNode, destinationParentPath: string | null) => {
      const normalizedParentPath =
        !destinationParentPath || destinationParentPath === "/" ? null : destinationParentPath;

      return updateFileMetadata(node.id, {
        name: node.name,
        parent_path: normalizedParentPath,
        path: joinFilePath(normalizedParentPath, node.name),
      });
    },
    [updateFileMetadata]
  );

  const acquireFileLock = useCallback(
    async (fileId: string, ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS, silent: boolean = false) => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        const response = await apiRequest<FileLockMutationResponse>(`/projects/${projectId}/files/${fileId}/lock`, {
          method: "POST",
          body: { ttl_seconds: ttlSeconds },
        });

        setDbFiles((prev) => {
          const nextFiles = upsertDbFile(prev, response.file);
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { data: response.file, error: null };
      } catch (error) {
        if (!silent) {
          console.error("Failed to acquire file lock:", error);
        }
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const releaseFileLock = useCallback(
    async (fileId: string, silent: boolean = false) => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        const response = await apiRequest<FileLockMutationResponse>(`/projects/${projectId}/files/${fileId}/lock`, {
          method: "DELETE",
        });

        setDbFiles((prev) => {
          const nextFiles = upsertDbFile(prev, response.file);
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { data: response.file, error: null };
      } catch (error) {
        if (!silent) {
          console.error("Failed to release file lock:", error);
        }
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const deleteFile = useCallback(
    async (fileId: string, filePath: string) => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        await apiRequest(`/projects/${projectId}/files/${fileId}`, {
          method: "DELETE",
        });

        setDbFiles((prev) => {
          const nextFiles = prev.filter(
            (file) => !(file.path === filePath || file.path.startsWith(`${filePath}/`))
          );
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const getFileById = useCallback(
    (fileId: string): FileNode | null => {
      const findNode = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.id === fileId) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      return findNode(files);
    },
    [files]
  );

  // AI-specific file operations
  const getFileContent = useCallback(
    async (fileId: string): Promise<{ content: string; error: Error | null }> => {
      if (!projectId) return { content: '', error: new Error("No project selected") };

      try {
        const file = await apiRequest<DbFile>(`/projects/${projectId}/files/${fileId}`);
        return { content: file.content || '', error: null };
      } catch (error) {
        return { content: '', error: error as Error };
      }
    },
    [projectId]
  );

  const updateFileByAI = useCallback(
    async (fileId: string, content: string): Promise<{ error: Error | null }> => {
      if (!projectId) return { error: new Error("No project selected") };

      try {
        const updated = await apiRequest<DbFile>(`/projects/${projectId}/files/${fileId}`, {
          method: "PATCH",
          body: { content },
        });

        setDbFiles((prev) => {
          const nextFiles = upsertDbFile(prev, updated);
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [projectId]
  );

  const createFileByAI = useCallback(
    async (path: string, content: string, type: 'file' | 'folder' = 'file'): Promise<{ fileId: string; error: Error | null }> => {
      if (!projectId) return { fileId: '', error: new Error("No project selected") };

      const parentPath = getParentPath(path);
      const name = path.split('/').pop() || '';
      const language = type === 'file' ? getLanguageFromFileName(name) : null;

      try {
        const data = await apiRequest<DbFile>(`/projects/${projectId}/files`, {
          method: "POST",
          body: {
            name,
            path,
            type,
            content: type === 'file' ? content : null,
            language,
            parent_path: parentPath === '/' ? null : parentPath,
          },
        });

        setDbFiles((prev) => {
          const nextFiles = [...prev, data];
          setFiles(buildFileTree(nextFiles));
          return nextFiles;
        });

        return { fileId: data.id, error: null };
      } catch (error) {
        return { fileId: '', error: error as Error };
      }
    },
    [projectId]
  );

  const getAllFilesContent = useCallback(
    async (): Promise<{ files: Array<{ path: string; content: string; language: string | null }>; error: Error | null }> => {
      if (!projectId) return { files: [], error: new Error("No project selected") };

      try {
        const dbFiles = await apiRequest<DbFile[]>(`/projects/${projectId}/files`);
        const files = dbFiles
          .filter(file => file.type === 'file' && file.content)
          .map(file => ({
            path: file.path,
            content: file.content || '',
            language: file.language,
          }));

        return { files, error: null };
      } catch (error) {
        return { files: [], error: error as Error };
      }
    },
    [projectId]
  );

  return {
    files,
    loading,
    projectNotFound,
    createFile,
    updateFileContent,
    renameNode,
    moveNode,
    acquireFileLock,
    releaseFileLock,
    deleteFile,
    getFileById,
    refetch: fetchFiles,
    // AI-specific operations
    getFileContent,
    updateFileByAI,
    createFileByAI,
    getAllFilesContent,
  };
};
