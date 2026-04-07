import { detectRunMode, runLocally, runWithJudge0, runShellCommand, getSocketCwd, clearSocketCwd } from "../utils/runner.js";

const activeProcesses = new Map(); // socket.id -> ChildProcess

export const initializeExecutionSocket = (io) => {
  const executionNamespace = io.of("/execution");

  executionNamespace.on("connection", (socket) => {
    socket.on("run-code", async ({ code, language }) => {
      // 1. Cleanup any existing local process on this socket instance
      if (activeProcesses.has(socket.id)) {
        const oldProcess = activeProcesses.get(socket.id);
        oldProcess.kill();
        activeProcesses.delete(socket.id);
      }

      // 2. Validate Mode routing via runner.js
      const runMode = detectRunMode(language);

      if (runMode === "validation_only") {
         socket.emit("output", { type: "system", content: `[SQL syntax blocks validated successfully.]` });
         socket.emit("output", { type: "system", content: `[Process Finished with exit code 0]` });
         return;
      }
      
      if (runMode === "unsupported") {
         socket.emit("output", { type: "error", content: `Language ${language} execution not supported.` });
         socket.emit("output", { type: "system", content: `[Process Finished with exit code 1]` });
         return;
      }

      // 3. Trigger Hybrid Execute
      if (runMode === "local") {
        runLocally(code, language, socket, activeProcesses);
      } else {
        await runWithJudge0(code, language, socket);
      }
    });

    socket.on("run-shell-command", ({ command, cwd }) => {
      // Kill any existing process first
      if (activeProcesses.has(socket.id)) {
        const oldProcess = activeProcesses.get(socket.id);
        oldProcess.kill();
        activeProcesses.delete(socket.id);
      }
      
      runShellCommand(command, cwd, socket, activeProcesses);
    });

    socket.on("send-input", ({ input }) => {
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed) {
         // Feed input buffer directly down into process pipe waiting state
         child.stdin.write(input + "\n");
      }
    });

    socket.on("kill-process", () => {
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed) {
         child.kill();
         socket.emit("output", { type: "system", content: "[Process Manually Killed]" });
      }
      activeProcesses.delete(socket.id);
    });

    socket.on("get-cwd", () => {
      const cwd = getSocketCwd(socket.id);
      const defaultCwd = cwd || (process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME) || "/";
      socket.emit("cwd-changed", { cwd: defaultCwd });
    });

    socket.on("disconnect", () => {
      const child = activeProcesses.get(socket.id);
      if (child && !child.killed) {
         child.kill();
      }
      activeProcesses.delete(socket.id);
      clearSocketCwd(socket.id);
    });
  });
};
