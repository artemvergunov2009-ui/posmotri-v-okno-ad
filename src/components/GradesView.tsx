import { useAuth } from '../App';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';

export default function GradesView() {
  const { profile } = useAuth();
  if (!profile) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Успеваемость и проверка</h1>
      {profile.role === 'student' ? (
        <StudentDashboard forcedView="grades" />
      ) : (
        <TeacherDashboard forcedView="grading" />
      )}
    </div>
  );
}
