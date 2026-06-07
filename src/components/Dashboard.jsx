import React, { useState, useEffect } from 'react';

export default function Dashboard({
  vehicles,
  logs,
  activeVehicleId,
  setActiveVehicleId,
  setView,
  onStartRideCheck,
  API_URL,
  token
}) {

  const [oilStatus, setOilStatus] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/maintenance/oil-status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setOilStatus(data))
      .catch(() => {});
  }, [vehicles, logs, token]);
  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];

  // Calculate statistics
  const totalDistance = logs.reduce((sum, log) => sum + parseFloat(log.distance || 0), 0);
  const totalRides = logs.length;
  
  // Calculate average safety score
  const logsWithSafety = logs.filter(log => log.safetyScore !== undefined);
  const avgSafetyScore = logsWithSafety.length > 0 
    ? Math.round(logsWithSafety.reduce((sum, log) => sum + log.safetyScore, 0) / logsWithSafety.length)
    : 100;

  // Next service calculations
  const serviceWarnings = vehicles.filter(v => {
    const kmSinceLast = v.currentOdometer - v.lastServiceOdometer;
    return (v.serviceInterval - kmSinceLast) <= 500; // Warning if within 500 km
  });

  // 7-day simulated distance graph data
  const chartData = [12, 24, 8, 45, 18, 30, totalRides > 0 ? Math.round(totalDistance / totalRides) : 15];
  const maxVal = Math.max(...chartData, 50);
  
  // SVG Chart path calculation
  const chartWidth = 500;
  const chartHeight = 150;
  const padding = 20;
  const points = chartData.map((val, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (chartData.length - 1);
    const y = chartHeight - padding - (val / maxVal) * (chartHeight - padding * 2);
    return { x, y };
  });
  
  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length-1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`
    : '';

  const handleVehicleChange = (e) => {
    const val = parseInt(e.target.value);
    setActiveVehicleId(val);
  };

  return (
    <div className="dashboard-view">
      {/* Vehicle Quick Selector */}
      <div className="vehicle-selector-bar">
        <div className="selected-vehicle-display">
          <span className="vehicle-badge-icon">
            {activeVehicle?.type === 'motorcycle' ? '🏍️' : activeVehicle?.type === 'car' ? '🚗' : '🚲'}
          </span>
          <div>
            <h4 style={{ margin: 0 }}>{activeVehicle?.name || 'No Vehicle Added'}</h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Active Vehicle • Odometer: {activeVehicle?.currentOdometer || 0} km
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            className="form-control" 
            style={{ width: '180px', padding: '8px 12px' }}
            value={activeVehicleId || ''}
            onChange={handleVehicleChange}
          >
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={() => setView('vehicles')}>
            Manage
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-row">
        <div className="glass-panel stat-card glow-cyan">
          <div className="stat-icon cyan">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalRides}</span>
            <span className="stat-label">Total Rides Logged</span>
          </div>
        </div>

        <div className="glass-panel stat-card glow-violet">
          <div className="stat-icon violet">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446 1.202-8.302a2.25 2.25 0 0 0-2.011-2.56h-1.16a2.25 2.25 0 0 0-2.235 2.507l1.253 9c.115.83.837 1.443 1.674 1.443h.36c.837 0 1.559-.613 1.674-1.443Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 21V5.25A2.25 2.25 0 0 0 16.5 3h-9A2.25 2.25 0 0 0 5.25 5.25V21" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalDistance.toFixed(1)} km</span>
            <span className="stat-label">Total Distance</span>
          </div>
        </div>

        <div className="glass-panel stat-card glow-emerald">
          <div className="stat-icon emerald">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgSafetyScore}%</span>
            <span className="stat-label">Safety Rating</span>
          </div>
        </div>

        <div className="glass-panel stat-card glow-cyan">
          <div className="stat-icon amber">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A1.75 1.75 0 1 0 20 18.25l-5.83-5.83M11.42 15.17l-4.66-4.66m4.66 4.66 4.66-4.66m-4.66 4.66V21m0-5.83V9.17m0 0L17.25 3A1.75 1.75 0 0 0 14.5.25l-5.83 5.83m3.17 3.09-4.66-4.66m4.66 4.66-4.66 4.66M6.76 10.51 1 16.25A1.75 1.75 0 1 0 3.75 19l5.83-5.83" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{serviceWarnings.length} Alerts</span>
            <span className="stat-label">Maintenance Due</span>
          </div>
        </div>
      </div>

      {/* Oil Change Alarm */}
      {oilStatus.filter(o => o.status !== 'ok').length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {oilStatus.filter(o => o.status !== 'ok').map(o => (
            <div
              key={o.vehicleId}
              style={{
                border: `1px solid ${o.status === 'overdue' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`,
                background: o.status === 'overdue'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(239, 68, 68, 0.04))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04))',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                animation: o.status === 'overdue' ? 'pulseRedBorder 2s ease-in-out infinite' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: o.status === 'overdue' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0
                }}>
                  🛢️
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: o.status === 'overdue' ? 'var(--red)' : 'var(--amber)' }}>
                    {o.status === 'overdue' ? 'OVERDUE — Oil Change Required!' : 'Oil Change Due Soon'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {o.vehicleName} • {o.status === 'overdue'
                      ? `Overdue by ${Math.abs(o.remainingKm)} km`
                      : `${o.remainingKm} km remaining`
                    }
                    {o.lastOilChangeDate && ` • Last changed: ${o.lastOilChangeDate}`}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}
                onClick={() => setView('maintenance')}
              >
                Log Oil Change
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        {/* Left Column: Action & Telemery Chart */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>Ready to Roll?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Perform a quick Pre-Ride safety check before heading out.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', fontSize: '16px' }}
            onClick={onStartRideCheck}
            disabled={!activeVehicle}
          >
            ⚡ Start Pre-Ride Checklist
          </button>

          {/* SVG Line Graph */}
          <div style={{ marginTop: '10px' }}>
            <h4 style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Telemetry • Distance Analytics (Last 7 Sessions)
            </h4>
            <div style={{ position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                {/* Horizontal Guide Lines */}
                <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="3" />
                <line x1={padding} y1={chartHeight/2} x2={chartWidth - padding} y2={chartHeight/2} stroke="var(--border-color)" strokeDasharray="3" />
                <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-color)" strokeDasharray="3" />
                
                {/* Graph Path Area */}
                {points.length > 0 && (
                  <>
                    <path d={areaD} fill="url(#chartGradient)" />
                    <path d={pathD} fill="none" stroke="var(--cyan)" strokeWidth="3" />
                    {/* Points dots */}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="5" fill="#080b11" stroke="var(--violet)" strokeWidth="2" />
                    ))}
                  </>
                )}
              </svg>
              {/* X Axis Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px 0 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Maintenance & Active Vehicle Details */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Vehicle Status Warnings</h3>
            {serviceWarnings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {serviceWarnings.map(v => {
                  const kmSinceLast = v.currentOdometer - v.lastServiceOdometer;
                  const kmRemaining = v.serviceInterval - kmSinceLast;
                  return (
                    <div 
                      key={v.id} 
                      style={{ 
                        border: '1px solid rgba(245, 158, 11, 0.4)', 
                        background: 'rgba(245, 158, 11, 0.05)', 
                        padding: '12px', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                        <span>⚠️ {v.name}</span>
                        <span style={{ color: 'var(--amber)' }}>Due in {kmRemaining} km</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Odometer: {v.currentOdometer} km (Interval: {v.serviceInterval} km)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ color: 'var(--emerald)', fontWeight: '600', marginBottom: '4px' }}>✓ All Systems Operational</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No pending service warnings detected.</p>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Quick Details</h3>
            {activeVehicle ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>License Plate</span>
                  <p style={{ fontWeight: '600', fontFamily: 'var(--font-display)' }}>{activeVehicle.licensePlate || 'N/A'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Make / Model</span>
                  <p style={{ fontWeight: '600' }}>{activeVehicle.brand} {activeVehicle.model}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tank Capacity</span>
                  <p style={{ fontWeight: '600' }}>{activeVehicle.tankCapacity || 'N/A'} Liters</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Inspection Rating</span>
                  <p style={{ fontWeight: '600', color: 'var(--emerald)' }}>Passed</p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Please add a vehicle to view status details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
