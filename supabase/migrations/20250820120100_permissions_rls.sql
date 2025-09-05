
-- Enable RLS on all relevant tables
alter table "public"."UserRole" enable row level security;
alter table "public"."RolePermission" enable row level security;
alter table "public"."Permission" enable row level security;

-- Allow users to read their own roles
create policy "Allow users to read their own roles"
on "public"."UserRole" for select
using (auth.uid()::text = "userId");

-- Allow users to read permissions for their assigned roles
create policy "Allow users to read permissions for their roles"
on "public"."RolePermission" for select
using (
  exists (
    select 1 from "UserRole"
    where "UserRole"."userId" = auth.uid()::text
    and "UserRole"."roleId" = "RolePermission"."roleId"
  )
);

-- Allow users to read permissions that are linked to their roles
create policy "Allow users to read permissions linked to their roles"
on "public"."Permission" for select
using (
  exists (
    select 1 from "RolePermission"
    join "UserRole" on "RolePermission"."roleId" = "UserRole"."roleId"
    where "UserRole"."userId" = auth.uid()::text
    and "RolePermission"."permissionId" = "Permission".id
  )
);
