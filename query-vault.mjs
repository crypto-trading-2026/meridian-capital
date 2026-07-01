import { Dhedge, Network } from "@dhedge/v2-sdk";
import { ethers } from "ethers";

const VAULT_ADDRESS = "0x8208013fe472f9549535e3ec19e658e4437bfcc7";
const NETWORK = "ethereum";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider({
    url: "https://ethereum.publicnode.com",
    timeout: 30000,
  });
  const wallet = ethers.Wallet.createRandom().connect(provider);
  const dhedge = new Dhedge(wallet, Network.ETHEREUM);
  const pool = await dhedge.loadPool(VAULT_ADDRESS);

  // 1. Vault info
  const [name, symbol, totalFundValue] = await Promise.all([
    pool.poolLogic.name(),
    pool.poolLogic.symbol(),
    pool.managerLogic.totalFundValue(),
  ]);
  console.log("=== Vault Info ===");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Address:", pool.address);
  console.log("Total Value (USD):", ethers.utils.formatUnits(totalFundValue, 18));

  // 2. Current composition
  console.log("\n=== Current Composition ===");
  const composition = await pool.getComposition();
  for (const item of composition) {
    console.log({
      asset: item.asset,
      isDeposit: item.isDeposit,
      balance: ethers.utils.formatUnits(item.balance, 18),
      balanceRaw: item.balance.toString(),
      rate: ethers.utils.formatUnits(item.rate, 18),
    });
  }
}

main().catch(console.error);
