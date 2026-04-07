import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import { FileNode, getLanguageFromFileName } from "@/types/editor";

interface LocalFsEntry {
  name: string;
  path: string;
  type: "file" | "folder";
  parent_path: string | null;
  language?: string;
  is_binary?: boolean;
}

interface TreeResponse {
  root: string;
  project_name: string;
  entries: LocalFsEntry[];
}

interface ReadFileResponse {
  path: string;
  name: string;
  content: string;
  language: string;
}

// Convert flat entries into a nested FileNode tree
const buildFileTree = (entries: LocalFsEntry[]): FileNode[] => {
  const nodeMap = new Map<string, FileNode>();
  const rootNodes: FileNode[] = [];

  entries.forEach((entry) => {
    nodeMap.set(entry.path, {
      id: `local:${entry.path}`,
      name: entry.name,
      type: entry.type,
      path: entry.path,
      language:
        entry.type === "file"
          ? entry.language || getLanguageFromFileName(entry.name)
          : undefined,
      children: entry.type === "folder" ? [] : undefined,
      isOpen: false,
    });
  });

  entries.forEach((entry) => {
    const node = nodeMap.get(entry.path);
    if (!node) return;

    if (entry.parent_path && nodeMap.has(entry.parent_path)) {
      const parent = nodeMap.get(entry.parent_path);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
};

export const useLocalProject = () => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [rootPath, setRootPath] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");

  const openProject = useCallback(async (dirPath: string) => {
    console.log('[useLocalProject] openProject called with:', dirPath);
    setLoading(true);
    try {
      console.log('[useLocalProject] Making API request to /local/tree');
      const data = await apiRequest<TreeResponse>("/local/tree", {
        method: "POST",
        body: { rootPath: dirPath },
      });

      console.log('[useLocalProject] API response:', data);
      setRootPath(data.root);
      console.log('[useLocalProject] Loaded rootPath:', data.root);
      setProjectName(data.project_name);

      const tree = buildFileTree(data.entries);
      setFiles(tree);

      return { data, error: null };
    } catch (error) {
      console.error('[useLocalProject] Error loading project:', error);
      return { data: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  const readFile = useCallback(
    async (filePath: string) => {
      if (!rootPath) return { data: null, error: new Error("No project open") };

      try {
        const data = await apiRequest<ReadFileResponse>("/local/read", {
          method: "POST",
          body: { rootPath, filePath },
        });

        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
    [rootPath]
  );

  const saveFile = useCallback(
    async (filePath: string, content: string) => {
      if (!rootPath) return { error: new Error("No project open") };

      try {
        await apiRequest("/local/save", {
          method: "POST",
          body: { rootPath, filePath, content },
        });

        return { error: null };
      } catch (error) {
        return { error: error as Error };
      }
    },
    [rootPath]
  );

  const refreshTree = useCallback(async () => {
    if (!rootPath) return;
    await openProject(rootPath);
  }, [rootPath, openProject]);

  return {
    files,
    loading,
    rootPath,
    projectName,
    openProject,
    readFile,
    saveFile,
    refreshTree,
  };
};
