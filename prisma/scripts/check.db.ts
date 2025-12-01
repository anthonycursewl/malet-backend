import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const cnt = await prisma.user.count();
    console.log('✅ Conexión OK – usuarios en tabla:', cnt);
}
main()
    .catch(e => console.error('❌ Error de conexión:', e))
    .finally(() => prisma.$disconnect());