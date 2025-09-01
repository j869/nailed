import ExcelJS from 'exceljs';
import fs from 'fs';

async function inspectMainSheets() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('Permit Register - MASTER v2.xlsm');
    
    console.log('=== LOOKING FOR MAIN DATA SHEETS ===');
    console.log(`Total worksheets: ${workbook.worksheets.length}`);
    
    // Look for sheets that might contain the main data (not individual job sheets)
    const mainSheets = workbook.worksheets.filter(sheet => {
      const name = sheet.name.toLowerCase();
      return name.includes('current') || name.includes('completed') || name.includes('master') || 
             name.includes('summary') || name.includes('register') || sheet.name.length < 10;
    });
    
    if (mainSheets.length === 0) {
      console.log('No obvious main sheets found. Checking first few sheets...');
      mainSheets.push(...workbook.worksheets.slice(0, 3));
    }
    
    mainSheets.forEach((worksheet, index) => {
      console.log(`\n--- SHEET: "${worksheet.name}" ---`);
      console.log(`Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
      
      // Check different rows for headers and data pattern
      console.log('\n=== ROW ANALYSIS ===');
      for (let rowNum = 1; rowNum <= Math.min(10, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        const values = [];
        for (let colNum = 1; colNum <= Math.min(20, worksheet.columnCount); colNum++) {
          const cell = row.getCell(colNum);
          let value = cell.value;
          if (value && typeof value === 'object' && value.formula) {
            value = `FORMULA: ${value.formula}`;
          }
          if (value && typeof value === 'object' && value.result) {
            value = value.result;
          }
          values.push(value || '');
        }
        
        // Only show rows with some content
        const hasContent = values.some(v => v && v.toString().trim().length > 0);
        if (hasContent) {
          console.log(`Row ${rowNum}:`, values.slice(0, 10));
        }
      }
      
      // Look specifically at rows 2 and 3 for headers and data
      if (worksheet.rowCount >= 2) {
        console.log('\n=== POTENTIAL HEADERS (Row 2) ===');
        const headerRow = worksheet.getRow(2);
        const headers = [];
        for (let colNum = 1; colNum <= 20; colNum++) {
          const cell = headerRow.getCell(colNum);
          let value = cell.value;
          if (value && typeof value === 'object' && value.formula) {
            value = `FORMULA: ${value.formula}`;
          }
          if (value && typeof value === 'object' && value.result) {
            value = value.result;
          }
          headers.push(value || '');
        }
        console.log('Headers:', headers.filter(h => h));
      }
      
      if (worksheet.rowCount >= 3) {
        console.log('\n=== SAMPLE DATA (Row 3) ===');
        const dataRow = worksheet.getRow(3);
        const data = [];
        for (let colNum = 1; colNum <= 20; colNum++) {
          const cell = dataRow.getCell(colNum);
          let value = cell.value;
          if (value && typeof value === 'object' && value.formula) {
            value = `FORMULA: ${value.formula}`;
          }
          if (value && typeof value === 'object' && value.result) {
            value = value.result;
          }
          data.push(value || '');
        }
        console.log('Data:', data.filter(d => d));
      }
    });
    
  } catch (error) {
    console.error('Error inspecting Excel file:', error);
  }
}

inspectMainSheets();
