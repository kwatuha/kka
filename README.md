# IntelliNex - Hospital Management Information System (generic platform)

A comprehensive Hospital Management Information System built with Next.js, TypeScript, and Tailwind CSS.

## Branding model

- **IntelliNex**: generic platform name (default)
- **Kiplombe**: specific app/deployment brand (configurable via env)

## Features

- **Role-based Authentication**: Secure login system with different user roles
- **Modern UI**: Beautiful, responsive interface with dark/light mode support
- **Comprehensive Modules**: Patient management, appointments, billing, pharmacy, laboratory, and more
- **Real-time Updates**: Live queue management and patient tracking
- **Accessibility**: WCAG compliant design with keyboard navigation support

## Login System

Staff sign in through the HMIS API (`POST /api/auth/login`). User accounts and passwords live in the database only — not in this repository.

### User Roles and Permissions

- **Administrator**: Full access to all modules
- **Doctor**: Patient management, medical records, prescriptions, lab orders
- **Nurse**: Patient care, vital signs, medication administration
- **Lab Technician**: Laboratory tests, results management
- **Registration**: Patient registration and basic information
- **Billing**: Financial management, invoicing
- **Pharmacy**: Medication management, prescriptions

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Run locally (pick one)**

   **Docker (Kakamega / AZ CarePlus — recommended):**
   ```bash
   docker compose --env-file .env up -d
   ./deploy/setup-kakamega-db-local.sh   # first time only
   ```
   Open **[http://localhost:5400/hmis/login](http://localhost:5400/hmis/login)** (API: `http://localhost:3222`).

   **Host Next.js dev** (stop the legacy `intellinex_frontend` container first if port 3100 is in use):
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3100/hmis/login](http://localhost:3100/hmis/login)** with `NEXT_PUBLIC_API_URL=http://localhost:3222` in `.env` or `.env.local`.

   > **Note:** Port **3100** is often used by the separate **IntelliNex** docker stack (`intellinex_frontend`), not AZ CarePlus. If you see old IntelliNex branding, use **5400** or stop that container.

4. **Login**
   Use staff accounts from your environment (UAT list: `docs/UAT_TEST_CREDENTIALS.xlsx`, local only — see `deploy/UAT_TEST_CREDENTIALS.README.md`)

## Project Structure

```
transelgon/
├── app/                    # Next.js app directory
│   ├── login/             # Login page
│   ├── logout/            # Logout page
│   └── [modules]/         # Various HMIS modules
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   └── [feature]/        # Feature-specific components
├── lib/                  # Utilities and services
│   ├── auth/            # Authentication logic
│   └── data/            # Local data storage
└── public/              # Static assets
```

## Authentication Flow

1. **Login**: Users enter credentials on `/login`
2. **Validation**: The API validates credentials and may require TOTP or login OTP
3. **Token**: A JWT is returned and stored in `localStorage` for API requests
4. **Protected Routes**: Application routes require a valid session
5. **Logout**: Users can logout via the header dropdown menu

## Future Enhancements
- [x] Mobile companion (IntelliNex Field) — see `mobile-collector/` (forms, chemist dispense POC, asset verify, offline outbox)
- [ ] SQLite + NetInfo auto-sync on Field app
- [ ] QR / pickup-code scanning
- [ ] Real-time notifications
- [ ] Advanced analytics and reporting

## Technologies Used

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: React Context API

## Contributing

This repo is the IntelliNex platform codebase. For production use, additional security measures and backend integration would be required.

## Contact Information

- **Address:** P. O. Box 8407 - 30100, ELDORET
- **Physical Location:** Along Eldoret-Kiplombe Road, B&E Eagle House
- **Telephone:** 0116695005
- **Email:** mbemedicalcentre@gmail.com
- **Tagline:** For Quality Healthcare Service Delivery

## License

This project is for demonstration purposes only. 