import { getGroqClient, runWithModelFailover } from "./groq";
import { StructuredResumeSchema, type StructuredResume } from "@/types/resume";
import { StructuredJobSchema, type StructuredJob } from "@/types/job";
import { STRUCTURE_RESUME_PROMPT } from "@/prompts/structure-resume";
import { STRUCTURE_JOB_PROMPT } from "@/prompts/structure-job";

function normalizeResumeJson(raw: any): any {
  if (!raw || typeof raw !== "object") return {};
  const expRaw = raw.experience || raw.work_experience || raw.workExperience || raw.employment || raw.history || [];
  const eduRaw = raw.education || raw.academic || raw.academics || [];
  const certRaw = raw.certifications || raw.certificates || [];
  const achRaw = raw.achievements || raw.awards || raw.honors || [];
  const skillsRaw = raw.skills || raw.technicalSkills || raw.coreSkills || [];

  return {
    candidateName:
      raw.candidateName || raw.candidate_name || raw.name || raw.fullName || "Candidate",
    summary:
      raw.summary || raw.profile || raw.about || raw.objective || raw.bio || "",
    skills: Array.isArray(skillsRaw)
      ? skillsRaw.map((s: any) =>
          typeof s === "string"
            ? { name: s, category: "technical", yearsOfExperience: null, evidenceQuote: s }
            : {
                name: s?.name || s?.skill || String(s || ""),
                category: s?.category || "technical",
                yearsOfExperience: s?.yearsOfExperience ?? s?.years ?? null,
                evidenceQuote: s?.evidenceQuote || s?.quote || s?.evidence || "",
              }
        )
      : [],
    experience: Array.isArray(expRaw)
      ? expRaw.map((e: any) => ({
          title: e?.title || e?.role || e?.position || "Role",
          company: e?.company || e?.organization || e?.employer || "Company",
          duration: e?.duration || e?.period || e?.dates || "",
          responsibilities: Array.isArray(e?.responsibilities)
            ? e.responsibilities.map(String)
            : Array.isArray(e?.duties)
            ? e.duties.map(String)
            : [],
          achievements: Array.isArray(e?.achievements)
            ? e.achievements.map(String)
            : [],
        }))
      : [],
    education: Array.isArray(eduRaw)
      ? eduRaw.map((ed: any) => ({
          degree: ed?.degree || ed?.qualification || "",
          institution: ed?.institution || ed?.university || ed?.college || ed?.school || "",
          year: ed?.year ? String(ed.year) : null,
          field: ed?.field || ed?.major || null,
        }))
      : [],
    certifications: Array.isArray(certRaw)
      ? certRaw.map((c: any) => (typeof c === "string" ? c : c?.name || c?.title || String(c || "")))
      : [],
    achievements: Array.isArray(achRaw)
      ? achRaw.map((a: any) => (typeof a === "string" ? a : a?.title || a?.description || String(a || "")))
      : [],
  };
}

function normalizeJobJson(raw: any): any {
  if (!raw || typeof raw !== "object") return {};
  const mustRaw = raw.mustHaveSkills || raw.requiredSkills || raw.mustHave || [];
  const niceRaw = raw.niceToHaveSkills || raw.preferredSkills || raw.niceToHave || [];
  const respRaw = raw.responsibilities || raw.duties || [];
  const qualRaw = raw.qualifications || raw.requirements || [];

  return {
    title: raw.title || raw.jobTitle || raw.role || "Target Role",
    company: raw.company || raw.organization || null,
    seniorityLevel: raw.seniorityLevel || raw.seniority || raw.level || "mid",
    mustHaveSkills: Array.isArray(mustRaw)
      ? mustRaw.map((s: any) =>
          typeof s === "string"
            ? { name: s, category: "technical", evidenceQuote: s }
            : {
                name: s?.name || s?.skill || String(s || ""),
                category: s?.category || "technical",
                evidenceQuote: s?.evidenceQuote || s?.quote || "",
              }
        )
      : [],
    niceToHaveSkills: Array.isArray(niceRaw)
      ? niceRaw.map((s: any) =>
          typeof s === "string"
            ? { name: s, category: "technical", evidenceQuote: s }
            : {
                name: s?.name || s?.skill || String(s || ""),
                category: s?.category || "technical",
                evidenceQuote: s?.evidenceQuote || s?.quote || "",
              }
        )
      : [],
    responsibilities: Array.isArray(respRaw) ? respRaw.map(String) : [],
    qualifications: Array.isArray(qualRaw) ? qualRaw.map(String) : [],
  };
}

async function callGroqForJson<T>(
  systemPrompt: string,
  userContent: string,
  parser: (data: unknown) => T,
  operationName: string = "Groq Structuring"
): Promise<T> {
  const client = getGroqClient();

  const { result } = await runWithModelFailover(async (model) => {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: `${systemPrompt}\n\nIMPORTANT: You must return valid JSON only.` },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const text = response.choices[0]?.message?.content || "";
    if (!text) {
      throw new Error(`Empty response from model ${model}`);
    }

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    const rawMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (rawMatch) {
      jsonStr = rawMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    return parser(parsed);
  }, operationName);

  return result;
}

export async function structureResume(resumeText: string): Promise<StructuredResume> {
  return callGroqForJson(
    STRUCTURE_RESUME_PROMPT,
    `Here is the resume text to parse:\n\n${resumeText}`,
    (data) => {
      const normalized = normalizeResumeJson(data);
      return StructuredResumeSchema.parse(normalized);
    },
    "Resume Structuring"
  );
}

export async function structureJob(jobText: string): Promise<StructuredJob> {
  return callGroqForJson(
    STRUCTURE_JOB_PROMPT,
    `Here is the job posting text to parse:\n\n${jobText}`,
    (data) => {
      const normalized = normalizeJobJson(data);
      return StructuredJobSchema.parse(normalized);
    },
    "Job Structuring"
  );
}
