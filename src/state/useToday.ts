import { useEffect, useState } from 'react';
import { todayISO } from '../domain/dates';
import type { ISODate } from '../domain/types';

/** Today's date, rechecked every minute and whenever the tab becomes visible, so midnight is noticed. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const check = () => setToday((t) => { const now = todayISO(); return now === t ? t : now; });
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  return today;
}
