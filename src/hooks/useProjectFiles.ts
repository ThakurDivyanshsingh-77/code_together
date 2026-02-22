import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { FileNode, getLanguageFromFileName } from "@/types/editor";

interface DbFile {
  id: string;
  project_id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  content: string | null;
  language: string | null;
  parent_path: string | null;
  created_at: string;
  updated_at: string;
}

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

export const useProjectFiles = (projectId: string | null) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [dbFiles, setDbFiles] = useState<DbFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(
    async (silent: boolean = false) => {
      if (!projectId) {
        setFiles([]);
        setDbFiles([]);
        setLoading(false);
        return;
      }

      try {
        if (!silent) setLoading(true);

        const data = await apiRequest<DbFile[]>(`/projects/${projectId}/files`);
        const typedData = data || [];

        setDbFiles(typedData);
        setFiles(buildFileTree(typedData));
      } catch (error) {
        if (!silent) {
          console.error("Error fetching files:", error);
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

  useEffect(() => {
    if (!projectId) return;

    const interval = window.setInterval(() => {
      fetchFiles(true);
    }, 2000);

    return () => {
      window.clearInterval(interval);
    };
  }, [projectId, fetchFiles]);

  const createFile = useCallback(
    async (parentPath: string | null, name: string, type: "file" | "folder") => {
      if (!projectId) return { error: new Error("No project selected") };

      const path = parentPath ? `${parentPath}/${name}` : `/${name}`;
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
            parent_path: parentPath,
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
          const nextFiles = prev.map((file) => (file.id === fileId ? { ...file, content: updated.content } : file));
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

  return {
    files,
    loading,
    createFile,
    updateFileContent,
    deleteFile,
    getFileById,
    refetch: fetchFiles,
  };
};
