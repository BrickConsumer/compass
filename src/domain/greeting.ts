/**
 * The line above the date on Home, or nothing until a name is set.
 * Morning is 05:00 to 11:59, afternoon 12:00 to 17:59, and evening the rest.
 */
export function greeting(hour: number, name: string | undefined): string | null {
  if (!name) return null;
  const part = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
  return `Good ${part}, ${name}`;
}
