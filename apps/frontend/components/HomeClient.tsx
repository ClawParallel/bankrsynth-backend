"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Nav from "@/components/Nav";

const ASCII_LOGO = `
██████╗  █████╗ ███╗   ██╗██╗  ██╗██████╗
██╔══██╗██╔══██╗████╗  ██║██║ ██╔╝██╔══██╗
██████╔╝███████║██╔██╗ ██║█████╔╝ ██████╔╝
██╔══██╗██╔══██║██║╚████║██╔═██╗ ██╔══██╗
██████╔╝██║  ██║██║ ╚███║██║  ██╗██║  ██║
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚══╝╚═╝  ╚═╝╚═╝  ╚═╝`.trim();

const BOOT_LINES = [
  "> [00:00:01] Initializing neural execution layer...",
  "> [00:00:02] Connecting to Base network.............. OK",
  "> [00:00:03] Loading agent modules.................. 4/4",
  "> [00:00:04] System operational. All systems nominal.",
];

const MODULES = [
  {
    href: "/launch",
    icon: "◈",
    name: "LAUNCH MODULE",
    desc: "Deploy tokens on Base",
    color: "var(--green)",
  },
  {
    href: "/agent",
    icon: "⬡",
    name: "AGENT MODULE",
    desc: "Autonomous execution",
    color: "var(--green)",
  },
  {
    href: "/terminal",
    icon: "◉",
    name: "AI TERMINAL",
    desc: "Market intelligence",
    color: "var(--green)",
  },
  {
    href: "/intel",
    icon: "◎",
    name: "INTEL FEED",
    desc: "Narrative scanner",
    color: "var(--green)",
  },
];

export default function HomeClient() {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [logoVisible, setLogoVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setLogoVisible(true), 200);

    BOOT_LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        if (i === BOOT_LINES.length - 1) {
          setTimeout(() => setCardsVisible(true), 400);
        }
      }, 600 + i * 700);
      return () => clearTimeout(t);
    });

    return () => clearTimeout(t0);
  }, []);

  return (
    <>
      <Nav />

      {/* EYEBROW */}
      <p
        className="text-xs tracking-widest mb-6 opacity-50"
        style={{ letterSpacing: "0.3em" }}
      >
        ◈ AUTONOMOUS EXECUTION LAYER
      </p>

      {/* ASCII LOGO */}
      <div
        className="transition-all duration-700 mb-4"
        style={{
          opacity: logoVisible ? 1 : 0,
          transform: logoVisible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <pre
          className="text-center flicker leading-tight overflow-x-auto max-w-full"
          style={{
            fontSize: "clamp(5px, 1.4vw, 14px)",
            color: "var(--green)",
            textShadow: "0 0 8px var(--green), 0 0 20px rgba(0,255,156,0.4)",
            letterSpacing: "0.05em",
          }}
        >
          {ASCII_LOGO}
        </pre>
      </div>

      {/* SUBTITLE */}
      <p
        className="text-xs tracking-widest mb-8 transition-all duration-500"
        style={{
          color: "rgba(0,255,156,0.6)",
          letterSpacing: "0.25em",
          opacity: logoVisible ? 1 : 0,
        }}
      >
        SYNTH // v2.0.0 // BASE NETWORK // ONLINE
      </p>

      {/* BOOT LOG */}
      <div
        className="w-full max-w-lg mb-10 font-mono text-xs space-y-1 min-h-[80px]"
        style={{ color: "rgba(0,255,156,0.65)" }}
      >
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className="animate-slide-in"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {line}
          </div>
        ))}
        {visibleLines.length < BOOT_LINES.length && (
          <span
            className="inline-block"
            style={{ animation: "blink 1s step-end infinite", color: "var(--green)" }}
          >
            █
          </span>
        )}
      </div>

      {/* MODULE CARDS */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl transition-all duration-500"
        style={{ opacity: cardsVisible ? 1 : 0, transform: cardsVisible ? "translateY(0)" : "translateY(16px)" }}
      >
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="no-underline group">
            <div className="module-card h-full">
              {/* Icon */}
              <div
                className="text-2xl mb-3 transition-all duration-200 group-hover:scale-110"
                style={{ textShadow: "0 0 12px var(--green)" }}
              >
                {m.icon}
              </div>

              {/* Name */}
              <div
                className="text-sm tracking-widest font-bold mb-1"
                style={{ color: "var(--green)", letterSpacing: "0.15em" }}
              >
                {m.name}
              </div>

              {/* Desc */}
              <div
                className="text-xs"
                style={{ color: "rgba(0,255,156,0.5)" }}
              >
                {m.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* FOOTER */}
      <p
        className="mt-10 text-xs"
        style={{ color: "rgba(0,255,156,0.3)", letterSpacing: "0.1em" }}
      >
        Built on Base • Powered by Bankr LLM Gateway
      </p>
    </>
  );
}
