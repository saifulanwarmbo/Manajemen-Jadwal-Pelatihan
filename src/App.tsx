import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc, 
  setDoc,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { Auth } from './components/Auth';
import { ScheduleEntry, Instructor, UserProfile, DayAvailability, TrainingProgram } from './types';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit2, 
  Trash2, 
  LogOut,
  ChevronRight,
  Clock,
  BookOpen,
  User as UserIcon,
  X,
  Save,
  FileSpreadsheet,
  Mail,
  AlertTriangle,
  Copy,
  Shield,
  FileText,
  Upload,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  parseISO, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from './lib/utils';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-l-4",
      active 
        ? "bg-indigo-600 text-white shadow-sm rounded-2xl" 
        : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
    )}
  >
    <Icon size={18} />
    <span className="uppercase tracking-wider font-mono">{label}</span>
  </button>
);

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'info', className?: string }) => {
  const variants = {
    default: "bg-slate-100 text-slate-900 dark:text-slate-100 dark:bg-slate-700/50 dark:text-slate-300",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <span className={cn("px-2 py-0.5 text-xs font-mono uppercase tracking-tighter font-bold rounded", variants[variant], className)}>
      {children}
    </span>
  );
};

const TRAINING_PROGRAMS = [
  "Pelatihan Dasar CPNS (Latsar CPNS)",
  "Pelatihan Kepemimpinan Pengawas (PKP)",
  "Pelatihan Kepemimpinan Administrator (PKA)",
  "Pelatihan Kepemimpinan Nasional (PKN)"
];

const PROGRAM_DETAILS = [
  {
    id: "latsar",
    title: "Pelatihan Dasar CPNS (Latsar CPNS)",
    description: "Pelatihan Dasar Calon Pegawai Negeri Sipil (Latsar CPNS) adalah pendidikan dan pelatihan dalam Masa Prajabatan yang dilakukan secara terintegrasi untuk membangun integritas moral, kejujuran, semangat dan motivasi nasionalisme dan kebangsaan, karakter kepribadian yang unggul dan bertanggung jawab, dan memperkuat profesionalisme serta kompetensi bidang.",
    objective: "Membentuk PNS profesional yang berkarakter yaitu PNS yang karakternya dibentuk oleh nilai-nilai dasar profesi PNS, sehingga mampu melaksanakan tugas dan perannya secara profesional sebagai pelayan masyarakat.",
    targetAudience: "Calon Pegawai Negeri Sipil (CPNS) yang berada dalam masa percobaan sebelum diangkat menjadi Pegawai Negeri Sipil (PNS)."
  },
  {
    id: "pkp",
    title: "Pelatihan Kepemimpinan Pengawas (PKP)",
    description: "Pelatihan struktural kepemimpinan jenjang pengawas yang dirancang dan diselenggarakan bagi Pejabat Pengawas atau yang disetarakan dalam rangka mengembangkan Kompetensi Kepemimpinan Operasional.",
    objective: "Mengembangkan kompetensi peserta dalam rangka memenuhi standar kompetensi manajerial Pejabat Pengawas untuk me-manage kegiatan-kegiatan di lingkungan kerjanya berdasarkan SOP (Standar Operasional Prosedur) dan praktik-praktik terbaik kepemimpinan operasional.",
    targetAudience: "Pejabat Pengawas (sebelumnya dikenal sebagai Pejabat Eselon IV) atau pegawai yang sedang dipersiapkan untuk menduduki jabatan pengawas."
  },
  {
    id: "pka",
    title: "Pelatihan Kepemimpinan Administrator (PKA)",
    description: "Pelatihan struktural kepemimpinan jenjang administrator bagi Pejabat Administrator atau yang disetarakan untuk mengembangkan Kompetensi Kepemimpinan Kinerja sebagai wujud akuntabilitas kepemimpinannya.",
    objective: "Mengembangkan dan memperkuat kompetensi kepemimpinan manajemen kinerja demi menjamin terlaksananya seluruh kegiatan yang sudah direncanakan agar dilakukan dengan efektif dan efisien guna mewujudkan capaian organisasi.",
    targetAudience: "Pejabat Administrator (sebelumnya dikenal sebagai Pejabat Eselon III) atau pegawai yang sedang dipersiapkan untuk menduduki jabatan administrator."
  },
  {
    id: "pkn",
    title: "Pelatihan Kepemimpinan Nasional (PKN)",
    description: "Pelatihan struktural kepemimpinan tertinggi yang dirancang untuk pejabat pimpinan tinggi, agar mereka memantapkan kompetensi kepemimpinan strategis yang membawa dampak bersekala nasional maupun instansional.",
    objective: "Membekali peserta untuk memiliki kemampuan merumuskan dan melaksanakan kebijakan di tingkat strategis nasional, serta memimpin perubahan untuk perbaikan kinerja sektor publik di kementerian/lembaga/daerah.",
    targetAudience: "Pejabat Pimpinan Tinggi (Pratama, Madya, maupun Utama), yang memainkan peran kunci pada level pengambil kebijakan strategis instansi atau nasional."
  }
];

// --- Main App ---

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             (!('darkMode' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'schedule' | 'programs' | 'instructors' | 'instructor-calendar' | 'users' | 'login'>('schedule');
  
  const [activeTraining, setActiveTraining] = useState<string>(TRAINING_PROGRAMS[0]);
  
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  
  const [selectedInstructorForCalendar, setSelectedInstructorForCalendar] = useState<Instructor | null>(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedAngkatan, setSelectedAngkatan] = useState<string>('All');
  const [previewAngkatan, setPreviewAngkatan] = useState<string>('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [scheduleFormError, setScheduleFormError] = useState<string | null>(null);

  // Program Management State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [programTitle, setProgramTitle] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programObjective, setProgramObjective] = useState('');
  const [programTargetAudience, setProgramTargetAudience] = useState('');
  const [programType, setProgramType] = useState<TrainingProgram['type']>('Lainnya');
  const [programFormError, setProgramFormError] = useState<string | null>(null);
  const [instructorSearch, setInstructorSearch] = useState('');
  const deferredInstructorSearch = useDeferredValue(instructorSearch);
  const [currentScheduleDate, setCurrentScheduleDate] = useState('');
  const [currentScheduleStartTime, setCurrentScheduleStartTime] = useState('');
  const [currentScheduleEndTime, setCurrentScheduleEndTime] = useState('');
  const [currentScheduleType, setCurrentScheduleType] = useState<string>('Synchronous');
  const [currentJp, setCurrentJp] = useState<number | ''>('');
  const [currentSubject, setCurrentSubject] = useState('');
  const [selectedInstructorNames, setSelectedInstructorNames] = useState<string[]>([]);
  const [customInstructorName, setCustomInstructorName] = useState('');
  
  const isInstructorAvailable = (instructor: Instructor, date: string, startTime: string, endTime: string) => {
    if (!instructor.availability || instructor.availability.length === 0) return null; // Neutral state
    
    if (!date || !startTime || !endTime) return false;

    try {
      const dayOfWeek = parseISO(date).getDay();
      const slots = instructor.availability.filter(s => s.day === dayOfWeek);
      
      if (slots.length === 0) return false;

      // Check if any slot covers the entire session time
      return slots.some(slot => {
        return slot.startTime <= startTime && slot.endTime >= endTime;
      });
    } catch (e) {
      return false;
    }
  };

  const getInstructorConflicts = (instructorNames: string[], date: string, startTime: string, endTime: string) => {
    if (!date || !startTime || !endTime || instructorNames.length === 0) return [];

    const conflicts: { instructor: string; subject: string; time: string; angkatan: string }[] = [];

    schedules.forEach(s => {
      if (editingEntry && s.id === editingEntry.id) return;
      if (s.date !== date) return;

      const isOverlapping = startTime < s.endTime && endTime > s.startTime;
      if (!isOverlapping) return;

      instructorNames.forEach(name => {
        if (s.instructors.includes(name)) {
          conflicts.push({
            instructor: name,
            subject: s.subject,
            time: `${s.startTime} - ${s.endTime}`,
            angkatan: s.angkatan
          });
        }
      });
    });

    return conflicts;
  };

  const instructorConflicts = useMemo(() => {
    return getInstructorConflicts(selectedInstructorNames, currentScheduleDate, currentScheduleStartTime, currentScheduleEndTime);
  }, [selectedInstructorNames, currentScheduleDate, currentScheduleStartTime, currentScheduleEndTime, schedules, editingEntry]);

  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [viewingInstructor, setViewingInstructor] = useState<Instructor | null>(null);
  const [instructorAvailability, setInstructorAvailability] = useState<DayAvailability[]>([]);
  
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [availabilityInstructor, setAvailabilityInstructor] = useState<Instructor | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<DayAvailability[]>([]);

  const [isExportReviewModalOpen, setIsExportReviewModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<number>(24); // hours
  const [reminderMessage, setReminderMessage] = useState("This is a reminder for your upcoming session.");
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState<{success: number, failed: number} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{type: 'schedule' | 'instructor' | 'user' | 'program', id: string, label: string} | null>(null);

  // Duplicate Batch State
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateSourceAngkatan, setDuplicateSourceAngkatan] = useState('');
  const [duplicateTargetAngkatan, setDuplicateTargetAngkatan] = useState('');

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTargetAngkatan, setImportTargetAngkatan] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [duplicateDateOffset, setDuplicateDateOffset] = useState<number>(0);

  // Delete Batch State
  const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
  const [deleteBatchTarget, setDeleteBatchTarget] = useState('');

  // Export Document Config State
  const [trainingMethod, setTrainingMethod] = useState('Distance Learning');
  const [organizer, setOrganizer] = useState('');

  // Auto-calculate JP
  useEffect(() => {
    if (currentScheduleType === 'Asynchronous') {
      return; // Do not auto-calculate for Asynchronous
    }
    
    if (currentScheduleType === 'Istirahat') {
      setCurrentJp(0);
      return;
    }
    
    if (currentScheduleStartTime && currentScheduleEndTime) {
      const [startH, startM] = currentScheduleStartTime.split(':').map(Number);
      const [endH, endM] = currentScheduleEndTime.split(':').map(Number);
      
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes > 0) {
        // 1 JP = 45 minutes
        const calculatedJp = Math.round(diffMinutes / 45);
        setCurrentJp(calculatedJp);
      } else {
        setCurrentJp('');
      }
    }
  }, [currentScheduleStartTime, currentScheduleEndTime, currentScheduleType]);

  // Auto-fill subject for Mandiri Peserta
  useEffect(() => {
    if (selectedInstructorNames.includes('Mandiri Peserta')) {
      setCurrentSubject('Penyelesaian Penugasan Secara Mandiri/Kelompok');
      setCurrentScheduleType('Asynchronous');
    }
  }, [selectedInstructorNames]);

  // Auto-fill session type for Istirahat
  useEffect(() => {
    if (currentSubject.toLowerCase().includes('istirahat')) {
      setCurrentScheduleType('Istirahat');
    }
  }, [currentSubject]);

  // Auth & Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            const isAdmin = currentUser.email === 'saiful.anwarmbo@gmail.com';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              role: isAdmin ? 'admin' : 'user'
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        alert(`Gagal memuat profil pengguna dari database: ${error instanceof Error ? error.message : String(error)}\n\nPastikan aturan keamanan Firestore (Rules) sudah diperbarui dan Anda memiliki akses.`);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Data Fetching
  useEffect(() => {
    const qSchedules = query(collection(db, 'schedules'), orderBy('date', 'asc'), orderBy('startTime', 'asc'));
    const unsubSchedules = onSnapshot(qSchedules, (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'schedules'));

    const qInstructors = query(collection(db, 'instructors'), orderBy('name', 'asc'));
    const unsubInstructors = onSnapshot(qInstructors, (snapshot) => {
      setInstructors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Instructor)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'instructors'));

    const qPrograms = query(collection(db, 'programs'), orderBy('title', 'asc'));
    const unsubPrograms = onSnapshot(qPrograms, (snapshot) => {
      setPrograms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingProgram)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'programs'));

    return () => {
      unsubSchedules();
      unsubInstructors();
      unsubPrograms();
    };
  }, []);

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    if (!user || !isAdmin) return;

    const qUsers = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsersList(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => unsubUsers();
  }, [user, isAdmin]);

  const allAngkatan = useMemo(() => {
    const angkatans = Array.from(new Set(schedules.map(s => s.angkatan).filter(Boolean)));
    return angkatans.sort();
  }, [schedules]);

  const currentProgramsList = useMemo(() => {
    const defaultPrograms = PROGRAM_DETAILS.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      objective: p.objective,
      targetAudience: p.targetAudience,
      type: 'Struktural' as const
    }));

    const merged = [...defaultPrograms];
    programs.forEach(fp => {
      const existingIdx = merged.findIndex(dp => dp.id === fp.id);
      if (existingIdx >= 0) {
        merged[existingIdx] = fp;
      } else {
        merged.push(fp);
      }
    });

    return merged;
  }, [programs]);

  const trainingProgramTitles = useMemo(() => currentProgramsList.map(p => p.title), [currentProgramsList]);

  // Filtering
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const sTraining = s.trainingName || TRAINING_PROGRAMS[0];
      if (sTraining !== activeTraining) return false;

      const matchesSearch = s.subject.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
                           s.instructors.some(i => i.toLowerCase().includes(deferredSearchTerm.toLowerCase()));
      const matchesType = filterType === 'All' || s.type === filterType;
      const matchesAngkatan = selectedAngkatan === 'All' || s.angkatan === selectedAngkatan;
      return matchesSearch && matchesType && matchesAngkatan;
    }).sort((a, b) => a.angkatan.localeCompare(b.angkatan) || a.dayNumber - b.dayNumber || a.startTime.localeCompare(b.startTime));
  }, [schedules, deferredSearchTerm, filterType, selectedAngkatan, activeTraining]);

  // Grouping
  const groupedSchedules = useMemo(() => {
    const groups: { key: string, angkatan: string, dayNumber: number, date: string, entries: ScheduleEntry[] }[] = [];
    
    filteredSchedules.forEach(s => {
      const key = `${s.angkatan}|${s.dayNumber}|${s.date}`;
      let group = groups.find(g => g.key === key);
      if (!group) {
        group = { key, angkatan: s.angkatan, dayNumber: s.dayNumber, date: s.date, entries: [] };
        groups.push(group);
      }
      group.entries.push(s);
    });
    
    return groups;
  }, [filteredSchedules]);

  // Calculate Date Range
  const dateRangeStr = useMemo(() => {
    if (filteredSchedules.length === 0) return '-';
    const dates = filteredSchedules.map(s => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'd MMMM yyyy', { locale: localeId });
    }

    const startMonth = format(startDate, 'MMMM', { locale: localeId });
    const endMonth = format(endDate, 'MMMM', { locale: localeId });
    const startYear = format(startDate, 'yyyy');
    const endYear = format(endDate, 'yyyy');

    if (startYear !== endYear) {
      return `${format(startDate, 'd MMMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    } else if (startMonth !== endMonth) {
      return `${format(startDate, 'd MMMM', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    } else {
      return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    }
  }, [filteredSchedules]);

  // Preview Filtering & Grouping
  const previewFilteredSchedules = useMemo(() => {
    return schedules
      .filter(s => {
        const sTraining = s.trainingName || TRAINING_PROGRAMS[0];
        if (sTraining !== activeTraining) return false;

        const matchesAngkatan = previewAngkatan === 'All' || s.angkatan === previewAngkatan;
        return matchesAngkatan;
      })
      .sort((a, b) => a.angkatan.localeCompare(b.angkatan) || a.dayNumber - b.dayNumber || a.startTime.localeCompare(b.startTime));
  }, [schedules, previewAngkatan, activeTraining]);

  const previewGroupedSchedules = useMemo(() => {
    const groups: { key: string, angkatan: string, dayNumber: number, date: string, entries: ScheduleEntry[] }[] = [];
    
    previewFilteredSchedules.forEach(s => {
      const key = `${s.angkatan}|${s.dayNumber}|${s.date}`;
      let group = groups.find(g => g.key === key);
      if (!group) {
        group = { key, angkatan: s.angkatan, dayNumber: s.dayNumber, date: s.date, entries: [] };
        groups.push(group);
      }
      group.entries.push(s);
    });
    
    return groups;
  }, [previewFilteredSchedules]);

  const previewDateRangeStr = useMemo(() => {
    if (previewFilteredSchedules.length === 0) return '-';
    const dates = previewFilteredSchedules.map(s => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    if (startDate.getTime() === endDate.getTime()) {
      return format(startDate, 'd MMMM yyyy', { locale: localeId });
    }

    const startMonth = format(startDate, 'MMMM', { locale: localeId });
    const endMonth = format(endDate, 'MMMM', { locale: localeId });
    const startYear = format(startDate, 'yyyy');
    const endYear = format(endDate, 'yyyy');

    if (startYear !== endYear) {
      return `${format(startDate, 'd MMMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    } else if (startMonth !== endMonth) {
      return `${format(startDate, 'd MMMM', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    } else {
      return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
    }
  }, [previewFilteredSchedules]);

  const allInstructors = useMemo(() => {
    const registeredNames = new Set(instructors.map(i => i.name));
    const externalNames = new Set<string>();
    
    schedules.forEach(s => {
      s.instructors.forEach(instName => {
        if (!registeredNames.has(instName)) {
          externalNames.add(instName);
        }
      });
    });

    const combined: (Instructor & { isExternal?: boolean })[] = [...instructors];
    
    externalNames.forEach(name => {
      combined.push({
        id: `ext-${name}`,
        name,
        role: 'Narasumber Luar',
        isExternal: true
      });
    });
    
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [instructors, schedules]);

  const instructorConflictsMap = useMemo(() => {
    const map: Record<string, { s1: ScheduleEntry, s2: ScheduleEntry }[]> = {};
    
    allInstructors.forEach(inst => {
      const instructorSchedules = schedules.filter(s => s.instructors.includes(inst.name));
      const conflicts: { s1: ScheduleEntry, s2: ScheduleEntry }[] = [];
      
      for (let i = 0; i < instructorSchedules.length; i++) {
        for (let j = i + 1; j < instructorSchedules.length; j++) {
          const s1 = instructorSchedules[i];
          const s2 = instructorSchedules[j];
          
          if (s1.date === s2.date) {
            if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
              conflicts.push({ s1, s2 });
            }
          }
        }
      }
      if (conflicts.length > 0) {
        map[inst.name] = conflicts;
      }
    });
    
    return map;
  }, [schedules, allInstructors]);

  const instructorJpStats = useMemo(() => {
    const stats: Record<string, { totalJp: number, trainingJp: Record<string, Record<string, number>> }> = {};
    
    allInstructors.forEach(inst => {
      stats[inst.name] = { totalJp: 0, trainingJp: {} };
    });

    schedules.forEach(s => {
      s.instructors.forEach(instName => {
        if (stats[instName]) {
          const jp = Number(s.jp) || 0;
          const tName = s.trainingName || TRAINING_PROGRAMS[0];
          stats[instName].totalJp += jp;
          
          if (!stats[instName].trainingJp[tName]) {
            stats[instName].trainingJp[tName] = {};
          }
          stats[instName].trainingJp[tName][s.angkatan] = (stats[instName].trainingJp[tName][s.angkatan] || 0) + jp;
        }
      });
    });

    return stats;
  }, [schedules, allInstructors]);

  // Auth & Profile
  // --- Program CRUD ---
  const handleSaveProgram = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    setProgramFormError(null);

    const data: TrainingProgram = {
      title: programTitle,
      description: programDescription,
      objective: programObjective,
      targetAudience: programTargetAudience,
      type: programType
    };

    try {
      if (editingProgram?.id) {
        data.updatedAt = new Date().toISOString();
        await setDoc(doc(db, 'programs', editingProgram.id), data as any, { merge: true });
      } else {
        data.createdAt = new Date().toISOString();
        data.updatedAt = new Date().toISOString();
        await addDoc(collection(db, 'programs'), data);
      }
      setIsProgramModalOpen(false);
      setEditingProgram(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'programs');
      setProgramFormError('Gagal menyimpan program. Periksa koneksi dan izin.');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setScheduleFormError(null);
    
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
    const shouldContinue = submitter?.value === 'continue';

    const formData = new FormData(form);
    const date = formData.get('date') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;

    if (startTime >= endTime) {
      setScheduleFormError('End time must be after start time.');
      return;
    }

    const angkatan = formData.get('angkatan') as string;

    const isOverlapping = schedules.some(s => {
      if (editingEntry && s.id === editingEntry.id) return false;
      if (s.date !== date) return false;
      if (s.angkatan !== angkatan) return false;
      return startTime < s.endTime && endTime > s.startTime;
    });

    if (isOverlapping) {
      setScheduleFormError('This schedule overlaps with an existing entry on the same day.');
      return;
    }

    const instructors = selectedInstructorNames;
    const conflicts = getInstructorConflicts(instructors, date, startTime, endTime);

    const data: Partial<ScheduleEntry> = {
      trainingName: activeTraining,
      angkatan: formData.get('angkatan') as string,
      dayNumber: parseInt(formData.get('dayNumber') as string),
      date,
      startTime,
      endTime,
      subject: formData.get('subject') as string,
      jp: Number(formData.get('jp')),
      type: formData.get('type') as any,
      instructors,
      hasConflict: conflicts.length > 0,
      updatedAt: Timestamp.now(),
    };

    try {
      if (editingEntry?.id) {
        await updateDoc(doc(db, 'schedules', editingEntry.id), data);
      } else {
        await addDoc(collection(db, 'schedules'), { ...data, createdAt: Timestamp.now() });
      }
      
      if (shouldContinue) {
        setEditingEntry(null);
        setInstructorSearch('');
        setCustomInstructorName('');
        setSelectedInstructorNames([]);
        setCurrentScheduleStartTime('');
        setCurrentScheduleEndTime('');
        setCurrentScheduleType('Synchronous');
        setCurrentJp('');
        setCurrentSubject('');
        (form.elements.namedItem('startTime') as HTMLInputElement).value = '';
        (form.elements.namedItem('endTime') as HTMLInputElement).value = '';
        (form.elements.namedItem('subject') as HTMLInputElement).value = '';
        (form.elements.namedItem('jp') as HTMLInputElement).value = '';
        form.querySelectorAll('input[name="instructors"]').forEach(cb => (cb as HTMLInputElement).checked = false);
        
        (form.elements.namedItem('startTime') as HTMLInputElement).focus();
      } else {
        setIsModalOpen(false);
        setEditingEntry(null);
        setInstructorSearch('');
        setCustomInstructorName('');
        setSelectedInstructorNames([]);
        setCurrentScheduleDate('');
        setCurrentScheduleStartTime('');
        setCurrentScheduleEndTime('');
        setCurrentScheduleType('Synchronous');
        setCurrentJp('');
        setCurrentSubject('');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'schedules');
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !isAdmin) return;
    try {
      if (deleteConfirm.type === 'schedule') {
        await deleteDoc(doc(db, 'schedules', deleteConfirm.id));
      } else if (deleteConfirm.type === 'program') {
        await deleteDoc(doc(db, 'programs', deleteConfirm.id));
      } else if (deleteConfirm.type === 'instructor') {
        if (deleteConfirm.id.startsWith('ext-')) {
          const instructorName = deleteConfirm.label;
          const schedulesToUpdate = schedules.filter(s => s.instructors.includes(instructorName));
          await Promise.all(schedulesToUpdate.map(s => {
            const updatedInstructors = s.instructors.filter(name => name !== instructorName);
            return updateDoc(doc(db, 'schedules', s.id!), { instructors: updatedInstructors });
          }));
        } else {
          await deleteDoc(doc(db, 'instructors', deleteConfirm.id));
        }
      } else if (deleteConfirm.type === 'user') {
        await deleteDoc(doc(db, 'users', deleteConfirm.id));
      }
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, deleteConfirm.type === 'schedule' ? 'schedules' : 
        (deleteConfirm.type === 'instructor' ? 'instructors' : 
        (deleteConfirm.type === 'program' ? 'programs' : 'users')));
    }
  };

  const handleSaveInstructor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    const formData = new FormData(e.currentTarget);
    const data: Partial<Instructor> = {
      name: formData.get('name') as string,
      role: formData.get('role') as string,
      email: formData.get('email') as string,
      availability: instructorAvailability,
    };

    try {
      if (editingInstructor?.id) {
        await updateDoc(doc(db, 'instructors', editingInstructor.id), data);
      } else {
        await addDoc(collection(db, 'instructors'), data);
      }
      setIsInstructorModalOpen(false);
      setEditingInstructor(null);
      setInstructorAvailability([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'instructors');
    }
  };

  const openInstructorModal = (instructor?: Instructor) => {
    if (instructor) {
      setEditingInstructor(instructor);
      setInstructorAvailability(instructor.availability || []);
    } else {
      setEditingInstructor(null);
      setInstructorAvailability([]);
    }
    setIsInstructorModalOpen(true);
  };

  const openAvailabilityModal = (instructor: Instructor) => {
    setAvailabilityInstructor(instructor);
    setEditingAvailability(instructor.availability || []);
    setIsAvailabilityModalOpen(true);
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!availabilityInstructor?.id) return;
    
    try {
      await updateDoc(doc(db, 'instructors', availabilityInstructor.id), {
        availability: editingAvailability
      });
      setIsAvailabilityModalOpen(false);
      setAvailabilityInstructor(null);
      setEditingAvailability([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'instructors');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin || !importFile || !importTargetAngkatan) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('trainingName', activeTraining);
      formData.append('angkatan', importTargetAngkatan);

      const res = await fetch('/api/extract-schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract schedule');

      const extractedSchedules = data.schedules as ScheduleEntry[];
      if (!extractedSchedules || extractedSchedules.length === 0) {
        throw new Error('No schedule entries found in the file.');
      }

      // Filter out those already exist to prevent dupes in the same training and angkatan
      // Match by subject, date, startTime, and endTime
      const existingInTarget = schedules.filter(s => 
        (s.trainingName || trainingProgramTitles[0] || 'Lainnya') === activeTraining && 
        s.angkatan === importTargetAngkatan
      );

      const newSchedules = extractedSchedules.filter(extracted => {
        return !existingInTarget.some(existing => 
          existing.date === extracted.date &&
          existing.startTime === extracted.startTime &&
          existing.endTime === extracted.endTime &&
          existing.subject === extracted.subject
        );
      });

      if (newSchedules.length > 0) {
        await Promise.all(newSchedules.map(async s => {
          s.createdAt = new Date().toISOString();
          s.updatedAt = new Date().toISOString();
          await addDoc(collection(db, 'schedules'), s);
        }));
      }

      setIsImportModalOpen(false);
      setImportFile(null);
      setImportTargetAngkatan('');
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDuplicateBatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    if (!duplicateSourceAngkatan || !duplicateTargetAngkatan) {
      alert("Source and Target Angkatan are required.");
      return;
    }

    const sourceSchedules = schedules.filter(s => (s.trainingName || TRAINING_PROGRAMS[0]) === activeTraining && s.angkatan === duplicateSourceAngkatan);
    
    if (sourceSchedules.length === 0) {
      alert("No schedules found for the source angkatan.");
      return;
    }

    try {
      await Promise.all(sourceSchedules.map(s => {
        const newDate = addDays(parseISO(s.date), duplicateDateOffset);
        const { id, ...rest } = s;
        return addDoc(collection(db, 'schedules'), {
          ...rest,
          angkatan: duplicateTargetAngkatan,
          date: format(newDate, 'yyyy-MM-dd'),
          createdAt: Timestamp.now()
        });
      }));
      
      setIsDuplicateModalOpen(false);
      setDuplicateSourceAngkatan('');
      setDuplicateTargetAngkatan('');
      setDuplicateDateOffset(0);
      alert("Batch duplicated successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'schedules');
    }
  };

  const handleDeleteBatchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin || !deleteBatchTarget) return;

    const batchSchedules = schedules.filter(s => (s.trainingName || TRAINING_PROGRAMS[0]) === activeTraining && s.angkatan === deleteBatchTarget);
    
    if (batchSchedules.length === 0) {
      alert("Tidak ada jadwal untuk angkatan ini.");
      return;
    }

    try {
      await Promise.all(batchSchedules.map(s => deleteDoc(doc(db, 'schedules', s.id!))));
      setIsDeleteBatchModalOpen(false);
      setDeleteBatchTarget('');
      alert("Batch berhasil dihapus.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'schedules');
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'user') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    }
  };

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    setReminderResult(null);
    
    try {
      const now = new Date();
      const targetTime = new Date(now.getTime() + reminderTiming * 60 * 60 * 1000);
      
      // Find schedules that are within the timing window
      // For simplicity, we'll look for schedules that happen on the target date
      // and match the instructors.
      const targetDateStr = format(targetTime, 'yyyy-MM-dd');
      
      const upcomingSchedules = schedules.filter(s => {
        if (s.type === 'Istirahat') return false;
        
        // Parse schedule start time
        const [hours, minutes] = s.startTime.split(':').map(Number);
        const scheduleDateTime = new Date(s.date);
        scheduleDateTime.setHours(hours, minutes, 0, 0);
        
        // Check if schedule is between now and target time
        return scheduleDateTime > now && scheduleDateTime <= targetTime;
      });

      let successCount = 0;
      let failedCount = 0;

      for (const schedule of upcomingSchedules) {
        // Find instructors for this schedule
        const sessionInstructors = instructors.filter(i => schedule.instructors.includes(i.name));
        
        for (const instructor of sessionInstructors) {
          if (instructor.email) {
            try {
              const html = `
                <div style="font-family: monospace; padding: 20px; border: 2px solid #0F172A; max-width: 600px; margin: 0 auto;">
                  <h2 style="text-transform: uppercase; border-bottom: 2px solid #0F172A; padding-bottom: 10px;">Session Reminder</h2>
                  <p>Hello ${instructor.name},</p>
                  <p>${reminderMessage}</p>
                  <div style="background: #F8FAFC; padding: 15px; margin: 20px 0; border: 1px solid #0F172A;">
                    <p><strong>Subject:</strong> ${schedule.subject}</p>
                    <p><strong>Date:</strong> ${schedule.date}</p>
                    <p><strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}</p>
                    <p><strong>Batch:</strong> ${schedule.angkatan}</p>
                    <p><strong>Type:</strong> ${schedule.type}</p>
                  </div>
                  <p style="font-size: 12px; opacity: 0.7;">This is an automated message from Manajemen Jadwal Pelatihan.</p>
                </div>
              `;

              // Simulate sending email for Client-Side SPA (since we don't have a backend server)
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // If you were to use a Serverless Cloud Function here, you would call it like this:
              /*
              const response = await fetch('YOUR_CLOUD_FUNCTION_URL', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  to: instructor.email,
                  subject: `Reminder: Upcoming Session - ${schedule.subject}`,
                  html
                })
              });
              */
              
              // We'll simulate a 100% success rate for demonstration purposes
              const result = { success: true };
              if (result.success) {
                successCount++;
              } else {
                failedCount++;
              }
            } catch (e) {
              failedCount++;
            }
          }
        }
      }

      setReminderResult({ success: successCount, failed: failedCount });
    } catch (error) {
      console.error("Error sending reminders:", error);
      setReminderResult({ success: 0, failed: 1 });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF({ orientation: 'landscape', format: [215, 330] });
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`JADWAL PENYELENGGARAAN ${activeTraining.toUpperCase()}`, 20, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Penyelenggara: ${organizer || '-'}`, 20, 17);
    doc.text(`Metode: ${trainingMethod}`, 20, 22);
    doc.text(`Tanggal Pelaksanaan: ${previewDateRangeStr}`, 20, 27);
    if (previewAngkatan !== 'All') {
      doc.text(`Angkatan: ${previewAngkatan}`, 20, 32);
    }
    
    const showAngkatanCol = previewAngkatan === 'All';
    const head = [
      showAngkatanCol ? ['Angkatan', 'Hari ke-', 'Hari/Tanggal', 'Waktu', 'Mata Pelatihan', 'JP', 'Tenaga Pengajar', 'Tipe'] : 
      ['Hari ke-', 'Hari/Tanggal', 'Waktu', 'Mata Pelatihan', 'JP', 'Tenaga Pengajar', 'Tipe']
    ];
    const body: any[] = [];

    previewGroupedSchedules.forEach(group => {
      group.entries.forEach((s, index) => {
        const row: any[] = [];
        if (index === 0) {
          if (showAngkatanCol) {
            row.push({ content: s.angkatan, rowSpan: group.entries.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
          }
          row.push({ content: s.dayNumber, rowSpan: group.entries.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
          row.push({ content: format(parseISO(s.date), 'EEEE, dd MMM yyyy', { locale: localeId }), rowSpan: group.entries.length, styles: { valign: 'middle', halign: 'center' } });
        }
        row.push({ content: `${s.startTime} - ${s.endTime}`, styles: { valign: 'middle', halign: 'center' } });
        row.push({ content: s.subject, styles: { valign: 'middle' } });
        row.push({ content: s.jp, styles: { halign: 'center', valign: 'middle' } });
        
        const instructorText = s.instructors.length > 1 
          ? s.instructors.map(i => `- ${i}`).join('\n')
          : s.instructors[0] || '-';
        row.push({ content: instructorText, styles: { valign: 'middle' } });
        
        row.push({ content: s.type, styles: { valign: 'middle', halign: 'center' } });
        body.push(row);
      });
    });

    autoTable(doc, {
      startY: previewAngkatan !== 'All' ? 36 : 31,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica', textColor: [30, 30, 30], lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], halign: 'center', valign: 'middle', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      rowPageBreak: 'avoid',
      margin: { top: 10, bottom: 10, left: 20, right: 10 },
      columnStyles: showAngkatanCol ? {
        0: { cellWidth: 22 },
        1: { cellWidth: 15 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 12 },
        6: { cellWidth: 45 },
        7: { cellWidth: 25 }
      } : {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 15 },
        5: { cellWidth: 55 },
        6: { cellWidth: 35 }
      }
    });

    doc.save(`Jadwal_Latsar_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportInstructorToPDF = async (instructor: Instructor) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF('portrait');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`RINCIAN KEGIATAN KINERJA TAHUNAN`, 14, 15);
    
    doc.setFontSize(11);
    doc.text(`Nama Instruktur: ${instructor.name}`, 14, 25);
    doc.setFont('helvetica', 'normal');
    doc.text(`Peran: ${instructor.role || 'Facilitator'}`, 14, 31);
    doc.text(`Tahun: ${new Date().getFullYear()}`, 14, 37);

    const head = [
      ['Tanggal', 'Pelatihan / Angkatan', 'Waktu', 'Mata Pelatihan', 'JP', 'Tipe']
    ];
    
    const body: any[] = [];
    
    const currentYear = new Date().getFullYear();
    const instructorSchedules = schedules
      .filter(s => s.instructors.includes(instructor.name) && s.type !== 'Istirahat' && parseISO(s.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());

    let totalJp = 0;
    
    const getShortTrainingName = (fullName: string) => {
      if (!fullName) return 'Latsar CPNS';
      if (fullName.includes('Latsar')) return 'Latsar CPNS';
      if (fullName.includes('PKP')) return 'PKP';
      if (fullName.includes('PKA')) return 'PKA';
      if (fullName.includes('PKN')) return 'PKN';
      return fullName;
    };
    
    instructorSchedules.forEach(s => {
      const trainingName = s.trainingName || 'Pelatihan Dasar CPNS (Latsar CPNS)';
      const shortTrainingName = getShortTrainingName(trainingName);
      
      body.push([
        format(parseISO(s.date), 'dd MMM yyyy', { locale: localeId }),
        `${shortTrainingName} / ${s.angkatan}`,
        `${s.startTime} - ${s.endTime}`,
        s.subject,
        s.jp,
        s.type
      ]);
      totalJp += Number(s.jp) || 0;
    });

    body.push([{ content: 'TOTAL JAM PELAJARAN (JP)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalJp.toString(), styles: { fontStyle: 'bold', halign: 'center' } }, '']);

    autoTable(doc, {
      startY: 45,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, font: 'helvetica', textColor: [30, 30, 30], lineColor: [200, 200, 200], lineWidth: 0.1 },
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], halign: 'center', valign: 'middle', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      rowPageBreak: 'avoid',
      margin: { top: 20, bottom: 40, left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 15 },
        5: { cellWidth: 20 }
      }
    });

    doc.save(`Portofolio_Kinerja_${instructor.name.replace(/\s+/g, '_')}_${currentYear}.pdf`);
  };

  // Redirect based on login state and permissions
  useEffect(() => {
    if (user && activeView === 'login') {
      setActiveView('dashboard');
    } else if (!isAdmin && (activeView === 'instructor-calendar' || activeView === 'users')) {
      setActiveView('schedule');
    }
  }, [user, isAdmin, activeView]);

// Render application immediately, don't wait for auth to finish loading
  if (!loading && !user && activeView === 'login') {
    return <Auth onCancel={() => setActiveView('schedule')} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-slate-900 flex text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col sticky top-0 h-screen z-10 px-4 py-4 gap-2 transition-colors duration-200">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
          <img src="/favicon.png" alt="SIPP Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight leading-none font-serif">MANAJEMEN</h2>
            <h2 className="text-lg font-bold tracking-tight leading-none font-serif text-indigo-600">JADWAL PELATIHAN</h2>
          </div>
        </div>
        
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800 transition-colors duration-200">
          <label className="block text-[10px] font-bold tracking-wide font-sans mb-2 opacity-90">Program Pelatihan</label>
          <select 
            value={activeTraining}
            onChange={(e) => setActiveTraining(e.target.value)}
            className="w-full p-2 text-xs font-bold border border-slate-200/20 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:border-slate-200 dark:border-slate-700 dark:focus:border-slate-500 transition-colors duration-200"
          >
            {trainingProgramTitles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <nav className="flex-1 mt-4">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')} 
          />
          <SidebarItem 
            icon={BookOpen} 
            label="Programs Info" 
            active={activeView === 'programs'} 
            onClick={() => setActiveView('programs')} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Schedule" 
            active={activeView === 'schedule'} 
            onClick={() => setActiveView('schedule')} 
          />
          <SidebarItem 
            icon={Users} 
            label="Instructors" 
            active={activeView === 'instructors'} 
            onClick={() => setActiveView('instructors')} 
          />
          {isAdmin && (
            <>
              <SidebarItem 
                icon={Calendar} 
                label="Instructor Calendar" 
                active={activeView === 'instructor-calendar'} 
                onClick={() => setActiveView('instructor-calendar')} 
              />
              <SidebarItem 
                icon={Shield} 
                label="User Management" 
                active={activeView === 'users'} 
                onClick={() => setActiveView('users')} 
              />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200/10 dark:border-slate-700">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 bg-indigo-600 text-white shadow-sm flex items-center justify-center font-bold text-xs">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  <p className="text-xs font-mono opacity-90 truncate uppercase">{userProfile?.role}</p>
                </div>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-2 px-2 py-2 text-xs tracking-wide font-sans font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </>
          ) : (
            <button 
              onClick={() => setActiveView('login')}
              className="w-full border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2 px-2 py-3 text-sm font-medium rounded-xl tracking-wide font-sans hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 transition-colors"
            >
              Login Admin
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-24 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-200">
          <div className="flex items-center gap-2 text-sm font-mono opacity-90 tracking-wide font-sans">
            <span className="dark:text-slate-400">System</span>
            <ChevronRight size={14} className="dark:text-slate-400" />
            <span className="text-slate-900 dark:text-slate-100 opacity-100 font-bold">{activeView}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-slate-600 dark:text-slate-300" />}
            </button>
            {isAdmin && activeView === 'schedule' && (
              <button 
                onClick={() => {
                  setPreviewAngkatan(selectedAngkatan);
                  setIsExportReviewModalOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
              >
                <FileSpreadsheet size={14} />
                Preview & Export
              </button>
            )}
            {isAdmin && activeView === 'schedule' && (
              <>
                <button 
                  onClick={() => {
                    setReminderResult(null);
                    setIsReminderModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                >
                  <Mail size={14} />
                  Send Reminders
                </button>
                <button 
                  onClick={() => setIsDuplicateModalOpen(true)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                >
                  <Copy size={14} />
                  Duplicate Batch
                </button>
                <button 
                  onClick={() => setIsDeleteBatchModalOpen(true)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 text-red-600 border border-red-600 shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Batch
                </button>
              </>
            )}
            
            {isAdmin && activeView === 'schedule' && (
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <Upload size={14} />
                Import PDF/Image
              </button>
            )}

            {isAdmin && (activeView === 'schedule' || activeView === 'instructors') && (
              <button 
                onClick={() => {
                  if (activeView === 'schedule') {
                    setEditingEntry(null);
                    setCurrentScheduleDate('');
                    setCurrentScheduleStartTime('');
                    setCurrentScheduleEndTime('');
                    setCurrentScheduleType('Synchronous');
                    setCurrentJp('');
                    setCurrentSubject('');
                    setSelectedInstructorNames([]);
                    setIsModalOpen(true);
                  } else if (activeView === 'instructors') {
                    openInstructorModal();
                  }
                }}
                className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-4 py-2 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
              >
                <Plus size={14} />
                Add New
              </button>
            )}
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 overflow-auto">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-6 shadow-md rounded-2xl border-slate-200 dark:border-slate-700">
                  <p className="text-xs tracking-wide font-sans font-medium opacity-90 mb-1">Total Sessions</p>
                  <p className="text-4xl font-bold tracking-tighter">{schedules.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-6 shadow-md rounded-2xl border-slate-200 dark:border-slate-700">
                  <p className="text-xs tracking-wide font-sans font-medium opacity-90 mb-1">Total Instructors</p>
                  <p className="text-4xl font-bold tracking-tighter">{instructors.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-6 shadow-md rounded-2xl border-slate-200 dark:border-slate-700">
                  <p className="text-xs tracking-wide font-sans font-medium opacity-90 mb-1">Total JP</p>
                  <p className="text-4xl font-bold tracking-tighter">
                    {schedules.reduce((acc, curr) => acc + curr.jp, 0)}
                  </p>
                </div>

                <div className="md:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-8 mt-4">
                  <h3 className="text-lg font-bold uppercase tracking-tight mb-6 border-b border-slate-200/10 pb-4">Upcoming Sessions</h3>
                  <div className="space-y-4">
                    {schedules.filter(s => parseISO(s.date) >= new Date() && s.type !== 'Istirahat').slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 border border-slate-200/5 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-6">
                          <div className="text-center min-w-[60px]">
                            <p className="text-xs font-mono opacity-90 uppercase">{format(parseISO(s.date), 'MMM')}</p>
                            <p className="text-2xl font-bold leading-none">{format(parseISO(s.date), 'dd')}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm">{s.subject}</p>
                              {s.hasConflict && <AlertTriangle size={12} className="text-amber-500 animate-pulse" />}
                            </div>
                            <p className="text-xs font-mono opacity-90 uppercase mt-1">
                              {s.angkatan} • {s.startTime} - {s.endTime} • {s.instructors.join(', ')}
                            </p>
                          </div>
                        </div>
                        <Badge variant={s.type === 'Synchronous' ? 'success' : s.type === 'Asynchronous' ? 'info' : 'default'}>{s.type}</Badge>
                      </div>
                    ))}
                    {schedules.length === 0 && (
                      <p className="text-center py-12 text-sm font-mono opacity-90 tracking-wide font-sans italic">
                        // No upcoming sessions found
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'programs' && (
              <motion.div 
                key="programs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-3xl font-serif tracking-tight mb-2">Training Programs</h2>
                    <p className="text-slate-500 dark:text-slate-300 font-mono text-xs max-w-2xl bg-white/50 dark:bg-slate-800/50 inline-block px-2">
                      // INFORMATION AND DETAILS ABOUT AVAILABLE PROGRAMS //
                    </p>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setEditingProgram(null);
                        setProgramTitle('');
                        setProgramDescription('');
                        setProgramObjective('');
                        setProgramTargetAudience('');
                        setProgramType('Lainnya');
                        setIsProgramModalOpen(true);
                      }}
                      className="bg-[#0F172A] text-white px-5 py-2.5 rounded hover:bg-slate-800 transition-colors flex items-center font-bold text-xs"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Program
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full">
                  {currentProgramsList.map((program) => (
                    <div key={program.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow relative group/program">
                      {isAdmin && (
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 opacity-0 group-hover/program:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm p-1 rounded-lg">
                          <button 
                            onClick={() => {
                              setEditingProgram(program);
                              setProgramTitle(program.title);
                              setProgramDescription(program.description);
                              setProgramObjective(program.objective);
                              setProgramTargetAudience(program.targetAudience);
                              setProgramType(program.type || 'Lainnya');
                              setIsProgramModalOpen(true);
                            }}
                            className="p-2 bg-white/90 text-slate-800 dark:text-slate-200 rounded hover:bg-white dark:bg-slate-800 transition-colors shadow-sm"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if (program.id) {
                                setDeleteConfirm({ type: 'program', id: program.id, label: program.title });
                              }
                            }}
                            className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <div className="bg-slate-900 text-white shadow-sm p-6 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5">
                          <BookOpen size={120} />
                        </div>
                        <h3 className="text-xl font-serif font-bold relative z-10 pr-12">{program.title}</h3>
                        {program.type && (
                          <Badge variant="info" className="relative z-10 mt-2 bg-white/20 text-white border-white/20">
                            {program.type}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col gap-6">
                        <div>
                          <h4 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText size={14} /> Description
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{program.description}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Shield size={14} /> Objective
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{program.objective}</p>
                        </div>

                        <div className="mt-auto">
                          <h4 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Users size={14} /> Target Audience
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{program.targetAudience}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeView === 'schedule' && (
              <motion.div 
                key="schedule"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search by subject or instructor..."
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="w-48 relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm appearance-none focus:outline-none"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="All">All Types</option>
                      <option value="Synchronous">Synchronous</option>
                      <option value="Asynchronous">Asynchronous</option>
                      <option value="Ceramah">Ceramah</option>
                      <option value="Dinamika Kelompok">Dinamika Kelompok</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="w-64 relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <select 
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm appearance-none focus:outline-none"
                      value={selectedAngkatan}
                      onChange={(e) => setSelectedAngkatan(e.target.value)}
                    >
                      <option value="All">Semua Angkatan / Batch</option>
                      {allAngkatan.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden shadow-sm rounded-2xl border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-600 text-white shadow-sm font-mono text-xs tracking-wide font-sans">
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Day</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Angkatan</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Date</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Time</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Subject</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10 text-center">JP</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Instructors</th>
                        <th className="p-4 font-bold border-r border-[#F8FAFC]/10">Type</th>
                        {isAdmin && <th className="p-4 font-bold text-center">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {groupedSchedules.map((group) => (
                        <React.Fragment key={group.key}>
                          {group.entries.map((s, index) => (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-colors group/row">
                              {index === 0 && (
                                <>
                                  <td rowSpan={group.entries.length} className="p-4 text-sm font-mono font-bold border-r border-b border-slate-200/10 align-top bg-white dark:bg-slate-800">
                                    {s.dayNumber}
                                  </td>
                                  <td rowSpan={group.entries.length} className="p-4 text-xs font-mono border-r border-b border-slate-200/10 align-top bg-white dark:bg-slate-800 uppercase tracking-tighter opacity-90">
                                    {s.angkatan}
                                  </td>
                                  <td rowSpan={group.entries.length} className="p-4 text-sm border-r border-b border-slate-200/10 whitespace-nowrap align-top bg-white dark:bg-slate-800">
                                    {format(parseISO(s.date), 'EEEE, dd MMM yyyy', { locale: localeId })}
                                  </td>
                                </>
                              )}
                              <td className="p-4 text-sm border-r border-slate-200/10 whitespace-nowrap font-mono">
                                {s.startTime} - {s.endTime}
                              </td>
                              <td className="p-4 text-sm font-bold border-r border-slate-200/10">
                                <div className="flex items-center gap-2">
                                  {s.subject}
                                  {s.hasConflict && (
                                    <div className="group relative">
                                      <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-indigo-600 text-white shadow-sm text-[8px] tracking-wide font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        Instructor Conflict Detected
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-sm text-center border-r border-slate-200/10 font-mono">{s.jp}</td>
                              <td className="p-4 text-xs border-r border-slate-200/10">
                                <div className="flex flex-col gap-1">
                                  {s.instructors.map((i, idx) => {
                                    const isExternal = !instructors.some(inst => inst.name === i);
                                    const prefix = s.instructors.length > 1 ? "- " : "";
                                    return (
                                      <span key={idx} className={cn(
                                        "flex items-center gap-1",
                                        isExternal ? "text-amber-700 font-medium" : ""
                                      )}>
                                        {prefix}{i}
                                        {isExternal && <span className="text-[8px] opacity-90 font-bold bg-amber-100 px-1 rounded border border-amber-200">EXT</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="p-4 border-r border-slate-200/10">
                                <Badge variant={s.type === 'Synchronous' ? 'success' : s.type === 'Asynchronous' ? 'info' : 'default'}>
                                  {s.type}
                                </Badge>
                              </td>
                              {isAdmin && (
                                <td className="p-4">
                                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => {
                                        setEditingEntry(s);
                                        setCurrentScheduleDate(s.date);
                                        setCurrentScheduleStartTime(s.startTime);
                                        setCurrentScheduleEndTime(s.endTime);
                                        setCurrentScheduleType(s.type);
                                        setCurrentJp(s.jp);
                                        setCurrentSubject(s.subject);
                                        setSelectedInstructorNames(s.instructors);
                                        setIsModalOpen(true);
                                      }}
                                      className="p-2 hover:bg-slate-900 hover:text-white transition-all"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirm({ type: 'schedule', id: s.id!, label: s.subject })}
                                      className="p-2 hover:bg-red-600 hover:text-white transition-all"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {groupedSchedules.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-sm font-mono opacity-90 tracking-wide font-sans italic">
                            // No records found matching your criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeView === 'instructors' && (
              <motion.div 
                key="instructors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {allInstructors.map((inst) => (
                  <motion.div 
                    key={inst.id} 
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-md rounded-2xl group relative cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 hover:shadow-lg transition-colors"
                    onClick={() => setViewingInstructor(inst)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white shadow-sm flex items-center justify-center text-xl font-bold">
                        {inst.name.charAt(0)}
                      </div>
                      <div className="flex items-center gap-2">
                        {inst.isExternal && <Badge variant="warning">Luar</Badge>}
                        {isAdmin && (
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!inst.isExternal && (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAvailabilityModal(inst);
                                  }}
                                  title="Manage Availability"
                                  className="p-1.5 hover:bg-indigo-600 hover:text-white transition-all rounded"
                                >
                                  <Clock size={12} />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openInstructorModal(inst);
                                  }}
                                  title="Edit Instructor"
                                  className="p-1.5 hover:bg-slate-900 hover:text-white transition-all rounded"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ type: 'instructor', id: inst.id!, label: inst.name });
                              }}
                              className="p-1.5 hover:bg-red-600 hover:text-white transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{inst.name}</h3>
                    <p className="text-xs font-mono opacity-90 uppercase tracking-wider mt-1">{inst.role || 'Facilitator'}</p>
                    
                    {instructorJpStats[inst.name] && instructorJpStats[inst.name].totalJp > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200/10">
                        <p className="text-[10px] font-bold tracking-wide font-sans mb-2">Jam Pelajaran (JP)</p>
                        <div className="space-y-3">
                          {Object.entries(instructorJpStats[inst.name].trainingJp).map(([training, angkatans]) => (
                            <div key={training}>
                              <p className="text-[9px] font-bold tracking-wide font-sans opacity-90 mb-1">{training}</p>
                              {Object.entries(angkatans).map(([angkatan, jp]) => (
                                <div key={angkatan} className="flex justify-between items-center text-xs font-mono ml-2">
                                  <span>{angkatan}</span>
                                  <span className="font-bold">{jp} JP <span className="opacity-90 font-normal">({(Number(jp) * 45) / 60} Jam)</span></span>
                                </div>
                              ))}
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-xs font-mono font-bold pt-1 border-t border-slate-200/10 mt-1">
                            <span>TOTAL</span>
                            <span>{instructorJpStats[inst.name].totalJp} JP</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {instructorConflictsMap[inst.name] && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertTriangle size={14} className="animate-pulse" />
                          <span className="text-[10px] font-bold tracking-wide font-sans">Jadwal Bentrok!</span>
                        </div>
                        <div className="space-y-2">
                          {instructorConflictsMap[inst.name].slice(0, 3).map((c, idx) => (
                            <div key={idx} className="text-[9px] leading-tight text-red-800 border-l-2 border-red-300 pl-2">
                              <span className="font-bold">{c.s1.angkatan}</span>: {c.s1.subject} ({c.s1.startTime}) <br/>
                              <span className="font-bold text-red-400">vs</span> <br/>
                              <span className="font-bold">{c.s2.angkatan}</span>: {c.s2.subject} ({c.s2.startTime}) <br/>
                              <span className="opacity-90">{format(parseISO(c.s1.date), 'dd MMM yyyy')}</span>
                            </div>
                          ))}
                          {instructorConflictsMap[inst.name].length > 3 && (
                            <p className="text-[8px] italic opacity-90">+{instructorConflictsMap[inst.name].length - 3} konflik lainnya...</p>
                          )}
                        </div>
                      </div>
                    )}

                    {inst.email && (
                      <p className="text-xs mt-4 text-slate-500 dark:text-slate-400 border-t border-slate-200/5 pt-4 flex items-center gap-2">
                        <Mail size={12} /> {inst.email}
                      </p>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-slate-200/10">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          exportInstructorToPDF(inst);
                        }}
                        className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 py-2 text-xs font-bold tracking-wide font-sans hover:bg-slate-900 hover:text-white transition-colors"
                      >
                        <FileText size={14} />
                        Download Portfolio {new Date().getFullYear()}
                      </button>
                    </div>
                  </motion.div>
                ))}
                {allInstructors.length === 0 && (
                  <div className="col-span-full py-24 text-center">
                    <p className="text-sm font-mono opacity-90 tracking-wide font-sans italic">// No instructors registered</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeView === 'instructor-calendar' && isAdmin && (
              <motion.div 
                key="instructor-calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Calendar Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-6 shadow-md rounded-2xl border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-48 relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                      <select 
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm appearance-none focus:outline-none"
                        value={selectedInstructorForCalendar?.id || ''}
                        onChange={(e) => {
                          const inst = allInstructors.find(i => i.id === e.target.value);
                          setSelectedInstructorForCalendar(inst || null);
                        }}
                      >
                        <option value="">Pilih Pengajar...</option>
                        {allInstructors.map(i => (
                          <option key={i.id} value={i.id}>{i.name} {i.isExternal ? '(Luar)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    {selectedInstructorForCalendar && (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 text-white shadow-sm flex items-center justify-center text-sm font-bold">
                          {selectedInstructorForCalendar.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-none">{selectedInstructorForCalendar.name}</p>
                          <p className="text-xs font-mono opacity-90 uppercase mt-1">{selectedInstructorForCalendar.role}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setCurrentCalendarMonth(subMonths(currentCalendarMonth, 1))}
                      className="p-2 hover:bg-slate-900 hover:text-white transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <h2 className="text-lg font-bold tracking-wide font-sans min-w-[200px] text-center">
                      {format(currentCalendarMonth, 'MMMM yyyy', { locale: localeId })}
                    </h2>
                    <button 
                      onClick={() => setCurrentCalendarMonth(addMonths(currentCalendarMonth, 1))}
                      className="p-2 hover:bg-slate-900 hover:text-white transition-all border border-slate-200 dark:border-slate-700"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button 
                      onClick={() => setCurrentCalendarMonth(new Date())}
                      className="px-4 py-2 text-[10px] font-bold tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-900 hover:text-white transition-all"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  shadow-md rounded-2xl border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="grid grid-cols-7 bg-indigo-600 text-white shadow-sm text-xs tracking-wide font-sans font-medium">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-3 text-center border-r border-[#F8FAFC]/10 last:border-r-0">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                    {(() => {
                      const monthStart = startOfMonth(currentCalendarMonth);
                      const monthEnd = endOfMonth(monthStart);
                      const startDate = startOfWeek(monthStart);
                      const endDate = endOfWeek(monthEnd);
                      const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                      return calendarDays.map(day => {
                        const daySchedules = selectedInstructorForCalendar 
                          ? schedules.filter(s => s.instructors.includes(selectedInstructorForCalendar.name) && isSameDay(parseISO(s.date), day))
                          : [];
                        
                        const isAvailable = selectedInstructorForCalendar?.availability?.some(slot => {
                          return slot.day === getDay(day);
                        });

                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isTodayDate = isToday(day);

                        return (
                          <div 
                            key={day.toString()} 
                            className={cn(
                              "min-h-[120px] p-2 transition-colors",
                              !isCurrentMonth ? "bg-slate-900/[0.02] opacity-30" : "bg-white dark:bg-slate-800",
                              isTodayDate && "ring-2 ring-inset ring-slate-300"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={cn(
                                "text-xs font-mono font-bold",
                                isTodayDate ? "bg-indigo-600 text-white shadow-sm px-1.5 py-0.5" : "opacity-90"
                              )}>
                                {format(day, 'd')}
                              </span>
                              {isCurrentMonth && isAvailable && (
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Available Day" />
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              {daySchedules.map(s => {
                                const hasConflict = instructorConflictsMap[selectedInstructorForCalendar!.name]?.some(c => c.s1.id === s.id || c.s2.id === s.id);
                                const isOutsideAvailability = selectedInstructorForCalendar ? isInstructorAvailable(selectedInstructorForCalendar, s.date, s.startTime, s.endTime) === false : false;
                                return (
                                  <div 
                                    key={s.id} 
                                    onClick={() => {
                                      setEditingEntry(s);
                                      setCurrentScheduleDate(s.date);
                                      setCurrentScheduleStartTime(s.startTime);
                                      setCurrentScheduleEndTime(s.endTime);
                                      setCurrentScheduleType(s.type);
                                      setCurrentJp(s.jp);
                                      setCurrentSubject(s.subject);
                                      setSelectedInstructorNames(s.instructors);
                                      setIsModalOpen(true);
                                    }}
                                    className={cn(
                                      "p-1.5 text-[9px] leading-tight border rounded-sm cursor-pointer hover:border-slate-200/40 hover:shadow-sm transition-all",
                                      (hasConflict || isOutsideAvailability) ? "bg-red-50 text-red-800 border-red-300" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200/10"
                                    )}
                                    title={isOutsideAvailability ? "Di luar jam kerja" : hasConflict ? "Bentrok jadwal" : ""}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold truncate">{s.subject}</span>
                                      {(hasConflict || isOutsideAvailability) && <AlertTriangle size={8} className="text-red-600 animate-pulse shrink-0" />}
                                    </div>
                                    <div className="opacity-90 flex justify-between mt-0.5">
                                      <span>{s.startTime}</span>
                                      <span>{s.angkatan}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-6 text-xs tracking-wide font-sans font-medium opacity-90 bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Available Day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/10" />
                    <span>Assigned Session</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-50 border border-red-200" />
                    <span className="text-red-600 font-bold">Conflict Detected</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === 'users' && isAdmin && (
              <motion.div 
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-6 shadow-md rounded-2xl border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold tracking-tight uppercase">User Management</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-indigo-600 text-white shadow-sm">
                          <th className="p-4 text-left text-[10px] font-bold tracking-wide font-sans">Name</th>
                          <th className="p-4 text-left text-[10px] font-bold tracking-wide font-sans">Email</th>
                          <th className="p-4 text-left text-[10px] font-bold tracking-wide font-sans">Role</th>
                          <th className="p-4 text-left text-[10px] font-bold tracking-wide font-sans">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((u) => (
                          <tr key={u.uid} className="border-b border-slate-200/10 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-sm font-bold">{u.displayName || 'Unknown'}</td>
                            <td className="p-4 text-sm font-mono opacity-90">{u.email}</td>
                            <td className="p-4">
                              <span className={cn(
                                "text-[10px] font-bold tracking-wide font-sans px-2 py-1",
                                u.role === 'admin' ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                              )}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.uid, e.target.value as 'admin' | 'user')}
                                  disabled={u.uid === user?.uid} // Prevent self-demotion
                                  className="p-2 text-xs font-mono tracking-wide font-sans border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none disabled:opacity-50"
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button 
                                  onClick={() => setDeleteConfirm({ type: 'user', id: u.uid, label: u.displayName || u.email || 'Unknown User' })}
                                  disabled={u.uid === user?.uid} // Prevent self-deletion
                                  className="p-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {usersList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center font-mono opacity-90 italic">
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setInstructorSearch('');
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between">
                <h3 className="font-bold tracking-wide font-sans text-sm">
                  {editingEntry ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}
                </h3>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setScheduleFormError(null);
                  setInstructorSearch('');
                }} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveSchedule} className="p-8 grid grid-cols-2 gap-6">
                {scheduleFormError && (
                  <div className="col-span-2 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-2" role="alert">
                    <p className="font-bold text-sm tracking-wide font-sans">Validation Error</p>
                    <p className="text-sm">{scheduleFormError}</p>
                  </div>
                )}

                {instructorConflicts.length > 0 && (
                  <div className="col-span-2 bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 mb-2" role="alert">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <p className="font-bold text-sm tracking-wide font-sans">Conflict Warning</p>
                    </div>
                    <ul className="text-xs space-y-1 list-disc list-inside opacity-80">
                      {instructorConflicts.map((c, i) => (
                        <li key={i}>
                          <span className="font-bold">{c.instructor}</span> is already assigned to <span className="italic">"{c.subject}"</span> ({c.angkatan} • {c.time})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="col-span-2 space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Angkatan / Batch</label>
                  <input 
                    name="angkatan" 
                    type="text" 
                    required 
                    placeholder="Contoh: Angkatan I, Batch 2024, dsb."
                    defaultValue={editingEntry?.angkatan || (selectedAngkatan !== 'All' ? selectedAngkatan : '')}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Day Number</label>
                  <input 
                    name="dayNumber" 
                    type="number" 
                    required 
                    defaultValue={editingEntry?.dayNumber}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Date</label>
                  <input 
                    name="date" 
                    type="date" 
                    required 
                    defaultValue={editingEntry?.date}
                    onChange={(e) => setCurrentScheduleDate(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Start Time</label>
                  <input 
                    name="startTime" 
                    type="time" 
                    required 
                    defaultValue={editingEntry?.startTime}
                    onChange={(e) => setCurrentScheduleStartTime(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">End Time</label>
                  <input 
                    name="endTime" 
                    type="time" 
                    required 
                    defaultValue={editingEntry?.endTime}
                    onChange={(e) => setCurrentScheduleEndTime(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Subject / Mata Pelatihan</label>
                  <input 
                    name="subject" 
                    type="text" 
                    required 
                    value={currentSubject}
                    onChange={(e) => setCurrentSubject(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">JP (Lesson Hours)</label>
                  <input 
                    name="jp" 
                    type="number" 
                    required 
                    value={currentJp}
                    onChange={(e) => setCurrentJp(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs tracking-wide font-sans font-medium opacity-90">Session Type</label>
                  <input 
                    name="type" 
                    list="session-types"
                    required 
                    value={currentScheduleType}
                    onChange={(e) => setCurrentScheduleType(e.target.value)}
                    placeholder="Pilih atau ketik tipe sesi..."
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                  />
                  <datalist id="session-types">
                    <option value="Synchronous" />
                    <option value="Asynchronous" />
                    <option value="Klasikal" />
                    <option value="Ceramah" />
                    <option value="Dinamika Kelompok" />
                    <option value="Istirahat" />
                  </datalist>
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Instructors / Pengajar</label>
                    <div className="relative w-48">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 opacity-30" size={12} />
                      <input 
                        type="text"
                        placeholder="Cari pengajar..."
                        value={instructorSearch}
                        onChange={(e) => setInstructorSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-[10px] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm min-h-[80px] max-h-[160px] overflow-y-auto">
                    {/* Selected Custom Instructors (not in DB) */}
                    {selectedInstructorNames
                      .filter(name => !instructors.some(inst => inst.name === name))
                      .map(name => (
                        <label key={`custom-${name}`} className="cursor-pointer group relative">
                          <input 
                            type="checkbox" 
                            name="instructors" 
                            value={name}
                            checked={true}
                            onChange={() => {
                              setSelectedInstructorNames(selectedInstructorNames.filter(n => n !== name));
                            }}
                            className="peer sr-only"
                          />
                          <div className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700">
                            {name}
                            <span className="text-[8px] opacity-90 tracking-wide font-sans">(Luar)</span>
                          </div>
                        </label>
                      ))}

                    {instructors
                      .filter(inst => inst.name.toLowerCase().includes(deferredInstructorSearch.toLowerCase()))
                      .map(inst => {
                        const availability = isInstructorAvailable(inst, currentScheduleDate, currentScheduleStartTime, currentScheduleEndTime);
                        return (
                          <label key={inst.id} className="cursor-pointer group relative">
                            <input 
                              type="checkbox" 
                              name="instructors" 
                              value={inst.name}
                              checked={selectedInstructorNames.includes(inst.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInstructorNames([...selectedInstructorNames, inst.name]);
                                } else {
                                  setSelectedInstructorNames(selectedInstructorNames.filter(name => name !== inst.name));
                                }
                              }}
                              className="peer sr-only"
                            />
                            <div className={`px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2
                              ${availability === true ? 'ring-2 ring-green-500 ring-offset-1' : ''}
                              ${availability === false ? 'opacity-90 grayscale' : ''}
                              bg-slate-50 dark:bg-slate-800/50 peer-checked:bg-slate-900 peer-checked:text-white hover:bg-slate-100 peer-checked:hover:bg-indigo-700`}>
                              {inst.name}
                              {availability === true && (
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Available" />
                              )}
                              {availability === false && (
                                <span className="w-2 h-2 bg-red-500 rounded-full" title="Not Available" />
                              )}
                            </div>
                            {/* Tooltip for availability */}
                            {availability !== null && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-indigo-600 text-white shadow-sm text-[8px] tracking-wide font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {availability ? 'Recommended / Tersedia' : 'Outside Availability / Tidak Tersedia'}
                              </div>
                            )}
                          </label>
                        );
                      })}
                    {instructors.length > 0 && instructors.filter(inst => inst.name.toLowerCase().includes(deferredInstructorSearch.toLowerCase())).length === 0 && (
                      <span className="text-xs opacity-90 italic">Tidak ada pengajar yang cocok dengan pencarian.</span>
                    )}
                    {instructors.length === 0 && (
                      <span className="text-xs opacity-90 italic">No instructors available. Please add them in the Instructors tab.</span>
                    )}
                  </div>
                  
                  {/* Add Custom Instructor Input */}
                  <div className="flex gap-2 mt-2">
                    <input 
                      type="text"
                      placeholder="Tambah narasumber luar..."
                      value={customInstructorName}
                      onChange={(e) => setCustomInstructorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customInstructorName.trim() && !selectedInstructorNames.includes(customInstructorName.trim())) {
                            setSelectedInstructorNames([...selectedInstructorNames, customInstructorName.trim()]);
                            setCustomInstructorName('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customInstructorName.trim() && !selectedInstructorNames.includes(customInstructorName.trim())) {
                          setSelectedInstructorNames([...selectedInstructorNames, customInstructorName.trim()]);
                          setCustomInstructorName('');
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white shadow-sm text-[10px] font-bold tracking-wide font-sans hover:bg-indigo-700 transition-all"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
                
                <div className="col-span-2 pt-4 flex justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingEntry(null);
                      setScheduleFormError(null);
                      setInstructorSearch('');
                      setCustomInstructorName('');
                      setCurrentScheduleType('Synchronous');
                      setCurrentJp('');
                      setCurrentSubject('');
                    }}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    value="continue"
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Simpan & Lanjut Isi
                  </button>
                  <button 
                    type="submit"
                    value="save"
                    className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
                  >
                    <Save size={14} />
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Program Modal */}
      <AnimatePresence>
        {isProgramModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProgramModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 border text-left border-slate-200 dark:border-slate-700 shadow-2xl relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col font-sans"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100">
                    {editingProgram ? 'Edit Program' : 'Add New Program'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 uppercase tracking-wider">
                    {editingProgram ? 'Update program details' : 'Create a new training program entry'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsProgramModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProgram} className="flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto space-y-6">
                  {programFormError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      {programFormError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2 uppercase">Program Title</label>
                      <input 
                        type="text" 
                        required
                        value={programTitle}
                        onChange={(e) => setProgramTitle(e.target.value)}
                        placeholder="e.g. Pelatihan Teknis Perkantoran"
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      />
                    </div>

                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2 uppercase">Program Type</label>
                      <select 
                        required
                        value={programType}
                        onChange={(e) => setProgramType(e.target.value as any)}
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                      >
                        <option value="Struktural">Struktural</option>
                        <option value="Teknis">Teknis</option>
                        <option value="Fungsional">Fungsional</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2 uppercase">Description</label>
                      <textarea 
                        required
                        rows={3}
                        value={programDescription}
                        onChange={(e) => setProgramDescription(e.target.value)}
                        placeholder="Description of the program..."
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2 uppercase">Objective</label>
                      <textarea 
                        required
                        rows={2}
                        value={programObjective}
                        onChange={(e) => setProgramObjective(e.target.value)}
                        placeholder="Main objective of the program..."
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    
                    <div className="col-span-full">
                      <label className="block text-xs font-bold text-slate-700 tracking-wide mb-2 uppercase">Target Audience</label>
                      <input 
                        type="text" 
                        required
                        value={programTargetAudience}
                        onChange={(e) => setProgramTargetAudience(e.target.value)}
                        placeholder="e.g. All employees, PNS, CPNS..."
                        className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 mt-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsProgramModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-sm font-bold bg-[#0F172A] text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                  >
                    <Save size={16} />
                    {editingProgram ? 'Save Changes' : 'Create Program'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instructor Modal */}
      <AnimatePresence>
        {isInstructorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInstructorModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm">
                  {editingInstructor ? 'Edit Instructor' : 'New Instructor'}
                </h3>
                <button onClick={() => setIsInstructorModalOpen(false)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveInstructor} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Full Name</label>
                    <input 
                      name="name" 
                      type="text" 
                      required 
                      defaultValue={editingInstructor?.name}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Role / Title</label>
                    <input 
                      name="role" 
                      type="text" 
                      defaultValue={editingInstructor?.role}
                      placeholder="e.g. Senior Facilitator"
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Email Address</label>
                    <input 
                      name="email" 
                      type="email" 
                      defaultValue={editingInstructor?.email}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                    />
                  </div>

                  {/* Availability Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-200/10">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold tracking-wide font-sans text-xs">Availability / Ketersediaan</h4>
                      <button 
                        type="button"
                        onClick={() => setInstructorAvailability([...instructorAvailability, { day: 1, startTime: '08:00', endTime: '16:00' }])}
                        className="flex items-center gap-1 text-[10px] font-bold tracking-wide font-sans hover:text-blue-600 transition-colors"
                      >
                        <Plus size={12} /> Add Slot
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                      {instructorAvailability.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 border border-slate-200/10">
                          <select 
                            value={slot.day}
                            onChange={(e) => {
                              const newAvail = [...instructorAvailability];
                              newAvail[idx].day = parseInt(e.target.value);
                              setInstructorAvailability(newAvail);
                            }}
                            className="p-1 text-[10px] border border-slate-200/20 focus:outline-none bg-transparent"
                          >
                            <option value={1}>Monday</option>
                            <option value={2}>Tuesday</option>
                            <option value={3}>Wednesday</option>
                            <option value={4}>Thursday</option>
                            <option value={5}>Friday</option>
                            <option value={6}>Saturday</option>
                            <option value={0}>Sunday</option>
                          </select>
                          <input 
                            type="time" 
                            value={slot.startTime}
                            onChange={(e) => {
                              const newAvail = [...instructorAvailability];
                              newAvail[idx].startTime = e.target.value;
                              setInstructorAvailability(newAvail);
                            }}
                            className="p-1 text-[10px] border border-slate-200/20 focus:outline-none"
                          />
                          <span className="text-[10px] opacity-90">to</span>
                          <input 
                            type="time" 
                            value={slot.endTime}
                            onChange={(e) => {
                              const newAvail = [...instructorAvailability];
                              newAvail[idx].endTime = e.target.value;
                              setInstructorAvailability(newAvail);
                            }}
                            className="p-1 text-[10px] border border-slate-200/20 focus:outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => setInstructorAvailability(instructorAvailability.filter((_, i) => i !== idx))}
                            className="ml-auto p-1 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {instructorAvailability.length === 0 && (
                        <p className="text-xs font-mono opacity-90 italic py-2 text-center border border-dashed border-slate-200/20">
                          No availability slots defined.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsInstructorModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
                  >
                    <Save size={14} />
                    Save Instructor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Availability Modal */}
      <AnimatePresence>
        {isAvailabilityModalOpen && availabilityInstructor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvailabilityModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm flex items-center gap-2">
                  <Clock size={16} />
                  Manage Availability: {availabilityInstructor.name}
                </h3>
                <button onClick={() => setIsAvailabilityModalOpen(false)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveAvailability} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Set times when the instructor is available to teach. Any time outside these slots will throw a conflict warning.</p>
                    <button 
                      type="button"
                      onClick={() => setEditingAvailability([...editingAvailability, { day: 1, startTime: '08:00', endTime: '16:00' }])}
                      className="flex items-center gap-1 text-xs font-bold tracking-wide font-sans bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors shrink-0"
                    >
                      <Plus size={14} /> Add Slot
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {editingAvailability.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <select 
                          value={slot.day}
                          onChange={(e) => {
                            const newAvail = [...editingAvailability];
                            newAvail[idx].day = parseInt(e.target.value);
                            setEditingAvailability(newAvail);
                          }}
                          className="flex-1 p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
                        >
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                          <option value={0}>Sunday</option>
                        </select>
                        <input 
                          type="time" 
                          value={slot.startTime}
                          onChange={(e) => {
                            const newAvail = [...editingAvailability];
                            newAvail[idx].startTime = e.target.value;
                            setEditingAvailability(newAvail);
                          }}
                          className="w-28 p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                        />
                        <span className="text-xs text-slate-400 font-medium">to</span>
                        <input 
                          type="time" 
                          value={slot.endTime}
                          onChange={(e) => {
                            const newAvail = [...editingAvailability];
                            newAvail[idx].endTime = e.target.value;
                            setEditingAvailability(newAvail);
                          }}
                          className="w-28 p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                        />
                        <button 
                          type="button"
                          title="Remove slot"
                          onClick={() => setEditingAvailability(editingAvailability.filter((_, i) => i !== idx))}
                          className="p-2 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {editingAvailability.length === 0 && (
                      <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 rounded-2xl">
                        <Clock size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No availability slots defined</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Instructor has no defined teaching hours.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsAvailabilityModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
                  >
                    <Save size={14} />
                    Save Availability
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Batch Modal */}
      <AnimatePresence>
        {isDuplicateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDuplicateModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm flex items-center gap-2">
                  <Copy size={16} />
                  Duplicate Batch
                </h3>
                <button onClick={() => setIsDuplicateModalOpen(false)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleDuplicateBatch} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Source Angkatan / Batch</label>
                    <select 
                      value={duplicateSourceAngkatan}
                      onChange={(e) => setDuplicateSourceAngkatan(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                      required
                    >
                      <option value="" disabled>Pilih Angkatan Sumber...</option>
                      {allAngkatan.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Target Angkatan / Batch</label>
                    <input 
                      type="text" 
                      value={duplicateTargetAngkatan}
                      onChange={(e) => setDuplicateTargetAngkatan(e.target.value)}
                      placeholder="Contoh: Angkatan II"
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Date Offset (Days)</label>
                    <input 
                      type="number" 
                      value={duplicateDateOffset}
                      onChange={(e) => setDuplicateDateOffset(Number(e.target.value))}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                      required
                    />
                    <p className="text-xs font-mono opacity-90">
                      Jumlah hari untuk menggeser jadwal. Misalnya, isi 7 untuk memajukan jadwal 1 minggu dari jadwal sumber. Isi 0 jika tanggalnya sama persis.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsDuplicateModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Schedule Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 border text-left border-slate-200 dark:border-slate-700 shadow-2xl relative z-10 w-full max-w-md max-h-[90vh] flex flex-col font-sans"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Upload size={20} />
                    Import PDF/Image
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 uppercase tracking-wider">
                    Powered by AI Studio
                  </p>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  disabled={isImporting}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-200 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleImportSubmit} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  {importError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm font-medium flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      {importError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90 block">Select PDF or Image file</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90 block">Target Angkatan / Batch</label>
                    <input 
                      type="text" 
                      value={importTargetAngkatan}
                      onChange={(e) => setImportTargetAngkatan(e.target.value)}
                      placeholder="e.g. Angkatan XVII"
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                      required
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      // Existing items in this batch won't be overwritten.
                    </p>
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 mt-auto">
                  <button 
                    type="button" 
                    disabled={isImporting}
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isImporting || !importFile || !importTargetAngkatan}
                    className="px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 bg-[#0F172A] text-white hover:bg-slate-800 transition-colors disabled:opacity-50 min-w-[120px]"
                  >
                    {isImporting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#F8FAFC] border-t-transparent rounded-full animate-spin" />
                        Extracting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload size={16} /> Start Import
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Batch Modal */}
      <AnimatePresence>
        {isDeleteBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteBatchModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
            >
              <div className="bg-red-600 text-white p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm flex items-center gap-2">
                  <Trash2 size={16} />
                  Delete Batch
                </h3>
                <button onClick={() => setIsDeleteBatchModalOpen(false)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleDeleteBatchSubmit} className="flex flex-col overflow-hidden">
                <div className="p-8 space-y-6 overflow-y-auto">
                  <div className="space-y-2">
                    <label className="text-xs tracking-wide font-sans font-medium opacity-90">Pilih Angkatan / Batch yang akan dihapus</label>
                    <select 
                      value={deleteBatchTarget}
                      onChange={(e) => setDeleteBatchTarget(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm focus:outline-none"
                      required
                    >
                      <option value="" disabled>Pilih Angkatan...</option>
                      {allAngkatan.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <p className="text-xs font-mono text-red-600 mt-2 tracking-wide font-sans">
                      // PERINGATAN: Semua jadwal pada angkatan ini akan dihapus permanen.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteBatchModalOpen(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-red-700 transition-all"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reminder Modal */}
      <AnimatePresence>
        {isReminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => !isSendingReminders && setIsReminderModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl rounded-3xl border border-slate-100 p-10 max-w-md w-full bg-white dark:bg-slate-800 relative z-10"
            >
              <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                <h2 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                  <Mail size={24} />
                  Send Reminders
                </h2>
                <button 
                  onClick={() => setIsReminderModalOpen(false)}
                  disabled={isSendingReminders}
                  className="p-2 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wide font-sans mb-2 opacity-90">Time Window</label>
                  <select
                    value={reminderTiming}
                    onChange={(e) => setReminderTiming(Number(e.target.value))}
                    disabled={isSendingReminders}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value={12}>Next 12 Hours</option>
                    <option value={24}>Next 24 Hours</option>
                    <option value={48}>Next 48 Hours</option>
                    <option value={72}>Next 3 Days</option>
                    <option value={168}>Next 7 Days</option>
                  </select>
                  <p className="text-xs font-mono opacity-60 mt-1">
                    Send emails to instructors with sessions starting within this time window.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wide font-sans mb-2 opacity-90">Custom Message</label>
                  <textarea
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    disabled={isSendingReminders}
                    rows={4}
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                    placeholder="Enter a custom message for the instructors..."
                  />
                </div>

                {reminderResult && (
                  <div className={cn(
                    "p-4 border",
                    reminderResult.failed > 0 ? "bg-amber-50 border-amber-500 text-amber-800" : "bg-green-50 border-green-500 text-green-800"
                  )}>
                    <p className="text-xs font-bold tracking-wide font-sans mb-1">Result</p>
                    <p className="text-sm font-mono">
                      Successfully sent: {reminderResult.success}<br/>
                      Failed to send: {reminderResult.failed}
                    </p>
                    {reminderResult.failed > 0 && (
                      <p className="text-[10px] mt-2 opacity-80">Make sure instructors have valid email addresses and RESEND_API_KEY is configured.</p>
                    )}
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsReminderModalOpen(false)}
                    disabled={isSendingReminders}
                    className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button 
                    onClick={handleSendReminders}
                    disabled={isSendingReminders}
                    className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSendingReminders ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#F8FAFC] border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Review Modal */}
      <AnimatePresence>
        {isExportReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportReviewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm">
                  Review Document Schedule
                </h3>
                <button onClick={() => setIsExportReviewModalOpen(false)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-auto bg-white dark:bg-slate-800 m-4 border border-slate-200 dark:border-slate-700 shadow-inner">
                {/* Configuration Section (Admin Only) */}
                {isAdmin && (
                  <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/10 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wide font-sans mb-1">Penyelenggara</label>
                      <input 
                        type="text" 
                        value={organizer}
                        onChange={(e) => setOrganizer(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-200/20 focus:outline-none focus:border-slate-200 dark:border-slate-700 uppercase"
                        placeholder="Contoh: BPSDM Provinsi..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wide font-sans mb-1">Metode Pelatihan</label>
                      <select 
                        value={trainingMethod}
                        onChange={(e) => setTrainingMethod(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-200/20 focus:outline-none focus:border-slate-200 dark:border-slate-700"
                      >
                        <option value="Distance Learning">Distance Learning</option>
                        <option value="Blended Learning">Blended Learning</option>
                        <option value="Klasikal">Klasikal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold tracking-wide font-sans mb-1">Pilih Angkatan</label>
                      <select 
                        value={previewAngkatan}
                        onChange={(e) => setPreviewAngkatan(e.target.value)}
                        className="w-full p-2 text-sm border border-slate-200/20 focus:outline-none focus:border-slate-200 dark:border-slate-700 font-bold"
                      >
                        <option value="All">Semua Angkatan</option>
                        {allAngkatan.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="mb-6 text-center border-b border-slate-200/10 pb-6">
                  <h2 className="text-xl font-bold tracking-wide font-sans">JADWAL PENYELENGGARAAN {activeTraining.toUpperCase()}</h2>
                  <p className="text-sm font-bold mt-2 tracking-wide font-sans">Penyelenggara: {organizer || '-'}</p>
                  <p className="text-sm font-mono mt-1 tracking-wide font-sans">Metode: {trainingMethod}</p>
                  {previewAngkatan !== 'All' && (
                    <p className="text-sm font-bold mt-1 tracking-wide font-sans">Angkatan: {previewAngkatan}</p>
                  )}
                  <p className="text-sm font-mono mt-1">Tanggal Pelaksanaan: {previewDateRangeStr}</p>
                </div>
                
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-mono tracking-wide font-sans">
                      {previewAngkatan === 'All' && <th className="p-2 border border-slate-200/20">Angkatan</th>}
                      <th className="p-2 border border-slate-200/20 text-center">Hari</th>
                      <th className="p-2 border border-slate-200/20">Tanggal</th>
                      <th className="p-2 border border-slate-200/20">Waktu</th>
                      <th className="p-2 border border-slate-200/20">Mata Pelatihan</th>
                      <th className="p-2 border border-slate-200/20 text-center">JP</th>
                      <th className="p-2 border border-slate-200/20">Pengajar</th>
                      <th className="p-2 border border-slate-200/20">Tipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewGroupedSchedules.map((group) => (
                      <React.Fragment key={`preview-${group.key}`}>
                        {group.entries.map((s, index) => (
                          <tr key={`preview-${s.id}`}>
                            {index === 0 && (
                              <>
                                {previewAngkatan === 'All' && (
                                  <td rowSpan={group.entries.length} className="p-2 font-bold border border-slate-200/20 align-top bg-slate-900/[0.01]">
                                    {s.angkatan}
                                  </td>
                                )}
                                <td rowSpan={group.entries.length} className="p-2 font-mono font-bold border border-slate-200/20 align-top text-center bg-slate-900/[0.02]">
                                  {s.dayNumber}
                                </td>
                                <td rowSpan={group.entries.length} className="p-2 border border-slate-200/20 align-top whitespace-nowrap bg-slate-900/[0.02]">
                                  {format(parseISO(s.date), 'EEEE, dd MMM yyyy', { locale: localeId })}
                                </td>
                              </>
                            )}
                            <td className="p-2 font-mono border border-slate-200/20 whitespace-nowrap">{s.startTime} - {s.endTime}</td>
                            <td className="p-2 font-bold border border-slate-200/20">{s.subject}</td>
                            <td className="p-2 font-mono text-center border border-slate-200/20">{s.jp}</td>
                            <td className="p-2 border border-slate-200/20">
                              {s.instructors.length > 1 
                                ? s.instructors.map((i, idx) => <div key={idx}>- {i}</div>)
                                : <div>{s.instructors[0] || ''}</div>
                              }
                            </td>
                            <td className="p-2 border border-slate-200/20 text-[9px] uppercase tracking-wider">
                              {s.type}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    {previewGroupedSchedules.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center font-mono opacity-90 italic">
                          No schedule data available to export.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4 shrink-0">
                <button 
                  onClick={() => setIsExportReviewModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      exportToPDF();
                      setIsExportReviewModalOpen(false);
                    }}
                    disabled={previewGroupedSchedules.length === 0}
                    className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-red-700 transition-all disabled:opacity-90"
                  >
                    <Download size={14} />
                    Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="bg-red-600 text-white p-4 flex items-center justify-between">
                <h3 className="font-bold tracking-wide font-sans text-sm">
                  Confirm Deletion
                </h3>
                <button onClick={() => setDeleteConfirm(null)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                <p className="text-sm mb-2">Are you sure you want to delete this {deleteConfirm.type}?</p>
                <p className="font-bold text-lg">{deleteConfirm.label}</p>
                <p className="text-xs font-mono opacity-90 mt-4 text-red-600 tracking-wide font-sans">
                  // This action cannot be undone
                </p>
              </div>
              
              <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 text-sm font-medium rounded-full tracking-wide font-sans hover:bg-red-700 transition-all"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Instructor Details Modal */}
      <AnimatePresence>
        {viewingInstructor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingInstructor(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
            >
              <div className="bg-indigo-600 text-white shadow-sm p-4 flex items-center justify-between shrink-0">
                <h3 className="font-bold tracking-wide font-sans text-sm">
                  Instructor Details
                </h3>
                <button onClick={() => setViewingInstructor(null)} className="hover:rotate-90 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-indigo-600 text-white shadow-sm flex items-center justify-center text-4xl font-bold shrink-0">
                      {viewingInstructor.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold">{viewingInstructor.name}</h2>
                        {viewingInstructor.isExternal && <Badge variant="warning">Luar</Badge>}
                      </div>
                      <p className="font-mono tracking-wide font-sans opacity-90 mt-1">{viewingInstructor.role || 'Facilitator'}</p>
                      {viewingInstructor.email && (
                        <p className="text-sm mt-2 flex items-center gap-2">
                          <Mail size={14} /> {viewingInstructor.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {instructorJpStats[viewingInstructor.name] && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-3 shadow-md rounded-2xl border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
                        <p className="text-xs tracking-wide font-sans font-medium opacity-70">Total JP</p>
                        <p className="text-2xl font-bold">{instructorJpStats[viewingInstructor.name].totalJp}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700  p-3 shadow-md rounded-2xl border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
                        <p className="text-xs tracking-wide font-sans font-medium opacity-70">Total Jam</p>
                        <p className="text-2xl font-bold">{(instructorJpStats[viewingInstructor.name].totalJp * 45) / 60}</p>
                      </div>
                    </div>
                  )}
                </div>

                {instructorConflictsMap[viewingInstructor.name] && (
                  <div className="mb-8 p-4 bg-red-100 border-2 border-red-600 flex items-start gap-4">
                    <div className="bg-red-600 text-white p-2 shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-700 uppercase tracking-tight text-sm">Peringatan Konflik Penjadwalan</h4>
                      <p className="text-xs text-red-700 mt-1">Ditemukan {instructorConflictsMap[viewingInstructor.name].length} titik bentrok pada jadwal instruktur ini. Mohon segera tinjau jadwal di bawah.</p>
                    </div>
                  </div>
                )}

                {instructorJpStats[viewingInstructor.name] && (
                  <div className="space-y-4 mb-8">
                    <h4 className="font-bold tracking-wide font-sans border-b border-slate-200/20 pb-2">Rincian Jam Pelajaran (JP)</h4>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                      {instructorJpStats[viewingInstructor.name].totalJp > 0 ? (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-indigo-600 text-white shadow-sm font-mono text-xs tracking-wide font-sans">
                            <tr>
                              <th className="p-3 font-normal">Program Pelatihan</th>
                              <th className="p-3 font-normal">Angkatan</th>
                              <th className="p-3 font-normal text-right">Total JP</th>
                              <th className="p-3 font-normal text-right">Total Jam</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {Object.entries(instructorJpStats[viewingInstructor.name].trainingJp).map(([training, angkatans]) => (
                              Object.entries(angkatans).map(([angkatan, jp], idx) => (
                                <tr key={`${training}-${angkatan}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50 transition-colors">
                                  {idx === 0 ? (
                                    <td className="p-3 font-bold align-top" rowSpan={Object.keys(angkatans).length}>
                                      {training}
                                    </td>
                                  ) : null}
                                  <td className="p-3 font-mono text-xs">{angkatan}</td>
                                  <td className="p-3 font-bold text-right">{jp} JP</td>
                                  <td className="p-3 font-mono text-xs text-right opacity-90">{(Number(jp) * 45) / 60} Jam</td>
                                </tr>
                              ))
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-50 dark:bg-slate-800/50 font-bold border-t border-slate-200 dark:border-slate-700">
                            <tr>
                              <td colSpan={2} className="p-3 text-right text-xs tracking-wide font-sans">Total Keseluruhan</td>
                              <td className="p-3 text-right text-lg">{instructorJpStats[viewingInstructor.name].totalJp} JP</td>
                              <td className="p-3 text-right font-mono text-xs opacity-90">{(instructorJpStats[viewingInstructor.name].totalJp * 45) / 60} Jam</td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-sm font-mono opacity-90 italic">Belum ada Jam Pelajaran (JP) yang tercatat untuk instruktur ini.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!viewingInstructor.isExternal && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-bold tracking-wide font-sans border-b border-slate-200/20 pb-2">Availability / Ketersediaan</h4>
                    {viewingInstructor.availability && viewingInstructor.availability.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewingInstructor.availability
                          .sort((a, b) => (a.day === 0 ? 7 : a.day) - (b.day === 0 ? 7 : b.day)) // Sort by day Mon-Sun
                          .map((slot, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 p-3 border border-slate-200/10 flex items-center justify-between">
                              <span className="font-bold text-xs tracking-wide font-sans">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.day]}
                              </span>
                              <span className="font-mono text-xs opacity-90">
                                {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm font-mono opacity-90 italic">No availability information defined.</p>
                    )}
                  </div>
                )}

                <div className="space-y-4 mt-8">
                  <h4 className="font-bold tracking-wide font-sans border-b border-slate-200/20 pb-2">Assigned Schedules</h4>
                  {schedules.filter(s => s.instructors.includes(viewingInstructor.name)).length > 0 ? (
                    <div className="space-y-3">
                      {schedules
                        .filter(s => s.instructors.includes(viewingInstructor.name))
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime))
                        .map(s => {
                          const isOutsideAvailability = isInstructorAvailable(viewingInstructor, s.date, s.startTime, s.endTime) === false;
                          const hasOverlap = instructorConflictsMap[viewingInstructor.name]?.some(c => c.s1.id === s.id || c.s2.id === s.id);
                          
                          return (
                            <div key={s.id} className={cn(
                              "bg-white dark:bg-slate-800 p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:bg-slate-800/50",
                              isOutsideAvailability ? "border-red-400 bg-red-50/50 shadow-md border-red-200" : 
                              hasOverlap ? "border-amber-400 bg-amber-50/50 shadow-md border-amber-200" : 
                              "border-slate-200 dark:border-slate-700"
                            )}>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={cn("font-bold truncate max-w-[250px]", 
                                    isOutsideAvailability ? "text-red-700" : 
                                    hasOverlap ? "text-amber-700" : ""
                                  )}>{s.subject}</p>
                                  
                                  {hasOverlap && (
                                    <div className="flex items-center gap-1 text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 font-bold tracking-wide font-sans border border-amber-200" title="Schedule Conflict">
                                      <AlertTriangle size={10} /> Bentrok
                                    </div>
                                  )}
                                  {isOutsideAvailability && (
                                    <div className="flex items-center gap-1 text-[9px] bg-red-100 text-red-700 px-2 py-0.5 font-bold tracking-wide font-sans border border-red-200" title="Di Luar Jam Kerja">
                                      <AlertTriangle size={10} /> Di Luar Ketersediaan
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono opacity-90 mt-1">
                                  <span className="bg-slate-100 px-1 py-0.5">{s.angkatan}</span>
                                  <span>•</span>
                                  <span>{format(parseISO(s.date), 'EEEE, dd MMM yyyy', { locale: localeId })}</span>
                                </div>
                              </div>
                              <div className="text-left sm:text-right shrink-0 border-l sm:border-l-0 sm:pl-0 pl-4 border-slate-200/10">
                                <p className="font-mono text-sm font-bold">{s.startTime} - {s.endTime}</p>
                                <p className="text-[10px] tracking-wide font-sans opacity-90 mt-0.5">{s.type} • {s.jp} JP</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm font-mono opacity-90 italic">No schedules assigned to this instructor.</p>
                  )}
                </div>

                {instructorConflictsMap[viewingInstructor.name] && (
                  <div className="space-y-4 mt-8">
                    <h4 className="font-bold tracking-wide font-sans border-b border-red-200 text-red-600 pb-2 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Schedule Conflicts / Bentrok Jadwal
                    </h4>
                    <div className="space-y-3">
                      {instructorConflictsMap[viewingInstructor.name].map((c, idx) => (
                        <div key={idx} className="bg-red-50 p-4 border border-red-200">
                          <p className="text-xs tracking-wide font-sans font-medium text-red-600 mb-2">Conflict #{idx + 1}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-2 bg-white/50 border border-red-100">
                              <p className="text-[10px] font-bold uppercase opacity-90">Session A</p>
                              <p className="font-bold text-sm">{c.s1.subject}</p>
                              <p className="text-xs font-mono">{c.s1.angkatan}</p>
                              <p className="text-xs mt-1">{c.s1.startTime} - {c.s1.endTime}</p>
                            </div>
                            <div className="p-2 bg-white/50 border border-red-100">
                              <p className="text-[10px] font-bold uppercase opacity-90">Session B</p>
                              <p className="font-bold text-sm">{c.s2.subject}</p>
                              <p className="text-xs font-mono">{c.s2.angkatan}</p>
                              <p className="text-xs mt-1">{c.s2.startTime} - {c.s2.endTime}</p>
                            </div>
                          </div>
                          <p className="text-[10px] mt-2 text-red-600 font-mono italic">
                            Date: {format(parseISO(c.s1.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
