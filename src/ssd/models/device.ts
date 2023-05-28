export class Device {
  constructor(
    readonly id: string,
    readonly userAgent: string,
    readonly ip: string
  ) {}
}
