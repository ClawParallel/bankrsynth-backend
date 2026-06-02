import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage, isAddress, type Address } from 'viem'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { address?: string; message?: string; signature?: string }
  const { address, message, signature } = body

  if (!address || !message || !signature || !isAddress(address)) {
    return NextResponse.json({ ok: false, error: 'address, message, signature required' }, { status: 400 })
  }

  // Basic freshness/anti-replay: message must carry a recent Issued At
  const issuedMatch = message.match(/Issued At:\s*(.+)/)
  if (issuedMatch) {
    const issued = Date.parse(issuedMatch[1].trim())
    if (isFinite(issued) && Date.now() - issued > 10 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: 'signature expired — try again' }, { status: 400 })
    }
  }

  try {
    const ok = await verifyMessage({
      address: address as Address,
      message,
      signature: signature as `0x${string}`,
    })
    if (!ok) return NextResponse.json({ ok: false, error: 'signature does not match wallet' }, { status: 401 })
    return NextResponse.json({ ok: true, address })
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 })
  }
}
