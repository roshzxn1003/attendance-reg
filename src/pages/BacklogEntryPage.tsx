import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/common/Card';
import { useApp } from '../context/AppContext';
import { ClassId } from '../types';
import { useStudents } from '../hooks/useStudents';
import { RapidDayEntryWizard } from '../components/backlog/RapidDayEntryWizard';
import { CheckCircle2, Users, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { NavLink } from 'react-router-dom';

type RangePreset = 'july' | 'august' | 'september' | '2m-jul-aug' | '2m-aug-sep' | 'semester' | 'unlimited' | 'custom';

export const BacklogEntryPage: React.FC = () => {
  const { selectedClass, setSelectedClassId } = useApp();
  const { students } = useStudents(selectedClass.id);

  const [preset, setPreset] = useState<RangePreset>('july');
  const [customStart, setCustomStart] = useState<string>('2026-06-01');
  const [customEnd, setCustomEnd] = useState<string>('2027-05-31');

  // Compute active date boundaries
  const { startDate, endDate } = useMemo(() => {
    if (preset === 'july') {
      return {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
      };
    }
    if (preset === 'august') {
      return {
        startDate: '2026-08-01',
        endDate: '2026-08-31',
      };
    }
    if (preset === 'september') {
      return {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      };
    }
    if (preset === '2m-jul-aug') {
      return {
        startDate: '2026-07-01',
        endDate: '2026-08-31',
      };
    }
    if (preset === '2m-aug-sep') {
      return {
        startDate: '2026-08-01',
        endDate: '2026-09-30',
      };
    }
    if (preset === 'semester') {
      return {
        startDate: '2026-07-01',
        endDate: '2026-12-31',
      };
    }
    if (preset === 'unlimited') {
      return {
        startDate: '2026-06-01',
        endDate: '2027-05-31',
      };
    }
    return {
      startDate: customStart,
      endDate: customEnd,
    };
  }, [preset, customStart, customEnd]);

  const activeStudents = useMemo(() => students.filter((s) => s.active !== false), [students]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <PageHeader
        title="Rapid Handwritten Attendance Backlog Wizard"
        subtitle="Quickly enter 2 months of handwritten register notebooks into the database with automatic Day 1–6 cycle rotation, short roll-number matching, and default present status."
        badge="CR & Admin Fast Entry"
      />

      {/* ── Class & Range Selector Card ── */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-3xl">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Class Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Target Class:</span>
              {(['CSE-25', 'AIDS-25'] as ClassId[]).map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setSelectedClassId(cid)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                    selectedClass.id === cid
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  {cid} ({cid === 'CSE-25' ? 'B.Tech CSE' : 'B.Tech AI&DS'})
                </button>
              ))}
            </div>

            {/* Range Preset Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold flex-wrap">
              <button
                type="button"
                onClick={() => setPreset('july')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'july'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                July 2026
              </button>
              <button
                type="button"
                onClick={() => setPreset('august')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'august'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                August 2026
              </button>
              <button
                type="button"
                onClick={() => setPreset('september')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'september'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                September 2026
              </button>
              <button
                type="button"
                onClick={() => setPreset('2m-jul-aug')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === '2m-jul-aug'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Jul–Aug (2 Mo)
              </button>
              <button
                type="button"
                onClick={() => setPreset('2m-aug-sep')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === '2m-aug-sep'
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Aug–Sep (2 Mo)
              </button>
              <button
                type="button"
                onClick={() => setPreset('semester')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'semester'
                    ? 'bg-white text-purple-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Full Semester
              </button>
              <button
                type="button"
                onClick={() => setPreset('unlimited')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'unlimited'
                    ? 'bg-white text-emerald-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                🌟 Unlimited
              </button>
              <button
                type="button"
                onClick={() => setPreset('custom')}
                className={cn(
                  'py-1.5 px-3 rounded-xl transition-all cursor-pointer',
                  preset === 'custom'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {preset === 'custom' && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-500">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
              />
              <span className="font-bold text-slate-500">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rapid Day Entry Wizard ── */}
      <RapidDayEntryWizard
        classId={selectedClass.id}
        classNameTitle={selectedClass.name}
        startDate={startDate}
        endDate={endDate}
        students={activeStudents}
      />

      {/* ── Quick Links to View & Export Reports After Backlog Entry ── */}
      <Card className="border-slate-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Where to view your saved attendance records?</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              All entered backlog records immediately update class registers, percentage calculations, eligibility alerts, and WhatsApp summaries.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <NavLink
              to="/students"
              className="px-3.5 py-2 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Monthly Period Register Grid</span>
            </NavLink>

            <NavLink
              to="/faculty-report"
              className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Faculty Subject Reports</span>
            </NavLink>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BacklogEntryPage;
