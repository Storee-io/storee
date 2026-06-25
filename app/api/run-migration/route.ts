import { createServerClient } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createServerClient();

    // Check if columns already exist by querying information_schema
    const { data: existingColumns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'stores')
      .in('column_name', ['description', 'email', 'checkout_settings']);

    const existingColumnNames = existingColumns?.map(c => c.column_name) || [];
    const allColumnsExist =
      existingColumnNames.includes('description') &&
      existingColumnNames.includes('email') &&
      existingColumnNames.includes('checkout_settings');

    if (allColumnsExist) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '✅ All columns already exist in stores table!',
          details: 'description, email, and checkout_settings columns are ready.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Since we can't execute raw SQL via supabase-js, provide instructions
    return new Response(
      JSON.stringify({
        success: false,
        message: '⚠️ Cannot run migration programmatically',
        instructions: 'Please run the migration manually in Supabase Dashboard:',
        steps: [
          '1. Go to https://app.supabase.com/',
          '2. Select your project',
          '3. Click SQL Editor → New query',
          '4. Paste the migration SQL',
          '5. Click RUN'
        ],
        sql: `ALTER TABLE stores ADD COLUMN IF NOT EXISTS description text DEFAULT 'Premium quality products for your lifestyle';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email text DEFAULT 'hello@mystore.com';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS checkout_settings jsonb DEFAULT '{"contactFields":"both"}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_stores_checkout_settings ON stores USING gin(checkout_settings);`,
        detectedColumns: existingColumnNames,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Migration check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hint: 'This endpoint checks if columns exist. Manual migration may be needed.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
