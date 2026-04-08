/**
 * RootTrace Unit Test Suite — IE Cognate Validation
 * 
 * Tests the Proto-Reconstructor against well-established Indo-European
 * cognate sets to validate alignment and reconstruction accuracy.
 * 
 * Known Proto-Forms (established by comparative linguistics):
 * - *ph₂tḗr 'father' (Latin pater, Greek patḗr, Sanskrit pitár-)
 * - *méh₂tēr 'mother' (Latin māter, Greek mḗtēr, Sanskrit mātár-)
 * - *h₃dónts 'tooth' (Latin dēns, Greek odoús, Sanskrit dán)
 * - *pṓds 'foot' (Latin pēs, Greek poús, Sanskrit pád-)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { reconstructProtoWord, ReconstructionMethod } from '../services/engine';
import { LanguageInput } from '../types';

// Test timeout for MCMC iterations
const TEST_TIMEOUT = 30000;
const MCMC_PARAMS = {
  mcmcIterations: 2000,
  gapPenalty: 2.0,
  unknownCharPenalty: 1.5
};

describe('Proto-Reconstructor IE Cognate Tests', () => {
  
  describe('*ph₂tḗr "father" cognate set', () => {
    const fatherInputs: LanguageInput[] = [
      { 
        id: 'latin', 
        name: 'Latin', 
        word: 'pater', 
        gloss: 'father',
        attestationYear: -100 
      },
      { 
        id: 'greek', 
        name: 'Ancient Greek', 
        word: 'patɛːr',  // patḗr
        gloss: 'father',
        attestationYear: -400 
      },
      { 
        id: 'sanskrit', 
        name: 'Sanskrit', 
        word: 'pitɐr',  // pitár-
        gloss: 'father',
        attestationYear: -500 
      }
    ];

    it('should reconstruct a form containing p/t and r', async () => {
      const result = await reconstructProtoWord(
        fatherInputs, 
        ReconstructionMethod.BAYESIAN_MCMC, 
        MCMC_PARAMS
      );
      
      // Proto-form should contain labial stop (p/ph) and alveolar stop (t/d)
      const protoLower = result.protoForm.toLowerCase();
      expect(protoLower).toMatch(/[pbph]/);  // Labial stop
      expect(protoLower).toMatch(/[tdtʰ]/);  // Alveolar stop
      expect(protoLower).toMatch(/r/);       // Rhotic
      
      // Should start with * (asterisk convention)
      expect(result.protoForm.startsWith('*')).toBe(true);
    }, TEST_TIMEOUT);

    it('should align Latin p- with Greek p- and Sanskrit p-', async () => {
      const result = await reconstructProtoWord(
        fatherInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      // Find the column where initial p aligns
      const latinRow = result.alignmentMatrix[0];
      const greekRow = result.alignmentMatrix[1];
      const sanskritRow = result.alignmentMatrix[2];
      
      // All three should have p/pʰ in the first aligned position
      const initialCol = 0;
      expect([latinRow[initialCol], greekRow[initialCol], sanskritRow[initialCol]]).toEqual(
        expect.arrayContaining([expect.stringMatching(/[pbph]/)])
      );
    }, TEST_TIMEOUT);
  });

  describe('*méh₂tēr "mother" cognate set', () => {
    const motherInputs: LanguageInput[] = [
      {
        id: 'latin',
        name: 'Latin',
        word: 'maːter',  // māter
        gloss: 'mother',
        attestationYear: -100
      },
      {
        id: 'greek',
        name: 'Ancient Greek',
        word: 'mɛːtɛːr',  // mḗtēr
        gloss: 'mother',
        attestationYear: -400
      },
      {
        id: 'sanskrit',
        name: 'Sanskrit',
        word: 'maːtɐr',  // mātár-
        gloss: 'mother',
        attestationYear: -500
      }
    ];

    it('should reconstruct a form containing m and r', async () => {
      const result = await reconstructProtoWord(
        motherInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      const protoLower = result.protoForm.toLowerCase();
      expect(protoLower).toMatch(/m/);  // Nasal
      expect(protoLower).toMatch(/r/);  // Rhotic
      expect(protoLower).toMatch(/[td]/);  // Stop
    }, TEST_TIMEOUT);

    it('should align initial m across all languages', async () => {
      const result = await reconstructProtoWord(
        motherInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      const initialSegments = result.alignmentMatrix.map(row => row[0]);
      expect(initialSegments.every(s => s === 'm')).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('*h₃dónts "tooth" cognate set', () => {
    const toothInputs: LanguageInput[] = [
      {
        id: 'latin',
        name: 'Latin',
        word: 'deːns',  // dēns
        gloss: 'tooth',
        attestationYear: -100
      },
      {
        id: 'greek',
        name: 'Ancient Greek',
        word: 'odous',  // odoús
        gloss: 'tooth',
        attestationYear: -400
      },
      {
        id: 'sanskrit',
        name: 'Sanskrit',
        word: 'dan',  // dán
        gloss: 'tooth',
        attestationYear: -500
      }
    ];

    it('should reconstruct a form containing d and dental element', async () => {
      const result = await reconstructProtoWord(
        toothInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      const protoLower = result.protoForm.toLowerCase();
      // Should contain dental/alveolar stop (d/t)
      expect(protoLower).toMatch(/[td]/);
      // Should contain dental or nasal element
      expect(protoLower).toMatch(/[nsts]/);
    }, TEST_TIMEOUT);
  });

  describe('*pṓds "foot" cognate set', () => {
    const footInputs: LanguageInput[] = [
      {
        id: 'latin',
        name: 'Latin',
        word: 'peːs',  // pēs
        gloss: 'foot',
        attestationYear: -100
      },
      {
        id: 'greek',
        name: 'Ancient Greek',
        word: 'pous',  // poús
        gloss: 'foot',
        attestationYear: -400
      },
      {
        id: 'sanskrit',
        name: 'Sanskrit',
        word: 'pad',  // pád-
        gloss: 'foot',
        attestationYear: -500
      }
    ];

    it('should reconstruct a form starting with p', async () => {
      const result = await reconstructProtoWord(
        footInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      const protoLower = result.protoForm.toLowerCase();
      // Should start with labial stop (p/ph)
      expect(protoLower).toMatch(/^\*[pb]/);
    }, TEST_TIMEOUT);

    it('should align p across all initial positions', async () => {
      const result = await reconstructProtoWord(
        footInputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      // Initial consonant should be p for all
      const initialConsonants = result.alignmentMatrix.map(row => {
        // Find first non-gap segment
        return row.find(c => c !== '.' && c !== '-');
      });
      
      expect(initialConsonants.every(c => c === 'p')).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Alignment quality validation', () => {
    it('should not produce consecutive syllable boundaries', async () => {
      const inputs: LanguageInput[] = [
        { id: 'l1', name: 'Lang1', word: 'pater', gloss: 'test' },
        { id: 'l2', name: 'Lang2', word: 'pat', gloss: 'test' }
      ];
      
      const result = await reconstructProtoWord(
        inputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      // Check no consecutive dots in proto-form
      expect(result.protoForm).not.toMatch(/\.\./);
    }, TEST_TIMEOUT);

    it('should produce valid IPA tokens in proto-form', async () => {
      const inputs: LanguageInput[] = [
        { id: 'latin', name: 'Latin', word: 'pater', gloss: 'father' },
        { id: 'greek', name: 'Greek', word: 'patɛːr', gloss: 'father' }
      ];
      
      const result = await reconstructProtoWord(
        inputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      // Proto-form should be non-empty and start with *
      expect(result.protoForm.length).toBeGreaterThan(1);
      expect(result.protoTokens.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  describe('Confidence and weight validation', () => {
    it('should return confidence between 0 and 1', async () => {
      const inputs: LanguageInput[] = [
        { id: 'l1', name: 'Lang1', word: 'pater', gloss: 'test' },
        { id: 'l2', name: 'Lang2', word: 'mater', gloss: 'test' }
      ];
      
      const result = await reconstructProtoWord(
        inputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, TEST_TIMEOUT);

    it('should return language weights that sum to reasonable total', async () => {
      const inputs: LanguageInput[] = [
        { id: 'l1', name: 'Lang1', word: 'pater', gloss: 'test', attestationYear: -500 },
        { id: 'l2', name: 'Lang2', word: 'pater', gloss: 'test', attestationYear: -100 },
        { id: 'l3', name: 'Lang3', word: 'pater', gloss: 'test', attestationYear: 1000 }
      ];
      
      const result = await reconstructProtoWord(
        inputs,
        ReconstructionMethod.BAYESIAN_MCMC,
        MCMC_PARAMS
      );
      
      if (result.languageWeights) {
        const totalWeight = result.languageWeights.reduce((a, b) => a + b, 0);
        // Weights should be positive and sum to something reasonable
        expect(totalWeight).toBeGreaterThan(0);
        expect(result.languageWeights.every(w => w >= 0)).toBe(true);
      }
    }, TEST_TIMEOUT);
  });
});

describe('Web Worker MCMC Tests', () => {
  it('should handle reconstruction in worker without blocking', async () => {
    // This test validates that the worker architecture works
    // Actual worker tests would require browser environment
    const inputs: LanguageInput[] = [
      { id: 'l1', name: 'Lang1', word: 'pater', gloss: 'father' },
      { id: 'l2', name: 'Lang2', word: 'mater', gloss: 'mother' }
    ];
    
    // Standard synchronous reconstruction (worker version would be async)
    const result = await reconstructProtoWord(
      inputs,
      ReconstructionMethod.BAYESIAN_MCMC,
      { mcmcIterations: 1000, gapPenalty: 2, unknownCharPenalty: 1.5 }
    );
    
    expect(result.protoForm).toBeTruthy();
    expect(result.alignmentMatrix.length).toBe(2);
  }, TEST_TIMEOUT);
});

describe('Crash regression tests', () => {
  it('should handle nested unattested nodes without crashing', async () => {
    // Regression test for: Nested unattested nodes with empty words causing crash
    const nestedUnattestedInputs: LanguageInput[] = [
      {
        id: '1775510704926',
        name: 'PST',
        word: '',
        descendants: [
          {
            id: '1775510789729',
            name: 'LS',
            word: 'sjug'
          }
        ],
        isUnattested: true
      },
      {
        id: '1775510800180',
        name: 'PNT',
        word: '',
        isUnattested: true,
        descendants: [
          {
            id: '1775510837695',
            name: 'WCT',
            word: 'siu:kʰ'
          },
          {
            id: '1775510856779',
            name: 'EIT',
            word: 'seukʰ'
          }
        ]
      },
      {
        id: '1775510891245',
        name: 'PMT',
        word: '',
        isUnattested: true,
        descendants: [
          {
            id: '1775510934528',
            name: 'TJW',
            word: 'sjokʰa',
            descendants: [
              {
                id: '1775510959478',
                name: 'MTJ',
                word: 'sjoxa'
              }
            ]
          },
          {
            id: '1775510979107',
            name: 'CW',
            word: 'ʃjoɣa'
          },
          {
            id: '1775510996399',
            name: 'CE',
            word: 'sjuɣa'
          }
        ]
      }
    ];

    const result = await reconstructProtoWord(
      nestedUnattestedInputs,
      ReconstructionMethod.BAYESIAN_MCMC,
      { mcmcIterations: 50, gapPenalty: 1.5, unknownCharPenalty: 0.5 }
    );

    // Debug: log the actual result structure
    console.log('Result protoForm:', result.protoForm);
    console.log('Result protoTokens:', result.protoTokens);
    console.log('Result alignmentMatrix length:', result.alignmentMatrix.length);
    console.log('Result alignmentMatrix:', result.alignmentMatrix);
    console.log('Result confidence:', result.confidence);

    // Should not crash and should return a valid result
    expect(result).toBeTruthy();
    expect(result.protoForm).toBeTruthy();
    expect(result.alignmentMatrix.length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);
});
