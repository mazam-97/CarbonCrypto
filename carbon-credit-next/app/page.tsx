import Link from 'next/link';
import { HomeBatchInfo } from '@/components/HomeBatchInfo';
import { WalletBar } from '@/components/WalletBar';

export default function HomePage() {
  return (
    <main className="container grid" style={{ gap: 20 }}>
      <h1>Carbon Credit Next UI</h1>
      <WalletBar />
      <p className="small">Separate UX for issuer users and verifier/auditor inbox.</p>
      <div className="grid grid-2">
        <div className="card">
          <h3>Regular User</h3>
          <p className="small">Bring carbon credit batches on-chain: mint + enrich + link vintage.</p>
          <Link href="/user"><button>Open User View</button></Link>
        </div>
        <div className="card">
          <h3>Auditor / Verifier</h3>
          <p className="small">Inbox of pending batches with serial + URI before confirming.</p>
          <Link href="/verifier/inbox"><button>Open Verifier Inbox</button></Link>
        </div>
      </div>
      <HomeBatchInfo />
    </main>
  );
}
