# Vault Cost Basis Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a local JSON ledger and AI workflow instructions for tracking Chamber Vault WBTC cost basis.

**Architecture:** A static JSON ledger file (`vault-ledger.json`) stores historical USDT spent and WBTC acquired. An AI agent reads this file and calculates the cost basis on demand.

**Tech Stack:** JSON, Markdown

---

### Task 1: Create the Vault Ledger

**Files:**
- Create: `vault-ledger.json`

- [ ] **Step 1: Write the initial ledger configuration**

Create the JSON file with the initial transaction data provided by the user (11,000 USDT spent for 0.14360635 WBTC).

```json
{
  "vaultAddress": "0x8208013fe472f9549535e3ec19e658e4437bfcc7",
  "assets": {
    "WBTC": {
      "trades": [
        {
          "date": "2026-05-20",
          "action": "BUY",
          "spentUsd": 11000.00,
          "acquiredAmount": 0.14360635
        }
      ]
    }
  }
}
```

- [ ] **Step 2: Verify the file exists and is valid JSON**

Run: `cat vault-ledger.json | jq .`
Expected: Valid JSON output matching the configuration above.

- [ ] **Step 3: Commit**

```bash
git add vault-ledger.json
git commit -m "feat: initialize vault cost basis ledger with current holdings"
```

---

### Task 2: Create AI Workflow Instructions

**Files:**
- Create: `docs/superpowers/vault-tracker-workflow.md`

- [ ] **Step 1: Write the AI workflow instructions**

Create a markdown file documenting how the AI should interact with the ledger to calculate the cost basis.

```markdown
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
```

- [ ] **Step 2: Verify the file exists**

Run: `cat docs/superpowers/vault-tracker-workflow.md`
Expected: The markdown content above.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/vault-tracker-workflow.md
git commit -m "docs: add AI workflow instructions for vault cost basis tracker"
```