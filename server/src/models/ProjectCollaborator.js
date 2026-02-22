import mongoose from "mongoose";

const projectCollaboratorSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["viewer", "editor", "admin"],
      default: "editor",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

projectCollaboratorSchema.index({ project: 1, user: 1 }, { unique: true });

const ProjectCollaborator = mongoose.model("ProjectCollaborator", projectCollaboratorSchema);

export default ProjectCollaborator;
