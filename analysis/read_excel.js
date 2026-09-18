const XLSX = require('xlsx');
const path = require('path');

try {
  const filePath = process.argv[2] || process.env.EXCEL_PATH || path.join(__dirname, '..', 'RNSIT_Alumni_Meet_Insights_Final-1.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== FIRST 10 ROWS IN SHEET: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      console.log(`Row ${i}:`, data[i]);
    }
  });
} catch (error) {
  console.error("Error reading Excel file:", error.message);
}
