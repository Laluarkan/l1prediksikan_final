/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isLoggingOut = false;

function triggerAutoLogout() {
  if (typeof window !== 'undefined' && !isLoggingOut) {
    isLoggingOut = true;
    signOut({ callbackUrl: '/login?expired=1', redirect: true }).finally(() => {
      isLoggingOut = false;
    });
  }
}

// Interceptor untuk menempelkan Token JWT
api.interceptors.request.use(async (config) => {
  // Jangan attach token jika request adalah retry setelah 401 atau diberi flag skipAuth
  if ((config as any)._retry || (config as any)._skipAuth) {
    if (config.headers) {
      delete config.headers.Authorization;
      delete config.headers.authorization;
    }
    return config;
  }

  const session = await getSession();
  if (session && (session as any).accessToken) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
  }
  return config;
});

// Interceptor respon untuk menangani sesi idle / token kadaluarsa
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isTokenInvalid = error.response?.data?.code === 'token_not_valid' || 
                           error.response?.data?.detail?.includes('token') ||
                           error.response?.data?.detail?.includes('expired');

    if (isUnauthorized && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const hadAuthHeader = Boolean(
        originalRequest.headers?.Authorization || originalRequest.headers?.authorization
      );

      // Jika ada header Authorization dan token tidak valid/expired, bersihkan sesi login otomatis
      if (hadAuthHeader || isTokenInvalid) {
        triggerAutoLogout();
      }

      // Hapus Authorization header untuk mencoba mengambil data publik
      if (originalRequest.headers) {
        delete originalRequest.headers.Authorization;
        delete originalRequest.headers.authorization;
      }

      try {
        return await api(originalRequest);
      } catch (retryError) {
        // Jika endpoint memang privat dan tetap gagal 401/403, pastikan logout terpanggil
        triggerAutoLogout();
        return Promise.reject(retryError);
      }
    }

    if (isUnauthorized && isTokenInvalid) {
      triggerAutoLogout();
    }

    return Promise.reject(error);
  }
);

export default api;