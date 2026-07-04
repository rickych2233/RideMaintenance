const { Pool } = require('pg');

const oldUrl = 'postgresql://postgres.acnhqhlejwgnvmhneonn:BCm1oRXXiRva4E2N@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres'; // Pakai URL asli dari .env
const newUrl = 'postgresql://neondb_owner:npg_oA8uWOm5Vnkl@ep-ancient-mode-atx1l765-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';

const oldPool = new Pool({ connectionString: oldUrl, ssl: { rejectUnauthorized: false } });
const newPool = new Pool({ connectionString: newUrl, ssl: { rejectUnauthorized: false } });

async function migrate() {
    try {
        console.log('🔄 Menghubungkan ke Supabase (Database Lama)...');
        await oldPool.query('SELECT 1');
        
        console.log('🔄 Menghubungkan ke Neon (Database Baru)...');
        await newPool.query('SELECT 1');

        console.log('🏗️ Membuat struktur tabel di database baru...');
        const schemas = [
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS vehicles (
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
            )`,
            `CREATE TABLE IF NOT EXISTS ride_logs (
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
            )`,
            `CREATE TABLE IF NOT EXISTS maintenance_logs (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL REFERENCES users(id),
                vehicleId INTEGER NOT NULL,
                vehicleName VARCHAR(255) NOT NULL,
                serviceType VARCHAR(100) NOT NULL,
                date VARCHAR(50) NOT NULL,
                odometer INTEGER NOT NULL,
                cost REAL NOT NULL DEFAULT 0,
                notes TEXT
            )`,
            `CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL REFERENCES users(id),
                endpoint TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                UNIQUE(endpoint)
            )`,
            `CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            )`
        ];

        for (const schema of schemas) {
            await newPool.query(schema);
        }

        const tables = ['users', 'vehicles', 'ride_logs', 'maintenance_logs', 'push_subscriptions', 'system_settings'];

        for (const table of tables) {
            console.log(`\n⏳ Mulai memindahkan data tabel: ${table}...`);
            const res = await oldPool.query(`SELECT * FROM ${table}`);
            const rows = res.rows;
            console.log(`   Ditemukan ${rows.length} baris data.`);

            if (rows.length > 0) {
                // Hapus data lama jika sudah ada isinya agar tidak duplicate
                await newPool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);

                const keys = Object.keys(rows[0]);
                const quotedKeys = keys.map(k => `"${k}"`).join(', ');
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

                const insertQuery = `INSERT INTO ${table} (${quotedKeys}) VALUES (${placeholders})`;

                let successCount = 0;
                for (const row of rows) {
                    const values = keys.map(k => row[k]);
                    await newPool.query(insertQuery, values);
                    successCount++;
                }
                console.log(`   ✅ Berhasil memindahkan ${successCount} data ke ${table}.`);
            } else {
                console.log(`   ⏩ Tabel kosong, dilewati.`);
            }
        }
        
        await newPool.query("INSERT INTO system_settings (key, value) VALUES ('bbm_maintenance', 'false') ON CONFLICT (key) DO NOTHING");

        console.log('\n🎉 YAY! Semua data berhasil dipindahkan dengan selamat ke Neon Database!');

    } catch (e) {
        console.error('\n❌ Terjadi kesalahan saat migrasi:', e);
    } finally {
        await oldPool.end();
        await newPool.end();
    }
}

migrate();
