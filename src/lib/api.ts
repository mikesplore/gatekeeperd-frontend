import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";

/** Uniform backend error shape: every API failure returns this. */
export interface ApiErrorBody {
  error: string;
  message: string;
  timestamp: string;
}

export type ApiErrorCode =
  | "project_not_found"
  | "docker_unavailable"
  | "invalid_credentials"
  | string;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<ApiErrorBody>) => {
    if (err.response?.status === 401) {
      const state = useAuthStore.getState();
      const original = err.config;
      if (state.refreshToken && original && !original.url?.includes("/auth/refresh") && !(original as typeof original & { _retry?: boolean })._retry) {
        (original as typeof original & { _retry?: boolean })._retry = true;
        try {
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken: state.refreshToken });
          useAuthStore.setState({ token: response.data.token, refreshToken: response.data.refreshToken });
          original.headers.Authorization = `Bearer ${response.data.token}`;
          return api(original);
        } catch { /* fall through to logout */ }
      }
      useAuthStore.getState().logout(); window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export function isApiError(err: unknown): err is AxiosError<ApiErrorBody> {
  return axios.isAxiosError(err) && typeof err.response?.data?.message === "string";
}

export function getApiErrorBody(err: unknown): ApiErrorBody | null {
  if (isApiError(err) && err.response?.data) {
    return err.response.data;
  }
  return null;
}

export function getApiErrorCode(err: unknown): ApiErrorCode | null {
  return getApiErrorBody(err)?.error ?? null;
}

export function getApiErrorMessage(err: unknown): string {
  const body = getApiErrorBody(err);
  if (body?.message) {
    return body.message;
  }
  return "Something went wrong. Please try again.";
}

export function isDockerUnavailable(err: unknown): boolean {
  if (axios.isAxiosError(err) && err.response?.status === 503) {
    return true;
  }
  return getApiErrorCode(err) === "docker_unavailable";
}
