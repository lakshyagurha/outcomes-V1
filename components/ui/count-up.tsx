"use client";
import { animate } from "framer-motion";
import { useEffect, useState } from "react";

export function CountUp({ to, duration = 0.8, className }: { to: number; duration?: number; className?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: (n) => setV(Math.round(n)) });
    return () => c.stop();
  }, [to, duration]);
  return <span className={`tnum ${className ?? ""}`}>{v}</span>;
}
