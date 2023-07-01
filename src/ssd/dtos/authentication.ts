export interface SessionCookieDto {
  name: "SESS_ID";
  data: string;
  expiresAt: Date;
  domain?: string;
}

export interface SessionStatus {
  isSessionAlive: boolean;
}

export interface ApplicationKeysDto {
  accessKeyId: string;
  secretAccessKey: string;
  backupCode: string;
}
