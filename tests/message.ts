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
  const payer = provider.wallet as anchor.Wallet;
  console.log("payer", payer.publicKey.toBytes())

  const program = anchor.workspace.Message;
  console.log("program", program.programId.toBytes())
  // 生成测试账户
  let mt = anchor.web3.Keypair.generate();
  let fixed_account = anchor.web3.Keypair.generate();
  let nonce_account = anchor.web3.Keypair.generate();
  let other = anchor.web3.Keypair.generate();

  console.log("mt", mt.publicKey)
  console.log("nonce_account", nonce_account.publicKey)
  console.log("messager ", provider.wallet.publicKey)
  console.log("fixed_account", fixed_account.publicKey)
  it("Init", async () => {
    await program.methods
      .initialize()
      .accounts({
        nonceAccount: nonce_account.publicKey,
        mTree: mt.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([nonce_account, mt])
      .rpc();

    let mtAcc = await program.account.leafChunkAccount.fetch(mt.publicKey);
    assert.ok(Object.keys(mtAcc.leafs).length == 0);

  });

  it("transfer", async () => {
    // 2. 获取租金费用 (账户的初始空间)
    const rentExempt = await provider.connection.getMinimumBalanceForRentExemption(100);

    // 3. 构造创建账户的交易指令
    const transaction = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey, // 资金来源账户
        newAccountPubkey: fixed_account.publicKey, // 新账户的公钥
        lamports: rentExempt, // 需要的 SOL 数量，至少是租金豁免所需的最低 SOL 数量
        space: 0, // 新账户的空间，0 表示没有额外的数据空间
        programId: program.programId, // 系统程序 ID
      })
    );

    // 4. 发送交易
    const signature = await provider.sendAndConfirm(transaction, [payer.payer, fixed_account], {
      commitment: "confirmed",
    });


    // 创建一个转账指令
    const transferTx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: fixed_account.publicKey,
        lamports: 10 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );

    // 使用fromAccount签名并发送交易
    await provider.sendAndConfirm(transferTx, [payer.payer]);

    // const transferTx2 = new anchor.web3.Transaction().add(
    //   SystemProgram.transfer({
    //     fromPubkey: provider.wallet.publicKey,
    //     toPubkey: other.publicKey,
    //     lamports: 10 * anchor.web3.LAMPORTS_PER_SOL,
    //   })
    // );

    // // 使用fromAccount签名并发送交易
    // await provider.sendAndConfirm(transferTx2, [payer.payer]);

    // // 获取转账后的余额
    // const balanceAfter = await provider.connection.getBalance(fixed_account.publicKey);
    // console.log(`Balance after transfer: ${balanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    // // 获取目标账户的余额
    // const toAccountBalance = await provider.connection.getBalance(fixed_account.publicKey);
  })

  // it("burn", async () => {
  //   await program.methods.burn(new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL)).accounts({
  //     lockedSolAccount: fixed_account.publicKey,
  //     payer: provider.wallet.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   }).rpc();
  // })
  // return
  // it("RelayMessage", async () => {

  //   const re = await program.methods.relayMessage(new anchor.BN(888), new anchor.BN(0)).accounts({
  //     nonceAccount: nonce_account.publicKey,
  //     messenger: provider.wallet.publicKey,
  //     to: other.publicKey,
  //     systemProgram: SystemProgram.programId,
  //   }).rpc();
  //   console.log(await provider.connection.getBalance(other.publicKey));

  // })
  // return

  // it("stores cross chain info", async () => {
  //   let amount = new anchor.BN(123)
  //   await program.methods
  //     .storeCrossChainInfo(amount, new anchor.BN(0), provider.wallet.publicKey)
  //     .accounts({
  //       nonceAccount: nonce_account.publicKey,
  //       payer: provider.wallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //       mTree: mt.publicKey,
  //     })
  //     .signers(payer.payer)
  //     .rpc();


  //   let mtAcc = await program.account.leafChunkAccount.fetch(mt.publicKey);
  //   assert.ok(Object.keys(mtAcc.leafs).length == 1);

  //   // console.log(mtAcc);
  // });

  // it("stores cross chain info two", async () => {
  //   let amount = new anchor.BN(23333)
  //   await program.methods
  //     .storeCrossChainInfo(amount, provider.wallet.publicKey)
  //     .accounts({
  //       payer: provider.wallet.publicKey,
  //       systemProgram: SystemProgram.programId,
  //       mTree: mt.publicKey,
  //     })
  //     .signers(payer.payer)
  //     .rpc();


  //   let mtAcc = await program.account.leafChunkAccount.fetch(mt.publicKey);
  //   assert.ok(Object.keys(mtAcc.leafs).length == 2);

  //   // console.log(mtAcc);
  // });

});