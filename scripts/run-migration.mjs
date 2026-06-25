import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

// Extract connection details from Supabase URL
// Format: https://[project-id].supabase.co
const projectId = supabaseUrl.split('//')[1].split('.')[0];
const connectionString = `postgresql://postgres:${supabaseKey}@db.${projectId}.supabase.co:5432/postgres`;

const migrations = [
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS description text DEFAULT 'Premium quality products for your lifestyle'`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS email text DEFAULT 'hello@mystore.com'`,
  `ALTER TABLE stores ADD COLUMN IF NOT EXISTS checkout_settings jsonb DEFAULT '{"contactFields":"both"}'::jsonb`,
  `CREATE INDEX IF NOT EXISTS idx_stores_checkout_settings ON stores USING gin(checkout_settings)`,
];

async function runMigration() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!\n');

    for (const sql of migrations) {
      try {
        console.log(`⏳ Running: ${sql.substring(0, 60)}...`);
        await client.query(sql);
        console.log(`✅ Success!\n`);
      } catch (error) {
        // Ignore if column already exists
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Already exists (OK)\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
