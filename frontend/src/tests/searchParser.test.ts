import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from '../utils/searchParser';

describe('Search Query Parser & Alias Engine', () => {
  it('parses empty or whitespace queries cleanly', () => {
    const res = parseSearchQuery('   ');
    expect(res.rawQuery).toBe('');
    expect(res.cleanedTextQuery).toBeNull();
    expect(res.yearExact).toBeNull();
    expect(res.yearStart).toBeNull();
    expect(res.yearEnd).toBeNull();
    expect(res.branchAliases).toBeNull();
    expect(res.detectedPills).toHaveLength(0);
  });

  it('parses single year queries', () => {
    const res = parseSearchQuery('2019');
    expect(res.yearExact).toBe(2019);
    expect(res.yearStart).toBeNull();
    expect(res.yearEnd).toBeNull();
    expect(res.cleanedTextQuery).toBeNull();
    expect(res.detectedPills.some(p => p.type === 'year' && p.label.includes('2019'))).toBe(true);
  });

  it('parses year range expressions with hyphens and words', () => {
    const res1 = parseSearchQuery('2015-2019');
    expect(res1.yearStart).toBe(2015);
    expect(res1.yearEnd).toBe(2019);
    expect(res1.yearExact).toBeNull();
    expect(res1.detectedPills.some(p => p.type === 'range')).toBe(true);

    const res2 = parseSearchQuery('2014 to 2018');
    expect(res2.yearStart).toBe(2014);
    expect(res2.yearEnd).toBe(2018);
  });

  it('expands academic branch aliases conservatively', () => {
    const cse = parseSearchQuery('CSE');
    expect(cse.branchAliases).toContain('Computer Science');
    expect(cse.branchAliases).toContain('Computer Science and Engineering');

    const ise = parseSearchQuery('ISE');
    expect(ise.branchAliases).toContain('Information Science');

    const ece = parseSearchQuery('ECE');
    expect(ece.branchAliases).toContain('Electronics and Communication Engineering');

    const eee = parseSearchQuery('EEE');
    expect(eee.branchAliases).toContain('Electrical and Electronics Engineering');

    const aiml = parseSearchQuery('AI&ML');
    expect(aiml.branchAliases).toContain('Artificial Intelligence and Machine Learning');
  });

  it('expands country and city aliases', () => {
    const usa = parseSearchQuery('USA');
    expect(usa.countryAliases).toContain('United States');

    const uk = parseSearchQuery('UK');
    expect(uk.countryAliases).toContain('United Kingdom');

    const blr = parseSearchQuery('Bengaluru');
    expect(blr.cleanedTextQuery).toContain('Bengaluru');
  });

  it('expands company aliases', () => {
    const aws = parseSearchQuery('AWS');
    expect(aws.companyAliases).toContain('Amazon Web Services');
  });

  it('correctly separates mixed queries containing company, branch, and year range', () => {
    const complex = parseSearchQuery('Amazon CSE 2015-2019 Staff');
    expect(complex.yearStart).toBe(2015);
    expect(complex.yearEnd).toBe(2019);
    expect(complex.branchAliases).toContain('Computer Science and Engineering');
    expect(complex.cleanedTextQuery).toContain('Amazon');
    expect(complex.cleanedTextQuery).toContain('Staff');
  });

  it('guarantees pure year and pure year-range searches completely clear cleanedTextQuery', () => {
    const pureYear = parseSearchQuery('2022');
    expect(pureYear.yearExact).toBe(2022);
    expect(pureYear.cleanedTextQuery).toBeNull();

    const pureRange = parseSearchQuery('2018-2022');
    expect(pureRange.yearStart).toBe(2018);
    expect(pureRange.yearEnd).toBe(2022);
    expect(pureRange.cleanedTextQuery).toBeNull();
  });
});
