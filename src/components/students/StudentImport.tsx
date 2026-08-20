import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, X, Loader2, RotateCcw } from 'lucide-react';
import { parseAttendanceXlsx, ParseResult } from '../../lib/parseXlsx';
import { importStudents, ImportResult } from '../../services/studentService';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ClassId } from '../../types';
import { cn } from '../../lib/utils';
import { isSupabaseConfigured } from '../../lib/supabase';

interface StudentImportProps {
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export const StudentImport: React.FC<StudentImportProps> = ({ onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [filterClass, setFilterClass] = useState<ClassId | 'ALL'>('ALL');

  const handleFile = async (file: File) => {
    const isExcelOrCsv =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv');

    if (!isExcelOrCsv) {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }
    setFileName(file.name);
    setParsing(true);
    try {
      const result = await parseAttendanceXlsx(file);
      setParseResult(result);
      setStep('preview');
    } catch (err) {
      alert(`Failed to parse file: ${String(err)}`);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirmImport = async () => {
    if (!parseResult) return;
    setStep('importing');
    try {
      const toImport = filterClass === 'ALL'
        ? parseResult.rows
        : parseResult.rows.filter((r) => r.class_id === filterClass);
      const result = await importStudents(toImport);
      setImportResult(result);
      setStep('done');
    } catch (err) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [String(err)],
      });
      setStep('done');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setParseResult(null);
    setImportResult(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cseCount = parseResult?.rows.filter((r) => r.class_id === 'CSE-25').length ?? 0;
  const aidsCount = parseResult?.rows.filter((r) => r.class_id === 'AIDS-25').length ?? 0;
  const previewRows = parseResult
    ? filterClass === 'ALL'
      ? parseResult.rows
      : parseResult.rows.filter((r) => r.class_id === filterClass)
    : [];

  return (
    <div className="space-y-6">
      {/* ── STEP: UPLOAD ── */}
      {step === 'upload' && (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-150',
              dragOver
                ? 'border-blue-500 bg-blue-50/50 scale-[1.005]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-slate-700">Parsing workbook…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Drop <span className="text-blue-600 font-mono">attendance details .xlsx</span> or <span className="text-blue-600 font-mono">.csv</span> here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports XLSX, XLS, and CSV files
                  </p>
                </div>
                <Button variant="outline" size="sm" className="mt-1 pointer-events-none">
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Select File
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Validation Rules on Import:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Roll prefix <code className="font-mono text-slate-700">SPC25CSU0##</code> auto-assigns to <strong>CSE-25</strong></li>
              <li>Roll prefix <code className="font-mono text-slate-700">SPC25CSU6##</code> auto-assigns to <strong>AIDS-25</strong></li>
              <li>Existing <code className="font-mono text-slate-700">student_id</code> records are preserved and never overwritten</li>
              <li>Only attendance-relevant fields imported: Roll number, Name, Class, Email</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── STEP: PREVIEW ── */}
      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">{fileName}</p>
                <p className="text-[11px] text-slate-500">
                  {parseResult.rows.length} records parsed · {cseCount} CSE-25 · {aidsCount} AIDS-25
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Choose different file
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter preview:</span>
            {(['ALL', 'CSE-25', 'AIDS-25'] as const).map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setFilterClass(cls)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                  filterClass === cls
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {cls} ({cls === 'ALL' ? parseResult.rows.length : cls === 'CSE-25' ? cseCount : aidsCount})
              </button>
            ))}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Roll No</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((r, i) => (
                  <tr key={r.student_id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5 text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono font-bold text-slate-900">{r.student_id}</td>
                    <td className="px-3 py-1.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-3 py-1.5">
                      <Badge variant={r.class_id === 'CSE-25' ? 'info' : 'purple'} size="sm">
                        {r.class_id}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500 font-mono">{r.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleConfirmImport} className="gap-1.5">
              <span>Confirm Import ({previewRows.length} Students)</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: IMPORTING ── */}
      {step === 'importing' && (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Writing students to database…</p>
          <p className="text-xs text-slate-400">Verifying unique constraints and RLS policies</p>
        </div>
      )}

      {/* ── STEP: DONE ── */}
      {step === 'done' && importResult && (
        <div className="space-y-4">
          <div className={cn(
            'p-5 rounded-2xl border flex items-start gap-4',
            importResult.errors.length === 0
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          )}>
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">
                Import complete: {importResult.imported} students imported
              </p>
              <p className="text-xs opacity-80">
                {importResult.skipped > 0 && `${importResult.skipped} already existing records skipped · `}
                {isSupabaseConfigured() ? 'Synced with Supabase database' : 'Saved to local verified cache'}
              </p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-700">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Errors:
              </p>
              <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                {importResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Import Another File
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onImportComplete}
            >
              Done & View Roster
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
