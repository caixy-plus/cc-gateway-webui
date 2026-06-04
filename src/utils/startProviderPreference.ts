import type { AgentsApiResponse } from '@/types';

const STORAGE_KEY = 'cc_gateway_webui_start_provider';

export function loadLastStartProvider(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveLastStartProvider(providerId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, providerId);
  } catch {
    // ignore quota / private mode
  }
}

export function enabledProviderIds(catalog: AgentsApiResponse | null): string[] {
  if (!catalog?.providers?.length) return [];
  return catalog.providers
    .filter((p) => p.config?.enabled !== false)
    .map((p) => p.id);
}

/** Pick provider for first-time start: last choice → config default → first enabled. */
export function resolveStartProviderId(
  catalog: AgentsApiResponse | null,
  configDefault?: string
): string {
  const enabled = new Set(enabledProviderIds(catalog));
  const fallback = catalog?.default ?? configDefault ?? 'claude';
  const last = loadLastStartProvider();
  if (last && enabled.has(last)) return last;
  if (enabled.has(fallback)) return fallback;
  const first = catalog?.providers.find((p) => p.config?.enabled !== false);
  return first?.id ?? fallback;
}
