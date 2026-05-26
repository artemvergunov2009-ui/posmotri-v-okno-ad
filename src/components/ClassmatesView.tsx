import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Users, UserCircle, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

export default function ClassmatesView() {
  const { profile, user } = useAuth();
  const [classmates, setClassmates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassmates() {
      if (!profile) return;
      
      // Получаем профили вместе с их предметами
      let query = supabase
        .from('profiles')
        .select('id, full_name, role, class_name, position')
        .neq('id', user?.id); // Фильтруем себя на сервере
      
      if (profile.role === 'student' && profile.class_name) {
        // Ученик видит только учеников своего класса
        query = query.eq('role', 'student').eq('class_name', profile.class_name);
      } else {
        // Учитель видит других учителей и дирекцию
        query = query.in('role', ['teacher', 'director']);
      }

      const { data, error } = await query;
      
      if (!error && data) {
        setClassmates(data);
      }
      setLoading(false);
    }
    fetchClassmates();
  }, [profile, user]);

  if (loading) return <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Поиск одноклассников...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
            {profile?.role === 'student' ? `Мой класс: ${profile.class_name}` : 'Мои коллеги'}
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            {classmates.length} {profile?.role === 'student' ? 'одноклассников' : 'коллег'} в списке
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classmates.map((mate, idx) => (
          <motion.div 
            key={mate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-5 group"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
              <UserCircle className="w-10 h-10 text-slate-200 group-hover:text-indigo-200" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-900 uppercase tracking-tight truncate">{mate.full_name}</p>
              <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-1">
                {mate.role === 'student' 
                  ? `Ученик ${mate.class_name} класса` 
                  : (mate.position || (mate.role === 'director' ? 'Директор школы' : 'Сотрудник'))}
              </p>
              <div className="flex gap-2 mt-3">
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">В сети</span>
              </div>
            </div>
          </motion.div>
        ))}

        {classmates.length === 0 && (
          <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-[3rem] text-center">
            <p className="text-slate-400 italic">Пока никого нет...</p>
          </div>
        )}
      </div>
    </div>
  );
}