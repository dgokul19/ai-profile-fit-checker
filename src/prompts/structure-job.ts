export const STRUCTURE_JOB_PROMPT = `You are a precise job posting parser. Extract structured information from the job posting text below.

CRITICAL RULES:
- Extract ONLY what is explicitly stated in the posting
- Distinguish clearly between must-have (required) and nice-to-have (preferred/bonus) skills
- For evidenceQuote, use the EXACT text from the job posting
- Infer seniority level from title, years required, and responsibilities if not explicitly stated

Return a JSON object matching this exact structure:
{
  "title": "Job Title",
  "company": "Company Name or null",
  "seniorityLevel": "junior" | "mid" | "senior" | "staff" | "lead" | "principal",
  "mustHaveSkills": [
    {
      "name": "skill name",
      "category": "technical/soft/domain/tool",
      "evidenceQuote": "exact text from posting requiring this skill"
    }
  ],
  "niceToHaveSkills": [
    {
      "name": "skill name",
      "category": "technical/soft/domain/tool",
      "evidenceQuote": "exact text from posting mentioning this as preferred/bonus"
    }
  ],
  "responsibilities": ["responsibility 1", ...],
  "qualifications": ["qualification 1", ...]
}`;
