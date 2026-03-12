import { useToastStore } from "../../store/useToastStore.ts";

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-100 flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass-panel rounded-lg px-4 py-3 text-sm font-medium pointer-events-auto ${
            t.type === "success"
              ? "border-l-2 border-nexus-green text-nexus-green"
              : t.type === "error"
                ? "border-l-2 border-nexus-error text-nexus-error"
                : "border-l-2 border-nexus-cyan text-nexus-cyan"
          } ${t.exiting ? "toast-exit" : "toast-enter"}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
