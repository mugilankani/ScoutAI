import crypto from "crypto";
import { matchScore } from "./matchScore.js";

export function generateFingerprint(candidate) {
  // Priority: email > linkedin > github
  const email = candidate?.email || "";
  const linkedin = candidate?.profiles?.linkedin || "";
  const github = candidate?.profiles?.github || "";

  let base = "";
  if (email) {
    base = email;
  } else if (linkedin) {
    base = linkedin;
  } else if (github) {
    base = github;
  } else {
    throw new Error(
      "Cannot generate fingerprint: missing github, linkedin, and email."
    );
  }

  // Optionally, add top skills for more uniqueness
  const topSkills = (candidate.skills || []).slice(0, 2).join("");
  base += topSkills;

  console.log("Generating fingerprint for candidate:", base);
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

/**
 * Find candidate index by fingerprint in a list.
 * @param {Array} candidates - Array of candidate objects.
 * @param {Object} candidate - Candidate object to check.
 * @returns {number} Index if found, -1 otherwise.
 */
export function findCandidateIndexByFingerprint(candidates, candidate) {
  const fingerprint = generateFingerprint(candidate);
  return candidates.findIndex((c) => generateFingerprint(c) === fingerprint);
}

/**
 * Add or update candidate in the list based on fingerprint.
 * If exists, update the candidate data. If not, add as new.
 * @param {Array} candidates - Array of candidate objects.
 * @param {Object} candidate - Candidate object to add or update.
 * @returns {Array} Updated candidates array.
 */
export function upsertCandidateByFingerprint(candidates, candidate) {
  const idx = findCandidateIndexByFingerprint(candidates, candidate);
  if (idx !== -1) {
    // Update existing candidate
    candidates[idx] = { ...candidates[idx], ...candidate };
  } else {
    // Optionally: check for similar candidates using matchScore
    // const similar = candidates.find(c => matchScore(c, candidate) > 0.7);
    // if (similar) { /* handle possible duplicate */ }
    candidates.push(candidate);
  }
  return candidates;
}
