import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  MessageCircle,
  FileText,
  Clock,
  Calendar,
} from 'lucide-react';
import { ClassId, PeriodNumber, AttendanceStatus, StudentAttendanceSummary } from '../../types';
import { Student } from '../../services/studentService';
import { DailyAttendanceOverview, AttendanceItem } from '../../services/attendanceService';
import { getSubjectForSlot } from '../../data/timetable';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn, formatDate } from '../../lib/utils';

interface AttendanceSummaryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: ClassId;
  classNameTitle: string;
  date: string;
  dayOrderNumber?: number;
  selectedPeriods: PeriodNumber[];
  subject: string;
  students: Student[];
  marks?: Record<string, AttendanceStatus | undefined>;
  todaySummaries?: StudentAttendanceSummary[];
  dailyOverview?: DailyAttendanceOverview;
  dateRecords?: AttendanceItem[];
}

type ReportScope = 'period' | 'fullday';
type ReportFormat = 'standard' | 'compact' | 'complete';

export const AttendanceSummaryShareModal: React.FC<AttendanceSummaryShareModalProps> = ({
  isOpen,
  onClose,
  classId,
  classNameTitle,
  date,
  dayOrderNumber,
  selectedPeriods,
  subject,
  students,
  marks = {},
  todaySummaries = [],
  dailyOverview,
  dateRecords = [],
}) => {
  const [scope, setScope] = useState<ReportScope>('period');
  const [format, setFormat] = useState<ReportFormat>('standard');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Group date records by student_id and period_number
  const studentPeriodMarks = useMemo(() => {
    const map: Record<string, Record<number, AttendanceStatus>> = {};
    for (const rec of dateRecords) {
      if (!map[rec.student_id]) {
        map[rec.student_id] = {};
      }
      map[rec.student_id][rec.period_number] = rec.status;
    }
    return map;
  }, [dateRecords]);

  // Per-period presentees / absentees / OD breakdown
  const periodAttendanceDetails = useMemo(() => {
    const completedPeriods = dailyOverview?.completedPeriodNumbers || [];
    const map: Record<number, { presentList: Student[]; absentList: Student[]; odList: Student[]; subject: string }> = {};
    for (const p of completedPeriods) {
      const presentList: Student[] = [];
      const absentList: Student[] = [];
      const odList: Student[] = [];
      const subj = dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`;
      for (const s of activeStudents) {
        const mark = studentPeriodMarks[s.student_id]?.[p];
        if (mark === 'P') presentList.push(s);
        else if (mark === 'A') absentList.push(s);
        else if (mark === 'OD') odList.push(s);
      }
      map[p] = { presentList, absentList, odList, subject: subj };
    }
    return { map, completedPeriods };
  }, [activeStudents, studentPeriodMarks, dailyOverview, dayOrderNumber, classId]);


  // ── Period Calculations ──
  const periodStats = useMemo(() => {
    const presentList: Student[] = [];
    const absentList: Student[] = [];
    const odList: Student[] = [];
    const unmarkedList: Student[] = [];

    activeStudents.forEach((s) => {
      const status = marks[s.student_id];
      if (status === 'P') presentList.push(s);
      else if (status === 'A') absentList.push(s);
      else if (status === 'OD') odList.push(s);
      else unmarkedList.push(s);
    });

    const total = activeStudents.length;
    const attended = presentList.length + odList.length;
    const percentage = total > 0 ? ((attended / total) * 100).toFixed(1) : '0.0';

    return {
      presentList,
      absentList,
      odList,
      unmarkedList,
      total,
      presentCount: presentList.length,
      absentCount: absentList.length,
      odCount: odList.length,
      percentage,
    };
  }, [activeStudents, marks]);

  // ── Full Day Calculations ──
  const fullDayStats = useMemo(() => {
    if (!todaySummaries.length) return null;

    const fullAbsentees: { student: Student; absentHours: number }[] = [];
    const partialAbsentees: {
      student: Student;
      absentHours: number;
      presentHours: number;
      totalWorking: number;
      absentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
    }[] = [];
    const odStudents: {
      student: Student;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
    }[] = [];
    const fullPresentees: Student[] = [];

    const completedPeriods = dailyOverview?.completedPeriodNumbers || [1, 2, 3, 4, 5, 6, 7];

    todaySummaries.forEach((sum) => {
      const student = activeStudents.find((s) => s.student_id === sum.student_id);
      if (!student) return;

      const marksObj = studentPeriodMarks[student.student_id] || {};
      const absentPeriods: Array<{ period: PeriodNumber; subject: string }> = [];
      const odPeriods: Array<{ period: PeriodNumber; subject: string }> = [];

      for (const p of completedPeriods) {
        const mark = marksObj[p];
        const subj = dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`;
        if (mark === 'A') {
          absentPeriods.push({ period: p, subject: subj });
        } else if (mark === 'OD') {
          odPeriods.push({ period: p, subject: subj });
        }
      }

      if (odPeriods.length > 0) {
        odStudents.push({ student, odPeriods });
      }

      if (sum.absentHours === sum.totalWorkingHours && sum.totalWorkingHours > 0) {
        fullAbsentees.push({ student, absentHours: sum.absentHours });
      } else if (sum.absentHours > 0) {
        partialAbsentees.push({
          student,
          absentHours: sum.absentHours,
          presentHours: sum.presentHours,
          totalWorking: sum.totalWorkingHours,
          absentPeriods,
          odPeriods,
        });
      } else if (sum.presentHours > 0 || sum.odHours > 0) {
        fullPresentees.push(student);
      }
    });

    return {
      fullAbsentees,
      partialAbsentees,
      odStudents,
      fullPresentees,
      overview: dailyOverview,
    };
  }, [todaySummaries, activeStudents, dailyOverview, studentPeriodMarks, dayOrderNumber, classId]);

  const generatedText = useMemo(() => {
    const formattedDate = formatDate(date);
    const dayLabel = dayOrderNumber ? `Day Order ${dayOrderNumber}` : '';
    const periodLabel = selectedPeriods.length === 1
      ? `Period ${selectedPeriods[0]}`
      : selectedPeriods.length > 1
      ? `Periods ${selectedPeriods.join(', ')}`
      : 'Period';

    if (scope === 'period') {
      const { presentList, absentList, odList, total, presentCount, absentCount, odCount, percentage } = periodStats;

      if (format === 'standard') {
        let txt = `*SPIHER Attendance Report*\n`;
        txt += `Class: ${classId} (${classNameTitle})\n`;
        txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
        txt += `Period: ${periodLabel}${subject ? ` (${subject})` : ''}\n\n`;

        // Presentees first
        txt += `*Presentees (${presentCount + odCount}/${total}):*\n`;
        if (presentList.length === 0 && odCount === 0) {
          txt += `Nil (No students present)\n`;
        } else {
          let idx = 1;
          presentList.forEach((s) => {
            txt += `${idx++}. ${s.name} (${s.student_id})\n`;
          });
          odList.forEach((s) => {
            txt += `${idx++}. ${s.name} (${s.student_id})\n`;
          });
        }
        txt += `\n`;

        // Absentees
        txt += `*Absentees (${absentCount}):*\n`;
        if (absentList.length === 0) {
          txt += `Nil (All students present)\n`;
        } else {
          absentList.forEach((s, i) => {
            txt += `${i + 1}. ${s.name} (${s.student_id})\n`;
          });
        }
        txt += `\n`;

        // OD section
        if (odCount > 0) {
          txt += `*On Duty (${odCount}):*\n`;
          odList.forEach((s, i) => {
            txt += `${i + 1}. ${s.name} (${s.student_id})\n`;
          });
          txt += `\n`;
        }

        txt += `*Summary:* Total Present: *${presentCount + odCount}/${total}* | Total Absent: *${absentCount}* | Attendance: *${percentage}%*`;
        return txt;
      }

      if (format === 'compact') {
        let txt = `*SPIHER — ${classId} | ${formattedDate}*\n`;
        txt += `*${periodLabel}* (${subject || 'Class'})\n\n`;
        txt += `*Absentees (${absentCount}):*\n`;
        if (absentList.length === 0) txt += `All Present (Nil Absentees)\n`;
        else absentList.forEach((s, idx) => txt += `${idx + 1}. ${s.name} (${s.student_id})\n`);
        if (odCount > 0) txt += `\n*OD (${odCount}):* ${odList.map((s) => s.name).join(', ')}\n`;
        txt += `\n*Present: ${presentCount + odCount}/${total}* | *${percentage}%*`;
        return txt;
      }

      let txt = `========================================\n`;
      txt += `SPIHER PERIOD ATTENDANCE AUDIT\n`;
      txt += `========================================\n`;
      txt += `Class     : ${classId} - ${classNameTitle}\n`;
      txt += `Date      : ${formattedDate} (${dayLabel})\n`;
      txt += `Period    : ${periodLabel}\n`;
      txt += `Subject   : ${subject || 'N/A'}\n`;
      txt += `Enrolled  : ${total}\n`;
      txt += `Present   : ${presentCount}\n`;
      txt += `On Duty   : ${odCount}\n`;
      txt += `Absent    : ${absentCount}\n`;
      txt += `Rate      : ${percentage}%\n`;
      txt += `----------------------------------------\n\n`;
      txt += `--- ABSENTEES LIST (${absentCount}) ---\n`;
      if (absentList.length === 0) txt += `Nil\n`;
      else absentList.forEach((s, idx) => txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`);
      if (odCount > 0) {
        txt += `\n--- ON DUTY LIST (${odCount}) ---\n`;
        odList.forEach((s, idx) => txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`);
      }
      return txt;
    }

    if (!fullDayStats) return `SPIHER Attendance Report - ${classId}\nDate: ${formattedDate}\n\nNo full day records marked yet today.`;
    const { fullAbsentees, partialAbsentees, odStudents, overview } = fullDayStats;
    const workingHours = overview?.totalPeriods || 7;

    if (format === 'standard') {
      let txt = `*SPIHER Daily Attendance Report*\n`;
      txt += `Class: ${classId} (${classNameTitle})\n`;
      txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
      txt += `Working Periods: ${overview?.periodsCompleted || 0}/${workingHours}\n\n`;
      txt += `*1. Full-Day Absentees (${fullAbsentees.length}):*\n`;
      fullAbsentees.length === 0 ? txt += `Nil\n` : fullAbsentees.forEach(({ student }, idx) => txt += `${idx + 1}. ${student.name} (${student.student_id})\n`);
      txt += `\n*2. Period-Wise Absentees (${partialAbsentees.length}):*\n`;
      partialAbsentees.length === 0 ? txt += `Nil\n` : partialAbsentees.forEach(({ student, absentPeriods }, idx) => txt += `${idx + 1}. ${student.name} (${student.student_id}) - ${absentPeriods.map((ap) => `P${ap.period}`).join(', ')}\n`);
      if (odStudents.length > 0) {
        txt += `\n*3. On Duty Students (${odStudents.length}):*\n`;
        odStudents.forEach(({ student, odPeriods }, idx) => txt += `${idx + 1}. ${student.name} (${student.student_id}) - ${odPeriods.map((op) => `P${op.period}`).join(', ')}\n`);
      }
      if (periodAttendanceDetails.completedPeriods.length > 0) {
        txt += `\n*⏱️ Period-Wise Attendance:*\n`;
        periodAttendanceDetails.completedPeriods.forEach((p) => {
          const pInfo = periodAttendanceDetails.map[p];
          if (pInfo) {
            const pAttended = pInfo.presentList.length + pInfo.odList.length;
            const pPct = activeStudents.length > 0 ? Math.round((pAttended / activeStudents.length) * 100) : 0;
            txt += `\n*Period ${p} (${pInfo.subject}) — ${pPct}% (${pAttended}/${activeStudents.length})*\n`;
            txt += `✅ *Present (${pInfo.presentList.length}):* ${pInfo.presentList.length > 0 ? pInfo.presentList.map((s) => s.name).join(', ') : 'None'}\n`;
            if (pInfo.odList.length > 0) txt += `🟡 *OD (${pInfo.odList.length}):* ${pInfo.odList.map((s) => s.name).join(', ')}\n`;
            txt += `❌ *Absent (${pInfo.absentList.length}):* ${pInfo.absentList.length > 0 ? pInfo.absentList.map((s) => s.name).join(', ') : 'Nil'}\n`;
          }
        });
      }
      txt += `\n*Summary:* Avg Attendance: *${overview ? overview.attendancePercentage.toFixed(1) : 0}%* | Total Enrolled: *${activeStudents.length}*`;
      return txt;
    }

    if (format === 'compact') {
      let txt = `*SPIHER Attendance — ${classId} | ${formattedDate}*\n\n`;
      if (fullAbsentees.length > 0) {
        txt += `*Full Day Absent (${fullAbsentees.length}):*\n`;
        fullAbsentees.forEach(({ student }, idx) => txt += `${idx + 1}. ${student.name} (${student.student_id})\n`);
        txt += `\n`;
      }
      if (partialAbsentees.length > 0) {
        txt += `*Period Absent (${partialAbsentees.length}):*\n`;
        partialAbsentees.forEach(({ student, absentPeriods }, idx) => txt += `${idx + 1}. ${student.name} (${absentPeriods.map((p) => `P${p.period}`).join(',')})\n`);
        txt += `\n`;
      }
      if (fullAbsentees.length === 0 && partialAbsentees.length === 0) txt += `🎉 100% Attendance Today! No Absentees.\n\n`;
      txt += `*Overall: ${overview ? overview.attendancePercentage.toFixed(1) : 0}%* (${overview?.periodsCompleted || 0}/${workingHours} periods)`;
      return txt;
    }

    let txt = `=====================================================\n`;
    txt += `SPIHER COMPREHENSIVE DAILY ATTENDANCE AUDIT\n`;
    txt += `=====================================================\n`;
    txt += `Class           : ${classId} - ${classNameTitle}\n`;
    txt += `Date            : ${formattedDate} (${dayLabel})\n`;
    txt += `Total Enrolled  : ${activeStudents.length} Students\n`;
    txt += `Periods Marked  : ${overview?.periodsCompleted || 0} of ${workingHours}\n`;
    txt += `Avg Attendance  : ${overview ? overview.attendancePercentage.toFixed(1) : 0}%\n`;
    txt += `-----------------------------------------------------\n\n`;
    txt += `1. FULL DAY ABSENTEES (${fullAbsentees.length})\n`;
    fullAbsentees.length === 0 ? txt += `   Nil\n` : fullAbsentees.forEach(({ student }, idx) => txt += `   ${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name}\n`);
    txt += `\n2. PARTIAL / PERIOD-WISE ABSENTEES (${partialAbsentees.length})\n`;
    partialAbsentees.length === 0 ? txt += `   Nil\n` : partialAbsentees.forEach(({ student, absentPeriods, presentHours, totalWorking }, idx) => txt += `   ${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} - Attended ${presentHours}/${totalWorking} hrs | Absent: ${absentPeriods.map((ap) => `P${ap.period}`).join(', ')}\n`);
    return txt;
  }, [scope, format, date, dayOrderNumber, selectedPeriods, classId, classNameTitle, subject, periodStats, fullDayStats, activeStudents, periodAttendanceDetails]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast.success('Report copied to clipboard!', 'Copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy', 'Error');
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(generatedText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Attendance - ${classId}`, text: generatedText });
      } catch {}
    } else {
      handleWhatsAppShare();
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([generatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${classId}_Attendance_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded report', 'Downloaded');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white shadow-2xl border-0 sm:border border-slate-200 w-full h-[100dvh] sm:h-[88vh] sm:max-w-2xl sm:rounded-3xl overflow-hidden flex flex-col">
        <div className="p-3 sm:p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-emerald-500/20">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shadow-inner shrink-0">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black tracking-tight">Smart Attendance Share</h3>
                <Badge variant="success" size="sm" className="font-extrabold">{classId}</Badge>
                {dayOrderNumber && (
                  <Badge variant="purple" size="sm" className="font-bold">
                    DO {dayOrderNumber}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-1">
                {formatDate(date)} • 1-Click WhatsApp & Export Roster
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-4 flex-1 min-h-0 flex flex-col space-y-2.5 text-slate-900 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Report Scope:
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('period')}
                  className={cn(
                    'py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer',
                    scope === 'period'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Period ({selectedPeriods.length === 1 ? `P${selectedPeriods[0]}` : selectedPeriods.length > 1 ? `P${selectedPeriods.join(',')}` : 'P1'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('fullday')}
                  className={cn(
                    'py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer',
                    scope === 'fullday'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Full Day</span>
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Format Style:
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFormat('standard')}
                  className={cn(
                    'py-1.5 px-1 rounded-lg transition-all text-center cursor-pointer',
                    format === 'standard'
                      ? 'bg-white text-slate-950 shadow-xs font-black border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('compact')}
                  className={cn(
                    'py-1.5 px-1 rounded-lg transition-all text-center cursor-pointer',
                    format === 'compact'
                      ? 'bg-white text-slate-950 shadow-xs font-black border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Short
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('complete')}
                  className={cn(
                    'py-1.5 px-1 rounded-lg transition-all text-center cursor-pointer',
                    format === 'complete'
                      ? 'bg-white text-slate-950 shadow-xs font-black border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Doc
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col space-y-1">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Message Preview</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {generatedText.split('\n').length} lines • {generatedText.length} chars
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              <textarea
                readOnly
                value={generatedText}
                className="w-full h-full p-3.5 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none select-all resize-none shadow-inner leading-relaxed overflow-y-auto"
              />
            </div>
            <p className="text-[10px] text-emerald-700 font-bold text-right shrink-0">✓ Ready for CR WhatsApp Group</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTxt}
            className="gap-1.5 text-xs font-bold border-slate-300 py-2 px-3 rounded-xl cursor-pointer bg-white hover:bg-slate-100 text-slate-700 shrink-0"
            title="Download .txt"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden xs:inline">Download</span>
            <span>.txt</span>
          </Button>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={cn(
                'gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl transition-all cursor-pointer',
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-black'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-3.5 sm:px-5 rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Share to WhatsApp</span>
            </Button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
                title="More Share Options"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryShareModal;
