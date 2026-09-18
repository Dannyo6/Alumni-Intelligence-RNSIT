import * as XLSX from 'xlsx';
import type { Database } from '../types/supabase';

export type AlumnusInsert = Database['public']['Tables']['alumni']['Insert'];

const TARGET_SHEETS = [
  'High-Value Alumni',
  'Top Employers',
  'Global Spread',
  'RNSIT - Students',
  'Remaining Alumni'
];

export const parseExcelFile = async (file: File): Promise<{ data: AlumnusInsert[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let allRecords: AlumnusInsert[] = [];
        let errors: string[] = [];

        workbook.SheetNames.forEach(sheetName => {
          if (!TARGET_SHEETS.includes(sheetName)) return;

          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          
          if (rawData.length === 0) return;

          // Find the header row index (looking for 'Name' and 'Joining Year')
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (row && row.includes('Name') && (row.includes('Joining Year') || row.includes('Current Company'))) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            errors.push(`Could not find header row in sheet: ${sheetName}`);
            return;
          }

          const headers = rawData[headerRowIndex].map(h => typeof h === 'string' ? h.trim() : h);
          
          // Map to known columns
          const colMap = {
            name: headers.indexOf('Name'),
            email: headers.indexOf('Email Address'),
            mobile: headers.indexOf('Mobile Number'),
            company: headers.indexOf('Current Company'),
            designation: headers.indexOf('Current Designation'),
            sector: headers.indexOf('Current Company Sectors'),
            city: headers.indexOf('Current City'),
            country: headers.indexOf('Current Country'),
            joiningYear: headers.indexOf('Joining Year'),
            leavingYear: headers.indexOf('Leaving Year'),
            branch: headers.indexOf('Branch/Designation'),
            profileLink: headers.indexOf('User Profile Link'),
            valueScore: headers.indexOf('Value Score'),
            status: headers.indexOf('Status')
          };

          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0 || !row[colMap.name]) continue;

            const name = String(row[colMap.name]).trim();
            if (!name) continue;

            const record: AlumnusInsert = {
              name: name,
              email: colMap.email !== -1 && row[colMap.email] ? String(row[colMap.email]).trim().toLowerCase() : null,
              mobile: colMap.mobile !== -1 && row[colMap.mobile] ? String(row[colMap.mobile]).trim() : null,
              current_company: colMap.company !== -1 && row[colMap.company] ? String(row[colMap.company]).trim() : null,
              current_designation: colMap.designation !== -1 && row[colMap.designation] ? String(row[colMap.designation]).trim() : null,
              company_sector: colMap.sector !== -1 && row[colMap.sector] ? String(row[colMap.sector]).trim() : null,
              city: colMap.city !== -1 && row[colMap.city] ? String(row[colMap.city]).trim() : null,
              country: colMap.country !== -1 && row[colMap.country] ? String(row[colMap.country]).trim() : null,
              joining_year: colMap.joiningYear !== -1 && row[colMap.joiningYear] ? parseInt(row[colMap.joiningYear], 10) || null : null,
              leaving_year: colMap.leavingYear !== -1 && row[colMap.leavingYear] ? parseInt(row[colMap.leavingYear], 10) || null : null,
              branch_or_designation_raw: colMap.branch !== -1 && row[colMap.branch] ? String(row[colMap.branch]).trim() : null,
              academic_branch: colMap.branch !== -1 && row[colMap.branch] ? String(row[colMap.branch]).trim() : null,
              profile_link: colMap.profileLink !== -1 && row[colMap.profileLink] ? String(row[colMap.profileLink]).trim() : null,
              value_score: colMap.valueScore !== -1 && row[colMap.valueScore] ? parseInt(row[colMap.valueScore], 10) || 0 : 0,
              status: colMap.status !== -1 && row[colMap.status] ? String(row[colMap.status]).trim() : null,
              source_sheet: sheetName,
              
              // Set flags based on sheet or data
              is_high_value: sheetName === 'High-Value Alumni',
              is_top_employer: sheetName === 'Top Employers',
              is_global: sheetName === 'Global Spread',
              is_student_or_rnsit: sheetName === 'RNSIT - Students',
              needs_verification: sheetName === 'RNSIT - Students'
            };

            // Normalize URL
            if (record.profile_link) {
              try {
                const url = new URL(record.profile_link);
                url.search = '';
                record.profile_link = url.toString().replace(/\/$/, '');
              } catch {
                // Ignore invalid URLs
              }
            }

            allRecords.push(record);
          }
        });

        resolve({ data: allRecords, errors });
      } catch (error: any) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
