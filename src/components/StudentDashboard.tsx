import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Book, ChevronRight, GraduationCap, UserCircle, Clock, FileText, CheckCircle, BarChart2, X, Calendar, AlertCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';

export default function StudentDashboard({ forcedView }: { forcedView?: 'study' | 'grades' | 'profile' }) {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Internal view based on path or forced prop
  const view = forcedView || (location.pathname === '/profile' ? 'profile' : location.pathname === '/grades' ? 'grades' : 'study');

  useEffect(() => {
    async function fetchTeachers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, position')
        .in('role', ['teacher', 'director']);
      
      if (!error && data) {
        setTeachers(data);
      }
      setLoading(false);
    }
    fetchTeachers();
  }, []);

  async function fetchSubjects(teacherId: string) {
    if (selectedTeacher === teacherId) {
      setSelectedTeacher(null);
      setSubjects([]);
      return;
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('teacher_id', teacherId);
    
    if (!error && data) {
      setSubjects(data);
    }
    setSelectedTeacher(teacherId);
  }

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="space-y-8">
      <div className="flex gap-8 border-b border-slate-200">
        <Link 
          to="/education"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'study' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Обучение
        </Link>
        <Link 
          to="/grades"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'grades' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Успеваемость
        </Link>
        <Link 
          to="/profile"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'profile' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Профиль
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {view === 'study' ? (
          <motion.div 
            key="study"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Список учителей</h2>
            <div className="grid gap-4">
              {teachers.map(t => (
                <div key={t.id} className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <button 
                    onClick={() => fetchSubjects(t.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-5 text-left">
                      <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                        <GraduationCap className="text-indigo-600 w-7 h-7" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">{t.full_name}</p>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                          {t.position || (t.role === 'director' ? 'Директор' : 'Учитель')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-6 h-6 text-slate-300 transition-transform ${selectedTeacher === t.id ? 'rotate-90 text-indigo-600' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {selectedTeacher === t.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-50 px-6 pb-6 overflow-hidden"
                      >
                        <div className="pt-4 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Доступные предметы</p>
                          <div className="grid gap-3">
                            {subjects.map(s => (
                              <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                    <Book className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                  </div>
                                  <span className="font-bold text-slate-800">{s.name}</span>
                                </div>
                                <SubjectLessons subjectId={s.id} />
                              </div>
                            ))}
                            {subjects.length === 0 && <p className="text-sm text-slate-400 italic py-4">Предметы не найдены</p>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        ) : view === 'grades' ? (
          <StudentGrades key="grades" />
        ) : (
          <UserProfile key="profile" />
        )}
      </AnimatePresence>
    </div>
  );
}

function StudentGrades() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchGrades() {
      if (!user) return;
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          lesson:lessons(title, subject:subjects(name))
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSubmissions(data);
      }
      setLoading(false);
    }
    fetchGrades();
  }, [user]);

  if (loading) return <div className="py-20 text-center text-slate-400">Загрузка оценок...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ваша успеваемость</h2>
      <div className="grid gap-4">
        {submissions.map(s => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg">{(s.lesson as any)?.title}</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{(s.lesson as any)?.subject?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Оценка</p>
                <div className="flex items-center gap-2">
                   {s.status === 'accepted' ? (
                     <>
                        <span className="text-2xl font-black text-indigo-600">{s.grade}</span>
                        {s.grade_coefficient > 1 && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full">x{s.grade_coefficient}</span>}
                     </>
                   ) : s.status === 'pending' ? (
                     <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">На проверке</span>
                   ) : (
                     <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Отклонено</span>
                   )}
                </div>
              </div>
              
              {s.grade_comment && (
                <div className="hidden lg:block max-w-[200px]">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 text-right">Комментарий</p>
                   <p className="text-xs text-slate-500 italic text-right line-clamp-2">{s.grade_comment}</p>
                </div>
              )}

              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                {s.status === 'accepted' ? <CheckCircle className="text-green-500 w-6 h-6" /> : <Clock className="text-amber-400 w-6 h-6" />}
              </div>
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <div className="py-20 text-center bg-white border border-dashed border-slate-200 rounded-[2.5rem]">
             <p className="text-slate-400 italic">У вас пока нет оценок</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SubjectLessons({ subjectId }: { subjectId: string }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const { profile, user } = useAuth();

  async function fetchLessons() {
    if (open) {
      setOpen(false);
      return;
    }
    
    const studentGrade = parseInt(profile?.class_name || '0');

    // Загружаем уроки только для класса ученика
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('target_grade', studentGrade);
    
    if (!error && data) {
      setLessons(data);
      
      // Загружаем статусы сданных работ
      const { data: subData } = await supabase
        .from('submissions')
        .select('lesson_id, status, grade')
        .eq('student_id', user?.id);
      
      if (subData) {
        const subMap = subData.reduce((acc: any, sub: any) => {
          acc[sub.lesson_id] = sub;
          return acc;
        }, {});
        setSubmissions(subMap);
      }
    }
    setOpen(true);
  }

  return (
    <div className="relative">
      <button 
        onClick={fetchLessons}
        className="text-xs bg-indigo-600 text-white font-bold uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
      >
        Уроки
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-50 w-full max-w-5xl h-[80vh] rounded-[3rem] shadow-3xl overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-8 bg-white border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Задания: {profile?.class_name}</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Выберите урок для выполнения</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-4 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {lessons.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                    <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-bold italic">Для вашего класса заданий пока нет</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lessons.map(l => {
                      const sub = submissions[l.id];
                      const isDone = sub?.status === 'accepted' || sub?.status === 'pending';
                      
                      return (
                        <Link 
                          key={l.id} 
                          to={`/lesson/${l.id}`}
                          className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-100 transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start mb-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDone ? 'bg-green-50 text-green-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                {isDone ? <CheckCircle className="w-7 h-7" /> : <Book className="w-7 h-7" />}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${
                                !sub ? 'bg-slate-50 text-slate-400 border-slate-200' :
                                sub.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                sub.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                {sub ? (sub.status === 'pending' ? 'На проверке' : sub.status === 'accepted' ? `Оценка: ${sub.grade}` : 'Переделать') : 'Не сдано'}
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors uppercase leading-tight">{l.title}</h3>
                            <p className="text-slate-500 text-sm line-clamp-2 mb-6 italic">{l.content || 'Инструкции внутри урока...'}</p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">До: {new Date(l.deadline).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1 text-indigo-600">
                              <span className="text-[10px] font-black uppercase tracking-widest">Открыть</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-white border-t border-slate-200 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Система управления обучением • Песчанская СОШ</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserProfile() {
  const { profile, user } = useAuth();
  if (!profile) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm max-w-3xl"
    >
      <div className="flex flex-col md:flex-row items-center gap-10 mb-10">
        <div className="w-32 h-32 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-indigo-100">
          <UserCircle className="w-20 h-20 text-indigo-200" />
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{profile.full_name}</h2>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
             <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{profile.role === 'director' ? 'Директор' : 'Учитель'}</span>
             <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{profile.class_name || 'Общий'}</span>
          </div>
          <p className="text-slate-400 mt-4 font-medium">{profile.email}</p>
        </div>
      </div>
      <div className="space-y-6 pt-8 border-t border-slate-100">
        <div>
          <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-3">Техническая информация</h4>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">ID Пользователя</p>
                <p className="text-xs font-mono text-slate-600 truncate">{user?.id}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Статус аккаунта</p>
                <p className="text-xs font-bold text-green-600 uppercase">Активен</p>
             </div>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-3">Контактные данные</h4>
          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 text-indigo-900 leading-relaxed font-medium">
            {profile.contact_info || 'Дополнительная контактная информация не указана в профиле.'}
          </div>
        </div>
        <Link to="/profile" className="block w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-all text-center">
          Редактировать всё
        </Link>
      </div>
    </motion.div>
  );
}
