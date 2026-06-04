import type { Message } from '../types';

/** Append SSE/optimistic lines; skip back-to-back duplicates (POST + bus, or user echo twice). */
export function appendMessage(prev: Message[], next: Message): Message[] {
  const last = prev[prev.length - 1];
  if (
    last &&
    last.role === next.role &&
    last.content === next.content &&
    last.role !== 'permission_request'
  ) {
    return prev;
  }
  return [...prev, next];
}

/** Gateway command replies were stored as `system`; show them as assistant bubbles in the UI. */
export function historyRoleForDisplay(role: string): Message['role'] {
  if (role === 'system') return 'assistant';
  if (role === 'user' || role === 'assistant' || role === 'permission_request') {
    return role;
  }
  return 'assistant';
}
