@echo off
echo Stopping PostgreSQL 16...
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D "%USERPROFILE%\PostgreSQL\16\data" stop
echo PostgreSQL stopped.
pause