'use client'
import { useEffect, useState } from 'react'

const LOG_TYPES = ['', '', 'warn', 'err', 'sys'] as const
const LOG_MSGS = {
  '': ['> NODE SYNC OK', '> TX VALIDATED', '> BLOCK CONFIRMED', '> PEER HANDSHAKE', '> HASH MATCH', '> MEMPOOL CLEAR'],
  warn: ['! GAS SPIKE +12%', '! MEMPOOL CONGESTED', '! LATENCY 45ms', '! RATE LIMIT NEAR'],
  err: ['x RPC TIMEOUT', 'x NODE UNREACHABLE', 'x TX REVERTED'],
  sys: ['◈ NEURAL NET ACTIVE', '◈ QUANTUM LINK UP', '◈ AI CORE READY', '◈ BASE CHAIN SYNCED'],
}

type LogType = keyof typeof LOG_MSGS

interface LogEntry { ts: string; type: LogType; msg: string }

export default function TerminalLog({ maxLines = 8, interval = 1100 }: { maxLines?: number; interval?: number }) {
  const [lines, setLines] = useState<LogEntry[]>([])

  useEffect(() => {
    const add = () => {
      const type = LOG_TYPES[Math.floor(Math.random() * LOG_TYPES.length)]
      const msgs = LOG_MSGS[type]
      const msg = msgs[Math.floor(Math.random() * msgs.length)]
      const ts = new Date().toTimeString().slice(0, 8)
      setLines(prev => [{ ts, type, msg }, ...prev].slice(0, maxLines))
    }
    add()
    const t = setInterval(add, interval)
    return () => clearInterval(t)
  }, [maxLines, interval])

  return (
    <div style={{ height: '90px', overflow: 'hidden' }}>
      {lines.map((l, i) => (
        <div key={i} className={`log-line ${l.type}`}>
          <span className="ts">[{l.ts}]</span>
          <span className="msg">{l.msg}</span>
        </div>
      ))}
    </div>
  )
}
