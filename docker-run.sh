#!/bin/bash

# Golder HR Backend Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build and start services
start_services() {
    print_status "Starting Golder HR Backend services..."
    
    # Check if .env.docker exists
    if [ ! -f ".env.docker" ]; then
        print_warning ".env.docker not found. Creating from .env.example..."
        cp .env.example .env.docker
        print_warning "Please edit .env.docker with your configuration before running again."
        exit 1
    fi
    
    # Build and start services
    docker-compose -f docker-compose.simple.yml up --build -d
    
    print_success "Services started successfully!"
    print_status "Backend: http://localhost:3000"
    print_status "API Docs: http://localhost:3000/api-docs"
    print_status "Health Check: http://localhost:3000/api/health"
    print_status "MongoDB: localhost:27017"
}

# Function to stop services
stop_services() {
    print_status "Stopping Golder HR Backend services..."
    docker-compose -f docker-compose.simple.yml down
    print_success "Services stopped successfully!"
}

# Function to view logs
view_logs() {
    print_status "Viewing logs for all services..."
    docker-compose -f docker-compose.simple.yml logs -f
}

# Function to view backend logs only
view_backend_logs() {
    print_status "Viewing backend logs..."
    docker-compose -f docker-compose.simple.yml logs -f backend
}

# Function to restart services
restart_services() {
    print_status "Restarting services..."
    stop_services
    start_services
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose -f docker-compose.simple.yml down -v
    docker system prune -f
    print_success "Cleanup completed!"
}

# Function to show status
show_status() {
    print_status "Service status:"
    docker-compose -f docker-compose.simple.yml ps
}

# Function to enter backend container
enter_backend() {
    print_status "Entering backend container..."
    docker-compose -f docker-compose.simple.yml exec backend sh
}

# Function to show help
show_help() {
    echo "Golder HR Backend Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Build and start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  logs      View logs for all services"
    echo "  backend   View backend logs only"
    echo "  status    Show service status"
    echo "  shell     Enter backend container shell"
    echo "  cleanup   Stop services and clean up volumes"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 logs"
    echo "  $0 stop"
}

# Main script logic
case "${1:-help}" in
    start)
        check_docker
        start_services
        ;;
    stop)
        check_docker
        stop_services
        ;;
    restart)
        check_docker
        restart_services
        ;;
    logs)
        check_docker
        view_logs
        ;;
    backend)
        check_docker
        view_backend_logs
        ;;
    status)
        check_docker
        show_status
        ;;
    shell)
        check_docker
        enter_backend
        ;;
    cleanup)
        check_docker
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
