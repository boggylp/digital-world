export const toSlashes = (path: string): string => path.replaceAll('\\', '/');

export const expandHome = (path: string, home: string): string => (path.startsWith('~') ? home + path.slice(1) : path);
