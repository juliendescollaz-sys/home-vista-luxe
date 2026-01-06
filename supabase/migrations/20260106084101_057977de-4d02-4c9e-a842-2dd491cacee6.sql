-- Tighten access to rate limit table: service-role only
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow users to update their own pair codes only before they are used
DROP POLICY IF EXISTS "Users can update their own pair codes" ON public.pair_codes;

CREATE POLICY "Users can update their own pair codes"
ON public.pair_codes
FOR UPDATE
USING ((auth.uid())::text = user_id AND used_at IS NULL)
WITH CHECK ((auth.uid())::text = user_id);