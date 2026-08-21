/**
 * XLSX Parser for SPIHER Attendance Details Workbook
 *
 * Source: "attendance details .xlsx"
 * Sheet: Sheet1 (single sheet)
 *
 * Column mapping (observed from actual workbook inspection):
 *   Col 0  → Roll Number (student_id)  e.g. SPC25CSU001
 *   Col 1  → Name                      e.g. ARUN ROSHAN GJ
 *   Col 2  → Institution               SPIHER  (ignored)
 *   Col 3  → Dept short                Computer Science Engineering / AIDS (ignored, use col 4)
 *   Col 4  → Degree program            "BTech Computer Science Engineering" / "BTech AIDS"
 *   Col 5  → Batch year                2025  (ignored)
 *   Col 6-8 → Gaps/Nones for some rows
 *   Col 9 or 6 → Category             GENERAL  (ignored)
 *   Col 10 or 7 → Gender              (ignored)
 *   Col 11 or 7 → Email               *column shifts between CSE and AIDS rows*
 *
 * Class detection (primary): Roll prefix
 *   SPC25CSU6## → AIDS-25
 *   SPC25CSU0## → CSE-25
 *
 * Email detection: scan all columns for the first value containing '@'
 */

import * as XLSX from 'xlsx';
import { ClassId } from '../types';

export interface ParsedStudentRow {
  student_id: string;
  name: string;
  class_id: ClassId;
  email: string | null;
  // raw row for debugging
  _raw?: unknown[];
}

export interface ParseResult {
  rows: ParsedStudentRow[];
  skippedRows: number;
  parseErrors: string[];
}

/** Determine class from roll number prefix (most reliable) */
function detectClass(rollNo: string): ClassId | null {
  if (!rollNo || typeof rollNo !== 'string') return null;
  const upper = rollNo.trim().toUpperCase();
  if (upper.startsWith('SPC25CSU6')) return 'AIDS-25';
  if (upper.startsWith('SPC25CSU')) return 'CSE-25';
  return null;
}

/** Find first email-looking cell in the row regardless of column position */
function findEmail(row: unknown[]): string | null {
  for (const cell of row) {
    if (typeof cell === 'string' && cell.includes('@') && cell.includes('.')) {
      return cell.trim().toLowerCase();
    }
  }
  return null;
}

/** Normalise name: collapse double spaces, trim */
function normaliseName(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim();
}

export function parseAttendanceXlsx(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        // Always use Sheet1
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Convert to raw 2-D array (header:1 = no header row object)
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          blankrows: false,
        });

        const rows: ParsedStudentRow[] = [];
        const parseErrors: string[] = [];
        let skippedRows = 0;

        for (let i = 0; i < raw.length; i++) {
          const row = raw[i];
          const lineNum = i + 1;

          // Skip completely empty rows
          if (!row || row.every((c) => c === null || c === undefined || c === '')) {
            skippedRows++;
            continue;
          }

          const rollRaw = row[0];
          const rollNo = typeof rollRaw === 'string' ? rollRaw.trim() : null;

          // Skip rows that don't look like a roll number
          if (!rollNo || !rollNo.startsWith('SPC')) {
            skippedRows++;
            continue;
          }

          const name = normaliseName(row[1]);
          if (!name) {
            parseErrors.push(`Row ${lineNum} (${rollNo}): Missing name — skipped`);
            skippedRows++;
            continue;
          }

          const classId = detectClass(rollNo);
          if (!classId) {
            parseErrors.push(`Row ${lineNum} (${rollNo}): Cannot determine class from roll prefix — skipped`);
            skippedRows++;
            continue;
          }

          const email = findEmail(row);

          rows.push({
            student_id: rollNo,
            name,
            class_id: classId,
            email,
            _raw: row,
          });
        }

        resolve({ rows, skippedRows, parseErrors });
      } catch (err) {
        reject(new Error(`Failed to parse XLSX: ${String(err)}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
