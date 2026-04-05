/**
 * Index Diachronica API Client
 * 
 * Queries the Index Diachronica database via its search API and provides
 * structured data for the reconstruction algorithm to award bonuses to
 * attested sound changes.
 */

export interface DiachronicaMatch {
  changePattern: string;
  languageFamily: string;
  sourceLanguage: string;
  targetLanguage: string;
  environment?: string;
}

export interface DiachronicaSearchResult {
  query: string;
  totalMatches: number;
  matches: DiachronicaMatch[];
  cached: boolean;
}

export interface AttestedShiftInfo {
  isAttested: boolean;
  attestationCount: number;
  languageFamilies: string[];
  environments: string[];
  bonus: number;
}

const API_BASE = 'https://chridd.nfshost.com/diachronica/search';

// Simple in-memory cache to avoid repeated API calls
const responseCache = new Map<string, { result: DiachronicaSearchResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse HTML response from Index Diachronica search
 * Extracts sound change patterns and language family information
 */
function parseDiachronicaHTML(html: string, query: string): DiachronicaSearchResult {
  const matches: DiachronicaMatch[] = [];
  let totalMatches = 0;

  // Extract total match count
  const matchCountMatch = html.match(/(\d+)\s+match/i);
  if (matchCountMatch) {
    totalMatches = parseInt(matchCountMatch[1], 10);
  }

  // Split by language family sections (patterns like "[N Name]" where N is a number)
  // Family headers look like: "[6 Afro-Asiatic]"
  const familySections = html.split(/\[(\d+(?:\.\d+)*)\s+([^\]]+)\]/g);

  let currentFamily = '';
  let currentSource = '';

  for (let i = 1; i < familySections.length; i += 3) {
    if (familySections[i] && familySections[i + 1]) {
      const sectionNumber = familySections[i].trim();
      const sectionName = familySections[i + 1].trim();
      const sectionContent = familySections[i + 2] || '';

      // Determine if this is a family or a specific language path
      if (sectionNumber.split('.').length === 1) {
        // Top-level family (e.g., "6 Afro-Asiatic")
        currentFamily = sectionName;
        currentSource = '';
      } else {
        // Language path (e.g., "6.1 Proto-Afro-Asiatic to Proto-Omotic")
        const pathMatch = sectionName.match(/(.+?)\s+to\s+(.+)/i);
        if (pathMatch) {
          currentSource = pathMatch[1].trim();
        }
      }

      // Extract sound change patterns from this section
      // Patterns look like: "[tʃ → ts]" or "[ts → s / V_]"
      const changePattern = /\[([^\]]+→[^\]]+)\]/g;
      let changeMatch;
      while ((changeMatch = changePattern.exec(sectionContent)) !== null) {
        const changeText = changeMatch[1].trim();
        
        // Parse the change and environment
        const parts = changeText.split('/');
        const mainChange = parts[0].trim();
        const environment = parts[1] ? parts[1].trim() : undefined;

        // Extract source and target phonemes from change like "tʃ → ts"
        const phonemes = mainChange.split('→').map(p => p.trim());
        if (phonemes.length === 2) {
          matches.push({
            changePattern: mainChange,
            languageFamily: currentFamily,
            sourceLanguage: currentSource || sectionName,
            targetLanguage: sectionName,
            environment
          });
        }
      }
    }
  }

  return {
    query,
    totalMatches: totalMatches || matches.length,
    matches,
    cached: false
  };
}

/**
 * Query Index Diachronica for a specific sound change
 */
export async function queryDiachronica(
  protoPhoneme: string,
  reflexPhoneme: string
): Promise<DiachronicaSearchResult> {
  const cacheKey = `${protoPhoneme}>${reflexPhoneme}`;
  
  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return { ...cached.result, cached: true };
  }

  const query = encodeURIComponent(`${protoPhoneme}>${reflexPhoneme}`);
  const url = `${API_BASE}?q=${query}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'RootTrace-Linguistic-Reconstruction-Tool'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const result = parseDiachronicaHTML(html, `${protoPhoneme}>${reflexPhoneme}`);
    
    // Cache the result
    responseCache.set(cacheKey, { result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error('Index Diachronica API error:', error);
    // Return empty result on error
    return {
      query: `${protoPhoneme}>${reflexPhoneme}`,
      totalMatches: 0,
      matches: [],
      cached: false
    };
  }
}

/**
 * Check if a specific sound change is attested in Index Diachronica
 * Returns attestation information and bonus calculation
 */
export async function getAttestedShiftInfo(
  protoPhoneme: string,
  reflexPhoneme: string,
  leftContext: string | null,
  rightContext: string | null
): Promise<AttestedShiftInfo> {
  const result = await queryDiachronica(protoPhoneme, reflexPhoneme);
  
  if (result.totalMatches === 0) {
    return {
      isAttested: false,
      attestationCount: 0,
      languageFamilies: [],
      environments: [],
      bonus: 0
    };
  }

  // Extract unique language families
  const families = [...new Set(result.matches.map(m => m.languageFamily).filter(Boolean))];
  
  // Extract environments that might match our context
  const environments = result.matches
    .map(m => m.environment)
    .filter((e): e is string => Boolean(e));

  // Calculate environment match bonus
  let envBonus = 0;
  if (leftContext || rightContext) {
    for (const match of result.matches) {
      if (match.environment) {
        const envScore = scoreEnvironmentMatch(match.environment, leftContext, rightContext);
        envBonus = Math.max(envBonus, envScore);
      }
    }
  }

  // Calculate bonus based on attestation count and diversity
  const familyDiversityBonus = Math.min(families.length * 0.02, 0.1);
  const attestationBonus = Math.min(Math.log10(result.totalMatches + 1) * 0.05, 0.15);
  const baseBonus = 0.05; // Base attestation bonus

  const totalBonus = baseBonus + attestationBonus + familyDiversityBonus + envBonus;

  return {
    isAttested: true,
    attestationCount: result.totalMatches,
    languageFamilies: families,
    environments: [...new Set(environments)],
    bonus: Math.min(totalBonus, 0.3) // Cap bonus at 0.3
  };
}

/**
 * Score how well a Diachronica environment pattern matches the actual context
 * Returns a score between 0 and 0.1
 */
function scoreEnvironmentMatch(
  pattern: string,
  left: string | null,
  right: string | null
): number {
  let score = 0;
  
  // Common Diachronica environment patterns:
  // V_ = before vowel
  // _V = after vowel
  // V_V = between vowels (intervocalic)
  // #_ = word-initial
  // _# = word-final
  // _{i,e,a} = before specific vowels
  // C_C = between consonants

  const normalizedPattern = pattern
    .replace(/_/g, ' ')
    .replace(/[{}]/g, '')
    .trim();

  // Check for word-initial pattern
  if (normalizedPattern.includes('#') && !left) {
    score += 0.03;
  }

  // Check for word-final pattern
  if (normalizedPattern.includes('#') && !right) {
    score += 0.03;
  }

  // Check for vowel context patterns
  if (normalizedPattern.includes('V')) {
    const isVowel = (phoneme: string | null) => {
      if (!phoneme) return false;
      // Simple vowel detection
      return /[aeiouɑɛɔʌəɨʉɯuɪʊoɔæœø]/.test(phoneme);
    };

    if (normalizedPattern.includes('V_') && isVowel(left)) {
      score += 0.04;
    }
    if (normalizedPattern.includes('_V') && isVowel(right)) {
      score += 0.04;
    }
    if (normalizedPattern.includes('V_V') && isVowel(left) && isVowel(right)) {
      score += 0.05; // Intervocalic - strongest match for lenition
    }
  }

  // Check for specific phoneme matches
  const phonemeMatch = normalizedPattern.match(/_([^\\s]+)$/);
  if (phonemeMatch && right && right === phonemeMatch[1].trim()) {
    score += 0.03;
  }

  const leftPhonemeMatch = normalizedPattern.match(/^([^\\s]+)_/);
  if (leftPhonemeMatch && left && left === leftPhonemeMatch[1].trim()) {
    score += 0.03;
  }

  return Math.min(score, 0.1);
}

/**
 * Clear the API response cache
 */
export function clearDiachronicaCache(): void {
  responseCache.clear();
}

/**
 * Get cache statistics
 */
export function getDiachronicaCacheStats(): { size: number; maxAge: number } {
  const now = Date.now();
  let maxAge = 0;
  
  for (const entry of responseCache.values()) {
    maxAge = Math.max(maxAge, now - entry.timestamp);
  }
  
  return {
    size: responseCache.size,
    maxAge
  };
}
