const pg = require('pg');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const isPg = !!databaseUrl && !databaseUrl.includes('username:password') && databaseUrl.trim() !== '';

let pool = null;
let sqliteDb = null;

if (isPg) {
  console.log('🔌 [Database] Connecting to Cloud PostgreSQL...');
  pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log('💾 [Database] DATABASE_URL is not configured. Falling back to local SQLite...');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '../database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath);
}

function prepareQuery(sql) {
  if (!isPg) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

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
    else if (key === 'userid') newKey = 'userId';
    else if (key === 'createdat') newKey = 'createdAt';
    else if (key === 'oilinterval') newKey = 'oilInterval';
    else if (key === 'oilreminderfrequency') newKey = 'oilReminderFrequency';
    else if (key === 'lastoilreminderdate') newKey = 'lastOilReminderDate';
    else if (key === 'stnkexpirydate') newKey = 'stnkExpiryDate';

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
  const userSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    : `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now'))
      )`;

  const vehicleSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        brand VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        licensePlate VARCHAR(50),
        currentOdometer INTEGER NOT NULL DEFAULT 0,
        lastServiceOdometer INTEGER NOT NULL DEFAULT 0,
        tankCapacity REAL NOT NULL DEFAULT 10,
        serviceInterval INTEGER NOT NULL DEFAULT 3000,
        oilInterval INTEGER NOT NULL DEFAULT 2000,
        oilReminderFrequency VARCHAR(50) NOT NULL DEFAULT 'weekly',
        lastOilReminderDate VARCHAR(50),
        stnkExpiryDate VARCHAR(50)
      )`
    : `CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        licensePlate TEXT,
        currentOdometer INTEGER NOT NULL DEFAULT 0,
        lastServiceOdometer INTEGER NOT NULL DEFAULT 0,
        tankCapacity REAL NOT NULL DEFAULT 10,
        serviceInterval INTEGER NOT NULL DEFAULT 3000,
        oilInterval INTEGER NOT NULL DEFAULT 2000,
        oilReminderFrequency TEXT NOT NULL DEFAULT 'weekly',
        lastOilReminderDate TEXT,
        stnkExpiryDate TEXT
      )`;

  const rideLogsSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS ride_logs (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id),
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
        userId INTEGER NOT NULL,
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
        userId INTEGER NOT NULL REFERENCES users(id),
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
        userId INTEGER NOT NULL,
        vehicleId INTEGER NOT NULL,
        vehicleName TEXT NOT NULL,
        serviceType TEXT NOT NULL,
        date TEXT NOT NULL,
        odometer INTEGER NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        notes TEXT
      )`;

  const pushSubscriptionsSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES users(id),
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        UNIQUE(endpoint)
      )`
    : `CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL
      )`;

  const systemSettingsSchema = isPg
    ? `CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )`
    : `CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`;

  const runInit = async () => {
    try {
      await dbQuery.run(userSchema);
      await dbQuery.run(vehicleSchema);
      await dbQuery.run(rideLogsSchema);
      await dbQuery.run(maintenanceLogsSchema);
      await dbQuery.run(pushSubscriptionsSchema);
      await dbQuery.run(systemSettingsSchema);
      
      // Initialize default settings
      try {
        const existing = await dbQuery.get("SELECT key FROM system_settings WHERE key = 'bbm_maintenance'");
        if (!existing) {
          await dbQuery.run("INSERT INTO system_settings (key, value) VALUES ('bbm_maintenance', 'false')");
        }
      } catch (err) {
        console.log('Error inserting default setting:', err.message);
      }
      
      // Auto-migrate column if not exists
      try {
        await dbQuery.run('ALTER TABLE vehicles ADD COLUMN oilInterval INTEGER NOT NULL DEFAULT 2000;');
      } catch (err) {
        // Column likely already exists, ignore
      }

      try {
        await dbQuery.run("ALTER TABLE vehicles ADD COLUMN oilReminderFrequency VARCHAR(50) NOT NULL DEFAULT 'weekly';");
      } catch (err) {
        // Ignore if exists
      }

      try {
        await dbQuery.run("ALTER TABLE vehicles ADD COLUMN lastOilReminderDate VARCHAR(50);");
      } catch (err) {
        // Ignore if exists
      }

      try {
        await dbQuery.run("ALTER TABLE vehicles ADD COLUMN stnkExpiryDate VARCHAR(50);");
      } catch (err) {
        // Ignore if exists
      }

      console.log('Database tables successfully checked/initialized.');
    } catch (err) {
      console.error('Error initializing database:', err);
    }
  };

  runInit();
}

module.exports = {
  dbQuery,
  initDb,
  isPg
};
