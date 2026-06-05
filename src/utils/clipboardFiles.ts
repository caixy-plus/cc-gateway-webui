/** Extract files from a paste event (screenshots, copied files, Finder copies). */
export function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) {
    return [];
  }

  const seen = new Set<string>();
  const out: File[] = [];

  const push = (raw: File | null) => {
    if (!raw || raw.size === 0) {
      return;
    }
    const file = normalizePastedFile(raw);
    const key = `${file.name}:${file.size}:${file.type}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    out.push(file);
  };

  if (data.files?.length) {
    for (let i = 0; i < data.files.length; i++) {
      push(data.files[i]);
    }
  }

  if (data.items?.length) {
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.kind === 'file') {
        push(item.getAsFile());
      }
    }
  }

  return out;
}

function normalizePastedFile(file: File): File {
  const name = file.name?.trim();
  const needsName = !name || name === 'blob' || name === 'image.png';
  if (!needsName) {
    return file;
  }
  const ext = extensionFromMime(file.type);
  const stamped = `paste-${Date.now()}.${ext}`;
  return new File([file], stamped, { type: file.type || mimeFromExt(ext) });
}

function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
  };
  return map[mime] || 'png';
}

function mimeFromExt(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'image/png';
  }
}
