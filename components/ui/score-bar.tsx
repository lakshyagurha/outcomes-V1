"use client";
import { TickMeter } from "./tick-meter";

export function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between">
        <span className="label">{label}</span>
        <span className="tnum font-mono text-sm">{String(value).padStart(2, "0")}/{max}</span>
      </div>
      <TickMeter value={value} max={max} ticks={30} height={12} />
    </div>
  );
}
