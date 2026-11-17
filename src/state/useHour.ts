import { useEffect, useState } from 'react';

const hourNow = () => new Date().getHours();

/** The hour by the device's clock, rechecked every minute and whenever the tab becomes visible, as `useToday` does. */
export function useHour(): number {
  const [hour, setHour] = useState(hourNow);
  useEffect(() => {
    const check = () => setHour(hourNow());
    const timer = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, []);
  return hour;
}
