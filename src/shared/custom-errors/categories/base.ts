import { DateTime } from "luxon";
import internal from "stream";

export class ErrorMetadata {
  constructor(readonly createdAt: DateTime) {}
}

export type ErrorMessageParams = Record<
  string,
  number | string | number[] | string[]
>;

export interface CustomErrorDto {
  httpCode: number;
  platformCode: string;
  message: string;
}

export abstract class CustomError {
  abstract httpCode: number; // 3 digit
  abstract platformCode: string; // 4 digit
  protected abstract internalOnly: boolean;
  protected abstract messageTemplate: string;

  constructor(private readonly params: ErrorMessageParams) {}

  private formatMessage(rawMessage: string): string {
    let formattedMessage = rawMessage;

    for (const [key, value] of Object.entries(this.params)) {
      formattedMessage = formattedMessage.replace(
        "{" + key + "}",
        String(value)
      );
    }

    return formattedMessage;
  }

  get message(): string {
    return this.formatMessage(this.messageTemplate);
  }

  get dto(): CustomErrorDto {
    return {
      httpCode: this.httpCode,
      platformCode: this.platformCode,
      message: this.message,
    };
  }
}
