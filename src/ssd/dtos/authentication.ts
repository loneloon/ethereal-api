export interface SessionCookieDto {
  name: "SESS_ID";
  data: string;
  expiresAt: Date;
  domain?: string;
}

export interface ApplicationKeysDto {
  accessKeyId: string;
  secretAccessKey: string;
  backupCode: string;
}
