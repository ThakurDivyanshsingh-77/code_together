import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { apiBaseUrl, authTokenStore } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useEditorStore } from '@/store/editorStore';
import { FileNode } from '@/types/editor';

export interface PresenceParticipant {
  id: string;
  user_id: string;
  project_id: string;
  file_path: string | null;
  cursor_line: number | null;
  cursor_column: number | null;
  is_online: boolean;
  last_seen: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    color: number;
  };
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
type SaveStatus = 'saved' | 'saving' | 'error';

interface JoinFileResponse {
  ok: boolean;
  message?: string;
  role?: string | null;
  can_edit?: boolean;
  content?: string;
  revision?: number;
  file?: {
    id: string;
    path: string;
    content: string | null;
    revision: number;
    locked: boolean;
    lock: {
      user_id: string;
      user_name: string | null;
      expires_at: string;
    } | null;
    updated_at: string;
    created_at: string;
  };
}

const socketBaseUrl = apiBaseUrl.replace(/\/api$/, '');

const toFileNodePatch = (file: JoinFileResponse['file']): Partial<FileNode> => {
  if (!file) {
    return {};
  }

  return {
    content: file.content || '',
    revision: file.revision || 0,
    locked: Boolean(file.locked),
    lock: file.lock
      ? {
          userId: file.lock.user_id,
          userName: file.lock.user_name,
          expiresAt: file.lock.expires_at,
        }
      : null,
    updatedAt: file.updated_at,
    createdAt: file.created_at,
  };
};

const upsertParticipant = (
  participants: PresenceParticipant[],
  nextParticipant: PresenceParticipant
) => {
  const index = participants.findIndex((entry) => entry.user_id === nextParticipant.user_id);
  if (index === -1) {
    return [...participants, nextParticipant];
  }

  const next = [...participants];
  next[index] = {
    ...next[index],
    ...nextParticipant,
    profile: nextParticipant.profile || next[index].profile,
  };
  return next;
};

export const useCollaborationSession = ({
  projectId,
  activeFile,
  refetchFiles,
}: {
  projectId: string | null;
  activeFile: FileNode | null;
  refetchFiles: (silent?: boolean) => Promise<void>;
}) => {
  const { user } = useAuth();
  const { applyRemoteFileContent, markFileSaved } = useEditorStore();
  const socketRef = useRef<Socket | null>(null);
  const activeFileRef = useRef<FileNode | null>(activeFile);
  const liveRevisionRef = useRef<number>(activeFile?.revision || 0);

  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  useEffect(() => {
    liveRevisionRef.current = activeFile?.revision || 0;
  }, [activeFile?.revision]);

  useEffect(() => {
    const token = authTokenStore.get();
    if (!projectId || !token || !user) {
      setConnectionStatus('disconnected');
      setParticipants([]);
      return;
    }

    const socket = io(socketBaseUrl, {
      autoConnect: true,
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    socketRef.current = socket;
    setConnectionStatus('connecting');

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      setConnectionStatus('error');
      toast.error(error.message || 'Realtime connection failed');
    });

    socket.on('presence-snapshot', (snapshot: PresenceParticipant[]) => {
      setParticipants(Array.isArray(snapshot) ? snapshot : []);
    });

    socket.on('user-left', (payload: { user_id: string }) => {
      setParticipants((current) =>
        current.filter((participant) => participant.user_id !== payload.user_id || participant.user_id === user.id)
      );
    });

    socket.on('cursor-move', (payload: Omit<PresenceParticipant, 'id' | 'project_id' | 'is_online' | 'last_seen'> & {
      project_id: string;
    }) => {
      setParticipants((current) =>
        upsertParticipant(current, {
          id: payload.user_id,
          user_id: payload.user_id,
          project_id: payload.project_id,
          file_path: payload.file_path,
          cursor_line: payload.cursor_line,
          cursor_column: payload.cursor_column,
          is_online: true,
          last_seen: new Date().toISOString(),
          profile: payload.profile,
        })
      );
    });

    socket.on('code-change', (payload: { file_id: string; content: string; revision: number; updated_by: string }) => {
      const currentFile = activeFileRef.current;
      if (!currentFile || payload.file_id !== currentFile.id || payload.updated_by === user.id) {
        return;
      }

      liveRevisionRef.current = payload.revision;
      applyRemoteFileContent(payload.file_id, payload.content, payload.revision);
    });

    socket.on('file-state', (payload: { file_id: string; content: string; revision: number; file?: JoinFileResponse['file'] }) => {
      const currentFile = activeFileRef.current;
      if (!currentFile || payload.file_id !== currentFile.id) {
        return;
      }

      liveRevisionRef.current = payload.revision;
      markFileSaved(payload.file_id, {
        ...toFileNodePatch(payload.file),
        content: payload.content,
        revision: payload.revision,
      });
      setSaveStatus('saved');
      setLastSavedAt(new Date().toISOString());
    });

    socket.on('project-file-event', (payload: { type: string; file?: JoinFileResponse['file']; file_id?: string }) => {
      const currentFile = activeFileRef.current;
      const isCurrentFile = Boolean(payload.file && currentFile && payload.file.id === currentFile.id);

      if (payload.file && isCurrentFile) {
        markFileSaved(payload.file.id, toFileNodePatch(payload.file));
      }

      if (payload.type === 'file-saved') {
        setSaveStatus('saved');
        setLastSavedAt(payload.file?.updated_at || new Date().toISOString());
        return;
      }

      if (['file-created', 'file-deleted'].includes(payload.type)) {
        void refetchFiles(true);
        return;
      }

      if (!isCurrentFile && ['file-updated', 'file-locked', 'file-unlocked'].includes(payload.type)) {
        void refetchFiles(true);
      }
    });

    return () => {
      const currentFile = activeFileRef.current;
      if (socketRef.current?.connected && projectId && currentFile?.id) {
        socketRef.current.emit('leave-file', { projectId, fileId: currentFile.id });
      }

      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    projectId,
    user,
    refetchFiles,
    applyRemoteFileContent,
    markFileSaved,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !projectId || !activeFile?.id) {
      return;
    }

    const joinCurrentFile = () => {
      socket.emit(
        'join-file',
        { projectId, fileId: activeFile.id },
        (response: JoinFileResponse) => {
          if (!response?.ok) {
            toast.error(response?.message || 'Failed to join collaboration room');
            return;
          }

          setRole(response.role || null);
          liveRevisionRef.current = response.revision || 0;

          if (response.file) {
            markFileSaved(activeFile.id, {
              ...toFileNodePatch(response.file),
              content: response.content ?? response.file.content ?? activeFile.content ?? '',
              revision: response.revision ?? response.file.revision ?? activeFile.revision ?? 0,
            });
          }

          setSaveStatus('saved');
        }
      );
    };

    if (socket.connected) {
      joinCurrentFile();
    } else {
      socket.once('connect', joinCurrentFile);
    }

    return () => {
      socket.off('connect', joinCurrentFile);
      if (socket.connected) {
        socket.emit('leave-file', { projectId, fileId: activeFile.id });
      }
    };
  }, [projectId, activeFile?.id, markFileSaved]);

  const sendCodeChange = (content: string) => {
    const socket = socketRef.current;
    if (!socket || !projectId || !activeFile?.id) {
      return;
    }

    setSaveStatus('saving');

    socket.emit(
      'code-change',
      {
        projectId,
        fileId: activeFile.id,
        content,
        baseRevision: liveRevisionRef.current,
      },
      (response: { ok: boolean; revision?: number; message?: string }) => {
        if (!response?.ok) {
          setSaveStatus('error');
          toast.error(response?.message || 'Failed to sync code');
          void refetchFiles(true);
          return;
        }

        if (response.revision !== undefined) {
          liveRevisionRef.current = response.revision;
        }
      }
    );
  };

  const updateCursor = (line: number, column: number) => {
    const socket = socketRef.current;
    if (!socket || !projectId || !activeFile?.path) {
      return;
    }

    socket.emit('cursor-move', {
      projectId,
      filePath: activeFile.path,
      line,
      column,
    });
  };

  const onlineUsers = useMemo(
    () => participants.filter((participant) => participant.is_online),
    [participants]
  );

  return {
    participants,
    onlineUsers,
    role,
    connectionStatus,
    saveStatus,
    lastSavedAt,
    sendCodeChange,
    updateCursor,
  };
};
