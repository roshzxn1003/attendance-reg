import React from 'react';
import { useApp } from '../../context/AppContext';
import { CLASS_LIST } from '../../data/classes';
import { GraduationCap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ClassSelectorProps {
  compact?: boolean;
}

export const ClassSelector: React.FC<ClassSelectorProps> = ({ compact = false }) => {
  const { selectedClassId, setSelectedClassId } = useApp();

  return (
    <div className={cn('inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs', compact ? 'text-xs' : 'text-xs sm:text-sm')}>
      {CLASS_LIST.map((cls) => {
        const isSelected = cls.id === selectedClassId;
        return (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all duration-150 active:scale-95 cursor-pointer select-none',
              isSelected
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            )}
          >
            <GraduationCap className={cn('w-3.5 h-3.5 shrink-0 hidden xs:inline', isSelected ? 'text-blue-600' : 'text-slate-400')} />
            <span className="whitespace-nowrap text-xs font-mono">{cls.id}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-md font-mono shrink-0 hidden sm:inline',
                isSelected ? 'bg-blue-100 text-blue-800 font-extrabold' : 'bg-slate-200 text-slate-600'
              )}
            >
              {cls.id === 'CSE-25' ? '44' : '16'}
            </span>
          </button>
        );
      })}
    </div>
  );
};
