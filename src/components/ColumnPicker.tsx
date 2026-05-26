import { useEffect, useRef, useState } from "react";

type Props = {
  allKeys: string[];
  hidden: Set<string>;
  onToggle: (k: string, visible: boolean) => void;
  onSetAll: (visible: boolean) => void;
  displayName: (k: string) => string;
};

export function ColumnPicker({
  allKeys,
  hidden,
  onToggle,
  onSetAll,
  displayName,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div className="col-picker" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11,
          background: "var(--bg3)",
          border: "1px solid var(--bd2)",
          borderRadius: 6,
          color: "var(--tx)",
          padding: "3px 8px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontWeight: 400,
          textTransform: "none",
          letterSpacing: 0,
        }}
      >
        ⚙ Colunas
      </button>
      <div className={`col-picker-menu ${open ? "open" : ""}`}>
        <div className="cp-head">
          Colunas visíveis
          <button className="cp-mini" onClick={() => onSetAll(true)}>
            todas
          </button>
          <button className="cp-mini" onClick={() => onSetAll(false)}>
            nenhuma
          </button>
        </div>
        {allKeys.map((k) => (
          <label className="cp-row" key={k}>
            <input
              type="checkbox"
              checked={!hidden.has(k)}
              onChange={(e) => onToggle(k, e.target.checked)}
            />
            {displayName(k)}
          </label>
        ))}
      </div>
    </div>
  );
}
