-- Fix missing RLS policy for merchant insertion during onboarding
CREATE POLICY "Merchants can insert their own profile"
  ON public.merchants FOR INSERT
  WITH CHECK (id = auth.uid());
