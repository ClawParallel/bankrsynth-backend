'use client'
import { USDC_SKALE_BASE, SYNTHESIS_PRICE } from './chains'

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

/**
 * Builds an x402 "exact" payment by having the user sign an ERC-3009
 * TransferWithAuthorization over USDC.e on SKALE Base. No gas, no on-chain tx
 * from the user — the server settles it via the SKALE facilitator.
 *
 * Returns a base64-encoded payment payload for the X-PAYMENT header, or null
 * if no injected wallet is available or the user rejects the signature.
 */
export async function createX402Payment(
  walletAddress: string,
  recipient: string,
): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null
  if (!recipient) {
    console.error('x402 error: missing recipient address')
    return null
  }

  try {
    const validAfter = 0n
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300)
    const nonce = `0x${crypto.randomUUID().replace(/-/g, '')}` as `0x${string}`

    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: 1187947933,
      verifyingContract: USDC_SKALE_BASE,
    }
    const types = {
      TransferWithAuthorization: [
        { name: 'from',        type: 'address' },
        { name: 'to',          type: 'address' },
        { name: 'value',       type: 'uint256' },
        { name: 'validAfter',  type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce',       type: 'bytes32' },
      ],
    }
    const message = {
      from:        walletAddress,
      to:          recipient,
      value:       SYNTHESIS_PRICE.toString(),
      validAfter:  validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
    }

    const signature = await window.ethereum.request({
      method: 'eth_signTypedData_v4',
      params: [
        walletAddress,
        JSON.stringify({
          domain,
          types,
          primaryType: 'TransferWithAuthorization',
          message,
        }),
      ],
    })

    return btoa(
      JSON.stringify({
        scheme: 'exact',
        network: 'eip155:1187947933',
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
      }),
    )
  } catch (e) {
    console.error('x402 error:', e)
    return null
  }
}
