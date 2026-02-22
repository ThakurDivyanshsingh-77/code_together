const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
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

export const serializeFile = (file) => ({
  id: toId(file._id),
  project_id: toId(file.project),
  name: file.name,
  path: file.path,
  type: file.type,
  content: file.content || null,
  language: file.language || null,
  parent_path: file.parentPath || null,
  created_at: new Date(file.createdAt).toISOString(),
  updated_at: new Date(file.updatedAt).toISOString(),
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
});
