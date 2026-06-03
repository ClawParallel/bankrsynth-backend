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
