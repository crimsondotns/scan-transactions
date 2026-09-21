import React, { useState } from 'react';
import type { TrackedWallet } from '../types/tracker';
import './WalletCard.css';

interface WalletCardProps {
  wallet: TrackedWallet;
  isSelected?: boolean;
  onSelect?: () => void;
  onCopyAddress: (addr: string) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  isSelected,
  onSelect,
  onCopyAddress,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyAddress(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const truncated = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  const isPositive = wallet.change24h >= 0;

  return (
    <div
      className={`wallet-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      {/* Top Row: Identity */}
      <div className="wc-top">
        <div className="wc-identity">
          <div className="wc-avatar" aria-hidden="true">
            {wallet.nickname.slice(0, 2).toUpperCase()}
          </div>
          <div className="wc-meta">
            <span className="wc-name">{wallet.nickname}</span>
            <div className="wc-addr-row">
              <span className="mono wc-addr" translate="no">{truncated}</span>
              <button
                className="wc-copy-btn"
                onClick={handleCopy}
                aria-label={`Copy address for ${wallet.nickname}`}
                title="Copy address"
              >
                {copied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="copy-success">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="wc-chains">
          {wallet.chains.map((chain) => (
            <span key={chain} className="wc-chain-tag">{chain.toUpperCase()}</span>
          ))}
        </div>
      </div>

      {/* Middle Row: Big Balance + 24h Change */}
      <div className="wc-middle">
        <span className="mono wc-balance">
          ${wallet.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className={`pill ${isPositive ? 'pos' : 'neg'}`}>
          {isPositive ? '+' : ''}{wallet.change24h.toFixed(2)}%
        </span>
      </div>

      {/* Bottom Row: Quick Stats */}
      <div className="wc-bottom">
        <span className="wc-stat-text">{wallet.activeTxCount} txns (24h)</span>
        <span className="wc-bullet">•</span>
        <span className="wc-stat-text">Active {wallet.lastActive}</span>
      </div>
    </div>
  );
};
