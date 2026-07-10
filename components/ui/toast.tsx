"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastCtx {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ACCENT: Record<Tone, string> = {
  primary: "border-l-primary",
  ok: "border-l-ok",
  warn: "border-l-warn",
  crit: "border-l-crit",
  info: "border-l-info",
  neutral: "border-l-neutral",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((opts: ToastOptions) => {
    idRef.current += 1;
    setItems((prev) => [...prev, { id: idRef.current, ...opts }]);
  }, []);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 4000}
            onOpenChange={(open) => { if (!open) remove(t.id); }}
            className={cn(
              "flex items-start gap-3 rounded-md border border-l-4 border-border bg-elevated px-4 py-3 shadow-modal",
              ACCENT[t.tone ?? "neutral"],
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-body-sm font-semibold text-text">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-caption text-text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close className="text-text-faint transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" aria-label="닫기">
              <X size={16} aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
