"use client";
import { useEffect, useState } from "react";

export default function TypingText({ text }: { text: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    setDisplay("");
    let i = 0;

    const interval = setInterval(() => {
      setDisplay(text.slice(0, i));
      i++;

      if (i > text.length) clearInterval(interval);
    }, 25);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="font-mono">
      {display}
      <span className="animate-pulse">█</span>
    </div>
  );
}