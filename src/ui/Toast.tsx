import { useEffect } from 'react';
import { create } from 'zustand';

interface Toast { id: number; message: string; action?: { label: string; run: () => void } }
interface ToastStore { toasts: Toast[]; push: (message: string, action?: Toast['action']) => void; dismiss: (id: number) => void }

let nextId = 1;
export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  // one toast at a time keeps the screen calm
  push: (message, action) => set({ toasts: [{ id: nextId++, message, action }] }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
/** Show a one-line message with an optional action, such as Undo. */
export const toast = (message: string, action?: Toast['action']) => useToasts.getState().push(message, action);

function ToastItem({ toast: t }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => { const timer = window.setTimeout(() => dismiss(t.id), 6000); return () => window.clearTimeout(timer); }, [t.id, dismiss]);
  return (
    <div className="pointer-events-auto flex items-center gap-4 rounded-md bg-surface-inverse py-2.5 pl-4 pr-2.5 text-[14.5px] text-text-inverse shadow-float">
      <span>{t.message}</span>
      {t.action && (
        <button type="button" onClick={() => { t.action!.run(); dismiss(t.id); }}
          className="min-h-9 cursor-pointer rounded-[9px] px-3 font-semibold text-brass-300 outline-marine-300 hover:bg-deep-800">
          {t.action.label}
        </button>
      )}
    </div>
  );
}

/** Where toasts appear: bottom centre, above the tab bar on phones. Announced politely. */
export function ToastRegion() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] z-50 flex justify-center px-4 sm:bottom-6">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
