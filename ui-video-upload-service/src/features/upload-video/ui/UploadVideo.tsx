import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Upload, X, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Label } from '../../../shared/ui/label';
import { Checkbox } from '../../../shared/ui/checkbox';
import { Progress } from '../../../shared/ui/progress';
import type { ProcessOptions } from '../../../entities/video/types';
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
  const [processOptions, setProcessOptions] = useState<ProcessOptions>({
    compress: false,
    convertToMp4: true,
    generateThumbnail: true,
  });
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
      
      // Step 1: Get presigned URL via API client
      const uploadUrlData = await videoApi.getUploadUrl(fileState.file.name, fileState.file.type);
      let presignedUrl = uploadUrlData.upload_url;

      // Step 2: Upload to S3
      // Используем presigned URL для загрузки
      console.log('TRY UPLOADING FILE', presignedUrl)

      if (!presignedUrl.includes('http')) {
        presignedUrl = `http://${presignedUrl}`
      }

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: fileState.file,
        headers: {
          'Content-Type': fileState.file.type,
          'Content-Length': fileState.file.size.toString(),
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3');
      }

      // Step 3: Save metadata via API client
      const videoTitle = fileState.file.name.replace(/\.[^/.]+$/, '');
      
      // После загрузки используем file_url из ответа бэкенда
      const videoUrl = uploadUrlData.file_url?.replace(/\?.*/, '') || '';
      
      await videoApi.createVideo({
        title: videoTitle,
        url: videoUrl,
        s3_key: uploadUrlData.key || '',
      } as any);

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

      {/* Processing Options */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="convertToMp4"
              checked={processOptions.convertToMp4}
              onCheckedChange={(checked) => 
                setProcessOptions(prev => ({ ...prev, convertToMp4: checked as boolean }))
              }
            />
            <Label htmlFor="convertToMp4" className="text-sm">
              Convert to MP4 (recommended)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="compress"
              checked={processOptions.compress}
              onCheckedChange={(checked) => 
                setProcessOptions(prev => ({ ...prev, compress: checked as boolean }))
              }
            />
            <Label htmlFor="compress" className="text-sm">
              Compress video (reduces file size)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generateThumbnail"
              checked={processOptions.generateThumbnail}
              onCheckedChange={(checked) => 
                setProcessOptions(prev => ({ ...prev, generateThumbnail: checked as boolean }))
              }
            />
            <Label htmlFor="generateThumbnail" className="text-sm">
              Generate preview thumbnail
            </Label>
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