'use client'
import { useState, useEffect } from 'react'
import { PROVIDERS, ProviderId, BYOKConfig, saveBYOK, loadBYOK, clearBYOK } from '@/lib/byok'

interface Props {
  onClose: () => void
}

export default function BYOKModal({ onClose }: Props) {
  const existing = loadBYOK()

  const [provider, setProvider] = useState<ProviderId>(existing?.provider ?? 'anthropic')
  const [model, setModel] = useState<string>(existing?.model ?? PROVIDERS.anthropic.models[0].id)
  const [apiKey, setApiKey] = useState<string>(existing?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [remember, setRemember] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const models = PROVIDERS[provider].models
    if (!models.find((m) => m.id === model)) {
      setModel(models[0].id)
    }
  }, [provider, model])

  const prov = PROVIDERS[provider]

  async function testKey() {
    if (!apiKey.trim()) { setTestStatus('error'); setTestError('Enter an API key first.'); return }
    setTesting(true); setTestStatus('idle'); setTestError('')

    try {
      let ok = false

      if (provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'say OK' }] }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error?.message || `${res.status}`)
        ok = true
      } else if (provider === 'google') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'say OK' }] }], generationConfig: { maxOutputTokens: 10 } }) },
        )
        const d = await res.json()
        if (!res.ok) throw new Error(d.error?.message || `${res.status}`)
        ok = true
      } else {
        const baseUrls: Record<string, string> = {
          openai: 'https://api.openai.com',
          groq: 'https://api.groq.com/openai',
          xai: 'https://api.x.ai',
          openrouter: 'https://openrouter.ai/api',
        }
        const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
        if (provider === 'openrouter') { headers['HTTP-Referer'] = 'https://bankrsynth.com'; headers['X-Title'] = 'BankrSynth' }
        const res = await fetch(`${baseUrls[provider]}/v1/chat/completions`, {
          method: 'POST', headers,
          body: JSON.stringify({ model, max_tokens: 10, messages: [{ role: 'user', content: 'say OK' }] }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error?.message || `${res.status}`)
        ok = true
      }

      setTestStatus(ok ? 'ok' : 'error')
    } catch (e: unknown) {
      setTestStatus('error')
      setTestError(e instanceof Error ? e.message : 'Key test failed')
    }
    setTesting(false)
  }

  function save() {
    if (!apiKey.trim()) return
    setSaving(true)
    const config: BYOKConfig = { provider, model, apiKey: apiKey.trim() }
    if (remember) saveBYOK(config)
    else clearBYOK()
    setTimeout(() => { setSaving(false); onClose() }, 300)
  }

  return (
    <div style={overlay}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={hdr}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '0.2em', color: 'var(--green)', textShadow: '0 0 12px var(--green)' }}>◉ API KEY CONFIGURATION</div>
            <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.35)', letterSpacing: '0.15em', marginTop: '3px' }}>BRING YOUR OWN KEY — BANKRSYNTH PAYS ZERO LLM COSTS</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Free tier tip */}
        <div style={tipBox}>
          <span style={{ color: 'var(--green)', fontSize: '10px' }}>★ FREE OPTIONS: </span>
          <span style={{ fontSize: '10px', color: 'rgba(0,255,65,0.6)' }}>Groq (Llama 3.3 70B) and OpenRouter (Llama free tier) require no payment.</span>
        </div>

        {/* Provider selector */}
        <div style={field}>
          <label style={label}>PROVIDER</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)} style={select}>
            {(Object.entries(PROVIDERS) as [ProviderId, typeof PROVIDERS[ProviderId]][]).map(([id, p]) => (
              <option key={id} value={id}>{p.label}{p.free ? ' ★' : ''}</option>
            ))}
          </select>
          <a href={prov.docsUrl} target="_blank" rel="noopener noreferrer" style={link}>Get API key →</a>
        </div>

        {/* Model selector */}
        <div style={field}>
          <label style={label}>MODEL</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} style={select}>
            {prov.models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* API Key input */}
        <div style={field}>
          <label style={label}>API KEY</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle') }}
              placeholder={prov.keyHint}
              style={{ ...input, paddingRight: '48px' }}
              autoComplete="off"
            />
            <button onClick={() => setShowKey((v) => !v)} style={eyeBtn}>{showKey ? '◉' : '○'}</button>
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(0,255,65,0.25)', marginTop: '3px' }}>
            Key stored in localStorage — never sent to bankrsynth.com servers
          </div>
        </div>

        {/* Remember checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <input type="checkbox" id="byok-remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: 'var(--green)', cursor: 'pointer' }} />
          <label htmlFor="byok-remember" style={{ fontSize: '10px', color: 'rgba(0,255,65,0.5)', cursor: 'pointer', letterSpacing: '0.1em' }}>Remember key across sessions</label>
        </div>

        {/* Test result */}
        {testStatus === 'ok' && (
          <div style={{ ...statusBox, borderColor: 'rgba(0,255,65,0.4)', color: 'var(--green)' }}>✓ Key valid — connected to {prov.label}</div>
        )}
        {testStatus === 'error' && (
          <div style={{ ...statusBox, borderColor: 'rgba(255,26,60,0.4)', color: '#ff4466' }}>✗ {testError || 'Key validation failed'}</div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={testKey} disabled={testing || !apiKey.trim()} style={testBtn}>
            {testing ? 'TESTING...' : '◈ TEST KEY'}
          </button>
          <button onClick={save} disabled={saving || !apiKey.trim()} style={saveBtn}>
            {saving ? 'SAVING...' : '✓ SAVE + CONNECT'}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 9999,
  background: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(6px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '16px',
}

const modal: React.CSSProperties = {
  background: 'rgba(0,8,2,0.97)',
  border: '1px solid rgba(0,255,65,0.3)',
  boxShadow: '0 0 40px rgba(0,255,65,0.08), 0 0 80px rgba(0,0,0,0.8)',
  padding: '24px',
  width: '100%', maxWidth: '480px',
  fontFamily: 'var(--font-mono)',
  position: 'relative',
}

const hdr: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: '16px', paddingBottom: '12px',
  borderBottom: '1px solid rgba(0,255,65,0.1)',
}

const closeBtn: React.CSSProperties = {
  background: 'none', border: '1px solid rgba(0,255,65,0.2)',
  color: 'rgba(0,255,65,0.5)', cursor: 'pointer',
  padding: '4px 10px', fontSize: '12px', letterSpacing: '0.1em',
  flexShrink: 0,
}

const tipBox: React.CSSProperties = {
  background: 'rgba(0,255,65,0.04)',
  border: '1px solid rgba(0,255,65,0.15)',
  padding: '8px 12px', marginBottom: '14px',
}

const field: React.CSSProperties = { marginBottom: '14px' }

const label: React.CSSProperties = {
  display: 'block', fontSize: '9px', letterSpacing: '0.2em',
  color: 'rgba(0,255,65,0.45)', marginBottom: '5px',
}

const select: React.CSSProperties = {
  width: '100%', background: 'rgba(0,10,3,0.9)',
  border: '1px solid rgba(0,255,65,0.25)',
  color: 'var(--green)', fontFamily: 'var(--font-mono)',
  fontSize: '11px', padding: '7px 10px', cursor: 'pointer',
  outline: 'none',
}

const input: React.CSSProperties = {
  width: '100%', background: 'rgba(0,10,3,0.9)',
  border: '1px solid rgba(0,255,65,0.25)',
  color: 'var(--green)', fontFamily: 'var(--font-mono)',
  fontSize: '11px', padding: '7px 10px',
  outline: 'none',
}

const eyeBtn: React.CSSProperties = {
  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'rgba(0,255,65,0.4)', fontSize: '14px',
}

const link: React.CSSProperties = {
  display: 'inline-block', marginTop: '4px',
  fontSize: '9px', color: 'rgba(0,200,255,0.6)',
  letterSpacing: '0.1em', textDecoration: 'none',
}

const statusBox: React.CSSProperties = {
  border: '1px solid', padding: '8px 12px', fontSize: '11px',
  marginBottom: '12px', letterSpacing: '0.05em',
}

const testBtn: React.CSSProperties = {
  flex: 1, background: 'transparent',
  border: '1px solid rgba(0,255,65,0.25)', color: 'rgba(0,255,65,0.6)',
  fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
  padding: '9px 12px', cursor: 'pointer',
}

const saveBtn: React.CSSProperties = {
  flex: 2, background: 'rgba(0,255,65,0.06)',
  border: '1px solid rgba(0,255,65,0.4)', color: 'var(--green)',
  fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
  padding: '9px 16px', cursor: 'pointer',
  textShadow: '0 0 8px rgba(0,255,65,0.4)',
}
