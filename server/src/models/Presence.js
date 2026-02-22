import mongoose from "mongoose";

const presenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      default: null,
      trim: true,
    },
    cursorLine: {
      type: Number,
      default: null,
    },
    cursorColumn: {
      type: Number,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

presenceSchema.index({ user: 1, project: 1 }, { unique: true });

const Presence = mongoose.model("Presence", presenceSchema);

export default Presence;
