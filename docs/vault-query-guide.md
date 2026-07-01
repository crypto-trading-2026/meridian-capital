# Vault 查询方法手册

## 概述

Meridian Capital Vault（dHEDGE v2 / ChamberFi）的三层数据源、可用 RPC、事件签名和增量更新流程。

---

## 数据源（三层）

### 第一层：dHEDGE GraphQL API（最易用，但不完整）

**端点**: `https://api-v2.dhedge.org/graphql`

**用途**: 获取基金概览、投资者列表、交易历史

**核心查询**:

```graphql
# 基金概览
query {
  fund(address: "0x8208013fe472f9549535e3ec19e658e4437bfcc7") {
    name symbol totalValue totalSupply tokenPrice
    managerAddress managerName
  }
}

# 投资者列表
query {
  allInvestmentsByFund(fund: "0x8208013fe472f9549535e3ec19e658e4437bfcc7") {
    investorAddress investorBalance blockNumberUpdated
  }
}

# 交易历史（16 笔，截止 2026-06-18）
query {
  tradeEvents(
    filter: { fundAddress: "0x8208013fe472f9549535e3ec19e658e4437bfcc7" }
    orderBy: "timestamp"
    orderDirection: "asc"
    limit: 200
  ) {
    txHash blockNumber timestamp type typeCode displayType
    income { asset assetName amount displayAmount }
    outcome { asset assetName amount displayAmount }
  }
}

# 6/18 之后的新增交易
query {
  tradeEvents(
    filter: {
      fundAddress: "0x8208013fe472f9549535e3ec19e658e4437bfcc7"
      timeFrom: 1781764079
    }
    orderBy: "timestamp"
    orderDirection: "asc"
    limit: 200
  ) {
    txHash blockNumber timestamp type typeCode displayType
    income { asset assetName amount displayAmount }
    outcome { asset assetName amount displayAmount }
  }
}
```

**局限**: API 只返回 16 条记录，链上实际有 34 笔 TransactionExecuted。差额 18 笔未被收录。且不包含 Deposit/Withdrawal 事件。

### 第二层：链上 eth_getLogs（最完整，但需要 archive RPC）

**可用 Archive RPC**: `https://rpc.mevblocker.io`（免费，支持历史查询）

**不可用 RPC（经测试排除）**:

| RPC | 原因 |
|-----|------|
| ethereum.publicnode.com | 拒绝 archive 请求，需要 personal token |
| rpc.ankr.com/eth | 拒绝 eth_getLogs（block range 限制） |
| eth.llamarpc.com | 连接不稳定 |
| 1rpc.io/eth | 严格限制 block range（≤10 块），不能做大范围扫描 |

**⚠️ 代理必需**: 国内网络直连 RPC 不通，需要先 export 代理环境变量：

```bash
export https_proxy=http://127.0.0.1:7897 http_proxy=http://127.0.0.1:7897 all_proxy=socks5://127.0.0.1:7897
```

**⚠️ ethers.js 不使用系统代理**: 需要手动在 node 代码中用原生 `https` 模块发 RPC 请求，或者用 `curl`。

### 第三层：ERC-20 balanceOf（链上余额核对）

直接调 token 合约的 `balanceOf(vaultAddress)`，精确验证 vault 实际持有量。

---

## 合约地址

| 名称 | 地址 | 说明 |
|------|------|------|
| Vault / PoolLogic | `0x8208013fe472f9549535e3ec19e658e4437bfcc7` | Vault 本体 |
| PoolManagerLogic | `0xbBc47aC4068448df519E8Ff7ed32669A0f8de86b` | 管理逻辑合约 |
| dHEDGE Factory | `0x96D33bCF84DdE326014248E2896F79bbb9c13D6d` | 工厂合约 |
| Aave V3 Pool | `0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2` | Aave 借贷池 |

### Token 地址

| 代币 | 地址 | Decimals |
|------|------|----------|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` | 8 |
| aEthUSDC（V3）| `0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c` | 6 |
| aEthUSDT（V3）| `0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a` | 6 |
| NVDAon | `0x2D1F7226Bd1F780AF6B9A49DCC0aE00E8Df4bDEE` | 18 |
| QQQon | `0x0e397938C1Aa0680954093495B70A9F5e2249aBa` | 18 |
| SPYon | `0xFeDC5f4a6c38211c1338aa411018DFAf26612c08` | 18 |
| TOROS | `0xbDd84294bC8299861A2121F749A25EFEb7168a32` | 18 |
| XAUt | `0x68749665FF8D2d112Fa859AA293F07A622782F38` | 18 |

---

## Vault 事件签名

| 事件 | Topic Hash | 说明 |
|------|-----------|------|
| **TransactionExecuted** | `0x14464fb67b1871a79e726fa7af525f8fff56e9e5649d511e47f3a357ae31d207` | 每笔交易（dHEDGE 收录 16 笔，链上 34 笔） |
| **Deposit** | `0x97e6c213c123075e233a6f2323f33d8319141b993ab05e9e2f7eb2eda08cb944` | 投资者充值（链上 7 笔） |
| **Withdrawal** | `0xfad3d7f9ed107ffa7fc8ce8baa521effc3650ec48a4d1dd36bdb9c4b91db1295` | 投资者提现（链上 8 笔） |
| **ManagerFeeMinted** | `0x755a8059d66d8d243bc9f6913f429a811f154599d0538bb0b6a2ac23f23d2ccd` | 管理费事件 |
| **Transfer** | `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef` | ERC-20 转账（代币铸造/销毁） |

> ⚠️ Withdrawal 签名在 SDK 自带 ABI 中是**旧版**（`(address,uint256,uint256)` 元组），实际链上用的是新版（`(address,uint256,bool)` 元组），`4byte.directory` 或 `openchain.xyz` 可查正确签名。

### 用 curl 查事件

```bash
export https_proxy=http://127.0.0.1:7897

VAULT="0x8208013fe472f9549535e3ec19e658e4437bfcc7"
TOPIC="0xfad3d7f9ed107ffa7fc8ce8baa521effc3650ec48a4d1dd36bdb9c4b91db1295"

curl -s -X POST "https://rpc.mevblocker.io" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"method\":\"eth_getLogs\",
    \"params\":[{
      \"address\":\"$VAULT\",
      \"fromBlock\":\"0x182b9ab\",
      \"toBlock\":\"0x1844a3b\",
      \"topics\":[\"$TOPIC\"]
    }],
    \"id\":1
  }"
```

### 用 node 查事件（绕过 ethers.js 代理问题）

```js
const https = require('https');
const RPC = 'https://rpc.mevblocker.io';

async function fetchRPC(method, params) {
  const url = new URL(RPC);
  const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// 示例：查 Withdrawal 事件
const VAULT = '0x8208013fe472f9549535e3ec19e658e4437bfcc7';
const W_TOPIC = '0xfad3d7f9ed107ffa7fc8ce8baa521effc3650ec48a4d1dd36bdb9c4b91db1295';

// 大范围查（mevblocker 无 block range 限制）
const res = await fetchRPC('eth_getLogs', [{
  address: VAULT,
  fromBlock: '0x' + (25100000).toString(16),
  toBlock: '0x' + (25436000).toString(16),
  topics: [W_TOPIC],
}]);
const withdrawals = res.result;
```

---

## 增量更新流程

每次更新时，从 `vault-ledger.json` 的 `checkpoint` 字段读取状态，按以下步骤操作：

### Step 1: dHEDGE API 查新增交易

```
timeFrom ← checkpoint.dhedgeApiLastTimestamp
查询并追加到 assets[*].trades
```

### Step 2: 链上查新增事件

```
fromBlock ← checkpoint.lastQueriedBlock + 1
查 eth_getLogs (vault, fromBlock, currentBlock)
分类: TransactionExecuted / Withdrawal / Deposit / Fee
```

### Step 3: 查 ERC-20 余额变化

```
for each token in checkpoint.vaultTokenBalances:
  balanceOf(vault) → 与快照对比
  差额 → 追溯原因
```

### Step 4: 查新增充提

```
topics=[Withdrawal|Deposit] from checkpoint.lastQueriedBlock
追加到 withdrawals.confirmed / deposits.confirmed
```

### Step 5: 更新账本

```
更新 assets、capitalFlow、checkpoint
```

---

## WBTC 成本计算（FIFO）

```js
class Lot {
  constructor(amount, totalCost) {
    this.amount = amount;
    this.totalCost = totalCost;
  }
  get avgPrice() { return this.totalCost / this.amount; }
  consume(qty) {
    const costUsed = qty * this.avgPrice;
    this.amount -= qty;
    this.totalCost -= costUsed;
    return costUsed;
  }
}
// 买入 → new Lot(amount, spentCurrency)
// 卖出 → FIFO 从最老 lot 开始扣，计算 realizedPnl
```

---

## 踩坑记录

1. **Etherscan V1 API 已废弃**，返回 "You are using a deprecated V1 endpoint"，需迁移到 V2（需要 API Key）
2. **dHEDGE 已更名为 ChamberFi**，旧子域名可能重定向
3. **dHEDGE ABI 过时**，Withdrawal 的 tuple 类型从 `(address,uint256,uint256)` 变为 `(address,uint256,bool)`，直接用 SDK 解析会失败
4. **ethers.js (v5) 不走系统代理**，需要手动用原生 `https` 模块或 `curl`
5. **aEthUSDT 被 dHEDGE 移除了追踪**（isSupportedAsset=false），物理 aToken 在钱包里但 composition 里不显示
6. **dHEDGE 的 aEthUSDC composition 值 ≠ ERC-20 balanceOf**：dHEDGE 将 aEthUSDC + aEthUSDT 合并为单个 Aave V3 Pool 仓位
7. **totalFundValue 使用 18 decimals**，但 stablecoin 只有 6/8 decimals——getComposition() 返回的 rate 才是真实单价
