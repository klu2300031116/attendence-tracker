import { useEffect, useState, useCallback } from "react";
import { fetchAnalysis, uploadCsvForAnalysis, csvDownloadUrl } from "./api";
import ControlBar from "./components/ControlBar";
import TrendChart from "./components/TrendChart";
import FlaggedCard from "./components/FlaggedCard";
import AdminReport from "./components/AdminReport";

export default function App() {
  const [seed, setSeed] = useState(42);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceLabel, setSourceLabel] = useState(`synthetic \u00b7 seed ${seed}`);

  const loadSynthetic = useCallback(async (s) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalysis(s);
      setData(result);
      setSourceLabel(`synthetic \u00b7 seed ${s}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSynthetic(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeedChange = (s) => {
    setSeed(s);
    loadSynthetic(s);
  };

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadCsvForAnalysis(file);
      setData(result);
      setSourceLabel(`uploaded \u00b7 ${file.name}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.eyebrow}>PS-96 &middot; Module 6 Capstone</span>
        <h1 style={styles.title}>Attendance Trend Report</h1>
        <p style={styles.subtitle}>
          Weekly attendance by class, with automatic detection of classes in
          steady decline &mdash; built on pandas resampling and a linear-trend test.
        </p>
      </header>

      <ControlBar
        seed={seed}
        onSeedChange={handleSeedChange}
        onUpload={handleUpload}
        onDownloadCsv={csvDownloadUrl(seed)}
        loading={loading}
        sourceLabel={sourceLabel}
      />

      {error && <div style={styles.errorBox}>Couldn&apos;t load data: {error}</div>}

      {loading && !data && <p style={styles.loadingText}>Loading attendance data&hellip;</p>}

      {data && (
        <>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Weekly attendance rate by class</h2>
            <TrendChart
              series={data.chart_series}
              classes={data.classes}
              flaggedClasses={data.flagged_classes}
            />
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Flagged classes
              <span style={styles.countBadge}>{data.flagged_classes.length}</span>
            </h2>
            {data.flagged_classes.length === 0 ? (
              <div style={styles.allClear}>
                All classes are within normal attendance patterns this period.
              </div>
            ) : (
              <div style={styles.cardGrid}>
                {data.flagged_classes.map((cls) => (
                  <FlaggedCard key={cls} classId={cls} info={data.flags[cls]} />
                ))}
              </div>
            )}
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Admin summary</h2>
            <AdminReport text={data.admin_report_text} />
          </section>

          <footer style={styles.footer}>
            {data.raw_row_count} daily records &middot; {data.weekly_row_count} weekly rows &middot; PS-96 Attendance Trend Report
          </footer>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "48px 24px 80px",
  },
  header: {
    marginBottom: 8,
    paddingBottom: 28,
    borderBottom: "2px solid var(--ink)",
  },
  eyebrow: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--graphite)",
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: "clamp(32px, 5vw, 48px)",
    fontWeight: 600,
    margin: "8px 0 10px",
    color: "var(--ink)",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--graphite)",
    maxWidth: 640,
    margin: 0,
  },
  section: { marginBottom: 40 },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  countBadge: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 600,
    background: "var(--ledger-red-soft)",
    color: "var(--ledger-red)",
    borderRadius: 20,
    padding: "2px 10px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 18,
  },
  allClear: {
    background: "var(--teal-soft)",
    color: "var(--teal)",
    border: "1px solid var(--teal)",
    borderRadius: 2,
    padding: "16px 20px",
    fontSize: 14,
  },
  errorBox: {
    background: "var(--ledger-red-soft)",
    color: "var(--ledger-red)",
    border: "1px solid var(--ledger-red)",
    borderRadius: 2,
    padding: "14px 18px",
    marginBottom: 24,
    fontSize: 14,
  },
  loadingText: { color: "var(--graphite)", fontSize: 14 },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid var(--rule)",
    fontFamily: "var(--font-mono)",
    fontSize: 11.5,
    color: "var(--graphite)",
    textAlign: "center",
  },
};
