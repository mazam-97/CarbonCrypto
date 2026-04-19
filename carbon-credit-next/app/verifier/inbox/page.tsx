import { WalletBar } from '@/components/WalletBar';
import { VerifierInbox } from '@/components/VerifierInbox';
import { SiteFooter } from '@/components/SiteFooter';

export default function VerifierInboxPage() {
  return (
    <>
      <WalletBar />
      <main className="page-main container grid">
        <header>
          <p className="hero__eyebrow">Verifier</p>
          <h1 className="page-title">Inbox for pending batches</h1>
          <p className="page-intro small">
            Validate serial numbers and metadata URIs on-chain before confirming. Refresh to pull the latest pending
            set.
          </p>
        </header>
        <VerifierInbox />
      </main>
      <SiteFooter />
    </>
  );
}
