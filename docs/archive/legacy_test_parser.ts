// Archived prototype test parser - DO NOT RUN AGAINST PRODUCTION
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { detectHeaderRow, extractDataFromRaw } from '../../frontend/src/utils/sync/excelParser';
import { normalizeData } from '../../frontend/src/utils/sync/dataNormalizer';

// Reference only
