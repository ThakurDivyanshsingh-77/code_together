import express from 'express';
import { getProjectAccess } from '../utils/projectAccess.js';
import File from '../models/File.js';

const router = express.Router();

// AI file operations endpoint
router.post('/files/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { projectId, fileId, filePath, content, prompt } = req.body;
    const userId = req.auth.userId;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Check project access
    const accessResult = await getProjectAccess(userId, projectId);
    if (!accessResult.hasAccess) {
      return res.status(accessResult.exists ? 403 : 404).json({ message: accessResult.exists ? "Access denied" : "Project not found" });
    }

    let result;
    let filesContent = '';

    // Handle different AI file actions
    switch (action) {
      case 'read':
        if (!fileId) {
          return res.status(400).json({ message: "File ID is required for read action" });
        }
        const file = await File.findById(fileId);
        if (!file || file.project.toString() !== projectId) {
          return res.status(404).json({ message: "File not found" });
        }
        filesContent = `File: ${file.path}\n\nContent:\n${file.content || ''}`;
        break;

      case 'write':
        if (!fileId || !content) {
          return res.status(400).json({ message: "File ID and content are required for write action" });
        }
        // Update file content
        await File.findByIdAndUpdate(fileId, { content });
        
        // Get updated file for context
        const updatedFile = await File.findById(fileId);
        filesContent = `File: ${updatedFile?.path}\n\nContent Updated:\n${content}`;
        break;

      case 'create':
        if (!filePath || !content) {
          return res.status(400).json({ message: "File path and content are required for create action" });
        }
        // Create new file
        const getFileLanguage = (filename) => {
          const ext = filename.split('.').pop()?.toLowerCase();
          const languageMap = {
            js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
            py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown'
          };
          return languageMap[ext || ''] || 'plaintext';
        };

        const newFile = await File.create({
          name: filePath.split('/').pop(),
          path: filePath,
          type: 'file',
          content,
          language: getFileLanguage(filePath),
          project: projectId,
          parent_path: filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null,
        });
        
        filesContent = `Created File: ${filePath}\n\nContent:\n${content}`;
        break;

      case 'analyze':
        // Get all files in project
        const allFiles = await File.find({ project: projectId, type: 'file' });
        filesContent = allFiles.map(f => `File: ${f.path}\n${'='.repeat(50)}\n${f.content || ''}\n\n`).join('');
        break;

      case 'fix_errors':
        // Get all files with potential errors
        const errorFiles = await File.find({ project: projectId, type: 'file' });
        filesContent = errorFiles.map(f => `File: ${f.path}\n${'='.repeat(50)}\n${f.content || ''}\n\n`).join('');
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    // Build full prompt for AI
    const fullPrompt = `${prompt}\n\n${filesContent}`;

    // Call Groq API directly
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        message: "GROQ_API_KEY is not configured on the server",
      });
    }

    const initialModel = "llama-3.1-8b-instant"; // Force working model
    const fallbackModels = [initialModel, "mixtral-8x7b-32768", "gemma2-9b-it"];
    
    let reply = "";
    let finalModelUsed = initialModel;
    let groqResponse;
    let payload;

    for (const modelToTry of fallbackModels) {
      const endpoint = `https://api.groq.com/openai/v1/chat/completions`;

      const aiPrompt = `You are CodeCollab AI, a practical senior software engineer assistant.
Respond in Markdown. Be accurate, concise, and directly useful.

${action === 'fix_errors' ? 'Find and fix all errors in the provided code. Explain each issue and provide the corrected code.' :
  action === 'analyze' ? 'Analyze the entire project structure and provide insights about architecture, patterns, and potential improvements.' :
  action === 'read' ? 'Read and analyze the contents of this file, explaining what it does and any potential issues.' :
  action === 'write' ? 'Write/modify this file with the provided content. If code blocks are included, extract and apply them.' :
  action === 'create' ? 'Create a new file with the provided content. If code blocks are included, extract and create the file.' :
  'Process the request.'}

User request: ${fullPrompt}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        groqResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0.3,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      payload = await groqResponse.json();

      if (groqResponse.ok) {
        reply = payload.choices?.[0]?.message?.content || "";
        finalModelUsed = modelToTry;
        break; 
      } else {
        // If error is about the model not found, try the next fallback.
        const errorMessage = payload?.error?.message || "";
        if (errorMessage.includes("not found") || errorMessage.includes("not supported") || errorMessage.includes("invalid")) {
          continue; // Try next model in fallback list
        } else {
          // It's some other error, break out
          break;
        }
      }
    }

    if (!groqResponse.ok) {
      const message = payload?.error?.message || "Groq API request failed despite fallbacks";
      return res.status(502).json({ message });
    }

    if (!reply) {
      return res.status(502).json({
        message: "Groq API returned an empty response",
      });
    }

    // Handle AI response for file operations
    if (action === 'write' || action === 'create') {
      // Extract file content from AI response if it contains code blocks
      const codeBlockMatch = reply.match(/```[\w]*\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        const extractedContent = codeBlockMatch[1];
        
        if (action === 'write' && fileId) {
          await File.findByIdAndUpdate(fileId, { content: extractedContent });
        } else if (action === 'create' && filePath) {
          const getFileLanguage = (filename) => {
            const ext = filename.split('.').pop()?.toLowerCase();
            const languageMap = {
              js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
              py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown'
            };
            return languageMap[ext || ''] || 'plaintext';
          };

          await File.create({
            name: filePath.split('/').pop(),
            path: filePath,
            type: 'file',
            content: extractedContent,
            language: getFileLanguage(filePath),
            project: projectId,
            parent_path: filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null,
          });
        }
      }
    }

    return res.json({
      reply,
      action: action,
      fileId: action === 'create' ? 'new-file-created' : fileId,
    });

  } catch (error) {
    console.error('AI file operation error:', error);
    return res.status(500).json({ message: "AI file operation failed" });
  }
});

// Repair JSON that has unescaped newlines/tabs inside string values (common with AI-generated code)
function repairAndParseJSON(str) {
  // First try standard parse
  try { return JSON.parse(str); } catch (_) {}

  // Walk character-by-character and escape control chars inside strings
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) { out += ch; escaped = false; continue; }
    if (ch === '\\') { out += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; out += ch; continue; }
    if (inString) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }
    out += ch;
  }
  return JSON.parse(out); // throws if still invalid
}

// AI Execute: parse natural language command and directly apply file changes
router.post('/execute', async (req, res) => {
  try {
    const { projectId, command, currentFilePath } = req.body;
    const userId = req.auth.userId;

    if (!projectId || !command) {
      return res.status(400).json({ message: "Project ID and command are required" });
    }

    const accessResult = await getProjectAccess(userId, projectId);
    if (!accessResult.hasAccess) {
      return res.status(accessResult.exists ? 403 : 404).json({
        message: accessResult.exists ? "Access denied" : "Project not found"
      });
    }

    // Load all project files — give the current open file full content, others just paths
    const allFiles = await File.find({ project: projectId, type: 'file' }).lean();
    const CURRENT_FILE_LIMIT = 2000;
    const OTHER_FILE_LIMIT = 80;

    const currentFile = allFiles.find(f => f.path === currentFilePath);
    const otherFiles = allFiles.filter(f => f.path !== currentFilePath);

    const contextParts = [];

    if (currentFile) {
      const content = (currentFile.content || '');
      const truncated = content.length > CURRENT_FILE_LIMIT;
      contextParts.push(
        `### CURRENT FILE: ${currentFile.path}\n\`\`\`\n${content.slice(0, CURRENT_FILE_LIMIT)}${truncated ? '\n...(truncated)' : ''}\n\`\`\``
      );
    }

    if (otherFiles.length > 0) {
      const fileList = otherFiles.map(f => {
        const snippet = (f.content || '').slice(0, OTHER_FILE_LIMIT);
        return `- ${f.path}${snippet ? ': ' + snippet.replace(/\n/g, ' ') + (f.content.length > OTHER_FILE_LIMIT ? '…' : '') : ''}`;
      }).join('\n');
      contextParts.push(`### OTHER PROJECT FILES\n${fileList}`);
    }

    const projectContext = contextParts.join('\n\n');

    const systemPrompt = `You are an AI coding assistant with DIRECT write access to project files.
Respond ONLY with a valid JSON object — no markdown, no text outside JSON.

JSON schema:
{"reply":"<message to user>","changes":[{"action":"modify","path":"/file.html","content":"<FULL file content>"}],"summary":"<what changed>"}

CRITICAL RULES — READ CAREFULLY:
1. When the user asks you to ADD, CREATE, FIX, UPDATE, MODIFY, CHANGE, REMOVE, REFACTOR, or DO anything to a file — you MUST populate "changes" with the actual file content. NEVER just say you did it without including "changes".
2. The "content" field must be the COMPLETE new file content — not a snippet, not a description, the FULL text.
3. If no specific file is mentioned, apply the change to the current open file: ${currentFilePath || 'none'}.
4. NEVER reply "I added X" or "I updated Y" unless "changes" is also populated with the real content.
5. For pure questions, greetings, or explanations where no file edit is needed, "changes" can be [].
6. action "modify" = file already exists. action "create" = new file. action "delete" = remove file.

Example — user says "add inline CSS to login.html":
{"reply":"Added inline CSS styles to login.html.","changes":[{"action":"modify","path":"/login.html","content":"<!DOCTYPE html>\\n<html>\\n<head><title>Login</title></head>\\n<body style=\\"font-family:sans-serif\\">\\n...full content...\\n</body></html>"}],"summary":"Added inline CSS to login.html"}`;

    const userMessage = `${projectContext ? projectContext + '\n\n' : ''}User: ${command}`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GROQ_API_KEY is not configured" });
    }

    const models = ["llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"];
    let reply = "";
    let lastError = "";

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.2,
            max_tokens: 1500,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const payload = await groqRes.json();
        if (groqRes.ok) {
          reply = payload.choices?.[0]?.message?.content || "";
          break;
        } else {
          lastError = payload?.error?.message || "Unknown error";
          if (
            lastError.includes("decommissioned") ||
            lastError.includes("not found") ||
            lastError.includes("not supported") ||
            lastError.includes("Request too large") ||
            lastError.includes("rate_limit") ||
            lastError.includes("tokens per minute")
          ) {
            continue;
          }
          break;
        }
      } catch (e) {
        clearTimeout(timeoutId);
        lastError = e.message;
      }
    }

    if (!reply) {
      return res.status(502).json({ message: lastError || "AI returned empty response" });
    }

    // Parse JSON from AI response (strip any accidental markdown fences)
    let parsed;
    try {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      parsed = repairAndParseJSON(jsonMatch[0]);
    } catch (e) {
      // Still failed — try to extract reply text via regex rather than dumping raw JSON
      const replyMatch = reply.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const safeReply = replyMatch
        ? replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : 'I processed your request, but the response could not be parsed. Please try again.';
      return res.json({ reply: safeReply, changes: [], applied: [], summary: '' });
    }

    // Guard against the model nesting its full JSON response inside the "reply" field
    // e.g. parsed = { reply: '{"reply":"...", "changes":[...]}', changes: [] }
    if (parsed.reply && typeof parsed.reply === 'string' && parsed.reply.trim().startsWith('{')) {
      try {
        const inner = JSON.parse(parsed.reply);
        if (inner && (inner.changes || inner.reply)) {
          parsed = inner;
        }
      } catch (_) { /* not nested JSON, keep original */ }
    }

    const { reply: aiReply = '', thoughts, changes = [], summary } = parsed;
    const applied = [];

    const getFileLanguage = (filename) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      const map = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', html: 'html', css: 'css', json: 'json', md: 'markdown',
        sh: 'shell', yaml: 'yaml', yml: 'yaml', txt: 'plaintext'
      };
      return map[ext || ''] || 'plaintext';
    };

    for (const change of changes) {
      const { action, path: filePath, content } = change;
      if (!filePath) continue;

      try {
        if (action === 'create') {
          // Check if already exists
          const existing = await File.findOne({ project: projectId, path: filePath });
          if (existing) {
            await File.findByIdAndUpdate(existing._id, { content: content || '' });
            applied.push({ action: 'modified', path: filePath });
          } else {
            await File.create({
              name: filePath.split('/').pop(),
              path: filePath,
              type: 'file',
              content: content || '',
              language: getFileLanguage(filePath),
              project: projectId,
              parent_path: filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null,
            });
            applied.push({ action: 'created', path: filePath });
          }
        } else if (action === 'modify') {
          const existing = await File.findOne({ project: projectId, path: filePath });
          if (existing) {
            await File.findByIdAndUpdate(existing._id, { content: content || '' });
            applied.push({ action: 'modified', path: filePath });
          } else {
            // Create if doesn't exist
            await File.create({
              name: filePath.split('/').pop(),
              path: filePath,
              type: 'file',
              content: content || '',
              language: getFileLanguage(filePath),
              project: projectId,
              parent_path: filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : null,
            });
            applied.push({ action: 'created', path: filePath });
          }
        } else if (action === 'delete') {
          const existing = await File.findOne({ project: projectId, path: filePath });
          if (existing) {
            await File.findByIdAndDelete(existing._id);
            applied.push({ action: 'deleted', path: filePath });
          }
        }
      } catch (err) {
        applied.push({ action: 'error', path: filePath, error: err.message });
      }
    }

    return res.json({ reply: aiReply, thoughts, summary, applied });

  } catch (error) {
    console.error('AI execute error:', error);
    return res.status(500).json({ message: "AI execute failed: " + error.message });
  }
});

export default router;
