/**
 * 与后端 `POST /api/auth/sms/login` 响应一致。
 */
export type AuthResult = {
  token: string;
  userId: string;
  phone: string;
};
