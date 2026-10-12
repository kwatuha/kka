# Deployment Checklist

Use this checklist when deploying Kiplombe HMIS to ensure everything is configured correctly.

## Pre-Deployment

- [ ] Server has Docker and Docker Compose installed
- [ ] Server has sufficient resources (2GB+ RAM, 20GB+ disk space)
- [ ] Required ports are available (3001, 8081, 3308)
- [ ] SSH access to server is configured

## Configuration

- [ ] `.env` file created from `.env.example`
- [ ] `MYSQL_ROOT_PASSWORD` set to strong password
- [ ] `MYSQL_PASSWORD` set to strong password
- [ ] `JWT_SECRET` set to strong random string (32+ characters)
- [ ] `NEXT_PUBLIC_API_URL` configured correctly
- [ ] Database credentials verified

## Deployment Steps

- [ ] Code copied to server
- [ ] Environment file configured
- [ ] Docker images built successfully
- [ ] Services started successfully
- [ ] Database initialized
- [ ] ICD-10 sample data loaded (if needed)

## Post-Deployment Verification

- [ ] Frontend accessible at http://server-ip:8081
- [ ] API responding at http://server-ip:3001
- [ ] Database connection working
- [ ] Can login to application
- [ ] All services healthy (check with `docker-compose ps`)

## Security

- [ ] Default passwords changed
- [ ] JWT_SECRET is strong and unique
- [ ] Database access restricted
- [ ] Firewall rules configured (if applicable)
- [ ] SSL/HTTPS configured (for production)

## Monitoring Setup

- [ ] Log rotation configured
- [ ] Monitoring tools set up (optional)
- [ ] Backup strategy in place
- [ ] Alert notifications configured (optional)

## Documentation

- [ ] Deployment documented
- [ ] Team members have access info
- [ ] Support contacts documented


