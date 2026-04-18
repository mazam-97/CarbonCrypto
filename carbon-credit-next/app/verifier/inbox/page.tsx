import { WalletBar } from '@/components/WalletBar';
import { VerifierInbox } from '@/components/VerifierInbox';

export default function VerifierInboxPage() {
  return (
    <main className="container grid" style={{ gap: 16 }}>
      <h1>Auditor / Verifier Inbox</h1>
      <p className="small">Review pending batches and confirm after validating serial + metadata URI.</p>
      <WalletBar />
      <VerifierInbox />
    </main>
  );
}
