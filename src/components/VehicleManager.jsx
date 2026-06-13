import React, { useState } from 'react';

export default function VehicleManager({ 
  vehicles, 
  onAddVehicle, 
  onDeleteVehicle, 
  onUpdateVehicle,
  activeVehicleId, 
  setActiveVehicleId 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('motorcycle');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [odometer, setOdometer] = useState(0);
  const [tankCapacity, setTankCapacity] = useState(10);
  const [serviceInterval, setServiceInterval] = useState(3000);
  const [oilInterval, setOilInterval] = useState(2000);
  const [oilReminderFrequency, setOilReminderFrequency] = useState('weekly');
  const [stnkExpiryDate, setStnkExpiryDate] = useState('');

  const openEditModal = (vehicle) => {
    setEditVehicleId(vehicle.id);
    setName(vehicle.name);
    setType(vehicle.type);
    setBrand(vehicle.brand);
    setModel(vehicle.model);
    setLicensePlate(vehicle.licensePlate || '');
    setOdometer(vehicle.currentOdometer);
    setTankCapacity(vehicle.tankCapacity);
    setServiceInterval(vehicle.serviceInterval);
    setOilInterval(vehicle.oilInterval || 2000);
    setOilReminderFrequency(vehicle.oilReminderFrequency || 'weekly');
    setStnkExpiryDate(vehicle.stnkExpiryDate || '');
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditVehicleId(null);
    setName('');
    setType('motorcycle');
    setBrand('');
    setModel('');
    setLicensePlate('');
    setOdometer(0);
    setTankCapacity(10);
    setServiceInterval(3000);
    setOilInterval(2000);
    setOilReminderFrequency('weekly');
    setStnkExpiryDate('');
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !brand || !model) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editVehicleId) {
      onUpdateVehicle(editVehicleId, {
        name,
        type,
        brand,
        model,
        licensePlate,
        tankCapacity: parseFloat(tankCapacity || 10),
        serviceInterval: parseInt(serviceInterval || 3000),
        oilInterval: parseInt(oilInterval || 2000),
        oilReminderFrequency,
        stnkExpiryDate
      });
    } else {
      const newVehicle = {
        id: Date.now(),
        name,
        type,
        brand,
        model,
        licensePlate,
        currentOdometer: parseInt(odometer || 0),
        lastServiceOdometer: parseInt(odometer || 0),
        tankCapacity: parseFloat(tankCapacity || 10),
        serviceInterval: parseInt(serviceInterval || 3000),
        oilInterval: parseInt(oilInterval || 2000),
        oilReminderFrequency,
        stnkExpiryDate
      };
      onAddVehicle(newVehicle);
    }

    setShowAddModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>Vehicle Garage</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Add and manage your fleet of vehicles. ({vehicles.length}/3 slots used)
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openAddModal}
          disabled={vehicles.length >= 3}
          style={vehicles.length >= 3 ? { opacity: 0.5, cursor: 'not-allowed', fontSize: '13px', padding: '10px 14px' } : { fontSize: '13px', padding: '10px 14px' }}
        >
          {vehicles.length >= 3 ? 'Garage Full (3/3)' : '+ Add Vehicle'}
        </button>
      </div>

      {/* Grid of Vehicles */}
      <div className="vehicle-grid">
        {vehicles.map(v => {
          const isActive = v.id === activeVehicleId;
          const serviceDue = v.serviceInterval - (v.currentOdometer - v.lastServiceOdometer);
          const needsService = serviceDue <= 300;

          return (
            <div 
              key={v.id} 
              className={`glass-panel vehicle-card ${isActive ? 'active' : ''}`}
            >
              <div className="vehicle-card-header">
                <div className="vehicle-info">
                  <span style={{ fontSize: '24px' }}>
                    {v.type === 'motorcycle' ? '🏍️' : v.type === 'car' ? '🚗' : '🚲'}
                  </span>
                  <h3 className="vehicle-name">{v.name}</h3>
                  <span className="vehicle-plate">{v.licensePlate || 'NO PLATE'}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isActive && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => setActiveVehicleId(v.id)}
                    >
                      Use
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => openEditModal(v)}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    onClick={() => onDeleteVehicle(v.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="vehicle-meta-grid">
                <div className="vehicle-meta-item">
                  <span className="vehicle-meta-label">Brand/Model</span>
                  <span className="vehicle-meta-val">{v.brand} {v.model}</span>
                </div>
                <div className="vehicle-meta-item">
                  <span className="vehicle-meta-label">Odometer</span>
                  <span className="vehicle-meta-val">{v.currentOdometer} km</span>
                </div>
                <div className="vehicle-meta-item">
                  <span className="vehicle-meta-label">Fuel Tank</span>
                  <span className="vehicle-meta-val">{v.tankCapacity} Liters</span>
                </div>
                <div className="vehicle-meta-item">
                  <span className="vehicle-meta-label">Next Service</span>
                  <span 
                    className="vehicle-meta-val" 
                    style={{ color: needsService ? 'var(--red)' : serviceDue <= 800 ? 'var(--amber)' : 'var(--emerald)' }}
                  >
                    {serviceDue > 0 ? `${serviceDue} km` : 'Overdue!'}
                  </span>
                </div>
              </div>

              {isActive && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '12px', 
                  background: 'rgba(0, 242, 254, 0.15)', 
                  border: '1px solid var(--cyan)', 
                  color: 'var(--cyan)',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  ACTIVE
                </div>
              )}
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No vehicles registered in your garage yet.</p>
            <button className="btn btn-primary" onClick={openAddModal} disabled={false}>
              Register Your First Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>{editVehicleId ? 'Edit Vehicle' : 'Register Vehicle'}</h3>
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label">Vehicle Nickname *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. My Black Scooter, Touring Car" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select 
                    className="form-control" 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="motorcycle">🏍️ Motorcycle</option>
                    <option value="car">🚗 Car</option>
                    <option value="bicycle">🚲 Bicycle</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">License Plate</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. B 1234 ABC" 
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Brand *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Honda, Yamaha, Toyota" 
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Model *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Vario 160, Civic" 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Current Odometer (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    disabled={!!editVehicleId}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Tank Capacity (L)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="form-control" 
                    value={tankCapacity}
                    onChange={(e) => setTankCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Service Reminder Interval (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="General service every X km"
                    value={serviceInterval}
                    onChange={(e) => setServiceInterval(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Distance between general maintenance.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Oil Change Interval (km)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="Oil change every X km"
                    value={oilInterval}
                    onChange={(e) => setOilInterval(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Custom oil replacement threshold.
                  </span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Oil Reminder Alert Frequency</label>
                  <select 
                    className="form-control"
                    value={oilReminderFrequency}
                    onChange={(e) => setOilReminderFrequency(e.target.value)}
                  >
                    <option value="daily">📅 Daily (Sehari sekali)</option>
                    <option value="weekly">📅 Weekly (Seminggu sekali)</option>
                    <option value="monthly">📅 Monthly (Sebulan sekali)</option>
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Choose how often you want to be reminded when oil replacement is due.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Tanggal Jatuh Tempo STNK</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={stnkExpiryDate}
                    onChange={(e) => setStnkExpiryDate(e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Hanya untuk pengingat masa berlaku STNK tahunan.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Vehicle
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
