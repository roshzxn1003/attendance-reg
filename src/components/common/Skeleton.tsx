import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200/80', className)}
      {...props}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 6,
}) => {
  return (
    <div className="space-y-3 w-full p-4 bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 py-2 border-b border-slate-50">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={cn('h-4', cIdx === 0 ? 'w-12' : cIdx === 1 ? 'w-24' : 'flex-1')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
};
