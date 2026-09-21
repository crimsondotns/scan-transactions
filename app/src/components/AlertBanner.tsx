import React from 'react';
import './AlertBanner.css';

export interface AlertData {
  id: string;
  type: 'gas' | 'balance' | 'suspicious';
  title: string;
  message: string;
}

interface AlertBannerProps {
  alerts: AlertData[];
  onDismiss?: (id: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="alerts-container">
      {alerts.map((alert) => {
        let typeClass = 'alert-gas';
        let iconSvg = (
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 22h12" />
            <path d="M4 9h10" />
            <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
            <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
          </svg>
        );

        if (alert.type === 'balance') {
          typeClass = 'alert-balance';
          iconSvg = (
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          );
        } else if (alert.type === 'suspicious') {
          typeClass = 'alert-suspicious';
          iconSvg = (
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          );
        }

        return (
          <div key={alert.id} className={`alert-card ${typeClass}`} role="alert">
            {iconSvg}
            <div className="alert-content">
              <strong className="alert-title">{alert.title}: </strong>
              <span className="alert-message">{alert.message}</span>
            </div>
            {onDismiss && (
              <button
                className="alert-dismiss"
                onClick={() => onDismiss(alert.id)}
                aria-label="Dismiss alert"
              >
                &times;
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
