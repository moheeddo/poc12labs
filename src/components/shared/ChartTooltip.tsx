"use client";

interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  unit?: string;
}

export default function ChartTooltip({ active, payload, label, unit = "점" }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="animate-fade-in-up min-w-[140px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-sans shadow-lg shadow-slate-200/60"
      style={{ fontSize: "13px" }}
    >
      {label && (
        <p className="mb-1.5 text-slate-500" style={{ fontSize: "12px" }}>
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-500">{item.name}</span>
            <span className="ml-auto font-medium text-slate-900 tabular-nums">
              {item.value}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
