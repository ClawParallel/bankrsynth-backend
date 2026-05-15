"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TerminalEvent } from "@bankrsynth/shared";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

const MAX_LINES = 200;

export interface TerminalLine extends TerminalEvent {
  id: number;
}

let lineCounter = 0;

export function useSynthTerminal() {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const addLine = useCallback((event: TerminalEvent) => {
    setLines((prev) => {
      const next = [
        ...prev,
        { ...event, id: ++lineCounter },
      ];
      return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next;
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    const url = `${BACKEND_URL}/terminal/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as TerminalEvent;
        addLine(event);
      } catch {
        // ignore malformed
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [addLine]);

  return { lines, connected, clear };
}
