export * from "./db/types";

import type { Organization, OrganizationMembership, User } from "./db/types";

export interface AuthPermissions {
  canRead: boolean;
  canWrite: boolean;
  canUseAutomations: boolean;
  isOwner: boolean;
}

export interface AuthContext extends AuthPermissions {
  user: User;
  organization: Organization;
  membership: OrganizationMembership;
}
