import { Metadata } from "@shared/models/common";

export class User {
    constructor(
        readonly id: string,
        readonly email: string,
        readonly emailIsVerified: boolean,
        readonly username: string,
        readonly isActive: boolean,
        readonly firstName: string | null,
        readonly lastName: string | null,
        readonly metadata: Metadata
    ){}
}
