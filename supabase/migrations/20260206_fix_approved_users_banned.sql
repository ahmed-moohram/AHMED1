-- Fix users who were incorrectly marked as banned after approval
-- This ensures that approved users are not banned
update public.profiles
set is_banned = false
where approval_status = 'approved' 
  and is_banned = true;

-- Also ensure pending users are not banned (they should wait for approval)
update public.profiles
set is_banned = false
where approval_status = 'pending' 
  and is_banned = true;

