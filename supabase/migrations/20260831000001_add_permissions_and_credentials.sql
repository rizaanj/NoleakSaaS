-- Add permissions_config and test_credentials to projects table
-- permissions_config: JSONB defining expected RLS behaviour per table/action
-- test_credentials:   JSONB storing User A / User B email + password for testing

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS permissions_config JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS test_credentials   JSONB DEFAULT NULL;
