import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoList } from '../../features/video-list/ui/VideoList';
import { videoApi } from '../../shared/api/video';
import { toast } from 'sonner';
import type { ViewMode } from '../../entities/video/types';

export function VideosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['videos'],
    queryFn: () => videoApi.getVideos(),
  });

  const videos = data?.videos

  const deleteMutation = useMutation({
    mutationFn: (id: string) => videoApi.deleteVideo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete video: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Videos</h1>
        <div className="text-sm text-muted-foreground">
          {videos?.length || 0} videos
        </div>
      </div>

      <VideoList
        videos={videos || []}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDelete={handleDelete}
        loading={isLoading}
      />
    </div>
  );
}