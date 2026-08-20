import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-slate-500 text-sm mt-2 max-w-sm">
        The page you are looking for does not exist in the Smart CR Attendance App.
      </p>
      <div className="mt-6">
        <Link to="/attendance">
          <Button variant="primary" size="md" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Mark Attendance
          </Button>
        </Link>
      </div>
    </div>
  );
};
