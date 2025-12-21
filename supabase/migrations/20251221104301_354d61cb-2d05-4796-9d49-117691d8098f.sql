-- 1) Add dismissed_at column to notifications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'dismissed_at'
  ) THEN
    ALTER TABLE public.notifications
      ADD COLUMN dismissed_at timestamptz NULL;
  END IF;
END$$;

-- 2) RPC: mark_notification_read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.notifications
  SET read_at = now()
  WHERE id = p_notification_id
    AND user_id = v_user_id;

  RETURN FOUND;
END;$$;

-- 3) RPC: dismiss_notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.notifications
  SET dismissed_at = now()
  WHERE id = p_notification_id
    AND user_id = v_user_id;

  RETURN FOUND;
END;$$;
