import React, { createContext, useContext, useState } from 'react';
import { ClassId } from '../types';
import { CLASSES } from '../data/classes';

interface AppContextType {
  selectedClassId: ClassId;
  setSelectedClassId: (id: ClassId) => void;
  selectedClass: typeof CLASSES[ClassId];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const CLASS_STORAGE_KEY = 'smart_cr_selected_class';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClassId, setSelectedClassIdState] = useState<ClassId>(() => {
    const saved = localStorage.getItem(CLASS_STORAGE_KEY);
    if (saved === 'CSE-25' || saved === 'AIDS-25') {
      return saved;
    }
    return 'CSE-25';
  });

  const setSelectedClassId = (id: ClassId) => {
    setSelectedClassIdState(id);
    localStorage.setItem(CLASS_STORAGE_KEY, id);
  };

  const selectedClass = CLASSES[selectedClassId] || CLASSES['CSE-25'];

  return (
    <AppContext.Provider
      value={{
        selectedClassId,
        setSelectedClassId,
        selectedClass,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
