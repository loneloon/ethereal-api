import { hash, genSalt } from "bcrypt";
import { isEqual, range } from "lodash";
import { DateTime } from "luxon";
import * as emoji from "emojilib";
import { SessionCookieDto } from "../dtos/authentication";

interface EncryptionService {
  encrypt: any;
  decrypt: any;
}

export class SecretProcessingService {
  constructor(readonly encryptionService: EncryptionService) {}

  public async generatePasswordHashAndSalt(
    password: string
  ): Promise<[string, string]> {
    const saltRounds: number = Math.floor(Math.random() * 10);

    const salt: string = await genSalt(saltRounds);
    const passHash: string = await hash(password, salt);

    return [passHash, salt];
  }

  public async generateUniqueHashString(): Promise<string> {
    const firstBitGroup = range(8)
      .map(
        () =>
          Object.keys(emoji)[
            Math.floor(Math.random() * (Object.keys(emoji).length - 1))
          ]
      )
      .join("");
    const secondBitGroup = DateTime.now().toISOTime()!.substring(0, 8);
    const thirdBitGroup = range(8)
      .map(
        () =>
          Object.keys(emoji)[
            Math.floor(Math.random() * (Object.keys(emoji).length - 1))
          ]
      )
      .join("");
    const fourthBitGroup = DateTime.now().toISODate()!.split("-").join("");

    const sourceString =
      firstBitGroup + secondBitGroup + thirdBitGroup + fourthBitGroup;

    return await hash(sourceString, 10);
  }

  public async checkPasswordAgainstHash(
    password: string,
    hashRecord: string,
    saltRecord: string
  ): Promise<boolean> {
    const trialHash: string = await hash(password, saltRecord);

    return isEqual(trialHash, hashRecord);
  }

  public generateSessionCookie(
    sessionId: string,
    expiresAt: DateTime
  ): SessionCookieDto {
    return {
      name: "SESS_ID",
      data: this.encryptionService.encrypt(sessionId),
      expiresAt: expiresAt.toJSDate(),
    };
  }

  public parseSessionCookie(rawCookie: string): string {
    const parsedCookie = rawCookie.split("=");

    if (parsedCookie.length > 2) {
      throw new Error(
        JSON.stringify({
          message: "Received malformed cookie. Cannot extract session id!",
        })
      );
    }
    return this.encryptionService.decrypt(parsedCookie[1]);
  }
}
