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

    const sourceString =
      firstBitGroup + secondBitGroup + thirdBitGroup + fourthBitGroup;

    const hashedSource = await hash(sourceString, 10);

    // We cannot use raw bcrypt hashes as session ids, they will be malformed (because they contain url reserved characters)
    // We are already in sort of a safe place with the hash so we can apply a light translation on top without sabotaging security
    // It is still going to be unique and random, but longer

    const deploymentTheme = new Set(process.env.DEPLOYMENT_THEME);

    if (deploymentTheme.size !== 11) {
      throw new Error(
        JSON.stringify({
          message: "Incorrect API config! Invalid deployment theme!",
        })
      );
    }
    // Spell should be 11 unique characters long A-Za-z0-9_.~-
    const spell = [...deploymentTheme].join("");

    // Last character of the spell will be used as a delimiter
    const delimiter = spell[spell.length - 1];

    // We iterate through characters of a given hash string and replace each one with a translation:
    // Formula:
    //    - codepoint of current character is split by digits,
    //      each digit is replaced with positionally corellating character in the spell
    //    - translated characters are separated with a chosen delimiter
    const translatedHash = hashedSource
      .split("")
      .map((char) =>
        char
          .codePointAt(0)!
          .toString()
          .split("")
          .map((stringifiedDigit) => spell[parseInt(stringifiedDigit)])
          .join("")
      )
      .join(delimiter);

    return translatedHash;
  }
}
