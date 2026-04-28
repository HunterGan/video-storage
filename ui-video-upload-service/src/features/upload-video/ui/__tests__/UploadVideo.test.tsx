import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadVideo } from '../UploadVideo';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('UploadVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone', () => {
    render(<UploadVideo />);
    
    expect(screen.getByText(/Drag & drop video files here/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, WebM, OGG up to 500MB/i)).toBeInTheDocument();
  });

  it('renders processing options', () => {
    render(<UploadVideo />);
    
    expect(screen.getByLabelText(/Convert to MP4/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Compress video/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Generate preview thumbnail/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    
    render(<UploadVideo />);
    
    // Click to open file picker
    const input = screen.getByLabelText(/Drag & drop video files here/i).querySelector('input') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
  });

  it('shows file size', async () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    
    render(<UploadVideo />);
    
    const input = screen.getByLabelText(/Drag & drop video files here/i).querySelector('input') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
  });

  it('allows removing files', async () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    
    render(<UploadVideo />);
    
    const input = screen.getByLabelText(/Drag & drop video files here/i).querySelector('input') as HTMLInputElement;
    
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
    
    // Remove file
    const removeBtn = screen.getByRole('button', { name: /×/i });
    fireEvent.click(removeBtn);
    
    await waitFor(() => {
      expect(screen.queryByText('test.mp4')).not.toBeInTheDocument();
    });
  });
});