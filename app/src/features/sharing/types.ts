export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked" | "expired";

export interface InvitationPreview {
  status: InvitationStatus;
  requiresAuthentication: boolean;
  trip?: {
    title: string;
    destination: { cityName?: string; countryName?: string } | null;
    startDateTime?: string;
    endDateTime?: string;
  };
  ownerDisplayName?: string;
  invitedEmailMasked?: string;
}

export interface CreateInvitationResult {
  invitationId: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface PendingInvitation {
  invitationId: string;
  invitedEmailMasked: string;
  status: InvitationStatus;
  role: string;
  createdAt: string;
  expiresAt: string;
}
