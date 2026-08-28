// markdown-it-container ships no types, and markdown-it-attrs is typed against a
// different @types/markdown-it major than the one hoisted here. Both are used
// through a tiny, stable surface, so the plugins are declared loosely rather
// than pinning a transitive types version the ecosystem keeps moving.
declare module 'markdown-it-container' {
  const plugin: unknown;
  export default plugin;
}
declare module 'markdown-it-attrs' {
  const plugin: unknown;
  export default plugin;
}
