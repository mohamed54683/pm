# QMS System - Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Security Configuration](#security-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

### System Requirements
- Node.js 20.x or higher
- MySQL 8.0+ / MariaDB 10.4+
- Redis 7.0+ (optional, for caching)
- Nginx or Apache (reverse proxy)
- SSL certificate (required for production)

### Required Secrets
Generate these before deployment:
```bash
# Generate JWT secrets (64 characters recommended)
openssl rand -base64 64

# Generate CSRF secret
openssl rand -base64 32
```

---

## Environment Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd qms-system
npm ci --production
```

### 2. Create Environment File
```bash
cp .env.example .env.local
```

### 3. Configure Environment Variables
Edit `.env.local` with production values:

```env
# CRITICAL - Change these!
NODE_ENV=production
JWT_ACCESS_SECRET=<your-64-char-secret>
JWT_REFRESH_SECRET=<your-64-char-secret>
CSRF_SECRET=<your-32-char-secret>

# Database
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=qms_user
DB_PASSWORD=<strong-password>
DB_NAME=qms_system
DB_POOL_SIZE=100

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Redis (if using)
ENABLE_REDIS_CACHE=true
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=<redis-password>
```

---

## Database Migration

### 1. Create Database User (Principle of Least Privilege)
```sql
CREATE USER 'qms_user'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON qms_system.* TO 'qms_user'@'%';
FLUSH PRIVILEGES;
```

### 2. Run Migration Script
```bash
mysql -u root -p qms_system < scripts/migrate-passwords.sql
```

### 3. Verify Migration
```sql
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM user_auth) as auth_records,
    (SELECT COUNT(*) FROM user_auth WHERE password_hash LIKE '$2%') as bcrypt_users;
```

---

## Security Configuration

### 1. Nginx Configuration (Recommended)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    location /api/auth/signin {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 2. Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP (redirect)
ufw allow 443/tcp  # HTTPS
ufw enable
```

---

## Deployment Steps

### 1. Build Application
```bash
npm run build
```

### 2. Start with PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "qms" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### 3. Using Docker (Alternative)
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t qms-system .
docker run -d -p 3000:3000 --env-file .env.local qms-system
```

---

## Post-Deployment Verification

### 1. Health Check
```bash
curl -I https://your-domain.com/api/health
# Expected: HTTP/2 200
```

### 2. Security Headers Check
```bash
curl -I https://your-domain.com | grep -E "(X-Frame|X-Content|Strict-Transport)"
```

### 3. Authentication Test
```bash
# Test rate limiting (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

### 4. Database Connection Test
```bash
curl https://your-domain.com/api/db-test
```

### 5. Verify Indexes
```sql
SHOW INDEX FROM users;
SHOW INDEX FROM quality_audits;
SHOW INDEX FROM reports;
```

---

## Monitoring & Maintenance

### 1. Log Monitoring
```bash
# PM2 logs
pm2 logs qms

# Application logs
tail -f /var/log/qms/app.log
```

### 2. Database Monitoring
```sql
-- Check slow queries
SHOW FULL PROCESSLIST;

-- Check connection count
SHOW STATUS LIKE 'Threads_connected';

-- Check InnoDB status
SHOW ENGINE INNODB STATUS;
```

### 3. Redis Monitoring (if enabled)
```bash
redis-cli info stats
redis-cli info memory
```

### 4. Performance Metrics
- Monitor response times (target: <200ms)
- Monitor error rates (target: <0.1%)
- Monitor CPU/Memory usage
- Monitor database connections

---

## Rollback Procedure

### 1. Quick Rollback
```bash
# Stop current version
pm2 stop qms

# Restore previous version
git checkout <previous-tag>
npm ci --production
npm run build
pm2 restart qms
```

### 2. Database Rollback (if needed)
```bash
# Restore from backup
mysql -u root -p qms_system < backup_YYYYMMDD.sql
```

### 3. Verify Rollback
```bash
curl https://your-domain.com/api/health
pm2 logs qms --lines 50
```

---

## Troubleshooting

### Common Issues

#### 1. "ECONNREFUSED" on database
- Check MySQL is running
- Verify DB_HOST and DB_PORT
- Check firewall rules

#### 2. "Invalid token" errors
- Verify JWT secrets are set correctly
- Check token expiration times
- Clear browser cookies

#### 3. Rate limiting blocking legitimate users
- Check X-Forwarded-For header is passed
- Adjust rate limits if needed

#### 4. High memory usage
- Check for memory leaks
- Increase Node.js heap size: `NODE_OPTIONS="--max-old-space-size=4096"`

---

## Support

For issues, contact the development team or create an issue in the repository.
