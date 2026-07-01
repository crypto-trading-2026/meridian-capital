import { ethers } from "ethers";

const RPC = "https://ethereum.publicnode.com";
const VAULT = "0x8208013fe472f9549535e3ec19e658e4437bfcc7";

const TOKENS = {
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { name: "WBTC", dec: 8 },
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "USDT", dec: 6 },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USDC", dec: 6 },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { name: "WETH", dec: 18 },
};

function fmtAmount(raw, addr) {
  const info = TOKENS[addr.toLowerCase()] || { dec: 18 };
  const bn = ethers.BigNumber.from(raw);
  return ethers.utils.formatUnits(bn, info.dec);
}

async function traceTx(txHash) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "trace_transaction", params: [txHash], id: 1 }),
  });
  return (await res.json()).result || [];
}

async function analyzeTrade(label, txHash) {
  console.log(`=== ${label} ===`);
  const traces = await traceTx(txHash);

  for (const trace of traces) {
    const input = trace.action?.input || "";
    const callType = trace.action?.callType || "";
    const to = trace.action?.to?.toLowerCase() || "";

    // Direct ERC-20 approve (from vault to DEX)
    if (input.startsWith("0x095ea7b3") && callType === "call") {
      const spender = "0x" + input.slice(34, 74);
      const amount = "0x" + input.slice(74, 138);
      const info = TOKENS[to] || { name: to.slice(0, 10), dec: 18 };
      try {
        const bn = ethers.BigNumber.from(amount);
        const max = ethers.constants.MaxUint256;
        if (bn.eq(max)) {
          console.log(`  APPROVE(MAX): ${info.name} -> ${spender.slice(0,10)}...`);
        } else if (bn.gt(0)) {
          console.log(`  APPROVE: ${ethers.utils.formatUnits(bn, info.dec)} ${info.name} -> ${spender.slice(0,10)}...`);
        }
      } catch (e) { /* skip */ }
    }

    // 1inch unoswap
    if (input.startsWith("0x7bf98119")) {
      try {
        const raw = input.slice(10);
        const srcAddr = "0x" + raw.slice(24, 64);
        const amount = "0x" + raw.slice(64, 128);
        const info = TOKENS[srcAddr.toLowerCase()] || { name: srcAddr.slice(0, 10), dec: 18 };
        const bn = ethers.BigNumber.from(amount);
        if (bn.gt(0)) {
          console.log(`  1INCH SWAP: sell ${ethers.utils.formatUnits(bn, info.dec)} ${info.name}`);
        }
      } catch (e) { /* skip */ }
    }

    // Odos swap - look for calls to Odos router (0x6131b5fa...) with swap calldata
    if (to === "0x6131b5fae19ea4f9d964eac0408e4408b66337b5" && input.startsWith("0x6179309d")) {
      try {
        // Odos swapCompact sig: 0x6179309d
        // Find the token being sold
        console.log(`  ODOS: swapCompact call`);
      } catch (e) { /* skip */ }
    }
  }
  console.log();
}

async function main() {
  await analyzeTrade("0520 02:52 USDT BUY", "0x67ba97b0b4e7c384a0e1f9e0caef875e25e45f4e9ca3eafda4320e91b119dbff");
  await analyzeTrade("0520 03:52 USDT BUY", "0x1415343ed9f5d5ab2059bc4515c5da8fa184447ebf2baab4b264ba25043639db");
  await analyzeTrade("0520 04:00 USDT BUY", "0xf6544b8c11fec848e1955a4a4a13d85cdf484bbf110c365dfd1ce57141bb6516");
  await analyzeTrade("0521 06:53 USDT BUY", "0x7f63818ca8b3100668265d6d97294d4a59e49d4d9887ed34e5045bb9dff85433");
  await analyzeTrade("0522 23:58 WBTC SELL", "0x521e5ce0a55f2c57e39d5d3f5841694c5821c8323a4c4f36c8c087524fb5d921");
  await analyzeTrade("0530 04:08 USDT SELL (max)", "0x182c65be4738b30ed071bf1f4f37f8fd4f277ad88c8c4317041b3e62d592526f");
  await analyzeTrade("0530 09:28 USDC TO AAVE", "0xc972183f272d16f5759cc58cb7604059602b5f3eb26976a0754b63aa760ed11c");
  await analyzeTrade("0530 09:30 USDT SELL (max)", "0x6274c43f16103b6653cf872473930ff30843bf5aca5f830d00a9a5ade744efec");
  await analyzeTrade("0603 13:12 USDT BUY", "0x196e27bc6b28737b2202ff92d5c1672233af0a85429e9c9cd187f798f4a49a8c");
  await analyzeTrade("0603 23:44 WBTC SELL", "0xc01a9a35738183ff107903d327f85ead1032b62202480f5a88a209c0dcd7ca38");
}

main().catch(console.error);
