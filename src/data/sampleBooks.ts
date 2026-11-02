import { Book, ReadingStats, ReadingStack } from '../types';

export const DEFAULT_STACKS: ReadingStack[] = [];

export const INITIAL_STATS: ReadingStats = {
  totalHours: 0,
  avgMinutesPerSession: 0,
  totalBooksFinished: 0,
  totalPagesRead: 0,
  currentStreakDays: 0,
  totalSessions: 0,
  weeklyGoalHours: 5.0,
  weeklyHoursLogged: 0,
};

export const INITIAL_BOOKS: Book[] = [];
