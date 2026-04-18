'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletBar() {
  return (
    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
      <div className="row">
        <Link href="/"><button>Home</button></Link>
        <Link href="/user"><button>User View</button></Link>
        <Link href="/verifier/inbox"><button>Verifier Inbox</button></Link>
      </div>
      <WalletMultiButton />
    </div>
  );
}
