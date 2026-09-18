export interface ParsedSearchQuery {
  rawQuery: string;
  cleanedTextQuery: string | null;
  yearExact: number | null;
  yearStart: number | null;
  yearEnd: number | null;
  branchAliases: string[] | null;
  countryAliases: string[] | null;
  companyAliases: string[] | null;
  detectedPills: Array<{ label: string; type: 'year' | 'range' | 'branch' | 'country' | 'company' }>;
}

const BRANCH_ALIASES: Record<string, string[]> = {
  'cse': ['Computer Science', 'Computer Science and Engineering', 'CSE'],
  'ise': ['Information Science', 'Information Science and Engineering', 'ISE'],
  'ece': ['Electronics and Communication', 'Electronics and Communication Engineering', 'ECE'],
  'eee': ['Electrical and Electronics', 'Electrical and Electronics Engineering', 'Electronics and Electrical Engineering', 'EEE'],
  'aiml': ['Artificial Intelligence and Machine Learning', 'Artificial Intelligence', 'AIML'],
  'ai&ml': ['Artificial Intelligence and Machine Learning', 'Artificial Intelligence', 'AI&ML'],
  'ai/ml': ['Artificial Intelligence and Machine Learning', 'Artificial Intelligence', 'AI/ML'],
  'mech': ['Mechanical Engineering', 'Mechanical', 'MECH'],
  'civil': ['Civil Engineering', 'Civil'],
};

const COUNTRY_ALIASES: Record<string, string[]> = {
  'usa': ['United States', 'United States of America', 'USA', 'US'],
  'us': ['United States', 'United States of America', 'USA', 'US'],
  'uk': ['United Kingdom', 'UK', 'Great Britain', 'England'],
  'uae': ['United Arab Emirates', 'UAE', 'Dubai'],
};

const COMPANY_ALIASES: Record<string, string[]> = {
  'aws': ['Amazon Web Services', 'AWS', 'Amazon'],
  'amazon web services': ['Amazon Web Services', 'AWS', 'Amazon'],
  'msft': ['Microsoft', 'MSFT'],
  'gcp': ['Google Cloud', 'Google', 'GCP'],
};

const CITY_ALIASES: Record<string, string[]> = {
  'bengaluru': ['Bengaluru', 'Bangalore'],
  'bangalore': ['Bengaluru', 'Bangalore'],
};

/**
 * Deterministic, conservative search input parser for alumni discovery.
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      rawQuery: '',
      cleanedTextQuery: null,
      yearExact: null,
      yearStart: null,
      yearEnd: null,
      branchAliases: null,
      countryAliases: null,
      companyAliases: null,
      detectedPills: []
    };
  }

  let workingStr = trimmed;
  let yearExact: number | null = null;
  let yearStart: number | null = null;
  let yearEnd: number | null = null;
  const branchAliasesSet = new Set<string>();
  const countryAliasesSet = new Set<string>();
  const companyAliasesSet = new Set<string>();
  const detectedPills: ParsedSearchQuery['detectedPills'] = [];

  // 1. Detect Year Range: e.g. "2015-2019" or "2015 - 2019" or "2015 to 2019"
  const rangeMatch = workingStr.match(/\b(19\d{2}|20\d{2})\s*(?:-|to)\s*(19\d{2}|20\d{2})\b/i);
  if (rangeMatch) {
    const y1 = parseInt(rangeMatch[1], 10);
    const y2 = parseInt(rangeMatch[2], 10);
    yearStart = Math.min(y1, y2);
    yearEnd = Math.max(y1, y2);
    detectedPills.push({ label: `Batch Span: ${yearStart}–${yearEnd}`, type: 'range' });
    workingStr = workingStr.replace(rangeMatch[0], ' ').trim();
  }

  // 2. Detect Single 4-digit Year: e.g. "2019" or "batch 2022"
  if (!yearStart && !yearEnd) {
    const singleYearMatch = workingStr.match(/\b(19\d{2}|20\d{2})\b/);
    if (singleYearMatch) {
      yearExact = parseInt(singleYearMatch[1], 10);
      detectedPills.push({ label: `Year: ${yearExact}`, type: 'year' });
      workingStr = workingStr.replace(singleYearMatch[0], ' ').trim();
    }
  }

  // 3. Tokenize words to test for conservative aliases
  const tokens = workingStr.split(/\s+/).filter(Boolean);
  const remainingTokens: string[] = [];

  for (const token of tokens) {
    const lowerToken = token.toLowerCase().replace(/[^a-z0-9&/]/g, '');
    let matched = false;

    // Check branch alias
    if (BRANCH_ALIASES[lowerToken]) {
      BRANCH_ALIASES[lowerToken].forEach(a => branchAliasesSet.add(a));
      detectedPills.push({ label: `Branch: ${token.toUpperCase()}`, type: 'branch' });
      matched = true;
    }

    // Check country alias
    if (COUNTRY_ALIASES[lowerToken]) {
      COUNTRY_ALIASES[lowerToken].forEach(a => countryAliasesSet.add(a));
      detectedPills.push({ label: `Country: ${token.toUpperCase()}`, type: 'country' });
      matched = true;
    }

    // Check company alias
    if (COMPANY_ALIASES[lowerToken]) {
      COMPANY_ALIASES[lowerToken].forEach(a => companyAliasesSet.add(a));
      detectedPills.push({ label: `Company: ${token.toUpperCase()}`, type: 'company' });
      matched = true;
    }

    // Check city aliases (e.g. Bangalore <-> Bengaluru)
    if (CITY_ALIASES[lowerToken]) {
      CITY_ALIASES[lowerToken].forEach(a => companyAliasesSet.add(a));
      matched = true;
      remainingTokens.push(token); // Keep token for general search as well
    }

    if (!matched) {
      remainingTokens.push(token);
    }
  }

  const cleanedTextQuery = remainingTokens.join(' ').trim() || null;

  return {
    rawQuery: trimmed,
    cleanedTextQuery,
    yearExact,
    yearStart,
    yearEnd,
    branchAliases: branchAliasesSet.size > 0 ? Array.from(branchAliasesSet) : null,
    countryAliases: countryAliasesSet.size > 0 ? Array.from(countryAliasesSet) : null,
    companyAliases: companyAliasesSet.size > 0 ? Array.from(companyAliasesSet) : null,
    detectedPills
  };
}
