import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { LogIn, GraduationCap, Info } from 'lucide-react'; 
import { useNotification } from '@/contexts/NotificationContext'; // Изменено на алиас
import { Link } from 'react-router-dom';

const INITIAL_USERS = [
  {
    email: 'vergunov09artyom@mail.ru',
    password: '06_Artyom',
    fullName: 'Вергунов А.А.',
    role: 'teacher',
    className: '',
    subjects: ['Визуальное программирование', 'Информатика', 'Моделирование физических процессов в приложениях']
  },
  {
    email: 'peschanoe-shkolagukov@yandex.ru',
    password: 'Gukov_Director',
    fullName: 'Гуков В.Д.',
    role: 'director',
    className: '',
    subjects: ['История']
  },
  {
    email: 'pakhomova@yandex.ru',
    password: 'pakhomova-math',
    fullName: 'Пахомова Людмила Петровна',
    role: 'teacher',
    className: '',
    subjects: ['Математика']
  },
  {
    email: 'semenova@mail.ru',
    password: 'Semenova_10',
    fullName: 'Семёнова Валерия Андреевна',
    role: 'student',
    className: '10-А',
    subjects: []
  }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) throw err;
      if (!data.user) throw new Error('No user found');
    } catch (err: any) {
      setError('Неверный адрес электронной почты или пароль');
    } finally {
      setLoading(false);
    }
  };

  const seedUsers = async () => {
    setSeeding(true);
    try {
      for (const u of INITIAL_USERS) {
        try {
          // Signup in Supabase
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: u.email,
            password: u.password,
            options: {
              data: {
                full_name: u.fullName,
              }
            }
          });

          if (signUpError) {
             if (signUpError.message.includes('already registered')) {
                console.log(`User ${u.email} already exists.`);
             } else {
                throw signUpError;
             }
          }

          const userId = signUpData.user?.id;
          if (userId) {
            // Create profile
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                full_name: u.fullName,
                email: u.email,
                role: u.role,
                class_name: u.className,
              });
            
            if (profileError) console.error('Profile Error:', profileError);

            // Create subjects
            if (u.role === 'teacher' || u.role === 'director') {
              for (const sName of u.subjects) {
                 await supabase
                  .from('subjects')
                  .upsert({
                    name: sName,
                    teacher_id: userId
                  });
              }
            }
          }
        } catch (e: any) {
          console.log(`Error seeding ${u.email}:`, e.message);
        }
      }
      showNotification('Начальные аккаунты созданы/проверены в Supabase', 'success');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl shadow-indigo-100/30 border border-slate-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">LMS Peschanoe</h1>
          <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest">Песчанская СОШ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none transition-all"
              placeholder="example@mail.ru"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 bg-slate-50 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && <p className="text-red-500 text-xs font-medium italic">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 uppercase tracking-widest text-sm"
          >
            {loading ? 'Вход...' : <><LogIn className="w-4 h-4" /> Войти</>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <Link to="/about" className="flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors">
            <Info className="w-4 h-4" /> О нас
          </Link>
          
          <button 
            onClick={seedUsers}
            disabled={seeding}
            className="text-[10px] text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-widest"
          >
            {seeding ? 'Инициализация...' : 'Создать начальные аккаунты (Seed)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
