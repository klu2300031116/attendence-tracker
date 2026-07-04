export default function FlaggedCard({ classId, info }) {
  return (
    <div style={styles.card}>
      <div style={styles.stamp}>NEEDS<br />ATTENTION</div>
      <div style={styles.className}>{classId}</div>
      <div style={styles.row}>
        <span style={styles.label}>Week range</span>
        <span style={styles.mono}>{info.week_range_start} &rarr; {info.week_range_end}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Est. drop</span>
        <span style={styles.monoStrong}>{info.estimated_pct_drop.toFixed(1)} pts</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Consecutive decline</span>
        <span style={styles.mono}>{info.check_a_consecutive_decline_weeks} wks</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Trend slope</span>
        <span style={styles.mono}>{info.check_b_slope.toFixed(3)} pts/wk (p={info.check_b_pvalue.toFixed(4)})</span>
      </div>
      <p style={styles.note}>
        Recommend a check-in with the class coordinator to identify causes
        (scheduling, difficulty, engagement) and plan a recovery step.
      </p>
    </div>
  );
}

const styles = {
  card: {
    position: "relative",
    background: "var(--card)",
    border: "1px solid var(--rule)",
    borderLeft: "4px solid var(--ledger-red)",
    borderRadius: 2,
    padding: "20px 22px 18px",
    overflow: "hidden",
  },
  stamp: {
    position: "absolute",
    top: 14,
    right: -30,
    transform: "rotate(18deg)",
    border: "2px solid var(--ledger-red)",
    color: "var(--ledger-red)",
    borderRadius: "50%",
    width: 84,
    height: 84,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: "var(--font-mono)",
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.04em",
    lineHeight: 1.25,
    opacity: 0.85,
  },
  className: {
    fontFamily: "var(--font-display)",
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 12,
    paddingRight: 60,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "6px 0",
    borderTop: "1px dashed var(--rule)",
    fontSize: 13,
  },
  label: { color: "var(--graphite)" },
  mono: { fontFamily: "var(--font-mono)", fontSize: 12.5 },
  monoStrong: { fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ledger-red)" },
  note: {
    marginTop: 14,
    marginBottom: 0,
    fontSize: 12.5,
    lineHeight: 1.5,
    color: "var(--graphite)",
  },
};
