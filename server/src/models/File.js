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
    parentPath: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ project: 1, path: 1 }, { unique: true });

const File = mongoose.model("File", fileSchema);

export default File;
