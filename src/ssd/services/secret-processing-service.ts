import { hash, genSalt } from "bcrypt";
import { isEqual, range } from "lodash";
import { DateTime } from "luxon";
import * as emoji from "emojilib";

export class SecretProcessingService {
  public static async generatePasswordHashAndSalt(
    password: string
  ): Promise<[string, string]> {
    const saltRounds: number = Math.floor(Math.random() * 10);

    const salt: string = await genSalt(saltRounds);
    const passHash: string = await hash(password, salt);

    return [passHash, salt];
  }

  public static async checkPasswordAgainstHash(
    password: string,
    hashRecord: string,
    saltRecord: string
  ): Promise<boolean> {
    const trialHash: string = await hash(password, saltRecord);

    return isEqual(trialHash, hashRecord);
  }

  public static async generateSessionId(): Promise<string> {
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

    const sourceKey =
      firstBitGroup + secondBitGroup + thirdBitGroup + fourthBitGroup;

    return await hash(sourceKey, 10);
  }
}
