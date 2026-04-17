require('dotenv').config();
const prisma = require('./src/lib/prisma');
async function run() {
  try {
    const existing = await prisma.features.findUnique({
      where: { feature_key: 'website_orders' }
    });
    if (!existing) {
      await prisma.features.create({
        data: {
          feature_key: 'website_orders',
          feature_name: 'Website Orders Integration',
          description: 'Connect your own website to ZapBill. Receive online orders directly in your POS. Includes API access for menu sync, coupon validation, and order management.',
          is_free: false,
          monthly_price: 499,
          yearly_price: 4999
        }
      });
      console.log('Feature inserted successfully');
    } else {
      console.log('Feature already exists');
    }
  } catch(e) {
    console.log('Error', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
