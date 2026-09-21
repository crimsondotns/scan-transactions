import React, { useState, useEffect, useMemo } from 'react';
import './styles/design-tokens.css';
import './App.css';

import type { RawHistoryItem, TokenInfo, ProjectInfo, TrackedWallet, HistoryFeedResponse } from './types/tracker';
import { TransactionRow } from './components/TransactionRow';
import { WalletCard } from './components/WalletCard';
import { FilterBar } from './components/FilterBar';
import { AlertBanner } from './components/AlertBanner';
import type { AlertData } from './components/AlertBanner';
import { Toast } from './components/Toast';
import { AddWalletModal } from './components/AddWalletModal';

// Initial default tracked wallets (WALLET-TRACKER-DESIGN.md section 4.2)
const INITIAL_WALLETS: TrackedWallet[] = [
  {
    id: 'w1',
    address: '0x42a8895f785a209099f55e3f5bbe6c02386d328e',
    nickname: 'Active Trading Vault',
    balanceUsd: 148290.45,
    change24h: 3.42,
    activeTxCount: 20,
    lastActive: '2m ago',
    chains: ['hood', 'base', 'arb', 'op'],
  },
  {
    id: 'w2',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    nickname: 'Vitalik Cold Storage',
    balanceUsd: 3892400.12,
    change24h: -1.18,
    activeTxCount: 5,
    lastActive: '1h ago',
    chains: ['eth', 'base', 'arb'],
  },
  {
    id: 'w3',
    address: '0x28C6c06298d514Db089934071355E5743bf21d60',
    nickname: 'Binance Hot 14',
    balanceUsd: 84920412.0,
    change24h: 0.84,
    activeTxCount: 142,
    lastActive: '12s ago',
    chains: ['eth', 'bsc', 'polygon'],
  },
];

export const App: React.FC = () => {
  const [wallets, setWallets] = useState<TrackedWallet[]>(() => {
    const saved = localStorage.getItem('wallet_tracker_wallets');
    return saved ? JSON.parse(saved) : INITIAL_WALLETS;
  });

  const [selectedWalletId, setSelectedWalletId] = useState<string>(wallets[0]?.id || '');
  const [historyList, setHistoryList] = useState<RawHistoryItem[]>([]);
  const [tokenDict, setTokenDict] = useState<Record<string, TokenInfo>>({});
  const [projectDict, setProjectDict] = useState<Record<string, ProjectInfo>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [dateRange, setDateRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [hideSpam, setHideSpam] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Alerts state (WALLET-TRACKER-DESIGN.md section 4.4)
  const [alerts, setAlerts] = useState<AlertData[]>([
    {
      id: 'a1',
      type: 'gas',
      title: 'High Gas Alert',
      message: 'Base fee is currently 84 Gwei on Ethereum (> 50 Gwei threshold).',
    },
    {
      id: 'a2',
      type: 'balance',
      title: 'Low Native Balance Alert',
      message: 'Active Trading Vault (0x42a8...328e) has < 0.05 ETH reserved for gas.',
    },
    {
      id: 'a3',
      type: 'suspicious',
      title: 'Suspicious Activity Detected',
      message: 'Flagged airdrop / unverified contract token transfers filtered by default.',
    },
  ]);

  // Save wallets
  useEffect(() => {
    localStorage.setItem('wallet_tracker_wallets', JSON.stringify(wallets));
  }, [wallets]);

  // Load Rabby feed
  useEffect(() => {
    setLoading(true);
    fetch('/sample/history_all.json')
      .then((res) => res.json())
      .then((data: HistoryFeedResponse) => {
        setHistoryList(data.history_list || []);
        setTokenDict(data.token_dict || {});
        setProjectDict(data.project_dict || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load transaction history:', err);
        setLoading(false);
      });
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`Copied ${label} to clipboard`);
    setTimeout(() => {
      setToastMessage((prev) => (prev?.includes(label) ? null : prev));
    }, 2500);
  };

  const handleAddWallet = (address: string, nickname: string) => {
    const newWallet: TrackedWallet = {
      id: `w_${Date.now()}`,
      address,
      nickname,
      balanceUsd: 0,
      change24h: 0,
      activeTxCount: 0,
      lastActive: 'Just added',
      chains: ['eth'],
    };
    setWallets((prev) => [newWallet, ...prev]);
    setSelectedWalletId(newWallet.id);
    setToastMessage(`Wallet ${nickname} added`);
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Chains present in the dataset
  const availableChains = useMemo(() => {
    const set = new Set<string>();
    historyList.forEach((item) => {
      if (item.chain) set.add(item.chain);
    });
    return Array.from(set);
  }, [historyList]);

  // Chain counts for filter pills
  const chainCounts = useMemo(() => {
    const map: Record<string, number> = { all: historyList.length };
    historyList.forEach((item) => {
      map[item.chain] = (map[item.chain] || 0) + 1;
    });
    return map;
  }, [historyList]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return historyList.filter((item) => {
      // Spam filter
      if (hideSpam && item.is_scam) return false;

      // Chain filter
      if (selectedChain !== 'all' && item.chain !== selectedChain) return false;

      // Status filter
      if (statusFilter === 'success' && item.tx?.status !== 1) return false;
      if (statusFilter === 'failed' && item.tx?.status !== 0) return false;
      if (statusFilter === 'pending' && item.tx?.status !== -1) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hashMatch = item.id?.toLowerCase().includes(q);
        const fromMatch = item.tx?.from_addr?.toLowerCase().includes(q);
        const toMatch = item.tx?.to_addr?.toLowerCase().includes(q);
        const otherMatch = item.other_addr?.toLowerCase().includes(q);
        const methodMatch = item.tx?.name?.toLowerCase().includes(q);
        if (!hashMatch && !fromMatch && !toMatch && !otherMatch && !methodMatch) {
          return false;
        }
      }

      return true;
    });
  }, [historyList, hideSpam, selectedChain, statusFilter, searchQuery]);

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId) || wallets[0];

  return (
    <div className="tracker-app">
      {/* Top Navigation Bar */}
      <header className="tracker-header">
        <div className="header-brand">
          <div className="brand-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <div>
            <span className="brand-title">WALLET TRACKER</span>
            <span className="meta-sans brand-sub">HIGH-DENSITY MULTI-WALLET SCANNER</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn outline sm" onClick={() => setIsAddModalOpen(true)}>
            + Add Wallet
          </button>
          <div className="status-live-indicator">
            <span className="live-dot"></span>
            <span className="meta-sans">LIVE FEED</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Sidebar + Content */}
      <div className="tracker-layout">
        {/* Left Sidebar: Tracked Wallets Strip */}
        <aside className="tracker-sidebar">
          <div className="sidebar-header">
            <span className="meta-sans sidebar-title">TRACKED WALLETS ({wallets.length})</span>
            <button className="icon-add-btn" onClick={() => setIsAddModalOpen(true)} title="Add Wallet">
              +
            </button>
          </div>
          <div className="wallet-cards-scroll">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                isSelected={wallet.id === selectedWalletId}
                onSelect={() => setSelectedWalletId(wallet.id)}
                onCopyAddress={(addr) => handleCopy(addr, 'Wallet address')}
              />
            ))}
          </div>
        </aside>

        {/* Right Content: Stats, Alerts, Filter Toolbar, Data Grid */}
        <main className="tracker-main">
          {/* Active Wallet Overview Header */}
          {selectedWallet && (
            <div className="wallet-overview-header">
              <div className="wo-left">
                <h1 className="display-title">{selectedWallet.nickname}</h1>
                <div className="wo-addr-strip">
                  <code className="mono wo-addr" translate="no">{selectedWallet.address}</code>
                  <button
                    className="copy-btn-inline"
                    onClick={() => handleCopy(selectedWallet.address, 'Wallet address')}
                    title="Copy full address"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="wo-right">
                <span className="meta-sans wo-stat-lbl">PORTFOLIO VALUATION</span>
                <span className="mono wo-stat-val">
                  ${selectedWallet.balanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Contextual Alert Banners */}
          <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

          {/* Filter & Slicing Toolbar */}
          <FilterBar
            chains={availableChains}
            selectedChain={selectedChain}
            onSelectChain={setSelectedChain}
            statusFilter={statusFilter}
            onSelectStatus={setStatusFilter}
            dateRange={dateRange}
            onSelectDateRange={setDateRange}
            hideSpam={hideSpam}
            onToggleHideSpam={setHideSpam}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            chainCounts={chainCounts}
          />

          {/* Transactions Data Grid */}
          <div className="tx-table-container">
            {/* Table Column Headers (WALLET-TRACKER-DESIGN.md line 269) */}
            <div className="tx-table-header" role="row">
              <div className="tx-th cell-status">
                <span className="meta-sans">ST</span>
              </div>
              <div className="tx-th cell-chain">
                <span className="meta-sans">CHAIN</span>
              </div>
              <div className="tx-th cell-hash">
                <span className="meta-sans">TX HASH</span>
              </div>
              <div className="tx-th cell-method">
                <span className="meta-sans">METHOD</span>
              </div>
              <div className="tx-th cell-route">
                <span className="meta-sans">COUNTERPARTY</span>
              </div>
              <div className="tx-th cell-amount">
                <span className="meta-sans">AMOUNT & FLOW</span>
              </div>
              <div className="tx-th cell-gas">
                <span className="meta-sans">GAS FEE</span>
              </div>
              <div className="tx-th cell-time">
                <span className="meta-sans">TIME</span>
              </div>
            </div>

            {/* Table Rows */}
            {loading ? (
              <div className="table-state-msg">
                <span className="mono">Loading real-time transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="table-state-msg">
                <span className="mono">No transactions matching current filter criteria.</span>
              </div>
            ) : (
              <div className="tx-table-body" role="rowgroup">
                {filteredTransactions.map((tx) => (
                  <TransactionRow
                    key={`${tx.chain}_${tx.id}_${tx.time_at}`}
                    item={tx}
                    tokenDict={tokenDict}
                    projectDict={projectDict}
                    onCopyText={handleCopy}
                    onFilterAddress={(addr) => setSearchQuery(addr)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Clipboard / Feedback Toast */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWallet={handleAddWallet}
      />
    </div>
  );
};

export default App;
