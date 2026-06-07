import React from 'react';

export default function RideLogs({ logs, onClearLogs }) {
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all your ride history? This cannot be undone.')) {
      onClearLogs();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px' }}>Trip History Logs</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analyze your driving logs and safety checklist compliance.</p>
        </div>
        {logs.length > 0 && (
          <button className="btn btn-secondary" style={{ borderColor: 'var(--red)', color: 'var(--red)' }} onClick={handleClear}>
            ⚠️ Clear All Logs
          </button>
        )}
      </div>

      <div className="glass-panel">
        {logs.length > 0 ? (
          <div className="logs-list">
            {logs.map((log, index) => {
              const isPerfectSafety = log.safetyScore === 100;
              const hasAlerts = log.safetyAlerts && log.safetyAlerts !== 'None';
              
              return (
                <div 
                  key={index} 
                  className="log-item"
                  style={{ 
                    borderBottom: index < logs.length - 1 ? '1px solid var(--border-color)' : 'none',
                    paddingBottom: index < logs.length - 1 ? '16px' : '0',
                    paddingTop: index > 0 ? '16px' : '0'
                  }}
                >
                  <div className="log-item-left">
                    <span className="log-item-type">
                      {log.vehicleName?.toLowerCase().includes('car') ? '🚗' : '🏍️'}
                    </span>
                    <div className="log-item-details">
                      <h4 className="log-item-title">{log.vehicleName}</h4>
                      <p className="log-item-sub">
                        <span>📅 {log.date}</span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>⏱ {log.duration} mins</span>
                        <span style={{ margin: '0 8px' }}>•</span>
                        <span>Odo: {log.startOdometer} → {log.endOdometer} km</span>
                      </p>
                      {log.notes && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                          " {log.notes} "
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="log-item-right">
                    <span className="log-item-distance">+{log.distance} km</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className={`safety-badge ${isPerfectSafety ? 'pass' : 'warn'}`}>
                        🛡️ Safety: {log.safetyScore}%
                      </span>
                      {hasAlerts && (
                        <span className="safety-badge warn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                          🚨 SOS Triggered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-muted)' }}>No ride logs recorded yet. Start a ride check-in to generate logs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
