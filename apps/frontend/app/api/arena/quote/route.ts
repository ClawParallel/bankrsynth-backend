import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, type Address } from 'viem'
import { base } from 'viem/chains'
import { QUOTER_V2, QUOTER_V2_ABI, WETH, FEE_TIERS, encodePath, type RoutePlan } from '@/lib/uniswap'

const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') })

async function quoteSingle(tokenIn: Address, tokenOut: Address, amountIn: bigint, fee: number): Promise<bigint | null> {
  try {
    const res = await client.readContract({
      address: QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    })
    return (res as readonly bigint[])[0]
  } catch {
    return null
  }
}

async function quoteMulti(path: `0x${string}`, amountIn: bigint): Promise<bigint | null> {
  try {
    const res = await client.readContract({
      address: QUOTER_V2,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInput',
      args: [path, amountIn],
    })
    return (res as readonly bigint[])[0]
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { tokenIn?: string; tokenOut?: string; amountIn?: string }
  const { tokenIn, tokenOut, amountIn } = body

  if (!tokenIn || !tokenOut || !amountIn) {
    return NextResponse.json({ error: 'tokenIn, tokenOut, amountIn required' }, { status: 400 })
  }

  let amt: bigint
  try { amt = BigInt(amountIn) } catch { return NextResponse.json({ error: 'invalid amountIn' }, { status: 400 }) }
  if (amt <= 0n) return NextResponse.json({ error: 'amountIn must be > 0' }, { status: 400 })

  const tIn = tokenIn as Address
  const tOut = tokenOut as Address

  const candidates: RoutePlan[] = []

  // Single-hop across fee tiers
  const singleResults = await Promise.all(FEE_TIERS.map(fee => quoteSingle(tIn, tOut, amt, fee)))
  singleResults.forEach((out, i) => {
    if (out && out > 0n) {
      candidates.push({ kind: 'single', fee: FEE_TIERS[i], amountOut: out.toString(), tokenIn: tIn, tokenOut: tOut })
    }
  })

  // Multi-hop via WETH (only when neither side is WETH)
  if (tIn.toLowerCase() !== WETH.toLowerCase() && tOut.toLowerCase() !== WETH.toLowerCase()) {
    const combos: { feeIn: number; feeOut: number; path: `0x${string}` }[] = []
    for (const feeIn of FEE_TIERS) {
      for (const feeOut of FEE_TIERS) {
        combos.push({ feeIn, feeOut, path: encodePath([tIn, WETH, tOut], [feeIn, feeOut]) })
      }
    }
    const multiResults = await Promise.all(combos.map(c => quoteMulti(c.path, amt)))
    multiResults.forEach((out, i) => {
      if (out && out > 0n) {
        const c = combos[i]
        candidates.push({ kind: 'multi', feeIn: c.feeIn, feeOut: c.feeOut, path: c.path, amountOut: out.toString(), tokenIn: tIn, tokenOut: tOut })
      }
    })
  }

  if (!candidates.length) {
    return NextResponse.json({ error: 'No Uniswap V3 route found for this pair on Base' }, { status: 404 })
  }

  // Best = highest amountOut
  const best = candidates.reduce((a, b) => (BigInt(b.amountOut) > BigInt(a.amountOut) ? b : a))
  return NextResponse.json({ ok: true, plan: best, candidates: candidates.length })
}
