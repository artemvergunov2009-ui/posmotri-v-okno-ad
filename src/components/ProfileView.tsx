import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCircle, Mail, Shield, Save, X, Edit3, Type, GraduationCap, Menu } from 'lucide-react';
import { useAuth } from '../App';
import { useNotification } from '@/contexts/NotificationContext'; // Изменено на алиас

interface UserProfileData {
  full_name: string;
  class_name: string;
  contact_info: string;
  role: 'director' | 'teacher' | 'student';
  email: string;
  id: string;
}

export default function ProfileView() {
  const { profile, user } = useAuth() as { profile: UserProfileData | null, user: any };
  const [editing, setEditing] = useState(false);
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    class_name: profile?.class_name || '',
    contact_info: profile?.contact_info || ''
  });

  useEffect(() => {
    if (profile && !editing) {
      setFormData({
        full_name: profile.full_name || '',
        class_name: profile.class_name || '',
        contact_info: profile.contact_info || ''
      });
    }
  }, [profile, editing]);

  if (!profile) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      // Получаем свежую сессию напрямую, чтобы исключить ошибки авторизации
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || user?.id || profile?.id;
      
      if (!currentUserId) throw new Error('Сессия пользователя не найдена. Пожалуйста, перевойдите в аккаунт.');
      
      if (!formData.full_name.trim()) {
        throw new Error('Имя пользователя не может быть пустым.');
      }

      console.log('Попытка обновления профиля для ID:', currentUserId);
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          class_name: formData.class_name,
          contact_info: formData.contact_info,
        })
        .eq('id', currentUserId)
        .select()
        .single();

      if (updateError) {
        console.error('Ошибка Supabase:', updateError);
        throw new Error(updateError.message);
      }
      
      if (!updateData) throw new Error('Запись профиля не найдена в базе данных');
      
      showNotification('Профиль успешно обновлен!', 'success');
      setEditing(false);
      
      // Вместо жесткой перезагрузки лучше дать уведомлению отобразиться
    } catch (err) {
      console.error('Полная ошибка при сохранении:', err);
      const errorMessage = err instanceof Error ? err.message : 'Не удалось обработать ошибку базы данных';
      showNotification('Ошибка при сохранении: ' + errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Личный кабинет</h1>
        {!editing ? (
          <button 
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
          >
            <Edit3 className="w-4 h-4" /> Редактировать
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg"
            >
              <Save className="w-4 h-4" /> {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button 
              onClick={() => {
                setEditing(false);
                setFormData({
                  full_name: profile.full_name,
                  class_name: profile.class_name,
                  contact_info: profile.contact_info
                });
              }}
              className="flex items-center gap-2 bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              <X className="w-4 h-4" /> Отмена
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:block">
          <button 
            onClick={() => setShowCard(!showCard)}
            className="lg:hidden w-full mb-4 flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500"
          >
            <span className="flex items-center gap-3"><UserCircle className="w-5 h-5 text-indigo-400" /> Профиль</span>
            {showCard ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          
          <div className={`${showCard ? 'flex' : 'hidden'} lg:flex bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex-col items-center text-center transition-all`}>
          <div className="w-32 h-32 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
            <UserCircle className="w-20 h-20 text-indigo-200" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            {editing ? (
              <input 
                value={formData.full_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full text-center border-b-2 border-indigo-500 outline-none p-1"
                placeholder="ФИО"
              />
            ) : profile.full_name}
          </h2>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">{profile.role === 'director' ? 'Директор' : profile.role === 'teacher' ? 'Учитель' : 'Ученик'}</span>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
              {editing ? (
                <input 
                  value={formData.class_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, class_name: e.target.value })}
                  className="bg-transparent border-b border-slate-300 outline-none w-16 text-center"
                  placeholder="Класс"
                />
              ) : profile.class_name || 'Персонал'}
            </span>
          </div>
          <div className="w-full space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 text-slate-500">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-mono truncate max-w-[150px]">ID: {user?.id}</span>
            </div>
          </div>
        </div>
        </div>

        {/* Detailed Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Type className="w-4 h-4" /> Личная информация
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Контактные данные</label>
                {editing ? (
                  <textarea 
                    value={formData.contact_info}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, contact_info: e.target.value })}
                    placeholder="Телефон, ссылки на соцсети и т.д."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-600"
                  />
                ) : (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 font-medium leading-relaxed italic">
                    {profile.contact_info || 'Информация не указана...'}
                  </div>
                )}
              </div>

              {profile.role === 'student' && (
                <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <GraduationCap className="text-indigo-600 w-5 h-5" />
                    <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Успеваемость и статус</h4>
                  </div>
                  <p className="text-xs text-indigo-700/80 font-medium leading-relaxed">
                    Вы зарегистрированы как учащийся Песчанской СОШ. Все ваши работы и оценки доступны во вкладке "Успеваемость".
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Статус безопасности</p>
              <div className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Защищено SSL/End-to-End
              </div>
            </div>
            <Shield className="w-8 h-8 text-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
