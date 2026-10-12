# Quick Start Deployment

## 1. Prepare Server

```bash
ssh -i ~/.ssh/id_asusme kunye@165.22.227.234
cd ~
mkdir -p kiplombe-hmis
cd kiplombe-hmis
```

## 2. Copy Project Files

From your local machine:
```bash
rsync -avz -e "ssh -i ~/.ssh/id_asusme" \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  /home/dev/transelgon/ \
  kunye@165.22.227.234:/home/kunye/kiplombe-hmis/
```

## 3. Configure & Deploy

On the server:
```bash
cd /home/kunye/kiplombe-hmis
cp deploy/.env.example .env
nano .env  # Edit configuration
chmod +x deploy/*.sh
./deploy/deploy.sh
```

## 4. Setup Database

```bash
./deploy/setup-database.sh
```

## 5. Access Application

- Frontend: http://165.22.227.234:8081
- API: http://165.22.227.234:3001

Done! 🎉
