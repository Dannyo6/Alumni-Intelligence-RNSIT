import type { AlumnusInsert } from '../excelImport'; 

const normalizeHeader = (str: string) => String(str).toLowerCase().replace(/[^a-z0-9]/g, '');

const headerSignatures = {
  name: ['name', 'fullname', 'alumniname', 'studentname', 'nameofthealumni', 'nameofthestudent', 'student', 'firstnamelastname'],
  email: ['email', 'emailaddress', 'mailid', 'contactemail'],
  mobile: ['mobile', 'phone', 'contact', 'contactnumber', 'phonenumber', 'whatsapp'],
  current_company: ['company', 'employer', 'organization', 'currentcompany', 'companyname', 'workingat'],
  current_designation: ['designation', 'role', 'jobtitle', 'title', 'position', 'currentdesignation'],
  company_sector: ['sector', 'industry', 'companysector', 'domain'],
  city: ['city', 'location', 'currentcity'],
  country: ['country', 'currentcountry'],
  joining_year: ['joining', 'admission', 'startyear', 'joiningyear', 'batchstart'],
  leaving_year: ['leaving', 'graduation', 'endyear', 'passing', 'passingyear', 'batch', 'batchend', 'yop'],
  academic_branch: ['branch', 'department', 'degree', 'course', 'stream', 'academicbranch'],
  profile_link: ['profile', 'almaconnect', 'profileurl', 'profilelink'],
  linkedin_url: ['linkedin', 'linkedinurl', 'linkedinprofile'],
  value_score: ['valuescore', 'score'],
  status: ['status'],
  is_high_value: ['highvalue', 'ishighvalue'],
  is_global: ['global', 'isglobal', 'international'],
  is_top_employer: ['topemployer', 'istopemployer'],
  is_student_or_rnsit: ['student', 'isstudent', 'rnsitstudent'],
  needs_verification: ['verification', 'needsverification']
};

export interface DataMapping {
  field: string;
  mappedFrom: string | null;
}

export interface NormalizationResult {
  normalizedData: Partial<AlumnusInsert>[];
  mapping: DataMapping[];
  invalidRows: number;
}

export const detectMapping = (rawHeaders: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  
  const normalizedHeaders = rawHeaders.map(h => ({
    original: h,
    normalized: normalizeHeader(h)
  }));

  for (const [schemaField, signatures] of Object.entries(headerSignatures)) {
    let match = normalizedHeaders.find(h => signatures.includes(h.normalized));
    
    if (!match) {
      match = normalizedHeaders.find(h => 
        signatures.some(sig => h.normalized.includes(sig) || sig.includes(h.normalized))
      );
    }
    
    if (match) {
      map[schemaField] = match.original;
    }
  }

  if (!map['name']) {
    const fnMatch = normalizedHeaders.find(h => h.normalized.includes('firstname'));
    const lnMatch = normalizedHeaders.find(h => h.normalized.includes('lastname'));
    
    if (fnMatch) {
      map['firstNameCol'] = fnMatch.original;
      if (lnMatch) map['lastNameCol'] = lnMatch.original;
    }
  }

  return map;
};

export const normalizeData = (rawRows: any[], headers: string[], sheetName?: string): NormalizationResult => {
  const mapping = detectMapping(headers);
  const normalizedData: Partial<AlumnusInsert>[] = [];
  let invalidRows = 0;

  const getStr = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).trim();
    return str === '' ? null : str;
  };
  
  const getNum = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).replace(/[^0-9.]/g, '');
    const num = Number(str);
    return isNaN(num) || str === '' ? null : num;
  };

  const getBool = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const str = String(val).toLowerCase().trim();
    return ['true', 'yes', 'y', '1'].includes(str);
  };

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const row: Partial<AlumnusInsert> = {
      source_sheet: sheetName || null,
    };
    
    // Handle Name
    if (mapping.name) {
      row.name = getStr(rawRow[mapping.name]) || '';
    } else if (mapping.firstNameCol) {
      const fn = getStr(rawRow[mapping.firstNameCol]) || '';
      const ln = mapping.lastNameCol ? getStr(rawRow[mapping.lastNameCol]) || '' : '';
      row.name = [fn, ln].filter(Boolean).join(' ').trim();
    }

    if (mapping.email) row.email = getStr(rawRow[mapping.email]);
    if (mapping.mobile) row.mobile = getStr(rawRow[mapping.mobile]);
    if (mapping.current_company) row.current_company = getStr(rawRow[mapping.current_company]);
    if (mapping.current_designation) row.current_designation = getStr(rawRow[mapping.current_designation]);
    if (mapping.company_sector) row.company_sector = getStr(rawRow[mapping.company_sector]);
    if (mapping.city) row.city = getStr(rawRow[mapping.city]);
    if (mapping.country) row.country = getStr(rawRow[mapping.country]);
    if (mapping.joining_year) row.joining_year = getNum(rawRow[mapping.joining_year]);
    if (mapping.leaving_year) row.leaving_year = getNum(rawRow[mapping.leaving_year]);
    if (mapping.academic_branch) {
      row.academic_branch = getStr(rawRow[mapping.academic_branch]);
      row.branch_or_designation_raw = row.academic_branch;
    }
    if (mapping.profile_link) row.profile_link = getStr(rawRow[mapping.profile_link]);
    if (mapping.linkedin_url) row.linkedin_url = getStr(rawRow[mapping.linkedin_url]);
    if (mapping.value_score) row.value_score = getNum(rawRow[mapping.value_score]);
    if (mapping.status) row.status = getStr(rawRow[mapping.status]);
    if (mapping.is_high_value) row.is_high_value = getBool(rawRow[mapping.is_high_value]);
    if (mapping.is_global) row.is_global = getBool(rawRow[mapping.is_global]);
    if (mapping.is_top_employer) row.is_top_employer = getBool(rawRow[mapping.is_top_employer]);
    if (mapping.is_student_or_rnsit) row.is_student_or_rnsit = getBool(rawRow[mapping.is_student_or_rnsit]);
    if (mapping.needs_verification) row.needs_verification = getBool(rawRow[mapping.needs_verification]);

    // Implicit flags based on sheet name
    if (sheetName) {
      const sName = sheetName.toLowerCase();
      if (sName.includes('high-value') || sName.includes('high value')) {
        row.is_high_value = true;
      }
      if (sName.includes('top employer')) {
        row.is_top_employer = true;
      }
      if (sName.includes('global')) {
        row.is_global = true;
      }
      if (sName.includes('student')) {
        row.is_student_or_rnsit = true;
      }
    }

    if (row.name) {
      normalizedData.push(row);
    } else {
      invalidRows++;
    }
  }

  const displayMapping: DataMapping[] = Object.keys(headerSignatures).map(schemaField => ({
    field: schemaField,
    mappedFrom: mapping[schemaField] || null
  }));

  if (!mapping.name && mapping.firstNameCol) {
    displayMapping.push({
      field: 'name (derived)',
      mappedFrom: `${mapping.firstNameCol} + ${mapping.lastNameCol || ''}`.trim()
    });
  }

  return { normalizedData, mapping: displayMapping, invalidRows };
};
