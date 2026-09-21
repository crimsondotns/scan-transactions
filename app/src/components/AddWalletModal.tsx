import React, { useState } from 'react';
import './AddWalletModal.css';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWallet: (address: string, nickname: string) => void;
}

export const AddWalletModal: React.FC<AddWalletModalProps> = ({
  isOpen,
  onClose,
  onAddWallet,
}) => {
  const [address, setAddress] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddr = address.trim();
    if (!cleanAddr) {
      setError('Please enter a wallet address');
      return;
    }
    if (!cleanAddr.startsWith('0x') || cleanAddr.length < 10) {
      setError('Invalid address format (expected 0x...)');
      return;
    }
    onAddWallet(cleanAddr, nickname.trim() || 'Tracked Wallet');
    setAddress('');
    setNickname('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="heading-title">Add Tracked Wallet</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-field">
            <label className="meta-sans form-label">Wallet Address or ENS</label>
            <input
              type="text"
              className="mono modal-input"
              placeholder="0x..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
            {error && <span className="form-error">{error}</span>}
          </div>

          <div className="form-field">
            <label className="meta-sans form-label">Label / Nickname (Optional)</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Treasury Vault, Whale Watch"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!address.trim()}>
              Add Wallet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
