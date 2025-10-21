export interface ChatMessage {
  teamId: string;
  type: 'system' | 'user';
  sender: string;
  senderId: string;
  message: string;
  createdAt: Date;
}
