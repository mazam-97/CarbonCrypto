import Link from 'next/link';
import { HomeBatchInfo } from '@/components/HomeBatchInfo';
import { WalletBar } from '@/components/WalletBar';
import { SiteFooter } from '@/components/SiteFooter';

function IconIssuer() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 8v8l8 5 8-5V8l-8-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 10.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconVerifier() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13.5 10 18 19 7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8.5h7M8.5 12h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <WalletBar />
      <main className="page-main container grid">
        <section className="hero">
          <p className="hero__eyebrow">Carbon market infrastructure</p>
          <h1 className="hero__title">Digital rails for verifiable climate assets</h1>
          <p className="hero__lead">
            Tokenize batch metadata on Solana, separate issuer and verifier responsibilities, and keep serials and
            URIs reviewable before credits advance—aligned with transparent market infrastructure like{' '}
            <a href="https://toucan.earth" target="_blank" rel="noreferrer">
              Toucan
            </a>
            .
          </p>
          <div className="stats-strip" aria-label="Product metrics">
            <div className="stat-pill">
              <div className="stat-pill__value">
                4<span className="stat-pill__suffix">steps</span>
              </div>
              <div className="stat-pill__label">Structured lifecycle through fractionalization</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill__value">1:1</div>
              <div className="stat-pill__label">Canonical on-chain record per batch mint</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill__value">1</div>
              <div className="stat-pill__label">Verifier approval required before fungible units are minted</div>
            </div>
          </div>
        </section>

        <div>
          <p className="section-label">Workflows</p>
          <p className="small section-intro">
            Choose a role to open the console. The issuer path progresses on-chain; the verifier path is an explicit
            review queue.
          </p>
          <div className="grid grid-2">
            <div className="card route-card">
              <div className="route-card__icon" aria-hidden>
                <IconIssuer />
              </div>
              <div className="route-card__body">
                <h3>Issuer</h3>
                <p className="small">
                  Mint the batch NFT, attach serial and metadata, link a vintage, then fractionalize after
                  confirmation.
                </p>
              </div>
              <Link href="/user" className="route-card__cta btn">
                Issuer console
              </Link>
            </div>
            <div className="card route-card">
              <div className="route-card__icon" aria-hidden>
                <IconVerifier />
              </div>
              <div className="route-card__body">
                <h3>Verifier</h3>
                <p className="small">
                  Review pending batches with serial numbers and metadata URIs before signing off—an auditable gate,
                  not an opaque approval.
                </p>
              </div>
              <Link href="/verifier/inbox" className="route-card__cta btn btn--secondary">
                Verifier inbox
              </Link>
            </div>
          </div>
        </div>

        <HomeBatchInfo />
      </main>
      <SiteFooter />
    </>
  );
}
