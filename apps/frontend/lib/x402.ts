'use client'
import type { UseSignTypedDataReturnType } from 'wagmi'
import {
  USDC_SKALE_BASE,
  SYNTHESIS_PRICE,
  TOKEN_NAME,
  TOKEN_VERSION,
  CHAIN_ID,
  X402_NETWORK,
} from './chains'

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
 * Builds an x402 "exact" PaymentPayload by having the user sign an ERC-3009
 * TransferWithAuthorization over USDC.e on SKALE Base. No gas, no on-chain tx
 * from the user — the server settles it via the SKALE facilitator.
 *
 * The returned value is the base64-encoded x402 `PaymentPayload` (including the
 * required `x402Version` field) for the `X-PAYMENT` header. Returns null if the
 * recipient is missing or the user rejects the signature.
 *
 * Signing goes through wagmi's `signTypedDataAsync` (the active connector), so
 * it is not limited to injected providers.
 */
export async function createX402Payment(
  walletAddress: `0x${string}`,
  recipient: `0x${string}`,
  signTypedDataAsync: SignTypedDataAsync,
): Promise<string | null> {
  if (!recipient) {
    console.error('x402 error: missing recipient address')
    return null
  }

  try {
    const validAfter = 0n
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300)
    const nonce = randomNonce()

    const signature = await signTypedDataAsync({
      account: walletAddress,
      domain: {
        name: TOKEN_NAME, // 'Bridged USDC (SKALE Bridge)'
        version: TOKEN_VERSION, // '1'
        chainId: CHAIN_ID,
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
      message: {
        from: walletAddress,
        to: recipient,
        value: SYNTHESIS_PRICE,
        validAfter,
        validBefore,
        nonce,
      },
    })

    // x402 PaymentPayload (v1 envelope). `x402Version` is required by the
    // facilitator; `payload.authorization` values are decimal strings.
    const paymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: X402_NETWORK,
      payload: {
        signature,
        authorization: {
          from: walletAddress,
          to: recipient,
          value: SYNTHESIS_PRICE.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
      },
    }

    return btoa(JSON.stringify(paymentPayload))
  } catch (e) {
    console.error('x402 sign error:', e)
    return null
  }
}
