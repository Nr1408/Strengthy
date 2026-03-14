import { Sparkles } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm mx-0 sm:mx-4 space-y-5">

        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base leading-snug">
              Hide workout suggestions?
            </h2>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              Next Up helps you stay consistent by recommending what to do next.
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onKeep}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
          >
            Keep showing
          </button>

          <button
            type="button"
            onClick={onTurnOff}
            className="w-full py-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/8 text-sm font-semibold text-zinc-300 transition-colors"
          >
            Hide it
          </button>
        </div>

      </div>
    </div>
  );
}