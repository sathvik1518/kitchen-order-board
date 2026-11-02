import { useCallback, useEffect, useState } from "react";

// Day 27 pattern: loading / error / data, with abort on unmount.
export function useFetch(fetcher) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher({ signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name === "AbortError") return;
        setState({ data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [fetcher, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: updater(s.data) })), []);
  return { ...state, refetch, setData };
}