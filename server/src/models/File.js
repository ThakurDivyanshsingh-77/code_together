import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      required: true,
    },
    content: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: null,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },
    parentPath: {
      type: String,
      default: null,
      trim: true,
    },
    lockOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    lockOwnerName: {
      type: String,
      default: null,
      trim: true,
    },
    lockExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ project: 1, path: 1 }, { unique: true });

const File = mongoose.model("File", fileSchema);

export default File;
