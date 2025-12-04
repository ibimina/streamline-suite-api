
export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  accountId?: string;
  tokenVersion?: number;
  iat?: number; // issued at
}