"use client"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

export type PricePoint = { date: string; [competitor: string]: number | string }
export type AmpPoint = { date: string; AMP: number; SRP: number }

const LINE_COLORS = [
  "#00343A", "#33A579", "#6366f1", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
]

interface Props {
  priceData: PricePoint[]
  ampData: AmpPoint[]
  competitorNames: string[]
  sym: string
}

export default function TrendsTab({ priceData, ampData, competitorNames, sym }: Props) {
  const hasEnough = priceData.length >= 2

  if (!hasEnough) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 font-medium mb-1">Not enough data yet</p>
        <p className="text-gray-400 text-sm">Run at least 2 scrape cycles to see trends.</p>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col gap-8">
      {/* Competitor prices */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-[#00343A] mb-6">Competitor Prices Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={priceData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v) => `${sym}${v}`}
            />
            <Tooltip formatter={(v) => typeof v === "number" ? `${sym}${v.toFixed(2)}` : v} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {competitorNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AMP & SRP trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-[#00343A] mb-6">
          AMP &amp; SRP Trend
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={ampData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v) => `${sym}${v}`}
            />
            <Tooltip formatter={(v) => typeof v === "number" ? `${sym}${v.toFixed(2)}` : v} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="AMP"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="SRP"
              stroke="#33A579"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
