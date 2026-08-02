# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repo tracks the **Meridian Capital Vault** — a dHEDGE v2 (ChamberFi) crypto fund on Ethereum mainnet. It's not a deployable application; it's a ledger and toolset for tracking portfolio cost basis, trades, deposits/withdrawals, and LP activity.

## Core Data File

**`vault-ledger.json`** is the source of truth. It contains:
- `assets.*.trades` — every trade (BUY/SELL) per asset with amount, cost, and txHash
- `assets.*.costBasis` / `fifoSummary` — current cost basis calculated via FIFO
- `capitalFlow` — initial capital, total withdrawn, net change
- `withdrawals.confirmed` / `deposits` — all LP deposit/withdrawal events
- `checkpoint` — cursor for incremental updates (last block, last dHEDGE timestamp)
- `investors` — current and exited LP members

Always read this file before answering questions about positions or cost basis.

## Vault Identity

| Field | Value |
|-------|-------|
| Vault Address | `0x8208013fe472f9549535e3ec19e658e4437bfcc7` |
| Manager | `0x30890e255c4e03cb18fc3e4dbb3eb322a1c92dcf` |
| Trader | `0xAc25D7217FCCff38Ba52d3a7F453506522428713` |
| Platform | dHEDGE v2 / ChamberFi |
| Network | Ethereum mainnet |

## Data Sources (Three Layers)

### 1. dHEDGE GraphQL API
- **Endpoint**: `https://api-v2.dhedge.org/graphql`
- Best source for decoded trade events (income/outcome asset, amount, txHash)
- Does NOT cover 100% of on-chain executions
- Query with `timeFrom` filter for incremental sync

### 2. On-chain RPC (eth_getLogs)
- **RPC**: `https://rpc.mevblocker.io` (free archive node, no block range limits)
- Event topics documented in `docs/vault-query-guide.md`
- Key topics: `TransactionExecuted`, `Deposit`, `Withdrawal`, `ManagerFeeMinted`
- **Proxy required**: RPC calls from China need `export https_proxy=http://127.0.0.1:7897`

### 3. ERC-20 balanceOf
- Direct `eth_call` to token contracts to verify on-chain balances
- Used as reconciliation against ledger calculations

## Key Scripts

- `query-vault.mjs` — Use dHEDGE SDK to get vault info and composition
- `query-trades.mjs` — Scan all TransactionExecuted events with approval decoding
- `trace-trades.mjs` — Deep-trace individual trade transactions via `trace_transaction`
- `vault-ledger.json` — All historical data, cost basis, and sync checkpoint

Scripts use `ethers` v5 and `@dhedge/v2-sdk`. The SDK does NOT respect system proxy settings — for RPC calls from behind a proxy, use raw `curl` or Node's `https` module instead of ethers.js providers.

## Incremental Sync Workflow

When the user reports new trades or asks to update:

1. **dHEDGE API**: Query `tradeEvents` with `timeFrom: <checkpoint.dhedgeApiLastTimestamp>`
2. **On-chain logs**: `eth_getLogs` from `checkpoint.lastQueriedBlock + 1` for TransactionExecuted, Deposit, Withdrawal topics
3. **Balance check**: `balanceOf` for all tracked tokens, compare against checkpoint snapshot
4. **Receipt decoding**: For each new trade, get the receipt to find Approval events → identifies what token and how much was swapped
5. **FIFO recalculation**: Run all trades through FIFO (oldest lots consumed first), update cost basis
6. **Update checkpoint**: Set new `lastQueriedBlock`, `dhedgeApiLastTimestamp`, balance snapshots

## Token Addresses

See `docs/vault-query-guide.md` for the full table. Key ones:

| Token | Address | Decimals |
|-------|---------|----------|
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | 8 |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 18 |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| aEthUSDC | `0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c` | 6 |
| AMDon | `0x0c1f3412a44ff99e40bf14e06e5ea321ae7b3938` | 18 |
| NVDAon | `0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE` | 18 |
| QQQon | `0x0e397938C1Aa0680954093495B70A9F5e2249aBa` | 18 |

## MCP Tool

`@dhedge/chamber-mcp` is installed as a dependency and provides `chamber_get_composition` for live vault composition queries.

## Important Notes

- **ethers.js v5 does NOT use system proxy** — use raw `curl` or Node `https` module for RPC calls when behind a proxy
- **aEthUSDT** (0x23878914...) is de-tracked by dHEDGE (isSupportedAsset=false) — physical aToken exists in wallet but won't appear in composition
- **dHEDGE's aEthUSDC composition ≠ ERC-20 balanceOf** — dHEDGE merges aEthUSDC + aEthUSDT into a single Aave V3 Pool position
- **USDC/USDT are 6 decimals**, not 18; `totalFundValue` uses 18 decimals regardless
- **Deposits** include LP-added tokens directly (e.g., WBTC deposited by an LP), so final on-chain balance may exceed the FIFO-calculated trade balance
