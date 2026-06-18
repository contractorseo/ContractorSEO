CREATE TABLE cms_connections (
  id                   uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id          uuid         NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type                 text         NOT NULL DEFAULT 'wordpress',
  site_url             text         NOT NULL,
  username             text         NOT NULL,
  encrypted_credential text         NOT NULL,
  status               text         NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error')),
  created_at           timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE cms_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their cms_connections" ON cms_connections
  FOR ALL USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE INDEX cms_connections_business_id_idx ON cms_connections(business_id);
