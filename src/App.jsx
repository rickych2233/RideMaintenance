import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RideChecklist from './components/RideChecklist';
import ActiveRide from './components/ActiveRide';
import VehicleManager from './components/VehicleManager';
import RideLogs from './components/RideLogs';
import MaintenanceTracker from './components/MaintenanceTracker';
import Login from './components/Login';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function App() {
  // Navigation State
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // States synchronized with Backend Database
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);

  // Client-side UI Preferences
  const [activeVehicleId, setActiveVehicleId] = useState(() => {
    const saved = localStorage.getItem('ridecheck_active_vehicle_id');
    return saved ? parseInt(saved) : null;
  });

  // Active Trip checklist transfer state
  const [currentSafetyCheck, setCurrentSafetyCheck] = useState(null);

  // Auth helper - attaches JWT to all requests
  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  };

  // Check stored token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('rideRecord_token');
    if (!savedToken) {
      setAuthChecked(true);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedToken}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(userData => {
        setUser(userData);
        setToken(savedToken);
      })
      .catch(() => {
        localStorage.removeItem('rideRecord_token');
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Fetch data when user is authenticated
  const fetchData = async () => {
    try {
      setLoading(true);

      const [vehiclesRes, logsRes, maintRes] = await Promise.all([
        authFetch(`${API_URL}/api/vehicles`),
        authFetch(`${API_URL}/api/logs`),
        authFetch(`${API_URL}/api/maintenance`)
      ]);

      if (!vehiclesRes.ok || !logsRes.ok || !maintRes.ok) {
        if (vehiclesRes.status === 401 || logsRes.status === 401 || maintRes.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to fetch data from API');
      }

      const vehiclesData = await vehiclesRes.json();
      const logsData = await logsRes.json();
      const maintData = await maintRes.json();

      setVehicles(vehiclesData);
      setLogs(logsData);
      setMaintenanceLogs(maintData);

      if (vehiclesData.length > 0) {
        const isValidActive = vehiclesData.some(v => v.id === activeVehicleId);
        if (!activeVehicleId || !isValidActive) {
          setActiveVehicleId(vehiclesData[0].id);
        }
      } else {
        setActiveVehicleId(null);
      }
    } catch (err) {
      console.error('Error fetching database records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) fetchData();
  }, [user, token]);

  // Save active vehicle preference
  useEffect(() => {
    if (activeVehicleId) {
      localStorage.setItem('ridecheck_active_vehicle_id', activeVehicleId.toString());
    } else {
      localStorage.removeItem('ridecheck_active_vehicle_id');
    }
  }, [activeVehicleId]);

  // Auth handlers
  const handleLogin = (userData, newToken) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('rideRecord_token', newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('rideRecord_token');
    localStorage.removeItem('ridecheck_active_vehicle_id');
    setUser(null);
    setToken(null);
    setVehicles([]);
    setLogs([]);
    setMaintenanceLogs([]);
    setView('dashboard');
  };

  // Handlers
  const handleAddVehicle = async (newVehicle) => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add vehicle');
      }
      const savedVehicle = await res.json();

      setVehicles(prev => [...prev, savedVehicle]);
      setActiveVehicleId(savedVehicle.id);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error registering vehicle in database.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete vehicle');

      setVehicles(prev => prev.filter(v => v.id !== id));
      if (activeVehicleId === id) {
        const remaining = vehicles.filter(v => v.id !== id);
        setActiveVehicleId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting vehicle from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartRideCheck = () => {
    setView('checklist');
  };

  const handleCompleteChecklist = (checkData) => {
    setCurrentSafetyCheck(checkData);
    setView('active_ride');
  };

  const handleEndRide = async (newTripLog, finalOdometer) => {
    try {
      setLoading(true);

      const logRes = await authFetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTripLog)
      });
      if (!logRes.ok) throw new Error('Failed to post trip log');
      const savedLog = await logRes.json();

      const odoRes = await authFetch(`${API_URL}/api/vehicles/${newTripLog.vehicleId}/odo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentOdometer: finalOdometer })
      });
      if (!odoRes.ok) throw new Error('Failed to update vehicle odometer');
      const updatedVehicle = await odoRes.json();

      setLogs(prev => [savedLog, ...prev]);
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));

      setView('logs');
      setCurrentSafetyCheck(null);
    } catch (err) {
      console.error(err);
      alert('Error saving ride data to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenanceLog = async (log) => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      if (!res.ok) throw new Error('Failed to add maintenance log');
      const savedLog = await res.json();

      setMaintenanceLogs(prev => [savedLog, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Error saving service record to database.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetVehicleServiceOdo = async (vehId, serviceOdo) => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/vehicles/${vehId}/odo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastServiceOdometer: serviceOdo })
      });
      if (!res.ok) throw new Error('Failed to reset service odometer');
      const updatedVehicle = await res.json();

      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    } catch (err) {
      console.error(err);
      alert('Error updating service odometer on server.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/api/logs`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear logs');
      setLogs([]);
    } catch (err) {
      console.error(err);
      alert('Error clearing history logs.');
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];

  // ─── AUTH GATE ───────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-dark)'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(0, 242, 254, 0.15)',
          borderTopColor: 'var(--cyan)',
          borderRadius: '50%',
          animation: 'rotateDial 1s linear infinite'
        }} />
        <span style={{ fontSize: '14px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--cyan)', fontWeight: 'bold' }}>
          INITIALIZING SYSTEM...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Login API_URL={API_URL} onLogin={handleLogin} />;
  }

  // ─── MAIN APP ────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Top Navbar Header */}
      <header className="navbar">
        <div className="logo-container" onClick={() => setView('dashboard')}>
          <div className="logo-icon">R</div>
          <span className="logo-text">RideMaintenance</span>
        </div>

        {/* Navigation links (Desktop) */}
        {view !== 'active_ride' && (
          <nav className="nav-links">
            <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
              Dashboard
            </button>
            <button className={`nav-item ${view === 'vehicles' ? 'active' : ''}`} onClick={() => setView('vehicles')}>
              Garage
            </button>
            <button className={`nav-item ${view === 'logs' ? 'active' : ''}`} onClick={() => setView('logs')}>
              History
            </button>
            <button className={`nav-item ${view === 'maintenance' ? 'active' : ''}`} onClick={() => setView('maintenance')}>
              Maintenance
            </button>
            <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
              Logout
            </button>
          </nav>
        )}
      </header>

      {/* Database loading overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(8, 11, 17, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(0, 242, 254, 0.15)',
              borderTopColor: 'var(--cyan)',
              borderRadius: '50%',
              animation: 'rotateDial 1s linear infinite'
            }}
          />
          <span style={{ fontSize: '14px', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', color: 'var(--cyan)', fontWeight: 'bold' }}>
            SYNCING TELEMETRY DATA...
          </span>
        </div>
      )}

      {/* Main Panel Content Render Area */}
      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            vehicles={vehicles}
            logs={logs}
            activeVehicleId={activeVehicleId}
            setActiveVehicleId={setActiveVehicleId}
            setView={setView}
            onStartRideCheck={handleStartRideCheck}
          />
        )}
        {view === 'checklist' && (
          <RideChecklist
            vehicle={selectedVehicle}
            onComplete={handleCompleteChecklist}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'active_ride' && (
          <ActiveRide
            vehicle={selectedVehicle}
            safetyCheckData={currentSafetyCheck}
            onEndRide={handleEndRide}
          />
        )}
        {view === 'vehicles' && (
          <VehicleManager
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            activeVehicleId={activeVehicleId}
            setActiveVehicleId={setActiveVehicleId}
          />
        )}
        {view === 'logs' && (
          <RideLogs
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}
        {view === 'maintenance' && (
          <MaintenanceTracker
            vehicles={vehicles}
            maintenanceLogs={maintenanceLogs}
            onAddMaintenanceLog={handleAddMaintenanceLog}
            onResetVehicleServiceOdo={handleResetVehicleServiceOdo}
          />
        )}
      </main>

      {/* Bottom Navigation (Mobile Viewports only) */}
      {view !== 'active_ride' && (
        <div className="bottom-nav">
          <button className={`bottom-nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Home</span>
          </button>

          <button className={`bottom-nav-item ${view === 'vehicles' ? 'active' : ''}`} onClick={() => setView('vehicles')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125v-3.07M14.25 18.75H8.25m6-10.5V6a2.25 2.25 0 0 0-2.25-2.25h-1.5A2.25 2.25 0 0 0 8.25 6v2.25M3 14.25c0-1.243 1.007-2.25 2.25-2.25h13.5c1.243 0 2.25 1.007 2.25 2.25v2.25H3v-2.25Z" />
            </svg>
            <span>Garage</span>
          </button>

          <button className={`bottom-nav-item ${view === 'logs' ? 'active' : ''}`} onClick={() => setView('logs')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 2.24c-.407-.03-.815-.071-1.222-.121L4 5.07M4 19.5A2.25 2.25 0 0 1 1.75 17.25V6.75A2.25 2.25 0 0 1 4 4.5h1.221M4 19.5H18a2.25 2.25 0 0 0 2.25-2.25v-2.25H4v2.25Z" />
            </svg>
            <span>History</span>
          </button>

          <button className={`bottom-nav-item ${view === 'maintenance' ? 'active' : ''}`} onClick={() => setView('maintenance')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A1.75 1.75 0 1 0 20 18.25l-5.83-5.83M11.42 15.17l-4.66-4.66m4.66 4.66 4.66-4.66m-4.66 4.66V21m0-5.83V9.17m0 0L17.25 3A1.75 1.75 0 0 0 14.5.25l-5.83 5.83m3.17 3.09-4.66-4.66m4.66 4.66-4.66 4.66M6.76 10.51 1 16.25A1.75 1.75 0 1 0 3.75 19l5.83-5.83" />
            </svg>
            <span>Service</span>
          </button>

          <button className="bottom-nav-item" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
