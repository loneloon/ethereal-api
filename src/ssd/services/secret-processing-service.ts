import { hash, genSalt } from "bcrypt";
import { isEqual } from "lodash";

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
}
