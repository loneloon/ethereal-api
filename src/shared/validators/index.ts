export function validateEmailString(email: string): void {
  const emailRegEx =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  const substringMatch = email.match(emailRegEx);

  if (!substringMatch || substringMatch[0] !== email) {
    throw new Error(
      JSON.stringify({
        message: "Invalid email format!",
        email,
      })
    );
  }
}

export function validateUsernameString(username: string): void {
  const minLength = 4;
  const maxLength = 12;

  if (username.length < minLength) {
    throw new Error(
      JSON.stringify({
        message: `Invalid username! Username should be at least ${minLength} characters long!`,
        username,
      })
    );
  }

  if (username.length > maxLength) {
    throw new Error(
      JSON.stringify({
        message: `Invalid username! Username can be ${maxLength} characters long maximum!`,
        username,
      })
    );
  }

  const usernameRegex = /^[A-Za-z0-9]*$/;
  const substringMatch = username.match(usernameRegex);

  if (!substringMatch || substringMatch[0] !== username) {
    throw new Error(
      JSON.stringify({
        message:
          "Invalid username format! Username can only contain upper/lowercase letters and digits!",
        username,
      })
    );
  }
}

export function validateFirstOrLastNameString(name: string): void {
  const nameRegex = /^[a-z ,.'-]+$/i;
  const substringMatch = name.match(nameRegex);

  if (!substringMatch || substringMatch[0] !== name) {
    throw new Error(
      JSON.stringify({
        message:
          "Invalid name format! Only english letters and punctuation symbols (,.'-) should be included!",
        name,
      })
    );
  }
}

export function validatePasswordString(password: string): void {
  const minLength = 8;
  const maxLength = 32;

  if (password.length < minLength) {
    throw new Error(
      JSON.stringify({
        message: `Invalid password! Password should be at least ${minLength} characters long!`,
      })
    );
  }

  if (password.length > maxLength) {
    throw new Error(
      JSON.stringify({
        message: `Invalid password! Password can be ${maxLength} characters long maximum!`,
      })
    );
  }

  const passwordRegEx =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[+@$!%*?&])[A-Za-z\d@$!%*?&+]+$/;
  const substringMatch = password.match(passwordRegEx);

  if (!substringMatch || substringMatch[0] !== password) {
    throw new Error(
      JSON.stringify({
        message:
          "Invalid password format! Password should contain at least one uppercase letter, one lowercase letter, one number and one special character",
      })
    );
  }
}
