CREATE TABLE IF NOT EXISTS report_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);

ALTER TABLE report_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_tokens" ON report_tokens
  USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
