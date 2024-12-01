import { assert } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { Connection } from '@solana/web3.js';
const { SystemProgram } = anchor.web3;

describe("message", () => {

  // 自定义 RPC URL
  const rpcUrl = "http://13.215.160.229:8899";
  // const rpcUrl = "http://127.0.0.1:8899";

  // 创建一个新的连接对象
  const connection = new Connection(rpcUrl, 'confirmed'); // 'confirmed' 是网络确认的级别

  // 创建一个 AnchorProvider，使用自定义的连接和钱包
  const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local(), { commitment: 'confirmed' });

  // const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  it("view", async () => {
    const program = anchor.workspace.Message;
    // let mtAcc = await program.account.leafChunkAccount.fetch("H4ZsQmWXT62w1iTGs2RwjKtkp4BkSYsfgAqSBzfNVvv4");
    let nonceAcc = await program.account.nonceStatus.fetch("HwjL8GnLM59LEDrodfemRmXpPPdqw4ztkSwXRb1NDKMF");
    // console.log(mtAcc.root.toString())
    console.log(nonceAcc)
  })
})