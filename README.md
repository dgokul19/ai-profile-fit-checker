# Resume–Job Fit Analyzer

> Next.js 16 (TypeScript) &bull; Groq Llama 3.3 &bull; Grounded Career Intelligence

---

## 1. Overview

The **Resume–Job Fit Analyzer** allows job seekers applying to multiple positions to instantly evaluate fit, identify missing must-have vs. nice-to-have skills, review evidence-grounded alignments, and interact with a conversational career coach with zero fabricated experience.

### Core Guarantees
1. **Never Invent Experience**: If a skill or qualification is not found in the resume, it is explicitly reported as `"not found in your resume"`.
2. **Deterministic Scoring**: Scores are mathematically computed in code (`70% Must-haves + 20% Nice-to-haves + 10% Seniority Fit`), never guessed by an LLM.
3. **Cites Real Evidence**: All requirement matches cite the exact quote from the resume and verify it via fuzzy matching.
4. **Sub-30-Second Turnaround**: All target job matches execute concurrently in parallel using Groq's high-speed inference engine.

---

## 2. Architecture & Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Parse    │ ──> │ 2. Structure │ ──> │  3. Match    │ ──> │  4. Score    │ ──> 5. Chat &
│  PDF / DOCX  │     │ Groq + Zod   │     │ Multi-Job LLM│     │ Deterministic│     Dashboard
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

- **Stage 1 (Parse)**: `pdf-parse` & `mammoth` extract text on the server.
- **Stage 2 (Structure)**: Groq (Llama 3.3) converts raw resume and job postings into strict, validated Zod schemas.
- **Stage 3 (Match)**: Concurrent evaluation of all jobs against the resume, returning met/partial/missing statuses with exact quote citations.
- **Stage 4 (Score)**: Mathematical scoring formula executed in TypeScript:
  $$\text{Score} = (0.70 \times \text{MustHaves}) + (0.20 \times \text{NiceToHaves}) + (0.10 \times \text{Seniority})$$
- **Stage 5 (Chat)**: SSE streaming endpoint grounded in resume data, job specs, and verified match tables.

---

## 3. Quick Start (Local Development)

### 1. Setup Environment
```bash
cp .env.example .env.local
```
Add your free Groq API key in `.env.local`:
```ini
GROQ_API_KEY=gsk_...
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Tip:** You can click the **"Load Sample Data"** button in the top navigation to test the full end-to-end matching and scoring in 1 click using the included test candidate (Alex Rivera) and 3 target roles.

---

## 4. API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/upload` | `POST` | Uploads and structures resume or job posting (multipart/form-data or JSON) |
| `/api/analyze` | `POST` | Executes parallel matching and scoring for all jobs in session |
| `/api/chat` | `POST` | Server-Sent Events (SSE) streaming chat grounded in session context |
| `/api/job/[id]` | `DELETE` | Removes a job posting from the active session |
| `/api/session/[id]` | `GET/DELETE` | Retrieves or clears active session state |

---

## 5. Test Datasets

Pre-configured sample files are located in `test-data/`:
- **Resume**: `test-data/resumes/senior-fullstack-engineer.txt`
- **Job 1 (High Match - ~85%)**: `test-data/jobs/job1-senior-fullstack.txt` (TypeScript, React, Next.js, Node.js)
- **Job 2 (Low Match / Platform - ~30%)**: `test-data/jobs/job2-devops-platform.txt` (Kubernetes, Terraform, Go)
- **Job 3 (Mid Match / Staff - ~65%)**: `test-data/jobs/job3-staff-frontend.txt` (Staff level, Design Systems)
