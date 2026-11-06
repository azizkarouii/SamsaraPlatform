export interface Notification {
  id: number;
  userId: number;
  reservationId: number;
  propertyId: number;
  type: string;
  title: string;
  message: string;
  /** Translation key and JSON parameters; absent on older notifications, which keep their French text. */
  messageKey?: string | null;
  messageParams?: string | null;
  isRead: boolean;
  createdAt: string;
}
