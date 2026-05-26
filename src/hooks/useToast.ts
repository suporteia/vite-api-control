/**
 * Toast simples — replica a função toast() do original.
 * Mostra mensagem por 3.5s no canto inferior direito.
 */
import { useCallback, useEffect, useState } from "react";

export type ToastState = {
  message: string;
  isError: boolean;
  visible: boolean;
};

let _setExternalToast: ((t: Omit<ToastState, "visible">) => void) | null = null;

export function showToast(message: string, isError = false) {
  _setExternalToast?.({ message, isError });
}

export function useToast(): ToastState {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    isError: false,
    visible: false,
  });

  const trigger = useCallback((t: Omit<ToastState, "visible">) => {
    setToast({ ...t, visible: true });
  }, []);

  useEffect(() => {
    _setExternalToast = trigger;
    return () => {
      _setExternalToast = null;
    };
  }, [trigger]);

  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(
      () => setToast((curr) => ({ ...curr, visible: false })),
      3500
    );
    return () => clearTimeout(t);
  }, [toast.visible, toast.message]);

  return toast;
}
