import { Dhedge, Network } from "@dhedge/v2-sdk";
import { ethers } from "ethers";

const VAULT_ADDRESS = "0x8208013fe472f9549535e3ec19e658e4437bfcc7";

const APPROVAL_TOPIC = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const TX_EXECUTED_TOPIC = "0x14464fb67b1871a79e726fa7af525f8fff56e9e5649d511e47f3a357ae31d207";

// 1inch v5 router
const ONEINCH_ROUTER = "0x111111125421cA6dc452d289314280a0f8842A65";

const TOKEN_NAMES = {
  "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": {name:"WBTC", dec:8},
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": {name:"WETH", dec:18},
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": {name:"USDC", dec:6},
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": {name:"USDT", dec:6},
  "0x6B175474E89094C44Da98b954EedeAC495271d0F": {name:"DAI", dec:18},
  "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9": {name:"AAVE", dec:18},
  "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497": {name:"sUSDe", dec:18},
  "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3": {name:"USDe", dec:18},
  "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2": {name:"aEthUSDC", dec:6},
  "0xbDd84294bC8299861A2121F749A25EFEb7168a32": {name:"TOROS", dec:18},
};

const TX_TYPES = {1:"TRADE", 2:"DEPOSIT/WITHDRAW", 9:"LENDING"};

const provider = new ethers.providers.JsonRpcProvider({
  url: "https://ethereum.publicnode.com",
  timeout: 30000,
});

async function main() {
  const wallet = ethers.Wallet.createRandom().connect(provider);
  const dhedge = new Dhedge(wallet, Network.ETHEREUM);
  const pool = await dhedge.loadPool(VAULT_ADDRESS);

  // Get current block and chunks
  const currentBlock = await provider.getBlockNumber();
  const CHUNK_SIZE = 45000;

  // Get TransactionExecuted events
  let allTxEvents = [];
  for (let from = 25000000; from < currentBlock; from += CHUNK_SIZE) {
    const to = Math.min(from + CHUNK_SIZE, currentBlock);
    process.stderr.write(`Querying blocks ${from} to ${to}...\n`);
    try {
      const logs = await provider.getLogs({
        address: VAULT_ADDRESS,
        topics: [TX_EXECUTED_TOPIC],
        fromBlock: from,
        toBlock: to,
      });
      allTxEvents = allTxEvents.concat(logs);
    } catch (err) { /* skip */ }
  }

  process.stderr.write(`Found ${allTxEvents.length} events, analyzing...\n\n`);

  const iface = new ethers.utils.Interface([
    "event TransactionExecuted(address pool, address manager, uint16 transactionType, uint256 time)"
  ]);

  // For each event, get the approval that happened right before (same tx, or get from receipt)
  for (let i = 0; i < allTxEvents.length; i++) {
    const log = allTxEvents[i];
    const decoded = iface.parseLog(log);
    const date = new Date(decoded.args.time.toNumber() * 1000);
    const txHash = log.transactionHash;
    const txType = decoded.args.transactionType;
    const blockNum = log.blockNumber;

    const receipt = await provider.getTransactionReceipt(txHash);

    // Find approvals from vault to DEX aggregators in this tx
    let approvals = [];
    for (const rlog of receipt.logs) {
      if (rlog.topics[0] === APPROVAL_TOPIC) {
        const owner = ethers.utils.getAddress("0x" + rlog.topics[1].slice(26));
        if (owner.toLowerCase() === VAULT_ADDRESS.toLowerCase()) {
          const spender = ethers.utils.getAddress("0x" + rlog.topics[2].slice(26));
          const amount = ethers.BigNumber.from(rlog.data);
          const tokenAddr = rlog.address.toLowerCase();
          const tokenInfo = TOKEN_NAMES[tokenAddr] || {name: tokenAddr.slice(0,10), dec: 18};
          if (amount.gt(0)) {
            approvals.push({
              token: tokenInfo.name,
              amount: ethers.utils.formatUnits(amount, tokenInfo.dec),
              spender: spender.slice(0,10) + "...",
            });
          }
        }
      }
    }

    console.log(`#${i+1} | ${date.toISOString().slice(0,16).replace('T',' ')} | Type:${txType}(${TX_TYPES[txType]||'?'}) | Block:${blockNum}`);
    if (approvals.length > 0) {
      for (const a of approvals) {
        console.log(`    Approval: ${a.amount} ${a.token} -> ${a.spender}`);
      }
    }
    console.log(`    Tx: ${txHash}`);
  }
}

main().catch(console.error);
