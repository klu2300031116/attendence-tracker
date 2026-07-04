import { useRef, useState } from "react";

export default function ControlBar({ seed, onSeedChange, onRegenerate, onUpload, onDownloadCsv, loading, sourceLabel }) {
  const fileInputRef = useRef(null);
  const [seedInput, setSeedInput] = useState(String(seed));

  const handleSeedSubmit = (e) => {
    e.preventDefault();
    const n = parseInt(seedInput, 10);
    if (!Number.isNaN(n)) onSeedChange(n);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  };

  return (
    <div style={styles.bar}>
      <div style={styles.source}>
        <span style={styles.sourceLabel}>Data source</span>
        <span style={styles.sourceValue}>{sourceLabel}</span>
      </div>

      <form onSubmit={handleSeedSubmit} style={styles.seedForm}>
        <label style={styles.fieldLabel} htmlFor="seed-input">Seed</label>
        <input
          id="seed-input"
          type="number"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.buttonSecondary} disabled={loading}>
          Regenerate
        </button>
      </form>

      <div style={styles.actions}>
        <button
          type="button"
          style={styles.buttonPrimary}
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <a href={onDownloadCsv} style={styles.link} download="attendance_sample.csv">
          Download sample CSV
        </a>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
    padding: "14px 0",
    borderTop: "1px solid var(--rule)",
    borderBottom: "1px solid var(--rule)",
    marginBottom: 28,
  },
  source: { display: "flex", flexDirection: "column", gap: 2, marginRight: 8 },
  sourceLabel: {
    fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.08em",
    color: "var(--graphite)",
  },
  sourceValue: { fontFamily: "var(--font-mono)", fontSize: 13 },
  seedForm: { display: "flex", alignItems: "center", gap: 8 },
  fieldLabel: { fontSize: 12.5, color: "var(--graphite)" },
  input: {
    width: 72,
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    padding: "6px 8px",
    border: "1px solid var(--rule)",
    borderRadius: 2,
    background: "var(--card)",
    color: "var(--ink)",
  },
  buttonSecondary: {
    fontFamily: "var(--font-body)",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "7px 14px",
    background: "var(--card)",
    color: "var(--ink)",
    border: "1px solid var(--ink)",
    borderRadius: 2,
    cursor: "pointer",
  },
  actions: { display: "flex", alignItems: "center", gap: 16, marginLeft: "auto" },
  buttonPrimary: {
    fontFamily: "var(--font-body)",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "8px 16px",
    background: "var(--ink)",
    color: "var(--paper)",
    border: "1px solid var(--ink)",
    borderRadius: 2,
    cursor: "pointer",
  },
  link: {
    fontSize: 12.5,
    color: "var(--graphite)",
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
};
