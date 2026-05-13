export interface UserRecord {
  id: string;
  phone: string;
  created_at: string;
  token_version: number;
}

export interface JwtPayload {
  userId: string;
  phone: string;
  tv: number;
}

export interface AuthSuccessResponse {
  token: string;
  userId: string;
  phone: string;
}
