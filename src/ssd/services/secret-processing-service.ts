import { hash, genSalt } from "bcrypt";
import { range } from "lodash";

export class SecretProcessingService {
  public static async generatePasswordHashAndSalt(
    password: string
  ): Promise<[string, string]> {
    const saltRounds: number = Math.floor(Math.random() * 10);

    const salt: string = await genSalt(saltRounds);
    const passHash: string = await hash(password, salt);

    return [passHash, salt];
  }
}
