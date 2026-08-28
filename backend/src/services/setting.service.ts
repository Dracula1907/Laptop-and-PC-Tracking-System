import prisma from '../config/prisma';

export class SettingService {
  static async getSettings() {
    return prisma.systemSetting.findMany({
      orderBy: { category: 'asc' },
    });
  }

  static async updateSettings(settings: { key: string; value: string }[], userId: string) {
    const results = [];
    for (const s of settings) {
      const updated = await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value, category: 'General', description: 'System setting' },
      });
      results.push(updated);
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_UPDATE',
        entityType: 'SystemSetting',
        newValue: JSON.stringify(settings),
      },
    });

    return results;
  }
}
