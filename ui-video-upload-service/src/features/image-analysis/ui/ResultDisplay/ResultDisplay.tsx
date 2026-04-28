import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Skeleton } from '@/shared/ui/skeleton';
import { Copy, Download, Check, Code2, FileJson, FileText, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { dump } from 'js-yaml';

interface ResultDisplayProps {
  result: string | null;
  isLoading: boolean;
}

type OutputFormat = 'json' | 'yaml' | 'html';

export function ResultDisplay({ result, isLoading }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<OutputFormat>('html');

  const parseResult = useCallback((text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return { result: text };
    }
  }, []);

  const convertToYAML = useCallback((data: unknown): string => {
    try {
      return dump(data);
    } catch {
      return JSON.stringify(data, null, 2);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    
    let contentToCopy = result;
    if (activeTab === 'json') {
      const parsed = parseResult(result);
      contentToCopy = JSON.stringify(parsed, null, 2);
    } else if (activeTab === 'yaml') {
      const parsed = parseResult(result);
      contentToCopy = convertToYAML(parsed);
    }

    await navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result, activeTab, parseResult, convertToYAML]);

  const handleDownload = useCallback(() => {
    if (!result) return;

    let content = result;
    let extension = 'txt';

    if (activeTab === 'json') {
      const parsed = parseResult(result);
      content = JSON.stringify(parsed, null, 2);
      extension = 'json';
    } else if (activeTab === 'yaml') {
      const parsed = parseResult(result);
      content = convertToYAML(parsed);
      extension = 'yaml';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `result.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, activeTab, parseResult, convertToYAML]);

  if (isLoading) {
    return (
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Обработка...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Результат анализа появится здесь</p>
              <p className="text-sm text-muted-foreground">
                Загрузите изображения и нажмите «Go» для начала анализа
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Результат анализа
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Копия
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Скачать
            </Button>
          </div>
        </div>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OutputFormat)}>
        <TabsList className="w-full justify-start bg-muted/50">
          <TabsTrigger value="html" className="relative">
            <FileText className="h-3.5 w-3.5 mr-2" />
            Читаемый
            {activeTab === 'html' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="json">
            <FileJson className="h-3.5 w-3.5 mr-2" />
            JSON
          </TabsTrigger>
          <TabsTrigger value="yaml">
            <Code2 className="h-3.5 w-3.5 mr-2" />
            YAML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="json" className="mt-4">
          <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
            <pre className="p-4 text-sm font-mono">
              {JSON.stringify(parseResult(result), null, 2)}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="yaml" className="mt-4">
          <ScrollArea className="h-[400px] rounded-lg border bg-muted/30">
            <pre className="p-4 text-sm font-mono">
              {convertToYAML(parseResult(result))}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="html" className="mt-4">
          <ScrollArea className="h-[400px] rounded-lg border p-6 bg-muted/20">
            <div className="prose prose-sm prose-neutral max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
