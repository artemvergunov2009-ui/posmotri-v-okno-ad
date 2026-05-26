import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Критическая ошибка: Данные Supabase не найдены в .env файле. Убедитесь, что файл существует и переменные начинаются с VITE_');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
