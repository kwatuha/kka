# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd api
npm install
```

## Step 2: Setup MySQL Database

1. Login to MySQL:
```bash
mysql -u root -p
```

2. Create database and run schema:
```sql
CREATE DATABASE kiplombe_hmis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

3. Import schema:
```bash
mysql -u root -p kiplombe_hmis < database/schema.sql
```

## Step 3: Configure Environment

Create `.env` file in the `api` directory:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=kiplombe_hmis
DB_PORT=3306
JWT_SECRET=change_this_to_a_random_secret_string
PORT=3001
NODE_ENV=development
```

## Step 4: Start the Server

```bash
npm run dev
```

The API will be running on `http://localhost:3001`

## Step 5: Test the API

Test login with a staff account from your environment (credentials **only in env**, never in git):

```bash
export HMIS_TEST_USER='your_username'
export HMIS_TEST_PASSWORD='your_password'
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${HMIS_TEST_USER}\",\"password\":\"${HMIS_TEST_PASSWORD}\"}"
```

⚠️ **Do not commit real usernames/passwords** — even in examples. Removing a line in a later commit does **not** erase it from Git history on GitHub. See `deploy/GIT_HISTORY_SECRETS.md`.

