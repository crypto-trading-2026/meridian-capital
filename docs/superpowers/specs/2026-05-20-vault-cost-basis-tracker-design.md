# Vault Cost Basis Tracker Design

## Overview
This design outlines an AI-native cost basis tracking system for the Chamber Vault. Since on-chain vaults do not natively store historical cost bases (e.g., USD spent for asset acquisition), this system combines a local JSON ledger with real-time MCP querying.

## Architecture

The system consists of three main components:

1.  **Data Layer (Local Ledger):** A `vault-ledger.json` file in the project root acts as the single source of truth for all historical transaction costs.
2.  **Query Layer (MCP Server):** The official `@dhedge/chamber-mcp` provides real-time verification of on-chain balances to ensure the ledger remains aligned with reality.
3.  **Interaction Layer (AI Agent):** An AI assistant (Opencode, Claude, Cursor) acts as the natural language interface to read the ledger, query MCP, and perform cost basis calculations on demand.

## Data Structure (`vault-ledger.json`)

The ledger will use a simple, extensible JSON structure tracking trades per asset:

```json
{
  "vaultAddress": "0x8208013fe472f9549535e3ec19e658e4437bfcc7",
  "assets": {
    "WBTC": {
      "trades": [
        {
          "date": "2026-05-20",
          "action": "BUY",
          "spentUsd": 0.0,      // Placeholder to be updated by user
          "acquiredAmount": 0.14360635
        }
      ]
    }
  }
}
```

## Workflows

### 1. Initializing / Updating the Ledger
*   **Trigger:** User tells the AI: "I bought X WBTC for Y USDT."
*   **Action:** The AI parses the request and appends a new trade object to the `trades` array in `vault-ledger.json`.

### 2. Querying Cost Basis
*   **Trigger:** User asks the AI: "Calculate my WBTC cost basis."
*   **Action:**
    1.  AI reads `vault-ledger.json`.
    2.  AI calculates: `Total spentUsd / Total acquiredAmount = Average Cost Basis`.
    3.  (Optional but recommended) AI invokes the `chamber_get_composition` MCP tool to verify the ledger's `acquiredAmount` matches the actual on-chain balance.
    4.  AI responds with the calculated cost basis and any discrepancies found.

## Error Handling & Edge Cases
*   **Missing Cost Data:** If `spentUsd` is missing or zero (as in the initial placeholder), the AI should prompt the user to provide the historical cost before calculating.
*   **Ledger/On-Chain Mismatch:** If the calculated `acquiredAmount` from the ledger differs from the MCP on-chain balance, the AI should warn the user that untracked trades or airdrops may have occurred, requiring manual ledger reconciliation.
