-- Add timeline column to projects table if needed
-- This column stores project timeline/estimated duration

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS timeline TEXT;


