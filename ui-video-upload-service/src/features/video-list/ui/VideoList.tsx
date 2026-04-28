import { useState } from 'react';
import { VideoCard } from '../../../shared/ui/video-card/VideoCard';
import type { Video, ViewMode } from '../../../entities/video/types';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table';
import { Checkbox } from '../../../shared/ui/checkbox';
import { Button } from '../../../shared/ui/button';
import { Copy, Trash2, Grid3X3, List, Download } from 'lucide-react';

interface VideoListProps {
  videos: Video[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function VideoList({
  videos,
  viewMode,
  onViewModeChange,
  onDelete,
  loading,
}: VideoListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleCopyUrl = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('URL copied to clipboard');
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success('URL copied to clipboard');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    };

  const handleDownload = (video: Video) => {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Download started: ${video.title}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      onDelete(id);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map(v => v.id)));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedIds.size} selected videos?`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds(new Set());
    }
  };

  const handleBulkCopy = () => {
    const urls = videos.filter(v => selectedIds.has(v.id)).map(v => v.url).join('\n');
    navigator.clipboard.writeText(urls);
    toast.success(`${selectedIds.size} URLs copied to clipboard`);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Grid3X3 className="w-12 h-12 mb-4 opacity-50" />
        <p>No videos found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            <List className="w-4 h-4 mr-2" />
            Table
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Grid
          </Button>
        </div>
        
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopy}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URLs
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === videos.length && videos.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(video.id)}
                      onCheckedChange={() => toggleSelect(video.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-12 bg-gray-900 rounded overflow-hidden">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={video.url} className="w-full h-full object-cover" preload="metadata" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={video.title}>
                    {video.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSize(video.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(video.duration)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(video)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(video.url)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onCopyUrl={handleCopyUrl}
              onDownload={handleDownload}
              onDelete={handleDelete}
              isSelected={selectedIds.has(video.id)}
              onToggleSelect={() => toggleSelect(video.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}