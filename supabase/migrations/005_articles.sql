-- ============================================================
-- ARTICLES (Content Studio)
-- ============================================================
CREATE TABLE articles (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  slug           TEXT        NOT NULL,
  meta_description TEXT,
  body_html      TEXT        NOT NULL DEFAULT '',
  faq_json       JSONB,
  schema_jsonld  JSONB,
  status         TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_for  TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  published_url  TEXT,
  cms_target     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Articles via business ownership" ON articles USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = articles.business_id
      AND businesses.user_id = auth.uid()
  )
);

CREATE INDEX articles_business_id_idx ON articles (business_id);
CREATE INDEX articles_status_idx      ON articles (status);
