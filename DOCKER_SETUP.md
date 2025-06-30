# 🐳 Golder HR Backend - Docker Setup Guide

Hướng dẫn chi tiết cách cài đặt và chạy Golder HR Backend bằng Docker từ A đến Z.

## 📋 Yêu cầu hệ thống

- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine** (Linux)
- **Docker Compose** v3.8+
- **Git** để clone repository
- **4GB RAM** trở lên
- **10GB** dung lượng ổ cứng trống

## 🚀 Cài đặt nhanh

### 1. Chuẩn bị môi trường

```bash
# Clone repository (nếu chưa có)
git clone <your-repo-url>
cd Golder_HR_Backend

# Tạo file cấu hình Docker
cp .env.example .env.docker
```

### 2. Chỉnh sửa cấu hình

Mở file `.env.docker` và cập nhật các thông tin cần thiết:

```bash
# Bắt buộc cấu hình
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com

# Tùy chọn
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Chạy ứng dụng

#### Windows:
```cmd
# Chạy script Windows
docker-run.bat start

# Hoặc chạy trực tiếp
docker-compose -f docker-compose.simple.yml up --build -d
```

#### Linux/Mac:
```bash
# Cấp quyền thực thi
chmod +x docker-run.sh

# Chạy script
./docker-run.sh start

# Hoặc chạy trực tiếp
docker-compose -f docker-compose.simple.yml up --build -d
```

## 🔧 Các lệnh quản lý

### Sử dụng script tự động:

#### Windows (`docker-run.bat`):
```cmd
docker-run.bat start     # Khởi động services
docker-run.bat stop      # Dừng services
docker-run.bat restart   # Khởi động lại
docker-run.bat logs      # Xem logs tất cả services
docker-run.bat backend   # Xem logs backend only
docker-run.bat status    # Kiểm tra trạng thái
docker-run.bat shell     # Vào container backend
docker-run.bat cleanup   # Dọn dẹp hoàn toàn
```

#### Linux/Mac (`docker-run.sh`):
```bash
./docker-run.sh start     # Khởi động services
./docker-run.sh stop      # Dừng services
./docker-run.sh restart   # Khởi động lại
./docker-run.sh logs      # Xem logs tất cả services
./docker-run.sh backend   # Xem logs backend only
./docker-run.sh status    # Kiểm tra trạng thái
./docker-run.sh shell     # Vào container backend
./docker-run.sh cleanup   # Dọn dẹp hoàn toàn
```

### Sử dụng Docker Compose trực tiếp:

```bash
# Khởi động
docker-compose -f docker-compose.simple.yml up -d

# Xem logs
docker-compose -f docker-compose.simple.yml logs -f

# Dừng
docker-compose -f docker-compose.simple.yml down

# Rebuild và khởi động
docker-compose -f docker-compose.simple.yml up --build -d

# Dọn dẹp volumes
docker-compose -f docker-compose.simple.yml down -v
```

## 🌐 Truy cập ứng dụng

Sau khi khởi động thành công:

- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health
- **MongoDB**: localhost:27017 (admin/password123)

## 📊 Kiểm tra trạng thái

### Health Check:
```bash
curl http://localhost:3000/api/health
```

### Kiểm tra containers:
```bash
docker ps
```

### Xem logs:
```bash
# Tất cả services
docker-compose -f docker-compose.simple.yml logs

# Chỉ backend
docker-compose -f docker-compose.simple.yml logs backend

# Chỉ MongoDB
docker-compose -f docker-compose.simple.yml logs mongodb
```

## 🔍 Troubleshooting

### 1. Container không khởi động được:

```bash
# Kiểm tra logs
docker-compose -f docker-compose.simple.yml logs

# Kiểm tra Docker daemon
docker info

# Restart Docker Desktop (Windows/Mac)
```

### 2. Port đã được sử dụng:

```bash
# Kiểm tra port đang sử dụng
netstat -an | grep :3000
netstat -an | grep :27017

# Thay đổi port trong .env.docker
APP_PORT=3001
MONGO_PORT=27018
```

### 3. MongoDB connection error:

```bash
# Kiểm tra MongoDB container
docker-compose -f docker-compose.simple.yml logs mongodb

# Restart MongoDB
docker-compose -f docker-compose.simple.yml restart mongodb
```

### 4. Build error:

```bash
# Clean build
docker-compose -f docker-compose.simple.yml down
docker system prune -f
docker-compose -f docker-compose.simple.yml up --build
```

## 📁 Cấu trúc Docker

```
Golder_HR_Backend/
├── Dockerfile                 # Multi-stage build cho Node.js
├── docker-compose.yml         # Full setup với Redis, Nginx
├── docker-compose.simple.yml  # Simple setup chỉ Node.js + MongoDB
├── .dockerignore             # Loại trừ files không cần thiết
├── .env.docker              # Cấu hình Docker environment
├── mongo-init.js            # Script khởi tạo MongoDB
├── docker-run.sh            # Script quản lý Linux/Mac
├── docker-run.bat           # Script quản lý Windows
└── DOCKER_SETUP.md          # Hướng dẫn này
```

## 🔒 Bảo mật Production

Khi deploy production, hãy:

1. **Thay đổi passwords mặc định**:
   ```bash
   MONGO_ROOT_PASSWORD=your-strong-password
   JWT_SECRET=your-super-secret-key-min-32-chars
   COOKIE_SECRET=your-cookie-secret
   ```

2. **Sử dụng Docker secrets** thay vì environment variables

3. **Cấu hình firewall** và **reverse proxy**

4. **Enable SSL/TLS**

5. **Regular backup** MongoDB data

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra logs: `docker-compose logs`
2. Kiểm tra health check: `curl http://localhost:3000/api/health`
3. Restart services: `./docker-run.sh restart`
4. Clean rebuild: `./docker-run.sh cleanup && ./docker-run.sh start`

---

**Happy Coding! 🚀**
