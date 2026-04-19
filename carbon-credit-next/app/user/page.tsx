import { WalletBar } from '@/components/WalletBar';
import { UserOnchainPanel } from '@/components/UserOnchainPanel';
import { SiteFooter } from '@/components/SiteFooter';

export default function UserPage() {
  return (
    <>
      <WalletBar />
      <main className="page-main container grid">
        <header>
          <p className="hero__eyebrow">Issuer console</p>
          <h1 className="page-title">Bring carbon credits on-chain</h1>
          <p className="page-intro small">
            Connect a wallet and progress through minting, enrichment, vintage linkage, and fractionalization after
            verifier confirmation. Deposits to the shared carbon pool (BCT) are available after the pool is initialized
            from the verifier inbox. You can retire (burn) BCT when credits are claimed or used.
          </p>
        </header>
        <UserOnchainPanel />
      </main>
      <SiteFooter />
    </>
  );
}
