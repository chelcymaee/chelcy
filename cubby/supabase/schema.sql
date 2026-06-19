-- Users/profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'traveller', -- traveller | host | runner | both
  is_verified boolean default false,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Bank details for hosts
create table if not exists bank_details (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  bank text not null,
  account_holder text not null,
  account_number text not null,
  branch_code text not null,
  account_type text not null default 'Cheque / Current',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table bank_details enable row level security;
create policy "Hosts can manage own bank details" on bank_details for all using (auth.uid() = user_id);

-- Host listings
create table if not exists hosts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null,
  bio text,
  avatar_url text,
  location_name text,
  latitude float,
  longitude float,
  business_type text not null default 'home',
  photos text[] default '{}',
  price_per_bag_per_day integer not null default 60,
  max_bags integer not null default 4,
  available_from text default '08:00',
  available_until text default '20:00',
  available_days text[] default '{Mon,Tue,Wed,Thu,Fri,Sat,Sun}',
  rating float default 0,
  review_count integer default 0,
  response_rate integer default 100,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table hosts enable row level security;
create policy "Hosts are publicly viewable" on hosts for select using (true);
create policy "Hosts can manage own listing" on hosts for all using (auth.uid() = user_id);

-- Bookings
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  traveller_id uuid references auth.users(id) on delete cascade not null,
  host_id uuid references hosts(id) not null,
  drop_off_date text not null,
  drop_off_time text not null,
  pick_up_date text not null,
  pick_up_time text not null,
  bag_count integer not null default 1,
  total_price integer not null,
  status text not null default 'confirmed',
  pin_code text not null,
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "Travellers can view own bookings" on bookings for select using (auth.uid() = traveller_id);
create policy "Travellers can create bookings" on bookings for insert with check (auth.uid() = traveller_id);
create policy "Hosts can view bookings for their listing" on bookings for select using (
  exists (select 1 from hosts where hosts.id = bookings.host_id and hosts.user_id = auth.uid())
);

-- Reviews
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id) on delete cascade not null,
  reviewer_id uuid references auth.users(id) on delete cascade not null,
  host_id uuid references hosts(id) not null,
  reviewer_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  tags text[] default '{}',
  created_at timestamptz default now()
);
alter table reviews enable row level security;
create policy "Reviews are publicly viewable" on reviews for select using (true);
create policy "Travellers can create reviews" on reviews for insert with check (auth.uid() = reviewer_id);

-- -------------------------------------------------------------------------
-- Payment & payout additions
-- -------------------------------------------------------------------------

-- Host bank details (keyed by host listing id)
CREATE TABLE IF NOT EXISTS host_bank_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE,
  account_holder TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Cheque',
  branch_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE host_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bank details" ON host_bank_details FOR ALL USING (true);

-- Payment & payout columns on bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS host_payout_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cubby_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_id TEXT;

-- Saved spots (travellers bookmarking hosts)
CREATE TABLE IF NOT EXISTS saved_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES hosts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, host_id)
);
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved spots" ON saved_spots FOR ALL USING (auth.uid() = user_id);

-- Partner applications
CREATE TABLE IF NOT EXISTS partner_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  location TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a partner application" ON partner_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all applications" ON partner_applications FOR SELECT USING (true);

-- Allow travellers to update their own bookings (needed for cancellation)
CREATE POLICY "Travellers can update own bookings" ON bookings FOR UPDATE USING (auth.uid() = traveller_id);
