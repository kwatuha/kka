# Docker Installation Instructions for Ubuntu Server

## Quick Install (Recommended)

SSH into your server:
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
```

Then run these commands (you'll be prompted for password: `fhir`):

```bash
# Update package index
sudo apt-get update -y

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine, CLI, and Compose Plugin
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (so you don't need sudo for docker commands)
sudo usermod -aG docker fhir

# Verify installation
docker --version
docker compose version
```

**Important:** After adding yourself to the docker group, you need to log out and log back in for the changes to take effect:

```bash
exit
```

Then reconnect:
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
```

Verify Docker works without sudo:
```bash
docker ps
docker compose version
```

## Alternative: Install Docker.io (Simpler, but older version)

If the above doesn't work, you can use the Ubuntu package:

```bash
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker fhir
exit
```

Then reconnect and verify:
```bash
ssh -i ~/.ssh/id_asusme fhir@41.89.173.8
docker --version
docker-compose --version
docker ps
```

## Troubleshooting

### If you get "permission denied" errors:
```bash
# Make sure you're in the docker group
groups
# Should show 'docker' in the list

# If not, add yourself again and relogin
sudo usermod -aG docker fhir
newgrp docker
```

### If Docker service won't start:
```bash
sudo systemctl status docker
sudo journalctl -u docker
```

### Check Docker is running:
```bash
sudo systemctl status docker
```

## After Installation

Once Docker is installed and working, let me know and I'll:
1. Create the `.env` configuration file
2. Build and start all services
3. Initialize the database
4. Verify everything is working




