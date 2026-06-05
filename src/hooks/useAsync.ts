"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError || err instanceof Error) return err.message;
  return "Something went wrong.";
}

/**
 * Run an async loader on mount (and when `deps` change), exposing
 * loading/error/data plus a `reload`. Aborts in-flight work on unmount so the
 * client stays resilient even when the backend is unavailable.
 *
 * State is only updated from the async callbacks and the `reload` handler — never
 * synchronously inside the effect — so it does not trigger cascading renders.
 * Components that key on route params remount per navigation, so the initial
 * `loading: true` covers dependency changes.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setState({ data: null, loading: false, error: messageOf(err) });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { ...state, reload };
}
