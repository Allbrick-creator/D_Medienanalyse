-- ============================================================
-- Medienanalyse – Datenbankschema
-- Einmal komplett im Supabase SQL Editor ausführen.
-- ============================================================

-- UUID-Erweiterung
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELLEN
-- ============================================================

-- Anbieter (7 Stück, fix)
create table if not exists public.providers (
  id   uuid primary key default uuid_generate_v4(),
  name text not null unique,
  type text not null check (type in ('boulevard', 'oeffentlich', 'qualitaet'))
);

-- Benutzerprofile (verknüpft mit auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'bewerter' check (role in ('admin', 'bewerter', 'beobachter', 'lehrperson')),
  created_at timestamptz default now()
);

-- Erhebungseinstellungen (genau eine Zeile)
create table if not exists public.survey_settings (
  id   integer primary key default 1,
  day1 date,
  day2 date,
  day3 date,
  constraint single_row check (id = 1)
);
insert into public.survey_settings (id) values (1) on conflict do nothing;

-- Pakete (21 Stück: 7 Anbieter × 3 Tage)
create table if not exists public.packages (
  id          uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references public.providers(id),
  day         integer not null check (day in (1, 2, 3)),
  assigned_to uuid references public.profiles(id),
  status      text not null default 'offen' check (status in ('offen', 'in_arbeit', 'fertig')),
  constraint uq_package unique (provider_id, day)
);

-- Beiträge (Haupttabelle)
create table if not exists public.posts (
  id           uuid primary key default uuid_generate_v4(),
  package_id   uuid not null references public.packages(id),
  platform     text not null check (platform in ('instagram', 'tiktok', 'beide')),
  posted_at    timestamptz,
  format       text not null check (format in ('video', 'bild', 'karussell')),
  evaluated_by uuid not null references public.profiles(id),
  -- B: Thema
  topic_category text check (topic_category in ('hard_news', 'soft_news')),
  topic          text check (topic in (
    'Politik', 'Wirtschaft', 'Gesellschaft', 'Wissenschaft/Umwelt/Gesundheit',
    'Kriminalität/Unglück', 'Unterhaltung/Promis', 'Human Interest/Kurioses', 'Sport'
  )),
  -- C: Clickbait
  c1 boolean,
  c2 boolean,
  c3 boolean,
  c4 integer check (c4 between 1 and 4),
  -- D: Sachlichkeit
  d1 boolean,
  d2 boolean,
  d3 text check (d3 in ('ja', 'nein', 'nicht_relevant')),
  d4 integer check (d4 between 1 and 4),
  -- E: Emotionalisierung
  e1 boolean,
  e2 boolean,
  e3 boolean,
  e4 integer check (e4 between 1 and 4),
  -- F: W-Fragen
  f_wer   boolean not null default false,
  f_was   boolean not null default false,
  f_wann  boolean not null default false,
  f_wo    boolean not null default false,
  f_wie   boolean not null default false,
  f_warum boolean not null default false,
  f_score integer generated always as (
    f_wer::int + f_was::int + f_wann::int + f_wo::int + f_wie::int + f_warum::int
  ) stored,
  -- G: Beleg
  g_beleg    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kalibrierungs-Referenzbeiträge (die ~10 von euch ausgewählten Beiträge)
create table if not exists public.calibration_items (
  id          uuid primary key default uuid_generate_v4(),
  label       text not null unique,  -- z.B. "Beitrag 1", "Beitrag 2"
  posted_at   timestamptz,
  platform    text not null check (platform in ('instagram', 'tiktok')),
  provider_id uuid references public.providers(id),
  format      text check (format in ('video', 'bild', 'karussell')),
  created_at  timestamptz default now()
);

-- Kalibrierungs-Bewertungen (jede Person bewertet jeden Referenzbeitrag einmal)
create table if not exists public.calibration_posts (
  id                  uuid primary key default uuid_generate_v4(),
  calibration_item_id uuid not null references public.calibration_items(id) on delete cascade,
  evaluated_by        uuid not null references public.profiles(id),
  topic_category text check (topic_category in ('hard_news', 'soft_news')),
  topic          text,
  c1 boolean, c2 boolean, c3 boolean,
  c4 integer check (c4 between 1 and 4),
  d1 boolean, d2 boolean,
  d3 text check (d3 in ('ja', 'nein', 'nicht_relevant')),
  d4 integer check (d4 between 1 and 4),
  e1 boolean, e2 boolean, e3 boolean,
  e4 integer check (e4 between 1 and 4),
  f_wer   boolean not null default false,
  f_was   boolean not null default false,
  f_wann  boolean not null default false,
  f_wo    boolean not null default false,
  f_wie   boolean not null default false,
  f_warum boolean not null default false,
  f_score integer generated always as (
    f_wer::int + f_was::int + f_wann::int + f_wo::int + f_wie::int + f_warum::int
  ) stored,
  g_beleg    text,
  created_at timestamptz default now(),
  constraint uq_cal_eval unique (calibration_item_id, evaluated_by)
);

-- Hypothesen-Interpretationen (eine Zeile pro Hypothese, fix)
create table if not exists public.hypothesis_interpretations (
  id         text primary key check (id in ('h1','h2','h3','h4','h5','h6')),
  status     text check (status in ('bestaetigt', 'teilweise', 'widerlegt', 'offen')),
  text       text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);
insert into public.hypothesis_interpretations (id) values
  ('h1'), ('h2'), ('h3'), ('h4'), ('h5'), ('h6')
on conflict do nothing;

-- ============================================================
-- STARTDATEN
-- ============================================================

insert into public.providers (name, type) values
  ('Bild',            'boulevard'),
  ('20 Minuten',      'boulevard'),
  ('Tagesschau',      'oeffentlich'),
  ('ZDF heute',       'oeffentlich'),
  ('SRF News',        'oeffentlich'),
  ('NZZ',             'qualitaet'),
  ('Tages-Anzeiger',  'qualitaet')
on conflict do nothing;

-- 21 Pakete anlegen (7 Anbieter × 3 Tage)
do $$
declare
  p record;
  d integer;
begin
  for p in select id from public.providers loop
    for d in 1..3 loop
      insert into public.packages (provider_id, day)
      values (p.id, d)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- ============================================================
-- TRIGGER
-- ============================================================

-- Profil automatisch anlegen, wenn ein Benutzer im Dashboard erstellt wird
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'bewerter'
  )
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at automatisch aktualisieren
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- HILFSFUNKTION FÜR RLS
-- ============================================================

create or replace function public.get_user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles                  enable row level security;
alter table public.providers                 enable row level security;
alter table public.survey_settings           enable row level security;
alter table public.packages                  enable row level security;
alter table public.posts                     enable row level security;
alter table public.calibration_items         enable row level security;
alter table public.calibration_posts         enable row level security;
alter table public.hypothesis_interpretations enable row level security;

-- profiles: alle eingeloggten können lesen; eigenes Profil darf bewerter aktualisieren
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() and public.get_user_role() = 'bewerter');

-- providers: alle eingeloggten können lesen
create policy "providers_select" on public.providers
  for select using (auth.uid() is not null);

-- survey_settings: alle lesen; nur bewerter aktualisieren
create policy "settings_select" on public.survey_settings
  for select using (auth.uid() is not null);
create policy "settings_update" on public.survey_settings
  for update using (public.get_user_role() = 'bewerter');

-- packages: alle lesen; nur bewerter aktualisieren
create policy "packages_select" on public.packages
  for select using (auth.uid() is not null);
create policy "packages_update" on public.packages
  for update using (public.get_user_role() = 'bewerter');

-- posts: alle lesen; bewerter erfassen eigene; bewerter ändern/löschen eigene
create policy "posts_select" on public.posts
  for select using (auth.uid() is not null);
create policy "posts_insert" on public.posts
  for insert with check (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());
create policy "posts_update" on public.posts
  for update using (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());
create policy "posts_delete" on public.posts
  for delete using (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());

-- calibration_items: alle lesen; bewerter verwalten
create policy "cal_items_select" on public.calibration_items
  for select using (auth.uid() is not null);
create policy "cal_items_insert" on public.calibration_items
  for insert with check (public.get_user_role() = 'bewerter');
create policy "cal_items_update" on public.calibration_items
  for update using (public.get_user_role() = 'bewerter');
create policy "cal_items_delete" on public.calibration_items
  for delete using (public.get_user_role() = 'bewerter');

-- calibration_posts: alle lesen; bewerter erfassen/ändern/löschen eigene
create policy "cal_posts_select" on public.calibration_posts
  for select using (auth.uid() is not null);
create policy "cal_posts_insert" on public.calibration_posts
  for insert with check (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());
create policy "cal_posts_update" on public.calibration_posts
  for update using (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());
create policy "cal_posts_delete" on public.calibration_posts
  for delete using (public.get_user_role() = 'bewerter' and evaluated_by = auth.uid());

-- hypothesis_interpretations: alle lesen; nur bewerter aktualisieren
create policy "hypo_select" on public.hypothesis_interpretations
  for select using (auth.uid() is not null);
create policy "hypo_update" on public.hypothesis_interpretations
  for update using (public.get_user_role() = 'bewerter');
