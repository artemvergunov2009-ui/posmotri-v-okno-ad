import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

export default function HomeView() {
  const { user, profile } = useAuth();
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeadlines() {
      if (!user || !profile) return;
      
      // Fetch lessons with upcoming deadlines
      let query = supabase
        .from('lessons')
        .select(`
          id, title, deadline,
          subject:subjects!inner(name, teacher_id)
        `, { count: 'exact' })
        .gt('deadline', new Date().toISOString());

      if (profile.role === 'student') {
        const studentGrade = parseInt(profile.class_name || '0');
        query = query.eq('target_grade', studentGrade);
      } else if (profile.role === 'teacher' || profile.role === 'director') {
        query = query.eq('subject.teacher_id', user.id);
      }

      const { data, error } = await query
        .order('deadline', { ascending: true })
        .limit(5);

      if (!error && data) {
        setDeadlines(data);
      }
      setLoading(false);
    }
    fetchDeadlines();
  }, [user, profile]);

  const getTimeRemaining = (deadline: string) => {
    const total = Date.parse(deadline) - Date.parse(new Date().toString());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    if (total <= 0) return 'Истекло';
    
    let res = '';
    if (days > 0) res += `${days}д `;
    if (hours > 0) res += `${hours}ч `;
    if (minutes > 0) res += `${minutes}м`;
    return res;
  };

  if (loading) return <div className="py-20 text-center text-slate-400">Загрузка дедлайнов...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Здравствуйте, {profile?.full_name?.split(' ')[1] || profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-indigo-100 font-medium">Добро пожаловать в LMS Песчаное. Твой учебный процесс под контролем.</p>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <Clock className="text-indigo-600" /> Ближайшие дедлайны
          </h2>
        </div>

        <div className="grid gap-4">
          {deadlines.length > 0 ? (
            deadlines.map((d, idx) => (
              <motion.div 
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between hover:border-indigo-300 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${idx === 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{d.title}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{d.subject?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8 mt-4 md:mt-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Осталось времени</p>
                    <p className={`text-sm font-black flex items-center gap-2 justify-end ${idx === 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                      {idx === 0 && <AlertCircle className="w-4 h-4 animate-pulse" />}
                      {getTimeRemaining(d.deadline)}
                    </p>
                  </div>
                  <Link 
                    to={`/lesson/${d.id}`}
                    className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all shadow-lg"
                  >
                    Перейти
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] py-20 text-center">
              <p className="text-slate-400 italic">Актуальных дедлайнов нет. Отдыхайте!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
