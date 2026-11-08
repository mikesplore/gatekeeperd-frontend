const RETRY_WINDOW_MS = 30_000;
const RETRY_KEY = `gatekeeper-chunk-retry:${window.location.pathname}`;

function getRetryAt(): number | null {
  try {
    const value = Number(window.sessionStorage.getItem(RETRY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function clearRetryAt(): void {
  try {
    window.sessionStorage.removeItem(RETRY_KEY);
  } catch {
    // Storage can be disabled by the browser; the page can still be retried.
  }
}

export function installChunkLoadRecovery(): void {
  const retryAt = getRetryAt();
  if (retryAt !== null) {
    const remaining = RETRY_WINDOW_MS - (Date.now() - retryAt);
    if (remaining <= 0) clearRetryAt();
    else {
      window.setTimeout(() => {
        if (getRetryAt() === retryAt) clearRetryAt();
      }, remaining);
    }
  }

  window.addEventListener("vite:preloadError", (event) => {
    const previousRetryAt = getRetryAt();
    if (previousRetryAt !== null && Date.now() - previousRetryAt < RETRY_WINDOW_MS) {
      // Let the failed import reach the router error boundary after one retry.
      return;
    }

    try {
      window.sessionStorage.setItem(RETRY_KEY, String(Date.now()));
    } catch {
      // Avoid a reload loop when the browser blocks session storage.
      return;
    }

    event.preventDefault();
    window.location.reload();
  });
}

export function hasRecentChunkLoadRetry(): boolean {
  const retryAt = getRetryAt();
  return retryAt !== null && Date.now() - retryAt < RETRY_WINDOW_MS;
}

export function retryAfterChunkLoadFailure(): void {
  clearRetryAt();
  window.location.reload();
}
