import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploader } from '../ImageUploader';
import type { UploadedImage } from '@/shared/types/image';

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: vi.fn().mockReturnValue({
      onClick: vi.fn(),
      className: 'dropzone',
    }),
    getInputProps: vi.fn().mockReturnValue({
      type: 'file',
      accept: 'image/*',
    }),
    isDragActive: false,
  })),
}));

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

describe('ImageUploader', () => {
  const mockOnImagesAdd = vi.fn();
  const mockOnImagesRemove = vi.fn();
  const mockOnImagesClear = vi.fn();

  const renderUploader = (props = {}) => {
    return render(
      <ImageUploader
        images={[]}
        onImagesAdd={mockOnImagesAdd}
        onImagesRemove={mockOnImagesRemove}
        onImagesClear={mockOnImagesClear}
        {...props}
      />
    );
  };

  it('should render dropzone area', () => {
    renderUploader();
    
    expect(screen.getByText(/перетащите изображения/i)).toBeInTheDocument();
    expect(screen.getByText(/или кликните/i)).toBeInTheDocument();
  });

  it('should show file format requirements', () => {
    renderUploader();
    
    expect(screen.getByText(/PNG, JPG, JPEG, WEBP/i)).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    renderUploader({ disabled: true });
    
    const dropzone = screen.getByText(/перетащите изображения/i);
    expect(dropzone).toHaveClass('opacity-50');
  });

  it('should show error when max files exceeded', async () => {
    const mockImages: UploadedImage[] = Array(5).fill(null).map((_, i) => ({
      id: `test-${i}`,
      file: new File(['test'], `test${i}.png`, { type: 'image/png' }),
      preview: `http://example.com/test${i}.png`,
      name: `test${i}.png`,
      size: 1024,
    }));

    renderUploader({ images: mockImages, maxFiles: 5 });

    // Simulate adding more files
    const user = userEvent.setup();
    const fileInput = screen.getByLabelText(/перетащите/i);
    
    await user.upload(fileInput, new File(['test'], 'test6.png', { type: 'image/png' }));
    
    await waitFor(() => {
      expect(screen.getByText(/максимум 5/i)).toBeInTheDocument();
    });
  });

  it('should show preview after upload', async () => {
    const user = userEvent.setup();
    renderUploader();

    const file = new File(['test content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/перетащите/i);
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.png')).toBeInTheDocument();
    });
  });

  it('should validate file types', async () => {
    const user = userEvent.setup();
    renderUploader();

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/перетащите/i);
    
    // This should not add the file due to accept filter
    await user.upload(fileInput, invalidFile);
    
    // Should not show the invalid file
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
  });

  it('should show file count', async () => {
    const user = userEvent.setup();
    renderUploader();

    const file = new File(['test content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/перетащите/i);
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/1 из 5/i)).toBeInTheDocument();
    });
  });

  it('should allow removing individual images', async () => {
    const mockImages: UploadedImage[] = [
      {
        id: 'test-1',
        file: new File(['test'], 'test1.png', { type: 'image/png' }),
        preview: 'http://example.com/test1.png',
        name: 'test1.png',
        size: 1024,
      },
    ];

    renderUploader({ images: mockImages });

    await waitFor(() => {
      expect(screen.getByText('test1.png')).toBeInTheDocument();
    });

    // Hover to show remove button
    const imageCard = screen.getByText('test1.png').closest('div');
    if (imageCard) {
      fireEvent.mouseEnter(imageCard);
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      if (removeButton) {
        fireEvent.click(removeButton);
        
        expect(mockOnImagesRemove).toHaveBeenCalledWith('test-1');
      }
    }
  });

  it('should allow removing all images', async () => {
    const mockImages: UploadedImage[] = [
      {
        id: 'test-1',
        file: new File(['test'], 'test1.png', { type: 'image/png' }),
        preview: 'http://example.com/test1.png',
        name: 'test1.png',
        size: 1024,
      },
    ];

    renderUploader({ images: mockImages });

    await waitFor(() => {
      expect(screen.getByText(/удалить все/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/удалить все/i));

    expect(mockOnImagesClear).toHaveBeenCalledWith([]);
  });
});
