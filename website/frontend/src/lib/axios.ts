/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Interceptor untuk menempelkan Token JWT
api.interceptors.request.use(async (config) => {
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
    
    // Jika 401 terjadi karena token kedaluwarsa pada request publik, 
    // ulangi sekali lagi tanpa Authorization header agar data publik (jadwal, histori, klasemen) tetap tampil
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      if (originalRequest.headers?.Authorization) {
        delete originalRequest.headers.Authorization;
        try {
          return await api(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;