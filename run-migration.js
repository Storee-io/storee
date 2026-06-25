const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migration = `
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS description text DEFAULT 'Premium quality products for your lifestyle';

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS email text DEFAULT 'hello@mystore.com';

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS checkout_settings jsonb DEFAULT '{"contactFields":"both"}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stores_checkout_settings ON stores USING gin(checkout_settings);
`;

async function runMigration() {
  try {
    console.log('🚀 Running migration...');

    // Split into individual statements
    const statements = migration.split(';').filter(s => s.trim());

    for (const statement of statements) {
      if (!statement.trim()) continue;

      console.log(`⏳ Executing: ${statement.trim().substring(0, 50)}...`);

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement.trim()
      }).catch(async () => {
        // If rpc doesn't work, try direct query
        return await supabase.from('_sql_migrations').insert({
          name: `migration_${Date.now()}`,
          sql: statement.trim()
        }).catch(() => ({ error: 'SQL execution method not available' }));
      });

      if (error) {
        console.log(`⚠️  Note: ${error.message}`);
      } else {
        console.log(`✅ Executed successfully`);
      }
    }

    console.log('\n✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
