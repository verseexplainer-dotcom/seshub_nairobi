-- Promote the SES owner account to active admin and prevent self-created
-- profile rows from choosing staff/admin roles.

CREATE OR REPLACE FUNCTION public.is_bootstrap_admin_email(email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(trim(coalesce(email, ''))) = 'sesicthub224@gmail.com';
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_profile_role(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_bootstrap_admin_email(email) THEN 'admin'
    ELSE 'customer'
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    default_location,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', ''),
    nullif(NEW.raw_user_meta_data ->> 'default_location', ''),
    public.bootstrap_profile_role(NEW.email),
    true
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    role = CASE
      WHEN public.is_bootstrap_admin_email(NEW.email) THEN 'admin'
      ELSE public.profiles.role
    END,
    is_active = CASE
      WHEN public.is_bootstrap_admin_email(NEW.email) THEN true
      ELSE public.profiles.is_active
    END;

  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (
  user_id,
  full_name,
  phone,
  default_location,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT
  u.id,
  nullif(u.raw_user_meta_data ->> 'full_name', ''),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  nullif(u.raw_user_meta_data ->> 'default_location', ''),
  public.bootstrap_profile_role(u.email),
  true,
  coalesce(u.created_at, now()),
  now()
FROM auth.users u
WHERE public.is_bootstrap_admin_email(u.email)
ON CONFLICT (user_id) DO UPDATE
SET
  role = 'admin',
  is_active = true,
  updated_at = now();

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'customer'
    AND is_active = true
  );
