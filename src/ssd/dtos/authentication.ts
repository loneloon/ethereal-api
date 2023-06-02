export interface SessionCookieDto {
  name: "SESS_ID";
  data: string;
  expiresAt: Date;
  domain?: string;
}
