import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onKeep: () => void;
  onSessionDismiss: () => void;
  onTurnOff: () => void;
}

export default function HideNextUpDialog({
  open,
  onKeep,
  onSessionDismiss,
  onTurnOff,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
        <div>
          <h2 className="text-white font-semibold text-base">
            Hide workout suggestions?
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Next Up helps you stay consistent by recommending what to do next.
          </p>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onTurnOff}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold border border-white/10 transition-colors text-left"
          >
            Turn off
            <span className="block text-xs text-zinc-500 font-normal">
              Hide permanently — re-enable in settings
            </span>
          </button>
          <button
            type="button"
            onClick={onSessionDismiss}
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold border border-white/10 transition-colors text-left"
          >
            Not now
            <span className="block text-xs text-zinc-500 font-normal">
              Hide until I come back
            </span>
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="w-full px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
          >
            Keep showing
          </button>
        </div>
      </div>
    </div>
  );
}
