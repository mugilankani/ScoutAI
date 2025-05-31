// Helper: Compute similarity score between two candidates (not used in current logic, but available for future use)
export function matchScore(a, b) {
  let score = 0;
  if (
    a?.profiles?.github &&
    b?.profiles?.github &&
    a.profiles.github === b.profiles.github
  )
    score += 0.5;
  if (
    a?.profiles?.linkedin &&
    b?.profiles?.linkedin &&
    a.profiles.linkedin === b.profiles.linkedin
  )
    score += 0.2;
  if (a.email && b.email && a.email === b.email) score += 0.2;
  const aSkills = (a.skills || []).slice(0, 2);
  const bSkills = (b.skills || []).slice(0, 2);
  if (
    aSkills.length &&
    bSkills.length &&
    aSkills.some((skill) => bSkills.includes(skill))
  )
    score += 0.1;
  return score;
}
