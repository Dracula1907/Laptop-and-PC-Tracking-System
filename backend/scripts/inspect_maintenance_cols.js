const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'MaintenanceRecord'
    ORDER BY ordinal_position;
  `);
  console.log('MaintenanceRecord columns:', cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
