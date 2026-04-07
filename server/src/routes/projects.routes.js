import express from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import ProjectCollaborator from "../models/ProjectCollaborator.js";
import File from "../models/File.js";
import Presence from "../models/Presence.js";
import ChatMessage from "../models/ChatMessage.js";
import User from "../models/User.js";
import { getProjectAccess } from "../utils/projectAccess.js";
import { serializeProject, serializeCollaborator } from "../utils/serializers.js";

const router = express.Router();

const collaboratorRoles = new Set(["viewer", "editor", "admin"]);

const ensureProjectExistsAndAccess = async (userId, projectId) => {
  const access = await getProjectAccess(userId, projectId);

  if (!access.exists) {
    return { status: 404, message: "Project not found", access };
  }

  if (!access.hasAccess) {
    return { status: 403, message: "You do not have access to this project", access };
  }

  return { status: 200, access };
};

router.get("/", async (req, res) => {
  try {
    const collaboratorRows = await ProjectCollaborator.find({ user: req.auth.userId })
      .select("project role")
      .lean();

    const collaboratorProjectIds = collaboratorRows.map((row) => row.project);
    const collaboratorRoleMap = new Map(
      collaboratorRows.map((row) => [row.project.toString(), row.role])
    );

    const projects = await Project.find({
      $or: [{ owner: req.auth.userId }, { _id: { $in: collaboratorProjectIds } }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(
      projects.map((project) =>
        serializeProject({
          ...project,
          currentRole:
            project.owner.toString() === req.auth.userId
              ? "owner"
              : collaboratorRoleMap.get(project._id.toString()) || null,
        })
      )
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to load projects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const descriptionRaw = req.body?.description;

    if (!name) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      name,
      description: descriptionRaw ? String(descriptionRaw).trim() : null,
      owner: req.auth.userId,
    });

    return res.status(201).json(serializeProject({ ...project.toObject(), currentRole: "owner" }));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create project" });
  }
});

router.patch("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ message: "Only the project owner can update this project" });
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) {
        return res.status(400).json({ message: "Project name cannot be empty" });
      }
      project.name = name;
    }

    if (req.body?.description !== undefined) {
      const description = String(req.body.description || "").trim();
      project.description = description || null;
    }

    await project.save();

    return res.json(
      serializeProject({
        ...project.toObject(),
        currentRole: project.owner.toString() === req.auth.userId ? "owner" : null,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to update project" });
  }
});

router.delete("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log('Delete request received for project:', projectId);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      console.log('Invalid project ID:', projectId);
      return res.status(404).json({ message: "Project not found" });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      console.log('Project not found in database:', projectId);
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== req.auth.userId) {
      console.log('User not authorized to delete project. Owner:', project.owner, 'Requester:', req.auth.userId);
      return res.status(403).json({ message: "Only the project owner can delete this project" });
    }

    console.log('Deleting project and all related data for:', projectId);
    await Promise.all([
      Project.deleteOne({ _id: projectId }),
      ProjectCollaborator.deleteMany({ project: projectId }),
      File.deleteMany({ project: projectId }),
      Presence.deleteMany({ project: projectId }),
      ChatMessage.deleteMany({ project: projectId }),
    ]);

    console.log('Successfully deleted project:', projectId);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return res.status(500).json({ message: "Failed to delete project" });
  }
});

router.get("/:projectId/collaborators", async (req, res) => {
  try {
    const { projectId } = req.params;
    const accessResult = await ensureProjectExistsAndAccess(req.auth.userId, projectId);

    if (accessResult.status !== 200) {
      return res.status(accessResult.status).json({ message: accessResult.message });
    }

    const collaborators = await ProjectCollaborator.find({ project: projectId })
      .populate("user", "displayName avatarUrl color")
      .lean();

    return res.json(collaborators.map(serializeCollaborator));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load collaborators" });
  }
});

router.post("/:projectId/collaborators", async (req, res) => {
  try {
    const { projectId } = req.params;
    const email = String(req.body?.email || "").trim().toLowerCase();
    const role = String(req.body?.role || "editor").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!collaboratorRoles.has(role)) {
      return res.status(400).json({ message: "Invalid collaborator role" });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ message: "Only the project owner can invite collaborators" });
    }

    const invitedUser = await User.findOne({ email }).lean();
    if (!invitedUser) {
      return res.status(404).json({ message: "No user found with that email address" });
    }

    if (invitedUser._id.toString() === req.auth.userId) {
      return res.status(400).json({ message: "You are already the owner of this project" });
    }

    const collaborator = await ProjectCollaborator.create({
      project: projectId,
      user: invitedUser._id,
      role,
    });

    const populatedCollaborator = await ProjectCollaborator.findById(collaborator._id)
      .populate("user", "displayName avatarUrl color")
      .lean();

    return res.status(201).json(serializeCollaborator(populatedCollaborator));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This user is already a collaborator" });
    }

    return res.status(500).json({ message: "Failed to add collaborator" });
  }
});

router.delete("/:projectId/collaborators/:collaboratorId", async (req, res) => {
  try {
    const { projectId, collaboratorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(collaboratorId)) {
      return res.status(404).json({ message: "Collaborator not found" });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.owner.toString() !== req.auth.userId) {
      return res.status(403).json({ message: "Only the project owner can remove collaborators" });
    }

    const deletedCollaborator = await ProjectCollaborator.findOneAndDelete({
      _id: collaboratorId,
      project: projectId,
    });

    if (!deletedCollaborator) {
      return res.status(404).json({ message: "Collaborator not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove collaborator" });
  }
});

export default router;
