import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../client';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should return true when health endpoint is available', async () => {
      const mockResponse = { data: { status: 'ok' } };
      vi.spyOn(apiClient.getClient(), 'get').mockResolvedValue(mockResponse);

      const result = await apiClient.checkHealth();

      expect(result).toBe(true);
      expect(apiClient.getClient().get).toHaveBeenCalledWith('/health');
    });

    it('should return false when health endpoint fails', async () => {
      vi.spyOn(apiClient.getClient(), 'get').mockRejectedValue(new Error('Network error'));

      const result = await apiClient.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('post', () => {
    it('should send POST request and return data', async () => {
      const mockData = { result: 'test' };
      const mockResponse = { data: mockData };
      vi.spyOn(apiClient.getClient(), 'post').mockResolvedValue(mockResponse);

      const result = await apiClient.post('/test', { key: 'value' });

      expect(result).toEqual(mockData);
      expect(apiClient.getClient().post).toHaveBeenCalledWith('/test', { key: 'value' });
    });

    it('should handle request errors', async () => {
      const error = new Error('Request failed');
      vi.spyOn(apiClient.getClient(), 'post').mockRejectedValue(error);

      await expect(apiClient.post('/test', {})).rejects.toThrow('Request failed');
    });
  });

  describe('uploadImage', () => {
    it('should upload image with multipart/form-data', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'test.png'));
      
      const mockData = { url: 'http://example.com/image.png' };
      const mockResponse = { data: mockData };
      vi.spyOn(apiClient.getClient(), 'post').mockResolvedValue(mockResponse);

      const result = await apiClient.uploadImage('/upload', formData);

      expect(result).toEqual(mockData);
      expect(apiClient.getClient().post).toHaveBeenCalledWith('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });
  });

  describe('getConfig', () => {
    it('should return client configuration', () => {
      const config = apiClient.getConfig();

      expect(config).toBeDefined();
      expect(config.baseURL).toContain('http://');
      expect(config.headers).toBeDefined();
    });
  });
});
