import React, { useState } from 'react';
import type { RawHistoryItem, TokenInfo, ProjectInfo } from '../types/tracker';
import './TransactionRow.css';

interface TransactionRowProps {
  item: RawHistoryItem;
  tokenDict: Record<string, TokenInfo>;
  projectDict: Record<string, ProjectInfo>;
  onCopyText: (text: string, label: string) => void;
  onFilterAddress?: (addr: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  item,
  tokenDict,
  projectDict,
  onCopyText,
  onFilterAddress,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  // Status computation (WALLET-TRACKER-DESIGN.md lines 281, 293-295)
  const isFailed = item.tx?.status === 0;
  const isPending = item.tx?.status === -1;
  const statusClass = isFailed ? 'failed' : isPending ? 'pending' : 'success';
  const statusTitle = isFailed ? 'Failed' : isPending ? 'Pending mempool' : 'Confirmed';

  // Method computation (WALLET-TRACKER-DESIGN.md lines 283, 301)
  let method = 'Contract Call';
  if (item.token_approve) {
    method = 'Approve';
  } else if (item.receives.length > 0 && item.sends.length > 0) {
    method = 'Swap';
  } else if (item.receives.length > 0) {
    method = 'Receive';
  } else if (item.sends.length > 0) {
    method = 'Send';
  } else if (item.tx?.name) {
    method = item.tx.name;
  }

  // Format truncated hash
  const shortHash = item.id ? `${item.id.slice(0, 6)}...${item.id.slice(-4)}` : '';

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.id) return;
    onCopyText(item.id, 'Transaction hash');
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 1200);
  };

  // Route: From / To / Counterparty
  let counterparty = item.other_addr || item.tx?.to_addr || '';
  let counterpartyName = '';
  if (item.project_id && projectDict[item.project_id]) {
    counterpartyName = projectDict[item.project_id].name;
  } else if (item.other_addr) {
    counterpartyName = `${item.other_addr.slice(0, 6)}...${item.other_addr.slice(-4)}`;
  }

  // Amount & Flow computation (WALLET-TRACKER-DESIGN.md lines 285-287, 308-310)
  let flowType: 'inflow' | 'outflow' | 'neutral' = 'neutral';
  let amountStr = '';
  let tokenSymbol = '';

  if (item.receives.length > 0) {
    flowType = 'inflow';
    const rec = item.receives[0];
    const tok = tokenDict[rec.token_id];
    tokenSymbol = tok?.optimized_symbol || tok?.symbol || 'TOKENS';
    amountStr = `+${rec.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${tokenSymbol}`;
  } else if (item.sends.length > 0) {
    flowType = 'outflow';
    const snd = item.sends[0];
    const tok = tokenDict[snd.token_id];
    tokenSymbol = tok?.optimized_symbol || tok?.symbol || 'TOKENS';
    amountStr = `-${snd.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${tokenSymbol}`;
  } else if (item.token_approve) {
    flowType = 'neutral';
    const tok = tokenDict[item.token_approve.token_id];
    tokenSymbol = tok?.optimized_symbol || tok?.symbol || '';
    amountStr = `Approve ${item.token_approve.value} ${tokenSymbol}`;
  }

  // Gas computation (WALLET-TRACKER-DESIGN.md lines 288, 311-314)
  const usdGas = item.tx?.usd_gas_fee ? `$${item.tx.usd_gas_fee.toFixed(2)}` : '—';
  const gwei = item.tx?.eth_gas_fee ? `${(item.tx.eth_gas_fee * 1e9).toFixed(0)} Gwei` : '';

  // Timestamp
  const dateObj = new Date(item.time_at * 1000);
  const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`tx-row ${item.is_scam ? 'scam-row' : ''}`} role="row" tabIndex={0}>
      {/* 1. Status Badge */}
      <div className="tx-cell cell-status">
        <span className={`status-dot ${statusClass}`} title={statusTitle}></span>
      </div>

      {/* 2. Chain Badge */}
      <div className="tx-cell cell-chain">
        <span className="chain-badge">{item.chain.toUpperCase()}</span>
      </div>

      {/* 3. Tx Hash with click-to-copy */}
      <div className="tx-cell cell-hash">
        <code className="mono hash-text" translate="no" title={item.id}>
          {shortHash}
        </code>
        <button
          className="tx-copy-btn"
          onClick={handleCopyHash}
          aria-label="Copy transaction hash"
          title="Copy full hash"
        >
          {copiedHash ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="copy-ok">
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

      {/* 4. Action Method Badge */}
      <div className="tx-cell cell-method">
        <span className={`badge-method ${method.toLowerCase()}`}>{method}</span>
        {item.is_scam && <span className="scam-tag">FLAGGED</span>}
      </div>

      {/* 5. Route / Counterparty */}
      <div className="tx-cell cell-route">
        {counterpartyName && (
          <span
            className="mono route-text"
            translate="no"
            onClick={() => counterparty && onFilterAddress && onFilterAddress(counterparty)}
            title={counterparty}
          >
            {counterpartyName}
          </span>
        )}
      </div>

      {/* 6. Amount Value & Flow */}
      <div className={`tx-cell cell-amount ${flowType}`}>
        <span className="mono amount-text">{amountStr || '—'}</span>
      </div>

      {/* 7. Gas & Fee */}
      <div className="tx-cell cell-gas">
        <span className="mono gas-usd">{usdGas}</span>
        {gwei && <span className="mono-meta gas-gwei">{gwei}</span>}
      </div>

      {/* 8. Timestamp */}
      <div className="tx-cell cell-time">
        <time dateTime={dateObj.toISOString()} title={dateObj.toUTCString()}>
          {timeFormatted}
        </time>
      </div>
    </div>
  );
};
