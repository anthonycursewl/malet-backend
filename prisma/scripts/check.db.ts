import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SnowflakeService } from '../../src/shared/infrastructure/services/snowflake-id.service';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const snowflake = new SnowflakeService();

    async function backfill() {
        const txs = await prisma.transactions.findMany({
            where: { index_id: null },
            orderBy: { issued_at: 'asc' }
        });

        console.log(`Migrando ${txs.length} transacciones...`);

        for (const tx of txs) {
            const sId = snowflake.generateFromDate(tx.issued_at);
            await prisma.transactions.update({
                where: { id: tx.id },
                data: { index_id: BigInt(sId) }
            });
        }

        console.log('Migración completada.');
    }

    backfill()
}
main()
    .catch(e => console.error('❌ Error de conexión:', e))
    .finally(() => prisma.$disconnect());