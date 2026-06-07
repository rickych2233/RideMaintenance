const express = require('express');
const cors = require('cors');
const { initDb, dbQuery } = require('./db.cjs');

const app = express();
const PORT = 3001;

// Initialize Database
initDb();

// Middleware
app.use(cors());
app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// VEHICLES ENDPOINTS
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await dbQuery.all('SELECT * FROM vehicles ORDER BY id ASC');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const { name, type, brand, model, licensePlate, currentOdometer, lastServiceOdometer, tankCapacity, serviceInterval } = req.body;
  if (!name || !brand || !model) {
    return res.status(400).json({ error: 'Name, brand, and model are required.' });
  }

  try {
    const result = await dbQuery.get(
      `INSERT INTO vehicles (name, type, brand, model, licensePlate, currentOdometer, lastServiceOdometer, tankCapacity, serviceInterval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        name,
        type || 'motorcycle',
        brand,
        model,
        licensePlate || '',
        parseInt(currentOdometer || 0),
        parseInt(lastServiceOdometer || currentOdometer || 0),
        parseFloat(tankCapacity || 10),
        parseInt(serviceInterval || 3000)
      ]
    );
    const newVehicle = await dbQuery.get('SELECT * FROM vehicles WHERE id = ?', [result.id]);
    res.status(201).json(newVehicle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted successfully.', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id/odo', async (req, res) => {
  const { currentOdometer, lastServiceOdometer } = req.body;
  const vehicleId = req.params.id;

  try {
    // Find vehicle first
    const vehicle = await dbQuery.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const nextCurrent = currentOdometer !== undefined ? parseInt(currentOdometer) : vehicle.currentOdometer;
    const nextLastService = lastServiceOdometer !== undefined ? parseInt(lastServiceOdometer) : vehicle.lastServiceOdometer;

    await dbQuery.run(
      'UPDATE vehicles SET currentOdometer = ?, lastServiceOdometer = ? WHERE id = ?',
      [nextCurrent, nextLastService, vehicleId]
    );

    const updated = await dbQuery.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RIDE LOGS ENDPOINTS
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await dbQuery.all('SELECT * FROM ride_logs ORDER BY id DESC');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  const { vehicleId, vehicleName, date, distance, duration, startOdometer, endOdometer, safetyScore, safetyAlerts, notes } = req.body;
  
  if (!vehicleId || !vehicleName || distance === undefined || duration === undefined) {
    return res.status(400).json({ error: 'Missing required trip fields.' });
  }

  try {
    const result = await dbQuery.get(
      `INSERT INTO ride_logs (vehicleId, vehicleName, date, distance, duration, startOdometer, endOdometer, safetyScore, safetyAlerts, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        parseInt(vehicleId),
        vehicleName,
        date || new Date().toLocaleDateString(),
        parseFloat(distance),
        parseInt(duration),
        parseInt(startOdometer || 0),
        parseInt(endOdometer || 0),
        parseInt(safetyScore || 100),
        safetyAlerts || 'None',
        notes || ''
      ]
    );
    const newLog = await dbQuery.get('SELECT * FROM ride_logs WHERE id = ?', [result.id]);
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM ride_logs');
    res.json({ message: 'All ride logs successfully cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MAINTENANCE LOGS ENDPOINTS
app.get('/api/maintenance', async (req, res) => {
  try {
    const maintLogs = await dbQuery.all('SELECT * FROM maintenance_logs ORDER BY id DESC');
    res.json(maintLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/maintenance', async (req, res) => {
  const { vehicleId, vehicleName, serviceType, date, odometer, cost, notes } = req.body;

  if (!vehicleId || !vehicleName || !serviceType || odometer === undefined) {
    return res.status(400).json({ error: 'Missing required maintenance service fields.' });
  }

  try {
    const result = await dbQuery.get(
      `INSERT INTO maintenance_logs (vehicleId, vehicleName, serviceType, date, odometer, cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        parseInt(vehicleId),
        vehicleName,
        serviceType,
        date || new Date().toISOString().split('T')[0],
        parseInt(odometer),
        parseFloat(cost || 0),
        notes || ''
      ]
    );
    const newMaintLog = await dbQuery.get('SELECT * FROM maintenance_logs WHERE id = ?', [result.id]);
    res.status(201).json(newMaintLog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// START SERVER
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Express API server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
