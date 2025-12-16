-- Create sync_metadata table to track sync timestamps for incremental syncing
CREATE TABLE IF NOT EXISTS sync_metadata (
  sync_type TEXT PRIMARY KEY,
  last_sync TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access for the service role
GRANT ALL ON sync_metadata TO service_role;
