import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/store/authStore";
import { clearClientSession } from "@/lib/clearClientSession";

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

type RefreshedTokens = { token: string; refreshToken: string };
let refreshInFlight: { refreshToken: string; promise: Promise<RefreshedTokens> } | null = null;

function refreshTokens(refreshToken: string): Promise<RefreshedTokens> {
  if (!refreshInFlight || refreshInFlight.refreshToken !== refreshToken) {
    const promise = axios
      .post<RefreshedTokens>(`${api.defaults.baseURL}/auth/refresh`, { refreshToken })
      .then(response => response.data)
      .finally(() => {
        if (refreshInFlight?.promise === promise) refreshInFlight = null;
      });
    refreshInFlight = { refreshToken, promise };
  }
  return refreshInFlight.promise;
}

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
        const currentAuthorization = original.headers?.Authorization;
        const currentToken = useAuthStore.getState().token;
        if (currentToken && currentAuthorization !== `Bearer ${currentToken}`) {
          original.headers.Authorization = `Bearer ${currentToken}`;
          return api(original);
        }
        try {
          const tokens = await refreshTokens(state.refreshToken);
          const latest = useAuthStore.getState();
          if (latest.refreshToken !== state.refreshToken) {
            if (latest.token) {
              original.headers.Authorization = `Bearer ${latest.token}`;
              return api(original);
            }
            throw new Error("Authentication session changed during token refresh");
          }
          useAuthStore.setState(tokens);
          original.headers.Authorization = `Bearer ${tokens.token}`;
          return api(original);
        } catch { /* fall through to logout */ }
      }
      clearClientSession();
      window.location.replace("/login");
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
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 504) {
      return "The server did not finish before the reverse-proxy timeout. The Certbot operation may still be running; check Gatekeeperd logs before retrying.";
    }
    if (err.response?.status) {
      return `The server returned HTTP ${err.response.status} without an error message.`;
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return "The request timed out. The operation may still be running; check its status before retrying.";
    }
    if (err.request) {
      return "No response was received from the server. Check the connection and server logs before retrying.";
    }
  }
  return "Something went wrong. Please try again.";
}

export function isDockerUnavailable(err: unknown): boolean {
  if (axios.isAxiosError(err) && err.response?.status === 503) {
    return true;
  }
  return getApiErrorCode(err) === "docker_unavailable";
}
