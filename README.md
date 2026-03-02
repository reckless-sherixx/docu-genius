# DocuGenius

**DocuGenius** is a Document Generation & Management Platform that streamlines the creation, customization, validation, and tracking of organizational documents — such as agreements, offer letters, and NDAs — using PDF templates and centralized data entry.

Users upload a company-branded PDF template, enter relevant personal and role-specific data, review and correct language via integrated proofreading, and generate final documents on official letterhead secured by audit logging and QR-code verification.

---

## Table of Contents

- [Key Benefits](#key-benefits)
- [Feature Breakdown](#feature-breakdown)
- [User Flows](#user-flows)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Data Models](#data-models)
- [API Routes](#api-routes)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Build](#build)

---

## Key Benefits

| Benefit | Description |
|---------|-------------|
| **Speed & Consistency** | Populate any template with centralized inputs to eliminate manual editing |
| **Error Reduction** | Built-in grammar, style, and tense checking with one-click fixes |
| **Brand Control** | Automatic application of corporate letterhead and serial numbering |
| **Auditability** | Track every generated document by user, reason, timestamp, and PIN |
| **Security & Verification** | Encrypt data at rest, enforce RBAC, and embed QR codes for real-time validity checks |

---

## Feature Breakdown

### 2.1 Template Management

**PDF Upload & Validation**
- Support PDF files up to 10 MB, A4/Letter sizes; reject password-protected or corrupted files
- Validate file type and size before processing

**Placeholder Detection & Tagging**
- Automatically extract text placeholders (e.g., `{{Name}}`, `{{Date}}`) using PDF-Lib OCR and Tesseract.js
- Provide manual tagging interface for templates with non-standard layouts or embedded graphics
- Classify document type via dropdown (Agreement, Offer Letter, NDA, Custom)

**Version Control**
- Maintain template versions; allow rollback or comparison diff of placeholder changes

---

### 2.2 Dynamic Data Entry

**Form Generation**
- Generate dynamic forms from detected placeholders:
  - Text inputs (e.g., Name, Role, Start Date)
  - Pronoun selector with "he/him", "she/her", "they/them", plus custom option
  - Date pickers and dropdowns for standardized fields (e.g., Department)

**Conditional Logic & Validation**
- If pronoun = "she/her", set all possessive placeholders to "her"
- Validation rules (required, regex, max length) enforced in real time via Yup
- Skip optional fields; highlight missing required fields before merge

---

### 2.3 Proofreading & Language Correction

**Integration with LanguageTool API**
- Upon data merge, send draft text to LanguageTool for grammar, spelling, punctuation, and tense analysis
- Display inline suggestions in UI with "Accept" or "Ignore" options per error
- Offer "Accept All" for bulk correction

**Multi-Dialect Support**
- Allow users to select English variant (US, UK, Australian) for region-specific rules

**Change Tracking**
- Log all accepted corrections; allow export of before/after comparison report for compliance audits

---

### 2.4 Letterhead Application & Audit Logging

**Letterhead Overlay**
- Apply predefined header and footer graphics from company letterhead repository
- Ensure DPI and color profiles maintain print quality

**Serial Number Assignment**
- Generate serial in format `YYYYMMDD-XXXX` (sequential per day)
- Display next available serial; lock after assignment

**User PIN Authentication**
- Prompt user to enter personal 4-digit PIN before final generation
- Lock account generation ability after three incorrect attempts; auto-unlock after 15 minutes

**Comprehensive Audit Log**
- Record `userId`, timestamp, document type, template version, serial number, and generation reason
- Expose audit entries via admin panel with filtering (by user, date, doc type)

---

### 2.5 QR-Code Verification & Document Invalidation

**QR-Code Embedding**
- Generate unique token per document; embed QR code in document footer
- QR directs to verification URL `/verify?token=<token>`

**Verification Service**
- `GET /api/verify?token=<token>` returns `{ status, issuedBy, date, remarks }`
- Display validation page showing "Valid" or "Invalid" with metadata and remarks

**Invalidate Document**
- Admin can `POST /api/invalidate` with `{ token, remark }`, changing status to "invalid"
- Invalidation logs user, timestamp, and reason; notifies issuer via email

---

## User Flows

| Step | Success Path | Edge Cases & Handling |
|------|-------------|----------------------|
| 1. Upload Template | Admin uploads valid PDF → placeholders extracted → template saved | File too large/invalid → display error; manual tagging fallback |
| 2. Enter Data | Dynamic form generated → user fills required fields → validation passes | Missing required field → block next; invalid date format → inline error |
| 3. Merge & Proofread | System merges data → draft PDF displayed → grammar errors highlighted | API timeout → fallback to manual review; unsupported language → disable suggestions |
| 4. Apply Letterhead | User confirms draft → enters PIN → letterhead & serial applied | PIN incorrect thrice → lock generation; letterhead asset missing → use default header |
| 5. Finalize & Download | Final PDF with QR & metadata downloads; audit log entry created | Storage failure → retry logic; network error → alert user |
| 6. Verify Document | Third-party scans QR → verification page shows valid status | Invalid token → show "Not Found"; document invalidated → show "Invalid" with remark |
| 7. Invalidate Document | Admin invalidates via panel → status updated → issuer notified | Concurrent invalidation → idempotent update; missing token → error message |

---

## Tech Stack

### Backend (`apps/server`)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js 5 |
| Language | TypeScript 5 |
| ORM | Prisma 7 |
| Database | PostgreSQL (via `pg`) |
| Cache / Queue Broker | Redis (BullMQ) |
| File Storage | AWS S3 (`@aws-sdk/client-s3`) |
| Email | Nodemailer 7 + EJS templates |
| PDF Processing | `pdf-lib`, `pdf-parse`, `pdf-to-img`, Tesseract.js |
| AI | Google Gemini (`@google/generative-ai`) |
| NLP | `node-nlp` |
| Real-time | Socket.IO 4 |
| Validation | Zod |
| Auth | JWT + bcrypt |

### Frontend (`apps/web`)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Auth | next-auth 4 |
| PDF Viewer | `react-pdf` / `pdfjs-dist` |
| Canvas Editor | Fabric.js 6 |
| Rich Text | Tiptap 3 |
| Signatures | `react-signature-canvas` |
| UI Components | `@workspace/ui` (shadcn/ui), Radix UI, `@tabler/icons-react`, `lucide-react` |
| Animations | Motion (Framer Motion) |
| Toasts | Sonner |
| HTTP Client | Axios |
| Real-time | Socket.IO Client 4 |

### Shared Packages

| Package | Contents |
|---------|----------|
| `packages/ui` | Shared shadcn/ui component library |
| `packages/eslint-config` | Shared ESLint configs |
| `packages/typescript-config` | Shared `tsconfig.json` base configs |

---

## Monorepo Structure

```
docu-genius/
├── apps/
│   ├── server/                   # Express API server
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Database schema
│   │   │   └── migrations/       # Prisma migration history
│   │   └── src/
│   │       ├── app.ts            # Express app setup (routes, middleware)
│   │       ├── server.ts         # HTTP server entry point
│   │       ├── config/           # AWS, mail, multer, rate-limit, Redis, WebSocket configs
│   │       ├── controllers/      # Request handlers
│   │       ├── services/         # Business logic
│   │       ├── routes/           # Route definitions
│   │       ├── middleware/       # Auth, error handling, etc.
│   │       ├── queues/           # BullMQ queue definitions
│   │       ├── workers/          # BullMQ worker processors
│   │       ├── schemas/          # Zod validation schemas
│   │       ├── types/            # TypeScript type definitions
│   │       └── lib/
│   │           ├── helper.ts
│   │           └── views/emails/ # EJS email templates
│   └── web/                      # Next.js frontend
│       ├── app/                  # App Router pages
│       │   ├── (auth)/           # Login, register pages
│       │   ├── (dashboard)/      # Main app pages
│       │   ├── (onboarding)/     # Org setup flow
│       │   └── verification/     # Public document verification
│       ├── components/
│       │   ├── features/         # Feature-specific components
│       │   ├── layout/           # Layout components (Sidebar, etc.)
│       │   └── shared/           # Reusable UI components
│       ├── actions/              # Next.js Server Actions
│       ├── contexts/             # React contexts (OrganizationContext)
│       ├── hooks/                # Custom React hooks
│       ├── providers/            # Auth, theme, global providers
│       └── lib/                  # API endpoints, env helpers
├── packages/
│   ├── ui/                       # Shared component library
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json                    # Turborepo pipeline config
├── pnpm-workspace.yaml
└── package.json
```

---

## Data Models

### User
- Email/password auth with email verification and password reset
- Optional `document_generation_pin` for protected document generation

### Organization
- Has an owner (`organization_head`), a PIN, and many members
- Members have a `MemberRole`: `ADMIN` or `CREATOR`

### Template
- Uploaded PDF stored in S3
- Status lifecycle: `UPLOADING` → `PROCESSING` → `READY` → `COMPLETED` / `FAILED`
- Types: `TEXT_PDF`, `SCANNED_PDF`, `IMAGE`
- Categories: `GENERAL`, `LEGAL`, `FINANCE`, `HR`, `MARKETING`, `SALES`, `OTHER`
- Supports temporary templates with expiry

### TemplateField
- Defines a form field on a template
- Types: `TEXT`, `DATE`, `NUMBER`, `EMAIL`, `PHONE`, `ADDRESS`, `SIGNATURE`, `CUSTOM`
- Stores canvas position data as JSON

### GeneratedDocument
- A filled instance of a template, stored in S3
- Linked to the generating user and organization
- Has a unique `document_number` for public verification

### OrganizationInvite
- Token-based invitation with expiry and status: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`

---

## API Routes

All routes are prefixed as shown. Authentication is required unless noted.

| Method | Path | Description |
|--------|------|-------------|
| `*` | `/api/auth/*` | next-auth authentication endpoints |
| `*` | `/api/v1/organization/*` | Organization CRUD, members, invitations |
| `*` | `/api/templates/*` | Template upload, processing, field management |
| `*` | `/api/pdf-editor/*` | Canvas-based PDF field editor |
| `*` | `/api/generated-documents/*` | Document generation, listing, deletion |
| `POST` | `/api/generated-documents/:id/email` | Email a generated document |
| `GET` | `/verification/:documentNumber` | Public document verification (rate-limited: 30 req / 15 min) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database
- Redis server
- AWS S3 bucket
- SMTP email account

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd docu-genius

# Install all dependencies
pnpm install
```

### Database Setup

```bash
cd apps/server

# Apply migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

---

## Environment Variables

Create a `.env` file in `apps/server/` with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/docugenius"

# JWT
JWT_SECRET="your-jwt-secret"

# AWS S3
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_REGION="eu-north-1"
AWS_S3_BUCKET_NAME="your-bucket-name"

# Redis
REDIS_URL="redis://localhost:6379"

# SMTP Email
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="DocuGenius <noreply@example.com>"

# App
PORT=5000
CLIENT_URL="http://localhost:3000"
```

Create a `.env.local` file in `apps/web/` with:

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

NEXT_PUBLIC_API_URL="http://localhost:5000"
```

---

## Development

Run both apps in parallel using Turborepo:

```bash
# From the root
pnpm dev
```

Or run individually:

```bash
# Backend only
cd apps/server && pnpm dev

# Frontend only
cd apps/web && pnpm dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:3000`.

---

## Build

```bash
# Build all apps
pnpm build

# Build backend only (generates Prisma client, compiles TS, copies EJS views)
cd apps/server && pnpm build

# Build frontend only
cd apps/web && pnpm build
```
