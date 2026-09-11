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

export type ReportScope = 'fullday' | 'period' | 'custom';
export type ReportFormat = 'standard' | 'compact' | 'complete';

export const DailyAttendanceReportTab: React.FC<DailyAttendanceReportTabProps> = ({
  classId,
  classNameTitle,
  date,
  dayOrderNumber,
  students,
  dateRecords,
  todaySummaries: _todaySummaries,
  dailyOverview,
  selectedPeriod = 1,
  initialScope = 'period',
}) => {
  const [scope, setScope] = useState<ReportScope>(initialScope);
  const [customPeriods, setCustomPeriods] = useState<PeriodNumber[]>([1, 2, 3, 4]);
  const [activePeriod, setActivePeriod] = useState<PeriodNumber>(selectedPeriod);
  const [format, setFormat] = useState<ReportFormat>('standard');
  const [breakdownView, setBreakdownView] = useState<'presentees' | 'absentees'>('presentees');
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

  // Active evaluated periods for multi-period scopes (fullday or custom)
  const evaluatedPeriods = useMemo<PeriodNumber[]>(() => {
    if (scope === 'custom') {
      return customPeriods.length > 0 ? customPeriods : [1, 2, 3, 4];
    }
    // fullday
    return dailyOverview.completedPeriodNumbers.length > 0
      ? dailyOverview.completedPeriodNumbers
      : [1, 2, 3, 4, 5, 6, 7];
  }, [scope, customPeriods, dailyOverview.completedPeriodNumbers]);

  // Multi-period detailed student analysis (Full Day & Custom Scopes)
  const multiPeriodAnalysis = useMemo(() => {
    const fullPresentees: Student[] = [];
    const partialPresentees: Array<{
      student: Student;
      presentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
      attendedHours: number;
      totalEvaluated: number;
    }> = [];
    const fullAbsentees: Array<{ student: Student; totalAbsent: number }> = [];
    const partialAbsentees: Array<{
      student: Student;
      absentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
      presentHours: number;
      absentHours: number;
      odHours: number;
      totalWorking: number;
      percentage: number;
    }> = [];
    const odStudents: Array<{
      student: Student;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
    }> = [];

    const totalEvaluated = evaluatedPeriods.length;

    for (const student of activeStudents) {
      const marksObj = studentPeriodMarks[student.student_id] || {};

      const presentPeriods: Array<{ period: PeriodNumber; subject: string }> = [];
      const absentPeriods: Array<{ period: PeriodNumber; subject: string }> = [];
      const odPeriods: Array<{ period: PeriodNumber; subject: string }> = [];

      for (const p of evaluatedPeriods) {
        const mark = marksObj[p];
        const subject = dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`;
        if (mark === 'P') {
          presentPeriods.push({ period: p, subject });
        } else if (mark === 'A') {
          absentPeriods.push({ period: p, subject });
        } else if (mark === 'OD') {
          odPeriods.push({ period: p, subject });
        }
      }

      if (odPeriods.length > 0) {
        odStudents.push({ student, odPeriods });
      }

      const attendedCount = presentPeriods.length + odPeriods.length;
      const absentCount = absentPeriods.length;

      if (totalEvaluated > 0 && absentCount === totalEvaluated) {
        fullAbsentees.push({ student, totalAbsent: absentCount });
      } else if (totalEvaluated > 0 && attendedCount === totalEvaluated) {
        fullPresentees.push(student);
      } else if (attendedCount > 0 || absentCount > 0) {
        if (attendedCount > 0) {
          partialPresentees.push({
            student,
            presentPeriods,
            odPeriods,
            attendedHours: attendedCount,
            totalEvaluated,
          });
        }
        if (absentCount > 0) {
          partialAbsentees.push({
            student,
            absentPeriods,
            odPeriods,
            presentHours: presentPeriods.length,
            absentHours: absentCount,
            odHours: odPeriods.length,
            totalWorking: totalEvaluated,
            percentage: Math.round((attendedCount / totalEvaluated) * 100),
          });
        }
      }
    }

    // Build unified rosters sorted by Register Number (natural numeric sort)
    const sortedActiveStudents = [...activeStudents].sort((a, b) =>
      a.student_id.localeCompare(b.student_id, undefined, { numeric: true })
    );

    const presenteesRoster: Array<{
      student: Student;
      isFull: boolean;
      presentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
      attendedCount: number;
    }> = [];

    const absenteesRoster: Array<{
      student: Student;
      isFull: boolean;
      absentPeriods: Array<{ period: PeriodNumber; subject: string }>;
      odPeriods: Array<{ period: PeriodNumber; subject: string }>;
      absentCount: number;
    }> = [];

    for (const student of sortedActiveStudents) {
      const isFullPres = fullPresentees.some((s) => s.student_id === student.student_id);
      const partialPres = partialPresentees.find((p) => p.student.student_id === student.student_id);
      if (isFullPres) {
        presenteesRoster.push({
          student,
          isFull: true,
          presentPeriods: evaluatedPeriods.map((p) => ({
            period: p,
            subject: dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`,
          })),
          odPeriods: [],
          attendedCount: totalEvaluated,
        });
      } else if (partialPres) {
        presenteesRoster.push({
          student,
          isFull: false,
          presentPeriods: partialPres.presentPeriods,
          odPeriods: partialPres.odPeriods,
          attendedCount: partialPres.attendedHours,
        });
      }

      const isFullAbs = fullAbsentees.some((a) => a.student.student_id === student.student_id);
      const partialAbs = partialAbsentees.find((p) => p.student.student_id === student.student_id);
      if (isFullAbs) {
        absenteesRoster.push({
          student,
          isFull: true,
          absentPeriods: evaluatedPeriods.map((p) => ({
            period: p,
            subject: dayOrderNumber ? getSubjectForSlot(dayOrderNumber as any, p, classId) : `Period ${p}`,
          })),
          odPeriods: [],
          absentCount: totalEvaluated,
        });
      } else if (partialAbs) {
        absenteesRoster.push({
          student,
          isFull: false,
          absentPeriods: partialAbs.absentPeriods,
          odPeriods: partialAbs.odPeriods,
          absentCount: partialAbs.absentHours,
        });
      }
    }

    const odRoster = [...odStudents].sort((a, b) =>
      a.student.student_id.localeCompare(b.student.student_id, undefined, { numeric: true })
    );

    return {
      fullPresentees,
      partialPresentees,
      fullAbsentees,
      partialAbsentees,
      odStudents,
      presenteesRoster,
      absenteesRoster,
      odRoster,
      completedPeriods: evaluatedPeriods,
      evaluatedPeriods,
    };
  }, [activeStudents, studentPeriodMarks, evaluatedPeriods, dayOrderNumber, classId]);

  // Backward-compatible alias for existing JSX references
  const fullDayDetailedAnalysis = multiPeriodAnalysis;

  // Formatted Message Text Generator
  const generatedMessageText = useMemo(() => {
    const formattedDate = formatDate(date);
    const dayLabel = dayOrderNumber ? `Day Order ${dayOrderNumber}` : '';

    if (scope === 'fullday' || scope === 'custom') {
      const {
        fullPresentees,
        partialPresentees,
        fullAbsentees,
        partialAbsentees,
        presenteesRoster,
        absenteesRoster,
        odRoster,
        evaluatedPeriods: periodsList,
      } = multiPeriodAnalysis;

      const periodsCount = periodsList.length;
      const totalPresentStudents = fullPresentees.length + partialPresentees.length;
      const totalAbsentStudents = fullAbsentees.length + partialAbsentees.length;

      // ── FORMAT 1: WHATSAPP STANDARD (REG NO WISE) ──
      if (format === 'standard') {
        let txt = `*SPIHER Attendance Report*\n`;
        txt += `Class: ${classId} (${classNameTitle})\n`;
        txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
        if (scope === 'fullday') {
          txt += `Period: Full Day (${periodsCount}/7 Periods Completed)\n\n`;
        } else {
          txt += `Period: Custom (${periodsList.map((p) => `P${p}`).join(', ')} — ${periodsCount} Periods Evaluated)\n\n`;
        }

        // 1. Presentees Section (Reg No Wise)
        txt += `*Presentees (${totalPresentStudents}/${activeStudents.length}):*\n`;
        if (totalPresentStudents === 0) {
          txt += `Nil (No students present)\n`;
        } else {
          let pIdx = 1;
          presenteesRoster.forEach(({ student, isFull, presentPeriods, odPeriods }) => {
            if (isFull) {
              txt += `${pIdx++}. ${student.student_id} - ${student.name}\n`;
            } else {
              const attendedList = [
                ...presentPeriods.map((pp) => pp.subject ? `P${pp.period} (${pp.subject})` : `P${pp.period}`),
                ...odPeriods.map((op) => op.subject ? `P${op.period} [OD] (${op.subject})` : `P${op.period} [OD]`),
              ];
              const periodsText = attendedList.length > 0 ? attendedList.join(', ') : 'None';
              txt += `${pIdx++}. ${student.student_id} - ${student.name} - Present in: ${periodsText}\n`;
            }
          });
        }
        txt += `\n`;

        // 2. Absentees Section (Reg No Wise)
        txt += `*Absentees (${totalAbsentStudents}):*\n`;
        if (totalAbsentStudents === 0) {
          txt += `Nil (All students present)\n`;
        } else {
          let aIdx = 1;
          absenteesRoster.forEach(({ student, isFull, absentPeriods }) => {
            if (isFull) {
              txt += `${aIdx++}. ${student.student_id} - ${student.name} - Full Absent\n`;
            } else {
              const periodsText = absentPeriods.map((ap) => ap.subject ? `P${ap.period} (${ap.subject})` : `P${ap.period}`).join(', ');
              txt += `${aIdx++}. ${student.student_id} - ${student.name} - Absent in: ${periodsText}\n`;
            }
          });
        }
        txt += `\n`;

        // 3. OD Section (if any, Reg No Wise)
        if (odRoster.length > 0) {
          txt += `*On Duty (${odRoster.length}):*\n`;
          odRoster.forEach(({ student, odPeriods }, idx) => {
            const odText = odPeriods.map((op) => op.subject ? `P${op.period} (${op.subject})` : `P${op.period}`).join(', ');
            txt += `${idx + 1}. ${student.student_id} - ${student.name} - ${odText}\n`;
          });
          txt += `\n`;
        }

        // 4. Summary Line
        txt += `*Summary:* Total Present: *${totalPresentStudents}/${activeStudents.length}* | Full: *${fullPresentees.length}* | Partial: *${partialPresentees.length}* | Full Absent: *${fullAbsentees.length}* | Attendance: *${dailyOverview.attendancePercentage.toFixed(1)}%*\n\n`;

        // 5. Period-wise Attendance Overview (Moved to bottom of the summary)
        txt += `*Period-wise Attendance Overview:*\n`;
        periodsList.forEach((p) => {
          const pd = periodAttendanceDetails[p];
          if (pd) {
            txt += `• P${p} (${pd.subject}): ${pd.presentCount + pd.odCount}/${activeStudents.length} Present (${pd.percentage}%)\n`;
          }
        });

        return txt;
      }

      // ── FORMAT 2: COMPACT / SHORT (REG NO WISE) ──
      if (format === 'compact') {
        let txt = `*SPIHER — ${classId} | ${formattedDate}*\n`;
        txt += scope === 'fullday'
          ? `*Full Day Summary* (${periodsCount}/7 Periods)\n\n`
          : `*Custom Periods* (${periodsList.map((p) => `P${p}`).join(',')})\n\n`;

        txt += `*Presentees (${totalPresentStudents}/${activeStudents.length}):*\n`;
        if (totalPresentStudents === 0) {
          txt += `Nil (No students present)\n`;
        } else {
          let pIdx = 1;
          presenteesRoster.forEach(({ student, isFull, presentPeriods, odPeriods }) => {
            if (isFull) {
              txt += `${pIdx++}. ${student.student_id} - ${student.name}\n`;
            } else {
              const attendedList = [
                ...presentPeriods.map((p) => `P${p.period}`),
                ...odPeriods.map((p) => `P${p.period} [OD]`),
              ];
              const pStr = attendedList.length > 0 ? attendedList.join(',') : 'None';
              txt += `${pIdx++}. ${student.student_id} - ${student.name} - ${pStr}\n`;
            }
          });
        }
        txt += `\n`;

        txt += `*Absentees (${totalAbsentStudents}):*\n`;
        if (totalAbsentStudents === 0) {
          txt += `All Present (Nil Absentees)\n`;
        } else {
          let aIdx = 1;
          absenteesRoster.forEach(({ student, isFull, absentPeriods }) => {
            if (isFull) {
              txt += `${aIdx++}. ${student.student_id} - ${student.name} - Full\n`;
            } else {
              const periodsText = absentPeriods.map((ap) => `P${ap.period}`).join(', ');
              txt += `${aIdx++}. ${student.student_id} - ${student.name} - ${periodsText}\n`;
            }
          });
        }

        if (odRoster.length > 0) {
          txt += `\n*OD (${odRoster.length}):* ${odRoster.map((o) => `${o.student.student_id} - ${o.student.name} (P${o.odPeriods.map((x) => x.period).join(',')})`).join(', ')}\n`;
        }

        txt += `\n*Summary:* Present: *${totalPresentStudents}/${activeStudents.length}* (${dailyOverview.attendancePercentage.toFixed(1)}%) | Absent: *${totalAbsentStudents}*\n`;

        const periodCounts = periodsList
          .map((p) => {
            const pd = periodAttendanceDetails[p];
            return `P${p}: ${pd ? pd.presentCount + pd.odCount : 0}/${activeStudents.length}`;
          })
          .join(' | ');
        txt += `*Periods:* ${periodCounts}\n`;

        return txt;
      }

      // ── FORMAT 3: COMPLETE AUDIT DOCUMENT (REG NO WISE) ──
      let txt = `=====================================================\n`;
      txt += `ST. PETER'S INSTITUTE OF HIGHER EDUCATION & RESEARCH\n`;
      txt += `DAILY CLASS ATTENDANCE REGISTER & AUDIT REPORT\n`;
      txt += `=====================================================\n`;
      txt += `Class                 : ${classId} - ${classNameTitle}\n`;
      txt += `Date                  : ${formattedDate} (${dayLabel})\n`;
      txt += `Scope                 : ${scope === 'fullday' ? 'Full Day Summary' : `Custom Periods (${periodsList.map((p) => `P${p}`).join(', ')})`}\n`;
      txt += `Total Enrolled        : ${activeStudents.length} Students\n`;
      txt += `Periods Evaluated     : ${periodsCount} Periods\n`;
      txt += `Total Present Students: ${totalPresentStudents} (Full: ${fullPresentees.length}, Partial: ${partialPresentees.length})\n`;
      txt += `Total Absent Students : ${totalAbsentStudents} (Full: ${fullAbsentees.length}, Partial: ${partialAbsentees.length})\n`;
      txt += `Day Attendance Rate   : ${dailyOverview.attendancePercentage.toFixed(1)}%\n`;
      txt += `-----------------------------------------------------\n\n`;

      txt += `--- PRESENTEES ROSTER [REG NO WISE] (${totalPresentStudents}/${activeStudents.length}) ---\n`;
      if (totalPresentStudents === 0) {
        txt += `None\n`;
      } else {
        presenteesRoster.forEach(({ student, isFull, presentPeriods, odPeriods }, idx) => {
          if (isFull) {
            txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} (100% Present)\n`;
          } else {
            const attendedList = [
              ...presentPeriods.map((p) => `P${p.period} (${p.subject})`),
              ...odPeriods.map((p) => `P${p.period} [OD] (${p.subject})`),
            ];
            const detail = attendedList.length > 0 ? attendedList.join(', ') : 'None';
            txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name}\n    Present in: ${detail}\n`;
          }
        });
      }

      txt += `\n--- ABSENTEES ROSTER [REG NO WISE] (${totalAbsentStudents}) ---\n`;
      if (totalAbsentStudents === 0) {
        txt += `None\n`;
      } else {
        absenteesRoster.forEach(({ student, isFull, absentPeriods }, idx) => {
          if (isFull) {
            txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} (Absent for all evaluated periods)\n`;
          } else {
            const detail = absentPeriods.map((p) => `P${p.period} (${p.subject})`).join(', ');
            txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name}\n    Absent in: ${detail}\n`;
          }
        });
      }

      if (odRoster.length > 0) {
        txt += `\n--- ON DUTY (OD) STUDENTS [REG NO WISE] (${odRoster.length}) ---\n`;
        odRoster.forEach(({ student, odPeriods }, idx) => {
          const detail = odPeriods.map((p) => `P${p.period} (${p.subject})`).join(', ');
          txt += `${String(idx + 1).padStart(2, ' ')}. [${student.student_id}] ${student.name} (${detail})\n`;
        });
      }

      txt += `\n--- PERIOD-BY-PERIOD SUMMARY ---\n`;
      periodsList.forEach((p) => {
        const pd = periodAttendanceDetails[p];
        if (pd) {
          txt += `\nPeriod ${p} [${pd.timing}] - ${pd.subject}\n`;
          txt += `  Present: ${pd.presentCount} | OD: ${pd.odCount} | Absent: ${pd.absentCount} | Rate: ${pd.percentage}%\n`;
          txt += `  Presentees (${pd.presentCount}): ${pd.presentList.length > 0 ? pd.presentList.map((s) => `${s.student_id} - ${s.name}`).join(', ') : 'None'}\n`;
          if (pd.odCount > 0) {
            txt += `  OD (${pd.odCount}): ${pd.odList.map((s) => `${s.student_id} - ${s.name}`).join(', ')}\n`;
          }
          txt += `  Absentees (${pd.absentCount}): ${pd.absentList.length > 0 ? pd.absentList.map((s) => `${s.student_id} - ${s.name}`).join(', ') : 'Nil'}\n`;
        }
      });

      txt += `\n=====================================================\n`;
      txt += `Generated on ${new Date().toLocaleString()} by SPIHER CR Portal\n`;
      return txt;
    }

    // ── SCOPE: SINGLE PERIOD ──
    const pData = periodAttendanceDetails[activePeriod];
    if (!pData) return 'No period data available.';

    const singlePeriodPresentRoster = [
      ...pData.presentList.map((s) => ({ student: s, isOD: false })),
      ...pData.odList.map((s) => ({ student: s, isOD: true })),
    ].sort((a, b) => a.student.student_id.localeCompare(b.student.student_id, undefined, { numeric: true }));

    const singlePeriodAbsentRoster = [...pData.absentList].sort((a, b) =>
      a.student_id.localeCompare(b.student_id, undefined, { numeric: true })
    );

    if (format === 'standard') {
      let txt = `*SPIHER Attendance Report*\n`;
      txt += `Class: ${classId} (${classNameTitle})\n`;
      txt += `Date: ${formattedDate}${dayLabel ? ` | ${dayLabel}` : ''}\n`;
      txt += `Period: Period ${activePeriod} (${pData.subject})\n\n`;

      // Presentees first (Reg No Wise)
      txt += `*Presentees (${pData.presentCount + pData.odCount}/${activeStudents.length}):*\n`;
      if (singlePeriodPresentRoster.length === 0) {
        txt += `Nil (No students present)\n`;
      } else {
        let idx = 1;
        singlePeriodPresentRoster.forEach(({ student, isOD }) => {
          txt += `${idx++}. ${student.student_id} - ${student.name}${isOD ? ' [OD]' : ''}\n`;
        });
      }
      txt += `\n`;

      // Absentees (Reg No Wise)
      txt += `*Absentees (${pData.absentCount}):*\n`;
      if (singlePeriodAbsentRoster.length === 0) {
        txt += `Nil (All students present)\n`;
      } else {
        singlePeriodAbsentRoster.forEach((s, i) => {
          txt += `${i + 1}. ${s.student_id} - ${s.name}\n`;
        });
      }
      txt += `\n`;

      // OD section (if any)
      if (pData.odCount > 0) {
        const sortedOd = [...pData.odList].sort((a, b) =>
          a.student_id.localeCompare(b.student_id, undefined, { numeric: true })
        );
        txt += `*On Duty (${pData.odCount}):*\n`;
        sortedOd.forEach((s, i) => {
          txt += `${i + 1}. ${s.student_id} - ${s.name}\n`;
        });
        txt += `\n`;
      }

      txt += `*Summary:* Total Present: *${pData.presentCount + pData.odCount}/${activeStudents.length}* | Total Absent: *${pData.absentCount}* | Attendance: *${pData.percentage}%*`;
      return txt;
    }

    if (format === 'compact') {
      let txt = `*SPIHER — ${classId} | Period ${activePeriod} (${pData.subject})*\n`;
      txt += `Date: ${formattedDate}\n\n`;

      txt += `*Presentees (${pData.presentCount + pData.odCount}/${activeStudents.length} | ${pData.percentage}%):*\n`;
      if (singlePeriodPresentRoster.length === 0) {
        txt += `Nil Present\n`;
      } else {
        txt += singlePeriodPresentRoster.map(({ student }) => `${student.student_id} - ${student.name.split(' ')[0]}`).join(', ') + '\n';
      }
      txt += `\n`;

      txt += `*Absentees (${pData.absentCount}):*\n`;
      if (singlePeriodAbsentRoster.length === 0) {
        txt += `All Present (Nil Absentees)\n`;
      } else {
        singlePeriodAbsentRoster.forEach((s, idx) => {
          txt += `${idx + 1}. ${s.student_id} - ${s.name}\n`;
        });
      }

      if (pData.odCount > 0) {
        txt += `\n*OD (${pData.odCount}):* ${pData.odList.map((s) => `${s.student_id} - ${s.name}`).join(', ')}\n`;
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
    multiPeriodAnalysis,
    customPeriods,
    activePeriod,
    periodAttendanceDetails,
    activeStudents,
    dailyOverview,
  ]);

  // Actions
  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(generatedMessageText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = generatedMessageText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      toast.success('Formatted attendance report copied to clipboard!', 'Copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard', 'Error');
    }
  };

  const handleWhatsAppShare = async () => {
    // 1. Native Web Share API (Avoids URL length limits & popup blockers on mobile)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `SPIHER Attendance - ${classId} (${formatDate(date)})`,
          text: generatedMessageText,
        });
        toast.success('Report shared successfully!', 'Shared');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // User cancelled share sheet
      }
    }

    // 2. Mobile deep link or WhatsApp Web fallback
    const encoded = encodeURIComponent(generatedMessageText);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `whatsapp://send?text=${encoded}`;
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([generatedMessageText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const scopeLabel =
      scope === 'fullday'
        ? 'FullDay'
        : scope === 'custom'
        ? `Custom_P${customPeriods.join('_')}`
        : `Period_${activePeriod}`;
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
                <p className="text-xs text-slate-300 mt-0.5">{formatDate(date)} • Presentees priority, custom periods & instant export</p>
              </div>
            </div>

            {/* Top Action Buttons - Mobile Responsive & Thumb-Friendly */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleWhatsAppShare}
                className="flex-1 sm:flex-none gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer min-h-[40px]"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Share to WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className={cn(
                  'gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer min-h-[40px]',
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
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10 text-xs px-2.5 py-2 rounded-xl cursor-pointer min-h-[40px]"
                title="Download .txt"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Controls Row: Scope + Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
            {/* Scope Selector: 3 Options (Full Day, Custom, Period) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Report Scope:</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/10 rounded-2xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setScope('fullday')}
                  className={cn(
                    'py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center',
                    scope === 'fullday' ? 'bg-emerald-500 text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
                  <span>Full Day</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('custom')}
                  className={cn(
                    'py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center',
                    scope === 'custom' ? 'bg-emerald-500 text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Layers className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
                  <span>Custom ({customPeriods.length}P)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('period')}
                  className={cn(
                    'py-2 px-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center',
                    scope === 'period' ? 'bg-emerald-500 text-slate-950 shadow-xs font-black' : 'text-slate-300 hover:text-white'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
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

          {/* Custom Period Multi-Selector Toolbar */}
          {scope === 'custom' && (
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select Custom Periods ({customPeriods.length} Selected):</span>
                </span>
                {/* Quick Presets */}
                <div className="flex items-center gap-1 text-[10px] font-bold flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCustomPeriods([1, 2, 3, 4])}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer transition-colors"
                  >
                    Morning (P1-P4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPeriods([5, 6, 7])}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer transition-colors"
                  >
                    Afternoon (P5-P7)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPeriods([1, 2, 3, 4, 5, 6, 7])}
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer transition-colors"
                  >
                    All (P1-P7)
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                  const pd = periodAttendanceDetails[p];
                  const isSelected = customPeriods.includes(p as PeriodNumber);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setCustomPeriods((prev) =>
                          prev.includes(p as PeriodNumber)
                            ? prev.length > 1
                              ? prev.filter((x) => x !== p).sort((a, b) => a - b)
                              : prev
                            : [...prev, p as PeriodNumber].sort((a, b) => a - b)
                        );
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 shadow-xs font-black ring-2 ring-emerald-300'
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

      {/* ── MAIN CONTENT: Message Preview + Attendance Breakdown ── */}
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

        {/* Right: Attendance Inspection Card (Presentees Priority) */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl flex flex-col">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Segmented Switcher: Presentees (Default) vs Absentees */}
              <div className="flex items-center p-1 bg-slate-200/80 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBreakdownView('presentees')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer',
                    breakdownView === 'presentees'
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Presentees ({multiPeriodAnalysis.fullPresentees.length + multiPeriodAnalysis.partialPresentees.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownView('absentees')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer',
                    breakdownView === 'absentees'
                      ? 'bg-rose-600 text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Absentees ({multiPeriodAnalysis.fullAbsentees.length + multiPeriodAnalysis.partialAbsentees.length})</span>
                </button>
              </div>

              <Badge
                variant={breakdownView === 'presentees' ? 'success' : 'danger'}
                size="sm"
                className="font-extrabold font-mono"
              >
                {breakdownView === 'presentees'
                  ? `${multiPeriodAnalysis.fullPresentees.length + multiPeriodAnalysis.partialPresentees.length}/${activeStudents.length}`
                  : `${multiPeriodAnalysis.fullAbsentees.length + multiPeriodAnalysis.partialAbsentees.length} Total`}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              {breakdownView === 'presentees'
                ? 'Full and period-wise presentees with exact periods attended.'
                : 'Full-day and period-wise absentees with exact periods missed.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 space-y-4 flex-1">
            {breakdownView === 'presentees' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Presentees Roster ({multiPeriodAnalysis.presenteesRoster.length})
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">Reg No Wise</span>
                </div>

                {multiPeriodAnalysis.presenteesRoster.length === 0 ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                    No presentees recorded today.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {multiPeriodAnalysis.presenteesRoster.map(({ student, isFull, presentPeriods }, idx) => (
                      <div
                        key={student.student_id}
                        className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                          isFull
                            ? 'bg-white border-slate-200 hover:border-emerald-300'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{idx + 1}.</span>
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {student.student_id}
                            </span>
                            <span className="font-bold text-slate-900 truncate">{student.name}</span>
                          </div>
                          {isFull ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                              Full Day
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">
                              Partial
                            </span>
                          )}
                        </div>
                        {!isFull && presentPeriods.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pl-6">
                            <span className="text-[11px] font-bold text-emerald-800 shrink-0">Present:</span>
                            {presentPeriods.map((pp) => (
                              <span
                                key={pp.period}
                                className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[10px] border border-emerald-300"
                              >
                                P{pp.period} ({pp.subject})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                      Absentees Roster ({multiPeriodAnalysis.absenteesRoster.length})
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">Reg No Wise</span>
                  </div>

                  {multiPeriodAnalysis.absenteesRoster.length === 0 ? (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic text-center">
                      No absentees today. All students present.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {multiPeriodAnalysis.absenteesRoster.map(({ student, isFull, absentPeriods }, idx) => (
                        <div
                          key={student.student_id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                            isFull
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-amber-50/40 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">{idx + 1}.</span>
                              <span className="font-mono text-[11px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                {student.student_id}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{student.name}</span>
                            </div>
                            {isFull ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-200 px-2 py-0.5 rounded-full shrink-0">
                                Full Day
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full shrink-0">
                                Partial
                              </span>
                            )}
                          </div>
                          {!isFull && absentPeriods.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pl-6">
                              <span className="text-[11px] font-bold text-rose-800 shrink-0">Absent:</span>
                              {absentPeriods.map((ap) => (
                                <span
                                  key={ap.period}
                                  className="px-2 py-0.5 bg-rose-100 text-rose-900 font-bold rounded text-[10px] border border-rose-200"
                                >
                                  P{ap.period} ({ap.subject})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── OD Students (Reg No Wise) ── */}
                {multiPeriodAnalysis.odRoster.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      On Duty ({multiPeriodAnalysis.odRoster.length})
                    </span>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {multiPeriodAnalysis.odRoster.map(({ student, odPeriods }, idx) => (
                        <div key={student.student_id} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{idx + 1}.</span>
                            <span className="font-mono font-bold text-[11px] text-amber-900 shrink-0">{student.student_id}</span>
                            <span className="font-bold text-slate-900 truncate">{student.name}</span>
                          </div>
                          <span className="text-[11px] text-amber-900 font-bold shrink-0">{odPeriods.map((op) => `P${op.period}`).join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
