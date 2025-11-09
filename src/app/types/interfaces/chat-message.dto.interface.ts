export interface ChatMessageDto {
  messageId: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp?: string;
  metadata?: { [key: string]: string };
}
