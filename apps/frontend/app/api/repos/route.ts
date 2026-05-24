import { NextResponse } from 'next/server'

const GL = 'https://node.gitlawb.com'
const DID = 'z6Mkhd3F'

const STATIC_FALLBACK = {
  did: 'did:key:z6Mkhd3FkLFRUp2iNqCUoDmd9Txet7dLtU3tsQGKfbDXtYYe',
  repos: [
    {
      name: 'bankrsynth',
      objects: 780,
      nodes: 3,
      storage: 'IPFS',
      signature: 'Ed25519',
      url: 'https://gitlawb.com/node/repos/z6Mkhd3F/bankrsynth',
      live: false,
    },
    {
      name: 'bankrsynth-skill',
      objects: 12,
      nodes: 3,
      storage: 'IPFS',
      signature: 'Ed25519',
      url: 'https://gitlawb.com/node/repos/z6Mkhd3F/bankrsynth-skill',
      live: false,
    },
  ],
  nodeStatus: { online: 3, total: 3, locations: ['us-east-1', 'ap-northeast-1'] },
  timestamp: Date.now(),
  source: 'static',
}

export async function GET() {
  try {
    const res = await fetch(`${GL}/api/repos/${DID}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json(STATIC_FALLBACK)
    const liveData = await res.json()
    return NextResponse.json({ ...liveData, source: 'live' })
  } catch {
    return NextResponse.json(STATIC_FALLBACK)
  }
}
