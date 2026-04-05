const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") {
      return value.toHexString();
    }
    if ("_id" in value && value._id !== value) return toId(value._id);
    if ("id" in value && value.id !== value) return toId(value.id);
  }
  if (value.toString) return value.toString();
  return String(value);
};

export const serializeUser = (user) => ({
  id: toId(user._id),
  email: user.email,
});

export const serializeProfile = (user) => ({
  id: toId(user._id),
  user_id: toId(user._id),
  display_name: user.displayName,
  avatar_url: user.avatarUrl || null,
  color: user.color,
});

export const serializeProject = (project) => ({
  id: toId(project._id),
  name: project.name,
  description: project.description || null,
  owner_id: toId(project.owner),
  current_role: project.currentRole || null,
  created_at: new Date(project.createdAt).toISOString(),
  updated_at: new Date(project.updatedAt).toISOString(),
});

export const serializeCollaborator = (collaborator) => {
  const hasPopulatedUser =
    collaborator.user && typeof collaborator.user === "object" && "displayName" in collaborator.user;

  const user = hasPopulatedUser ? collaborator.user : null;

  return {
    id: toId(collaborator._id),
    user_id: user ? toId(user._id) : toId(collaborator.user),
    role: collaborator.role,
    display_name: user?.displayName || "Unknown",
    avatar_url: user?.avatarUrl || null,
    color: user?.color || 1,
  };
};

export const serializeFile = (file) => {
  const lockExpiresAt = file.lockExpiresAt ? new Date(file.lockExpiresAt) : null;
  const hasActiveLock =
    Boolean(file.lockOwner) && lockExpiresAt instanceof Date && !Number.isNaN(lockExpiresAt.getTime()) && lockExpiresAt.getTime() > Date.now();

  return {
    id: toId(file._id),
    project_id: toId(file.project),
    name: file.name,
    path: file.path,
    type: file.type,
    content: file.content || null,
    language: file.language || null,
    revision: Number(file.revision || 0),
    parent_path: file.parentPath || null,
    locked: hasActiveLock,
    lock: hasActiveLock
      ? {
          user_id: toId(file.lockOwner),
          user_name: file.lockOwnerName || null,
          expires_at: lockExpiresAt.toISOString(),
        }
      : null,
    last_updated: new Date(file.updatedAt).toISOString(),
    created_at: new Date(file.createdAt).toISOString(),
    updated_at: new Date(file.updatedAt).toISOString(),
  };
};

export const serializeFileVersion = (version) => ({
  id: toId(version._id),
  file_id: toId(version.file),
  project_id: toId(version.project),
  revision: Number(version.revision || 0),
  name: version.name,
  path: version.path,
  language: version.language || null,
  content: version.content || "",
  updated_by: toId(version.updatedBy),
  updated_by_name: version.updatedByName || "Unknown",
  source: version.source || "manual",
  created_at: new Date(version.createdAt).toISOString(),
});

export const serializePresence = (presence, profile) => ({
  id: toId(presence._id),
  user_id: toId(presence.user),
  project_id: toId(presence.project),
  file_path: presence.filePath || null,
  cursor_line: presence.cursorLine ?? null,
  cursor_column: presence.cursorColumn ?? null,
  is_online: Boolean(presence.isOnline),
  last_seen: new Date(presence.lastSeen).toISOString(),
  profile: profile
    ? {
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl || null,
        color: profile.color,
      }
    : undefined,
});

export const serializeChatMessage = (message, profile) => ({
  id: toId(message._id),
  project_id: toId(message.project),
  user_id: toId(message.user),
  content: message.content,
  type: message.type,
  created_at: new Date(message.createdAt).toISOString(),
  user_name: profile?.displayName || "Unknown",
  user_color: profile?.color || 1,
  reactions: message.reactions ? Object.fromEntries(message.reactions) : {},
});
