import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router';
import { downloadBackup } from '../features/places/BackupSettings';

const button = 'flex min-h-11 w-fit cursor-pointer items-center rounded-md px-4 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:bg-surface-well';

/**
 * Shown in place of a page that could not be drawn. The rest of Compass stays: the rail, the bar on a phone, and the
 * way to Settings, where everything can be backed up or an earlier backup restored. Nothing is changed by showing it.
 */
export function PageError() {
  const error = useRouteError();
  // said once in the console, for whoever is looking into it; the page itself says nothing technical
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-5 pb-32 pt-10 sm:pb-12 lg:pt-16">
      <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em] lg:text-[40px]">This page could not be shown</h1>
      <p className="max-w-[56ch] text-pretty text-[15.5px] text-text-muted">Something went wrong while it was being put on the screen. Nothing you have kept was changed. The other places still work, and Settings can download a backup of everything or restore an earlier one.</p>
      <div className="flex flex-wrap gap-2">
        <Link to="/settings#data" className={button}>Go to Settings</Link>
        <Link to="/" className={button}>Go to Home</Link>
      </div>
    </main>
  );
}

/** Shown when Compass itself could not be drawn, so there is no rail to stay. It offers the two things that still help. */
export function AppError() {
  const error = useRouteError();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-5 py-16 text-text">
      <h1 className="text-[32px] leading-[1.1] tracking-[-0.012em]">Compass could not open</h1>
      <p className="max-w-[56ch] text-pretty text-[15.5px] text-text-muted">Something went wrong while it was starting. Nothing you have kept was changed. You can download a backup of everything on this device, and try again.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={downloadBackup} className={button}>Download a backup</button>
        <a href="/" className={button}>Try again</a>
      </div>
    </main>
  );
}
