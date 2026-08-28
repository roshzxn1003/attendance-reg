import { useState, useEffect, useCallback } from 'react';
import { ClassId, DayNumber } from '../types';
import {
  DayCycleEntry,
  getAllDayCycleLogs,
  getSuggestedNextDayOrderFromLogs,
  setWorkingDayOrder,
  markHolidayForDate,
  removeDayCycleEntry,
} from '../services/dayCycleService';

export function useDayCycle(classId: ClassId, selectedDate: string) {
  const [currentEntry, setCurrentEntry] = useState<DayCycleEntry | null>(null);
  const [suggestedDay, setSuggestedDay] = useState<DayNumber>(1);
  const [prevWorkingDate, setPrevWorkingDate] = useState<string | undefined>(undefined);
  const [prevWorkingDay, setPrevWorkingDay] = useState<DayNumber | undefined>(undefined);
  const [allLogs, setAllLogs] = useState<DayCycleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDateState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all logs once (fast single query with local cache fallback)
      const logs = await getAllDayCycleLogs(classId);
      setAllLogs(logs);

      // 2. Resolve current date entry in-memory
      const entry = logs.find((l) => l.date === selectedDate) || null;
      setCurrentEntry(entry);

      // 3. Resolve suggestions in-memory (0ms)
      const suggestion = getSuggestedNextDayOrderFromLogs(logs, selectedDate);
      setSuggestedDay(suggestion.suggestedDay);
      setPrevWorkingDate(suggestion.previousWorkingDate);
      setPrevWorkingDay(suggestion.previousDayNumber);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [classId, selectedDate]);

  useEffect(() => {
    loadDateState();
  }, [loadDateState]);

  const assignDay = async (dayNumber: DayNumber, notes?: string, targetDate?: string) => {
    setLoading(true);
    const dateToUse = targetDate || selectedDate;
    try {
      const updated = await setWorkingDayOrder(classId, dateToUse, dayNumber, notes);
      if (dateToUse === selectedDate) {
        setCurrentEntry(updated);
      }
      await loadDateState();
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const markHoliday = async (reason: string, notes?: string, targetDate?: string) => {
    setLoading(true);
    const dateToUse = targetDate || selectedDate;
    try {
      const updated = await markHolidayForDate(classId, dateToUse, reason, notes);
      if (dateToUse === selectedDate) {
        setCurrentEntry(updated);
      }
      await loadDateState();
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeEntry = async (date: string) => {
    setLoading(true);
    try {
      await removeDayCycleEntry(classId, date);
      await loadDateState();
    } catch (err) {
      setError(String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    currentEntry,
    suggestedDay,
    prevWorkingDate,
    prevWorkingDay,
    allLogs,
    loading,
    error,
    reload: loadDateState,
    assignDay,
    markHoliday,
    removeEntry,
  };
}
