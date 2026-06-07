import React, { useState, useEffect, useRef } from 'react';

export default function ActiveRide({ vehicle, safetyCheckData, onEndRide }) {
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Safety Anomaly States
  const [anomalyType, setAnomalyType] = useState(null); // 'stop', 'crash', or null
  const [countdown, setCountdown] = useState(15);
  const [safetyStatus, setSafetyStatus] = useState('Active'); // 'Active', 'Resolving', 'Alerted', 'Safe'

  const timerRef = useRef(null);
  const speedRef = useRef(null);
  const countdownRef = useRef(null);
  
  // Map points simulation
  const [routePoints, setRoutePoints] = useState([{ x: 100, y: 300 }]);
  const [currentPos, setCurrentPos] = useState({ x: 100, y: 300 });

  // Running Timer & Speed Accumulator
  useEffect(() => {
    if (!isPaused && safetyStatus !== 'Alerted') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      speedRef.current = setInterval(() => {
        // Generate random speed fluctuations between 45 and 85 km/h
        const targetSpeed = Math.floor(Math.random() * 40) + 45;
        setSpeed(targetSpeed);
        
        // Accumulate distance: Speed (km/h) / 3600 = distance per second in km
        setDistance(prev => prev + (targetSpeed / 3600));

        // Progressively draw route on simulated map
        setCurrentPos(prev => {
          const angle = (elapsedTime * 0.1) % (2 * Math.PI);
          const nextX = prev.x + Math.cos(angle) * 5 + (Math.random() - 0.5) * 2;
          const nextY = prev.y + Math.sin(angle) * 3 + (Math.random() - 0.5) * 2;
          
          // Constrain within map bounds
          const constrainedX = Math.max(20, Math.min(480, nextX));
          const constrainedY = Math.max(20, Math.min(330, nextY));

          const newPoint = { x: constrainedX, y: constrainedY };
          setRoutePoints(pts => [...pts.slice(-30), newPoint]); // Keep last 30 points
          return newPoint;
        });

      }, 1000);
    }

    return () => {
      clearInterval(timerRef.current);
      clearInterval(speedRef.current);
    };
  }, [isPaused, safetyStatus, elapsedTime]);

  // Safety Anomaly Alert Countdown Timer
  useEffect(() => {
    if (anomalyType && countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setSafetyStatus('Alerted');
            setSpeed(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(countdownRef.current);
  }, [anomalyType, countdown]);

  const handleTriggerAnomaly = (type) => {
    if (anomalyType) return; // already in anomaly flow
    setSpeed(0);
    setAnomalyType(type);
    setCountdown(15);
    setSafetyStatus('Resolving');
  };

  const handleResolveAnomaly = () => {
    clearInterval(countdownRef.current);
    setAnomalyType(null);
    setSafetyStatus('Active');
    setCountdown(15);
  };

  const handleTriggerSOS = () => {
    clearInterval(countdownRef.current);
    setSafetyStatus('Alerted');
    setSpeed(0);
    setCountdown(0);
  };

  const handleEndRide = () => {
    const finalDistance = parseFloat(distance.toFixed(2));
    const durationMinutes = Math.max(1, Math.round(elapsedTime / 60));
    const endOdometer = vehicle.currentOdometer + Math.round(finalDistance);
    
    onEndRide({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      date: new Date().toLocaleDateString(),
      distance: finalDistance,
      duration: durationMinutes,
      startOdometer: vehicle.currentOdometer,
      endOdometer: endOdometer,
      safetyScore: safetyCheckData?.safetyScore || 100,
      safetyAlerts: safetyStatus === 'Alerted' ? 'Emergency Triggered' : 'None',
      notes: safetyCheckData?.checklistNotes || ''
    }, endOdometer);
  };

  // Format Elapsed Time (hh:mm:ss)
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? h : null,
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: safetyStatus === 'Alerted' ? 'var(--red)' : 'var(--border-color)' }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--cyan)' }}>LIVE RECORDING ACTIVE</span>
          <h2 style={{ fontSize: '24px', marginTop: '2px' }}>{vehicle.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {safetyStatus === 'Active' && (
            <button className="btn btn-secondary" onClick={() => setIsPaused(!isPaused)}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button className="btn btn-danger" onClick={handleEndRide}>
            🏁 End Trip
          </button>
        </div>
      </div>

      {/* Safety Alert Panel */}
      {anomalyType && (
        <div className="anomaly-alert-card">
          <div className="anomaly-alert-header">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" width="32" height="32">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
            <h3 className="anomaly-alert-title">
              {anomalyType === 'stop' ? 'RideCheck: Unexpected Long Stop' : 'RideCheck: Crash Anomaly Detected'}
            </h3>
          </div>
          <p className="anomaly-alert-desc">
            We noticed this trip stopped unexpectedly. If you have been in an accident or need help, you can contact emergency services immediately. If everything is fine, please tap "I'm OK" to dismiss.
          </p>

          {safetyStatus === 'Resolving' && (
            <>
              <div className="anomaly-countdown">
                AUTOMATIC SOS DISPATCH IN: {countdown}s
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={handleResolveAnomaly}>
                  👍 I'm OK
                </button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleTriggerSOS}>
                  ⚠️ Emergency SOS (911)
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Emergency dispatch triggered */}
      {safetyStatus === 'Alerted' && (
        <div className="anomaly-alert-card" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
          <div className="anomaly-alert-header">
            <h3 className="anomaly-alert-title">🚨 Emergency Services Alerted</h3>
          </div>
          <p className="anomaly-alert-desc">
            An SOS alert has been triggered for your ride session. Safety responders have been notified with your current coordinates. Please stay where you are or contact authorities directly.
          </p>
          <button className="btn btn-success" onClick={handleResolveAnomaly}>
            Cancel Emergency / I am Safe Now
          </button>
        </div>
      )}

      {/* Main Stats Layout */}
      <div className="active-ride-layout">
        
        {/* Speed & Stats */}
        <div className="active-ride-stats">
          
          {/* Speedometer panel */}
          <div className="glass-panel speedometer-container">
            <div className="speed-dial" style={{ transform: `rotate(${speed * 2}deg)` }}>
              {/* Spinning speed marker helper */}
            </div>
            <div className="speed-value-display">
              <span className="speed-number">{speed}</span>
              <span className="speed-unit">km/h</span>
            </div>
          </div>

          {/* Detailed stats widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="glass-panel" style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Distance Logged</span>
              <h3 style={{ fontSize: '28px', color: 'var(--cyan)', marginTop: '4px' }}>
                {distance.toFixed(2)} <span style={{ fontSize: '16px' }}>km</span>
              </h3>
            </div>
            <div className="glass-panel" style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Elapsed Duration</span>
              <h3 style={{ fontSize: '28px', color: 'var(--violet)', marginTop: '4px' }}>
                {formatTime(elapsedTime)}
              </h3>
            </div>
          </div>
        </div>

        {/* Live Map Panel & Safety Controllers */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>Live Ride Telemetry</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Safety score baseline: {safetyCheckData?.safetyScore || 100}%</p>
          </div>

          {/* Map Simulation */}
          <div className="simulated-map">
            <div className="simulated-map-grid" />
            
            {/* Draw Simulated Line */}
            <svg className="simulated-route-line">
              {routePoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--cyan)"
                  strokeWidth="3"
                  strokeDasharray="4"
                  points={routePoints.map(p => `${p.x},${p.y}`).join(' ')}
                />
              )}
            </svg>

            {/* Start point marker */}
            <div className="map-start-marker" style={{ left: `${routePoints[0]?.x}px`, top: `${routePoints[0]?.y}px` }} />

            {/* Vehicle live marker */}
            <div className="map-marker" style={{ left: `${currentPos.x}px`, top: `${currentPos.y}px` }} />

            {/* Map Telemetry Label overlay */}
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px' }}>
              GPS Locked • Alt: 245m
            </div>

            {/* Interactive Safety Simulator Trigger Triggers */}
            <div className="map-control-overlay">
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(17, 24, 39, 0.9)' }}
                onClick={() => handleTriggerAnomaly('stop')}
                disabled={safetyStatus !== 'Active'}
              >
                ⚠️ Test Long Stop
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(17, 24, 39, 0.9)' }}
                onClick={() => handleTriggerAnomaly('crash')}
                disabled={safetyStatus !== 'Active'}
              >
                💥 Test Crash Alert
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
