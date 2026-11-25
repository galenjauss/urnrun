/** Consistent API envelope (SPEC §6.4). */
export type Envelope<T> =
  | { ok: true; data: T; error: null; meta?: Record<string, unknown> }
  | { ok: false; data: null; error: { code: string; message: string } };

export const ok = <T>(data: T, meta?: Record<string, unknown>): Envelope<T> =>
  meta ? { ok: true, data, error: null, meta } : { ok: true, data, error: null };

export const fail = (code: string, message: string): Envelope<never> => ({
  ok: false,
  data: null,
  error: { code, message },
});
