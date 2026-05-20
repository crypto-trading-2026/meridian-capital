# Vault Cost Basis Tracker - AI Workflow

This document provides instructions for AI agents on how to calculate the cost basis for assets in the Chamber Vault.

## How to Calculate Cost Basis

When asked to "calculate my WBTC cost basis", perform the following steps:

1.  **Read the Ledger:** Read the contents of `vault-ledger.json` in the project root.
2.  **Calculate Totals:** Sum the `spentUsd` and `acquiredAmount` for the requested asset (e.g., WBTC).
3.  **Calculate Basis:** Divide the total `spentUsd` by the total `acquiredAmount`.
    *   Formula: `Total spentUsd / Total acquiredAmount = Average Cost Basis`
4.  **Verify On-Chain (Optional but Recommended):** Use the `chamber_get_composition` tool from the `@dhedge/chamber-mcp` server to verify that the total `acquiredAmount` matches the current on-chain balance for the asset. If there is a discrepancy, warn the user.
5.  **Output:** Present the calculated average cost basis and the current totals clearly to the user.

## How to Update the Ledger

When the user reports a new trade (e.g., "I bought 0.1 WBTC for 6000 USDT"):

1.  **Parse Request:** Identify the asset, amount acquired, and USD spent.
2.  **Update Ledger:** Append a new object to the `trades` array for the appropriate asset in `vault-ledger.json`.
    *   Format: `{"date": "YYYY-MM-DD", "action": "BUY", "spentUsd": 6000.0, "acquiredAmount": 0.1}`
3.  **Confirm:** Confirm the update with the user and provide the new calculated cost basis.