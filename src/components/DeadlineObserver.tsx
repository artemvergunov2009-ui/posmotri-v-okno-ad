import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';

export default function DeadlineObserver() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || profile?.role !== 'student') return;

    async function checkDeadlines() {
      if (!profile?.class_name) return;
      const studentGrade = parseInt(profile.class_name);
      const now = new Date();

      // Запрашиваем только уроки этого класса, которые уже просрочены
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, deadline')
        .eq('target_grade', studentGrade)
        .lt('deadline', now.toISOString()); // Фильтруем на сервере: дедлайн < сейчас

      if (lessonsError || !lessons) return;

      // 2. Get user's submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('lesson_id')
        .eq('student_id', user.id);

      if (submissionsError) return;

      const submittedLessonIds = new Set(submissions?.map(s => s.lesson_id));

      const expiredSubmissions = [];

      for (const lesson of lessons) {
        const deadline = new Date(lesson.deadline);
        if (now > deadline && !submittedLessonIds.has(lesson.id)) {
          expiredSubmissions.push({
            lesson_id: lesson.id,
            student_id: user.id,
            status: 'rejected',
            grade: '2',
            grade_comment: 'Домашнее задание отсутствует',
            grade_coefficient: 1,
            file_urls: [],
            created_at: new Date().toISOString()
          });
        }
      }

      if (expiredSubmissions.length > 0) {
        const { error: upsertError } = await supabase
          .from('submissions')
          .upsert(expiredSubmissions, { onConflict: 'lesson_id,student_id' });

        if (!upsertError) {
          console.log(`Auto-failed ${expiredSubmissions.length} lessons`);
        }
      }
    }

    checkDeadlines();
  }, [user, profile]);

  return null;
}
