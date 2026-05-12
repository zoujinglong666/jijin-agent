@echo off
echo Starting PostgreSQL 16...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D "%USERPROFILE%\PostgreSQL\16\data" -l logfile start
echo PostgreSQL started on port 5433
echo.
echo To connect:
echo psql -U postgres -p 5433
echo.
echo Default password: 123456
pause