'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'thinking'
  content: string
  ts: number
}

const SUGGESTED = [
  "What's trending on Base right now?",
  "Analyze AEON for me",
  "Generate a thesis on VIRTUAL",
  "What's the global market doing?",
  "Show whale activity on AEON",
  "What's BTC dominance today?",
]

function mkId() { return Math.random().toString(36).slice(2) }

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')
    const interval = setInterval(() => {
      idxRef.current++
      setDisplayed(text.slice(0, idxRef.current))
      if (idxRef.current >= text.length) clearInterval(interval)
    }, 8)
    return () => clearInterval(interval)
  }, [text])

  return <span>{displayed}{displayed.length < text.length && <span style={{ animation: 'blink 0.8s infinite' }}>▌</span>}</span>
}

export default function TerminalPage() {
  const { address, isConnected } = useAccount()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAiId, setLastAiId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const histRef = useRef<string[]>([])
  const histIdxRef = useRef(-1)

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40)
  }, [])

  useEffect(() => { scrollDown() }, [messages, scrollDown])

  // Welcome message on mount
  useEffect(() => {
    const welcome: Message = {
      id: mkId(),
      role: 'assistant',
      content: `BankrSynth AI Terminal — online.\nBase network · live data · ${new Date().toUTCString()}\n\nAsk me anything: token prices, market analysis, trending tokens, whale activity, portfolio review.\nNo commands needed — just type naturally.`,
      ts: Date.now(),
    }
    setMessages([welcome])
    setLastAiId(welcome.id)
  }, [])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    histRef.current = [trimmed, ...histRef.current].slice(0, 100)
    histIdxRef.current = -1
    setInput('')

    const userMsg: Message = { id: mkId(), role: 'user', content: trimmed, ts: Date.now() }
    const thinkingMsg: Message = { id: mkId(), role: 'thinking', content: '', ts: Date.now() }

    setMessages(prev => [...prev, userMsg, thinkingMsg])
    setLoading(true)

    // Build conversation history for API (only user/assistant, not thinking)
    const apiMessages = [...messages, userMsg]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          walletAddress: isConnected ? address : undefined,
        }),
      })

      const data = await r.json() as { response?: string; error?: string }

      if (!r.ok || data.error) {
        const errMsg: Message = {
          id: mkId(),
          role: 'assistant',
          content: data.error ?? 'Something went wrong. Try again.',
          ts: Date.now(),
        }
        setMessages(prev => prev.filter(m => m.role !== 'thinking').concat(errMsg))
        setLastAiId(errMsg.id)
      } else {
        const aiMsg: Message = {
          id: mkId(),
          role: 'assistant',
          content: data.response ?? '',
          ts: Date.now(),
        }
        setMessages(prev => prev.filter(m => m.role !== 'thinking').concat(aiMsg))
        setLastAiId(aiMsg.id)
      }
    } catch {
      const errMsg: Message = {
        id: mkId(),
        role: 'assistant',
        content: 'Network error — check connection and try again.',
        ts: Date.now(),
      }
      setMessages(prev => prev.filter(m => m.role !== 'thinking').concat(errMsg))
      setLastAiId(errMsg.id)
    }

    setLoading(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdxRef.current + 1, histRef.current.length - 1)
      histIdxRef.current = next
      setInput(histRef.current[next] ?? '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdxRef.current - 1, -1)
      histIdxRef.current = next
      setInput(next === -1 ? '' : histRef.current[next] ?? '')
    }
  }

  const isEmpty = messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).filter(m => m.role === 'user').length === 0

  return (
    <main
      style={{ height: '100dvh', paddingTop: 'clamp(52px,8vw,56px)', display: 'flex', flexDirection: 'column', background: '#000', cursor: 'text' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(0,255,65,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.3em' }}>BANKRSYNTH://</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(13px,2vw,18px)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 20px rgba(0,255,65,0.4)' }}>
            ▶ AI TERMINAL
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConnected && address && (
            <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.4)', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--green)' }}>●</span> {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
          <span style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {messages.map((msg, idx) => {
          if (msg.role === 'thinking') {
            return (
              <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', color: 'var(--green)' }}>◉</span>
                </div>
                <div style={{ padding: '8px 12px', background: 'rgba(0,8,2,0.8)', border: '1px solid rgba(0,255,65,0.15)', fontSize: '11px', color: 'rgba(0,255,65,0.5)', fontFamily: 'var(--font-mono)' }}>
                  fetching live data<span style={{ animation: 'blink 0.6s step-end infinite' }}>...</span>
                </div>
              </div>
            )
          }

          if (msg.role === 'user') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  background: 'rgba(0,255,65,0.07)',
                  border: '1px solid rgba(0,255,65,0.25)',
                  fontSize: '12px',
                  color: 'rgba(0,255,65,0.9)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            )
          }

          // assistant
          const isLatestAi = msg.id === lastAiId
          return (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                <span style={{ fontSize: '10px', color: 'var(--green)' }}>◉</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em', marginBottom: '5px', fontFamily: 'var(--font-display)' }}>BANKRSYNTH</div>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(0,6,2,0.85)',
                  border: '1px solid rgba(0,255,65,0.12)',
                  fontSize: '12px',
                  color: 'rgba(0,255,65,0.85)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {isLatestAi && idx === messages.length - 1
                    ? <TypingText text={msg.content} />
                    : msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {/* Suggested prompts — shown after welcome when no user messages sent */}
        {isEmpty && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '38px' }}>
            {SUGGESTED.map((s, i) => {
              if (i === 3 && !isConnected) return null
              return (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid rgba(0,255,65,0.2)',
                    color: 'rgba(0,255,65,0.55)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    letterSpacing: '0.05em',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,65,0.5)'; e.currentTarget.style.color = 'var(--green)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,65,0.2)'; e.currentTarget.style.color = 'rgba(0,255,65,0.55)' }}
                >
                  {s}
                </button>
              )
            })}
            {isConnected && (
              <button
                onClick={() => sendMessage(`Show my portfolio for ${address}`)}
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(0,255,65,0.2)', color: 'rgba(0,255,65,0.55)', fontFamily: 'var(--font-mono)', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.05em' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,65,0.5)'; e.currentTarget.style.color = 'var(--green)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,255,65,0.2)'; e.currentTarget.style.color = 'rgba(0,255,65,0.55)' }}
              >
                Show my portfolio
              </button>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{ borderTop: '1px solid rgba(0,255,65,0.12)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'rgba(0,2,0,0.9)' }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ color: loading ? 'rgba(0,255,65,0.35)' : 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '14px', flexShrink: 0 }}>
          {loading ? '◌' : '▸'}
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={loading ? 'thinking...' : 'Ask about any token, market, or portfolio...'}
          disabled={loading}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: '13px',
            caretColor: 'var(--green)',
            opacity: loading ? 0.4 : 1,
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: input.trim() && !loading ? 'rgba(0,255,65,0.08)' : 'transparent',
            border: `1px solid ${input.trim() && !loading ? 'rgba(0,255,65,0.4)' : 'rgba(0,255,65,0.12)'}`,
            color: input.trim() && !loading ? 'var(--green)' : 'rgba(0,255,65,0.25)',
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.15em',
            padding: '7px 12px', cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.15s', flexShrink: 0,
          }}
        >
          SEND ↵
        </button>
      </div>
    </main>
  )
}
