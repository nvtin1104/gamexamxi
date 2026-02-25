-- Migration: 0004_user_custom_permissions
-- Adds custom_permissions column to users table.
-- Stores a JSON array of Permission strings that are merged with role permissions.

ALTER TABLE users ADD COLUMN custom_permissions TEXT; -- e.g. '["admin:panel","events:delete"]'
