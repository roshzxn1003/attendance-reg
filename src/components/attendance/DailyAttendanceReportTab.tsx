import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  Copy,
  Check,
  Download,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClassId, PeriodNumber, AttendanceStatus, StudentAttendanceSummary } from '../../types';
import { Student } from '../../services/studentService';
import { DailyAttendanceOverview, AttendanceItem } from '../../services/attendanceService';
import { PERIOD_TIMINGS, getSubjectForSlot } from '../../data/timetable';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../common/Card';
import { cn, formatDate } from '../../lib/utils';

interface DailyAttendanceReportTabProps {
  classId: ClassId;
  classNameTitle: string;
  date: string;
  dayOrderNumber?: number;
  students: Student[];
  dateRecords: AttendanceItem[];
  todaySummaries: StudentAttendanceSummary[];
  dailyOverview: DailyAttendanceOverview;
  selectedPeriod?: PeriodNumber;
  initialScope?: ReportScope;
}

type ReportScope = 'fullday' | 'period';
type ReportFormat = 'standard' | 'compact' | 'complete';

export const DailyAttendanceReportTab: React.FC<DailyAttendanceReportTabProps> = ({
  classId,
  classNameTitle,
  date,
  dayOrderNumber,
  students,
  dateRecords,
  todaySummaries,
  dailyOverview,
  selectedPeriod = 1,
  initialScope = 'period',
}) => {
  const [scope, setScope] = useState<ReportScope>(initialScope);
  const [activePeriod, setActivePeriod] = useState<PeriodNumber>(selectedPeriod);
  const [format, setFormat] = useState<ReportFormat>('standard');
  const [copied, setCopied] = useState(false);
  const [showPresenteesList, setShowPresenteesList] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (initialScope) {
      setScope(initialScope);
    }
  }, [initialScope]);

  useEffect(() => {
    if (selectedPeriod) {
      setActivePeriod(selectedPeriod);
    }
  }, [selectedPeriod]);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  // Group records by student_id and period_number
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

  // Group records by period_number
  const periodAttendanceDetails = useMemo(() => {
    const map: Record<
      number,
      {
        period: PeriodNumber;
        subject: string;
        timing: string;
        presentList: Student[];
        absentList: Student[];
        odList: Student[];
        unmarkedCount: number;
        presentCount: number;
        absentCount: number;
        odCount: number;
        percentage: string;
      }
    > = {};

    for (let p = 1; p <= 7; p++) {
      const periodNum = p as PeriodNumber;
      const timingSlot = PERIOD_TIMINGS.find((t) => t.period === periodNum);
      const timing = timingSlot ? timingSlot.label : `Period ${periodNum}`;
      const subject = dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, periodNum, classId) : 'Subject';

      const presentList: Student[] = [];
      const absentList: Student[] = [];
      const odList: Student[] = [];
      let unmarked = 0;

      for (const student of activeStudents) {
        const mark = studentPeriodMarks[student.student_id]?.[periodNum];
        if (mark === 'P') presentList.push(student);
        else if (mark === 'A') absentList.push(student);
        else if (mark === 'OD') odList.push(student);
        else unmarked++;
      }

      const totalMarked = presentList.length + absentList.length + odList.length;
      const pct = totalMarked > 0 ? (((presentList.length + odList.length) / totalMarked) * 100).toFixed(1) : '0.0';

      map[periodNum] = {
        period: periodNum,
        subject,
        timing,
        presentList,
        absentList,
        odList,
        unmarkedCount: unmarked,
        presentCount: presentList.length,
        absentCount: absentList.length,
        odCount: odList.length,
        percentage: pct,
      };
    }

    return map;
  }, [activeStudents, studentPeriodMarks, dayOrderNumber, classId]);

  // Full day detailed student analysis
  const fullDayDetailedAnalysis = useMemo(() => {
    const fullAbsentees: { student: Student; totalAbsent: number }[] = [];
    const partialAbsentees: {
      student: Student;
      absentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
      presentHours: number;
      absentHours: number;
      odHours: number;
      totalWorking: number;
      percentage: number;
    }[] = [];
    const odStudents: {
      student: Student;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
    }[] = [];
    const fullPresentees: Student[] = [];

    const completedPeriods = dailyOverview.completedPeriodNumbers;

    for (const student of activeStudents) {
      const summary = todaySummaries.find((s) => s.student_id === student.student_id);
      const marksObj = studentPeriodMarks[student.student_id] || {};

      const absentPeriods: Array<{ period: PeriodNumber; subject: string }> = [];
      const odPeriods: Array<{ period: PeriodNumber; subject: string }> = [];

      for (const p of completedPeriods) {
        const mark = marksObj[p];
        const subject = dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`;
        if (mark === 'A') {
          absentPeriods.push({ period: p, subject });
        } else if (mark === 'OD') {
          odPeriods.push({ period: p, subject });
        }
      }

      if (odPeriods.length > 0) {
        odStudents.push({ student, odPeriods });
      }

      const totalWorking = summary?.totalWorkingHours || 0;
      const absentHours = summary?.absentHours || 0;
      const presentHours = summary?.presentHours || 0;
      const odHours = summary?.odHours || 0;
      const pct = summary?.percentage || 0;

      if (totalWorking > 0 && absentHours === totalWorking) {
        fullAbsentees.push({ student, totalAbsent: absentHours });
      } else if (absentHours > 0) {
        partialAbsentees.push({
          student,
          absentPeriods,
          odPeriods,
          presentHours,
          absentHours,
          odHours,
          totalWorking,
          percentage: pct,
        });
      } else if (presentHours > 0 || odHours > 0) {
        fullPresentees.push(student);
      }
    }

    return {
      fullAbsentees,
      partialAbsentees,
      odStudents,
      fullPresentees,
      completedPeriods,
    };
  }, [activeStudents, todaySummaries, studentPeriodMarks, dailyOverview, dayOrderNumber, classId]);

  // Formatted Message Text Generator
  const generatedMessageText = useMemo(() => {
    const formattedDate = formatDate(date);
    const dayLabel = dayOrderNumber ? `Day Order ${dayOrderNumber}` : '';

    if (scope === 'fullday') {
      const { fullAbsentees, partialAbsentees, odStudents, fullPresentees, completedPeriods } =
        fullDayDetailedAnalysis;

      const totalAbsentStudents = fullAbsentees.length + partialAbsentees.length;
      const periodsCount = completedPeriods.length;

      // ── FORMAT 1: WHATSAPP STANDARD (Full Day) ──
      if (format === 'standard') {
        let txt = `*SPIHER Attendance Report*\n`;
        txt += `Class: ${classId} (${classNameTitle})\n`;
        txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
        txt += `Period: Full Day (${periodsCount}/7 Periods Completed)\n\n`;

        // Presentees Section
        txt += `*Presentees (${fullPresentees.length}/${activeStudents.length}):*\n`;
        if (fullPresentees.length === 0) {
          txt += `Nil (No students fully present)\n`;
        } else {
          fullPresentees.forEach((s, idx) => {
            txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
          });
        }
        txt += `\n`;

        // Absentees Section with who are all absent in which period
        txt += `*Absentees (${totalAbsentStudents}):*\n`;
        if (totalAbsentStudents === 0) {
          txt += `Nil (All students present for all periods)\n`;
        } else {
          let aIdx = 1;
          fullAbsentees.forEach(({ student }) => {
            txt += `${aIdx++}. ${student.name} (${student.student_id}) - Full Day\n`;
          });
          partialAbsentees.forEach(({ student, absentPeriods }) => {
            const periodsText = absentPeriods.map((ap) => ap.subject ? `P${ap.period} (${ap.subject})` : `P${ap.period}`).join(', ');
            txt += `${aIdx++}. ${student.name} (${student.student_id}) - ${periodsText}\n`;
          });
        }
        txt += `\n`;

        // OD Section (if any)
        if (odStudents.length > 0) {
          txt += `*On Duty (${odStudents.length}):*\n`;
          odStudents.forEach(({ student, odPeriods }, idx) => {
            const odText = odPeriods.map((op) => op.subject ? `P${op.period} (${op.subject})` : `P${op.period}`).join(', ');
            txt += `${idx + 1}. ${student.name} (${student.student_id}) - ${odText}\n`;
          });
          txt += `\n`;
        }

        txt += `*Summary:* Total Present: *${fullPresentees.length}/${activeStudents.length}* | Total Absent: *${totalAbsentStudents}* | Attendance: *${dailyOverview.attendancePercentage.toFixed(1)}%*`;
        return txt;
      }

      // ── FORMAT 2: COMPACT / ABSENTEES ONLY ──
      if (format === 'compact') {
        let txt = `*SPIHER — ${classId} | ${formattedDate}*\n`;
        txt += `*Full Day Summary* (${periodsCount}/7 Periods)\n\n`;

        txt += `*Absentees (${totalAbsentStudents}):*\n`;
        if (totalAbsentStudents === 0) {
          txt += `All Present (Nil Absentees)\n`;
        } else {
          let aIdx = 1;
          fullAbsentees.forEach(({ student }) => {
            txt += `${aIdx++}. ${student.name} (${student.student_id}) - Full Day\n`;
          });
          partialAbsentees.forEach(({ student, absentPeriods }) => {
            const periodsText = absentPeriods.map((ap) => `P${ap.period}`).join(', ');
            txt += `${aIdx++}. ${student.name} (${student.student_id}) - ${periodsText}\n`;
          });
        }

        if (odStudents.length > 0) {
          txt += `\n*OD (${odStudents.length}):* ${odStudents.map((o) => `${o.student.name} (P${o.odPeriods.map((x) => x.period).join(',')})`).join(', ')}\n`;
        }

        txt += `\n*Present: ${fullPresentees.length}/${activeStudents.length}* | *${dailyOverview.attendancePercentage.toFixed(1)}%*`;
        return txt;
      }


      // ── FORMAT 3: COMPLETE AUDIT DOCUMENT ──
      let txt = `=====================================================\n`;
      txt += `ST. PETER'S INSTITUTE OF HIGHER EDUCATION & RESEARCH\n`;
      txt += `DAILY CLASS ATTENDANCE REGISTER & AUDIT REPORT\n`;
      txt += `=====================================================\n`;
      txt += `Class                 : ${classId} - ${classNameTitle}\n`;
      txt += `Date                  : ${formattedDate} (${dayLabel})\n`;
      txt += `Total Enrolled        : ${activeStudents.length} Students\n`;
      txt += `Periods Completed     : ${periodsCount} / 7 Periods\n`;
      txt += `Total Student-Hours   : ${dailyOverview.totalStudentPeriods} hrs\n`;
      txt += `Total Present-Hours   : ${dailyOverview.presentCount} hrs\n`;
      txt += `Total OD-Hours        : ${dailyOverview.odCount} hrs\n`;
      txt += `Total Absent-Hours    : ${dailyOverview.absentCount} hrs\n`;
      txt += `Day Attendance Rate   : ${dailyOverview.attendancePercentage.toFixed(1)}%\n`;
      txt += `-----------------------------------------------------\n\n`;

      txt += `--- FULL DAY ABSENTEES (${fullAbsentees.length}) ---\n`;
      if (fullAbsentees.length === 0) {
        txt += `None\n`;
      } else {
        fullAbsentees.forEach(({ student }, idx) => {
          txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} (Absent for all ${periodsCount} periods)\n`;
        });
      }

      txt += `\n--- PERIOD-WISE PARTIAL ABSENTEES (${partialAbsentees.length}) ---\n`;
      if (partialAbsentees.length === 0) {
        txt += `None\n`;
      } else {
        partialAbsentees.forEach(({ student, absentPeriods, presentHours, totalWorking }, idx) => {
          const detail = absentPeriods.map((p) => `P${p.period} (${p.subject})`).join(', ');
          txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name}\n    Absent in: ${detail} [Attended: ${presentHours}/${totalWorking} hrs]\n`;
        });
      }

      if (odStudents.length > 0) {
        txt += `\n--- ON DUTY (OD) STUDENTS (${odStudents.length}) ---\n`;
        odStudents.forEach(({ student, odPeriods }, idx) => {
          const detail = odPeriods.map((p) => `P${p.period} (${p.subject})`).join(', ');
          txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} (${detail})\n`;
        });
      }

      txt += `\n--- PERIOD-BY-PERIOD SUMMARY ---\n`;
      completedPeriods.forEach((p) => {
        const pd = periodAttendanceDetails[p];
        if (pd) {
          txt += `\nPeriod ${p} [${pd.timing}] - ${pd.subject}\n`;
          txt += `  Present: ${pd.presentCount} | OD: ${pd.odCount} | Absent: ${pd.absentCount} | Rate: ${pd.percentage}%\n`;
          txt += `  Presentees (${pd.presentCount}): ${pd.presentList.length > 0 ? pd.presentList.map((s) => `${s.name} (${s.student_id})`).join(', ') : 'None'}\n`;
          if (pd.odCount > 0) {
            txt += `  OD (${pd.odCount}): ${pd.odList.map((s) => `${s.name} (${s.student_id})`).join(', ')}\n`;
          }
          txt += `  Absentees (${pd.absentCount}): ${pd.absentList.length > 0 ? pd.absentList.map((s) => `${s.name} (${s.student_id})`).join(', ') : 'Nil'}\n`;
        }
      });

      txt += `\n=====================================================\n`;
      txt += `Generated on ${new Date().toLocaleString()} by SPIHER CR Portal\n`;
      return txt;
    }

    // ── SCOPE: SINGLE PERIOD ──
    const pData = periodAttendanceDetails[activePeriod];
    if (!pData) return 'No period data available.';

    if (format === 'standard') {
      let txt = `*SPIHER Attendance Report*\n`;
      txt += `Class: ${classId} (${classNameTitle})\n`;
      txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
      txt += `Period: Period ${activePeriod} (${pData.subject})\n\n`;

      // Presentees first
      txt += `*Presentees (${pData.presentCount + pData.odCount}/${activeStudents.length}):*\n`;
      if (pData.presentList.length === 0 && pData.odCount === 0) {
        txt += `Nil (No students present)\n`;
      } else {
        let idx = 1;
        pData.presentList.forEach((s) => {
          txt += `${idx++}. ${s.name} (${s.student_id})\n`;
        });
        pData.odList.forEach((s) => {
          txt += `${idx++}. ${s.name} (${s.student_id})\n`;
        });
      }
      txt += `\n`;

      // Absentees
      txt += `*Absentees (${pData.absentCount}):*\n`;
      if (pData.absentList.length === 0) {
        txt += `Nil (All students present)\n`;
      } else {
        pData.absentList.forEach((s, i) => {
          txt += `${i + 1}. ${s.name} (${s.student_id})\n`;
        });
      }
      txt += `\n`;

      // OD section (if any)
      if (pData.odCount > 0) {
        txt += `*On Duty (${pData.odCount}):*\n`;
        pData.odList.forEach((s, i) => {
          txt += `${i + 1}. ${s.name} (${s.student_id})\n`;
        });
        txt += `\n`;
      }

      txt += `*Summary:* Total Present: *${pData.presentCount + pData.odCount}/${activeStudents.length}* | Total Absent: *${pData.absentCount}* | Attendance: *${pData.percentage}%*`;
      return txt;
    }

    if (format === 'compact') {
      let txt = `*SPIHER — ${classId} | Period ${activePeriod} (${pData.subject})*\n`;
      txt += `Date: ${formattedDate}\n\n`;

      txt += `*Absentees (${pData.absentCount}):*\n`;
      if (pData.absentList.length === 0) {
        txt += `All Present (Nil Absentees)\n`;
      } else {
        pData.absentList.forEach((s, idx) => {
          txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
        });
      }

      if (pData.odCount > 0) {
        txt += `\n*OD (${pData.odCount}):* ${pData.odList.map((s) => s.name).join(', ')}\n`;
      }

      txt += `\n*Present: ${pData.presentCount + pData.odCount}/${activeStudents.length}* | *${pData.percentage}%*`;
      return txt;
    }

    // Detailed Doc
    let txt = `========================================\n`;
    txt += `SPIHER PERIOD ATTENDANCE AUDIT\n`;
    txt += `========================================\n`;
    txt += `Class     : ${classId} - ${classNameTitle}\n`;
    txt += `Date      : ${formattedDate} (${dayLabel})\n`;
    txt += `Period    : Period ${activePeriod} (${pData.timing})\n`;
    txt += `Subject   : ${pData.subject}\n`;
    txt += `Enrolled  : ${activeStudents.length}\n`;
    txt += `Present   : ${pData.presentCount}\n`;
    txt += `On Duty   : ${pData.odCount}\n`;
    txt += `Absent    : ${pData.absentCount}\n`;
    txt += `Rate      : ${pData.percentage}%\n`;
    txt += `----------------------------------------\n\n`;

    txt += `--- ABSENTEES LIST (${pData.absentCount}) ---\n`;
    if (pData.absentList.length === 0) {
      txt += `Nil\n`;
    } else {
      pData.absentList.forEach((s, idx) => {
        txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`;
      });
    }

    if (pData.odCount > 0) {
      txt += `\n--- ON DUTY LIST (${pData.odCount}) ---\n`;
      pData.odList.forEach((s, idx) => {
        txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`;
      });
    }

    return txt;
  }, [
    scope,
    format,
    date,
    dayOrderNumber,
    classId,
    classNameTitle,
    fullDayDetailedAnalysis,
    activePeriod,
    periodAttendanceDetails,
    activeStudents,
    dailyOverview,
  ]);

  // Actions
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessageText);
      setCopied(true);
      toast.success('Formatted attendance report copied to clipboard!', 'Copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard', 'Error');
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(generatedMessageText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([generatedMessageText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scopeLabel = scope === 'fullday' ? 'FullDay' : `Period_${activePeriod}`;
    link.download = `${classId}_${date}_Attendance_${scopeLabel}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded report text file', 'Downloaded');
  };

  return (
    <div className="space-y-4 pb-6">
      {/* ── BANNER: WhatsApp Report Controls ── */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 text-white shadow-xl overflow-hidden rounded-3xl">
        <CardContent className="p-4 sm:p-5 space-y-4">

          {/* Title Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
                <MessageCircle className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black tracking-tight">WhatsApp & Daily Report</h3>
                  <Badge variant="success" size="sm" className="font-extrabold">{classId}</Badge>
                  {dayOrderNumber && <Badge variant="purple" size="sm" className="font-bold">Day Order {dayOrderNumber}</Badge>}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{formatDate(date)} • Full day absentees, OD & period-wise report</p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleWhatsAppShare}
                className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Share to WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className={cn(
                  'gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer',
                  copied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 text-xs px-2.5 py-2 rounded-xl cursor-pointer"
                title="Download .txt"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Controls Row: Scope + Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
            {/* Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Report Scope:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/10 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('fullday')}
                  className={cn(
                    'py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'fullday' ? 'bg-emerald-500 text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Full Day Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('period')}
                  className={cn(
                    'py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'period' ? 'bg-emerald-500 text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Period {activePeriod}</span>
                </button>
              </div>
            </div>

            {/* Format Style */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Format Style:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/10 rounded-2xl text-[11px] font-bold">
                {(['standard', 'compact', 'complete'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      'py-2 px-2 rounded-xl transition-all text-center cursor-pointer',
                      format === f ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                    )}
                  >
                    {f === 'standard' ? 'WhatsApp' : f === 'compact' ? 'Short' : 'Official Doc'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Period Selector (if period scope) */}
          {scope === 'period' && (
            <div className="space-y-1.5 pt-3 border-t border-white/10">
              <span className="text-[11px] text-slate-300 font-extrabold uppercase tracking-wider">Select Period:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                  const pd = periodAttendanceDetails[p];
                  const isSelected = activePeriod === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActivePeriod(p as PeriodNumber)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                        isSelected
                          ? 'bg-blue-500 text-white shadow-xs font-black ring-2 ring-blue-300'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      )}
                    >
                      <span>P{p}</span>
                      {pd?.subject && <span className="text-[10px] opacity-80">({pd.subject})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MAIN CONTENT: Message Preview + Absentees Side by Side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left: Formatted Message Preview */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-3xl flex flex-col overflow-hidden">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black text-slate-900">Message Preview</CardTitle>
                  <CardDescription className="text-[11px]">
                    {generatedMessageText.split('\n').length} lines • {generatedMessageText.length} chars
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className={cn(
                    'gap-1 text-xs font-bold py-1.5 px-3 rounded-xl border transition-all cursor-pointer',
                    copied ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-black' : 'border-slate-300 bg-white hover:bg-slate-100'
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleWhatsAppShare}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-1.5 px-3.5 rounded-xl shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col">
            <textarea
              readOnly
              value={generatedMessageText}
              className="w-full flex-1 min-h-[320px] sm:min-h-[420px] p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none resize-none shadow-inner leading-relaxed select-all"
            />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[10px] text-slate-400 font-mono">Tap inside to select all</span>
              <p className="text-[10px] text-emerald-700 font-bold">✓ Ready for CR WhatsApp Group</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Absentees Breakdown */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <CardTitle className="text-sm font-black text-slate-900">Absentees Breakdown</CardTitle>
              </div>
              <Badge variant="danger" size="sm">
                {fullDayDetailedAnalysis.fullAbsentees.length + fullDayDetailedAnalysis.partialAbsentees.length} Total
              </Badge>
            </div>
            <CardDescription className="text-xs">Full-day and period-wise absentees with exact periods.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Full Day Absentees */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                Full-Day Absentees ({fullDayDetailedAnalysis.fullAbsentees.length})
              </span>
              {fullDayDetailedAnalysis.fullAbsentees.length === 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">No full-day absentees today.</div>
              ) : (
                <div className="divide-y divide-rose-100 bg-rose-50/50 border border-rose-200 rounded-xl overflow-hidden">
                  {fullDayDetailedAnalysis.fullAbsentees.map(({ student }) => (
                    <div key={student.student_id} className="p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">{student.student_id}</span>
                        <span className="font-bold text-slate-900 truncate">{student.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full shrink-0">Full Day</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Period-Wise Absentees */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                Period-Wise Absentees ({fullDayDetailedAnalysis.partialAbsentees.length})
              </span>
              {fullDayDetailedAnalysis.partialAbsentees.length === 0 ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">No partial absentees today.</div>
              ) : (
                <div className="space-y-2">
                  {fullDayDetailedAnalysis.partialAbsentees.map(({ student, absentPeriods, presentHours, totalWorking }) => (
                    <div key={student.student_id} className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">{student.student_id}</span>
                          <span className="font-bold text-slate-900 truncate">{student.name}</span>
                        </div>
                        <Badge variant="warning" size="sm">{presentHours}/{totalWorking} hrs</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-rose-800 shrink-0">Absent:</span>
                        {absentPeriods.map((ap) => (
                          <span key={ap.period} className="px-2 py-0.5 bg-rose-100 text-rose-900 font-bold rounded text-[11px] border border-rose-200">
                            P{ap.period} ({ap.subject})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OD Students */}
            {fullDayDetailedAnalysis.odStudents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  On Duty ({fullDayDetailedAnalysis.odStudents.length})
                </span>
                <div className="space-y-1.5">
                  {fullDayDetailedAnalysis.odStudents.map(({ student, odPeriods }) => (
                    <div key={student.student_id} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-[11px] text-amber-900 shrink-0">{student.student_id}</span>
                        <span className="font-bold text-slate-900 truncate">{student.name}</span>
                      </div>
                      <span className="text-[11px] text-amber-900 font-bold shrink-0">{odPeriods.map((op) => `P${op.period}`).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 2: PERIOD-BY-PERIOD MATRIX ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-black text-slate-900">Period-by-Period Roster</CardTitle>
            </div>
            <Badge variant="purple" size="sm">{dailyOverview.periodsCompleted}/7 Periods</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
              const pd = periodAttendanceDetails[p];
              const isRecorded = dailyOverview.completedPeriodNumbers.includes(p as PeriodNumber);
              return (
                <div
                  key={p}
                  className={cn(
                    'p-3.5 rounded-2xl border text-xs flex flex-col gap-2.5',
                    isRecorded ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/40 border-dashed border-slate-200 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">P{p}</span>
                      <span className="font-black text-slate-900 truncate">{pd?.subject || 'Subject'}</span>
                    </div>
                    {isRecorded
                      ? <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">{pd?.percentage}%</span>
                      : <span className="text-[10px] text-slate-400 italic">Not Marked</span>
                    }
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{pd?.timing}</div>

                  {isRecorded && pd && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-1 text-center font-mono">
                        <div className="p-1 bg-emerald-50 rounded text-emerald-800">
                          <span className="text-[9px] block text-emerald-600 font-bold uppercase">Pres</span>
                          <span className="font-black text-xs">{pd.presentCount}</span>
                        </div>
                        <div className="p-1 bg-rose-50 rounded text-rose-800">
                          <span className="text-[9px] block text-rose-600 font-bold uppercase">Abs</span>
                          <span className="font-black text-xs">{pd.absentCount}</span>
                        </div>
                        <div className="p-1 bg-amber-50 rounded text-amber-800">
                          <span className="text-[9px] block text-amber-600 font-bold uppercase">OD</span>
                          <span className="font-black text-xs">{pd.odCount}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Absentees:</span>
                        {pd.absentList.length === 0 ? (
                          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">✓ All Present</p>
                        ) : (
                          <div className="text-[11px] text-rose-800 font-mono mt-0.5 line-clamp-2">
                            {pd.absentList.map((s) => s.name.split(' ')[0]).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: FULL PRESENTEES LIST (Collapsible) ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPresenteesList(!showPresenteesList)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">Full Day Presentees ({fullDayDetailedAnalysis.fullPresentees.length})</h4>
                <Badge variant="success" size="sm">100% Today</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Students who attended all scheduled periods.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs font-bold text-slate-600 hidden sm:inline">{showPresenteesList ? 'Hide' : 'View All'}</span>
            {showPresenteesList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showPresenteesList && (
          <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fullDayDetailedAnalysis.fullPresentees.map((student, idx) => (
                <div key={student.student_id} className="p-2 px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{idx + 1}.</span>
                    <span className="font-mono font-bold text-[11px] text-slate-900 bg-slate-100 px-1 py-0.5 rounded shrink-0">{student.student_id}</span>
                    <span className="font-bold text-slate-900 truncate">{student.name}</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DailyAttendanceReportTab;
