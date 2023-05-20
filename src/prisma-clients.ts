import { PrismaClient as PrismaAupClient } from '@prisma-dual-cli/generated/aup-client'
import { PrismaClient as PrismaSsdClient } from '@prisma-dual-cli/generated/ssd-client'

const clients = {
    aupClient: new PrismaAupClient({ datasources: { db: { url: process.env.AUP_DATABASE_URL }} }),
    ssdClient: new PrismaSsdClient({ datasources: { db: { url: process.env.SSD_DATABASE_URL }} })
}

export default clients


