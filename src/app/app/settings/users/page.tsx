"use client";

import { FormEvent, useEffect, useState } from "react";

interface UserRecord {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: "owner" | "member";
  status: "active" | "removed";
  joinedAt: string | null;
  createdAt: string;
  removedAt: string | null;
  removedByUserId: string | null;
}

interface PendingInvite {
  inviteId: string;
  email: string;
  role: "owner" | "member";
  expiresAt: string;
  createdAt: string;
  invitedByUserId: string;
}

interface UsersPayload {
  ok: boolean;
  activeUsers?: UserRecord[];
  inactiveUsers?: UserRecord[];
  pendingInvites?: PendingInvite[];
  message?: string;
}

export default function UsersPage() {
  const [payload, setPayload] = useState<UsersPayload | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const response = await fetch("/api/company/users", { cache: "no-store" });
    const nextPayload = (await response.json()) as UsersPayload;
    setPayload(nextPayload);
  }

  useEffect(() => {
    let active = true;

    void fetch("/api/company/users", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextPayload: UsersPayload) => {
        if (active) {
          setPayload(nextPayload);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/company/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string; warning?: string; devOnlyInviteUrl?: string };
    setLoading(false);
    if (!response.ok || !result.ok) {
      setMessage(result.message ?? "Failed to invite user.");
      return;
    }

    setEmail("");
    setRole("member");
    setMessage(result.warning ?? result.devOnlyInviteUrl ?? "Invite created.");
    await loadUsers();
  }

  async function handleMembershipAction(membershipId: string, action: string) {
    const response = await fetch(`/api/company/users/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string };
    setMessage(result.ok ? "Updated user." : result.message ?? "Failed to update user.");
    await loadUsers();
  }

  async function handleInviteAction(path: string, inviteId: string) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    const result = (await response.json()) as { ok: boolean; message?: string; warning?: string; devOnlyInviteUrl?: string };
    setMessage(result.ok ? result.warning ?? result.devOnlyInviteUrl ?? "Updated invite." : result.message ?? "Failed to update invite.");
    await loadUsers();
  }

  if (!payload) {
    return <p>Loading...</p>;
  }

  if (!payload.ok) {
    return <p>{payload.message ?? "Only owners can manage users."}</p>;
  }

  function getDisplayName(user: UserRecord) {
    return user.displayName ?? (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unnamed User");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Users</h1>
        {message ? <p>{message}</p> : null}
      </div>

      <section className="flex max-w-md flex-col gap-3">
        <h2 className="text-xl font-semibold">Invite User</h2>
        <form className="flex flex-col gap-3" onSubmit={handleInvite}>
          <input className="border border-black px-3 py-2" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <select className="border border-black px-3 py-2" value={role} onChange={(event) => setRole(event.target.value as "member" | "owner")}>
            <option value="member">member</option>
            <option value="owner">owner</option>
          </select>
          <button className="border border-black px-3 py-2 text-left" disabled={loading} type="submit">
            {loading ? "Inviting..." : "Invite User"}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Active Users</h2>
        {(payload.activeUsers ?? []).map((user) => (
          <div className="flex flex-col gap-2 border border-black p-3" key={user.membershipId}>
            <p>{getDisplayName(user)}</p>
            <p>{user.email}</p>
            <p>Role: {user.role}</p>
            <div className="flex flex-wrap gap-2">
              {user.role === "member" ? (
                <button className="border border-black px-3 py-1" onClick={() => void handleMembershipAction(user.membershipId, "promote_to_owner")} type="button">
                  Make Owner
                </button>
              ) : (
                <button className="border border-black px-3 py-1" onClick={() => void handleMembershipAction(user.membershipId, "demote_to_member")} type="button">
                  Make Member
                </button>
              )}
              <button className="border border-black px-3 py-1" onClick={() => void handleMembershipAction(user.membershipId, "remove")} type="button">
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Pending Invites</h2>
        {(payload.pendingInvites ?? []).map((invite) => (
          <div className="flex flex-col gap-2 border border-black p-3" key={invite.inviteId}>
            <p>{invite.email}</p>
            <p>Role: {invite.role}</p>
            <p>Expires: {invite.expiresAt}</p>
            <div className="flex gap-2">
              <button className="border border-black px-3 py-1" onClick={() => void handleInviteAction("/api/invites/resend", invite.inviteId)} type="button">
                Resend
              </button>
              <button className="border border-black px-3 py-1" onClick={() => void handleInviteAction("/api/invites/revoke", invite.inviteId)} type="button">
                Cancel
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Inactive Users</h2>
        {(payload.inactiveUsers ?? []).map((user) => (
          <div className="flex flex-col gap-2 border border-black p-3" key={user.membershipId}>
            <p>{getDisplayName(user)}</p>
            <p>{user.email}</p>
            <p>Role: {user.role}</p>
            <p>Removed At: {user.removedAt ?? "Unknown"}</p>
            <button className="border border-black px-3 py-1" onClick={() => void handleMembershipAction(user.membershipId, "reactivate")} type="button">
              Reactivate
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
