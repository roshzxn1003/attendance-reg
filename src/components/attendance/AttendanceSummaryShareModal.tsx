import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  Sparkles,
  MessageCircle,
  FileText,
  Clock,
  Calendar,
  XCircle,
} from 'lucide-react';
import { ClassId, PeriodNumber, AttendanceStatus, StudentAttendanceSummary } from '../../types';
import { Student } from '../../services/studentService';
import { DailyAttendanceOverview } from '../../services/attendanceService';
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
}) => {
  const [scope, setScope] = useState<ReportScope>('period');
  const [format, setFormat] = useState<ReportFormat>('standard');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

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
    const partialAbsentees: { student: Student; absentHours: number; presentHours: number }[] = [];
    const fullPresentees: Student[] = [];

    todaySummaries.forEach((sum) => {
      const student = activeStudents.find((s) => s.student_id === sum.student_id);
      if (!student) return;

      if (sum.absentHours === sum.totalWorkingHours && sum.totalWorkingHours > 0) {
        fullAbsentees.push({ student, absentHours: sum.absentHours });
      } else if (sum.absentHours > 0) {
        partialAbsentees.push({ student, absentHours: sum.absentHours, presentHours: sum.presentHours });
      } else if (sum.presentHours > 0) {
        fullPresentees.push(student);
      }
    });

    return {
      fullAbsentees,
      partialAbsentees,
      fullPresentees,
      overview: dailyOverview,
    };
  }, [todaySummaries, activeStudents, dailyOverview]);

  // ── Generate Formatted Text ──
  const generatedText = useMemo(() => {
    const formattedDate = formatDate(date);
    const dayLabel = dayOrderNumber ? `Day Order ${dayOrderNumber}` : '';
    const periodLabel = selectedPeriods.length === 1
      ? `Period ${selectedPeriods[0]}`
      : `Periods ${selectedPeriods.join(', ')}`;

    if (scope === 'period') {
      const { presentList, absentList, odList, total, presentCount, absentCount, odCount, percentage } = periodStats;

      if (format === 'standard') {
        let txt = `*SPIHER Attendance Report*\n`;
        txt += `Class: ${classId} (${classNameTitle})\n`;
        txt += `Date: ${formattedDate} ${dayLabel ? `| ${dayLabel}` : ''}\n`;
        txt += `Period: ${periodLabel} ${subject ? `(${subject})` : ''}\n\n`;

        txt += `*Presentees (${presentCount}/${total}):*\n`;
        if (presentList.length === 0) {
          txt += `- None\n`;
        } else {
          presentList.forEach((s, idx) => {
            txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
          });
        }
        txt += `\n`;

        txt += `*Absentees (${absentCount}):*\n`;
        if (absentList.length === 0) {
          txt += `Nil (All students present)\n`;
        } else {
          absentList.forEach((s, idx) => {
            txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
          });
        }
        txt += `\n`;

        if (odCount > 0) {
          txt += `*On Duty (${odCount}):*\n`;
          odList.forEach((s, idx) => {
            txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
          });
          txt += `\n`;
        }

        txt += `*Summary:* Total Present: *${presentCount}/${total}* | Total Absent: *${absentCount}* | Attendance: *${percentage}%*`;
        return txt;
      }

      if (format === 'compact') {
        let txt = `*SPIHER — ${classId} | ${formattedDate}*\n`;
        txt += `*${periodLabel}* (${subject || 'Class'})\n\n`;

        txt += `*Absentees (${absentCount}):*\n`;
        if (absentList.length === 0) {
          txt += `100% Present (No absentees)\n`;
        } else {
          absentList.forEach((s, idx) => {
            txt += `${idx + 1}. ${s.name} (${s.student_id})\n`;
          });
        }

        if (odCount > 0) {
          txt += `\n*OD (${odCount}):* ${odList.map((s) => s.name).join(', ')}\n`;
        }

        txt += `\n*Total Present: ${presentCount}/${total}* | *Total Absent: ${absentCount}* | *${percentage}%*`;
        return txt;
      }

      // Complete Detailed Format
      let txt = `========================================\n`;
      txt += `SPIHER - DEPARTMENT OF COMPUTER SCIENCE & AI\n`;
      txt += `DAILY PERIOD ATTENDANCE REPORT\n`;
      txt += `========================================\n`;
      txt += `Class       : ${classId} - ${classNameTitle}\n`;
      txt += `Date        : ${formattedDate} (${dayLabel})\n`;
      txt += `Period(s)   : ${periodLabel}\n`;
      txt += `Subject     : ${subject || 'N/A'}\n`;
      txt += `----------------------------------------\n`;
      txt += `TOTAL ENROLLED : ${total}\n`;
      txt += `PRESENT (P)    : ${presentCount}\n`;
      txt += `ABSENT (A)     : ${absentCount}\n`;
      txt += `ON DUTY (OD)   : ${odCount}\n`;
      txt += `PERCENTAGE     : ${percentage}%\n`;
      txt += `----------------------------------------\n\n`;

      txt += `--- ABSENTEES LIST (${absentCount}) ---\n`;
      if (absentList.length === 0) {
        txt += `None (All students attended)\n`;
      } else {
        absentList.forEach((s, idx) => {
          txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`;
        });
      }

      txt += `\n--- PRESENTEES LIST (${presentCount}) ---\n`;
      if (presentList.length === 0) {
        txt += `None\n`;
      } else {
        presentList.forEach((s, idx) => {
          txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`;
        });
      }

      if (odCount > 0) {
        txt += `\n--- ON DUTY LIST (${odCount}) ---\n`;
        odList.forEach((s, idx) => {
          txt += `${String(idx + 1).padStart(2, ' ')}. [${s.student_id}] ${s.name}\n`;
        });
      }

      txt += `\n========================================\n`;
      txt += `Generated via SPIHER CR Attendance Portal\n`;
      return txt;
    }

    // ── Full Day Report ──
    const fullAbs = fullDayStats?.fullAbsentees || [];
    const partAbs = fullDayStats?.partialAbsentees || [];
    const ov = dailyOverview;

    let txt = `*SPIHER Full Day Attendance Report*\n`;
    txt += `Class: ${classId} (${classNameTitle})\n`;
    txt += `Date: ${formattedDate} ${dayLabel ? `| ${dayLabel}` : ''}\n`;
    txt += `Periods Completed: ${ov ? `${ov.periodsCompleted} / ${ov.totalPeriods}` : '7'}\n\n`;

    if (fullAbs.length > 0) {
      txt += `*Full-Day Absentees (${fullAbs.length}):*\n`;
      fullAbs.forEach(({ student }, idx) => {
        txt += `${idx + 1}. ${student.name} (${student.student_id})\n`;
      });
      txt += `\n`;
    }

    if (partAbs.length > 0) {
      txt += `*Partial Period Absentees (${partAbs.length}):*\n`;
      partAbs.forEach(({ student, absentHours, presentHours }, idx) => {
        txt += `${idx + 1}. ${student.name} (${student.student_id}) — Absent ${absentHours} hrs, Attended ${presentHours} hrs\n`;
      });
      txt += `\n`;
    }

    if (fullAbs.length === 0 && partAbs.length === 0) {
      txt += `*100% Attendance for All Periods Today*\n\n`;
    }

    if (ov) {
      txt += `*Day Stats Summary:*\n`;
      txt += `• Total Enrolled: *${activeStudents.length}*\n`;
      txt += `• Present Hours: *${ov.presentCount} hrs*\n`;
      txt += `• Absent Hours: *${ov.absentCount} hrs*\n`;
      txt += `• OD Hours: *${ov.odCount} hrs*\n`;
      txt += `• Day Attendance: *${ov.attendancePercentage.toFixed(1)}%*\n`;
    }

    return txt;
  }, [scope, format, date, dayOrderNumber, selectedPeriods, subject, classId, classNameTitle, periodStats, fullDayStats, dailyOverview, activeStudents]);

  if (!isOpen) return null;

  // ── Actions ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast.success('Report copied to clipboard ready to paste!', 'Copied');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard', 'Error');
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(generatedText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SPIHER ${classId} Attendance - ${formatDate(date)}`,
          text: generatedText,
        });
      } catch {
        // User cancelled share
      }
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
    toast.success('Downloaded report text file', 'Downloaded');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black">Smart Attendance Share</h3>
                <Badge variant="purple" size="sm" className="font-bold">
                  {classId}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300">
                Generate formatted reports for WhatsApp, Telegram & Faculty
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-900">
          {/* Controls: Scope & Format */}
          <div className="space-y-3">
            {/* Scope Selection Tabs */}
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                Report Scope:
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('period')}
                  className={cn(
                    'py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'period'
                      ? 'bg-white text-blue-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Current Period ({selectedPeriods.length === 1 ? `P${selectedPeriods[0]}` : `P${selectedPeriods.join(', ')}`})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('fullday')}
                  className={cn(
                    'py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    scope === 'fullday'
                      ? 'bg-white text-indigo-700 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Full Day Summary</span>
                </button>
              </div>
            </div>

            {/* Format Style Selector (for Period mode) */}
            {scope === 'period' && (
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                  Format Style:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFormat('standard')}
                    className={cn(
                      'py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer',
                      format === 'standard'
                        ? 'bg-white text-blue-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('compact')}
                    className={cn(
                      'py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer',
                      format === 'compact'
                        ? 'bg-white text-blue-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span>Absentees Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('complete')}
                    className={cn(
                      'py-1.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer',
                      format === 'complete'
                        ? 'bg-white text-blue-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <FileText className="w-3 h-3 text-slate-700" />
                    <span>Detailed Doc</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Text Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Formatted Message Preview:</span>
              </label>

              <span className="text-[10px] font-mono text-slate-400">
                {generatedText.split('\n').length} lines • {generatedText.length} chars
              </span>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={generatedText}
                rows={10}
                className="w-full p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none select-all resize-none shadow-inner leading-relaxed"
              />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 text-center p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
              <p className="font-black text-slate-800 text-sm">{periodStats.total}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Present</span>
              <p className="font-black text-emerald-700 text-sm">{periodStats.presentCount}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-600 uppercase">Absent</span>
              <p className="font-black text-rose-700 text-sm">{periodStats.absentCount}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase">Percent</span>
              <p className="font-black text-blue-700 text-sm">{periodStats.percentage}%</p>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTxt}
              className="gap-1 text-xs font-bold border-slate-300 flex-1 sm:flex-none"
              title="Download as text file"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download .txt</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Copy Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={cn(
                'gap-1.5 text-xs font-bold flex-1 sm:flex-none transition-all',
                copied ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-slate-300'
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </Button>

            {/* WhatsApp Share Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleWhatsAppShare}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex-1 sm:flex-none cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Share to WhatsApp</span>
            </Button>

            {/* Native device share (mobile) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer hidden xs:flex items-center justify-center"
                title="More Share Options"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryShareModal;
