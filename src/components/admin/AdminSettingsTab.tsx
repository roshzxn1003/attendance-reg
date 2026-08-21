import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  Database,
  Download,
  Upload,
  UserCheck,
  KeyRound,
  RotateCcw,
  Trash2,
  AlertTriangle,
  HardDrive,
  Activity,
  Calendar,
  Users,
  Check,
  X,
  CloudUpload,
} from 'lucide-react';
import { ClassId } from '../../types';
import {
  verifyAdminPassword,
  getSystemDiagnostics,
  SystemDiagnostics,
  resetAttendance,
  resetDayCycle,
  restoreMasterRoster,
  reactivateAllStudents,
  resetAllStudentPasswords,
  exportFullDatabaseBackup,
  importFullDatabaseBackup,
  executeFullFactoryReset,
} from '../../services/adminSettingsService';
import { syncLocalAttendanceToCloud, getLocalAttendanceCount } from '../../services/attendanceService';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';

interface AdminSettingsTabProps {
  selectedClassId: ClassId;
  onRefreshParent?: () => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  selectedClassId,
  onRefreshParent,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Lock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [unlockLoading, setUnlockLoading] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);

  // Action Loading States
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Factory Reset Confirmation Modal
  const [showFactoryModal, setShowFactoryModal] = useState<boolean>(false);
  const [factoryConfirmText, setFactoryConfirmText] = useState<string>('');

  const loadDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const data = await getSystemDiagnostics();
      setDiagnostics(data);
    } catch {
      // ignore
    } finally {
      setDiagLoading(false);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadDiagnostics();
    }
  }, [isUnlocked]);

  // Handle Unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockLoading(true);
    setUnlockError(null);

    try {
      const isValid = await verifyAdminPassword(passwordInput);
      if (isValid) {
        setIsUnlocked(true);
        toast.success('Admin System Controls Unlocked', 'Authentication Verified');
      } else {
        setUnlockError('Invalid administrator password. Access denied.');
      }
    } catch (err) {
      setUnlockError(String(err));
    } finally {
      setUnlockLoading(false);
    }
  };

  // ── Action Handlers ──

  // 1. Export Backup
  const handleExportBackup = async () => {
    setActionLoading('export');
    try {
      const json = await exportFullDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spiher_attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Complete database backup downloaded as JSON', 'Backup Created');
    } catch (err) {
      toast.error(String(err), 'Export Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Import Backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setActionLoading('import');
    try {
      const text = await file.text();
      const res = await importFullDatabaseBackup(text);
      if (res.success) {
        toast.success(
          `Restored ${res.stats.studentsCount} students and ${res.stats.attendanceCount} attendance records!`,
          'Backup Restored'
        );
        loadDiagnostics();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      toast.error(`Invalid backup JSON: ${err}`, 'Restore Failed');
    } finally {
      setActionLoading(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Reactivate All Students
  const handleReactivateAll = async () => {
    setActionLoading('reactivate');
    try {
      const count = await reactivateAllStudents(selectedClassId);
      toast.success(`Reactivated all students for ${selectedClassId} (${count} updated)`, 'Students Reactivated');
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Operation Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Reset Student Passwords
  const handleResetPasswords = async () => {
    if (!window.confirm('Reset all custom student passwords back to default (spiher@123)?')) return;
    setActionLoading('passwords');
    try {
      const count = await resetAllStudentPasswords();
      toast.success(`Reset ${count} custom student passwords back to spiher@123`, 'Passwords Reset');
      loadDiagnostics();
    } catch (err) {
      toast.error(String(err), 'Operation Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Reset Attendance Records
  const handleResetAttendance = async (classOnly: boolean) => {
    const targetLabel = classOnly ? selectedClassId : 'ALL classes (CSE-25 and AIDS-25)';
    if (!window.confirm(`⚠️ Are you sure you want to PERMANENTLY ERASE all attendance records for ${targetLabel}? This cannot be undone.`)) {
      return;
    }

    setActionLoading('reset_att');
    try {
      const count = await resetAttendance(classOnly ? selectedClassId : undefined);
      toast.success(`Erased ${count} attendance records for ${targetLabel}`, 'Attendance Cleared');
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Reset Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Reset Day-Cycle Logs
  const handleResetDayCycle = async () => {
    if (!window.confirm(`⚠️ Reset Day-Cycle log and all holidays for ${selectedClassId}? Day orders will recalculate from Day 1.`)) {
      return;
    }

    setActionLoading('reset_cycle');
    try {
      const count = await resetDayCycle(selectedClassId);
      toast.success(`Reset ${count} calendar entries for ${selectedClassId}`, 'Calendar Reset');
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Reset Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Sync Local Records to Cloud
  const handleSyncToCloud = async () => {
    setActionLoading('cloud_sync');
    try {
      const res = await syncLocalAttendanceToCloud();
      if (res.error) {
        toast.error(res.error, 'Sync Failed');
      } else if (res.syncedCount === 0) {
        toast.info('All local attendance records are already synced with Supabase!', 'Fully Synced');
      } else {
        toast.success(`Successfully uploaded and synced ${res.syncedCount} attendance records to Supabase Cloud!`, 'Cloud Sync Complete');
      }
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Sync Error');
    } finally {
      setActionLoading(null);
    }
  };

  // 7. Restore Master Roster
  const handleRestoreMaster = async () => {
    if (!window.confirm(`Restore official SPIHER master student roster for ${selectedClassId}? Any newly added unverified students will be reset.`)) {
      return;
    }

    setActionLoading('restore_master');
    try {
      const count = await restoreMasterRoster(selectedClassId);
      toast.success(`Restored master student roster (${count} students verified)`, 'Roster Restored');
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Restore Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // 8. Full Factory Reset
  const handleExecuteFactoryReset = async () => {
    if (factoryConfirmText.trim().toUpperCase() !== 'RESET EVERYTHING') {
      toast.error('Please type "RESET EVERYTHING" exactly to confirm.', 'Confirmation Required');
      return;
    }

    setActionLoading('factory_reset');
    try {
      const res = await executeFullFactoryReset();
      toast.success(res.message, 'Factory Reset Complete');
      setShowFactoryModal(false);
      setFactoryConfirmText('');
      loadDiagnostics();
      if (onRefreshParent) onRefreshParent();
    } catch (err) {
      toast.error(String(err), 'Factory Reset Failed');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render: Locked Screen ──
  if (!isUnlocked) {
    return (
      <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden max-w-xl mx-auto my-6">
        <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black">Admin Security Gate</h3>
            <p className="text-xs text-slate-300">
              Enter Administrator Password to unlock system resets and extra features.
            </p>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {unlockError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{unlockError}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                Administrator Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Enter admin password…"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={unlockLoading}
              className="w-full font-black text-xs sm:text-sm py-2.5 rounded-xl gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-md cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Settings & Controls</span>
            </Button>
          </form>

          <p className="text-[11px] text-slate-400 text-center">
            Restricted to authorized system administrators and department heads.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render: Unlocked Admin Control Center ──
  return (
    <div className="space-y-6">
      {/* ── Top Unlock Status Banner ── */}
      <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-emerald-950">
                System Controls Unlocked
              </h3>
              <Badge variant="success" size="sm" className="font-bold">
                Admin Session Active
              </Badge>
            </div>
            <p className="text-xs text-emerald-800 mt-0.5">
              Full administrative privileges active for {selectedClassId} and college database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDiagnostics}
            isLoading={diagLoading}
            className="text-xs gap-1 text-emerald-900 border-emerald-300 hover:bg-emerald-100 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsUnlocked(false);
              setPasswordInput('');
              toast.info('Admin system controls locked.');
            }}
            className="text-xs gap-1 text-slate-600 border-slate-300 hover:bg-white rounded-xl"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Controls</span>
          </Button>
        </div>
      </div>

      {/* ── Section 1: Live System Diagnostics & Health ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>System Health & Diagnostic Monitor</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Live overview of Supabase database connectivity, records count, and local cache footprint.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {diagnostics ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Database Connection */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Database</span>
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    diagnostics.isDatabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                  )} />
                  <span className="text-xs font-black text-slate-800">
                    {diagnostics.isDatabaseConnected ? 'Supabase (Live)' : 'Local Cache'}
                  </span>
                </div>
              </div>

              {/* Total Students */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Students</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {diagnostics.activeStudents}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ {diagnostics.totalStudents}</span>
                </p>
              </div>

              {/* Attendance Records */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Attendance</span>
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {diagnostics.totalAttendanceRecords}
                  <span className="text-xs font-normal text-slate-400 ml-1">records</span>
                </p>
              </div>

              {/* Day Cycles & Holidays */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Calendar Logs</span>
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {diagnostics.totalDayCycleEntries}
                  <span className="text-xs font-normal text-slate-400 ml-1">({diagnostics.totalHolidays} holidays)</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">Loading diagnostics…</div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Backup & Recovery (Extra Power Features) ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-600" />
            <span>Database Backup & Restore (JSON)</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Export a complete JSON snapshot of all rosters, timetable, calendar, and attendance, or restore from a previous file.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Download Backup */}
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span>Download Full JSON Backup</span>
                </h4>
                <p className="text-[11px] text-indigo-800 mt-1">
                  Saves students, attendance entries, Day 1–6 cycle logs, and timetables into an offline JSON snapshot.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportBackup}
                isLoading={actionLoading === 'export'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export System Backup</span>
              </Button>
            </div>

            {/* Restore Backup */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>Restore from Backup File</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-1">
                  Upload a previously exported JSON backup file to overwrite and restore the complete system state.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={actionLoading === 'import'}
                  className="w-full bg-white hover:bg-slate-100 text-slate-800 border-slate-300 font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload & Restore Backup (.json)</span>
                </Button>
              </div>
            </div>

            {/* Sync Local Storage to Cloud */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex flex-col justify-between gap-3 sm:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-emerald-600" />
                    <span>Sync Offline Records to Supabase Cloud</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Uploads any attendance records saved in your browser's local cache directly into the Supabase Cloud database so they sync across all mobile devices and student dashboards.
                  </p>
                </div>
                <Badge variant="success" size="sm" className="font-bold shrink-0">
                  {getLocalAttendanceCount()} in local cache
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncToCloud}
                isLoading={actionLoading === 'cloud_sync'}
                className="bg-white hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-black text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Upload & Sync All Local Records to Cloud</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Bulk Administrative Tools (Extra Power Features) ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Bulk Student Management Operations</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Perform 1-click batch actions across the entire student roster.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reactivate All */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Reactivate All Deactivated Students</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Instantly reactivates any student marked inactive so they reappear in period attendance rosters.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivateAll}
                isLoading={actionLoading === 'reactivate'}
                className="w-full bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate All Students ({selectedClassId})</span>
              </Button>
            </div>

            {/* Reset Passwords */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Reset All Student Passwords</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clears all custom student passwords and restores the default password (spiher@123) for all students.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPasswords}
                isLoading={actionLoading === 'passwords'}
                className="w-full bg-white text-amber-800 border-amber-300 hover:bg-amber-50 font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Passwords to spiher@123</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: Granular Reset Zone ── */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Targeted Reset Controls</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Reset specific components of the attendance platform without affecting other records.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Reset Attendance */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900">Reset Attendance ({selectedClassId})</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clears all period attendance records for {selectedClassId}. Roster and timetable are kept intact.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetAttendance(true)}
                isLoading={actionLoading === 'reset_att'}
                className="w-full text-rose-700 border-rose-200 hover:bg-rose-50 font-bold text-xs gap-1 rounded-xl cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Attendance ({selectedClassId})</span>
              </Button>
            </div>

            {/* Reset Day Cycle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900">Reset Day-Cycle & Holidays</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clears all day assignments and holidays for {selectedClassId}. Next working day restarts from Day 1.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDayCycle}
                isLoading={actionLoading === 'reset_cycle'}
                className="w-full text-rose-700 border-rose-200 hover:bg-rose-50 font-bold text-xs gap-1 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Calendar Logs</span>
              </Button>
            </div>

            {/* Restore Master Roster */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-slate-900">Restore Master Roster</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Restores the official SPIHER student list (44 CSE / 16 AIDS). Clears temporary test additions.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreMaster}
                isLoading={actionLoading === 'restore_master'}
                className="w-full text-slate-700 border-slate-300 hover:bg-slate-100 font-bold text-xs gap-1 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Master Roster</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 5: DANGER ZONE — Full Factory Reset ── */}
      <Card className="border-2 border-rose-300 bg-rose-50/40 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-rose-200/60 bg-rose-100/40">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <CardTitle className="text-base font-black">
              Danger Zone — Complete Factory Reset
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-rose-800">
            Completely wipes all attendance records across all classes, resets day-cycles, resets passwords, and restores clean master rosters.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-rose-950">
              Permanent Factory Wipe
            </p>
            <p className="text-[11px] text-rose-800">
              This action completely wipes all stored attendance records, custom day assignments, and temporary imports. It cannot be undone.
            </p>
          </div>

          <Button
            variant="danger"
            size="lg"
            onClick={() => setShowFactoryModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md gap-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Everything</span>
          </Button>
        </CardContent>
      </Card>

      {/* ── Full Factory Reset Confirmation Modal ── */}
      {showFactoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-400 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-rose-900 to-red-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-rose-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Confirm Full Factory Reset</h3>
                  <p className="text-[11px] text-rose-200">Destructive Emergency Operation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFactoryModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                You are about to perform a <strong>Complete Factory Reset</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                <li>All attendance records for CSE-25 and AIDS-25 will be permanently deleted.</li>
                <li>All Day 1–6 cycle logs and marked holidays will be erased.</li>
                <li>Student rosters will be restored to the 60 master SPIHER records.</li>
                <li>All student passwords will be reset to spiher@123.</li>
              </ul>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Type <span className="font-mono text-rose-600 font-black">RESET EVERYTHING</span> below to confirm:
                </label>
                <input
                  type="text"
                  placeholder="RESET EVERYTHING"
                  value={factoryConfirmText}
                  onChange={(e) => setFactoryConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowFactoryModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleExecuteFactoryReset}
                  isLoading={actionLoading === 'factory_reset'}
                  disabled={factoryConfirmText.trim().toUpperCase() !== 'RESET EVERYTHING'}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Execute Factory Wipe</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
