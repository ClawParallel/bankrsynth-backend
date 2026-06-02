import { type Address, encodePacked } from 'viem'

// ── Base mainnet (chainId 8453) Uniswap V3 ──────────────────────────────────
export const BASE_CHAIN_ID = 8453

export const WETH: Address = '0x4200000000000000000000000000000000000006'
export const USDC: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

// Uniswap V3 SwapRouter02 + QuoterV2 on Base
export const SWAP_ROUTER_02: Address = '0x2626664c2603336E57B271c5C0b26F421741e481'
export const QUOTER_V2: Address = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a'

// SwapRouter02 recipient sentinels
export const MSG_SENDER: Address = '0x0000000000000000000000000000000000000001'
export const ADDRESS_THIS: Address = '0x0000000000000000000000000000000000000002'

export const FEE_TIERS = [500, 3000, 10000] as const

// ── ABIs ────────────────────────────────────────────────────────────────────

// QuoterV2 — functions are non-view on-chain but callable via eth_call.
// Marked `view` so viem readContract performs an eth_call and decodes the return.
export const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'view',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'quoteExactInput',
    stateMutability: 'view',
    inputs: [
      { name: 'path', type: 'bytes' },
      { name: 'amountIn', type: 'uint256' },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96AfterList', type: 'uint160[]' },
      { name: 'initializedTicksCrossedList', type: 'uint32[]' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const

export const SWAP_ROUTER_02_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'exactInput',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'path', type: 'bytes' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'unwrapWETH9',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountMinimum', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'multicall',
    stateMutability: 'payable',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
  },
] as const

export const ERC20_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

// ── Path encoding for multi-hop exactInput ──────────────────────────────────
// path = tokenA (20) + fee (3) + tokenB (20) + fee (3) + tokenC ...
export function encodePath(tokens: Address[], fees: number[]): `0x${string}` {
  if (tokens.length !== fees.length + 1) throw new Error('path length mismatch')
  const types: string[] = []
  const values: (Address | number)[] = []
  for (let i = 0; i < fees.length; i++) {
    types.push('address', 'uint24')
    values.push(tokens[i], fees[i])
  }
  types.push('address')
  values.push(tokens[tokens.length - 1])
  return encodePacked(types, values)
}

export type PayWith = 'ETH' | 'USDC'
export type Side = 'buy' | 'sell'

// Single-hop quote candidate or multi-hop (via WETH) candidate
export interface RoutePlan {
  kind: 'single' | 'multi'
  amountOut: string          // wei, as string
  fee?: number               // single-hop fee tier
  feeIn?: number             // multi-hop: tokenIn->WETH
  feeOut?: number            // multi-hop: WETH->tokenOut
  path?: `0x${string}`       // multi-hop encoded path
  tokenIn: Address
  tokenOut: Address
}
