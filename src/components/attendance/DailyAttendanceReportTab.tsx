import React, { useState, useMemo } from 'react';
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
}) => {
  const [scope, setScope] = useState<ReportScope>('fullday');
  const [activePeriod, setActivePeriod] = useState<PeriodNumber>(selectedPeriod);
  const [format, setFormat] = useState<ReportFormat>('standard');
  const [copied, setCopied] = useState(false);
  const [showPresenteesList, setShowPresenteesList] = useState(false);
  const toast = useToast();

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

      // ── FORMAT 1: WHATSAPP STANDARD ──
      if (format === 'standard') {
        let txt = `*🎓 SPIHER — Daily Attendance Report*\n`;
        txt += `*Class:* ${classId} (${classNameTitle})\n`;
        txt += `*Date:* ${formattedDate} ${dayLabel ? `| ${dayLabel}` : ''}\n`;
        txt += `*Periods Completed:* ${periodsCount}/7 Periods\n\n`;

        // Absentees Section
        txt += `*🔴 Absentees Breakdown (${totalAbsentStudents} Students):*\n`;

        if (fullAbsentees.length > 0) {
          txt += `\n*• Full-Day Absentees (${fullAbsentees.length}):*\n`;
          fullAbsentees.forEach(({ student }, idx) => {
            txt += `  ${idx + 1}. ${student.name} (${student.student_id})\n`;
          });
        }

        if (partialAbsentees.length > 0) {
          txt += `\n*• Period-Wise Absentees (${partialAbsentees.length}):*\n`;
          partialAbsentees.forEach(({ student, absentPeriods, presentHours, totalWorking }, idx) => {
            const periodsText = absentPeriods.map((ap) => `P${ap.period} [${ap.subject}]`).join(', ');
            txt += `  ${idx + 1}. ${student.name} (${student.student_id})\n     ↳ Absent in: *${periodsText}* (Attended: ${presentHours}/${totalWorking} hrs)\n`;
          });
        }

        if (fullAbsentees.length === 0 && partialAbsentees.length === 0) {
          txt += `✓ *Nil (100% Attendance for all periods)*\n`;
        }

        // OD Section
        if (odStudents.length > 0) {
          txt += `\n*🟡 On Duty (OD) (${odStudents.length}):*\n`;
          odStudents.forEach(({ student, odPeriods }, idx) => {
            const odText = odPeriods.map((op) => `P${op.period} (${op.subject})`).join(', ');
            txt += `  ${idx + 1}. ${student.name} (${student.student_id}) — ${odText}\n`;
          });
        }

        // Present Summary
        txt += `\n*🟢 Presentees Summary:*\n`;
        txt += `• Full-Day Present: *${fullPresentees.length}/${activeStudents.length}*\n`;
        txt += `• Overall Day Attendance: *${dailyOverview.attendancePercentage.toFixed(1)}%*\n\n`;

        // Period-by-Period Matrix Breakdown
        txt += `*⏱️ Period-Wise Attendance:*\n`;
        completedPeriods.forEach((p) => {
          const pData = periodAttendanceDetails[p];
          if (pData) {
            const absList = pData.absentList.map((s) => s.student_id.slice(-3)).join(', ');
            const absSuffix = pData.absentCount > 0 ? ` | Absent: ${absList}` : ' | All Present';
            txt += `• *P${p} (${pData.subject}):* ${pData.presentCount + pData.odCount}/${activeStudents.length} (${pData.percentage}%)${absSuffix}\n`;
          }
        });

        txt += `\n_Generated via SPIHER CR Attendance Portal_`;
        return txt;
      }

      // ── FORMAT 2: COMPACT / ABSENTEES ONLY ──
      if (format === 'compact') {
        let txt = `*SPIHER ${classId} Absentees — ${formattedDate}*\n`;
        txt += `*Day Order:* ${dayOrderNumber ? `DO ${dayOrderNumber}` : '—'} | *Periods Marked:* ${periodsCount}/7\n\n`;

        if (fullAbsentees.length > 0) {
          txt += `*Full Day Absentees (${fullAbsentees.length}):*\n`;
          fullAbsentees.forEach(({ student }, idx) => {
            txt += `${idx + 1}. ${student.name} (${student.student_id})\n`;
          });
          txt += `\n`;
        }

        if (partialAbsentees.length > 0) {
          txt += `*Period Absentees (${partialAbsentees.length}):*\n`;
          partialAbsentees.forEach(({ student, absentPeriods }, idx) => {
            const periodsText = absentPeriods.map((ap) => `P${ap.period}`).join(', ');
            txt += `${idx + 1}. ${student.name} (${student.student_id}) — Absent in ${periodsText}\n`;
          });
          txt += `\n`;
        }

        if (odStudents.length > 0) {
          txt += `*OD (${odStudents.length}):* ${odStudents.map((o) => `${o.student.name} (P${o.odPeriods.map((x) => x.period).join(',')})`).join(', ')}\n\n`;
        }

        txt += `*Total Present Hours:* ${dailyOverview.presentCount} | *Total Absent Hours:* ${dailyOverview.absentCount} | *Day Att:* ${dailyOverview.attendancePercentage.toFixed(1)}%`;
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
          txt += `Period ${p} [${pd.timing}] - ${pd.subject}\n`;
          txt += `  Present: ${pd.presentCount} | OD: ${pd.odCount} | Absent: ${pd.absentCount} | Rate: ${pd.percentage}%\n`;
          if (pd.absentList.length > 0) {
            txt += `  Absentees: ${pd.absentList.map((s) => `${s.name} (${s.student_id})`).join(', ')}\n`;
          }
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
      txt += `Date: ${formattedDate} ${dayLabel ? `| ${dayLabel}` : ''}\n`;
      txt += `Period: Period ${activePeriod} (${pData.subject}) [${pData.timing}]\n\n`;

      txt += `*Absentees (${pData.absentCount}):*\n`;
      if (pData.absentList.length === 0) {
        txt += `Nil (100% Present)\n`;
      } else {
        pData.absentList.forEach((s, idx) => {
          txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
        });
      }
      txt += `\n`;

      if (pData.odCount > 0) {
        txt += `*On Duty (${pData.odCount}):*\n`;
        pData.odList.forEach((s, idx) => {
          txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
        });
        txt += `\n`;
      }

      txt += `*Summary:* Present: *${pData.presentCount + pData.odCount}/${activeStudents.length}* | Absent: *${pData.absentCount}* | Attendance: *${pData.percentage}%*`;
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
    <div className="space-y-6">
      {/* ── TOP ACTION & SHARING BANNER (Prominently at the top so NO scrolling is needed!) ── */}
      <Card className="border-emerald-300 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white shadow-lg overflow-hidden rounded-3xl">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shadow-inner shrink-0">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Instant WhatsApp & Daily Attendance Report
                  </h3>
                  <Badge variant="success" size="sm" className="font-bold">
                    {classId}
                  </Badge>
                  {dayOrderNumber && (
                    <Badge variant="purple" size="sm">
                      Day Order {dayOrderNumber}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {formatDate(date)} • 1-Click WhatsApp share with full day present, absent, OD, and period-wise absentees.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons (At Top!) */}
            <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
              {/* WhatsApp Share Button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleWhatsAppShare}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-2xl shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Share to WhatsApp</span>
              </Button>

              {/* Copy Text Button */}
              <Button
                variant="outline"
                size="md"
                onClick={handleCopy}
                className={cn(
                  'gap-1.5 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl border transition-all cursor-pointer',
                  copied
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                )}
              >
                {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </Button>

              {/* Download .txt */}
              <Button
                variant="outline"
                size="md"
                onClick={handleDownloadTxt}
                className="gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 text-xs px-3.5 py-2.5 rounded-2xl cursor-pointer"
                title="Download report as .txt"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">.txt</span>
              </Button>
            </div>
          </div>

          {/* Controls: Scope Selector & Format Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
            {/* Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Report Scope:
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-white/10 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('fullday')}
                  className={cn(
                    'py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'fullday'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Full Day Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('period')}
                  className={cn(
                    'py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'period'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Period (P{activePeriod})</span>
                </button>
              </div>
            </div>

            {/* Format Style */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Format Style:
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/10 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFormat('standard')}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center text-[11px] cursor-pointer',
                    format === 'standard'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('compact')}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center text-[11px] cursor-pointer',
                    format === 'compact'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  Absentees Only
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('complete')}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center text-[11px] cursor-pointer',
                    format === 'complete'
                      ? 'bg-white text-slate-950 shadow-xs font-black'
                      : 'text-slate-300 hover:text-white'
                  )}
                >
                  Official Doc
                </button>
              </div>
            </div>
          </div>

          {/* Period Selector (if in period scope) */}
          {scope === 'period' && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-white/10">
              <span className="text-xs text-slate-400 font-bold mr-1">Select Period:</span>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                const pd = periodAttendanceDetails[p];
                const isSelected = activePeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActivePeriod(p as PeriodNumber)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer',
                      isSelected
                        ? 'bg-blue-500 text-white shadow-xs font-black'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    )}
                  >
                    <span>P{p}</span>
                    {pd && (
                      <span className="text-[10px] text-slate-300 opacity-80">
                        ({pd.subject})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION 1: DETAILED ABSENTEES & ATTENDANCE BREAKDOWN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Absentees Breakdown (Full Day + Period Specific) */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Absentees & Period-Wise Absence Breakdown
                </CardTitle>
              </div>
              <Badge variant="danger" size="sm">
                {fullDayDetailedAnalysis.fullAbsentees.length +
                  fullDayDetailedAnalysis.partialAbsentees.length}{' '}
                Total Absentees
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Categorized into Full-Day absentees and partial period absentees with exact period numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* 1. Full Day Absentees */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>Full-Day Absentees ({fullDayDetailedAnalysis.fullAbsentees.length})</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Absent for all marked periods
                </span>
              </div>

              {fullDayDetailedAnalysis.fullAbsentees.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                  No full-day absentees today.
                </div>
              ) : (
                <div className="divide-y divide-rose-100 bg-rose-50/50 border border-rose-200 rounded-xl overflow-hidden">
                  {fullDayDetailedAnalysis.fullAbsentees.map(({ student }) => (
                    <div
                      key={student.student_id}
                      className="p-2.5 px-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded">
                          {student.student_id}
                        </span>
                        <span className="font-bold text-slate-900">{student.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full">
                        Full Day Absent
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Partial / Period-Wise Absentees */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Period-Wise Absentees ({fullDayDetailedAnalysis.partialAbsentees.length})</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Absent in specific periods
                </span>
              </div>

              {fullDayDetailedAnalysis.partialAbsentees.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                  No partial period absentees today.
                </div>
              ) : (
                <div className="space-y-2">
                  {fullDayDetailedAnalysis.partialAbsentees.map(
                    ({ student, absentPeriods, presentHours, totalWorking }) => (
                      <div
                        key={student.student_id}
                        className="p-3 bg-amber-50/40 border border-amber-200 rounded-xl space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {student.student_id}
                            </span>
                            <span className="font-bold text-slate-900">{student.name}</span>
                          </div>
                          <Badge variant="warning" size="sm">
                            Attended: {presentHours}/{totalWorking} hrs
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-rose-800">
                            Absent in Periods:
                          </span>
                          {absentPeriods.map((ap) => (
                            <span
                              key={ap.period}
                              className="px-2 py-0.5 bg-rose-100 text-rose-900 font-bold rounded text-[11px] border border-rose-200"
                            >
                              P{ap.period} ({ap.subject})
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 3. On-Duty (OD) Students */}
            {fullDayDetailedAnalysis.odStudents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>On Duty (OD) Students ({fullDayDetailedAnalysis.odStudents.length})</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  {fullDayDetailedAnalysis.odStudents.map(({ student, odPeriods }) => (
                    <div
                      key={student.student_id}
                      className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[11px] text-amber-900">
                          {student.student_id}
                        </span>
                        <span className="font-bold text-slate-900">{student.name}</span>
                      </div>
                      <span className="text-[11px] text-amber-900 font-bold">
                        {odPeriods.map((op) => `P${op.period} (${op.subject})`).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Formatted Message Live Preview & 1-Click Copy */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-sm font-black text-slate-900">
                  Formatted WhatsApp Message Output
                </CardTitle>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1 text-xs font-bold border-slate-300 py-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleWhatsAppShare}
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Live preview formatted with emojis, bold headers, and exact period absentees ready to paste.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="relative flex-1">
              <textarea
                readOnly
                value={generatedMessageText}
                rows={16}
                className="w-full h-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none select-all resize-none shadow-inner leading-relaxed"
              />
            </div>

            <div className="pt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{generatedMessageText.split('\n').length} lines • {generatedMessageText.length} characters</span>
              <span className="text-emerald-700 font-bold">✓ Ready for CR WhatsApp Group</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 2: PERIOD-BY-PERIOD SUMMARY MATRIX (P1 TO P7) ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-black text-slate-900">
                Period-by-Period Daily Schedule & Attendance Roster
              </CardTitle>
            </div>
            <Badge variant="purple" size="sm">
              {dailyOverview.periodsCompleted} / 7 Periods Completed
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Review individual period attendance metrics, subjects, timings, and absentees for each period.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
              const pd = periodAttendanceDetails[p];
              const isRecorded = dailyOverview.completedPeriodNumbers.includes(p as PeriodNumber);

              return (
                <div
                  key={p}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all text-xs flex flex-col justify-between gap-3',
                    isRecorded
                      ? 'bg-slate-50 border-slate-200 shadow-2xs'
                      : 'bg-slate-50/40 border-dashed border-slate-200 opacity-70'
                  )}
                >
                  {/* Top Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          P{p}
                        </span>
                        <span className="font-black text-sm text-slate-900 truncate">
                          {pd?.subject || 'Subject'}
                        </span>
                      </div>

                      {isRecorded ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                          {pd?.percentage}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not Marked</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {pd?.timing}
                    </div>
                  </div>

                  {/* Stats Counts */}
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

                      {/* Absentees List for this period */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Absentees ({pd.absentCount}):
                        </span>
                        {pd.absentList.length === 0 ? (
                          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            ✓ 100% Attended
                          </p>
                        ) : (
                          <div className="text-[11px] text-rose-800 font-mono mt-0.5 line-clamp-2">
                            {pd.absentList.map((s) => s.student_id.slice(-3) + ' ' + s.name.split(' ')[0]).join(', ')}
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

      {/* ── SECTION 3: 100% PRESENTEES ROSTER (Collapsible) ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPresenteesList(!showPresenteesList)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-slate-900">
                  Full Day Presentees ({fullDayDetailedAnalysis.fullPresentees.length} Students)
                </h4>
                <Badge variant="success" size="sm">
                  100% Today
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Students who attended all scheduled periods for {formatDate(date)}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs font-bold text-slate-600 hidden sm:inline">
              {showPresenteesList ? 'Hide List' : 'View All'}
            </span>
            {showPresenteesList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showPresenteesList && (
          <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {fullDayDetailedAnalysis.fullPresentees.map((student, idx) => (
                <div
                  key={student.student_id}
                  className="p-2 px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-400 font-mono">{idx + 1}.</span>
                    <span className="font-mono font-bold text-[11px] text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                      {student.student_id}
                    </span>
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
