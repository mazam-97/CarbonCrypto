import { WalletBar } from '@/components/WalletBar';
import { UserOnchainPanel } from '@/components/UserOnchainPanel';

export default function UserPage() {
  return (
    <main className="container grid" style={{ gap: 16 }}>
      <h1>Regular User: Bring Carbon Credits On-chain</h1>
      <WalletBar />
      <UserOnchainPanel />
    </main>
  );
}
