create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  event_name text not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Users can insert their own events"
on public.events
for insert
to authenticated
with check (auth.uid() = user_id);
