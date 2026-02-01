import React from "react";
import ReactDOM from "react-dom";

type Props = {
  value: string | "all";
  onChange: (v: string) => void;
  options: string[];
  label?: string;
  renderInline?: boolean;
  noMaxHeight?: boolean;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

export default function EquipmentSheet({
  value,
  onChange,
  options = [],
  label = "Equipment",
  renderInline = true,
  noMaxHeight = false,
  isOpen = false,
  onOpen,
  onClose,
}: Props) {
  const PanelContent = (
    <div
      className={`w-full bg-zinc-900 border border-white/5 rounded-t-2xl p-4 ${noMaxHeight ? "" : "max-h-[75vh] overflow-y-auto"}`}
    >
      <div className="w-12 h-1 bg-zinc-800/50 rounded-full mx-auto mt-1 mb-4" />
      <h3 className="text-center text-xl font-semibold mb-4 text-zinc-100">
        {label}
      </h3>
      <div className="space-y-2">
        <button
          className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 flex items-center gap-4"
          onClick={(e) => {
            e.stopPropagation();
            onChange("all");
            onClose?.();
          }}
        >
          <span className="text-lg text-zinc-200">All Equipment</span>
        </button>
        {options.map((opt) => {
          const display = opt.charAt(0).toUpperCase() + opt.slice(1);
          return (
            <button
              key={opt}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 flex items-center gap-4"
              onClick={(e) => {
                e.stopPropagation();
                onChange(opt);
                onClose?.();
              }}
            >
              <span className="text-lg text-zinc-200">{display}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const overlay = (
    <div
      style={{ zIndex: 2147483647 }}
      className="fixed inset-x-0 bottom-0 flex items-end justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
      />
      <div
        className="w-full max-w-3xl p-4"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClickCapture={(e) => e.stopPropagation()}
      >
        {PanelContent}
      </div>
    </div>
  );

  return (
    <>
      <div className="contents">
        <button
          onClick={(e) => {
            e.stopPropagation();
            isOpen ? onClose?.() : onOpen?.();
          }}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            isOpen
              ? "bg-white/5 border-white/20"
              : "bg-zinc-800 border-white/10"
          }`}
        >
          {value === "all" ? "All Equipment" : value}
        </button>
      </div>

      {isOpen
        ? (() => {
            if (typeof document === "undefined") return null;
            const sheetRoot = document.getElementById("sheet-root");
            if (!sheetRoot) return null;
            return ReactDOM.createPortal(
              <div
                style={{ zIndex: 2147483647 }}
                className="fixed inset-0 flex items-end justify-center"
              >
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                  }}
                />
                <div
                  className="w-full max-w-3xl p-4 pointer-events-auto"
                  onPointerDownCapture={(e) => e.stopPropagation()}
                  onClickCapture={(e) => e.stopPropagation()}
                >
                  {PanelContent}
                </div>
              </div>,
              sheetRoot,
            );
          })()
        : null}
    </>
  );
}
