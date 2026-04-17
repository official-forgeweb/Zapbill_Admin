require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function updatePremiumPlan() {
  try {
    const premiumPlan = await prisma.plans.findUnique({
      where: { plan_key: 'one_time_premium' }
    });
    
    if (premiumPlan) {
      const features = new Set(premiumPlan.features);
      if (!features.has('website_orders')) {
        features.add('website_orders');
        await prisma.plans.update({
          where: { plan_key: 'one_time_premium' },
          data: { features: Array.from(features) }
        });
        console.log('✅ Added website_orders to Premium plan features');
      } else {
        console.log('ℹ️ website_orders already in Premium plan features');
      }
    } else {
      console.log('⚠️ Premium plan not found in database');
    }
  } catch (error) {
    console.error('❌ Error updating plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePremiumPlan();
