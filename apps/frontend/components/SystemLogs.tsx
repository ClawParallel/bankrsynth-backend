"use client";
import { useEffect, useState } from "react";

const LINES = [
  "> [00:00:01] Initializing neural execution layer...",
  "> [00:00:02] Connecting to Base network............. OK",
  "> [00:00:03] Loading agent modules.................. 4/4",
  "> [00:00:04] LLM gateway ready...................... OK",
  "> [00:00:05] System operational.",
];

export default function SystemLogs() {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    LINES.forEach((line, i) => {
      setTimeout(() => {
        setVisible((prev) => [...prev, line]);
      }, i * 600);
    });
  }, []);

  return (
    <div className="text-xs font-mono space-y-1">
      {visible.map((line, i) => (
        <p
          key={i}
          className={`fade-in ${line.includes("OK") ? "text-success" : "muted"}`}
        >
          {line}
        </p>
      ))}
      {visible.length > 0 && visible.length < LINES.length && (
        <span className="text-green-400 cursor-blink">_</span>
      )}
    </div>
  );
}
