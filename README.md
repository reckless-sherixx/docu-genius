# DocuGenius

**DocuGenius** is a Document Generation & Management Platform that streamlines the creation, customization, and tracking of organizational documents — such as agreements, offer letters, and NDAs — using PDF templates and centralized data entry.

Users upload a company-branded PDF template, define fillable fields via a canvas-based editor, generate completed documents through a PIN-authenticated workflow, and share or verify them securely.

---

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Data Models](#data-models)
- [API Routes](#api-routes)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Build](#build)

---

## Screenshots

### Dashboard
![Dashboard Overview](./docs/screenshots/dashboard.png)

### PDF Editor
![PDF Canvas Editor](./docs/screenshots/pdf-editor.png)

### Template Upload
![Template Upload Flow](./docs/screenshots/template-upload.png)

### Document Generation
![Document Generation](./docs/screenshots/document-generation.png)

#### How to Add Images

1. Create a `docs/screenshots/` folder in the root of the repository if it doesn't exist.
2. Place your screenshot images (`.png`, `.jpg`, `.gif`) in the `docs/screenshots/` folder.
3. Use the following Markdown syntax to embed an image in the README:

```markdown
![Alt text describing the image](./docs/screenshots/image-name.png)
```

**Example:**
- `![Dashboard Overview](./docs/screenshots/dashboard.png)` — embeds dashboard.png with the alt text "Dashboard Overview"

**Tips:**
- Always include descriptive alt text for accessibility.
- Use relative paths starting with `./` so images work on GitHub, GitHub Pages, and locally.
- Keep image file sizes under 1 MB for faster page loads.
- Use PNG for UI screenshots, GIF for animations.

---

## Features

### Template Management
- Upload PDF files (direct upload or presigned S3 URL flow)
- Automatic OCR processing via Tesseract.js to extract text from scanned PDFs
- Background queue processing (BullMQ + Redis) with real-time status updates via Socket.IO
- Classify templates by category: `GENERAL`, `LEGAL`, `FINANCE`, `HR`, `MARKETING`, `SALES`, `OTHER`
- Template approval workflow — admins approve templates before they are available for use
- Support for `TEXT_PDF`, `SCANNED_PDF`, and `IMAGE` template types

### PDF Field Editor
- Canvas-based editor (Fabric.js) to visually position and configure form fields on PDFs
- Add and place text fields, image overlays, and signature fields
- Text highlighting support
- Save field configurations permanently to a template or as an editable draft
- Field types: `TEXT`, `DATE`, `NUMBER`, `EMAIL`, `PHONE`, `ADDRESS`, `SIGNATURE`, `CUSTOM`

### Document Generation
- Generate filled documents from approved templates via the PDF editor
- Rate-limited generation endpoint to prevent abuse
- PIN authentication required before finalizing a document (`document_generation_pin` per user)
- Generated documents stored in AWS S3 with unique document numbers

### Generated Document Management
- List all generated documents scoped to an organization
- Delete documents (removes from S3 and database)
- Email documents to recipients with a custom subject, message body, and a 24-hour presigned S3 download link
- Only the document generator or an org `ADMIN` can email a document

### Document Verification
- Public verification endpoint — no authentication required
- Look up any document by its unique document number
- Rate-limited: 30 requests per 15 minutes per IP

### Organizations & Role-Based Access Control
- Create organizations with a PIN and description
- Join an existing organization using the organization PIN
- Two roles per organization: `ADMIN` and `CREATOR`
  - `ADMIN` — full access including template upload, creation logs, member management
  - `CREATOR` — can generate documents; cannot upload templates or view creation logs
- Manage members: view, update roles, remove members

### Authentication
- Email/password registration with email verification flow
- JWT-based session authentication
- Password reset via email token
- Secure bcrypt password hashing

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
- Email/password authentication with email verification and password reset
- Optional `document_generation_pin` for PIN-authenticated document generation

### Organization
- Has an owner (`organization_head`), a numeric PIN for joining, and a description
- Members are linked via `OrganizationMember` with a `MemberRole`

### OrganizationMember
- Links a user to an organization with a role: `ADMIN` or `CREATOR`
- Unique constraint on `(organization_id, user_id)`

### Template
- Uploaded PDF stored in S3 (`s3_key`, `s3_url`)
- Status lifecycle: `UPLOADING` → `PROCESSING` → `READY` → `COMPLETED` / `FAILED`
- Types: `TEXT_PDF`, `SCANNED_PDF`, `IMAGE`
- Categories: `GENERAL`, `LEGAL`, `FINANCE`, `HR`, `MARKETING`, `SALES`, `OTHER`
- Stores extracted OCR text, page count, and processing timestamps
- Supports temporary templates with expiry (`is_temporary`, `expires_at`)
- Approval tracking: `is_approved`, `approved_by`, `approved_at`

### TemplateField
- A form field positioned on a template canvas
- Types: `TEXT`, `DATE`, `NUMBER`, `EMAIL`, `PHONE`, `ADDRESS`, `SIGNATURE`, `CUSTOM`
- Stores canvas position and size as JSON (`position_data`)

### GeneratedDocument
- A filled instance of a template, stored in S3
- Linked to the generating user and organization
- Unique `document_number` used for public verification

---

## API Routes

All routes require JWT authentication unless noted.

### Auth — `/api/auth/*`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/verify-email` | Verify email address |
| `POST` | `/api/auth/forgot-password` | Request password reset email |
| `POST` | `/api/auth/reset-password` | Reset password via token |

### Organizations — `/api/v1/organization`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/organization` | Get all organizations for the current user |
| `POST` | `/api/v1/organization` | Create a new organization |
| `POST` | `/api/v1/organization/join` | Join an organization via PIN |
| `GET` | `/api/v1/organization/:id/members` | List members of an organization |
| `PATCH` | `/api/v1/organization/:id/members/:memberId/role` | Update a member's role |
| `DELETE` | `/api/v1/organization/:id/members/:memberId` | Remove a member |

### Templates — `/api/templates`
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/templates/upload` | Direct PDF upload (multipart) |
| `POST` | `/api/templates/presigned-url` | Get presigned S3 URL for upload |
| `POST` | `/api/templates/confirm-upload` | Confirm presigned upload and start processing |
| `GET` | `/api/templates` | List templates for an organization |
| `GET` | `/api/templates/:id` | Get a single template |
| `PUT` | `/api/templates/:id/approve` | Approve a template (ADMIN only) |
| `DELETE` | `/api/templates/:id` | Delete a template |

### PDF Editor — `/api/pdf-editor`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/pdf-editor/:id/open` | Open a template for editing |
| `GET` | `/api/pdf-editor/:id/download` | Download an edited PDF |
| `POST` | `/api/pdf-editor/save` | Save canvas edits |
| `POST` | `/api/pdf-editor/prepare-editable` | Prepare an editable copy of a template |
| `POST` | `/api/pdf-editor/save-editable` | Save an editable copy |
| `POST` | `/api/pdf-editor/add-text` | Add a text element to the PDF |
| `POST` | `/api/pdf-editor/add-image` | Add an image element |
| `POST` | `/api/pdf-editor/add-signature` | Add a signature element |
| `POST` | `/api/pdf-editor/highlight` | Highlight text in the PDF |
| `POST` | `/api/pdf-editor/save-permanent` | Permanently save template with field config |
| `POST` | `/api/pdf-editor/generate-document` | Generate a filled document (rate-limited) |

### Generated Documents — `/api/generated-documents`
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/generated-documents/:organizationId` | List all documents for an organization |
| `DELETE` | `/api/generated-documents/:id` | Delete a generated document |
| `POST` | `/api/generated-documents/:id/email` | Email a document with custom subject and body |

### Verification — `/verification` (public)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/verification/:documentNumber` | Verify a document by its number (30 req / 15 min) |

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
