use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, SetAuthority};
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3, 
    CreateMasterEditionV3, CreateMetadataAccountsV3, 
    Metadata,
};
use mpl_token_metadata::types::DataV2;
use anchor_spl::token::spl_token::instruction::AuthorityType;

declare_id!("F1pN8uizaEUJhc6t5SGaoyVDz8Tf29t9Z37jQCdhe7Kd");

#[program]
pub mod carbon_credit_tokenizer {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.batch_counter = 0;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn mint_batch_nft(
        ctx: Context<MintBatchNFT>, 
        name: String, 
        symbol: String, 
        uri: String
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.batch_counter += 1;
        let token_id = registry.batch_counter;

        // 1. Create Metadata Account for the Batch NFT
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    mint_authority: ctx.accounts.owner.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    update_authority: ctx.accounts.owner.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: name.clone(),
                symbol: symbol.clone(),
                uri: uri.clone(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false,
            true,
            None,
        )?;

        // 2. Mint the NFT (Supply = 1)
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    to: ctx.accounts.nft_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            1,
        )?;

        // 3. Create Master Edition to lock the NFT
        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.master_edition.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    mint_authority: ctx.accounts.owner.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    update_authority: ctx.accounts.owner.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            Some(0),
        )?;

        let batch = &mut ctx.accounts.batch_data;
        batch.nft_mint = ctx.accounts.nft_mint.key();
        batch.owner = ctx.accounts.owner.key();
        batch.status = BatchStatus::Pending;
        batch.uri = uri;
        batch.token_id = token_id;

        Ok(())
    }

    pub fn update_batch_with_data(
        ctx: Context<UpdateBatchData>,
        serial_number: String,
        quantity: u64,
        uri: String,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        require!(matches!(batch.status, BatchStatus::Pending), ErrorCode::InvalidBatchStatus);
        
        batch.serial_number = serial_number;
        batch.quantity = quantity;
        batch.uri = uri;
        Ok(())
    }

    pub fn link_with_vintage(ctx: Context<LinkWithVintage>, vintage_id: u64) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        require!(matches!(batch.status, BatchStatus::Pending), ErrorCode::InvalidBatchStatus);

        batch.project_vintage_id = vintage_id;
        Ok(())
    }

    pub fn confirm_batch(ctx: Context<ConfirmBatch>) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let registry = &ctx.accounts.registry;

        // Validation
        require!(registry.authority == ctx.accounts.verifier.key(), ErrorCode::Unauthorized);
        require!(matches!(batch.status, BatchStatus::Pending), ErrorCode::InvalidBatchStatus);
        require!(!batch.serial_number.is_empty(), ErrorCode::InvalidBatchStatus);

        // HANDOVER: Transfer SPL Mint Authority to Registry PDA
        token::set_authority(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    account_or_mint: ctx.accounts.spl_mint.to_account_info(),
                    current_authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            AuthorityType::MintTokens,
            Some(registry.key()),
        )?;

        batch.status = BatchStatus::Confirmed;
        Ok(())
    }

    pub fn fractionalize_batch(
        ctx: Context<FractionalizeBatch>,
        token_name: String,
        token_symbol: String,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        require!(matches!(batch.status, BatchStatus::Confirmed), ErrorCode::InvalidBatchStatus);

        let registry_bump = ctx.accounts.registry.bump;
        let seeds = &[b"registry".as_ref(), &[registry_bump]];
        let signer = &[&seeds[..]];

        // 1. Create Metadata for the Fungible SPL Tokens
        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.spl_metadata.to_account_info(),
                    mint: ctx.accounts.spl_mint.to_account_info(),
                    mint_authority: ctx.accounts.registry.to_account_info(),
                    payer: ctx.accounts.owner.to_account_info(),
                    update_authority: ctx.accounts.registry.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            DataV2 {
                name: token_name,
                symbol: token_symbol,
                uri: batch.uri.clone(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            false,
            true,
            None,
        )?;

        // 2. Burn the Batch NFT
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    from: ctx.accounts.nft_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            1,
        )?;

        // 3. Mint the fungible tokens 1:1 with Batch Quantity
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.spl_mint.to_account_info(),
                    to: ctx.accounts.user_spl_token_account.to_account_info(),
                    authority: ctx.accounts.registry.to_account_info(),
                },
                signer,
            ),
            batch.quantity,
        )?;

        batch.status = BatchStatus::Fractionalized;
        Ok(())
    }
}

// --- Context Structs ---

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + Registry::SIZE, seeds = [b"registry"], bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintBatchNFT<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(init, payer = owner, mint::decimals = 0, mint::authority = owner, mint::freeze_authority = owner)]
    pub nft_mint: Account<'info, Mint>,
    #[account(init, payer = owner, associated_token::mint = nft_mint, associated_token::authority = owner)]
    pub nft_token_account: Account<'info, TokenAccount>,
    /// CHECK: Metaplex validation
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    /// CHECK: Metaplex validation
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    #[account(init, payer = owner, space = 8 + Batch::SIZE, seeds = [b"batch", nft_mint.key().as_ref()], bump)]
    pub batch_data: Account<'info, Batch>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateBatchData<'info> {
    #[account(mut, seeds = [b"batch", batch.nft_mint.as_ref()], bump, has_one = owner)]
    pub batch: Account<'info, Batch>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct LinkWithVintage<'info> {
    #[account(mut, seeds = [b"batch", batch.nft_mint.as_ref()], bump, has_one = owner)]
    pub batch: Account<'info, Batch>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ConfirmBatch<'info> {
    #[account(seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut, seeds = [b"batch", batch.nft_mint.as_ref()], bump)]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub spl_mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>, 
    pub verifier: Signer<'info>, 
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FractionalizeBatch<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(mut, seeds = [b"batch", nft_mint.key().as_ref()], bump, has_one = nft_mint, has_one = owner)]
    pub batch: Account<'info, Batch>,
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    #[account(mut)]
    pub nft_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub spl_mint: Account<'info, Mint>,
    /// CHECK: Metaplex validation
    #[account(mut)]
    pub spl_metadata: UncheckedAccount<'info>,
    #[account(mut)]
    pub user_spl_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// --- Data Structs ---

#[account]
pub struct Batch {
    pub nft_mint: Pubkey,
    pub token_id: u64,
    pub owner: Pubkey,
    pub status: BatchStatus,
    pub quantity: u64,
    pub serial_number: String,
    pub project_vintage_id: u64,
    pub uri: String,
}

impl Batch {
    pub const SIZE: usize = 32 + 8 + 32 + 1 + 8 + 200 + 8 + 200;
}

#[account]
pub struct Registry {
    pub authority: Pubkey,
    pub batch_counter: u64,
    pub bump: u8,
}

impl Registry {
    pub const SIZE: usize = 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BatchStatus {
    Pending,
    Confirmed,
    Rejected,
    Fractionalized,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid batch status for this operation")]
    InvalidBatchStatus,
    #[msg("Unauthorized access")]
    Unauthorized,
}