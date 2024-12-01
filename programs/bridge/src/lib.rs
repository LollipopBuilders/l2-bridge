/*
 * @Descripttion: js
 * @Version: 1.0
 * @Author: Yulin
 * @Date: 2024-10-28 10:33:22
 * @LastEditors: Yulin
 * @LastEditTime: 2024-11-22 22:45:30
 */
use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("8EmkexKZB4XL4k2TkvEDyyWNKvrY7zxCw9SVQxF14GaJ");

const ADMIN: Pubkey = Pubkey::new_from_array([
    26, 207, 79, 170, 49, 31, 88, 249, 165, 205, 98, 53, 114, 10, 2, 38, 153, 148, 183, 131,
    181, 212, 140, 42, 23, 181, 17, 245, 81, 111, 39, 206,
]);

const MESSAGE_PUBKEY: Pubkey = Pubkey::new_from_array([
    93,  95, 179,  54,  48, 179, 156,  35,
   186, 191, 250, 252, 109,  71,   0, 122,
   167, 134,  77,  66,  24, 187, 221, 133,
   128, 225,   9, 106, 153, 145, 234, 168
 ]);

declare_program!(message);
use message::accounts::LeafChunkAccount;
use message::accounts::NonceStatus;
use message::cpi::accounts::StoreCrossChainInfo;
use message::cpi::store_cross_chain_info;
use message::program::Message;

#[program]
mod bridge {

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64, nonce: u64) -> Result<()> {
        // 检查用户的 SOL 是否足够
        let user_lamports = **ctx.accounts.user.try_borrow_lamports()?;
        if user_lamports < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.locked_sol_account.to_account_info(),
                },
            ),
            amount,
        )?;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.l2_message.to_account_info(),
            StoreCrossChainInfo {
                nonce_account: ctx.accounts.nonce_account.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                m_tree: ctx.accounts.m_tree.to_account_info(),
            },
        );
        store_cross_chain_info(cpi_ctx, amount, nonce, ctx.accounts.user.key())?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut,constraint = user.key() == ADMIN)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub nonce_account: Account<'info, NonceStatus>,
    #[account(mut)]
    /// CHECK: This account holds locked SOL during L2->L1 bridge operations
    pub locked_sol_account: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    #[account(constraint = l2_message.key() == MESSAGE_PUBKEY)]
    pub l2_message: Program<'info, Message>,
    #[account(mut)]
    pub m_tree: Account<'info, LeafChunkAccount>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds for this transaction.")]
    InsufficientFunds,
}
