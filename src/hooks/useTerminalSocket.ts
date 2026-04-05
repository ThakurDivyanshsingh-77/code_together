import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { TerminalLine } from "@/types/editor";
import { useEditorStore } from "@/store/editorStore";

export const useTerminalSocket = () => {
  const { setIsTerminalRunning } = useEditorStore();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    
    // Connect to specific execution namespace
    const socket = io(`${backendUrl}/execution`, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Terminal execution socket bound:", socket.id);
    });

    socket.on("execution-started", (payload: { mode: string; language: string }) => {
      setLines([
        {
          type: "system",
          content: `[Starting ${payload.language} process via ${payload.mode} Engine]`,
          timestamp: new Date()
        }
      ]);
      setIsRunning(true);
      setIsTerminalRunning(true);
      setIsWaitingInput(false);
    });

    socket.on("output", (payload: { type: 'output' | 'error' | 'system', content: string }) => {
      setLines((prev) => [
        ...prev,
        {
          type: payload.type,
          content: payload.content,
          timestamp: new Date(),
        },
      ]);
      
      // If the process expects input, it hangs and the last line looks like a prompt or simply stops
      // E.g.: `a = input("Enter number: ")` prints `Enter number: ` natively without "\n".
      if (payload.type === 'output' && !payload.content.endsWith('\n') && !!payload.content.trim()) {
        setIsWaitingInput(true);
      } else {
         setIsWaitingInput(false);
      }

      if (payload.type === 'system' && payload.content.includes('[Process Finished')) {
        setIsRunning(false);
        setIsTerminalRunning(false);
        setIsWaitingInput(false);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const runCode = useCallback((code: string, language: string) => {
    if (!socketRef.current) return;
    setLines([]);
    setIsRunning(true);
    setIsTerminalRunning(true);
    socketRef.current.emit("run-code", { code, language });
  }, []);

  const sendInput = useCallback((input: string) => {
    if (!socketRef.current) return;
    
    // Visual echo
    setLines((prev) => [
      ...prev,
      {
        type: 'output',
        content: input + "\n",
        timestamp: new Date(),
      },
    ]);
    
    setIsWaitingInput(false); // Assume input consumed locally
    socketRef.current.emit("send-input", { input });
  }, []);

  const killProcess = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("kill-process");
    setIsRunning(false);
    setIsTerminalRunning(false);
    setIsWaitingInput(false);
  }, []);

  const clearTerminal = useCallback(() => {
    setLines([]);
  }, []);

  return {
    lines,
    isRunning,
    isWaitingInput,
    runCode,
    sendInput,
    killProcess,
    clearTerminal,
  };
};
