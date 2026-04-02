import mongoose from "mongoose";

const fileVersionSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    revision: {
      type: Number,
      required: true,
      min: 0,
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
    language: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    updatedByName: {
      type: String,
      default: null,
      trim: true,
    },
    source: {
      type: String,
      enum: ["manual", "autosave", "system"],
      default: "manual",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

fileVersionSchema.index({ file: 1, revision: -1 }, { unique: true });

const FileVersion = mongoose.model("FileVersion", fileVersionSchema);

export default FileVersion;
