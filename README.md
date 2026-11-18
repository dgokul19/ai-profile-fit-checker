# JobFit Analyzer

A grounded, hallucination-free career intelligence system built with Next.js 16 (App Router), TypeScript, Groq Llama 3.3 (with dynamic multi-model failover), and pure CSS Modules.

---

## 1. Quick Setup Instructions

#### Prerequisites
- **Node.js**: v20+ installed
- **Groq API Key**: Free API key from [Groq Console](https://console.groq.com/keys)

#### Step-by-Step Installation

1. ***Clone the repository and enter the directory***:
   ```bash
   git clone <repo-url>
   cd resume-job-fit-analyzer
   ```

2. ***Install dependencies***:
   ```bash
   npm install
   ```

3. ***Configure Environment Variables***:
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   Add your Groq API key:
   ```ini
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```
  

4. ***Run the Development Server***:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Architecture Overview

FitCheck helps a job seeker see how their resume lines up against several job postings. You upload one resume, add two to five job descriptions, and get a fit score for each role, a list of skill gaps, and a chat where you can ask follow-up questions. The whole app is built with Next.js, so there is one codebase, one language (TypeScript), and one deployment. Nothing is saved after the session ends.

The app consist of  three parts, all inside one Next.js project: the pages you interact with, server-side route handlers that do the analysis, and Groq's language models that do the reading and reasoning.

#### 2.1 User interface (Next.js pages and components)

A single page built with the Next.js App Router, React, and Tailwind CSS. It has four areas:
- **Upload panel:** add your resume as a PDF, a DOCX, or pasted text.
- **Job list:** add, label, and remove job postings (Job #1, Job #2, and so on).
- **Fit dashboard:** one card per job showing the score, the strongest matches, and the biggest gaps.
- **Chat:** ask questions like "What skills am I missing for Job #2?"

#### 2.2 Server logic (Next.js route handlers)

The analysis runs in server-side API routes inside the same project. The browser never talks to Groq directly, so the API key stays on the server. The routes work through your documents in four steps:

Below is a concise, formatted list of the backend APIs used:
#### 2.3 Groq API with fallback models

The language work (structuring, matching, and chat) goes through Groq, using its official TypeScript SDK. To keep the app working when something goes wrong, requests try models in order:

| Order | Model | Role |
|---|---|---|
| 1 | `openai/gpt-oss-120b` | Primary |
| 2 | `llama-3.3-70b-versatile` | First fallback |
| 3 | `llama-3.1-8b-instant` | Last fallback |

If a request fails, hits a rate limit, times out, or returns unusable output, the app retries once after a short pause. It then moves to the next model.  The model list lives in one config file, so it is easy to change when Groq updates its lineup.

#### Setup
- **One project:** pages, route handlers, and shared TypeScript types all live in the same Next.js app.
- **Environment variable:** `GROQ_API_KEY` is

## 3. Production & Scaling 

If taking this prototype into an producttion handling hundreds of thousands of concurrent job seekers, here is how I would architect it:

#### Target architecture
- **Next.js app** (UI and API routes) on Azure Container Apps or App Service
- **Auth:** Microsoft Entra External ID (or Auth.js with OpenID Connect)
- **Database:** PostgreSQL for profiles, resumes, jobs, results, and chat history
- **Blob Storage:** original uploaded files
- **Azure AI Search:** chunk text and vectors for hybrid retrieval
- **LLM gateway:** one module that calls the primary model and falls back on failure
---

## 4.RAG with Azure AI Search & Decisions

**Chunking**
- Split by section, not just length: resume by role, skills, and education; jobs by responsibilities, requirements, and nice-to-haves.
- Aim for about 800 to 1200 tokens per chunk, with 80 to 100 characters overlap on long sections.
- Store metadata on each chunk: `userId`, `docType`, `docId`, `section`, `jobLabel`.

**Embeddings**
- Use `text-embedding-3-small` (1536 dimensions).

**Retrieval**
- Use hybrid search (keyword plus vector) with the semantic ranker( for better accuracy ).
- For each job requirement, retrieve the top resume chunks and send only those to the model.



### Prompt & Context Management
- Structured Prompts: Few-shot schema instructions with strict directives: *"Extract ONLY what is explicitly stated in the text. For any field not clearly present, use empty array. NEVER infer or assume experience."*
- Context Injection for Chat**: The conversational assistant prompt is dynamically compiled from the candidate's verified skills, parsed experience, and the match status table of all loaded jobs. This ensures the chat never has to "guess" which job had which requirement.

---

## 5. Key Technical Decisions part of this prototype

#### 1. Clean up model output before validating it
- **The problem:** AI models don't always return the same JSON shape. One response says `work_experience`, another says `experience`, and sometimes a whole section is missing because the resume doesn't have one.
- ***What we do:*** Two small functions, `normalizeResumeJson` and `normalizeJobJson`, tidy up the output before the Zod schema checks it. They rename known variants and fill in safe defaults for missing fields.
- ***Why it matters:*** Unusual resumes no longer cause validation errors, so users get a result instead of a failure.

#### 2. Stream chat replies with Server-Sent Events (SSE)
- **The problem:** Waiting for a full answer makes the chat feel slow.
- **What we do:** The chat route sends the answer to the browser word by word using SSE.
- **Why it matters:** Users see the answer start immediately, and there is less infrastructure to maintain.

#### 3. Keep session state in one place with `useReducer`
- **The problem:** The resume uploader, job list, fit cards, and chat all depend on the same data. Passing it down through props gets messy fast.
- **What we do:** `SessionContext.tsx` holds the state and updates it through a reducer, so every change follows a clear set of actions.
- **Why it matters:** The screen updates predictably when a resume is uploaded, a job is removed, or a new score arrives, and the code stays easy to follow and debug.
---

## 6. Engineering Standards Followed (and Skipped)

#### Standards Followed
- **Strict TypeScript (No `any` in application logic)**: Every data structure (`Skill`, `Experience`, `RequiredSkill`, `MatchResult`, `Session`) has an explicit TypeScript interface backed by a Zod schema.
- **Zero-Tolerance Hallucination Policy**: If a skill is missing, the system explicitly outputs `"not found in your resume"`.
- **Fail-Safe UI Feedback**: Every asynchronous API action (upload, job addition, analysis, chat post) has visual progress indicators (top shimmer bar, floating banners, button spinners, pulsing check-steps, and shimmering skeletons).
- **Graceful Degradation**: If an LLM rate-limit occurs, the app doesn't crash; it rotates models automatically.

#### Standards Skipped (Intentional for Prototype Scope)
- **Persistent Database**: Used an in-memory session store rather than PostgreSQL to keep local setup to 0 external dependencies (no Docker or DB instances required).
- **Authentication & Multi-Tenancy**: Prototype is session-scoped (ephemeral UUID). Production would require Auth0/Clerk with user-owned resumes and role permissions.
- **Automated E2E Test Suite (Playwright/Cypress)**: Relied on TypeScript compile checks (`tsc --noEmit`), build verification, and manual boundary testing due to prototype delivery time constraints.

---

## 7. How AI Tools Were Used in the Development Process

AI tools helped speed up the work, but the decisions, the requirements, and the review stayed with me. Different Claude models were used for different jobs.

#### Planning (Claude Opus)
- **Idea to design plan:** I used an AI coding tool powered by a Claude Opus model to turn my prototype idea into a clear, well-documented design plan. I wrote the instructions and reviewed every section, so the plan reflects my product decisions.

#### Design (Claude)
- **UI and UX:** I used Claude to design the interface and produce the screens as an image. I then converted that image into working HTML and CSS using sonnet model.
- **Design tokens:** I pulled the colours, corner radii, and type sizes from the `FitAnalyzer` screenshot into CSS Module variables, so the code matches the design.

#### Development (Claude Sonnet)
- **Building the app:** I used Claude Sonnet for the day-to-day development work. It implemented the Next.js pages, route handlers, and components step by step from the design plan.
- **Starter code:** It generated first drafts of the TypeScript interfaces from the product brief, along with the regex patterns for text parsing. I reviewed and adjusted both.
- **Iteration:** I used it for quick fixes, refactors, and small improvements, one task at a time with clear instructions.

### What stayed manual
- Product scope, scoring rules, and architecture choices
- Reviewing and testing all generated code and design output
- Final decisions on what to keep, change, or discard

---
