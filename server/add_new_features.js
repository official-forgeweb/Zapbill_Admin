require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function run() {
  try {
    // 1. Insert table_management feature if not exists
    const tableFeature = await prisma.features.upsert({
      where: { feature_key: 'table_management' },
      update: {},
      create: {
        feature_key: 'table_management',
        feature_name: 'Table & Floor Management',
        description: 'Design and manage table layouts and floors for dine-in operations.',
        is_free: false,
        monthly_price: 199,
        yearly_price: 1999
      }
    });
    console.log('✅ table_management feature initialized:', tableFeature.feature_key);

    // 2. Insert wastage_management feature if not exists
    const wastageFeature = await prisma.features.upsert({
      where: { feature_key: 'wastage_management' },
      update: {},
      create: {
        feature_key: 'wastage_management',
        feature_name: 'Wastage Management',
        description: 'Track and report raw material, food, and inventory wastage.',
        is_free: false,
        monthly_price: 199,
        yearly_price: 1999
      }
    });
    console.log('✅ wastage_management feature initialized:', wastageFeature.feature_key);

    // 3. Update standard plan features
    const standardPlan = await prisma.plans.findUnique({
      where: { plan_key: 'one_time_standard' }
    });
    if (standardPlan) {
      const standardFeatures = new Set(standardPlan.features);
      standardFeatures.add('table_management');
      standardFeatures.add('wastage_management');
      await prisma.plans.update({
        where: { plan_key: 'one_time_standard' },
        data: { features: Array.from(standardFeatures) }
      });
      console.log('✅ Added new features to standard plan');
    } else {
      console.log('⚠️ standard plan not found');
    }

    // 4. Update premium plan features
    const premiumPlan = await prisma.plans.findUnique({
      where: { plan_key: 'one_time_premium' }
    });
    if (premiumPlan) {
      const premiumFeatures = new Set(premiumPlan.features);
      premiumFeatures.add('table_management');
      premiumFeatures.add('wastage_management');
      await prisma.plans.update({
        where: { plan_key: 'one_time_premium' },
        data: { features: Array.from(premiumFeatures) }
      });
      console.log('✅ Added new features to premium plan');
    } else {
      console.log('⚠️ premium plan not found');
    }

  } catch (error) {
    console.error('❌ Error executing script:', error);
  } finally {
    await prisma.$disconnect();
    // Force exit in case database connection pools stay open
    process.exit(0);
  }
}

run();
