import React, { useState } from 'react';

export default function MaintenanceTracker({ 
  vehicles, 
  maintenanceLogs, 
  onAddMaintenanceLog, 
  onResetVehicleServiceOdo 
}) {
  const [showLogModal, setShowLogModal] = useState(false);

  // Form State
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState('Oil Change');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedVehicleId = parseInt(vehicleId);
    const selectedVehicle = vehicles.find(v => v.id === parsedVehicleId);

    if (!selectedVehicle) {
      alert('Please select a valid vehicle.');
      return;
    }
    if (!odometer) {
      alert('Please input the service odometer reading.');
      return;
    }

    const odoValue = parseInt(odometer);

    // Create Maintenance Log
    const newLog = {
      id: Date.now(),
      vehicleId: parsedVehicleId,
      vehicleName: selectedVehicle.name,
      serviceType,
      date,
      odometer: odoValue,
      cost: parseFloat(cost || 0),
      notes
    };

    onAddMaintenanceLog(newLog);
    onResetVehicleServiceOdo(parsedVehicleId, odoValue);
    
    // Close Modal and Reset Form
    setShowLogModal(false);
    setOdometer('');
    setCost('');
    setNotes('');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px' }}>Maintenance Tracker</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Monitor vehicle service lifespans and track expense costs.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            if (vehicles.length === 0) {
              alert('Please register a vehicle in the Garage first.');
              return;
            }
            setVehicleId(vehicles[0].id);
            setShowLogModal(true);
          }}
          disabled={vehicles.length === 0}
        >
          🔧 Log Service Maintenance
        </button>
      </div>

      {/* Vehicles Service Status */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Service Reminders</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {vehicles.map(v => {
          const kmSinceLast = v.currentOdometer - v.lastServiceOdometer;
          const kmRemaining = v.serviceInterval - kmSinceLast;
          const percent = Math.min(100, Math.max(0, (kmSinceLast / v.serviceInterval) * 100));
          
          let colorClass = '';
          let statusText = 'Good';
          if (kmRemaining <= 300) {
            colorClass = 'danger';
            statusText = 'Service Overdue!';
          } else if (kmRemaining <= 800) {
            colorClass = 'warn';
            statusText = 'Service Due Soon';
          }

          return (
            <div key={v.id} className="maintenance-card glass-panel">
              <div className="maintenance-header">
                <div>
                  <h4 style={{ fontSize: '16px' }}>{v.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Last service at: {v.lastServiceOdometer} km
                  </span>
                </div>
                <span 
                  className={`safety-badge ${colorClass === 'danger' ? 'warn' : 'pass'}`}
                  style={{ 
                    borderColor: colorClass === 'danger' ? 'var(--red)' : colorClass === 'warn' ? 'var(--amber)' : 'var(--emerald)',
                    color: colorClass === 'danger' ? 'var(--red)' : colorClass === 'warn' ? 'var(--amber)' : 'var(--emerald)'
                  }}
                >
                  {statusText}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span>Usage: {kmSinceLast} km elapsed</span>
                  <span>Interval: {v.serviceInterval} km</span>
                </div>
                <div className="maintenance-progress-bar">
                  <div 
                    className={`maintenance-progress-fill ${colorClass}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', marginTop: '6px', color: kmRemaining <= 300 ? 'var(--red)' : 'var(--text-muted)' }}>
                  {kmRemaining > 0 ? `${kmRemaining} km remaining` : `${Math.abs(kmRemaining)} km overdue!`}
                </div>
              </div>
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '32px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ color: 'var(--text-muted)' }}>No vehicles in the garage to track. Please add a vehicle first.</p>
          </div>
        )}
      </div>

      {/* Maintenance Logs Table */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Service Logs</h3>
      <div className="glass-panel" style={{ padding: '0 24px' }}>
        {maintenanceLogs.length > 0 ? (
          <div className="logs-list">
            {maintenanceLogs.map((log, index) => (
              <div 
                key={log.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 0',
                  borderBottom: index < maintenanceLogs.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{log.serviceType}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>🚗 {log.vehicleName}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>📅 {log.date}</span>
                    <span style={{ margin: '0 8px' }}>•</span>
                    <span>Odometer: {log.odometer} km</span>
                  </p>
                  {log.notes && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                      Notes: {log.notes}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontWeight: '700', color: 'var(--cyan)' }}>
                  Rp {log.cost.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-muted)' }}>No maintenance service logs recorded yet.</p>
          </div>
        )}
      </div>

      {/* Log Maintenance Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Log Service</h3>
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label">Select Vehicle *</label>
                <select 
                  className="form-control"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select 
                    className="form-control"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    <option value="Oil Change">🛢️ Oil Change</option>
                    <option value="Tire Replacement">🛞 Tire Replacement</option>
                    <option value="Brake Service">🛑 Brake Service</option>
                    <option value="General Tune-up">🔧 General Tune-up</option>
                    <option value="Chain Adjustment">⛓️ Chain Adjustment</option>
                    <option value="Air Filter">💨 Air Filter</option>
                    <option value="Other">📝 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Date *</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Odometer (km) *</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="Odometer at service"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Service Cost (IDR)</label>
                  <input 
                    type="number" 
                    className="form-control"
                    placeholder="Total service cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Service Details / Notes</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  placeholder="Items replaced, mechanic name, parts used..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLogModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Service Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
