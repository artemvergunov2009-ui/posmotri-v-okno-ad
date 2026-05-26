import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ChevronRight, FileText, CheckCircle, Clock, Book, UserCircle, Edit3, X, Paperclip, Trash2, Menu, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { useNotification } from '@/contexts/NotificationContext'; // Изменено на алиас
import { useLocation, Link } from 'react-router-dom';

export default function TeacherDashboard({ forcedView }: { forcedView?: 'lessons' | 'grading' | 'profile' }) {
  const { profile, user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const view = forcedView || (location.pathname === '/profile' ? 'profile' : location.pathname === '/grades' ? 'grading' : 'lessons');

  useEffect(() => {
    async function fetchSubjects() {
      if (!user) return;
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('teacher_id', user.id);
      
      if (!error && data) {
        setSubjects(data);
      }
    }
    fetchSubjects();
  }, [user]);

  async function fetchLessons(subject: any) {
    setSelectedSubject(subject);
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subject.id);
    
    if (!error && data) {
      setLessons(data);
    }
  }

  async function fetchSubmissions() {
    const subjectIds = subjects.map(s => s.id);
    if (subjectIds.length === 0) return;
    
    // Делаем ОДИН запрос вместо двух. Используем !inner для фильтрации по связанной таблице.
    const { data, error } = await supabase
      .from('submissions')
      .select(`
        id, status, content, grade, grade_coefficient, grade_comment, created_at, updated_at, file_urls,
        profiles(full_name, class_name),
        lessons!inner(title, subject_id)
      `)
      .in('lessons.subject_id', subjectIds)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSubmissions(data.map(s => ({
        ...s,
        studentName: (s as any).profiles?.full_name || 'Ученик',
        studentClass: (s as any).profiles?.class_name || '?',
        lessonTitle: (s as any).lessons?.title
      })));
    }
  }

  useEffect(() => {
    if (view === 'grading') {
      fetchSubmissions();
    }
  }, [view, subjects]);

  return (
    <div className="space-y-8">
       <div className="flex gap-8 border-b border-slate-200">
        <Link 
          to="/education"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'lessons' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Уроки
        </Link>
        <Link 
          to="/grades"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'grading' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Проверка
        </Link>
        <Link 
          to="/profile"
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${view === 'profile' ? 'border-b-4 border-indigo-600 text-indigo-700' : 'text-slate-400'}`}
        >
          Профиль
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {view === 'lessons' ? (
          <motion.div key="lessons" className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white lg:bg-transparent p-4 lg:p-0 rounded-[1.5rem] lg:rounded-none border lg:border-none border-slate-200 lg:block">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Мои предметы</h3>
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  {isSidebarOpen ? 'Скрыть' : 'Выбрать'}
                </button>
              </div>

              <div className={`${isSidebarOpen ? 'block' : 'hidden'} lg:block transition-all duration-300`}>
                <div className="grid gap-3 pt-2 lg:pt-0">
                  {subjects.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        fetchLessons(s);
                        setIsSidebarOpen(false); // Закрываем на мобилках после выбора
                      }}
                      className={`p-5 rounded-[1.5rem] text-left border transition-all shadow-sm ${selectedSubject?.id === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-indigo-50'}`}
                    >
                      <p className="font-bold">{s.name}</p>
                      <p className={`text-[10px] uppercase font-black tracking-widest mt-1 ${selectedSubject?.id === s.id ? 'text-indigo-200' : 'text-indigo-600'}`}>Активен</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedSubject ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{selectedSubject.name}: Уроки</h3>
                    <button 
                      onClick={() => setShowAddLesson(true)}
                      className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                      <Plus className="w-4 h-4" /> Добавить
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {lessons.map(l => (
                      <div key={l.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex justify-between items-center group hover:border-indigo-300 transition-all shadow-sm">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Book className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{l.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Срок: {new Date(l.deadline).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setEditingLesson(l)}
                             className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                             title="Редактировать"
                           >
                             <Edit3 className="w-5 h-5" />
                           </button>
                           <ChevronRight className="text-slate-200 group-hover:text-indigo-600 transition-all w-6 h-6" />
                        </div>
                      </div>
                    ))}
                    {lessons.length === 0 && <p className="text-center py-20 text-slate-400 italic bg-white rounded-[2rem] border border-dashed border-slate-200">Список уроков пуст</p>}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 font-medium">
                   <div className="w-20 h-20 bg-slate-100 rounded-3xl mb-6 flex items-center justify-center text-slate-200">
                      <Book className="w-10 h-10" />
                   </div>
                   Выберите предмет слева
                </div>
              )}
            </div>
          </motion.div>
        ) : view === 'grading' ? (
          <motion.div key="grading" className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Проверка работ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {submissions.map(s => (
                <div key={s.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight leading-tight">{s.studentName || 'Ученик'}</h4>
                        <div className="bg-slate-50 inline-block px-2 py-0.5 rounded mt-1 space-x-2">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{s.studentClass} КЛАСС</span>
                          <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">{s.lessonTitle}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-widest py-1.5 px-3 rounded-xl border ${s.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : s.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {s.status === 'pending' ? 'На проверке' : s.status === 'accepted' ? 'Принято' : 'Отклонено'}
                      </span>
                    </div>
                    
                    {s.content && (
                      <div className="bg-slate-50 p-4 rounded-2xl mb-6 text-xs text-slate-600 leading-relaxed italic border-l-4 border-indigo-500">
                        "{s.content}"
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                       <Clock className="w-3 h-3" /> {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                       {s.file_urls?.map((f: string, idx: number) => (
                         <div key={idx} className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl text-indigo-600 text-[10px] font-bold uppercase tracking-wider border border-indigo-100">
                            <FileText className="w-3 h-3" /> Файл {idx + 1}
                         </div>
                       ))}
                    </div>
                    <GradeSubmission submission={s} onUpdate={fetchSubmissions} />
                  </div>
                </div>
              ))}
              {submissions.length === 0 && <p className="text-center col-span-full py-24 text-slate-400 italic">Нет новых работ для проверки</p>}
            </div>
          </motion.div>
        ) : (
          <TeacherProfile key="profile" />
        )}
      </AnimatePresence>

      <AddLessonModal 
        show={showAddLesson} 
        onClose={() => setShowAddLesson(false)} 
        subjectId={selectedSubject?.id}
        onAdded={() => {
          fetchLessons(selectedSubject);
          setShowAddLesson(false);
        }}
      />

      <EditLessonModal 
        lesson={editingLesson}
        onClose={() => setEditingLesson(null)}
        onUpdated={() => {
          fetchLessons(selectedSubject);
          setEditingLesson(null);
        }}
      />
    </div>
  );
}

function GradeSubmission({ submission, onUpdate }: { submission: any, onUpdate: () => void }) {
  const [grade, setGrade] = useState('5');
  const [coeff, setCoeff] = useState('1');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const isEditable = (dateStr: string) => {
    const start = new Date(dateStr);
    const now = new Date();
    let count = 0;
    let current = new Date(start);
    
    while (current < now) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Not Sat or Sun
        count++;
      }
      if (count > 20) break; // Safety break
    }
    return count <= 3;
  };

  const gradeColors: Record<string, string> = {
    '5': 'bg-green-500 text-white shadow-green-100',
    '4': 'bg-emerald-400 text-white shadow-emerald-100',
    '3': 'bg-amber-400 text-white shadow-amber-100',
    '2': 'bg-rose-500 text-white shadow-rose-100',
    'Зачтено': 'bg-indigo-600 text-white shadow-indigo-100'
  };

  const grades = ['2', '3', '4', '5'];

  const handleGrade = async (status: string, overrideGrade?: string, overrideComment?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status,
          grade: overrideGrade || grade,
          grade_coefficient: parseInt(coeff),
          grade_comment: overrideComment || comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.id);
      
      if (error) throw error;
      showNotification(status === 'accepted' ? 'Оценка успешно выставлена' : 'Работа отклонена', 'info');
      onUpdate();
    } catch (err) {
      console.error('Grading error:', err);
      showNotification('Ошибка при сохранении оценки', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (submission.status !== 'pending' && !isEditable(submission.updated_at || submission.created_at)) {
    return (
      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 leading-tight">{submission.grade}</p>
              <p className={`text-[10px] ${submission.grade === 'Зачтено' ? 'text-indigo-600' : 'text-emerald-600'} font-black uppercase tracking-widest`}>
                {submission.grade === 'Зачтено' ? 'Статус: Зачёт' : `Коэфф х${submission.grade_coefficient}`}
              </p>
            </div>
         </div>
         <div className="text-right max-w-[150px]">
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Отзыв</p>
           <p className="text-[10px] text-slate-500 italic line-clamp-2">{submission.grade_comment || 'Без комментария'}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-slate-100 space-y-5">
      {submission.status !== 'pending' && (
        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/50 p-2 rounded-xl text-center border border-indigo-100">
          Можно изменить (Режим редактирования активен 3 дня)
        </p>
      )}
      
      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Выставить оценку</label>
        <div className="flex gap-2">
          {grades.map(v => (
            <button
              key={v}
              onClick={() => setGrade(v)}
              className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${grade === v ? gradeColors[v] : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Множитель (Коэффициент)</label>
        <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl">
          {[1, 2, 3].map(v => (
            <button
              key={v}
              onClick={() => setCoeff(v.toString())}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${coeff === v.toString() ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              x{v}
            </button>
          ))}
        </div>
      </div>

      <input 
        placeholder="Личный комментарий..." 
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full text-xs p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 transition-all outline-none placeholder:text-slate-300 font-medium"
      />
      <div className="flex gap-2">
        <button 
           onClick={() => handleGrade('accepted')}
           disabled={loading}
           className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          {submission.status === 'pending' ? 'Принять' : 'Обновить'}
        </button>
        <button 
           onClick={() => handleGrade('rejected')}
           className="flex-1 border border-slate-200 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
        >
          Отказ
        </button>
        <button 
           onClick={() => handleGrade('accepted', 'Зачтено', 'ДЗ зачтено')}
           className="px-3 border border-indigo-100 text-indigo-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
           title="Зачтено без оценки"
        >
          Зачёт
        </button>
      </div>
    </div>
  );
}

function TeacherProfile() {
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
             <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{profile.position || (profile.role === 'director' ? 'Директор' : 'Учитель')}</span>
             <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Персонал</span>
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
        <Link to="/profile" className="block w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-all text-center">
          Редактировать всё
        </Link>
      </div>
    </motion.div>
  );
}

function EditLessonModal({ lesson, onClose, onUpdated }: { lesson: any, onClose: () => void, onUpdated: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [glossary, setGlossary] = useState('');
  const [deadline, setDeadline] = useState('');
  const [targetGrade, setTargetGrade] = useState('1');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDesc(lesson.content || '');
      setGlossary(lesson.glossary || '');
      setTargetGrade(lesson.target_grade?.toString() || '1');
      setFileUrls(lesson.file_urls || []);
      if (lesson.deadline) {
        const d = new Date(lesson.deadline);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setDeadline(d.toISOString().slice(0, 16));
      }
    }
  }, [lesson]);

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  if (!lesson) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('lessons')
      .update({
        title,
        content: desc,
        glossary,
        deadline: new Date(deadline).toISOString(),
        target_grade: parseInt(targetGrade),
        file_urls: fileUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', lesson.id);
    
    setLoading(false);
    if (error) {
      showNotification('Ошибка при обновлении урока: ' + error.message, 'error');
    } else {
      showNotification('Урок успешно обновлен!', 'success');
      onUpdated();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-3xl overflow-hidden border border-slate-100"
      >
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Редактировать</h2>
            <p className="text-slate-400 text-sm mt-1">Измените информацию об уроке</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input 
              placeholder="Название урока" 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Целевой класс (1-11)</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              value={targetGrade}
              onChange={e => setTargetGrade(e.target.value)}
            >
              {Array.from({ length: 11 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num} класс</option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
              <textarea 
                placeholder="Что нужно сделать ученику?" 
                rows={4} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
               <textarea 
                 placeholder="Глоссарий..." 
                 rows={2} 
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                 value={glossary}
                 onChange={e => setGlossary(e.target.value)}
               />
              <input 
                type="datetime-local" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                required
              />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Материалы урока</label>
            <div className="space-y-4">
              <div 
                onClick={() => document.getElementById('edit-file-upload')?.click()}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer group"
              >
                <input 
                  id="edit-file-upload" 
                  type="file" 
                  multiple 
                  className="hidden" 
                  onChange={e => setNewFiles(Array.from(e.target.files || []))} 
                />
                <Paperclip className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 mb-2" />
                <p className="text-[10px] font-bold uppercase text-slate-500">Нажмите для загрузки файлов</p>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                {fileUrls.map((url, idx) => (
                  <div key={`old-${idx}`} className="flex items-center justify-between bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-[10px] font-bold text-indigo-700 truncate">{url.split('/').pop()}</span>
                    </div>
                    <button type="button" onClick={() => setFileUrls(fileUrls.filter((_, i) => i !== idx))} className="text-rose-400 p-1 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {newFiles.map((file, idx) => (
                  <div key={`new-${idx}`} className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-bold text-emerald-700 truncate">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeNewFile(idx)} className="text-rose-400 p-1 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
               {loading ? 'Сохранение...' : 'Обновить урок'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 py-4 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">Отмена</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function AddLessonModal({ show, onClose, subjectId, onAdded }: { show: boolean, onClose: () => void, subjectId: string, onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [glossary, setGlossary] = useState('');
  const [targetGrade, setTargetGrade] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `lesson-materials/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

    const { error } = await supabase
      .from('lessons')
      .insert({
        subject_id: subjectId,
        title,
        content: desc, // Using content from schema
        target_grade: parseInt(targetGrade),
        deadline: new Date(deadline).toISOString(),
        file_urls: uploadedUrls
      });
    
    if (error) {
      console.error('Error adding lesson:', error);
      showNotification('Ошибка при добавлении урока: ' + error.message, 'error');
    } else {
      showNotification('Урок успешно добавлен!', 'success');
      setFiles([]);
      setTitle('');
      setDesc('');
      setGlossary('');
      onAdded();
    }
    } catch (err: any) {
      showNotification('Ошибка при загрузке файлов: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-3xl overflow-hidden border border-slate-100"
      >
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Новый урок</h2>
          <p className="text-slate-400 text-sm mt-1">Заполните детали для публикации задания</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Заголовок</label>
            <input 
              placeholder="Введите название урока..." 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Для какого класса?</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              value={targetGrade}
              onChange={e => setTargetGrade(e.target.value)}
            >
              {Array.from({ length: 11 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num} класс</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Задание</label>
              <textarea 
                placeholder="Что нужно сделать ученику?" 
                rows={3} 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                value={desc}
                onChange={e => setDesc(e.target.value)}
              />
            </div>
            <div className="col-span-2">
               <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Глоссарий</label>
               <textarea 
                 placeholder="Дополнительные термины и информация..." 
                 rows={2} 
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                 value={glossary}
                 onChange={e => setGlossary(e.target.value)}
               />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Дедлайн публикации</label>
              <input 
                type="datetime-local" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 block ml-1">Материалы урока</label>
              <div className="space-y-4">
                <div 
                  onClick={() => document.getElementById('add-file-upload')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer group"
                >
                  <input 
                    id="add-file-upload" 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={e => setFiles(Array.from(e.target.files || []))} 
                  />
                  <Paperclip className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Выберите файлы с компьютера</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">{file.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-6">
            <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
              {loading ? 'Загрузка файлов...' : 'Опубликовать'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 py-4 rounded-2xl text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">Отмена</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
