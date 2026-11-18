/**
 * Motion tokens, matching the durations and curves in tokens.css and motion.css and the art direction (section 14).
 * Everything retargets when interrupted, and nothing here runs on its own: motion answers an action.
 */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Rows changing place, the week changing. */
export const MOVE = { duration: 0.32, ease: EASE_IN_OUT } as const;
/** Something arriving: a row, a popover. */
export const ENTER = { duration: 0.2, ease: EASE_OUT } as const;
/** Something leaving. An exit is 20% shorter than the entrance it undoes. */
export const EXIT = { duration: 0.16, ease: EASE_OUT } as const;
/** The bottom sheet: a spring with no overshoot. */
export const SHEET = { type: 'spring', bounce: 0, duration: 0.38 } as const;

/** A popover starts here, not at nothing, and grows from the control that opened it. */
export const POPOVER_FROM = 0.95;
/** A moving knob (the selected day) stretches this much along its travel as it goes, and settles back. */
export const KNOB_STRETCH = 1.12;
/** The same knob lifts a few pixels mid-move, so it travels in an arc rather than a straight line. */
export const KNOB_ARC = -3;
/** An icon that changes into another crosses over with a little blur and scale, then clears. */
export const ICON_BLUR = 'blur(4px)';
