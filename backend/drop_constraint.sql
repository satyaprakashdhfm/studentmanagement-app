-- Drop the foreign key constraint from attendance table
-- This will allow markedBy to be any string (teacher IDs, "Admin", etc.)

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;

-- Verify the constraint is dropped
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'attendance'::regclass 
AND conname LIKE '%marked_by%';