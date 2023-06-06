import {
  UserEmailInvalidFormatError,
  UserNameInvalidFormatError,
  UserPasswordInvalidFormatError,
  UserPasswordTooLongError,
  UserPasswordTooShortError,
  UsernameInvalidFormatError,
  UsernameTooLongError,
  UsernameTooShortError,
} from "../custom-errors";

export function validateEmailString(email: string): void {
  const emailRegEx =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  const substringMatch = email.match(emailRegEx);

  if (!substringMatch || substringMatch[0] !== email) {
    throw new UserEmailInvalidFormatError();
  }
}

export function validateUsernameString(username: string): void {
  const minLength = 4;
  const maxLength = 12;

  if (username.length < minLength) {
    throw new UsernameTooShortError(minLength, username.length);
  }

  if (username.length > maxLength) {
    throw new UsernameTooLongError(maxLength, username.length);
  }

  const usernameRegex = /^[A-Za-z0-9]*$/;
  const substringMatch = username.match(usernameRegex);

  if (!substringMatch || substringMatch[0] !== username) {
    throw new UsernameInvalidFormatError();
  }
}

export function validateFirstOrLastNameString(name: string): void {
  const nameRegex = /^[a-z ,.'-]+$/i;
  const substringMatch = name.match(nameRegex);

  if (!substringMatch || substringMatch[0] !== name) {
    throw new UserNameInvalidFormatError();
  }
}

export function validatePasswordString(password: string): void {
  const minLength = 8;
  const maxLength = 32;

  if (password.length < minLength) {
    throw new UserPasswordTooShortError(minLength, password.length);
  }

  if (password.length > maxLength) {
    throw new UserPasswordTooLongError(maxLength, password.length);
  }

  const passwordRegEx =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[+@$!%*?&])[A-Za-z\d@$!%*?&+]+$/;
  const substringMatch = password.match(passwordRegEx);

  if (!substringMatch || substringMatch[0] !== password) {
    throw new UserPasswordInvalidFormatError();
  }
}
