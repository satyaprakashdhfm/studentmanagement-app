@echo off
echo Updating Prisma schema...
npx prisma generate
echo Schema updated successfully!
echo.
echo Note: The markedBy field can now accept any string (teacher IDs, "Admin", etc.)
echo No database migration is needed as we only removed a relation, not changed the table structure.
pause