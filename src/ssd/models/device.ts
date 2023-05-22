export class Device {
  constructor(
    readonly id: string,
    readonly sessionId: string | null,
    readonly userAgent: string
  ) {}
}
