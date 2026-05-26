import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '@/contexts/NotificationContext'; // Изменено на алиас
import { FileText, ArrowLeft, Send, CheckCircle, AlertCircle, Clock, BookOpen, Download, UserCheck, Trash2, Paperclip } from 'lucide-react';

export default function LessonPage() {
  const { lessonId } = useParams();
  const { profile, user } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const { showNotification } = useNotification();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const fetchSyncData = async () => {
    if (!lessonId || !user) return;
    setLoading(true);
    
    // Параллельная загрузка
    const [lessonRes, subRes] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', lessonId).single(),
      supabase.from('submissions').select('*').eq('lesson_id', lessonId).eq('student_id', user.id).maybeSingle()
    ]);

    if (!lessonRes.error) setLesson(lessonRes.data);
    if (!subRes.error) setSubmission(subRes.data);

    setLoading(false);
  };

  useEffect(() => {
    fetchSyncData();
  }, [lessonId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || !user) return;
    
    setSubmitting(true);
    try {
      // In a real app we'd upload to storage. Here we'll simulate the URLs for now but ensure row is inserted in DB.
      const mockFileUrls = files.map(f => `https://example.com/uploads/${f.name}`);
      
          // Step 1: Ensure submission
          const { error } = await supabase
            .from('submissions')
            .upsert({
              lesson_id: lesson.id,
              student_id: user.id,
              content: comment,
              file_urls: mockFileUrls,
              status: 'pending',
              created_at: new Date().toISOString()
            }, { onConflict: 'lesson_id,student_id' });
          
          if (error) throw error;
          showNotification('Задание успешно отправлено на проверку!', 'success');
          await fetchSyncData();
    } catch (err: any) {
      showNotification('Ошибка при отправке задания: ' + (err.message || 'Неизвестная ошибка'), 'error');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8 text-center">Загрузка...</div>;
  if (!lesson) return <div className="p-8 text-center">Урок не найден</div>;

  const deadline = new Date(lesson.deadline);
  const isExpired = new Date() > deadline;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest leading-none">Вернуться в кабинет</span>
        </Link>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-[3rem] overflow-hidden shadow-2xl shadow-indigo-100/50 border border-slate-100"
        >
          <div className="p-10 md:p-14 border-b border-slate-100 bg-indigo-600 text-white relative">
            <div className="relative z-10">
              <div className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Учебный материал</div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 leading-tight uppercase">{lesson.title}</h1>
              <div className="flex flex-wrap gap-6 items-center text-[10px] font-black uppercase tracking-widest">
                <div className="flex items-center gap-2 text-indigo-100">
                  <Clock className="w-4 h-4" />
                  Срок сдачи: {deadline.toLocaleString()}
                </div>
                {isExpired && !submission && (
                  <div className="bg-white text-indigo-600 px-3 py-1 rounded-full border border-white/30">
                    Время вышло
                  </div>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          </div>

          <div className="p-8 md:p-14 space-y-14">
            <section>
              <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Задание
              </h3>
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                 <div className="text-slate-800 leading-relaxed font-serif text-xl whitespace-pre-wrap">{lesson.content || 'Описание отсутствует'}</div>
              </div>
            </section>

            {lesson.glossary && (
              <section className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 font-black mb-3">Глоссарий</h3>
                <p className="text-indigo-900 text-sm leading-relaxed font-medium">{lesson.glossary}</p>
              </section>
            )}

            <section>
              <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-6">Прикрепленные материалы</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(lesson.file_urls || []).length > 0 ? (
                  lesson.file_urls.map((url: string, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-400 transition-all group">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <Download className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                         </div>
                         <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{url}</span>
                       </div>
                       <button className="text-[10px] font-black uppercase text-indigo-600 tracking-widest hover:underline">Скачать</button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs font-medium italic py-10 text-center w-full col-span-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Дополнительные файлы отсутствуют</p>
                )}
              </div>
            </section>

            <section className="pt-14 border-t border-slate-100">
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Статус выполнения</h2>
                 <AnimatePresence>
                 {submission && (
                   <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`text-[10px] uppercase font-black tracking-widest py-2 px-4 rounded-full border ${
                     submission.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-50' : 
                     submission.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-50' : 
                     'bg-red-50 text-red-700 border-red-200'
                   }`}>
                     {submission.status === 'pending' ? 'На проверке' : 
                      submission.status === 'accepted' ? 'Принято' : 'Отклонено'}
                   </motion.span>
                 )}
                 </AnimatePresence>
              </div>

              {profile?.role !== 'student' ? (
                <div className="bg-slate-100 p-12 rounded-[3rem] border border-slate-200 text-center">
                   <UserCheck className="w-12 h-12 text-slate-400 mx-auto mb-6" />
                   <h4 className="text-xl font-bold text-slate-600 uppercase">Режим просмотра (Учитель)</h4>
                   <p className="text-slate-400 text-sm mt-2">Учителя не сдают домашние задания. Вы можете просматривать контент урока.</p>
                </div>
              ) : submission ? (
                <div className="space-y-8">
                    <div className="bg-indigo-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                       <div className="relative z-10">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                             <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center backdrop-blur-md">
                                   <CheckCircle className={`w-10 h-10 ${submission.status === 'accepted' ? 'text-white' : 'text-indigo-300'}`} />
                                </div>
                                <div>
                                   <p className="text-2xl font-black uppercase tracking-tight">
                                      {submission.status === 'accepted' ? 'Работа проверена' : 'Ожидает учителя'}
                                   </p>
                                   <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Сдано: {new Date(submission.created_at).toLocaleString()}</p>
                                </div>
                             </div>

                             {submission.status === 'accepted' && (
                               <div className="flex gap-10 border-l border-white/20 pl-10">
                                  <div className="text-center">
                                     <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.2em] mb-2">Оценка</p>
                                     <p className="text-5xl font-black leading-none">{submission.grade}</p>
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.2em] mb-2">Коэфф.</p>
                                     <p className="text-2xl font-black leading-none">x{submission.grade_coefficient}</p>
                                  </div>
                               </div>
                             )}
                          </div>

                          {submission.grade_comment && (
                             <div className="mt-10 pt-8 border-t border-white/10 italic text-indigo-50 leading-relaxed font-medium">
                                "{submission.grade_comment}"
                             </div>
                          )}
                       </div>
                       <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full -mb-16 -mr-16 blur-2xl"></div>
                    </div>

              {submission.file_urls && submission.file_urls.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Прикрепленные файлы работы</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                     {submission.file_urls?.map((f: string, i: number) => (
                       <div key={i} className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-400 transition-all text-center">
                         <FileText className="w-8 h-8 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate w-full">{f.split('/').pop()}</span>
                       </div>
                     )) || <p className="text-xs text-slate-400">Файлы не были прикреплены</p>}
                  </div>
                </div>
              )}
                </div>
              ) : isExpired ? (
                <div className="bg-red-50 p-12 rounded-[3rem] border border-red-100 flex flex-col items-center text-center shadow-xl shadow-red-50">
                   <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center mb-8">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                   </div>
                   <h4 className="text-3xl font-black text-red-900 mb-3 uppercase tracking-tight">Срок сдачи истек</h4>
                   <p className="text-red-700 mb-8 max-w-md font-medium">Задание не было сдано вовремя. Система автоматически выставляет минимальную оценку.</p>
                   <div className="text-6xl font-black text-red-800 bg-white w-24 h-24 flex items-center justify-center rounded-[1.5rem] shadow-xl border border-red-100">2</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block ml-1">Комментарий к решению</label>
                    <textarea 
                      rows={5}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Опишите вкратце выполненную работу для учителя..."
                      className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block ml-1">Прикрепить файлы решения (макс. 10)</label>
                    <div 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="border-4 border-dashed border-slate-200 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer relative bg-slate-50 group"
                    >
                       <input 
                         id="file-upload"
                         type="file" 
                         multiple
                         onChange={e => {
                            const newFiles = Array.from(e.target.files || []);
                            setFiles(prev => [...prev, ...newFiles].slice(0, 10));
                         }}
                         className="hidden"
                       />
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-4">
                          <Paperclip className="w-8 h-8 text-slate-300 group-hover:text-indigo-500" />
                       </div>
                       <p className="text-sm font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 transition-colors">Нажмите, чтобы выбрать файлы</p>
                       <p className="text-[10px] mt-2 font-bold opacity-60 text-center">Перетащите сюда или кликните для обзора</p>
                    </div>
                    
                    {files.length > 0 && (
                      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {files.map((f, i) => (
                           <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                                <span className="text-[11px] font-bold text-slate-700 truncate">{f.name}</span>
                              </div>
                              <button type="button" onClick={() => removeFile(i)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    disabled={submitting}
                    className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200 group"
                  >
                    {submitting ? 'Идет отправка...' : <><Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Сдать на проверку</>}
                  </button>
                </form>
              )}
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
