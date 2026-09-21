import React from 'react';
import './FilterBar.css';

interface FilterBarProps {
  chains: string[];
  selectedChain: string;
  onSelectChain: (chain: string) => void;
  statusFilter: 'all' | 'success' | 'failed' | 'pending';
  onSelectStatus: (status: 'all' | 'success' | 'failed' | 'pending') => void;
  dateRange: '1h' | '24h' | '7d' | '30d';
  onSelectDateRange: (range: '1h' | '24h' | '7d' | '30d') => void;
  hideSpam: boolean;
  onToggleHideSpam: (val: boolean) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  chainCounts?: Record<string, number>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  chains,
  selectedChain,
  onSelectChain,
  statusFilter,
  onSelectStatus,
  dateRange,
  onSelectDateRange,
  hideSpam,
  onToggleHideSpam,
  searchQuery,
  onSearchChange,
  chainCounts = {},
}) => {
  return (
    <div className="filter-bar-container">
      {/* Top Filter Row: Chain selection pills + Spam switch */}
      <div className="fb-top-row">
        <div className="chain-pill-strip" role="tablist" aria-label="Filter by Blockchain">
          <button
            className={`chain-pill ${selectedChain === 'all' ? 'active' : ''}`}
            onClick={() => onSelectChain('all')}
            role="tab"
            aria-selected={selectedChain === 'all'}
          >
            <span>All Chains</span>
            {chainCounts['all'] !== undefined && (
              <span className="chain-count">{chainCounts['all']}</span>
            )}
          </button>
          {chains.map((chain) => (
            <button
              key={chain}
              className={`chain-pill ${selectedChain === chain ? 'active' : ''}`}
              onClick={() => onSelectChain(chain)}
              role="tab"
              aria-selected={selectedChain === chain}
            >
              <span>{chain.toUpperCase()}</span>
              {chainCounts[chain] !== undefined && (
                <span className="chain-count">{chainCounts[chain]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Spam Filter Switch */}
        <label className="spam-switch-label">
          <input
            type="checkbox"
            className="spam-checkbox"
            checked={hideSpam}
            onChange={(e) => onToggleHideSpam(e.target.checked)}
            role="switch"
            aria-checked={hideSpam}
          />
          <span className="spam-slider"></span>
          <span className="spam-text">Hide Spam / Poisoning</span>
        </label>
      </div>

      {/* Bottom Filter Row: Search, Date Preset, and Status Multi-select */}
      <div className="fb-bottom-row">
        <div className="search-input-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search address, tx hash, or token..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        {/* Date Presets */}
        <div className="segmented-group" role="group" aria-label="Date Range">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              className={`seg-btn ${dateRange === range ? 'active' : ''}`}
              onClick={() => onSelectDateRange(range)}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="status-pill-group" role="group" aria-label="Transaction Status">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'success', label: 'Success' },
              { id: 'failed', label: 'Failed' },
              { id: 'pending', label: 'Pending' },
            ] as const
          ).map((st) => (
            <button
              key={st.id}
              className={`status-btn ${statusFilter === st.id ? 'active' : ''}`}
              onClick={() => onSelectStatus(st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
