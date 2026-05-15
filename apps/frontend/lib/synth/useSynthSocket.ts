"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:3000";

export interface SynthEvent {
  ts: number;
  level: string;
  glyph?: string;
  msg: string;
  meta?: unknown;
}

export interface SwarmUpdate {
  agents: unknown[];
  ts: number;
}

export function useSynthSocket(maxEvents = 500) {
  const [connected, setConnected] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [events, setEvents] = useState<SynthEvent[]>([]);
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const mountedRef = useRef(true);

  const addEvent = useCallback(
    (event: SynthEvent) => {
      if (!mountedRef.current) return;
      setEvents((prev) => {
        const next = [...prev, event];
        return next.length > maxEvents ? next.slice(-maxEvents) : next;
      });
    },
    [maxEvents]
  );

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  useEffect(() => {
    mountedRef.current = true;

    let socket: ReturnType<typeof import("socket.io-client").io>;

    import("socket.io-client").then(({ io }) => {
      if (!mountedRef.current) return;

      socket = io(WS_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (mountedRef.current) setConnected(true);
      });

      socket.on("disconnect", () => {
        if (mountedRef.current) setConnected(false);
      });

      socket.on("synth:terminal", (event: SynthEvent) => {
        addEvent(event);
      });

      socket.on("system:clients", ({ count }: { count: number }) => {
        if (mountedRef.current) setClientCount(count);
      });

      socket.on("swarm:update", (data: SwarmUpdate) => {
        if (mountedRef.current && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("synth:swarm:update", { detail: data })
          );
        }
      });

      socket.on("repo:update", (data: unknown) => {
        if (mountedRef.current && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("synth:repo:update", { detail: data })
          );
        }
      });
    });

    return () => {
      mountedRef.current = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, clientCount, events, emit, clear };
}
