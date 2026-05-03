export interface ScheduleEntry {
  id?: string;
  trainingName?: string;
  angkatan: string;
  dayNumber: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  subject: string;
  jp: number;
  instructors: string[];
  type: 'Synchronous' | 'Asynchronous' | 'Ceramah' | 'Dinamika Kelompok' | 'Lainnya';
  hasConflict?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface DayAvailability {
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string;
  endTime: string;
}

export interface Instructor {
  id?: string;
  name: string;
  role?: string;
  email?: string;
  availability?: DayAvailability[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
}
