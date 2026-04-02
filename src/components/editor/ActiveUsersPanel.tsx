import React from 'react';
import { Eye, PencilLine, Users } from 'lucide-react';
import { PresenceParticipant } from '@/hooks/useCollaborationSession';
import { cn } from '@/lib/utils';

interface ActiveUsersPanelProps {
  className?: string;
  users: PresenceParticipant[];
  currentUserId: string | null;
  activeFilePath: string | null;
}

const getPresenceLabel = (user: PresenceParticipant, activeFilePath: string | null) => {
  if (!user.file_path) {
    return 'viewing';
  }

  if (activeFilePath && user.file_path === activeFilePath) {
    if (user.cursor_line) {
      return `editing line ${user.cursor_line}`;
    }

    return 'viewing this file';
  }

  const segments = user.file_path.split('/');
  const shortPath = segments[segments.length - 1] || user.file_path;
  return `viewing ${shortPath}`;
};

export const ActiveUsersPanel: React.FC<ActiveUsersPanelProps> = ({
  className,
  users,
  currentUserId,
  activeFilePath,
}) => {
  return (
    <div className={cn('flex flex-col border-b border-border', className)}>
      <div className="panel-header">
        <span>Active Users</span>
        <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
          {users.length} online
        </span>
      </div>

      <div className="max-h-[320px] overflow-auto">
        {users.length === 0 && (
          <div className="px-4 py-5 text-sm text-muted-foreground">
            No one else is in this project right now.
          </div>
        )}

        {users.map((participant) => {
          const isCurrentUser = participant.user_id === currentUserId;
          const label = getPresenceLabel(participant, activeFilePath);
          const color = participant.profile?.color || 1;
          const displayName =
            participant.profile?.display_name || (isCurrentUser ? 'You' : 'Unknown collaborator');

          return (
            <div
              key={participant.user_id}
              className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
            >
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-xs font-semibold text-white"
                style={{ backgroundColor: `hsl(var(--user-${color}))` }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {displayName}
                    {isCurrentUser ? ' (you)' : ''}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {label.includes('editing') ? (
                    <PencilLine className="h-3 w-3" />
                  ) : label.includes('viewing') ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  <span className="truncate">{label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
