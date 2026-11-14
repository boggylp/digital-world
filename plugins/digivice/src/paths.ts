export function toSlashes(path: string): string {
  return path.replaceAll('\\', '/');
}

export function expandHome(path: string, home: string): string {
  return path.startsWith('~') ? home + path.slice(1) : path;
}
