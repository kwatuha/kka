#!/bin/bash
# Deployment Configuration File
# Copy this file and modify the values for your deployment

# Server Configuration
export SERVER_IP="41.89.173.8"
export SSH_USER="fhir"
export SSH_KEY_PATH="~/.ssh/id_asusme"

# Application Configuration
export APP_DIR="~/kiplombe-hmis"
export NGINX_PORT="80"  # Change to 8081 if needed

# Database Configuration (optional - will use .env if not set)
export MYSQL_ROOT_PASSWORD="kiplombe_root_pass_2024"
export MYSQL_DATABASE="kiplombe_hmis"
export MYSQL_USER="kiplombe_user"
export MYSQL_PASSWORD="kiplombe_pass_2024"

# API Configuration (optional)
export NEXT_PUBLIC_API_URL=""  # Leave empty for relative URLs
export FRONTEND_URL="http://${SERVER_IP}"








