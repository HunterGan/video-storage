import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';

interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

export class ApiClient {
  private client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '60000'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
    },
  });

  constructor(config?: Partial<ApiConfig>) {
    if (config) {
      if (config.baseURL) this.client.defaults.baseURL = config.baseURL;
      if (config.timeout) this.client.defaults.timeout = config.timeout;
      Object.assign(this.client.defaults.headers, config.headers);
    }

    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        console.log('Request:', config.url, config.method);
        return config;
      },
      (error: AxiosError) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('Response:', response.config.url, 'Status:', response.status);
        return response;
      },
      (error: AxiosError) => {
        console.error('Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  // ДОБАВИТЬ ЭТОТ МЕТОД
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async uploadImage<T = unknown>(endpoint: string, formData: FormData): Promise<T> {
    const response = await this.client.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  getConfig() {
    return this.client.defaults;
  }

  getClient() {
    return this.client;
  }
}

export const apiClient = new ApiClient();