import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";

// Distinct, print-friendly line colors (avoids the recharts default rainbow).
const PALETTE = ["#1B2A4A", "#B8862E", "#3E7C74", "#6B4E71", "#8C9C3E", "#4A6FA5", "#A65A2E"];

export default function TrendChart({ series, classes, flaggedClasses }) {
  return (
    <div style={{ width: "100%", height: 420 }}>
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--rule)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="week_start"
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--graphite)" }}
            tickMargin={10}
            interval={Math.max(0, Math.floor(series.length / 10))}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--graphite)" }}
            width={36}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              border: "1px solid var(--ink)",
              borderRadius: 0,
              background: "var(--card)",
            }}
            labelStyle={{ fontWeight: 600, color: "var(--ink)" }}
            formatter={(value) => (value == null ? "no data" : `${value.toFixed(1)}%`)}
          />
          <Legend
            wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 13, paddingTop: 12 }}
            iconType="plainline"
          />
          {classes.map((cls, i) => {
            const isFlagged = flaggedClasses.includes(cls);
            return (
              <Line
                key={cls}
                type="monotone"
                dataKey={cls}
                stroke={isFlagged ? "var(--ledger-red)" : PALETTE[i % PALETTE.length]}
                strokeWidth={isFlagged ? 3 : 1.75}
                strokeDasharray={isFlagged ? "6 4" : undefined}
                dot={isFlagged ? { r: 3.5 } : false}
                activeDot={{ r: 5 }}
                connectNulls
                name={isFlagged ? `${cls} \u2014 declining` : cls}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
