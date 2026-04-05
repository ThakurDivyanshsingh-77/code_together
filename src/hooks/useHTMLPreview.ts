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

      // Collect CSS from all open tabs
      let cssPayload = '';
      tabs.forEach(tab => {
        if (tab.language === 'css' && tab.content) {
          cssPayload += tab.content + '\n';
        }
      });

      // Also collect CSS from saved files not currently open as a tab
      const collectCssFromTree = (nodes: typeof files) => {
        nodes.forEach(node => {
          if (node.type === 'file' && node.language === 'css' && node.content) {
            const alreadyInTab = tabs.some(t => t.name === node.name);
            if (!alreadyInTab) {
              cssPayload += node.content + '\n';
            }
          }
          if (node.children) {
            collectCssFromTree(node.children);
          }
        });
      };
      collectCssFromTree(files);

      // Inject collected CSS into the HTML document
      if (cssPayload.trim()) {
        const styleBlock = `<style>\n${cssPayload.trim()}\n</style>`;
        if (finalHtml.includes('</head>')) {
          finalHtml = finalHtml.replace('</head>', `${styleBlock}\n</head>`);
        } else if (finalHtml.includes('<head>')) {
          finalHtml = finalHtml.replace('<head>', `<head>\n${styleBlock}`);
        } else {
          // No head tag — prepend styles
          finalHtml = styleBlock + '\n' + finalHtml;
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
