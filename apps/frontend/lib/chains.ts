import { defineChain } from 'viem'

export const skaleBase = defineChain({
  id: 1187947933,
  name: 'SKALE Base',
  nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://skale-base.skalenodes.com/v1/base'],
      webSocket: ['wss://skale-base.skalenodes.com/v1/ws/base'],
    },
  },
  blockExplorers: {
    default: { name: 'SKALE Explorer', url: 'https://skale-base-explorer.skalenodes.com' },
  },
})

export const USDC_SKALE_BASE = '0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20' as const
export const USDC_BASE        = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const SYNTHESIS_PRICE  = 100000n // $0.10 USDC.e (6 decimals)

// EIP-712 domain for USDC.e on SKALE Base. This token is the bridged USDC
// deployed by the SKALE bridge — its ERC-20 `name()`/`version()` are
// "Bridged USDC (SKALE Bridge)" / "1", NOT Circle's "USD Coin" / "2".
// The signed domain MUST match the on-chain values or the facilitator's
// signature recovery (and thus /verify) will reject the payment.
export const TOKEN_NAME    = 'Bridged USDC (SKALE Bridge)'
export const TOKEN_VERSION = '1'
export const CHAIN_ID      = 1187947933
export const X402_NETWORK  = `eip155:${CHAIN_ID}` as const
