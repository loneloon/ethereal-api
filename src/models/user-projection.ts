import { Metadata } from "./common";

export class UserProjection {
    constructor(
        readonly userId: string,
        readonly appId: string,
        readonly isActive: boolean,
        readonly alias: string | null,
        readonly metadata: Metadata
    ) {
        
    }
}
