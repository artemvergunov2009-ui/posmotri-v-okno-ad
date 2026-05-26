/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AboutUs from './components/AboutUs';
import LessonPage from './components/LessonPage';
import DeadlineObserver from './components/DeadlineObserver';
import HomeView from './components/HomeView';
import EducationView from './components/EducationView';
import GradesView from './components/GradesView';
import ProfileView from './components/ProfileView';
import ClassmatesView from './components/ClassmatesView';
import DeveloperTools from './components/DeveloperTools';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationSystem from '@/components/NotificationSystem';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <AuthContext.Provider value={{ user, profile, loading }}>
        <NotificationSystem />
        <DeadlineObserver />
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/" element={user ? <Dashboard><HomeView /></Dashboard> : <Navigate to="/login" />} />
              <Route path="/education" element={user ? <Dashboard><EducationView /></Dashboard> : <Navigate to="/login" />} />
              <Route path="/grades" element={user ? <Dashboard><GradesView /></Dashboard> : <Navigate to="/login" />} />
              <Route path="/classmates" element={user ? <Dashboard><ClassmatesView /></Dashboard> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Dashboard><ProfileView /></Dashboard> : <Navigate to="/login" />} />
              <Route path="/dev" element={user && profile?.email === 'vergunov09artyom@mail.ru' ? <Dashboard><DeveloperTools /></Dashboard> : <Navigate to="/" />} />
              <Route path="/lesson/:lessonId" element={user ? <Dashboard><LessonPage /></Dashboard> : <Navigate to="/login" />} />
            </Routes>
          </div>
        </Router>
      </AuthContext.Provider>
    </NotificationProvider>
  );
}
