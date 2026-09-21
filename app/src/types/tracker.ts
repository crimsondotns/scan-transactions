export interface TokenInfo {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  optimized_symbol?: string;
  decimals?: number;
  logo_url?: string | null;
  price?: number | null;
  price_24h_change?: number | null;
  is_scam?: boolean | null;
  is_suspicious?: boolean | null;
}

export interface ProjectInfo {
  id: string;
  chain: string;
  name: string;
  site_url?: string;
  logo_url?: string | null;
}

export interface TxTransfer {
  amount: number;
  price?: number | null;
  token_id: string;
  from_addr?: string;
  to_addr?: string;
}

export interface RawHistoryItem {
  id: string;
  chain: string;
  time_at: number;
  is_scam?: boolean;
  other_addr?: string;
  project_id?: string | null;
  token_approve?: {
    spender: string;
    token_id: string;
    value: number;
  } | null;
  receives: TxTransfer[];
  sends: TxTransfer[];
  tx?: {
    id: string;
    name?: string;
    status: number;
    from_addr?: string;
    to_addr?: string;
    usd_gas_fee?: number;
    eth_gas_fee?: number;
    value?: number;
  };
}

export interface HistoryFeedResponse {
  history_list: RawHistoryItem[];
  project_dict: Record<string, ProjectInfo>;
  token_dict: Record<string, TokenInfo>;
  cate_dict: Record<string, { id: string; name: string }>;
}

export interface TrackedWallet {
  id: string;
  address: string;
  nickname: string;
  balanceUsd: number;
  change24h: number;
  activeTxCount: number;
  lastActive: string;
  chains: string[];
}
