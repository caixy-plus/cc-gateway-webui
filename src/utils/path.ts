/**
 * Join the directory shown in DirModal with a child name or ".." segment.
 * The gateway resolves the final path; we only need platform-appropriate separators.
 */
export function joinDir(base: string, segment: string): string {
  if (base === '~' || base === '') {
    if (segment === '..' || segment === '.') return '~';
    return `~/${segment}`;
  }
  const sep = base.includes('\\') ? '\\' : '/';
  const normalized = base.replace(/[/\\]+$/, '');
  return `${normalized}${sep}${segment}`;
}
