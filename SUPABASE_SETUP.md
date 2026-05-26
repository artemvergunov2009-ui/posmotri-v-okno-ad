# Настройка Supabase для LMS Peschanoe

Скопируйте и выполните этот SQL-запрос в разделе **SQL Editor** вашей панели Supabase, чтобы создать необходимые таблицы и настроить права доступа.

```sql
-- 1. Создание таблицы профилей (связана с auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('director', 'teacher', 'student')) DEFAULT 'student',
  class_name TEXT,
  position TEXT, -- Новое поле для должности/титула
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Исправление для существующих таблиц (если колонки не были созданы ранее)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_info TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- 2. Создание таблицы предметов
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Создание таблицы уроков
CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  glossary TEXT,
  target_grade INTEGER DEFAULT 1,
  deadline TIMESTAMPTZ NOT NULL,
  file_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS target_grade INTEGER DEFAULT 1;

-- 4. Создание таблицы решений (домашних работ)
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_urls TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  grade TEXT,
  grade_coefficient INTEGER DEFAULT 1,
  grade_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

-- 5. Включение Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 6. Создание политик доступа (Policies)

-- Профили: чтение разрешено всем, обновление только своего
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "System can insert profiles" ON profiles;
CREATE POLICY "System can insert profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Предметы: чтение всем
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON subjects;
CREATE POLICY "Subjects are viewable by everyone" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage their subjects" ON subjects;
CREATE POLICY "Teachers can manage their subjects" ON subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);

-- Уроки: чтение всем
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON lessons;
CREATE POLICY "Lessons are viewable by everyone" ON lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage lessons" ON lessons;
CREATE POLICY "Teachers can manage lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);

-- Решения: ученик видит свои, учитель видит все
DROP POLICY IF EXISTS "Students can manage own submissions" ON submissions;
CREATE POLICY "Students can manage own submissions" ON submissions FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can view all submissions" ON submissions;
CREATE POLICY "Teachers can view all submissions" ON submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);

DROP POLICY IF EXISTS "Teachers can update submissions" ON submissions;
CREATE POLICY "Teachers can update submissions" ON submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);

-- 7. Функция для автоматического создания профиля при регистрации (опционально)
-- Если вы используете Supabase Auth UI, это полезно:
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/

-- 8. Настройка хранилища (Storage)
-- В консоли Supabase перейдите в Storage и создайте бакет с именем 'materials'.
-- Сделайте его ПУБЛИЧНЫМ (Public), либо добавьте следующие политики:

-- CREATE POLICY "Allow public read materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
-- CREATE POLICY "Allow teacher upload materials" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'materials' AND 
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'director'))
-- );
```

## Как создать начальных пользователей:
1. Зайдите в раздел **Authentication** -> **Users** в Supabase.
2. Нажмите **Add User** -> **Create new user**.
3. Введите Email и Пароль из списка ниже.
4. После создания пользователя зайдите в таблицу `profiles` и добавьте запись с соответствующим `id` (UID), именем и ролью.

### Список пользователей для добавления:
- **Вергунов Артём Алексеевич** (учитель)
  Email: `vergunov09artyom@mail.ru`
  Пароль: `06_Artyom`
- **Гуков Вячеслав Дмитриевич** (директор)
  Email: `peschanoe-shkolagukov@yandex.ru`
  Пароль: `Gukov_Director`
- **Плотникова Ольга Петровна** (учитель)
  Email: `plotnikovaolga2000@yandex.ru`
  Пароль: `plotnikova-olga-10`
