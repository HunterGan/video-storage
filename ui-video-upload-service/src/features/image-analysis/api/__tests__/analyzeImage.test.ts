import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeImage } from '../analyzeImage';
import { apiClient } from '@/shared/api/client';
import type { UploadedImage } from '@/shared/types/image';

// Mock FileReader
const originalFileReader = globalThis.FileReader;

beforeEach(() => {
  vi.clearAllMocks();
  
  Object.defineProperty(globalThis, 'FileReader', {
    value: class MockFileReader {
      onload: EventListener | null = null;
      onerror: EventListener | null = null;
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      readyState: number = 0;

      readAsDataURL() {
        this.result = 'data:image/png;base64,test123';
        if (this.onload) {
          this.onload({} as Event);
        }
      }

      readAsText() {
        this.result = '';
        if (this.onload) {
          this.onload({} as Event);
        }
      }

      readAsArrayBuffer() {
        this.result = new ArrayBuffer(0);
        if (this.onload) {
          this.onload({} as Event);
        }
      }

      readAsBinaryString() {
        this.result = '';
        if (this.onload) {
          this.onload({} as Event);
        }
      }

      abort() {}
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'FileReader', {
    value: originalFileReader,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe('Image Analysis API', () => {
  const mockImage: UploadedImage = {
    id: 'test-id-1',
    file: new File(['test content'], 'test.png', { type: 'image/png' }),
    preview: 'http://example.com/preview.png',
    name: 'test.png',
    size: 1024,
  };

  const mockPrompt = 'Describe this image';

  const mockApiResponse = {
    choices: [
      {
        message: {
          content: 'This is a test image description',
        },
      },
    ],
  };

  describe('analyzeImage', () => {
    it('should send request to VL model for single image', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockApiResponse);

      const result = await analyzeImage({
        images: [mockImage],
        prompt: mockPrompt,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/v1/chat/completions', {
        model: 'qwen3-vl',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: mockPrompt },
              { type: 'image_url', image_url: { url: expect.any(String) } },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.3,
      });

      expect(result.combined).toBe('This is a test image description');
      expect(result.results).toHaveLength(1);
    });

    it('should handle multiple images', async () => {
      const images = [mockImage, { ...mockImage, id: 'test-id-2' }];
      
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockApiResponse);

      const result = await analyzeImage({
        images,
        prompt: mockPrompt,
      });

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
      expect(result.combined).toContain('### Изображение 1:');
      expect(result.combined).toContain('### Изображение 2:');
    });

    it('should call onProgress callback during processing', async () => {
      const onProgress = vi.fn();
      const images = [mockImage, { ...mockImage, id: 'test-id-2' }];
      
      vi.spyOn(apiClient, 'post').mockResolvedValue(mockApiResponse);

      await analyzeImage({
        images,
        prompt: mockPrompt,
        onProgress,
      });

      expect(onProgress).toHaveBeenCalledWith(1, 2);
      expect(onProgress).toHaveBeenCalledWith(2, 2);
    });

    it('should handle API errors', async () => {
      const error = new Error('API error');
      vi.spyOn(apiClient, 'post').mockRejectedValue(error);

      await expect(
        analyzeImage({
          images: [mockImage],
          prompt: mockPrompt,
        })
      ).rejects.toThrow('API error');
    });

    it('should handle empty response from model', async () => {
      const emptyResponse = { choices: [] };
      vi.spyOn(apiClient, 'post').mockResolvedValue(emptyResponse);

      await expect(
        analyzeImage({
          images: [mockImage],
          prompt: mockPrompt,
        })
      ).rejects.toThrow('No response from model');
    });
  });
});
