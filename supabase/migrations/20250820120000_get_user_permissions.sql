
create or replace function get_user_permissions(p_user_id uuid)
returns table (
  resource text,
  actions text[]
) as $$
begin
  return query
  with user_roles as (
    select "roleId" from "UserRole" where "userId" = p_user_id::text
  ),
  role_permissions as (
    select "permissionId" from "RolePermission" rp
    join user_roles ur on rp."roleId" = ur."roleId"
  )
  select
    p.resource,
    array_agg(p.action) as actions
  from "Permission" p
  join role_permissions rp on p.id = rp."permissionId"
  group by p.resource;
end;
$$ language plpgsql security definer;

-- Grant execution to authenticated users
grant execute on function get_user_permissions(uuid) to authenticated;
