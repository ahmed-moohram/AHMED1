-- RPC function to allow admins to delete a user completely from auth.users
-- This requires the function to run with SECURITY DEFINER so it can access auth schema
CREATE OR REPLACE FUNCTION delete_user_by_id(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if the calling user is an admin (has role = 'admin' in profiles)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
  ) THEN
    RAISE EXCEPTION 'غير مسموح: يجب أن تكون مسؤولاً';
  END IF;

  -- Delete credentials
  DELETE FROM public.student_credentials WHERE user_id = target_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete the auth user
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user_by_id(uuid) TO authenticated;
