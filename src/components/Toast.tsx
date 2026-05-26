import type { ToastState } from "../hooks/useToast";

export function Toast({ state }: { state: ToastState }) {
  const cls = state.visible ? "show" : "";
  const errCls = state.isError ? "err" : "";
  return (
    <div id="toast" className={`${cls} ${errCls}`.trim()}>
      {state.message}
    </div>
  );
}
