import React from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className,
}) => {
  const { selectedClass } = useApp();

  return (
    <div className={cn('pb-5 border-b border-slate-200 mb-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge && (
              <Badge variant="info" size="md">
                {badge}
              </Badge>
            )}
            <Badge variant="purple" size="md">
              {selectedClass.id} ({selectedClass.name})
            </Badge>
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 self-start sm:self-auto">{actions}</div>}
      </div>
    </div>
  );
};
