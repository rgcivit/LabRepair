# Configuración de la Base de Datos en Supabase

Para que la sincronización funcione, debes crear las tablas en tu proyecto de Supabase. Sigue estos pasos:

1.  Entra en tu proyecto de [Supabase](https://supabase.com/).
2.  En el menú de la izquierda, haz clic en **"SQL Editor"**.
3.  Haz clic en **"+ New query"**.
4.  Copia y pega el siguiente código SQL y haz clic en **"Run"**:

```sql
-- Crear tabla de Órdenes de Trabajo
create table work_orders (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  client_name text,
  client_phone text,
  device_type text,
  brand_model text,
  serial_number text,
  issue_description text,
  estimated_budget numeric,
  priority text,
  status text default 'INGRESADO',
  entry_date date,
  accessories jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  spare_parts jsonb default '[]'::jsonb,
  diagnosis text,
  labor_cost numeric default 0,
  client_signature text,
  budget_details jsonb default '{}'::jsonb,
  qc_passed boolean default false,
  bench_test jsonb default '{}'::jsonb
);

-- Crear tabla de Inventario
create table inventory (
  id text primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text,
  equipment_type text,
  stock integer default 0,
  min_stock integer default 5,
  price numeric default 0,
  cost numeric default 0
);

-- Crear tabla de Configuraciones
create table settings (
  id text primary key default 'default_settings',
  data jsonb not null
);

-- Habilitar acceso público (Solo para desarrollo, luego se puede restringir con RLS)
alter table work_orders enable row level security;
create policy "Allow public access" on work_orders for all using (true) with check (true);

alter table inventory enable row level security;
create policy "Allow public access" on inventory for all using (true) with check (true);

alter table settings enable row level security;
create policy "Allow public access" on settings for all using (true) with check (true);
```

5. Una vez que veas el mensaje **"Success"**, avísame para que actualice el código de la aplicación.
