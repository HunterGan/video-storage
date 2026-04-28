import { UploadVideo } from '../../features/upload-video/ui/UploadVideo';

export function UploadPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Videos</h1>
        <p className="text-muted-foreground mt-1">
          Upload video files to your S3 storage
        </p>
      </div>

      <UploadVideo />
    </div>
  );
}