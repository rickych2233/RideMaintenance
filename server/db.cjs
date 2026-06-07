const pg = require('pg');
const path = require('path');
const fs = require('fs');

console.log('🔍 [Diagnostics] DATABASE_URL BEFORE DOTENV:', JSON.stringify(process.env.DATABASE_URL));

// Load environment variables from .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('🔍 [Diagnostics] DATABASE_URL raw value:', JSON.stringify(process.env.DATABASE_URL));
if (process.env.DATABASE_URL) {
  console.log(`🔍 [Diagnostics] DATABASE_URL found! Type: ${typeof process.env.DATABASE_URL}, Length: ${process.env.DATABASE_URL.length}, Starts with: ${process.env.DATABASE_URL.substring(0, 15)}...`);
} else {
  console.log('🔍 [Diagnostics] DATABASE_URL is completely UNDEFINED in process.env');
}
console.log('🔍 [Diagnostics] Available Env Keys:', Object.keys(process.env));

const databaseUrl = process.env.DATABASE_URL;
const isPg = !!databaseUrl && !databaseUrl.includes('username:password') && databaseUrl.trim() !== '';
console.log('🔍 [Diagnostics] Evaluated isPg status:', isPg);

let pool = null;
let sqliteDb = null;

if (isPg) {
  console.log('🔌 [Database] Connecting to Cloud PostgreSQL...');
  pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false } // Required for cloud databases like Neon/Supabase
  });
} else {
  console.log('💾 [Database] DATABASE_URL is not configured. Falling back to local SQLite...');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
}

// Helper to convert '?' placeholders to '$1', '$2', ... for PostgreSQL
function prepareQuery(sql) {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Helper to convert lowercase database column keys to camelCase for the React frontend
function camelCaseKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(camelCaseKeys);
  }
  const result = {};
  for (const key of Object.keys(obj)) {
    let newKey = key;
    if (key === 'licenseplate') newKey = 'licensePlate';
    else if (key === 'currentodometer') newKey = 'currentOdometer';
    else if (key === 'lastserviceodometer') newKey = 'lastServiceOdometer';
    else if (key === 'tankcapacity') newKey = 'tankCapacity';
    else if (key === 'serviceinterval') newKey = 'serviceInterval';
    else if (key === 'vehicleid') newKey = 'vehicleId';
    else if (key === 'vehiclename') newKey = 'vehicleName';
    else if (key === 'startodometer') newKey = 'startOdometer';
    else if (key === 'endodometer') newKey = 'endOdometer';
    else if (key === 'safetyscore') newKey = 'safetyScore';
    else if (key === 'safetyalerts') newKey = 'safetyAlerts';
    else if (key === 'servicetype') newKey = 'serviceType';
    
    result[newKey] = camelCaseKeys(obj[key]);
  }
  return result;
}

const dbQuery = {
  async run(sql, params = []) {
    const query = prepareQuery(sql);
    if (isPg) {
      const res = await pool.query(query, params);
      return { id: null, changes: res.rowCount };
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
  },

  async all(sql, params = []) {
    const query = prepareQuery(sql);
    if (isPg) {
      const res = await pool.query(query, params);
      return camelCaseKeys(res.rows);
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(camelCaseKeys(rows));
        });
      });
    }
  },

  async get(sql, params = []) {
    const query = prepareQuery(sql);
    if (isPg) {
      const res = await pool.query(query, params);
      return camelCaseKeys(res.rows[0]) || null;
    } else {
      return new Promise((resolve, reject) => {
        sqliteDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(camelCaseKeys(row));
        });
      });
    }
  }
};

function initDb() {
  const vehicleSchema = isPg 
    ? `CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        licensePlate VARCHAR(50),
        currentOdometer INTEGER NOT NULL DEFAULT 0,
        lastServiceOdometer INTEGER NOT NULL DEFAULT 0,
        tankCapacity REAL NOT NULL DEFAULT 10,
        serviceInterval INTEGER NOT NULL DEFAULT 3000
      )`
    : `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        licensePlate TEXT,
        currentOdometer INTEGER NOT NULL DEFAULT 0,
        lastServiceOdometer INTEGER NOT NULL DEFAULT 0,
        tankCapacity REAL NOT NULL DEFAULT 10,
        serviceInterval INTEGER NOT NULL DEFAULT 3000
      )`;

  const rideLogsSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS ride_logs (
        id SERIAL PRIMARY KEY,
        vehicleId INTEGER NOT NULL,
        vehicleName VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        distance REAL NOT NULL,
        duration INTEGER NOT NULL,
        startOdometer INTEGER NOT NULL,
        endOdometer INTEGER NOT NULL,
        safetyScore INTEGER NOT NULL,
        safetyAlerts VARCHAR(100) NOT NULL DEFAULT 'None',
        notes TEXT
      )`
    : `CREATE TABLE IF NOT EXISTS ride_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicleId INTEGER NOT NULL,
        vehicleName TEXT NOT NULL,
        date TEXT NOT NULL,
        distance REAL NOT NULL,
        duration INTEGER NOT NULL,
        startOdometer INTEGER NOT NULL,
        endOdometer INTEGER NOT NULL,
        safetyScore INTEGER NOT NULL,
        safetyAlerts TEXT NOT NULL DEFAULT 'None',
        notes TEXT
      )`;

  const maintenanceLogsSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS maintenance_logs (
        id SERIAL PRIMARY KEY,
        vehicleId INTEGER NOT NULL,
        vehicleName VARCHAR(255) NOT NULL,
        serviceType VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        odometer INTEGER NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        notes TEXT
      )`
    : `CREATE TABLE IF NOT EXISTS maintenance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicleId INTEGER NOT NULL,
        vehicleName TEXT NOT NULL,
        serviceType TEXT NOT NULL,
        date TEXT NOT NULL,
        odometer INTEGER NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        notes TEXT
      )`;

  const runInit = async () => {
    try {
      await dbQuery.run(vehicleSchema);
      await dbQuery.run(rideLogsSchema);
      await dbQuery.run(maintenanceLogsSchema);
      console.log('Database tables successfully checked/initialized.');

      // Seed default vehicles if none exist
      const vehicleCount = await dbQuery.get('SELECT COUNT(*) as count FROM vehicles');
      if (parseInt(vehicleCount.count) === 0) {
        console.log('Seeding initial vehicles...');
        await dbQuery.run(`
          INSERT INTO vehicles (name, type, brand, model, licensePlate, currentOdometer, lastServiceOdometer, tankCapacity, serviceInterval)
          VALUES 
          ('Honda Vario 160', 'motorcycle', 'Honda', 'Vario 160', 'B 4321 SFE', 12450, 12000, 5.5, 2500),
          ('Toyota Yaris GR', 'car', 'Toyota', 'Yaris GR Sport', 'B 9999 GR', 8420, 5000, 42.0, 8000)
        `);
      }

      // Seed default ride logs if none exist
      const logCount = await dbQuery.get('SELECT COUNT(*) as count FROM ride_logs');
      if (parseInt(logCount.count) === 0) {
        console.log('Seeding initial ride logs...');
        await dbQuery.run(`
          INSERT INTO ride_logs (vehicleId, vehicleName, date, distance, duration, startOdometer, endOdometer, safetyScore, safetyAlerts, notes)
          VALUES
          (1, 'Honda Vario 160', '03/06/2026', 15.2, 25, 12380, 12395, 100, 'None', 'Commute to office, ride checklist fully passed.'),
          (2, 'Toyota Yaris GR', '04/06/2026', 48.6, 55, 8300, 8349, 80, 'None', 'Brake pads squeaking slightly, flagged controls check.'),
          (1, 'Honda Vario 160', '06/06/2026', 8.4, 12, 12420, 12428, 100, 'None', 'Short run to supermarket')
        `);
      }

      // Seed default maintenance logs if none exist
      const maintCount = await dbQuery.get('SELECT COUNT(*) as count FROM maintenance_logs');
      if (parseInt(maintCount.count) === 0) {
        console.log('Seeding initial maintenance logs...');
        await dbQuery.run(`
          INSERT INTO maintenance_logs (vehicleId, vehicleName, serviceType, date, odometer, cost, notes)
          VALUES
          (1, 'Honda Vario 160', 'Oil Change', '2026-05-15', 12000, 120000, 'Replaced SPX2 engine oil and gear oil.'),
          (2, 'Toyota Yaris GR', 'General Tune-up', '2026-04-10', 5000, 850000, 'Routine 5,000 km general service check at Toyota dealer.')
        `);
      }
    } catch (err) {
      console.error('Error seeding data:', err);
    }
  };

  runInit();
}

module.exports = {
  dbQuery,
  initDb,
  isPg
};
