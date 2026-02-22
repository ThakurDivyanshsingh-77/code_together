// Sandboxed Code Executor
// Supports JavaScript (iframe sandbox) and Python (Pyodide WebAssembly)

export interface ExecutionResult {
  success: boolean;
  output: string[];
  error?: string;
  executionTime: number;
}

// Execute JavaScript code in a sandboxed iframe
export const executeJavaScript = async (code: string, timeout = 5000): Promise<ExecutionResult> => {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const output: string[] = [];
    let hasResolved = false;

    // Create a sandboxed iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        cleanup();
        resolve({
          success: false,
          output,
          error: `Execution timed out after ${timeout}ms`,
          executionTime: timeout,
        });
      }
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      const { type, data } = event.data || {};

      if (type === 'console') {
        output.push(data);
      } else if (type === 'result') {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          resolve({
            success: true,
            output,
            executionTime: performance.now() - startTime,
          });
        }
      } else if (type === 'error') {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          resolve({
            success: false,
            output,
            error: data,
            executionTime: performance.now() - startTime,
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Inject the sandboxed execution code
    const sandboxCode = `
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          (function() {
            // Override console methods to capture output
            const originalConsole = console;
            const send = (type, data) => {
              parent.postMessage({ type, data }, '*');
            };

            console = {
              log: (...args) => send('console', args.map(a => 
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              ).join(' ')),
              error: (...args) => send('console', '❌ ' + args.map(a => 
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              ).join(' ')),
              warn: (...args) => send('console', '⚠️ ' + args.map(a => 
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              ).join(' ')),
              info: (...args) => send('console', 'ℹ️ ' + args.map(a => 
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
              ).join(' ')),
              table: (data) => send('console', JSON.stringify(data, null, 2)),
              clear: () => {},
            };

            // Block potentially dangerous APIs
            window.fetch = undefined;
            window.XMLHttpRequest = undefined;
            window.WebSocket = undefined;
            window.localStorage = undefined;
            window.sessionStorage = undefined;
            window.indexedDB = undefined;
            window.open = undefined;
            window.close = undefined;

            // Execute user code
            try {
              const userCode = ${JSON.stringify(code)};
              const result = eval(userCode);
              if (result !== undefined) {
                send('console', '→ ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
              }
              send('result', 'success');
            } catch (e) {
              send('error', e.name + ': ' + e.message);
            }
          })();
        <\/script>
      </head>
      <body></body>
      </html>
    `;

    iframe.srcdoc = sandboxCode;
  });
};

// Execute Python code using Pyodide (Python compiled to WebAssembly)
export const executePython = async (code: string, timeout = 30000): Promise<ExecutionResult> => {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const output: string[] = [];
    let hasResolved = false;

    // Create a sandboxed iframe for Python execution
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);

    // Set up timeout (longer for Python due to Pyodide load time)
    const timeoutId = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        cleanup();
        resolve({
          success: false,
          output,
          error: `Execution timed out after ${timeout}ms`,
          executionTime: timeout,
        });
      }
    }, timeout);

    const cleanup = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      const { type, data } = event.data || {};

      if (type === 'console') {
        output.push(data);
      } else if (type === 'loading') {
        output.push(data);
      } else if (type === 'result') {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          resolve({
            success: true,
            output,
            executionTime: performance.now() - startTime,
          });
        }
      } else if (type === 'error') {
        if (!hasResolved) {
          hasResolved = true;
          cleanup();
          resolve({
            success: false,
            output,
            error: data,
            executionTime: performance.now() - startTime,
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Inject Python execution with Pyodide
    const pythonSandboxCode = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"><\/script>
        <script>
          (async function() {
            const send = (type, data) => {
              parent.postMessage({ type, data }, '*');
            };

            try {
              send('loading', '🐍 Loading Python environment...');
              
              const pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
              });
              
              send('loading', '✓ Python ready');

              // Redirect stdout and stderr
              pyodide.runPython(\`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self, callback):
        self.callback = callback
        self.buffer = StringIO()
    
    def write(self, text):
        if text.strip():
            self.callback(text.rstrip())
        self.buffer.write(text)
    
    def flush(self):
        pass

def create_output_handler():
    from js import parent
    def send_output(text):
        parent.postMessage({"type": "console", "data": text}, "*")
    return send_output

sys.stdout = OutputCapture(create_output_handler())
sys.stderr = OutputCapture(create_output_handler())
\`);

              // Execute user code
              const userCode = ${JSON.stringify(code)};
              
              try {
                const result = pyodide.runPython(userCode);
                if (result !== undefined && result !== null) {
                  const resultStr = pyodide.runPython(\`repr(\${JSON.stringify(userCode.split('\\n').pop() || '')})\`) || String(result);
                  if (result.toString() !== 'None') {
                    send('console', '→ ' + result.toString());
                  }
                }
                send('result', 'success');
              } catch (pythonError) {
                send('error', pythonError.message);
              }
            } catch (e) {
              send('error', 'Failed to load Python: ' + e.message);
            }
          })();
        <\/script>
      </head>
      <body></body>
      </html>
    `;

    iframe.srcdoc = pythonSandboxCode;
  });
};

// Simple syntax validation before execution
export const validateJavaScript = (code: string): { valid: boolean; error?: string } => {
  try {
    new Function(code);
    return { valid: true };
  } catch (e) {
    return { 
      valid: false, 
      error: e instanceof Error ? e.message : 'Syntax error' 
    };
  }
};

// Supported languages for execution
export const supportedLanguages = ['javascript', 'typescript', 'python'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const isExecutableLanguage = (language: string): language is SupportedLanguage => {
  return supportedLanguages.includes(language as SupportedLanguage);
};

// Get the executor function for a language
export const executeCode = async (code: string, language: SupportedLanguage): Promise<ExecutionResult> => {
  switch (language) {
    case 'python':
      return executePython(code);
    case 'typescript':
      return executeJavaScript(stripTypeScript(code));
    case 'javascript':
    default:
      return executeJavaScript(code);
  }
};

// Strip TypeScript types for execution (basic approach)
export const stripTypeScript = (code: string): string => {
  // Remove type annotations (basic implementation)
  return code
    // Remove interface and type declarations
    .replace(/^(export\s+)?(interface|type)\s+\w+[\s\S]*?(?=\n\n|\nexport|\nconst|\nlet|\nvar|\nfunction|\nclass|$)/gm, '')
    // Remove type annotations from variables
    .replace(/:\s*[\w\[\]<>,\s|&'"{}()=?]+(?=\s*[=;,)\]])/g, '')
    // Remove generic type parameters
    .replace(/<[\w\s,]+>/g, '')
    // Remove 'as' type assertions
    .replace(/\s+as\s+[\w\[\]<>,\s|&'"{}()]+(?=\s*[;,)\]])/g, '')
    // Remove readonly keyword
    .replace(/\breadonly\s+/g, '')
    // Clean up empty lines
    .replace(/\n\s*\n\s*\n/g, '\n\n');
};

// Get language display info
export const getLanguageInfo = (language: string): { name: string; icon: string; color: string } => {
  switch (language) {
    case 'python':
      return { name: 'Python', icon: '🐍', color: 'text-yellow-400' };
    case 'typescript':
      return { name: 'TypeScript', icon: 'TS', color: 'text-blue-400' };
    case 'javascript':
      return { name: 'JavaScript', icon: 'JS', color: 'text-yellow-300' };
    default:
      return { name: language, icon: '📄', color: 'text-muted-foreground' };
  }
};
