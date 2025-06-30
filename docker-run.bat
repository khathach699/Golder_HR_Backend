@echo off
setlocal enabledelayedexpansion

REM Golder HR Backend Docker Management Script for Windows

set "COMPOSE_FILE=docker-compose.simple.yml"

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
echo [INFO] Starting Golder HR Backend services...

REM Check if .env.docker exists
if not exist ".env.docker" (
    echo [WARNING] .env.docker not found. Creating from .env.example...
    copy .env.example .env.docker >nul
    echo [WARNING] Please edit .env.docker with your configuration before running again.
    pause
    exit /b 1
)

REM Build and start services
docker-compose -f %COMPOSE_FILE% up --build -d

echo [SUCCESS] Services started successfully!
echo [INFO] Backend: http://localhost:3000
echo [INFO] API Docs: http://localhost:3000/api-docs
echo [INFO] Health Check: http://localhost:3000/api/health
echo [INFO] MongoDB: localhost:27017
goto :eof

REM Function to stop services
:stop_services
echo [INFO] Stopping Golder HR Backend services...
docker-compose -f %COMPOSE_FILE% down
echo [SUCCESS] Services stopped successfully!
goto :eof

REM Function to view logs
:view_logs
echo [INFO] Viewing logs for all services...
docker-compose -f %COMPOSE_FILE% logs -f
goto :eof

REM Function to view backend logs only
:view_backend_logs
echo [INFO] Viewing backend logs...
docker-compose -f %COMPOSE_FILE% logs -f backend
goto :eof

REM Function to restart services
:restart_services
echo [INFO] Restarting services...
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
echo [INFO] Service status:
docker-compose -f %COMPOSE_FILE% ps
goto :eof

REM Function to enter backend container
:enter_backend
echo [INFO] Entering backend container...
docker-compose -f %COMPOSE_FILE% exec backend sh
goto :eof

REM Function to show help
:show_help
echo Golder HR Backend Docker Management Script
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   start     Build and start all services
echo   stop      Stop all services
echo   restart   Restart all services
echo   logs      View logs for all services
echo   backend   View backend logs only
echo   status    Show service status
echo   shell     Enter backend container shell
echo   cleanup   Stop services and clean up volumes
echo   help      Show this help message
echo.
echo Examples:
echo   %~nx0 start
echo   %~nx0 logs
echo   %~nx0 stop
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
) else if "%1"=="backend" (
    call :view_backend_logs
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
