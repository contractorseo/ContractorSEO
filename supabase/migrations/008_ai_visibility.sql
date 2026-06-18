CREATE TABLE ai_visibility_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prompt_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_visibility_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their ai_visibility_prompts" ON ai_visibility_prompts
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE INDEX ai_visibility_prompts_biz_idx ON ai_visibility_prompts(business_id);

CREATE TABLE ai_visibility_checks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  engine text NOT NULL CHECK (engine IN ('openai', 'perplexity')),
  mentioned boolean NOT NULL DEFAULT false,
  snippet text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_visibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their ai_visibility_checks" ON ai_visibility_checks
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE INDEX ai_visibility_checks_biz_idx ON ai_visibility_checks(business_id);
CREATE INDEX ai_visibility_checks_at_idx  ON ai_visibility_checks(checked_at DESC);
