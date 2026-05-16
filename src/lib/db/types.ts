export type UserStatus = "active" | "disabled" | "deleted";

export type OrganizationSubscriptionStatus =
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired";

export type MembershipRole = "owner" | "member";
export type MembershipStatus = "active" | "removed" | "invited";

export type EmailLogStatus = "pending" | "sent" | "failed";
export type BillingEventStatus = "received" | "processed" | "failed";
export type BidStatus = "active" | "pending_award" | "awarded" | "lost" | "on_hold";

export interface User {
  id: string;
  email: string;
  email_normalized: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  password_hash: string | null;
  password_salt: string | null;
  password_iters: number | null;
  password_algo: string | null;
  email_verified_at: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface Organization {
  id: string;
  name: string | null;
  slug: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  subscription_status: OrganizationSubscriptionStatus;
  plan_key: string | null;
  readonly_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  invited_by_user_id: string | null;
  joined_at: string | null;
  removed_at: string | null;
  removed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  email_normalized: string;
  role: MembershipRole;
  token_hash: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by_user_id: string;
  accepted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  user_agent: string | null;
  ip_hash: string | null;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface AccountSetupToken {
  id: string;
  organization_id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  to_email: string;
  from_email: string | null;
  subject: string;
  template_key: string | null;
  status: EmailLogStatus;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  payload_json: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface BillingEvent {
  id: string;
  organization_id: string | null;
  stripe_event_id: string | null;
  stripe_event_type: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: BillingEventStatus;
  payload_json: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ActivityLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface BidContractor {
  id: string;
  organization_id: string;
  name: string;
  website: string | null;
  main_phone: string | null;
  main_email: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidContractorContact {
  id: string;
  organization_id: string;
  contractor_id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  organization_id: string;
  project_name: string;
  bid_amount_cents: number | null;
  contractor_id: string | null;
  contact_id: string | null;
  manual_contractor_name: string | null;
  manual_contact_name: string | null;
  manual_contact_phone: string | null;
  manual_contact_email: string | null;
  date_submitted: string | null;
  last_followed_up_date: string | null;
  next_follow_up_date: string | null;
  status: BidStatus;
  notes: string | null;
  responsible_user_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BidActivityLog {
  id: string;
  organization_id: string;
  bid_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  message: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface BidListRow extends Bid {
  contractor_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  responsible_user_display_name: string | null;
  created_by_display_name: string | null;
  updated_by_display_name: string | null;
}
