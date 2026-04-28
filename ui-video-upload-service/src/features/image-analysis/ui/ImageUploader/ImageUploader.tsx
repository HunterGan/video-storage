import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { type UploadedImage } from '@/shared/types/image';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesAdd: (images: UploadedImage[]) => void;
  onImagesRemove: (id: string) => void;
  onImagesClear: () => void;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
}

const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function ImageUploader({
  images,
  onImagesAdd,
  onImagesRemove,
  onImagesClear,
  maxFiles = MAX_FILES,
  maxSize = MAX_SIZE,
  disabled = false,
}: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    if (images.length + acceptedFiles.length > maxFiles) {
      setError(`Максимум ${maxFiles} изображений`);
      return;
    }

    const newImages: UploadedImage[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    onImagesAdd(newImages);
  }, [images, onImagesAdd, maxFiles]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    maxSize,
    maxFiles: maxFiles - images.length,
    disabled,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          "bg-card hover:bg-accent/30",
          isDragActive && isDragAccept && "border-primary bg-primary/5 scale-[1.01]",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && "hover:border-primary/60",
          disabled && "opacity-50 cursor-not-allowed hover:bg-card"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "p-3 rounded-full bg-primary/10",
            isDragActive && "animate-pulse"
          )}>
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Перетащите изображения сюда
            </p>
            <p className="text-xs text-muted-foreground">
              или кликните для выбора файлов
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ImageIcon className="h-3 w-3" />
            <span>PNG, JPG, WEBP • до {formatSize(maxSize)} • макс. {maxFiles}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive text-center bg-destructive/10 rounded-md py-2">
          {error}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Загружено: {images.length} из {maxFiles}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onImagesClear}
              className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-3 w-3 mr-1" />
              Удалить все
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative rounded-lg overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                <img
                  src={image.preview}
                  alt={image.name}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onImagesRemove(image.id);
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive hover:scale-110"
                >
                  <X className="h-3 w-3" />
                </button>
                
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="text-xs text-white truncate" title={image.name}>
                    {image.name}
                  </div>
                  <div className="text-[10px] text-white/80">
                    {formatSize(image.size)}
                  </div>
                </div>
              </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
