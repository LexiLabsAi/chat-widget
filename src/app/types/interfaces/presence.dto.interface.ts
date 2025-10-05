export interface PresenceDto {
  tenantId: string;
  userId: string;
  status: 'Online' | 'Offline';
  at: string;
}
