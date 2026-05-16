PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bid_contractors (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  main_phone TEXT,
  main_email TEXT,
  notes TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_contractors_org_name_unique
  ON bid_contractors(organization_id, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_bid_contractors_organization_id
  ON bid_contractors(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_contractors_org_name
  ON bid_contractors(organization_id, name);

CREATE TABLE IF NOT EXISTS bid_contractor_contacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (contractor_id) REFERENCES bid_contractors(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bid_contractor_contacts_organization_id
  ON bid_contractor_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_contractor_contacts_org_contractor_id
  ON bid_contractor_contacts(organization_id, contractor_id);
CREATE INDEX IF NOT EXISTS idx_bid_contractor_contacts_org_email
  ON bid_contractor_contacts(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_bid_contractor_contacts_org_last_name
  ON bid_contractor_contacts(organization_id, last_name);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  bid_amount_cents INTEGER,
  contractor_id TEXT,
  contact_id TEXT,
  manual_contractor_name TEXT,
  manual_contact_name TEXT,
  manual_contact_phone TEXT,
  manual_contact_email TEXT,
  date_submitted TEXT,
  last_followed_up_date TEXT,
  next_follow_up_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'pending_award', 'awarded', 'lost', 'on_hold')
  ),
  notes TEXT,
  responsible_user_id TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (contractor_id) REFERENCES bid_contractors(id) ON DELETE SET NULL,
  FOREIGN KEY (contact_id) REFERENCES bid_contractor_contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bids_organization_id
  ON bids(organization_id);
CREATE INDEX IF NOT EXISTS idx_bids_org_status
  ON bids(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_org_contractor_id
  ON bids(organization_id, contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_org_contact_id
  ON bids(organization_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_bids_org_responsible_user_id
  ON bids(organization_id, responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_bids_org_date_submitted
  ON bids(organization_id, date_submitted);
CREATE INDEX IF NOT EXISTS idx_bids_org_last_followed_up_date
  ON bids(organization_id, last_followed_up_date);
CREATE INDEX IF NOT EXISTS idx_bids_org_next_follow_up_date
  ON bids(organization_id, next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_bids_org_status_next_follow_up_date
  ON bids(organization_id, status, next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_bids_org_status_date_submitted
  ON bids(organization_id, status, date_submitted);

CREATE TABLE IF NOT EXISTS bid_activity_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  bid_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  message TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bid_activity_log_organization_id
  ON bid_activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_activity_log_org_bid_id
  ON bid_activity_log(organization_id, bid_id);
CREATE INDEX IF NOT EXISTS idx_bid_activity_log_org_bid_created_at
  ON bid_activity_log(organization_id, bid_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bid_activity_log_org_user_id
  ON bid_activity_log(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bid_activity_log_org_action
  ON bid_activity_log(organization_id, action);
