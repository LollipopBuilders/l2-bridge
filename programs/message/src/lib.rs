#![allow(clippy::result_large_err)]
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::system_program::System;
use dd_merkle_tree::{HashingAlgorithm, MerkleTree};
use serde::{Deserialize, Serialize};

declare_id!("7HVZ6xxrdeVdWs5jDJoJBBxqv4gm4shM8SCtwxSsmgSb");

pub mod constants {
    use super::*;

    pub const CHUNK_SIZE: usize = 10;
    pub const MIN_AMOUNT: u64 = 1;

    pub const ADMIN: Pubkey = Pubkey::new_from_array([
        26, 207, 79, 170, 49, 31, 88, 249, 165, 205, 98, 53, 114, 10, 2, 38, 153, 148, 183, 131,
        181, 212, 140, 42, 23, 181, 17, 245, 81, 111, 39, 206,
    ]);

    pub const MESSENGER: Pubkey = Pubkey::new_from_array([
        26, 207, 79, 170, 49, 31, 88, 249, 165, 205, 98, 53, 114, 10, 2, 38, 153, 148, 183, 131,
        181, 212, 140, 42, 23, 181, 17, 245, 81, 111, 39, 206,
    ]);
}

#[program]
mod message {

    use super::*;

    pub fn initialize(_ctx: Context<InitializeMessage>) -> Result<()> {
        Ok(())
    }

    /// Stores cross-chain message information and updates the merkle tree
    ///
    /// # Arguments
    /// * `ctx` - The context of the request
    /// * `amount` - The amount of tokens to transfer
    /// * `nonce` - The current transaction nonce
    /// * `user` - The public key of the user
    pub fn store_cross_chain_info(
        ctx: Context<Store>,
        amount: u64,
        nonce: u64,
        user: Pubkey,
    ) -> Result<()> {
        let current_nonce = ctx.accounts.nonce_account.l2_nonce;
        require!(nonce == current_nonce, CustomError::NonceOverflow);
        let m_tree_account = &mut ctx.accounts.m_tree;
        let info = &mut Info::new(user, user, amount, nonce, MessageType::Native);

        let leaf_hash = info.double_hash_array();
        m_tree_account.leafs.push(leaf_hash);

        let mut tree = MerkleTree::new(HashingAlgorithm::Sha256d, 32);
        tree.add_hashes(
            m_tree_account
                .leafs
                .iter()
                .map(|&leaf| leaf.to_vec()) // 转换为 Vec<u8>
                .collect(),
        )
        .unwrap();
        tree.merklize().unwrap();
        m_tree_account.root = tree
            .get_merkle_root()
            .unwrap()
            .try_into()
            .map_err(|_| "Conversion failed")
            .unwrap();

        ctx.accounts.nonce_account.l2_nonce = current_nonce
            .checked_add(1)
            .ok_or(CustomError::NonceOverflow)?;
        Ok(())
    }

    /// Relays a message from L1 to L2
    ///
    /// # Arguments
    /// * `ctx` - The context of the request
    /// * `amount` - The amount of tokens to transfer
    /// * `nonce` - The current transaction nonce
    pub fn relay_message(ctx: Context<Relay>, amount: u64, nonce: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.messenger.key(),
            constants::MESSENGER,
            CustomError::InvalidMessenger
        );

        let current_nonce = ctx.accounts.nonce_account.l1_nonce;
        require!(nonce == current_nonce, CustomError::NonceOverflow);

        system_program::mint(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Mint {
                    from: ctx.accounts.messenger.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.nonce_account.l1_nonce = current_nonce
            .checked_add(1)
            .ok_or(CustomError::NonceOverflow)?;
        Ok(())
    }

    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        **ctx.accounts.locked_sol_account.lamports.borrow_mut() -=amount;
        **ctx.accounts.payer.lamports.borrow_mut() +=amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMessage<'info> {
    #[account(init,payer = payer, space = 8+NonceStatus::INIT_SPACE)]
    pub nonce_account: Account<'info, NonceStatus>,

    #[account(init,payer = payer, space = 8+LeafChunkAccount::INIT_SPACE)]
    pub m_tree: Account<'info, LeafChunkAccount>,
    #[account(mut,constraint = payer.key() == constants::ADMIN)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Store<'info> {
    #[account(mut)]
    pub nonce_account: Account<'info, NonceStatus>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub m_tree: Account<'info, LeafChunkAccount>,
}

#[derive(Accounts)]
pub struct Relay<'info> {
    #[account(mut)]
    pub nonce_account: Account<'info, NonceStatus>,

    #[account(mut,constraint = messenger.key() == constants::MESSENGER)]
    pub messenger: Signer<'info>,

    #[account(mut)]
    pub to: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    /// CHECK: This account holds locked SOL during L2->L1 bridge operations
    #[account(mut,owner = id())]
    pub locked_sol_account: AccountInfo<'info>,
    #[account(mut,constraint = payer.key() == constants::ADMIN)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Info {
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub message_type: MessageType,
}

impl Info {
    pub fn new(
        from: Pubkey,
        to: Pubkey,
        amount: u64,
        nonce: u64,
        message_type: MessageType,
    ) -> Self {
        Self {
            from,
            to,
            amount,
            nonce,
            message_type,
        }
    }
    fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&self.from.to_bytes());
        bytes.extend_from_slice(&self.to.to_bytes());
        bytes.extend_from_slice(&self.amount.to_le_bytes());
        bytes.extend_from_slice(&self.nonce.to_le_bytes());
        bytes.extend_from_slice(&self.message_type.to_bytes());
        bytes
    }

    pub fn double_hash(&self) -> Vec<u8> {
        let m = &self.to_bytes();
        HashingAlgorithm::Sha256d.double_hash(m, 32 as usize)
    }

    pub fn double_hash_array(&self) -> [u8; 32] {
        let m = self.double_hash();
        assert!(m.len() == 32);
        let mut array = [0u8; 32];
        array.copy_from_slice(&m);
        array
    }
}

#[account]
pub struct FixedAccount {
    pub lamports: u64,
}

#[account]
#[derive(InitSpace)]
pub struct NonceStatus {
    pub l1_nonce: u64,
    pub l2_nonce: u64,
}

#[account]
#[derive(InitSpace)]
pub struct LeafChunkAccount {
    pub root: [u8; 32],
    #[max_len(32)]
    pub leafs: Vec<[u8; 32]>,
    pub is_fulled: bool,
}

#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Serialize, Deserialize,
)]
pub enum MessageType {
    Native,
    Token,
    NFT,
}

impl MessageType {
    pub fn to_bytes(&self) -> Vec<u8> {
        bincode::serialize(self).unwrap()
    }

    pub fn from_bytes(bytes: &[u8]) -> Self {
        bincode::deserialize(bytes).unwrap()
    }
}

#[error_code]
pub enum CustomError {
    InvalidMessenger,
    NonceOverflow,
    UnsupportedMessageType,
    InvalidMessageType,
}
