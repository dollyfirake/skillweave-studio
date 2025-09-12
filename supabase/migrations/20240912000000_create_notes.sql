-- Create notes table
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  video_id text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, video_id)
);

-- Enable Row Level Security
alter table public.notes enable row level security;

-- Create policies for RLS
create policy "Users can view their own notes" 
on public.notes for select 
using (auth.uid() = user_id);

create policy "Users can insert their own notes"
on public.notes for insert
with check (auth.uid() = user_id);

create policy "Users can update their own notes"
on public.notes for update
using (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists idx_notes_user_video on public.notes(user_id, video_id);
