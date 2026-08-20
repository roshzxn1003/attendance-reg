import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Student } from '../../services/studentService';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface EditStudentModalProps {
  student: Student;
  onSave: (updates: { name: string; email: string | null }) => Promise<void>;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmedName,
        email: email.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Edit Student</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{student.student_id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Roll Number
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">{student.student_id}</span>
              <Badge variant={student.class_id === 'CSE-25' ? 'info' : 'purple'} size="sm">
                {student.class_id}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Roll number cannot be changed</p>
          </div>

          <div>
            <label htmlFor="edit-name" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
              placeholder="STUDENT NAME IN CAPS"
            />
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="student@spiher.ac.in"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
