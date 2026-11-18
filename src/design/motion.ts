/**
 * Motion tokens, matching the durations and curves in tokens.css and the art direction (section 14).
 * Everything retargets when interrupted, and nothing here runs on its own: motion answers an action.
 */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Rows changing place, the week changing. */
export const MOVE = { duration: 0.32, ease: EASE_IN_OUT } as const;
/** Something arriving: a row, a popover. */
export const ENTER = { duration: 0.2, ease: EASE_OUT } as const;
/** Something leaving. Exits are faster than entrances. */
export const EXIT = { duration: 0.15, ease: EASE_OUT } as const;
/** The bottom sheet: a spring with no overshoot. */
export const SHEET = { type: 'spring', bounce: 0, duration: 0.38 } as const;
