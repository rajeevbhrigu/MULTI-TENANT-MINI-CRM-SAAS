// Test-only stub for the `server-only` package. The real package throws
// when imported outside Next.js's server bundler (by design, to catch
// server code accidentally shipped to the client) - which also means it
// throws inside a plain Node test runner. Vitest aliases "server-only" to
// this no-op so integration tests can exercise real server modules.
export {};
