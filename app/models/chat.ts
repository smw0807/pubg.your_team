export interface ChatMessage {
  id?: string;
  type: 'system' | 'user';
  uid: string;
  sender: string;
  senderId: string;
  message: string;
  createdAt: Date;
}
