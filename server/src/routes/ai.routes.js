import express from "express";

const router = express.Router();

const SUPPORTED_ACTIONS = new Set([
  "explain_selected_code",
  "fix_bugs",
  "refactor_code",
  "generate_function",
  "chat_about_file",
]);

const MAX_CONTEXT_CHARS = 12000;

const clampText = (value, maxChars = MAX_CONTEXT_CHARS) => {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
};

const normalizeConversation = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: clampText(item.content, 2000) }],
    }));
};

const ACTION_INSTRUCTIONS = {
  explain_selected_code:
    "Explain the selected code in clear steps. Cover purpose, flow, edge cases, and complexity where relevant.",
  fix_bugs:
    "Find concrete bugs and provide corrected code. Mention each bug, why it is wrong, and the fix.",
  refactor_code:
    "Refactor for readability, maintainability, and performance without changing behavior. Provide improved code.",
  generate_function:
    "Generate a production-ready function based on the request and file context. Include function code and short usage.",
  chat_about_file:
    "Answer questions about the current file and codebase context with practical developer guidance.",
};

const buildPrompt = ({ action, prompt, fileName, fileLanguage, fileContent, selectedCode }) => {
  const actionInstruction = ACTION_INSTRUCTIONS[action] || ACTION_INSTRUCTIONS.chat_about_file;

  const selectedSection = selectedCode
    ? `Selected code:\n\`\`\`${fileLanguage || ""}\n${clampText(selectedCode, 4000)}\n\`\`\``
    : "Selected code: none";

  const fileSection = fileContent
    ? `Current file (${fileName || "unknown"}${fileLanguage ? `, ${fileLanguage}` : ""}):\n\`\`\`${fileLanguage || ""}\n${clampText(
        fileContent
      )}\n\`\`\``
    : "Current file content: unavailable";

  return [
    "You are CodeCollab AI, a practical senior software engineer assistant.",
    "Respond in Markdown. Be accurate, concise, and directly useful.",
    actionInstruction,
    "",
    `User request: ${prompt}`,
    "",
    selectedSection,
    "",
    fileSection,
  ].join("\n");
};

const extractTextFromGeminiResponse = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
};

router.post("/chat", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    const action = String(req.body?.action || "chat_about_file").trim();
    const fileName = req.body?.fileName ? String(req.body.fileName) : null;
    const fileLanguage = req.body?.fileLanguage ? String(req.body.fileLanguage) : null;
    const fileContent = req.body?.fileContent ? String(req.body.fileContent) : "";
    const selectedCode = req.body?.selectedCode ? String(req.body.selectedCode) : "";
    const conversation = normalizeConversation(req.body?.conversation);

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    if (!SUPPORTED_ACTIONS.has(action)) {
      return res.status(400).json({ message: "Unsupported AI action" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: "GEMINI_API_KEY is not configured on the server",
      });
    }

    const initialModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim().replace(/['"]/g, '');
    const fallbackModels = [initialModel, "gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.0-pro"];
    
    let reply = "";
    let finalModelUsed = initialModel;
    let geminiResponse;
    let payload;

    for (const modelToTry of fallbackModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelToTry
      )}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

      const finalPrompt = buildPrompt({
        action,
        prompt,
        fileName,
        fileLanguage,
        fileContent,
        selectedCode,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        geminiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [...conversation, { role: "user", parts: [{ text: finalPrompt }] }],
            generationConfig: {
              temperature: 0.3,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      payload = await geminiResponse.json();

      if (geminiResponse.ok) {
        reply = extractTextFromGeminiResponse(payload);
        finalModelUsed = modelToTry;
        break; 
      } else {
        // If error is about the model not found, try the next fallback.
        const errorMessage = payload?.error?.message || "";
        if (errorMessage.includes("is not found") || errorMessage.includes("not supported")) {
          continue; // Try next model in fallback list
        } else {
          // It's some other error, break out
          break;
        }
      }
    }

    if (!geminiResponse.ok) {
      const message = payload?.error?.message || "Gemini API request failed despite fallbacks";
      return res.status(502).json({ message });
    }

    if (!reply) {
      return res.status(502).json({
        message: "Gemini API returned an empty response",
      });
    }

    return res.json({
      reply,
      model: finalModelUsed,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        message: "AI request timed out. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to process AI request",
    });
  }
});

export default router;
