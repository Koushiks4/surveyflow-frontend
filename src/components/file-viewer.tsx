'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DownloadIcon,
  XIcon,
  FileIcon,
  ImageIcon,
  FileTextIcon,
  TableIcon,
  LoaderIcon,
  ExternalLinkIcon,
  EyeOffIcon,
} from 'lucide-react';

type ViewerType = 'image' | 'pdf' | 'office' | 'unsupported';

function getViewerType(fileType: string, fileName: string): ViewerType {
  const mime = fileType?.toLowerCase() || '';
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/msword',
     'application/vnd.ms-excel',
    ].includes(mime) ||
    ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'].includes(ext)
  ) {
    return 'office';
  }
  return 'unsupported';
}

function getViewerIcon(type: ViewerType) {
  switch (type) {
    case 'image': return ImageIcon;
    case 'pdf': return FileTextIcon;
    case 'office': return TableIcon;
    default: return FileIcon;
  }
}

interface FileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  fileName: string;
  fileType: string;
}

export function FileViewer({ open, onOpenChange, url, fileName, fileType }: FileViewerProps) {
  const [loading, setLoading] = useState(true);
  const viewerType = getViewerType(fileType, fileName);
  const ViewerIcon = getViewerIcon(viewerType);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setLoading(true);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-5xl w-[calc(100vw-2rem)] h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] flex flex-col p-0 gap-0 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-stone-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ViewerIcon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon-sm" onClick={handleDownload} title="Download">
              <DownloadIcon className="size-4" />
            </Button>
            {url && viewerType !== 'unsupported' && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => window.open(url, '_blank')}
                title="Open in new tab"
              >
                <ExternalLinkIcon className="size-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} title="Close">
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-stone-900 relative">
          {!url ? (
            <div className="flex items-center justify-center h-full">
              <LoaderIcon className="size-6 text-stone-400 animate-spin" />
            </div>
          ) : viewerType === 'image' ? (
            <div className="flex items-center justify-center h-full p-4 overflow-auto">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoaderIcon className="size-6 text-stone-400 animate-spin" />
                </div>
              )}
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </div>
          ) : viewerType === 'pdf' ? (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <LoaderIcon className="size-6 text-stone-400 animate-spin" />
                </div>
              )}
              <iframe
                src={url}
                className="w-full h-full border-0"
                title={fileName}
                onLoad={() => setLoading(false)}
              />
            </>
          ) : viewerType === 'office' ? (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <LoaderIcon className="size-6 text-stone-400 animate-spin" />
                </div>
              )}
              <iframe
                src={`https://view.officeapps.live.com/op/embed.ashx?src=${encodeURIComponent(url)}`}
                className="w-full h-full border-0 bg-white"
                title={fileName}
                onLoad={() => setLoading(false)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-400">
              <EyeOffIcon className="size-12" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Preview not available</p>
                <p className="text-xs">This file type cannot be previewed in the browser</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownload} className="mt-2">
                <DownloadIcon className="size-4" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
