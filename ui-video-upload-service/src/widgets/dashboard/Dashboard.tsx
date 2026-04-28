import { useCallback } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Separator } from '@/shared/ui/separator';
import { ImageUploader } from '@/features/image-analysis/ui/ImageUploader';
import { PromptInput } from '@/features/image-analysis/ui/PromptInput';
import { ResultDisplay } from '@/features/image-analysis/ui/ResultDisplay/ResultDisplay';
import { analyzeImage } from '@/features/image-analysis/api';
import { useImageAnalysisStore } from '@/features/image-analysis/model';
import { type HistoryItem } from '@/shared/types/history';
import { Play, Loader2, RotateCcw, Clock, Sparkles } from 'lucide-react';

export function Dashboard() {
  const {
    images,
    addImages,
    removeImage,
    clearImages,
    prompt,
    setPrompt,
    result,
    setResult,
    isLoading,
    setIsLoading,
    progress,
    setProgress,
    history,
    addToHistory,
    reset,
  } = useImageAnalysisStore();

  const handleAnalyze = useCallback(async () => {
    if (images.length === 0) return;

    setIsLoading(true);
    setProgress(null);

    try {
      const { combined } = await analyzeImage({
        images,
        prompt,
        onProgress: (current, total) => {
          setProgress({ current, total });
        },
      });

      setResult(combined);

      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt,
        imageCount: images.length,
        result: combined,
      };
      addToHistory(historyItem);
    } catch (error) {
      console.error('Analysis error:', error);
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [images, prompt, setIsLoading, setProgress, setResult, addToHistory]);

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const handleLoadFromHistory = useCallback((item: HistoryItem) => {
    setPrompt(item.prompt);
    setResult(item.result);
  }, [setPrompt, setResult]);

  const progressPercentage = progress
    ? (progress.current / progress.total) * 100
    : 0;

  return (
    <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Анализ изображений</h1>
            <p className="text-sm text-muted-foreground">
              Загрузите изображения и получите детальный анализ
            </p>
          </div>
        </div>

        {/* Main Analysis Card */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl">Параметры анализа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload */}
            <ImageUploader
              images={images}
              onImagesAdd={addImages}
              onImagesRemove={removeImage}
              onImagesClear={clearImages}
              disabled={isLoading}
            />

            <Separator />

            {/* Prompt Input */}
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              disabled={isLoading}
            />

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={isLoading}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Очистить
              </Button>

              <div className="flex items-center gap-4">
                {progress && (
                  <div className="text-sm text-muted-foreground font-medium">
                    Обработка {progress.current}/{progress.total}
                  </div>
                )}
                <Button
                  onClick={handleAnalyze}
                  disabled={images.length === 0 || isLoading}
                  size="lg"
                  className="gap-2 min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Анализ
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && progress && (
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 relative overflow-hidden"
                    style={{ width: `${progressPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Display */}
        <ResultDisplay result={result} isLoading={isLoading} />

        {/* History */}
        {history.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5" />
                История запросов
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleLoadFromHistory(item)}
                    className="w-full text-left p-4 rounded-lg hover:bg-accent transition-all duration-200 border hover:border-primary/30 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                          {item.prompt.substring(0, 100)}
                          {item.prompt.length > 100 && '...'}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {item.imageCount} изображение{item.imageCount > 1 ? 'я' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        ↗
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
