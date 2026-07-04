"""
PS-96 core analysis engine.

Same logic as the original capstone script (synthetic data generation,
validation, weekly aggregation, steady-decline detection) but refactored
into functions that return plain Python dict/list structures so a FastAPI
layer can serialize them straight to JSON for a frontend to consume.
"""

import io
import numpy as np
import pandas as pd
from scipy import stats

# ----------------------------------------------------------------------------
# Config (same defaults as the original capstone script)
# ----------------------------------------------------------------------------
RNG_SEED = 42
N_WEEKS = 24
CLASSES = [f"Class-{c}" for c in "ABCDEF"]
DECLINING_CLASS = "Class-D"
DECLINE_START_WEEK = 6
WEEKLY_DECLINE_RATE = (0.01, 0.03)
MISSING_DAY_FRACTION = 0.06

MIN_CONSECUTIVE_DECLINE_WEEKS = 6
SLOPE_THRESHOLD = -0.2
PVALUE_THRESHOLD = 0.1


# ============================================================================
# 1. SYNTHETIC DATA GENERATION
# ============================================================================
def generate_synthetic_data(n_weeks=N_WEEKS, classes=None, seed=RNG_SEED):
    """Generate the synthetic daily attendance dataset as a DataFrame."""
    classes = classes or CLASSES
    rng = np.random.default_rng(seed)
    start_date = pd.Timestamp("2025-01-06")
    n_days = n_weeks * 7
    dates = pd.date_range(start=start_date, periods=n_days, freq="D")

    base_enrolled = {c: rng.integers(20, 61) for c in classes}
    base_attend_prob = {c: rng.uniform(0.80, 0.95) for c in classes}

    rows = []
    for c in classes:
        enrolled_c = base_enrolled[c]
        prob = base_attend_prob[c]
        for day_idx, d in enumerate(dates):
            week_idx = day_idx // 7
            day_prob = prob
            if c == DECLINING_CLASS and week_idx >= DECLINE_START_WEEK:
                weeks_into_decline = week_idx - DECLINE_START_WEEK + 1
                weekly_rate = rng.uniform(*WEEKLY_DECLINE_RATE)
                day_prob = prob * ((1 - weekly_rate) ** weeks_into_decline)
                day_prob = max(day_prob, 0.05)
            enrolled_today = max(1, enrolled_c + rng.integers(-1, 2))
            present_today = rng.binomial(enrolled_today, day_prob)
            rows.append({
                "date": d.strftime("%Y-%m-%d"),
                "class_id": c,
                "enrolled": enrolled_today,
                "present": present_today,
            })

    df = pd.DataFrame(rows)
    n_drop = int(len(df) * MISSING_DAY_FRACTION)
    drop_idx = rng.choice(df.index, size=n_drop, replace=False)
    df = df.drop(index=drop_idx).reset_index(drop=True)

    dirty_targets = df.sample(n=3, random_state=seed).index.tolist()
    df.loc[dirty_targets[0], "present"] = df.loc[dirty_targets[0], "enrolled"] + 5
    dup_row = df.loc[dirty_targets[1]].copy()
    df = pd.concat([df, pd.DataFrame([dup_row])], ignore_index=True)
    df.loc[dirty_targets[2], "present"] = -2

    df = df.sort_values(["class_id", "date"]).reset_index(drop=True)
    return df


# ============================================================================
# 2. VALIDATE + PREPROCESS
# ============================================================================
def validate_and_clean(df):
    """Fix/flag bad rows. Returns (clean_df, report_lines list)."""
    report_lines = []
    df = df.copy()

    dup_mask = df.duplicated(subset=["date", "class_id"], keep="first")
    n_dups = int(dup_mask.sum())
    if n_dups:
        report_lines.append(f"Removed {n_dups} duplicated (date, class_id) row(s).")
        df = df.loc[~dup_mask].copy()

    neg_mask = (df["present"] < 0) | (df["enrolled"] < 0)
    n_neg = int(neg_mask.sum())
    if n_neg:
        report_lines.append(f"Found {n_neg} row(s) with negative enrolled/present; clipped to 0.")
        df.loc[df["present"] < 0, "present"] = 0
        df.loc[df["enrolled"] < 0, "enrolled"] = 0

    over_mask = df["present"] > df["enrolled"]
    n_over = int(over_mask.sum())
    if n_over:
        report_lines.append(f"Found {n_over} row(s) where present > enrolled; capped present to enrolled.")
        df.loc[over_mask, "present"] = df.loc[over_mask, "enrolled"]

    if not report_lines:
        report_lines.append("No data quality issues found.")

    return df, report_lines


def preprocess(df):
    """Parse dates and set a per-row DatetimeIndex (Option B: no fill of missing days)."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    return df


# ============================================================================
# 3. WEEKLY AGGREGATION
# ============================================================================
def aggregate_weekly(df, week_start="W-MON"):
    """groupby(class_id) + resample(week, label='left')."""
    daily_pct = (df["present"] / df["enrolled"] * 100).rename("daily_pct")
    work = df.assign(daily_pct=daily_pct)

    grouped = work.groupby("class_id").resample(week_start, label="left")
    weekly = grouped.agg(
        weekly_enrolled=("enrolled", "sum"),
        weekly_present=("present", "sum"),
        weekly_avg_daily_pct=("daily_pct", "mean"),
        n_days=("enrolled", "count"),
    )
    weekly["weekly_attendance_rate"] = weekly["weekly_present"] / weekly["weekly_enrolled"] * 100
    weekly = weekly.reset_index().rename(columns={"date": "week_start"})
    return weekly


# ============================================================================
# 4. STEADY-DECLINE DETECTION
# ============================================================================
def detect_decline(weekly_df):
    """Returns {class_id: {...}} for flagged classes only."""
    flags = {}
    for class_id, g in weekly_df.groupby("class_id"):
        g = g.sort_values("week_start").reset_index(drop=True)
        rates = g["weekly_attendance_rate"]

        diffs = rates.diff()
        declining = diffs < 0
        run_length, longest_run, run_start_idx, best_start_idx = 0, 0, None, None
        for i, is_decl in enumerate(declining):
            if is_decl:
                if run_length == 0:
                    run_start_idx = i - 1
                run_length += 1
                if run_length > longest_run:
                    longest_run = run_length
                    best_start_idx = run_start_idx
            else:
                run_length = 0
        check_a = longest_run >= MIN_CONSECUTIVE_DECLINE_WEEKS

        valid = rates.notna()
        x = np.arange(len(rates))[valid]
        y = rates[valid].values
        if len(x) >= 3:
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        else:
            slope, p_value = 0.0, 1.0
        check_b = (slope < SLOPE_THRESHOLD) and (p_value < PVALUE_THRESHOLD)

        if check_a or check_b:
            if check_a and best_start_idx is not None:
                week_range = (g["week_start"].iloc[best_start_idx], g["week_start"].iloc[best_start_idx + longest_run])
                pct_drop = rates.iloc[best_start_idx] - rates.iloc[best_start_idx + longest_run]
            else:
                week_range = (g["week_start"].iloc[0], g["week_start"].iloc[-1])
                valid_rates = rates[valid]
                pct_drop = valid_rates.iloc[0] - valid_rates.iloc[-1]

            flags[class_id] = {
                "check_a_consecutive_decline_weeks": int(longest_run),
                "check_a_triggered": bool(check_a),
                "check_b_slope": float(slope),
                "check_b_pvalue": float(p_value),
                "check_b_triggered": bool(check_b),
                "week_range_start": week_range[0].strftime("%Y-%m-%d"),
                "week_range_end": week_range[1].strftime("%Y-%m-%d"),
                "estimated_pct_drop": float(pct_drop),
            }
    return flags


def run_sanity_checks(weekly_df):
    """Raises AssertionError if any invariant is violated. Returns True if OK."""
    valid = weekly_df.dropna(subset=["weekly_attendance_rate"])
    assert (valid["weekly_enrolled"] >= valid["weekly_present"]).all()
    assert (valid["weekly_attendance_rate"] >= 0).all()
    assert (valid["weekly_attendance_rate"] <= 100.001).all()
    return True


def build_admin_report_text(flags, validation_lines):
    lines = []
    lines.append("PS-96 ATTENDANCE TREND REPORT -- ADMIN SUMMARY")
    lines.append("=" * 55)
    lines.append("")
    lines.append("DATA QUALITY NOTES")
    lines.append("-" * 55)
    for l in validation_lines:
        lines.append(f"- {l}")
    lines.append("")
    lines.append("FLAGGED CLASSES (steady decline detected)")
    lines.append("-" * 55)
    if not flags:
        lines.append("No classes met the steady-decline criteria this period.")
    else:
        for class_id, info in flags.items():
            lines.append(f"* {class_id}")
            lines.append(f"    Week range of concern : {info['week_range_start']} to {info['week_range_end']}")
            lines.append(f"    Estimated pct-point drop : {info['estimated_pct_drop']:.1f} pts")
            lines.append(
                f"    Consecutive declining weeks : {info['check_a_consecutive_decline_weeks']} "
                f"(threshold: {MIN_CONSECUTIVE_DECLINE_WEEKS})"
            )
            lines.append(
                f"    Linear trend slope : {info['check_b_slope']:.3f} pts/week "
                f"(p={info['check_b_pvalue']:.4f})"
            )
            lines.append(
                "    Recommendation : Reach out to the class instructor/coordinator to "
                "identify causes and consider a targeted attendance-recovery intervention."
            )
            lines.append("")
    return "\n".join(lines)


# ============================================================================
# ORCHESTRATOR -- used directly by the API layer
# ============================================================================
def run_full_pipeline(csv_bytes=None, seed=RNG_SEED):
    """
    Run the entire pipeline and return one JSON-ready dict.

    If csv_bytes is provided, use that as the raw dataset (must have columns
    date, class_id, enrolled, present). Otherwise generate a fresh synthetic
    dataset with the given seed.
    """
    if csv_bytes is not None:
        raw_df = pd.read_csv(io.BytesIO(csv_bytes))
    else:
        raw_df = generate_synthetic_data(seed=seed)

    clean_df, validation_lines = validate_and_clean(raw_df)
    indexed_df = preprocess(clean_df)
    weekly_df = aggregate_weekly(indexed_df)
    run_sanity_checks(weekly_df)
    flags = detect_decline(weekly_df)
    admin_report = build_admin_report_text(flags, validation_lines)

    # Shape weekly data for a frontend line chart: one row per week_start,
    # one column per class_id's weekly_attendance_rate.
    pivot = weekly_df.pivot_table(
        index="week_start", columns="class_id", values="weekly_attendance_rate"
    ).reset_index()
    pivot["week_start"] = pivot["week_start"].dt.strftime("%Y-%m-%d")
    chart_series = pivot.to_dict(orient="records")

    class_ids = sorted(weekly_df["class_id"].unique().tolist())

    return {
        "classes": class_ids,
        "flagged_classes": list(flags.keys()),
        "flags": flags,
        "chart_series": chart_series,
        "validation_lines": validation_lines,
        "admin_report_text": admin_report,
        "raw_row_count": int(len(raw_df)),
        "weekly_row_count": int(len(weekly_df)),
    }
