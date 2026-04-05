import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const JUDGE0_MAP = {
  cpp: 54,
  c: 50,
  java: 62,
  typescript: 74,
  go: 60,
  rust: 73,
  csharp: 51,
  kotlin: 78,
  swift: 83,
  r: 80,
};

export const LOCAL_MAP = {
  python: "python3",
  javascript: "node",
  shell: "bash",
  php: "php",
  sql: "sql", // SQL is just validation per user request
};

export const MAP_LANGUAGE_TO_EXTENSION = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rs",
  php: "php",
  shell: "sh",
  csharp: "cs",
  kotlin: "kt",
  swift: "swift",
  r: "r",
  sql: "sql",
};

export const detectRunMode = (language) => {
  const lang = language.toLowerCase();
  
  if (lang === "sql") return "validation_only";
  if (LOCAL_MAP[lang]) return "local";
  
  // typescript can run in judge0 per the requirements (74)
  if (JUDGE0_MAP[lang]) return "judge0";

  // Fallbacks: defaults to judge0 if unknown but we have a judge0 map
  return "unsupported";
};

// ---------------------------------------------------------
// LOCAL SPAWNER
// ---------------------------------------------------------

const buildLocalExecutionCommand = (language, filePath) => {
  const lang = language.toLowerCase();
  
  switch (lang) {
    case "python":
    case "py":
      return { 
        cmd: os.platform() === "win32" ? "python" : "python3", 
        args: ["-u", filePath] 
      };
    case "javascript":
    case "js":
      return { 
        cmd: "node", 
        args: ["--experimental-vm-modules", filePath] 
      };
    case "shell":
    case "sh":
      return {
        cmd: os.platform() === "win32" ? "cmd.exe" : "bash",
        args: os.platform() === "win32" ? ["/c", filePath] : [filePath]
      };
    case "php":
      return {
        cmd: "php",
        args: ["-f", filePath]
      };
    default:
      return null;
  }
};

export const runLocally = (code, language, socket, activeMap) => {
  const ext = MAP_LANGUAGE_TO_EXTENSION[language.toLowerCase()] || "txt";
  const tempDir = os.tmpdir();
  const randomID = Math.random().toString(36).substring(7);
  const filePath = path.join(tempDir, `exec_${socket.id}_${randomID}.${ext}`);

  try {
    fs.writeFileSync(filePath, code);
  } catch (err) {
    socket.emit("output", { type: "error", content: "Server failed to write temporary execution payload." });
    return;
  }

  const execData = buildLocalExecutionCommand(language, filePath);
  if (!execData) {
    socket.emit("output", { type: "error", content: `Execution engine for ${language} execution command failed.` });
    return;
  }

  try {
    const startTime = Date.now();
    const child = spawn(execData.cmd, execData.args, {
      cwd: tempDir,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    activeMap.set(socket.id, child);

    socket.emit("execution-started", { mode: "local", language });

    child.stdout.on("data", (data) => {
      socket.emit("output", { type: "output", content: data.toString() });
    });

    child.stderr.on("data", (data) => {
      socket.emit("output", { type: "error", content: data.toString() });
    });

    child.on("close", (code) => {
      const timeSecs = ((Date.now() - startTime) / 1000).toFixed(2);
      socket.emit("output", { type: "system", content: `[Finished in ${timeSecs}s]` });
      socket.emit("output", { type: "system", content: `[Process Finished with exit code ${code || 0}]` });
      
      activeMap.delete(socket.id);
      try { fs.unlinkSync(filePath); } catch(e) {}
    });

    child.on("error", (err) => {
      socket.emit("output", { type: "error", content: `Failed to start process: ${err.message}` });
      activeMap.delete(socket.id);
      try { fs.unlinkSync(filePath); } catch(e) {}
    });

    // 30 seconds max timeout
    setTimeout(() => {
      if (activeMap.has(socket.id)) {
          socket.emit("output", { type: "error", content: "[Execution Timeout: Force Killed Process (exceeded 30s)]" });
          child.kill();
          activeMap.delete(socket.id);
          try { fs.unlinkSync(filePath); } catch(e) {}
      }
    }, 30000); 

  } catch (e) {
    socket.emit("output", { type: "error", content: "Failed to spawn child wrapper." });
    activeMap.delete(socket.id);
    try { fs.unlinkSync(filePath); } catch(e) {}
  }
};

// ---------------------------------------------------------
// JUDGE0 RUNNER
// ---------------------------------------------------------

export const runWithJudge0 = async (code, language, socket) => {
  const langId = JUDGE0_MAP[language.toLowerCase()];
  if (!langId) {
    socket.emit("output", { type: "error", content: `Judge0 mapping not found for ${language}` });
    return;
  }

  socket.emit("execution-started", { mode: "judge0", language });
  socket.emit("output", { type: "system", content: "[Compiling...]" });

  try {
    const submitStart = Date.now();
    
    // Submit code to Judge0
    const submissionRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
      }),
    });

    if (!submissionRes.ok) {
      const errTxt = await submissionRes.text();
      throw new Error(`Judge0 API Error: ${submissionRes.status} ${errTxt}`);
    }

    const result = await submissionRes.json();
    const timeSecs = ((Date.now() - submitStart) / 1000).toFixed(2);
    
    socket.emit("output", { type: "system", content: "[Running...]" });

    // Output parsing
    if (result.compile_output) {
      socket.emit("output", { type: "error", content: result.compile_output });
    }
    
    if (result.stdout) {
      socket.emit("output", { type: "output", content: result.stdout });
    }
    
    if (result.stderr) {
      socket.emit("output", { type: "error", content: result.stderr });
    }
    
    // Edge case handling per user setup
    if (!result.stdout && !result.stderr && !result.compile_output) {
      socket.emit("output", { type: "system", content: "[No output produced]" });
    }
    
    // Status metrics
    socket.emit("output", { 
      type: "system", 
      content: `[Time: ${result.time || timeSecs}s | Memory: ${result.memory ? (result.memory / 1024).toFixed(2) : '0.00'}MB]` 
    });
    
    socket.emit("output", { 
      type: "system", 
      content: `[Process Finished with exit code ${result.status?.id === 3 ? 0 : result.status?.id || 1}]` 
    });

  } catch (error) {
    socket.emit("output", { type: "error", content: `Judge0 Error: ${error.message}` });
    if (error.message.includes("429")) {
        socket.emit("output", { type: "error", content: "NOTE: Public API hits rate limits occasionally. Try again soon." });
    }
  }
};
