# Branding Feature Setup

The branding logo & favicon feature has been implemented. To enable it in your database, you need to run the migration:

## Step 1: Run the Database Migration

1. Go to your [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Go to **SQL Editor** → Click **New query**
4. Copy and paste the SQL from `supabase/migrations/add_branding_settings.sql`:

```sql
-- Add branding settings to stores table for logo and favicon persistence
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stores_branding ON stores USING gin(branding);
```

5. Click **Run** to execute the migration

## Step 2: Test the Feature

1. Go to Dashboard → Brand & Design → Branding tab
2. Upload a logo image
3. Click **Save Changes**
4. Go to Preview or the live store
5. The logo should now appear in the store header!

## What Was Added

- ✅ Logo & Favicon upload UI in Brand & Design menu
- ✅ Logo display in all store preview layouts (header)
- ✅ Database persistence for branding settings
- ✅ Support for auto-using logo as favicon if favicon not provided

## Database Column Structure

The `branding` column stores a JSON object with this structure:

```json
{
  "logoUrl": "data:image/png;base64,...",
  "faviconUrl": "data:image/png;base64,...",
  "logoFile": "filename.png",
  "faviconFile": "filename.ico"
}
```

Images are stored as data URLs (base64 encoded) for simplicity. This can be migrated to cloud storage (S3/Vercel Blob) later without changing the UI code.
