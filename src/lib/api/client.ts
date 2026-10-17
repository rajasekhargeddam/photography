import axios from 'axios';
import { env } from '@/lib/env';

export const apiClient = axios.create({
  baseURL: `${env.apiBaseUrl.replace(/\/$/, '')}/`,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

type ApiError = {
  message: string;
  status?: number;
};

// Never log booking payloads or session tokens here.
export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response
        ? typeof error.response.data?.message === 'string'
          ? error.response.data.message
          : 'The request could not be completed. Please try again.'
        : 'Unable to reach the server. Check your connection and try again.',
      status: error.response?.status,
    };
  }
  return { message: 'An unexpected error occurred. Please try again.' };
}
