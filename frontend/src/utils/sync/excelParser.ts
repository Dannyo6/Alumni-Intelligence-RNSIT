import * as XLSX from 'xlsx';

export const getSheetNames = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        resolve(workbook.SheetNames);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export interface RawSheetData {
  allRows: any[][];
  dimensions: string;
}

export const readRawSheet = async (file: File, sheetName: string): Promise<RawSheetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error(`Sheet ${sheetName} not found`);
        }
        
        const dimensions = worksheet['!ref'] || 'unknown';
        const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
        resolve({ allRows, dimensions });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const detectHeaderRow = (allRows: any[][]) => {
  const knownSignatures = [
    'name', 'fullname', 'alumni', 'student', 'first', 'last',
    'email', 'mail',
    'company', 'organization', 'employer', 'org',
    'designation', 'role', 'title', 'position',
    'linkedin', 'profile', 'url',
    'joining', 'leaving', 'batch', 'year', 'grad', 'passing',
    'branch', 'department', 'degree', 'course', 'stream'
  ];
  
  const candidates = [];
  const maxRowsToScan = Math.min(50, allRows.length);
  
  for (let i = 0; i < maxRowsToScan; i++) {
    const row = allRows[i] || [];
    let score = 0;
    let matchCount = 0;
    let nonEmptyCount = 0;
    
    for (const cell of row) {
      if (cell === null || cell === undefined || cell === '') continue;
      nonEmptyCount++;
      const str = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (knownSignatures.some(sig => str.includes(sig))) {
        matchCount++;
        score += 5; // Heavy weight for recognized alumni fields
      } else {
        score += 1; // Minor weight for any text presence
      }
    }
    
    if (nonEmptyCount > 0) {
      candidates.push({ 
        index: i, 
        headers: row.map(c => String(c || '').trim()), 
        score, 
        matchCount, 
        nonEmptyCount 
      });
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  const headerRowIndex = candidates.length > 0 ? candidates[0].index : 0;
  
  return { headerRowIndex, candidates };
};

export const extractDataFromRaw = (allRows: any[][], headerIndex: number) => {
  if (!allRows || allRows.length === 0 || headerIndex >= allRows.length) {
    return { headers: [], data: [] };
  }
  
  const headerRow = allRows[headerIndex] || [];
  const headers = headerRow.map(h => String(h || '').trim());
  
  const data = [];
  for (let i = headerIndex + 1; i < allRows.length; i++) {
    const rowArr = allRows[i];
    // Skip completely empty rows
    if (!rowArr || !rowArr.some(cell => cell !== null && cell !== undefined && cell !== '')) continue;
    
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = rowArr[j] !== undefined ? rowArr[j] : null;
      }
    }
    data.push(obj);
  }
  return { headers, data };
};
