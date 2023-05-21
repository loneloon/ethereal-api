import { PrismaClient as PrismaAupClient } from '@prisma-dual-cli/generated/aup-client'
import { PrismaClient as PrismaSsdClient } from '@prisma-dual-cli/generated/ssd-client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

import clients from '../../prisma-clients'

jest.mock('../../prisma-clients', () => ({
  __esModule: true,
  default: mockDeep<{ aupClient: PrismaAupClient, ssdClient: PrismaSsdClient}>(),
}))

beforeEach(() => {
  mockReset(prismaMockClients)
})

export const prismaMockClients = clients as unknown as DeepMockProxy<{ aupClient: PrismaAupClient, ssdClient: PrismaSsdClient}>
