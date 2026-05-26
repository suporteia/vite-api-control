type Props = {
  aggStats: Record<string, string>;
};

export function AggPanel({ aggStats }: Props) {
  const aggKeys = Object.keys(aggStats).filter((k) => !k.startsWith("_"));
  if (!aggKeys.length) return null;
  return (
    <div className="agg-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "var(--tx2)",
          }}
        >
          Campos Redis
        </span>
        <span className="src-tag src-redis">data específica</span>
      </div>
      <div className="agg-grid">
        {aggKeys.map((k) => (
          <div className="agg-item" key={k}>
            <div className="agg-k">{k}</div>
            <div className="agg-v">{aggStats[k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
