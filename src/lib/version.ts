/**
 * Build stamp injected by Vite (`__BUILD_VERSION__`). The `typeof` guard keeps
 * tests and any non-bundled environment working without the define.
 */
export const BUILD_VERSION: string =
  typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : 'dev';
