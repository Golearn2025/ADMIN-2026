import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = {
      id,
      ...options,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);

    // For now, also use native alert as fallback
    if (options.variant === "destructive") {
      alert(`Error: ${options.title}\n${options.description || ""}`);
    } else {
      alert(`${options.title}\n${options.description || ""}`);
    }
  }, []);

  return { toast, toasts };
}
