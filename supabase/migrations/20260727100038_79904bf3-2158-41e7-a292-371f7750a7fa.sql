
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','employee','employer');
CREATE TYPE public.employee_status AS ENUM ('dormant','pending_activation','active','suspended','in_service');
CREATE TYPE public.reservation_status AS ENUM ('pending_payment','payment_reported','confirmed','in_service','completed','cancelled');
CREATE TYPE public.application_status AS ENUM ('pending','accepted','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS SETOF public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- EMPLOYEE PROFILES
CREATE TABLE public.employee_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  location_text TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  price_fee INTEGER DEFAULT 0,
  bio TEXT,
  status public.employee_status NOT NULL DEFAULT 'dormant',
  license_category TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  license_front_url TEXT,
  license_back_url TEXT,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_profiles TO authenticated;
GRANT SELECT ON public.employee_profiles TO anon;
GRANT ALL ON public.employee_profiles TO service_role;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;

-- JOBS
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  location TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  requires_resume BOOLEAN NOT NULL DEFAULT true,
  requires_cover_letter BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- APPLICATIONS
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_url TEXT,
  cover_letter TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, employee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RESERVATIONS
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.reservation_status NOT NULL DEFAULT 'pending_payment',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- MESSAGES (user <-> admin)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  from_admin BOOLEAN NOT NULL DEFAULT false,
  thread_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- PAYMENTS (simulated MoMo)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  amount INTEGER NOT NULL,
  momo_code TEXT,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- SETTINGS (singleton key/value)
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.settings FOR SELECT USING (true);
CREATE POLICY "admins manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- POLICIES: profiles
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "public read basic profile" ON public.profiles FOR SELECT TO anon USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- POLICIES: user_roles
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "self assign employee/employer" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('employee','employer'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: employee_profiles
CREATE POLICY "public sees active employees" ON public.employee_profiles FOR SELECT
  USING (status IN ('active','in_service') OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own employee insert" ON public.employee_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own employee update" ON public.employee_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete employee" ON public.employee_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- POLICIES: jobs
CREATE POLICY "public jobs readable" ON public.jobs FOR SELECT
  USING (is_public = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage jobs" ON public.jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: applications
CREATE POLICY "own applications" ON public.applications FOR SELECT TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "employees apply" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());
CREATE POLICY "admin update applications" ON public.applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- POLICIES: reservations
CREATE POLICY "reservation visibility" ON public.reservations FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR employee_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "employer creates reservation" ON public.reservations FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid());
CREATE POLICY "employer or admin updates reservation" ON public.reservations FOR UPDATE TO authenticated
  USING (employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (employer_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- POLICIES: messages
CREATE POLICY "read own thread" ON public.messages FOR SELECT TO authenticated
  USING (thread_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "post in own thread" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND (
      (from_admin = false AND thread_user_id = auth.uid())
      OR (from_admin = true AND public.has_role(auth.uid(),'admin'))
    )
  );

-- POLICIES: payments
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user reports payment" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin confirms payment" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed settings
INSERT INTO public.settings(key, value) VALUES
  ('registration_fee','2000'),
  ('client_fee','1000'),
  ('subscription_days','30'),
  ('momo_code','*182*8*1*332991'),
  ('admin_phone','+250 788 000 000')
ON CONFLICT (key) DO NOTHING;
