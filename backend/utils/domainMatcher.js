/**
 * Universal Dynamic Domain Matcher
 * Automatically matches domain admins against student verticals, departments, or task domains.
 * Works dynamically for all existing domains and any newly added domains by org_admin.
 */

const STOP_WORDS = new Set(["and", "the", "lab", "of", "for", "in", "to", "school", "department", "dept", "soi"]);

// Standard prefix map for known 2-letter codes
const PREFIX_MAP = {
  ad: ["ai", "data", "science"],
  bw: ["blockchain", "web3", "web30"],
  cd: ["cloud", "devops"],
  cs: ["cyber", "security"],
  ei: ["embedded", "iot", "systems"],
  fw: ["fullstack", "full", "stack", "web"],
  ma: ["manufacturing", "automation", "design"],
  dma: ["manufacturing", "automation", "design"],
};

function normalizeText(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim();
}

function extractPrefix(str) {
  const norm = normalizeText(str);
  // Match prefix patterns like "AD - ...", "BW - ...", "AD: ...", "AD ..."
  const match = norm.match(/^([a-z]{2,4})\s*[-:]\s*/i);
  if (match) {
    return match[1].toLowerCase();
  }
  return null;
}

function tokenize(str) {
  const norm = normalizeText(str);
  // split by non-alphanumeric
  const words = norm.split(/[^a-z0-9]+/);
  return words.filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

function isDynamicDomainMatch(adminDomain, targetStr) {
  if (!adminDomain || !targetStr) return false;

  const aNorm = normalizeText(adminDomain);
  const tNorm = normalizeText(targetStr);

  if (aNorm === "all" || tNorm === "all") return true;
  if (aNorm === tNorm) return true;

  // Clean alphanumeric check
  const aClean = aNorm.replace(/[^a-z0-9]/g, "");
  const tClean = tNorm.replace(/[^a-z0-9]/g, "");
  if (aClean === tClean) return true;

  // Check prefix matching (e.g. AD, BW, CD, CS, EI, FW, MA)
  const aPrefix = extractPrefix(adminDomain);
  const tPrefix = extractPrefix(targetStr);

  if (aPrefix && tPrefix && aPrefix === tPrefix) {
    return true;
  }

  // If target has a prefix (e.g. tPrefix = 'ad'), check if adminDomain keywords match the prefix map
  if (tPrefix && PREFIX_MAP[tPrefix]) {
    const mapWords = PREFIX_MAP[tPrefix];
    const aTokens = tokenize(adminDomain);
    if (aTokens.some((tok) => mapWords.includes(tok) || tok === tPrefix)) {
      return true;
    }
  }

  if (aPrefix && PREFIX_MAP[aPrefix]) {
    const mapWords = PREFIX_MAP[aPrefix];
    const tTokens = tokenize(targetStr);
    if (tTokens.some((tok) => mapWords.includes(tok) || tok === aPrefix)) {
      return true;
    }
  }

  // Word boundary regex matching for tokens
  const aTokens = tokenize(adminDomain);
  const tTokens = tokenize(targetStr);

  if (aTokens.length === 0 || tTokens.length === 0) return false;

  // Count matching tokens (excluding short generic ones)
  let matchCount = 0;
  for (const aTok of aTokens) {
    if (aTok.length < 2) continue;

    // Check exact token match in target tokens
    if (tTokens.includes(aTok)) {
      matchCount++;
      continue;
    }

    // Check token with word boundaries against raw target string
    const regex = new RegExp(`\\b${aTok}\\b`, "i");
    if (regex.test(tNorm)) {
      matchCount++;
    }
  }

  // If at least one distinct non-stop keyword matches, return true
  if (matchCount > 0) {
    return true;
  }

  return false;
}

module.exports = {
  isDynamicDomainMatch,
  tokenize,
  normalizeText,
};
