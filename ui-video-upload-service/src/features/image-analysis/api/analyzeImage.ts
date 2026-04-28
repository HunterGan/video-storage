import { apiClient } from '@/shared/api/client';
import type { UploadedImage } from '@/shared/types/image';

interface AnalyzeImageParams {
  images: UploadedImage[];
  prompt: string;
  onProgress?: (current: number, total: number) => void;
}

interface AnalyzeImageResponse {
  results: string[];
  combined: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const MODEL_NAME = 'qwen3-vl';
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.3;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeSingleImage(
  image: UploadedImage,
  prompt: string
): Promise<string> {
  const base64Image = await fileToBase64(image.file);
  
  const requestBody = {
    model: MODEL_NAME,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64Image } },
        ],
      },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  };

  const response = await apiClient.post<ChatCompletionResponse>(
    '/v1/chat/completions',
    requestBody
  );

  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content;
  }

  throw new Error('No response from model');
}

export async function analyzeImage({
  images,
  prompt,
  onProgress,
}: AnalyzeImageParams): Promise<AnalyzeImageResponse> {
  const results: string[] = [];

  for (let i = 0; i < images.length; i++) {
    if (onProgress) {
      onProgress(i + 1, images.length);
    }
    
    const result = await analyzeSingleImage(images[i], prompt);
    results.push(result);
  }

  const combined = images.length === 1
    ? results[0]
    : results.map((r, i) => `### Изображение ${i + 1}:\n\n${r}`).join('\n\n');

  return {
    results,
    combined,
  };
}
