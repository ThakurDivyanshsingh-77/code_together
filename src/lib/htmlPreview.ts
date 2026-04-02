import { FileNode } from '@/types/editor';
import {
  flattenFileTree,
  getParentProjectPath,
  normalizeProjectPath,
  resolveProjectPath,
} from '@/lib/terminalShell';

interface BuildHtmlPreviewOptions {
  html: string;
  currentFilePath: string;
  files: FileNode[];
  sessionKey: string;
}

export interface HtmlPreviewResult {
  document: string;
  notices: string[];
}

const EXTERNAL_ASSET_PATTERN = /^(?:[a-z]+:|\/\/|#|data:|blob:|mailto:|tel:)/i;

const isExternalAsset = (value: string) => EXTERNAL_ASSET_PATTERN.test(value);

const toSvgDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const copyAttributes = (
  source: Element,
  target: Element,
  excludedAttributes: string[] = []
) => {
  const excluded = new Set(excludedAttributes.map((attribute) => attribute.toLowerCase()));

  for (const attribute of Array.from(source.attributes)) {
    if (excluded.has(attribute.name.toLowerCase())) {
      continue;
    }

    target.setAttribute(attribute.name, attribute.value);
  }
};

export const buildHtmlPreviewDocument = ({
  html,
  currentFilePath,
  files,
  sessionKey,
}: BuildHtmlPreviewOptions): HtmlPreviewResult => {
  const parser = new DOMParser();
  const documentRoot = parser.parseFromString(html, 'text/html');
  const notices: string[] = [];
  const allFiles = flattenFileTree(files);
  const fileMap = new Map(allFiles.map((file) => [normalizeProjectPath(file.path), file]));
  const fileDirectory = getParentProjectPath(currentFilePath);

  const resolveLocalAsset = (assetPath: string) => {
    const resolvedPath = resolveProjectPath(fileDirectory, assetPath);
    return {
      resolvedPath,
      node: fileMap.get(resolvedPath) ?? null,
    };
  };

  if (!documentRoot.head) {
    const head = documentRoot.createElement('head');
    documentRoot.documentElement.insertBefore(head, documentRoot.body || null);
  }

  if (!documentRoot.body) {
    const body = documentRoot.createElement('body');
    documentRoot.documentElement.appendChild(body);
  }

  const head = documentRoot.head;

  if (!head.querySelector('meta[charset]')) {
    const charset = documentRoot.createElement('meta');
    charset.setAttribute('charset', 'utf-8');
    head.prepend(charset);
  }

  const bridgeScript = documentRoot.createElement('script');
  bridgeScript.textContent = `
    (() => {
      const sessionKey = ${JSON.stringify(sessionKey)};
      const format = (value) => {
        if (typeof value === 'string') {
          return value;
        }

        try {
          return JSON.stringify(value, null, 2);
        } catch (error) {
          return String(value);
        }
      };

      const send = (level, message) => {
        try {
          parent.postMessage(
            { type: 'codecollab-preview', sessionKey, level, message },
            '*'
          );
        } catch (error) {}
      };

      ['log', 'info', 'warn', 'error'].forEach((level) => {
        const original = console[level];
        console[level] = (...args) => {
          send(level, args.map(format).join(' '));
          if (typeof original === 'function') {
            original.apply(console, args);
          }
        };
      });

      window.addEventListener('error', (event) => {
        send('error', event.message || 'Runtime error');
      });

      window.addEventListener('unhandledrejection', (event) => {
        send('error', String(event.reason ?? 'Unhandled promise rejection'));
      });

      send('info', 'HTML preview ready');
    })();
  `;
  head.prepend(bridgeScript);

  for (const link of Array.from(documentRoot.querySelectorAll('link[rel~="stylesheet"][href]'))) {
    const href = link.getAttribute('href')?.trim();
    if (!href || isExternalAsset(href)) {
      continue;
    }

    const { resolvedPath, node } = resolveLocalAsset(href);
    if (!node?.content) {
      notices.push(`Missing stylesheet: ${resolvedPath}`);
      continue;
    }

    const style = documentRoot.createElement('style');
    copyAttributes(link, style, ['href', 'rel']);
    style.setAttribute('data-source', resolvedPath);
    style.textContent = node.content;
    link.replaceWith(style);
  }

  for (const script of Array.from(documentRoot.querySelectorAll('script[src]'))) {
    const src = script.getAttribute('src')?.trim();
    if (!src || isExternalAsset(src)) {
      continue;
    }

    const { resolvedPath, node } = resolveLocalAsset(src);
    if (!node?.content) {
      notices.push(`Missing script: ${resolvedPath}`);
      continue;
    }

    const inlineScript = documentRoot.createElement('script');
    copyAttributes(script, inlineScript, ['src']);
    inlineScript.setAttribute('data-source', resolvedPath);
    inlineScript.textContent = node.content;
    script.replaceWith(inlineScript);
  }

  for (const image of Array.from(documentRoot.querySelectorAll('img[src], source[src]'))) {
    const src = image.getAttribute('src')?.trim();
    if (!src || isExternalAsset(src)) {
      continue;
    }

    const { resolvedPath, node } = resolveLocalAsset(src);
    if (!resolvedPath.endsWith('.svg') || !node?.content) {
      continue;
    }

    image.setAttribute('src', toSvgDataUri(node.content));
  }

  return {
    document: `<!DOCTYPE html>\n${documentRoot.documentElement.outerHTML}`,
    notices,
  };
};
