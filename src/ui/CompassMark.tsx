/** The compass mark from the first prototype, recoloured: ring, ticks and a two-tone needle. Drawn in the ink's roles, so it shows on either theme. */
export function CompassMark({ size = 28 }: { size?: number }) {
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, r = i % 3 === 0 ? 12.2 : 13.6; return `M${20 + 15.2 * Math.cos(a)} ${20 + 15.2 * Math.sin(a)}L${20 + r * Math.cos(a)} ${20 + r * Math.sin(a)}`; }).join('');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--color-text)" strokeWidth="1.8" />
      <path d={ticks} stroke="var(--color-text)" strokeWidth="1.2" strokeLinecap="round" />
      <g transform="rotate(32 20 20)"><path d="M20 7.5L22.7 20H17.3Z" fill="var(--color-attention)" /><path d="M20 32.5L22.7 20H17.3Z" fill="var(--color-text-muted)" /></g>
      <circle cx="20" cy="20" r="1.9" fill="var(--color-text)" />
    </svg>
  );
}
