import { useState } from "react";

export default function AdminReport({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable; silently ignore
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <span style={styles.eyebrow}>Admin memo</span>
        <button type="button" onClick={handleCopy} style={styles.copyBtn}>
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>
      <pre style={styles.pre}>{text}</pre>
    </div>
  );
}

const styles = {
  wrap: {
    background: "var(--card)",
    border: "1px solid var(--rule)",
    borderRadius: 2,
    padding: "20px 22px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--graphite)",
  },
  copyBtn: {
    fontFamily: "var(--font-body)",
    fontSize: 12,
    fontWeight: 600,
    background: "none",
    border: "1px solid var(--rule)",
    borderRadius: 2,
    padding: "5px 12px",
    cursor: "pointer",
    color: "var(--ink)",
  },
  pre: {
    fontFamily: "var(--font-mono)",
    fontSize: 12.5,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    margin: 0,
    color: "var(--ink)",
  },
};
