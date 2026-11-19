import { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

/** What a session's address carries when it was opened from inside the place. */
interface OpenedHere { inPlace?: boolean }

/**
 * Open a session from inside Fitness. A session has an address of its own, one step on from the place, so Back
 * closes it. Opening another while one is open takes its place, so there is never a trail of sessions behind it.
 */
export function useOpenSession(): (id: string) => void {
  const navigate = useNavigate(), { workoutId } = useParams();
  return useCallback((id: string) => navigate(`/fitness/${id}`, { state: { inPlace: true } satisfies OpenedHere, replace: !!workoutId }), [navigate, workoutId]);
}

/**
 * Close the open session. Opened from inside the place, that is one step back, to where it was opened from.
 * Opened any other way (from Home, or by its address), its address is replaced by the place's. Either way Back
 * never reopens a session that was closed, finished or put away.
 */
export function useCloseSession(): () => void {
  const navigate = useNavigate(), { state } = useLocation();
  const inPlace = !!(state as OpenedHere | null)?.inPlace;
  return useCallback(() => { if (inPlace) navigate(-1); else navigate('/fitness', { replace: true }); }, [navigate, inPlace]);
}
