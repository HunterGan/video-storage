import { Card, CardContent, CardFooter } from '../card';
import { Button } from '../button';
import { Copy, Trash2, Download } from 'lucide-react';
import type { Video } from '../../../entities/video/types';
import { cn } from '../../lib/utils';

interface VideoCardProps {
  video: Video;
  onCopyUrl: (url: string) => void;
  onDelete: (id: string) => void;
  onDownload: (video: Video) => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function VideoCard({
  video,
  onCopyUrl,
  onDownload,
  onDelete,
  isSelected,
  onToggleSelect,
}: VideoCardProps) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      className={cn(
        'relative group overflow-hidden transition-all duration-200',
        isSelected && 'ring-2 ring-blue-500'
      )}
    >
      <div className="relative aspect-video bg-gray-900">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <video
            src={video.url}
            className="w-full h-full object-cover"
            preload="metadata"
          />
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={onToggleSelect}
            className="p-1.5 bg-white/90 rounded-md shadow-sm hover:bg-white transition-colors"
          >
            <div className={cn(
              'w-4 h-4 border-2 rounded flex items-center justify-center transition-colors',
              isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
            )}>
              {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
          </button>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm truncate" title={video.title}>
          {video.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{formatSize(video.size)}</span>
          <span>•</span>
          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
      <CardFooter className="p-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onDownload(video)}
        >
          <Download className="w-3 h-3 mr-1" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => onCopyUrl(video.url)}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(video.id)}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}