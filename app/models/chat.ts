export interface ChatMessage {
  type: 'system' | 'user';
  uid: string;
  sender: string;
  senderId: string;
  message: string;
  createdAt: Date;
}
