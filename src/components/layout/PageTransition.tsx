import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Scroll to top on route change
    if (prevPathRef.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      prevPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className="animate-page-enter w-full flex-1 flex flex-col"
    >
      {children}
    </div>
  );
};

export default PageTransition;
