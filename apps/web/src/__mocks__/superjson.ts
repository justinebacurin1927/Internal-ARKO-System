/**
 * Simple superjson mock for tests.
 * Real superjson is ESM-only — Jest's CJS mode can't import it.
 */
export default {
  serialize: (v: any) => ({ json: v, meta: {} }),
  deserialize: ({ json }: any) => json,
  stringify: JSON.stringify,
  parse: JSON.parse,
}
