'use client'
import type { UseSignTypedDataReturnType } from 'wagmi'
import { USDC_SKALE_BASE, SYNTHESIS_PRICE } from './chains'

// wagmi's signTypedDataAsync — routes through the active connector, so this
// works for injected wallets (MetaMask), Coinbase Wallet, and any
// WalletConnect-paired mobile wallet alike.
type SignTypedDataAsync = UseSignTypedDataReturnType['signTypedDataAsync']

function randomNonce(): `0x${string}` {
  // ERC-3009 `nonce` is a bytes32 — must be exactly 32 bytes (64 hex chars).
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`
}

/**
 * Builds an x402 "exact" payment by having the user sign an ERC-3009
 * TransferWithAuthorization over USDC.e on SKALE Base. No gas, no on-chain tx
 * from the user — the server settles it via the SKALE facilitator.
 *
 * Signing goes through wagmi's `signTypedDataAsync` (the active connector), so
 * it is not limited to injected providers.
 *
 * Returns a base64-encoded payment payload for the X-PAYMENT header, or null
 * if the recipient is missing or the user rejects the signature.
 */
export async function createX402Payment(
  walletAddress: string,
  recipient: string,
  signTypedDataAsync: SignTypedDataAsync,
): Promise<string | null> {
  if (!recipient) {
    console.error('x402 error: missing recipient address')
    return null
  }

  try {
    const from = walletAddress as `0x${string}`
    const to = recipient as `0x${string}`
    const value = SYNTHESIS_PRICE
    const validAfter = 0n
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300)
    const nonce = randomNonce()

    const signature = await signTypedDataAsync({
      account: from,
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: 1187947933,
        verifyingContract: USDC_SKALE_BASE,
      },
      types: {
        TransferWithAuthorization: [
          { name: 'from',        type: 'address' },
          { name: 'to',          type: 'address' },
          { name: 'value',       type: 'uint256' },
          { name: 'validAfter',  type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce',       type: 'bytes32' },
        ],
      },
      primaryType: 'TransferWithAuthorization',
      message: { from, to, value, validAfter, validBefore, nonce },
    })

    return btoa(
      JSON.stringify({
        scheme: 'exact',
        network: 'eip155:1187947933',
        payload: {
          signature,
          authorization: {
            from,
            to,
            value: value.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      }),
    )
  } catch (e) {
    console.error('x402 error:', e)
    return null
  }
}
