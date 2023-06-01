import { hash, genSalt } from "bcrypt";
import { isEqual, range } from "lodash";
import { DateTime } from "luxon";
import * as emoji from "emojilib";
import { EnchantedSessionCookie } from "../dtos/authentication";

export class SecretProcessingService {
  public static async generatePasswordHashAndSalt(
    password: string
  ): Promise<[string, string]> {
    const saltRounds: number = Math.floor(Math.random() * 10);

    const salt: string = await genSalt(saltRounds);
    const passHash: string = await hash(password, salt);

    return [passHash, salt];
  }

  public static async generateUniqueHashString(): Promise<string> {
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

  public static async checkPasswordAgainstHash(
    password: string,
    hashRecord: string,
    saltRecord: string
  ): Promise<boolean> {
    const trialHash: string = await hash(password, saltRecord);

    return isEqual(trialHash, hashRecord);
  }

  public static generateSessionCookie(
    sessionId: string,
    expiresAt: DateTime
  ): EnchantedSessionCookie {
    if (!process.env.DEPLOYMENT_THEME) {
      throw new Error(
        JSON.stringify({
          message: "Incorrect API config! Missing deployment theme!",
        })
      );
    }

    return {
      data: SecretProcessingService.enchantString(
        sessionId,
        process.env.DEPLOYMENT_THEME
      ),
      expiresAt: expiresAt.toJSDate(),
    };
  }

  public static parseSessionId(enchantedSessionId: string): string {
    if (!process.env.DEPLOYMENT_THEME) {
      throw new Error(
        JSON.stringify({
          message:
            "Warning! Missing deployment theme! Enchanted data will not be accesssible for users unless it's restored!",
        })
      );
    }

    return this.cleanseString(enchantedSessionId, process.env.DEPLOYMENT_THEME);
  }

  //
  // ALL THE ENCRYPTION STUFF BELOW WILL BE TAKEN OUT AND REPLACED
  // WITH A GENERIC ENCRYPTION SERVICE STORED IN SHARED,
  // SO THAT IT'S COMPLETELY DECOUPLED AND EASILY REPLACABLE TO FOLLOW LSP
  //

  private static generateSpellAndDelimiter(
    theme: string
  ): [spell: string, delimiter: string] {
    const tokenizedTheme = new Set(theme);

    if (tokenizedTheme.size !== 11) {
      throw new Error(
        JSON.stringify({
          message:
            "Invalid enchantment theme! Should be 11 unique characters long!",
        })
      );
    }
    // Add regEx check to validate theme

    // Spell should be 11 unique characters long A-Za-z0-9_.~-
    const spell = [...tokenizedTheme].join("");

    // Last character of the spell will be used as a delimiter
    const delimiter = spell[spell.length - 1];

    return [spell, delimiter];
  }

  public static enchantString(
    sourceString: string,
    enchantmentTheme: string
  ): string {
    const [spell, delimiter] = this.generateSpellAndDelimiter(enchantmentTheme);

    // We iterate through characters of a given hash string and replace each one with a translation:
    // Formula:
    //    - codepoint of current character is split by digits,
    //      each digit is replaced with positionally corellating character in the spell
    //    - translated characters are separated with a chosen delimiter
    const enchantedString = sourceString
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

    this.validateEnchantment(sourceString, enchantedString, enchantmentTheme);

    return enchantedString;
  }

  public static cleanseString(
    enchantedString: string,
    enchantmentTheme: string
  ): string {
    const [spell, delimiter] = this.generateSpellAndDelimiter(enchantmentTheme);

    const sourceString = enchantedString
      .split(delimiter)
      .map((enchantedCodepoint) =>
        String.fromCodePoint(
          parseInt(
            enchantedCodepoint
              .split("")
              .map((char) => spell.indexOf(char).toString())
              .join("")
          )
        )
      )
      .join("");

    return sourceString;
  }

  private static validateEnchantment(
    sourceString: string,
    enchantedString: string,
    enchantmentTheme: string
  ): void {
    if (
      sourceString !== this.cleanseString(enchantedString, enchantmentTheme)
    ) {
      throw new Error(
        JSON.stringify({
          message:
            "Couldn't validate enchantment! Source string was malformed in the process!",
        })
      );
    }
  }
}
