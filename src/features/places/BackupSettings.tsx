import { useRef, useState } from 'react';
import { BACKUP, backupName, backupSummary, backupText, readBackup, REFUSALS, sentenceOf } from '../../domain/backup';
import { todayISO } from '../../domain/dates';
import { backupData, dataOf, useCompass } from '../../state/store';
import { toast } from '../../ui/Toast';

const button = 'min-h-11 cursor-pointer rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well';

/** Save everything Compass keeps as one file. It is made in the browser and handed to it to save: nothing is sent anywhere. */
export function downloadBackup() {
  const url = URL.createObjectURL(new Blob([backupText(dataOf(useCompass.getState()), new Date().toISOString())], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = backupName(todayISO());
  document.body.append(a); a.click(); a.remove();
  // kept for a minute: a phone asks before it saves a file, and the file must still be there when the answer comes
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  toast('Your backup was saved as a file.');
}

/** The day a backup was saved, with its year: "19 November 2026". */
const savedOn = (at: string): string => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(at));

/**
 * A backup, in Settings: download everything as one file, or restore from one. A file is read and what it holds is
 * said before anything changes. Restoring replaces everything, and the toast that follows can take it back.
 * `onReplaced` is told when the data has been replaced, by a restore or by its Undo.
 */
export function BackupSettings({ onReplaced }: { onReplaced: () => void }) {
  const file = useRef<HTMLInputElement>(null), ask = useRef<HTMLButtonElement>(null);
  const [offer, setOffer] = useState<{ data: Record<string, unknown>; said: string } | null>(null), [refused, setRefused] = useState<string | null>(null);
  const read = async (chosen: File | undefined) => {
    if (!chosen) return;
    setOffer(null); setRefused(null);
    // a file too large to be a backup is not read at all
    if (chosen.size > BACKUP.maxBytes) { setRefused(REFUSALS['too-large']); return; }
    try {
      const got = readBackup(await chosen.text());
      if (!got.ok) { setRefused(REFUSALS[got.why]); return; }
      // what it holds is counted after it has been checked as a save is, so the count is of what would really be kept
      const holds = sentenceOf(backupSummary(backupData(got.data)));
      setOffer({ data: got.data, said: `${got.savedAt ? `This backup was saved on ${savedOn(got.savedAt)}.` : 'This is a Compass backup.'} ${holds ? `It holds ${holds}.` : 'It holds nothing yet.'} Restoring it replaces everything on this device.` });
    }
    // a file that cannot be read, or that nothing can be made of, is refused in words like any other
    catch { setRefused(REFUSALS['not-compass']); }
  };
  // either answer puts the keyboard back on the button that asked for the file, which is where it was before the offer
  const answered = () => { setOffer(null); ask.current?.focus(); };
  const restore = () => {
    if (!offer) return;
    const store = useCompass.getState(), before = dataOf(store);
    try { store.restoreBackup(offer.data); }
    catch {
      // the browser would not save it, which is what a full device does. What was here is put back on screen: it is still what is saved
      try { useCompass.setState(before); } catch { /* it is refusing to save, and what is saved is already this */ }
      answered(); setRefused(REFUSALS['no-room']);
      return;
    }
    answered(); onReplaced();
    toast('Backup restored.', { label: 'Undo', run: () => { useCompass.getState().undoRestore(before); onReplaced(); } });
  };
  return (
    <div data-backup className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" id="download-backup" className={button} onClick={downloadBackup}>Download a backup</button>
        <button type="button" id="restore-backup" ref={ask} className={button} onClick={() => file.current?.click()}>Restore from a backup</button>
        {/* the browser's own file box, opened by the button above. Choosing the same file twice must still be heard, so it is emptied each time */}
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const chosen = e.target.files?.[0]; e.target.value = ''; void read(chosen); }} />
      </div>
      <p className="mt-2 max-w-[56ch] text-[14.5px] text-text-muted">A backup is one file that holds everything here. It is made on this device and sent nowhere.</p>
      {/* Always in the page, and filled when a backup has been read: a screen reader announces what changes in a
          place it already knows of, and may say nothing of one that arrives with its words already in it. */}
      <p role="status" className="sr-only">{offer?.said ?? ''}</p>
      {refused && <p role="alert" className="mt-2 text-[14.5px] font-medium text-attention">{refused}</p>}
      {offer && (
        <div data-backup-offer className="mt-3 rounded-lg bg-surface-well p-4">
          <p className="max-w-[56ch] text-pretty text-[14.5px] [overflow-wrap:anywhere]">{offer.said}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 cursor-pointer rounded-md bg-attention px-4 text-[14.5px] font-semibold text-on-attention" onClick={restore}>Replace everything with this backup</button>
            <button type="button" className={`${button} bg-surface-sheet`} onClick={answered}>Keep what is here</button>
          </div>
        </div>
      )}
    </div>
  );
}
