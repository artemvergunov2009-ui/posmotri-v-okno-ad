import React from 'react';
import { useAuth } from '../App';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import { LogOut, User, Home, BookOpen, BarChart2, Info, UserCheck, LayoutDashboard, Terminal, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';

export default function Dashboard({ children }: { children?: React.ReactNode }) {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const NavItem = ({ icon: Icon, label, path, active = false }: any) => (
    <Link 
      to={path} 
      className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
      {/* Navbar */}
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-100">
            P
          </div>
          <h1 className="text-xl font-black tracking-tight text-indigo-900 uppercase">LMS Peschanoe</h1>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-bold text-slate-900">{profile.full_name}</div>
            <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
              {profile.role === 'student' ? `${profile.class_name || 'Ученик'}` : (profile.position || (profile.role === 'director' ? 'Директор' : 'Учитель'))}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
            {profile.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shrink-0 transition-all hidden md:flex">
          <div className="space-y-1">
            <div className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Меню</div>
            <NavItem icon={LayoutDashboard} label="Главная" path="/" active={location.pathname === '/'} />
            <NavItem icon={BookOpen} label="Обучение" path="/education" active={location.pathname === '/education'} />
            <NavItem icon={BarChart2} label="Успеваемость" path="/grades" active={location.pathname === '/grades'} />
            <NavItem icon={Users} label={profile.role === 'student' ? "Одноклассники" : "Коллеги"} path="/classmates" active={location.pathname === '/classmates'} />
            <NavItem icon={UserCheck} label="Профиль" path="/profile" active={location.pathname === '/profile'} />
            
            {profile.email === 'vergunov09artyom@mail.ru' && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <NavItem icon={Terminal} label="Разработчику" path="/dev" active={location.pathname === '/dev'} />
              </div>
            )}

            <Link to="/about" className="flex items-center space-x-3 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <Info className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-sm">О нас</span>
            </Link>
          </div>

          <div className="mt-auto p-5 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="text-xs font-black text-indigo-800 mb-2 uppercase tracking-wide flex items-center gap-2">
               <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
               Интеллект
            </div>
            <div className="text-[10px] text-indigo-600/80 leading-relaxed font-medium">
              Проверьте новые дедлайны. Система авто-фиксации активна.
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
