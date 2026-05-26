import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Основной клиент для БД
import { createClient } from '@supabase/supabase-js'; // Для временного клиента
import { UserPlus, Mail, Lock, ShieldAlert, CheckCircle2, GraduationCap, Briefcase, Settings2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface FormState {
  lastName: string;
  firstName: string;
  middleName: string;
  className: string;
  email: string;
  password: string;
  subject: string;
}

const initialFormState: FormState = {
  lastName: '',
  firstName: '',
  middleName: '',
  className: '',
  email: '',
  password: '',
  subject: ''
};

export default function DeveloperTools() {
  const [studentData, setStudentData] = useState<FormState>(initialFormState);
  const [teacherData, setTeacherData] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState<{ student: boolean, teacher: boolean }>({ student: false, teacher: false });
  const [status, setStatus] = useState<{ 
    student: { type: 'success' | 'error', msg: string } | null, 
    teacher: { type: 'success' | 'error', msg: string } | null 
  }>({ student: null, teacher: null });

  // Состояние для управления пользователями
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchUsers = async () => {
    setUsersLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*, subjects(id, name)')
      .order('role', { ascending: false });
    if (!error && data) setUsers(data);
    setUsersLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (role: 'student' | 'teacher', formData: FormState, setFormData: React.Dispatch<React.SetStateAction<FormState>>) => {
    setLoading(prev => ({ ...prev, [role]: true }));
    setStatus(prev => ({ ...prev, [role]: null }));

    const fullName = `${formData.lastName} ${formData.firstName} ${formData.middleName}`.trim();

    try {
      // СОЗДАЕМ ВРЕМЕННЫЙ КЛИЕНТ БЕЗ ПЕРСИСТЕНТНОСТИ (чтобы не выкинуло из аккаунта)
      // Мы берем URL и Ключ из существующего клиента
      const supabaseUrl = (supabase as any).supabaseUrl;
      const supabaseKey = (supabase as any).supabaseKey;
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: signUpData.user.id,
            full_name: fullName,
            email: formData.email,
            role: role,
            position: role === 'teacher' ? formData.subject : null,
            class_name: role === 'student' ? formData.className : null,
          });

        if (profileError) throw profileError;

        // Если это учитель, создаем для него предмет
        if (role === 'teacher' && formData.subject.trim()) {
          const { error: subjectError } = await supabase
            .from('subjects')
            .insert({
              name: formData.subject.trim(),
              teacher_id: signUpData.user.id
            });
          if (subjectError) throw subjectError;
        }

        setStatus(prev => ({ ...prev, [role]: { type: 'success', msg: `${role === 'student' ? 'Ученик' : 'Учитель'} ${fullName} создан!` } }));
        setFormData(initialFormState);
        fetchUsers(); // Обновляем список
      }
    } catch (err: any) {
      setStatus(prev => ({ ...prev, [role]: { type: 'error', msg: err.message || 'Ошибка при создании' } }));
    } finally {
      setLoading(prev => ({ ...prev, [role]: false }));
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) fetchUsers();
  };

  const handleUpdatePosition = async (userId: string, newPosition: string) => {
    const { error } = await supabase.from('profiles').update({ position: newPosition }).eq('id', userId);
    if (!error) fetchUsers();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Панель администратора</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Регистрация участников образовательного процесса</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Левое окошко: Регистрация Ученика */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-700">Новый ученик</h2>
          </div>
          <RegistrationForm 
            formData={studentData}
            setFormData={setStudentData}
            loading={loading.student}
            status={status.student}
            role="student"
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleCreateUser('student', studentData, setStudentData); }}
          />
        </section>

        {/* Правое окошко: Регистрация Учителя */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-700">Новый учитель</h2>
          </div>
          <RegistrationForm 
            formData={teacherData}
            setFormData={setTeacherData}
            loading={loading.teacher}
            status={status.teacher}
            role="teacher"
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleCreateUser('teacher', teacherData, setTeacherData); }}
          />
        </section>
      </div>

      {/* Секция управления должностями */}
      <section className="mt-16 space-y-6">
        <div className="flex items-center justify-between ml-2">
          <div className="flex items-center gap-3">
            <Settings2 className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-700">Управление должностями</h2>
          </div>
          <button onClick={fetchUsers} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <RefreshCw className={`w-4 h-4 text-slate-400 ${usersLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="p-6">ФИО</th>
                <th className="p-6">Роль</th>
                <th className="p-6">Предмет / Должность</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-bold text-slate-900">{u.full_name}</td>
                  <td className="p-6">
                    <select 
                      value={u.role} 
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="bg-transparent font-bold text-indigo-600 outline-none cursor-pointer"
                    >
                      <option value="student">Ученик</option>
                      <option value="teacher">Учитель</option>
                      <option value="director">Директор</option>
                    </select>
                  </td>
                  <td className="p-6">
                    {u.role !== 'student' ? (
                      <input 
                        type="text"
                        defaultValue={u.position || ''}
                        onBlur={(e) => handleUpdatePosition(u.id, e.target.value)}
                        placeholder="Введите должность (напр. Учитель истории)..."
                        className="bg-slate-50 px-4 py-2 rounded-xl border border-transparent focus:border-indigo-200 outline-none transition-all w-full max-w-[200px]"
                      />
                    ) : (
                      <span className="text-slate-300 italic">Ученик ({u.class_name})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RegistrationForm({ formData, setFormData, loading, status, role, onSubmit }: any) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Фамилия</label>
          <input 
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm"
            value={formData.lastName}
            onChange={e => setFormData({...formData, lastName: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Имя</label>
          <input 
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm"
            value={formData.firstName}
            onChange={e => setFormData({...formData, firstName: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Отчество</label>
          <input 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm"
            value={formData.middleName}
            onChange={e => setFormData({...formData, middleName: e.target.value})}
          />
        </div>
      </div>

      {role === 'student' && (
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Класс</label>
          <input 
            required
            placeholder="Например: 10"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm"
            value={formData.className}
            onChange={e => setFormData({...formData, className: e.target.value})}
          />
        </div>
      )}

      {role === 'teacher' && (
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1">Должность (как будет видно на сайте)</label>
          <input 
            required
            placeholder="Например: Учитель истории"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm"
            value={formData.subject}
            onChange={e => setFormData({...formData, subject: e.target.value})}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1 flex items-center gap-2"><Mail className="w-3 h-3" /> Email</label>
          <input 
            type="email"
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2 block ml-1 flex items-center gap-2"><Lock className="w-3 h-3" /> Пароль</label>
          <input 
            type="password"
            required
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {status.msg}
        </motion.div>
      )}

      <button 
        disabled={loading}
        className={`w-full text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl disabled:opacity-50 ${role === 'student' ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
      >
        {loading ? 'Создание...' : `Зарегистрировать ${role === 'student' ? 'ученика' : 'учителя'}`}
      </button>
    </form>
  );
}