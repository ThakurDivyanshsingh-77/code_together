import mongoose from "mongoose";
import Project from "../models/Project.js";
import ProjectCollaborator from "../models/ProjectCollaborator.js";

export const getProjectAccess = async (userId, projectId) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    return {
      exists: false,
      hasAccess: false,
      isOwner: false,
      project: null,
    };
  }

  const project = await Project.findById(projectId).lean();

  if (!project) {
    return {
      exists: false,
      hasAccess: false,
      isOwner: false,
      project: null,
    };
  }

  const ownerId = project.owner.toString();
  if (ownerId === userId) {
    return {
      exists: true,
      hasAccess: true,
      isOwner: true,
      project,
    };
  }

  const collaborator = await ProjectCollaborator.exists({
    project: project._id,
    user: userId,
  });

  return {
    exists: true,
    hasAccess: Boolean(collaborator),
    isOwner: false,
    project,
  };
};
