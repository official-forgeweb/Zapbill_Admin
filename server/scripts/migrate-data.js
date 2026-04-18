const { Client } = require('pg');

// SOURCE: Local DB
const sourceConfig = {
    connectionString: "postgresql://postgres:ndacadet002@localhost:5432/flashbill_admin?schema=public"
};

// TARGET: Supabase DB (using direct URL for speed and reliability during migration)
const targetConfig = {
    connectionString: "postgresql://postgres.ahhyqknfywtqbvgkohft:@ndacadet002@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
};

const tables = [
    'admins',
    'features',
    'plans',
    'clients',
    'licenses',
    'devices',
    'client_features',
    'amc_payments',
    'audit_logs',
    'website_order_configs',
    'website_pending_orders',
    'website_order_daily_stats',
    'website_menu_cache',
    'website_coupon_cache'
];

async function migrate() {
    const source = new Client(sourceConfig);
    const target = new Client(targetConfig);

    try {
        await source.connect();
        console.log('Connected to SOURCE (local)');
        await target.connect();
        console.log('Connected to TARGET (supabase)');

        // Disable triggers/constraints to avoid FK issues during bulk insert
        await target.query('SET session_replication_role = "replica";');

        for (const table of tables) {
            console.log(`Migrating table: ${table}...`);
            
            // Clear target table
            await target.query(`TRUNCATE TABLE "${table}" CASCADE;`);

            // Fetch data from source
            const { rows } = await source.query(`SELECT * FROM "${table}"`);
            
            if (rows.length === 0) {
                console.log(`  Table ${table} is empty, skipping.`);
                continue;
            }

            // Prepare insert query
            const columns = Object.keys(rows[0]).map(c => `"${c}"`).join(', ');
            const placeholders = Object.keys(rows[0]).map((_, i) => `$${i + 1}`).join(', ');
            const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders})`;

            for (const row of rows) {
                const values = Object.values(row);
                await target.query(query, values);
            }
            
            console.log(`  Successfully migrated ${rows.length} rows for ${table}.`);
        }

        // Re-enable triggers/constraints
        await target.query('SET session_replication_role = "origin";');
        console.log('Migration completed successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await source.end();
        await target.end();
    }
}

migrate();
