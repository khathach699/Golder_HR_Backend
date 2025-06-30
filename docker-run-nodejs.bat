@echo off
setlocal enabledelayedexpansion

REM Golder HR Backend - Node.js Only Docker Script

set "COMPOSE_FILE=docker-compose.nodejs-only.yml"

REM Function to check if Docker is running
:check_docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo [SUCCESS] Docker is running
goto :eof

REM Function to start services
:start_services
echo [INFO] Starting Node.js Backend only (using MongoDB Atlas)...

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env file not found. Please make sure .env exists with MongoDB Atlas configuration.
    pause
    exit /b 1
)

REM Build and start services
docker-compose -f %COMPOSE_FILE% up --build -d

echo [SUCCESS] Node.js Backend started successfully!
echo [INFO] Backend: http://localhost:3000
echo [INFO] API Docs: http://localhost:3000/api-docs
echo [INFO] Health Check: http://localhost:3000/api/health
echo [INFO] Using MongoDB Atlas from .env file
goto :eof

REM Function to stop services
:stop_services
echo [INFO] Stopping Node.js Backend...
docker-compose -f %COMPOSE_FILE% down
echo [SUCCESS] Backend stopped successfully!
goto :eof

REM Function to view logs
:view_logs
echo [INFO] Viewing backend logs...
docker-compose -f %COMPOSE_FILE% logs -f backend
goto :eof

REM Function to restart services
:restart_services
echo [INFO] Restarting backend...
call :stop_services
call :start_services
goto :eof

REM Function to clean up
:cleanup
echo [INFO] Cleaning up Docker resources...
docker-compose -f %COMPOSE_FILE% down -v
docker system prune -f
echo [SUCCESS] Cleanup completed!
goto :eof

REM Function to show status
:show_status
echo [INFO] Backend status:
docker-compose -f %COMPOSE_FILE% ps
goto :eof

REM Function to enter backend container
:enter_backend
echo [INFO] Entering backend container...
docker-compose -f %COMPOSE_FILE% exec backend sh
goto :eof

REM Function to show help
:show_help
echo Golder HR Backend - Node.js Only Docker Script
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   start     Build and start Node.js backend only
echo   stop      Stop backend
echo   restart   Restart backend
echo   logs      View backend logs
echo   status    Show backend status
echo   shell     Enter backend container shell
echo   cleanup   Stop backend and clean up volumes
echo   help      Show this help message
echo.
echo Note: This uses MongoDB Atlas from your .env file
goto :eof

REM Main script logic
if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="--help" goto show_help
if "%1"=="-h" goto show_help

call :check_docker

if "%1"=="start" (
    call :start_services
) else if "%1"=="stop" (
    call :stop_services
) else if "%1"=="restart" (
    call :restart_services
) else if "%1"=="logs" (
    call :view_logs
) else if "%1"=="status" (
    call :show_status
) else if "%1"=="shell" (
    call :enter_backend
) else if "%1"=="cleanup" (
    call :cleanup
) else (
    echo [ERROR] Unknown command: %1
    call :show_help
    exit /b 1
)

pause
