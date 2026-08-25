import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Zap,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Student } from '../../services/studentService';
import { AttendanceStatus, ClassId, PeriodNumber } from '../../types';
import { Card, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';

interface OneByOneAttendanceCardProps {
  students: Student[];
  marks: Record<string, AttendanceStatus | undefined>;
  classId: ClassId;
  date: string;
  selectedPeriods: PeriodNumber[];
  subject: string;
  onMarkStudent: (studentId: string, status: AttendanceStatus) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onSwitchToListView: () => void;
}

export const OneByOneAttendanceCard: React.FC<OneByOneAttendanceCardProps> = ({
  students,
  marks,
  classId,
  date,
  selectedPeriods,
  subject,
  onMarkStudent,
  onSave,
  saving,
  onSwitchToListView,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const touchStartX = useRef<number | null>(null);

  const totalStudents = students.length;
  const currentStudent = students[currentIndex];

  // Helper for short roll number (#04)
  const getShortNo = (studentId: string) => {
    const match = studentId.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : currentIndex + 1;
  };

  // Stats
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let od = 0;
    let unmarked = 0;

    for (const s of students) {
      const st = marks[s.student_id];
      if (st === 'P') present++;
      else if (st === 'A') absent++;
      else if (st === 'OD') od++;
      else unmarked++;
    }

    const markedCount = present + absent + od;
    const percentage = markedCount > 0 ? Math.round(((present + od) / markedCount) * 100) : 100;

    return { present, absent, od, unmarked, markedCount, percentage };
  }, [students, marks]);

  // Navigate to next student
  const handleNext = useCallback(() => {
    if (currentIndex < totalStudents - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummary(true);
    }
  }, [currentIndex, totalStudents]);

  // Navigate to previous student
  const handlePrev = useCallback(() => {
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, showSummary]);

  // Mark student with instant or auto-advance
  const handleMark = useCallback(
    (status: AttendanceStatus) => {
      if (!currentStudent) return;
      onMarkStudent(currentStudent.student_id, status);

      if (autoAdvance) {
        // Snappy auto advance
        setTimeout(() => {
          handleNext();
        }, 120);
      }
    },
    [currentStudent, onMarkStudent, autoAdvance, handleNext]
  );

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid capturing when inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (showSummary) {
        if (e.key === 'Escape' || e.key === 'ArrowLeft') {
          setShowSummary(false);
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'p' || key === ' ' || key === 'enter') {
        e.preventDefault();
        handleMark('P');
      } else if (key === 'a') {
        e.preventDefault();
        handleMark('A');
      } else if (key === 'o' || key === 'd') {
        e.preventDefault();
        handleMark('OD');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMark, handleNext, handlePrev, showSummary]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // Minimum swipe threshold 50px
    if (diff > 50) {
      handleNext(); // Swipe Left -> Next
    } else if (diff < -50) {
      handlePrev(); // Swipe Right -> Prev
    }
    touchStartX.current = null;
  };

  if (!currentStudent && !showSummary) {
    return null;
  }

  const currentStatus = currentStudent ? marks[currentStudent.student_id] : null;
  const progressPercent = Math.round(((currentIndex + 1) / totalStudents) * 100);

  return (
    <div className="space-y-4 max-w-xl mx-auto select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* ── Top Header Control & Progress Bar ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm" className="font-mono font-bold">
              Roll #{currentIndex + 1} of {totalStudents}
            </Badge>
            <span className="text-xs font-bold text-slate-500">
              {stats.markedCount}/{totalStudents} Marked
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Advance Switch */}
            <button
              type="button"
              onClick={() => setAutoAdvance((prev) => !prev)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                autoAdvance
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs font-extrabold'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              )}
              title="Automatically advance to the next student upon marking"
            >
              <Zap className={cn('w-3.5 h-3.5', autoAdvance ? 'text-amber-600 fill-amber-500' : 'text-slate-400')} />
              <span>Auto-Next: {autoAdvance ? 'ON' : 'OFF'}</span>
            </button>

            {/* Jump to Summary Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSummary(true)}
              className="text-xs py-1.5 px-3 rounded-xl border-slate-300 font-bold"
            >
              Review
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── MAIN CARD: Single Student Focus OR Review Screen ── */}
      {!showSummary ? (
        <Card className="border-slate-200 bg-white rounded-3xl shadow-sm overflow-hidden border-2 transition-all">
          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Student Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* Roll Number Circle Badge */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col items-center justify-center font-mono font-black shadow-md shrink-0">
                  <span className="text-[10px] uppercase font-bold text-blue-200 leading-none">NO</span>
                  <span className="text-xl leading-tight">#{getShortNo(currentStudent.student_id)}</span>
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                    {currentStudent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {currentStudent.student_id}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {classId} • {subject}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Status Badge */}
              {currentStatus ? (
                <span
                  className={cn(
                    'px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 border animate-in zoom-in-95',
                    currentStatus === 'P' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    currentStatus === 'A' && 'bg-rose-100 text-rose-800 border-rose-300',
                    currentStatus === 'OD' && 'bg-amber-100 text-amber-800 border-amber-300'
                  )}
                >
                  {currentStatus === 'P' && '✓ Present'}
                  {currentStatus === 'A' && '✕ Absent'}
                  {currentStatus === 'OD' && '⏱ On Duty'}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 shrink-0">
                  Unmarked
                </span>
              )}
            </div>

            {/* ── BIG 3 TOUCH ACTION BUTTONS ── */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {/* 🟢 PRESENT BUTTON */}
              <button
                type="button"
                onClick={() => handleMark('P')}
                className={cn(
                  'flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 text-center',
                  currentStatus === 'P'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-4 ring-emerald-500/20'
                    : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-300/80 shadow-2xs'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center mb-1.5',
                    currentStatus === 'P' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-800'
                  )}
                >
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-sm sm:text-base font-black tracking-wide">PRESENT</span>
                <span className="text-[10px] font-bold opacity-75 mt-0.5">[P / Space]</span>
              </button>

              {/* 🔴 ABSENT BUTTON */}
              <button
                type="button"
                onClick={() => handleMark('A')}
                className={cn(
                  'flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 text-center',
                  currentStatus === 'A'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-4 ring-rose-500/20'
                    : 'bg-rose-50/80 hover:bg-rose-100 text-rose-900 border-rose-300/80 shadow-2xs'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center mb-1.5',
                    currentStatus === 'A' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
                  )}
                >
                  <X className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-sm sm:text-base font-black tracking-wide">ABSENT</span>
                <span className="text-[10px] font-bold opacity-75 mt-0.5">[A]</span>
              </button>

              {/* 🟡 ON DUTY BUTTON */}
              <button
                type="button"
                onClick={() => handleMark('OD')}
                className={cn(
                  'flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 text-center',
                  currentStatus === 'OD'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-4 ring-amber-500/20'
                    : 'bg-amber-50/80 hover:bg-amber-100 text-amber-900 border-amber-300/80 shadow-2xs'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center mb-1.5',
                    currentStatus === 'OD' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-800'
                  )}
                >
                  <Clock className="w-6 h-6 stroke-[3]" />
                </div>
                <span className="text-sm sm:text-base font-black tracking-wide">ON DUTY</span>
                <span className="text-[10px] font-bold opacity-75 mt-0.5">[O / D]</span>
              </button>
            </div>

            {/* ── PREVIOUS & NEXT NAVIGATION BUTTONS ── */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="flex-1 gap-2 py-3 rounded-2xl border-slate-300 font-black text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Student</span>
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                className="flex-1 gap-2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm cursor-pointer shadow-md"
              >
                <span>{currentIndex === totalStudents - 1 ? 'Review & Submit' : 'Next Student'}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── COMPLETION & SUMMARY REVIEW SCREEN ── */
        <Card className="border-slate-200 bg-white rounded-3xl shadow-md overflow-hidden border-2 animate-in zoom-in-95">
          <CardContent className="p-5 sm:p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">Attendance Roll-Call Complete!</h3>
              <p className="text-xs text-slate-500 font-medium">
                {classId} • {date} • {subject} (Periods: {selectedPeriods.join(', ')})
              </p>
            </div>

            {/* Stats Breakdown Grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Present</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">{stats.present}</p>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800 uppercase">Absent</span>
                <p className="text-2xl font-black text-rose-700 mt-1">{stats.absent}</p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 uppercase">On Duty</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{stats.od}</p>
              </div>
            </div>

            {/* List of Absentees & OD for Quick Audit */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center justify-between">
                <span>Absentees List ({stats.absent}):</span>
                <span className="text-[11px] text-slate-400 font-normal">Tap any to edit</span>
              </div>
              {stats.absent === 0 ? (
                <p className="text-emerald-700 font-bold italic">🎉 100% Present! No absentees recorded.</p>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {students
                    .filter((s) => marks[s.student_id] === 'A')
                    .map((s) => (
                      <button
                        key={s.student_id}
                        type="button"
                        onClick={() => {
                          const idx = students.findIndex((st) => st.student_id === s.student_id);
                          if (idx !== -1) {
                            setCurrentIndex(idx);
                            setShowSummary(false);
                          }
                        }}
                        className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold border border-rose-300 cursor-pointer hover:bg-rose-200"
                      >
                        #{getShortNo(s.student_id)} {s.name.split(' ')[0]}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Action Buttons on Review Screen */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowSummary(false)}
                className="w-full sm:w-auto flex-1 py-3 rounded-2xl border-slate-300 font-bold text-xs"
              >
                Back to Roll-Call
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={saving}
                onClick={onSave}
                className="w-full sm:w-auto flex-1 gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving to Cloud...' : 'Save & Sync Attendance'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── QUICK ROLL SCRUBBER (Clickable 01 to 60 mini pills) ── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
          <span>Quick Student Scrubber (1–{totalStudents}):</span>
          <button
            type="button"
            onClick={onSwitchToListView}
            className="text-blue-600 hover:underline font-bold"
          >
            Switch to Full List 📋
          </button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-thin">
          {students.map((s, idx) => {
            const st = marks[s.student_id];
            const isCurrent = idx === currentIndex && !showSummary;

            return (
              <button
                key={s.student_id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setShowSummary(false);
                }}
                className={cn(
                  'w-8 h-8 rounded-xl font-mono text-[11px] font-black shrink-0 flex items-center justify-center transition-all cursor-pointer border',
                  isCurrent && 'ring-2 ring-blue-600 ring-offset-1 scale-110 font-extrabold z-10',
                  st === 'P' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                  st === 'A' && 'bg-rose-100 text-rose-800 border-rose-300',
                  st === 'OD' && 'bg-amber-100 text-amber-800 border-amber-300',
                  !st && 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                )}
                title={`#${getShortNo(s.student_id)}: ${s.name}`}
              >
                {getShortNo(s.student_id)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
