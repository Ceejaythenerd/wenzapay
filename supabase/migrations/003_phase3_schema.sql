-- Widget Events (for conversion funnel)
create table widget_events (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id),
  session_id   text not null, -- generated on client side
  step         text not null, -- 'opened' | 'network_selected' | 'address_shown' | 'payment_sent'
  metadata     jsonb,
  created_at   timestamptz default now()
);

-- Merchant Risk Rules
create table merchant_risk_rules (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid references merchants(id) on delete cascade,
  field        text not null, -- 'wallet_age_days' | 'country' | 'amount'
  operator     text not null, -- 'eq' | 'gt' | 'lt' | 'in'
  value        jsonb not null,
  action       text not null, -- 'allow' | 'review' | 'hold' | 'block'
  enabled      boolean default true,
  created_at   timestamptz default now()
);

-- RLS Policies
alter table widget_events enable row level security;
alter table merchant_risk_rules enable row level security;

-- Merchants can read their own widget events
create policy "merchants can read own widget events"
  on widget_events for select
  using (merchant_id = auth.uid());

-- Service role and anon can insert widget events (used by the public API endpoint)
create policy "anyone can insert widget events"
  on widget_events for insert
  with check (true);

-- Merchants can manage their own risk rules
create policy "merchants can read own risk rules"
  on merchant_risk_rules for select
  using (merchant_id = auth.uid());

create policy "merchants can insert own risk rules"
  on merchant_risk_rules for insert
  with check (merchant_id = auth.uid());

create policy "merchants can update own risk rules"
  on merchant_risk_rules for update
  using (merchant_id = auth.uid());

create policy "merchants can delete own risk rules"
  on merchant_risk_rules for delete
  using (merchant_id = auth.uid());
