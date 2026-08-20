import { useState, useEffect, useCallback } from 'react';
import { DayNumber } from '../types';
import {
  TimetableEntry,
  fetchTimetable,
  saveTimetableEntry,
  deleteTimetableEntry,
  seedOfficialTimetable,
} from '../services/timetableService';

export function useTimetable(classId: string, dayNumber?: DayNumber) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocalFallback, setIsLocalFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTimetable(classId, dayNumber);
      setEntries(res.data);
      setIsLocalFallback(res.isLocalFallback);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, dayNumber]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEntry = async (entry: Parameters<typeof saveTimetableEntry>[0]) => {
    await saveTimetableEntry(entry);
    await load();
  };

  const removeEntry = async (timetableId: string) => {
    await deleteTimetableEntry(timetableId);
    await load();
  };

  const seedOfficial = async () => {
    const res = await seedOfficialTimetable(classId);
    await load();
    return res;
  };

  return {
    entries,
    loading,
    error,
    isLocalFallback,
    reload: load,
    saveEntry,
    removeEntry,
    seedOfficial,
  };
}
