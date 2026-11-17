import { type ComponentProps, useState } from 'react';

type Saving = { value: string; onSave: (value: string) => void };

/**
 * A text box that saves as it is typed.
 * The record keeps a tidied form of the words (trimmed, single spaces). If the box showed the record, a space typed
 * at the end would be tidied away before the next letter arrived, and two words could never be typed.
 * So while the box has focus it shows what was typed, and when focus leaves it shows the record again.
 */
export function DraftInput({ value, onSave, onBlur, ...rest }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & Saving) {
  const [draft, setDraft] = useState<string | null>(null);
  return <input {...rest} value={draft ?? value} onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); }} onBlur={(e) => { setDraft(null); onBlur?.(e); }} />;
}

/** The same, for several lines. */
export function DraftArea({ value, onSave, onBlur, ...rest }: Omit<ComponentProps<'textarea'>, 'value' | 'onChange'> & Saving) {
  const [draft, setDraft] = useState<string | null>(null);
  return <textarea {...rest} value={draft ?? value} onChange={(e) => { setDraft(e.target.value); onSave(e.target.value); }} onBlur={(e) => { setDraft(null); onBlur?.(e); }} />;
}
