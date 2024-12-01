import { assert } from "chai";
import * as anchor from "@coral-xyz/anchor";

import { Connection, clusterApiUrl } from '@solana/web3.js';
import { it } from "mocha";
const { SystemProgram } = anchor.web3;

describe("Bridge", () => {
  // 自定义 RPC URL
  const rpcUrl = "http://13.215.160.229:8899";
  // const rpcUrl = "http://127.0.0.1:8899";

  // 创建一个新的连接对象
  const connection = new Connection(rpcUrl, 'confirmed'); // 'confirmed' 是网络确认的级别

  // 创建一个 AnchorProvider，使用自定义的连接和钱包
  const provider = new anchor.AnchorProvider(connection, anchor.Wallet.local(), { commitment: 'confirmed' });

  // const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const payer = provider.wallet as anchor.Wallet;
  // console.log(payer.publicKey.toBytes())
  // console.log(provider)
  const message = anchor.workspace.Message;
  const bridge = anchor.workspace.Bridge;
  // 生成测试账户
  let mt = anchor.web3.Keypair.generate();
  let fixed_account = anchor.web3.Keypair.generate();
  let nonce_account = anchor.web3.Keypair.generate();

  const nonceStr = "3LnrDqu7wcTz9Lkp6Tzr1HSwCi4bVtvzgaYUp6uANcBe"
  const fixedStr = "49V8ZH4VDdTxNSRJmAhdu82ppqANCdtEHbkQMGnjt9Vd"
  const mtStr = "wzKKuJdp49kZnGDS9HDfNJxbeMBrWiYAH33U5ii3DMj"

  it("Init message", async () => {
    await message.methods
      .initialize()
      .accounts({
        nonceAccount: nonce_account.publicKey,
        mTree: mt.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([nonce_account, mt])
      .rpc();

    let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 0);
  });

  // return;
  // it("init bridge", async () => {
  //   await bridge.methods
  //     .initialize()
  //     .accounts({
  //       user: provider.wallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers()
  //     .rpc();

  // })




  it("bridge withdraw", async () => {
    let amount = new anchor.BN(1000000000)
    const re = await bridge.methods
      .withdraw(amount, new anchor.BN(0))
      .accounts({
        nonceAccount: nonce_account.publicKey,
        lockedSolAccount: fixed_account.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        l2Message: message.pubkey,
        mTree: mt.publicKey,
      })
      .signers(payer.payer)
      .rpc();

    console.log("跨链1", re)

    let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 1);
    // console.log(mtAcc)

    // console.log(mtAcc);
  });

  it("bridge withdraw", async () => {
    let amount = new anchor.BN(1000000000)
    const re = await bridge.methods
      .withdraw(amount, new anchor.BN(1))
      .accounts({
        nonceAccount: nonce_account.publicKey,
        lockedSolAccount: fixed_account.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        l2Message: message.pubkey,
        mTree: mt.publicKey,
      })
      .signers(payer.payer)
      .rpc();

    console.log("跨链2", re)

    let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 2);
    // console.log(mtAcc)

    // console.log(mtAcc);
  });

  console.log("message", message._programId.toString())
  console.log("tree", mt.publicKey.toString())
  console.log("user", provider.wallet.publicKey.toString())
  return

  it("bridge withdraw", async () => {
    let amount = new anchor.BN(888888)
    const re = await bridge.methods
      .withdraw(amount, new anchor.BN(1))
      .accounts({
        nonceAccount: nonce_account.publicKey,
        lockedSolAccount: fixed_account.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        l2Message: message.pubkey,
        mTree: mt.publicKey,
      })
      .signers(payer.payer)
      .rpc();

    console.log("跨链2", re)

    let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 2);
    // console.log(mtAcc)

    // console.log(mtAcc);
  });


  it("bridge withdraw", async () => {
    let amount = new anchor.BN(666666)
    const re = await bridge.methods
      .withdraw(amount, new anchor.BN(2))
      .accounts({
        nonceAccount: nonce_account.publicKey,
        lockedSolAccount: fixed_account.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        l2Message: message.pubkey,
        mTree: mt.publicKey,
      })
      .signers(payer.payer)
      .rpc();

    console.log("跨链3", re)

    let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 3);
    // console.log(mtAcc)

    // console.log(mtAcc);
  });




  // it("stores cross chain info two", async () => {
  //   let amount = new anchor.BN(23333)
  //   await message.methods
  //     .storeCrossChainInfo(amount, provider.wallet.publicKey)
  //     .accounts({
  //       payer: provider.wallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //       mTree: mt.publicKey,
  //     })
  //     .signers(payer.payer)
  //     .rpc();


  //   let mtAcc = await message.account.leafChunkAccount.fetch(mt.publicKey);
  //   assert.ok(Object.keys(mtAcc.leafs).length == 2);

  //   // console.log(mtAcc);
  // });

});