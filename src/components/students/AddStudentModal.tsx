import React, { useState } from 'react';
import { UserPlus, X, Check, AlertCircle } from 'lucide-react';
import { ClassId } from '../../types';
import { Button } from '../common/Button';

interface AddStudentModalProps {
  initialClassId: ClassId;
  onSave: (student: {
    student_id: string;
    class_id: ClassId;
    name: string;
    email: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  initialClassId,
  onSave,
  onClose,
}) => {
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState<ClassId>(initialClassId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentId.trim().toUpperCase();
    const cleanName = name.trim().toUpperCase();
    const cleanEmail = email.trim() || null;

    if (!cleanId) {
      setError('Please enter a valid Roll Number (e.g. SPC25CSU001).');
      return;
    }
    if (!cleanName) {
      setError('Please enter the student\'s full name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        student_id: cleanId,
        class_id: classId,
        name: cleanName,
        email: cleanEmail,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>Add New Student</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Class Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Class
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['CSE-25', 'AIDS-25'] as ClassId[]).map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setClassId(cid)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    classId === cid
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cid}
                </button>
              ))}
            </div>
          </div>

          {/* Roll Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Roll Number / Registration No *
            </label>
            <input
              type="text"
              required
              placeholder={classId === 'CSE-25' ? 'SPC25CSU001' : 'SPC25CSU601'}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must be unique across the college system.
            </p>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="ENTER STUDENT FULL NAME"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              College Email (Optional)
            </label>
            <input
              type="email"
              placeholder="student@spiher.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={saving}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 font-bold px-4"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Student</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
