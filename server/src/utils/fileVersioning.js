import FileVersion from "../models/FileVersion.js";

export const createFileVersionSnapshot = async ({
  file,
  userId = null,
  userName = null,
  source = "manual",
}) => {
  if (!file || file.type !== "file") {
    return null;
  }

  return FileVersion.create({
    file: file._id,
    project: file.project,
    revision: file.revision,
    name: file.name,
    path: file.path,
    language: file.language || null,
    content: file.content || "",
    updatedBy: userId || null,
    updatedByName: userName || null,
    source,
  });
};
