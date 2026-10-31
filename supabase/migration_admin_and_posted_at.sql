-- ============================================================
-- Migration: link → posted_at  +  Admin-Schreibrechte
-- Im Supabase SQL-Editor einmalig ausführen.
-- ============================================================

-- ── 1. Spalten umbenennen ─────────────────────────────────────

ALTER TABLE public.posts
  DROP COLUMN IF EXISTS link;
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

ALTER TABLE public.calibration_items
  DROP COLUMN IF EXISTS link;
ALTER TABLE public.calibration_items
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;


-- ── 2. Hilfsfunktion: Admin-oder-Bewerter prüfen ─────────────

CREATE OR REPLACE FUNCTION public.is_admin_or_bewerter()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.get_user_role() IN ('admin', 'bewerter');
$$;


-- ── 3. RLS-Policies aktualisieren ────────────────────────────
-- Alle bestehenden schreibenden Policies werden ersetzt,
-- damit Admin (= 'admin') dieselben Rechte wie Bewerter hat,
-- plus vollständiger Zugriff ohne Eigentümerbeschränkung.

-- profiles: Admin darf alle Profile aktualisieren, Bewerter nur eigenes
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
    OR (id = auth.uid() AND public.get_user_role() = 'bewerter')
  );

-- survey_settings: Admin und Bewerter dürfen aktualisieren
DROP POLICY IF EXISTS "settings_update" ON public.survey_settings;
CREATE POLICY "settings_update" ON public.survey_settings
  FOR UPDATE USING (public.is_admin_or_bewerter());

-- packages: Admin und Bewerter dürfen aktualisieren
DROP POLICY IF EXISTS "packages_update" ON public.packages;
CREATE POLICY "packages_update" ON public.packages
  FOR UPDATE USING (public.is_admin_or_bewerter());

-- packages: Admin darf auch insert/delete (für Verteilplan-Reset)
DROP POLICY IF EXISTS "packages_insert" ON public.packages;
CREATE POLICY "packages_insert" ON public.packages
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "packages_delete" ON public.packages;
CREATE POLICY "packages_delete" ON public.packages
  FOR DELETE USING (public.get_user_role() = 'admin');

-- posts: Admin darf alle, Bewerter nur eigene
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
CREATE POLICY "posts_insert" ON public.posts
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

DROP POLICY IF EXISTS "posts_update" ON public.posts;
CREATE POLICY "posts_update" ON public.posts
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_delete" ON public.posts
  FOR DELETE USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

-- calibration_items: Admin und Bewerter dürfen verwalten
DROP POLICY IF EXISTS "cal_items_insert" ON public.calibration_items;
CREATE POLICY "cal_items_insert" ON public.calibration_items
  FOR INSERT WITH CHECK (public.is_admin_or_bewerter());

DROP POLICY IF EXISTS "cal_items_update" ON public.calibration_items;
CREATE POLICY "cal_items_update" ON public.calibration_items
  FOR UPDATE USING (public.is_admin_or_bewerter());

DROP POLICY IF EXISTS "cal_items_delete" ON public.calibration_items;
CREATE POLICY "cal_items_delete" ON public.calibration_items
  FOR DELETE USING (public.is_admin_or_bewerter());

-- calibration_posts: Admin darf alle, Bewerter nur eigene
DROP POLICY IF EXISTS "cal_posts_insert" ON public.calibration_posts;
CREATE POLICY "cal_posts_insert" ON public.calibration_posts
  FOR INSERT WITH CHECK (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

DROP POLICY IF EXISTS "cal_posts_update" ON public.calibration_posts;
CREATE POLICY "cal_posts_update" ON public.calibration_posts
  FOR UPDATE USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

DROP POLICY IF EXISTS "cal_posts_delete" ON public.calibration_posts;
CREATE POLICY "cal_posts_delete" ON public.calibration_posts
  FOR DELETE USING (
    public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'bewerter' AND evaluated_by = auth.uid())
  );

-- hypothesis_interpretations: Admin und Bewerter dürfen aktualisieren
DROP POLICY IF EXISTS "hypo_update" ON public.hypothesis_interpretations;
CREATE POLICY "hypo_update" ON public.hypothesis_interpretations
  FOR UPDATE USING (public.is_admin_or_bewerter());
