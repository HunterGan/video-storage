.PHONY: help up down logs logs-backend logs-frontend rebuild clean shell-backend db-migrate ps check-docker

# Default target
help:
	@echo "Available commands:"
	@echo "  make up           - Start all services"
	@echo "  make up-d         - Start all services in detached mode"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - Show logs of all services"
	@echo "  make logs-backend - Show logs of backend service only"
	@echo "  make logs-frontend - Show logs of frontend service only"
	@echo "  make rebuild      - Rebuild and restart all services"
	@echo "  make clean        - Stop and remove all containers, volumes, and images"
	@echo "  make shell-backend - Open shell in backend container"
	@echo "  make db-migrate   - Run database migrations (if using sqlx/diesel)"
	@echo "  make ps           - Show running containers"
	@echo "  make check-docker - Check if Docker and Docker Compose are installed"

# Check if Docker and Docker Compose are available
check-docker:
	@echo "Checking Docker installation..."
	@docker --version > /dev/null 2>&1 || (echo "Error: Docker is not installed or not in PATH" && exit 1)
	@docker compose version > /dev/null 2>&1 || (echo "Error: Docker Compose is not installed or not in PATH" && exit 1)
	@echo "✓ Docker and Docker Compose are available"

# Start services
up: check-docker
	@echo "Starting all services..."
	@docker compose -f docker-compose.yml up -d
	@echo "Services started successfully!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend:  http://localhost:8080"
	@echo "Database: localhost:5433 (PostgreSQL)"

up-d:
	@make up

# Stop services
down:
	@echo "Stopping all services..."
	@docker compose -f docker-compose.yml down
	@echo "Services stopped successfully!"

# View logs
logs: check-docker
	@docker compose -f docker-compose.yml logs -f

logs-backend: check-docker
	@docker compose -f docker-compose.yml logs -f video-upload-service

logs-frontend: check-docker
	@docker compose -f docker-compose.yml logs -f ui-video-upload-service

# Rebuild and restart
rebuild: check-docker
	@echo "Rebuilding and restarting all services..."
	@docker compose -f docker-compose.yml down
	@docker compose -f docker-compose.yml build --no-cache
	@docker compose -f docker-compose.yml up -d
	@echo "Services rebuilt and restarted!"

rebuild-backend: check-docker
	@echo "Rebuilding and restarting backend only..."
	@docker compose -f docker-compose.yml build --no-cache video-upload-service
	@docker compose -f docker-compose.yml up -d --no-deps video-upload-service
	@echo "Backend service rebuilt and restarted!"

rebuild-frontend: check-docker
	@echo "Rebuilding and restarting frontend only..."
	@docker compose -f docker-compose.yml build --no-cache ui-video-upload-service
	@docker compose -f docker-compose.yml up -d --no-deps ui-video-upload-service
	@echo "Frontend service rebuilt and restarted!"

rebuild-db: check-docker
	@echo "Rebuilding and restarting database only..."
	@docker compose -f docker-compose.yml build --no-cache postgres
	@docker compose -f docker-compose.yml up -d --no-deps postgres
	@echo "Database service rebuilt and restarted!"

# Clean up everything
clean: check-docker
	@echo "Cleaning up all containers, volumes, and images..."
	@docker compose -f docker-compose.yml down -v --remove-orphans
	@docker image prune -f
	@echo "Cleanup completed!"

# Enter backend container shell
shell-backend: check-docker
	@docker compose -f docker-compose.yml exec -it video-upload-service sh

# Database migrations (if using sqlx)
db-migrate: check-docker
	@echo "Running database migrations..."
	@docker compose -f docker-compose.yml exec -T video-upload-service sh -c "
		if command -v sqlx &> /dev/null; then
			sqlx migrate run --database-url \$(DATABASE_URL)
		else
			echo 'sqlx not found in container. Migrations are run automatically on startup.'
		fi
	"

# Show running containers
ps: check-docker
	@docker compose -f docker-compose.yml ps

# Development mode with hot-reload (optional)
up-dev: check-docker
	@echo "Starting services in development mode with hot-reload..."
	@docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
	@echo "Development mode started!"

# Build only
build: check-docker
	@echo "Building images..."
	@docker compose -f docker-compose.yml build
	@echo "Build completed!"

# Stop and remove containers only (keep volumes)
down-containers: check-docker
	@docker compose stop
	@docker compose rm -f
	@echo "Containers stopped and removed (volumes preserved)!"

# Backup database (optional)
backup-db: check-docker
	@echo "Backing up PostgreSQL database..."
	@docker compose exec -T postgres pg_dump -U ${POSTGRES_USER:-video_user} ${POSTGRES_DB:-video_upload_db} > /tmp/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Database backed up to /tmp/"

# Restore database (optional)
restore-db:
	@echo "Restoring PostgreSQL database..."
	@read -p "Enter backup file path: " BACKUP_FILE && \
	docker compose exec -T postgres psql -U ${POSTGRES_USER:-video_user} ${POSTGRES_DB:-video_upload_db} < $${BACKUP_FILE}
	@echo "Database restored!"
