import crypto from "crypto";

export function generateFingerprint(candidate) {
  const github = candidate?.profiles?.github || "";
  const linkedin = candidate?.profiles?.linkedin || "";
  const email = candidate?.email || "";
  const topSkills = (candidate.skills || []).slice(0, 2).join("");
  const base = github + linkedin + email + topSkills;
  return crypto.createHash("sha256").update(base).digest("hex");
}

export function addVersionSnapshot(candidate) {
  const now = new Date().toISOString();
  const version = {
    source: candidate.source || "unknown",
    timestamp: now,
    summary: candidate.summary,
    skills: candidate.skills,
    bio: candidate.bio || undefined,
  };
  candidate.versions = candidate.versions || [];
  candidate.versions.push(version);
  return candidate;
}
