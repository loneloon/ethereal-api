import { Metadata } from "./common";

export class User {
    constructor(
        readonly id: string,
        readonly email: string,
        readonly emailIsVerified: boolean,
        readonly username: string,
        readonly firstName: string | null,
        readonly lastName: string | null,
        readonly metadata: Metadata
    ){}
}
