const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const cron = require('node-cron');
const { initDb, dbQuery } = require('./db.cjs');
const authMiddleware = require('./auth.cjs');

const nodemailer = require('nodemailer');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

// Email Configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Web Push Configuration
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:test@example.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID keys are missing. Push notifications will not work.');
}

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

// ─── AUTH ROUTES (public) ───────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await dbQuery.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await dbQuery.get(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id`,
      [name, email.toLowerCase(), hashedPassword]
    );

    const token = jwt.sign({ userId: result.id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      id: result.id,
      name,
      email: email.toLowerCase(),
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await dbQuery.get('SELECT id, name, email, role, createdAt FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH MIDDLEWARE FOR DATA ROUTES ────────────────────────────────────

app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path === '/vapid-public-key') return next();
  return authMiddleware(req, res, next);
});

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── PUSH NOTIFICATION SUBSCRIPTION ─────────────────────────────────────

app.post('/api/subscribe', async (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const existing = await dbQuery.get('SELECT id FROM push_subscriptions WHERE endpoint = ? AND userId = ?', [subscription.endpoint, req.user.userId]);
    
    if (!existing) {
      await dbQuery.run(
        'INSERT INTO push_subscriptions (userId, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
        [req.user.userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
    }
    res.status(201).json({ message: 'Subscription saved successfully.' });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── VEHICLES ENDPOINTS ─────────────────────────────────────────────────

app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await dbQuery.all('SELECT * FROM vehicles WHERE userId = ? ORDER BY id ASC', [req.user.userId]);
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const { name, type, brand, model, licensePlate, currentOdometer, lastServiceOdometer, tankCapacity, serviceInterval, oilInterval, oilReminderFrequency, lastOilReminderDate, stnkExpiryDate } = req.body;
  if (!name || !brand || !model) {
    return res.status(400).json({ error: 'Name, brand, and model are required.' });
  }

  try {
    // Enforce max 3 vehicles per user
    const countResult = await dbQuery.get('SELECT COUNT(*) as count FROM vehicles WHERE userId = ?', [req.user.userId]);
    if (parseInt(countResult.count) >= 3) {
      return res.status(400).json({ error: 'Maximum of 3 vehicles allowed per user.' });
    }

    const result = await dbQuery.get(
      `INSERT INTO vehicles (userId, name, type, brand, model, licensePlate, currentOdometer, lastServiceOdometer, tankCapacity, serviceInterval, oilInterval, oilReminderFrequency, lastOilReminderDate, stnkExpiryDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.user.userId,
        name,
        type || 'motorcycle',
        brand,
        model,
        licensePlate || '',
        parseInt(currentOdometer || 0),
        parseInt(lastServiceOdometer || currentOdometer || 0),
        parseFloat(tankCapacity || 10),
        parseInt(serviceInterval || 3000),
        parseInt(oilInterval || 2000),
        oilReminderFrequency || 'weekly',
        lastOilReminderDate || new Date().toISOString().split('T')[0],
        stnkExpiryDate || null
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
    await dbQuery.run('DELETE FROM vehicles WHERE id = ? AND userId = ?', [req.params.id, req.user.userId]);
    res.json({ message: 'Vehicle deleted successfully.', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  const { name, type, brand, model, licensePlate, tankCapacity, serviceInterval, oilInterval, oilReminderFrequency, lastOilReminderDate, stnkExpiryDate } = req.body;
  const vehicleId = req.params.id;

  try {
    const vehicle = await dbQuery.get('SELECT * FROM vehicles WHERE id = ? AND userId = ?', [vehicleId, req.user.userId]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    await dbQuery.run(
      `UPDATE vehicles 
       SET name = ?, type = ?, brand = ?, model = ?, licensePlate = ?, tankCapacity = ?, serviceInterval = ?, oilInterval = ?, oilReminderFrequency = ?, lastOilReminderDate = ?, stnkExpiryDate = ?
       WHERE id = ? AND userId = ?`,
      [
        name || vehicle.name,
        type || vehicle.type,
        brand || vehicle.brand,
        model || vehicle.model,
        licensePlate !== undefined ? licensePlate : vehicle.licensePlate,
        parseFloat(tankCapacity || vehicle.tankCapacity),
        parseInt(serviceInterval || vehicle.serviceInterval),
        parseInt(oilInterval || vehicle.oilInterval || 2000),
        oilReminderFrequency || vehicle.oilReminderFrequency || 'weekly',
        lastOilReminderDate !== undefined ? lastOilReminderDate : vehicle.lastOilReminderDate,
        stnkExpiryDate !== undefined ? stnkExpiryDate : vehicle.stnkExpiryDate,
        vehicleId,
        req.user.userId
      ]
    );

    const updated = await dbQuery.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id/odo', async (req, res) => {
  const { currentOdometer, lastServiceOdometer } = req.body;
  const vehicleId = req.params.id;

  try {
    const vehicle = await dbQuery.get('SELECT * FROM vehicles WHERE id = ? AND userId = ?', [vehicleId, req.user.userId]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found.' });
    }

    const nextCurrent = currentOdometer !== undefined ? parseInt(currentOdometer) : vehicle.currentOdometer;
    const nextLastService = lastServiceOdometer !== undefined ? parseInt(lastServiceOdometer) : vehicle.lastServiceOdometer;

    await dbQuery.run(
      'UPDATE vehicles SET currentOdometer = ?, lastServiceOdometer = ? WHERE id = ? AND userId = ?',
      [nextCurrent, nextLastService, vehicleId, req.user.userId]
    );

    const updated = await dbQuery.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RIDE LOGS ENDPOINTS ────────────────────────────────────────────────

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await dbQuery.all('SELECT * FROM ride_logs WHERE userId = ? ORDER BY id DESC', [req.user.userId]);
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
      `INSERT INTO ride_logs (userId, vehicleId, vehicleName, date, distance, duration, startOdometer, endOdometer, safetyScore, safetyAlerts, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.user.userId,
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
    await dbQuery.run('DELETE FROM ride_logs WHERE userId = ?', [req.user.userId]);
    res.json({ message: 'All ride logs successfully cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── MAINTENANCE LOGS ENDPOINTS ─────────────────────────────────────────

app.get('/api/maintenance', async (req, res) => {
  try {
    const maintLogs = await dbQuery.all('SELECT * FROM maintenance_logs WHERE userId = ? ORDER BY id DESC', [req.user.userId]);
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
      `INSERT INTO maintenance_logs (userId, vehicleId, vehicleName, serviceType, date, odometer, cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        req.user.userId,
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

// ─── OIL CHANGE STATUS ──────────────────────────────────────────────────

app.get('/api/maintenance/oil-status', async (req, res) => {
  try {
    const vehicles = await dbQuery.all('SELECT * FROM vehicles WHERE userId = ? ORDER BY id ASC', [req.user.userId]);
    const allLogs = await dbQuery.all(
      "SELECT * FROM maintenance_logs WHERE userId = ? AND serviceType = 'Oil Change' ORDER BY id DESC",
      [req.user.userId]
    );

    const oilStatus = vehicles.map(v => {
      const lastOilChange = allLogs.find(l => l.vehicleId === v.id);
      const lastOdo = lastOilChange ? lastOilChange.odometer : 0;
      const lastDate = lastOilChange ? lastOilChange.date : null;
      const interval = v.oilInterval || 2000;
      const kmSince = v.currentOdometer - lastOdo;
      const remaining = interval - kmSince;

      // Time-based check
      const freq = v.oilReminderFrequency || 'weekly';
      const lastCheckStr = v.lastOilReminderDate || lastDate || null;
      let timeStatus = 'ok';
      let timeMessage = '';

      if (lastCheckStr) {
        const lastCheckDate = new Date(lastCheckStr);
        const today = new Date();
        const diffTime = Math.abs(today - lastCheckDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (freq === 'daily' && diffDays >= 1) {
          timeStatus = 'due_soon';
          timeMessage = `Daily check (oil age: ${diffDays} days)`;
        } else if (freq === 'weekly' && diffDays >= 7) {
          timeStatus = 'due_soon';
          timeMessage = `Weekly check (oil age: ${diffDays} days)`;
        } else if (freq === 'monthly' && diffDays >= 30) {
          timeStatus = 'due_soon';
          timeMessage = `Monthly check (oil age: ${diffDays} days)`;
        }
      }

      let status = 'ok';
      if (!lastOilChange) {
        status = v.currentOdometer > 0 ? 'overdue' : 'ok';
      } else if (remaining <= 0) {
        status = 'overdue';
      } else if (remaining <= Math.round(interval * 0.2)) {
        status = 'due_soon';
      }

      // If odometer status is ok but time frequency threshold has passed
      if (status === 'ok' && timeStatus !== 'ok') {
        status = timeStatus;
      }

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        vehicleType: v.type,
        currentOdometer: v.currentOdometer,
        lastOilChangeOdometer: lastOdo,
        lastOilChangeDate: lastDate,
        oilReminderFrequency: freq,
        lastOilReminderDate: v.lastOilReminderDate,
        kmSince,
        interval,
        remainingKm: Math.max(0, remaining),
        status,
        timeMessage
      };
    });

    res.json(oilStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CRON JOB FOR OIL REMINDERS ──────────────────────────────────────────

const runDailyCheck = async () => {
  console.log('⏰ Running oil reminder check...');
  try {
    const vehicles = await dbQuery.all('SELECT * FROM vehicles ORDER BY id ASC');
    const allLogs = await dbQuery.all("SELECT * FROM maintenance_logs WHERE serviceType = 'Oil Change' ORDER BY id DESC");
    
    let pushCount = 0;

    for (const v of vehicles) {
      const lastOilChange = allLogs.find(l => l.vehicleId === v.id);
      const lastOdo = lastOilChange ? lastOilChange.odometer : 0;
      const interval = v.oilInterval || 2000;
      const kmSince = v.currentOdometer - lastOdo;
      const remaining = interval - kmSince;

      let status = 'ok';
      if (!lastOilChange && v.currentOdometer > 0) status = 'overdue';
      else if (remaining <= 0) status = 'overdue';
      else if (remaining <= Math.round(interval * 0.2)) status = 'due_soon';

      const freq = v.oilReminderFrequency || 'weekly';
      const lastCheckStr = v.lastOilReminderDate || (lastOilChange ? lastOilChange.date : null);
      
      let sendTimeAlert = false;
      let timeMessage = '';
      if (lastCheckStr) {
         const lastCheckDate = new Date(lastCheckStr);
         const diffDays = Math.floor(Math.abs(new Date() - lastCheckDate) / (1000 * 60 * 60 * 24));
         if (freq === 'daily' && diffDays >= 1) { sendTimeAlert = true; timeMessage = `Sudah ${diffDays} hari sejak cek terakhir.`; }
         else if (freq === 'weekly' && diffDays >= 7) { sendTimeAlert = true; timeMessage = `Waktunya cek mingguan.`; }
         else if (freq === 'monthly' && diffDays >= 30) { sendTimeAlert = true; timeMessage = `Waktunya cek bulanan.`; }
      }

      if (status !== 'ok' || sendTimeAlert) {
         const title = status === 'overdue' ? '🛢️ Peringatan: Ganti Oli!' : '📅 Pengingat: Cek Oli Motor';
         let body = `Motor ${v.name} perlu dicek.`;
         
         if (status === 'overdue') body = `Oli motor ${v.name} sudah melewati batas! Silakan ganti sekarang.`;
         else if (status === 'due_soon') body = `Oli motor ${v.name} perlu diganti dalam ${remaining} km lagi.`;
         else if (sendTimeAlert) body = `Pengingat ${freq} untuk ${v.name}: ${timeMessage}`;
         
         const subscriptions = await dbQuery.all('SELECT * FROM push_subscriptions WHERE userId = ?', [v.userId]);
         for (const sub of subscriptions) {
            const pushSub = {
               endpoint: sub.endpoint,
               keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            try {
               await webpush.sendNotification(pushSub, JSON.stringify({
                 title, 
                 body, 
                 icon: '/favicon.ico',
                 url: '/'
               }));
               pushCount++;
            } catch (err) {
               if (err.statusCode === 410 || err.statusCode === 404) {
                 await dbQuery.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
               } else {
                 console.error('Push error for user', v.userId, ':', err);
               }
            }
         }
      }

      // STNK Expiry Reminder Check (7 Days Before)
      if (v.stnkExpiryDate) {
        const stnkDate = new Date(v.stnkExpiryDate);
        const todayDate = new Date();
        const diffDaysStnk = Math.ceil((stnkDate - todayDate) / (1000 * 60 * 60 * 24));

        if (diffDaysStnk === 7) {
          const stnkTitle = '📄 Peringatan: STNK Segera Mati!';
          const stnkBody = `Pajak STNK untuk kendaraan ${v.name} akan jatuh tempo dalam 7 hari (${v.stnkExpiryDate}). Segera lakukan perpanjangan!`;

          // 1. Send Push Notification
          const subscriptions = await dbQuery.all('SELECT * FROM push_subscriptions WHERE userId = ?', [v.userId]);
          for (const sub of subscriptions) {
            const pushSub = {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            try {
              await webpush.sendNotification(pushSub, JSON.stringify({
                title: stnkTitle, 
                body: stnkBody, 
                icon: '/favicon.ico',
                url: '/'
              }));
              pushCount++;
            } catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await dbQuery.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
              }
            }
          }

          // 2. Send Email Notification (Temporarily Disabled)
          /*
          try {
             const user = await dbQuery.get('SELECT email, name FROM users WHERE id = ?', [v.userId]);
             if (user && user.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await transporter.sendMail({
                  from: `"RideRecord Alerts" <${process.env.EMAIL_USER}>`,
                  to: user.email,
                  subject: stnkTitle,
                  text: `Halo ${user.name},\n\n${stnkBody}\n\nSalam aman berkendara,\nTim RideRecord`,
                  html: `<div style="font-family: sans-serif; padding: 20px;">
                           <h2>${stnkTitle}</h2>
                           <p>Halo <b>${user.name}</b>,</p>
                           <p>${stnkBody}</p>
                           <br/>
                           <p>Salam aman berkendara,<br/>Tim RideRecord</p>
                         </div>`
                });
             }
          } catch(err) {
             console.error('Email sending error:', err);
          }
          */
        }
      }
    }
    console.log(`✅ Finished check. Sent ${pushCount} push notifications.`);
    return pushCount;
  } catch (err) {
    console.error('Cron job error:', err);
    throw err;
  }
};

cron.schedule('0 8 * * *', runDailyCheck); // Run at 8:00 AM every day

// Test Endpoint to trigger cron manually
app.get('/api/test-cron', async (req, res) => {
  try {
    const sent = await runDailyCheck();
    res.json({ message: `Check completed. Sent ${sent} notifications.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await dbQuery.get('SELECT email, role FROM users WHERE id = ?', [req.user.userId]);
    if (user && (user.role === 'admin' || user.email === 'rickychristian2309@gmail.com')) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Admins only.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await dbQuery.all('SELECT id, name, email, role, createdAt FROM users ORDER BY id DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', adminMiddleware, async (req, res) => {
  try {
    // Delete associated data first
    await dbQuery.run('DELETE FROM maintenance_logs WHERE userId = ?', [req.params.id]);
    await dbQuery.run('DELETE FROM ride_logs WHERE userId = ?', [req.params.id]);
    await dbQuery.run('DELETE FROM push_subscriptions WHERE userId = ?', [req.params.id]);
    await dbQuery.run('DELETE FROM vehicles WHERE userId = ?', [req.params.id]);
    // Delete user
    await dbQuery.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id/role', adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }
    
    // Prevent the main super admin from demoting themselves
    const userToUpdate = await dbQuery.get('SELECT email FROM users WHERE id = ?', [req.params.id]);
    if (userToUpdate && userToUpdate.email === 'rickychristian2309@gmail.com' && role === 'user') {
      return res.status(403).json({ error: 'Cannot demote the main system admin.' });
    }

    await dbQuery.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'User role updated successfully', role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/vehicles', adminMiddleware, async (req, res) => {
  try {
    const { isPg } = require('./db.cjs');
    const sql = isPg 
      ? `SELECT v.*, u.name as "ownerName", u.email as "ownerEmail" FROM vehicles v JOIN users u ON v."userId" = u.id ORDER BY v.id DESC`
      : `SELECT v.*, u.name as ownerName, u.email as ownerEmail FROM vehicles v JOIN users u ON v.userId = u.id ORDER BY v.id DESC`;
    const vehicles = await dbQuery.all(sql);
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/vehicles/:id', adminMiddleware, async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BBM PRICES (SCRAPING FRAMEWORK) ────────────────────────────────────

app.get('/api/bbm-prices', async (req, res) => {
  try {
    const setting = await dbQuery.get("SELECT value FROM system_settings WHERE key = 'bbm_maintenance'");
    const isMaintenance = setting && setting.value === 'true';

    if (isMaintenance) {
      return res.json({
        status: 'maintenance',
        message: 'Maaf, sistem sinkronisasi harga BBM sedang dalam penyesuaian (Maintenance).'
      });
    }

    // Return dummy/cached data for now
    res.json({
      status: 'success',
      data: [
        { name: 'Pertamax', price: 12950 },
        { name: 'Pertalite', price: 10000 },
        { name: 'Pertamax Turbo', price: 14400 }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to simulate the cron job scraping behavior
app.post('/api/bbm-prices/test-scrape', async (req, res) => {
  const { success } = req.body; // Pass {"success": false} to trigger maintenance
  
  try {
    if (success) {
      await dbQuery.run("UPDATE system_settings SET value = 'false' WHERE key = 'bbm_maintenance'");
      res.json({ message: 'Scrape successful, maintenance mode OFF' });
    } else {
      await dbQuery.run("UPDATE system_settings SET value = 'true' WHERE key = 'bbm_maintenance'");
      res.json({ message: 'Scrape failed, maintenance mode ON' });
    }
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
