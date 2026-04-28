import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UploadedImage } from '@/shared/types/image';
import type { HistoryItem } from '@/shared/types/history';

interface ImageAnalysisState {
  // Images
  images: UploadedImage[];
  addImages: (images: UploadedImage[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  // Prompt
  prompt: string;
  setPrompt: (prompt: string) => void;

  // Result
  result: string | null;
  setResult: (result: string) => void;
  clearResult: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  // Progress
  progress: { current: number; total: number } | null;
  setProgress: (progress: { current: number; total: number } | null) => void;

  // History
  history: HistoryItem[];
  addToHistory: (item: HistoryItem) => void;
  clearHistory: () => void;

  // Reset
  reset: () => void;
}

const DEFAULT_PROMPT = "Опиши детально, что изображено на картинке. Выдели основные объекты, их расположение, цвета и взаимодействия.";

export const useImageAnalysisStore = create<ImageAnalysisState>()(
  persist(
    (set) => ({
      // Images
      images: [],
      addImages: (images) => set((state) => ({
        images: [...state.images, ...images],
      })),
      removeImage: (id) => set((state) => ({
        images: state.images.filter((img) => img.id !== id),
      })),
      clearImages: () => set({ images: [] }),

      // Prompt
      prompt: DEFAULT_PROMPT,
      setPrompt: (prompt) => set({ prompt }),

      // Result
      result: null,
      setResult: (result) => set({ result }),
      clearResult: () => set({ result: null }),

      // Loading
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      // Progress
      progress: null,
      setProgress: (progress) => set({ progress }),

      // History
      history: [],
      addToHistory: (item) => set((state) => {
        const newHistory = [item, ...state.history].slice(0, 10);
        return { history: newHistory };
      }),
      clearHistory: () => set({ history: [] }),

      // Reset
      reset: () => set({
        images: [],
        prompt: DEFAULT_PROMPT,
        result: null,
        isLoading: false,
        progress: null,
      }),
    }),
    {
      name: 'image-analysis-storage',
      partialize: (state) => ({
        prompt: state.prompt,
        history: state.history,
      }),
    }
  )
);
