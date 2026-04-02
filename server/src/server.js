import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDatabase } from "./config/db.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import filesRoutes from "./routes/files.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import presenceRoutes from "./routes/presence.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { initializeCollaborationSocket } from "./socket/collaboration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const httpServer = http.createServer(app);

const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: configuredOrigins.length > 0 ? configuredOrigins : true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", requireAuth, projectsRoutes);
app.use("/api/projects", requireAuth, filesRoutes);
app.use("/api/projects", requireAuth, chatRoutes);
app.use("/api/projects", requireAuth, presenceRoutes);
app.use("/api/ai", requireAuth, aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  try {
    await connectDatabase();
    initializeCollaborationSocket({
      server: httpServer,
      app,
      corsOrigins: configuredOrigins,
    });

    httpServer.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
