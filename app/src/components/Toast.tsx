import React from 'react';
import './Toast.css';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast-card">
        <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose} aria-label="Close notification">
          &times;
        </button>
      </div>
    </div>
  );
};
