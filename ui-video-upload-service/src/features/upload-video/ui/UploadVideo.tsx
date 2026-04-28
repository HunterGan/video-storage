import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, X, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Progress } from '../../../shared/ui/progress';
import { videoApi } from '../../../shared/api/video';

interface FileUploadState {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
}

interface UploadVideoProps {
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_TYPES = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/ogg': ['.ogg'],
};

export function UploadVideo({ onUploadComplete }: UploadVideoProps) {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileUploadState[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'idle',
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, status: FileUploadState['status'], errorMessage?: string) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status, errorMessage } : f
    ));
  };

  const uploadFile = async (fileState: FileUploadState, index: number) => {
    try {
      const videoTitle = fileState.file.name.replace(/\.[^/.]+$/, '');
      await videoApi.uploadVideo(fileState.file, videoTitle);
      updateStatus(index, 'uploaded');
      toast.success(`Uploaded: ${fileState.file.name}`);
    } catch (error) {
      console.error('Upload error:', error);
      updateStatus(index, 'error', error instanceof Error ? error.message : 'Upload failed');
      toast.error(`Failed to upload ${fileState.file.name}`);
    }
  };

  const handleStartUpload = async () => {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const fileState = files[i];
      if (fileState.status === 'idle') {
        updateStatus(i, 'uploading');
        await uploadFile(fileState, i);
      }
    }

    setIsUploading(false);
    setFiles([]);
    onUploadComplete?.();
  };

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={
              `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`
            }
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Drag & drop video files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files (MP4, WebM, OGG up to 500MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Files ({files.length})</span>
              <span className="text-sm text-muted-foreground font-normal">
                Total: {formatSize(totalSize)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((fileState, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-md"
              >
                <FileVideo className="w-8 h-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" title={fileState.file.name}>
                    {fileState.file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSize(fileState.file.size)}
                  </p>
                </div>
                
                {fileState.status === 'uploading' && (
                  <div className="w-32">
                    <Progress value={fileState.progress} className="h-2" />
                    <p className="text-xs text-center mt-1">{fileState.progress}%</p>
                  </div>
                )}
                
                {fileState.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                
                {fileState.status === 'uploaded' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                
                {fileState.status === 'idle' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleStartUpload}
                disabled={isUploading || files.every(f => f.status !== 'idle')}
                className="min-w-[120px]"
              >
                {isUploading ? 'Uploading...' : 'Start Upload'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}