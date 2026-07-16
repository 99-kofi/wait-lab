@echo off
cls
color 0F
echo.
echo  //////////////////////////////////////////////////
echo  // WAIT LAB   ///   RESEARCH PLATFORM v3.0       //
echo  // STATUS: OPTIMAL             PROTOCOL: DEEPMIND //
echo  //////////////////////////////////////////////////
echo.
echo Initializing research environment...
echo.
echo [>] Starting Backend Server...
echo.

:: Start the server in a new window so it doesn't block
start "WAIT LAB SERVER" node server.js

:: Wait a moment for server to start
timeout /t 3 /nobreak > nul

echo [>] Opening ADVANCED CORE...
echo.
start "" "http://localhost:3000"

echo.
echo Load complete. Laboratory sync established.
echo.
pause
