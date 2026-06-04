import type { Session } from '@/types';

/** WebUI session was started at least once (stopped or still has provider linkage). */
export function wasWebuiSessionStarted(session: Session | undefined): boolean {
  if (!session || session.source !== 'WebUI') return false;
  return Boolean(session.provider_session_id || session.stopped_at);
}
