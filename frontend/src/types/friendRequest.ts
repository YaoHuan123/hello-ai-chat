export type FriendRequestItem = {
  id: number;
  fromUserId: string;
  toUserId: string;
  fromPhone: string;
  toPhone: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: number;
  decidedAt: number | null;
};
