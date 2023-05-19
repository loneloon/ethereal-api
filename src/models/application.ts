import { Metadata } from "./common";

export class Application {
    constructor(
        readonly id: string,
        readonly name: string,
        readonly url: string,
        readonly isActive: boolean,
        readonly metadata: Metadata
    ) {
        
    }
}
