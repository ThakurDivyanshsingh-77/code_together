import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';

export const useHTMLPreview = (rawHtmlCode: string) => {
  // Initialize immediately with raw html so iframe is never blank on open
  const [previewHtml, setPreviewHtml] = useState(rawHtmlCode);

  const { tabs, files } = useEditorStore();

  useEffect(() => {
    // Show raw HTML immediately (no CSS injection yet) so user sees something
    // CSS injection + debounce happens after 500ms
    const handler = setTimeout(() => {
      let finalHtml = rawHtmlCode;

      // Collect CSS and JS from all open tabs
      let cssPayload = '';
      let jsPayload = '';
      tabs.forEach(tab => {
        if (tab.language === 'css' && tab.content) {
          cssPayload += tab.content + '\n';
        }
        if ((tab.language === 'javascript' || tab.language === 'typescript') && tab.content) {
          jsPayload += tab.content + '\n';
        }
      });

      // Also collect CSS/JS from saved files not currently open as a tab
      const collectFromTree = (nodes: typeof files) => {
        nodes.forEach(node => {
          if (node.type === 'file' && node.content) {
            const alreadyInTab = tabs.some(t => t.name === node.name);
            if (!alreadyInTab) {
              if (node.language === 'css') {
                cssPayload += node.content + '\n';
              }
              if (node.language === 'javascript' || node.language === 'typescript') {
                jsPayload += node.content + '\n';
              }
            }
          }
          if (node.children) {
            collectFromTree(node.children);
          }
        });
      };
      collectFromTree(files);

      // Inject CSS into <head>
      if (cssPayload.trim()) {
        const styleBlock = `<style>\n${cssPayload.trim()}\n</style>`;
        if (finalHtml.includes('</head>')) {
          finalHtml = finalHtml.replace('</head>', `${styleBlock}\n</head>`);
        } else if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>\n${styleBlock}`);
        } else {
          finalHtml = styleBlock + '\n' + finalHtml;
        }
      }

      // Inject JS before </body> (so DOM is ready)
      if (jsPayload.trim()) {
        const scriptBlock = `<script>\n${jsPayload.trim()}\n</script>`;
        if (finalHtml.includes('</body>')) {
          finalHtml = finalHtml.replace('</body>', `${scriptBlock}\n</body>`);
        } else {
          finalHtml = finalHtml + '\n' + scriptBlock;
        }
      }

      setPreviewHtml(finalHtml);
    }, 500);

    // Immediately update with raw HTML on keystroke so user always sees live content
    setPreviewHtml(rawHtmlCode);

    return () => clearTimeout(handler);
  }, [rawHtmlCode, tabs, files]);

  const generateBlobUrl = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

  return { previewHtml, generateBlobUrl };
};
