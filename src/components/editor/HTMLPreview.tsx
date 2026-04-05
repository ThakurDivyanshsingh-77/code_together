import React, { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useHTMLPreview } from '@/hooks/useHTMLPreview';
import { cn } from '@/lib/utils';

interface HTMLPreviewProps {
  code: string;
  className?: string;
}

export const HTMLPreview: React.FC<HTMLPreviewProps> = ({ code, className }) => {
  const { previewHtml, generateBlobUrl } = useHTMLPreview(code);
  // refreshKey forces the iframe to fully remount
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenInNewTab = () => {
    const url = generateBlobUrl();
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-4 h-10 bg-[#1e1e1e] border-b border-[#333] shrink-0">
        <span className="text-sm font-medium text-white/80 flex items-center gap-2">
          🌐 <span>Live Preview</span>
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* The iframe — uses srcDoc directly so React controls it */}
      <iframe
        key={refreshKey}
        title="html-preview"
        srcDoc={previewHtml || '<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#999">Start writing HTML to see a preview</body>'}
        className="flex-1 w-full border-none bg-white"
        sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
      />
    </div>
  );
};
