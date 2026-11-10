/**
 * In-flight GET dedupe (industry: SWR/React Query style).
 * Prevents React Strict Mode double-mount from hitting the same URL twice.
 */
const inflight = new Map<string, Promise<Response>>();

export function fetchDedupe(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  if (method !== "GET") {
    return fetch(input, init);
  }

  const key = input;
  let promise = inflight.get(key);
  if (!promise) {
    promise = fetch(input, init).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
  }

  return promise.then((res) => res.clone());
}
