"use client";
import { useState } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface UseToastReturn {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title,
      description,
      variant,
    };
    setToasts((current) => [...current, newToast]);
    
    // 3秒後に自動的に消える
    setTimeout(() => {
      dismiss(id);
    }, 3000);
    
    return id;
  };

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  return {
    toasts,
    toast,
    dismiss,
  };
} 