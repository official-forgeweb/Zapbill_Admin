const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create super admin
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.admins.upsert({
    where: { email: 'admin@flashbill.com' },
    update: {},
    create: {
      email: 'admin@flashbill.com',
      password_hash: adminPassword,
      name: 'Super Admin',
      role: 'super_admin',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create features
  const featuresData = [
    { feature_key: 'billing', feature_name: 'Billing & Invoicing', description: 'Core POS billing with GST support', is_free: true },
    { feature_key: 'menu_management', feature_name: 'Menu Management', description: 'Digital menu creation and management', is_free: true },
    { feature_key: 'inventory', feature_name: 'Inventory Management', description: 'Stock tracking and alerts', is_free: false, monthly_price: 299, yearly_price: 2999 },
    { feature_key: 'qr_order', feature_name: 'QR Code Ordering', description: 'Table-side QR code ordering for customers', is_free: false, monthly_price: 499, yearly_price: 4999 },
    { feature_key: 'kitchen_display', feature_name: 'Kitchen Display System', description: 'KDS for kitchen order management', is_free: false, monthly_price: 399, yearly_price: 3999 },
    { feature_key: 'cloud_sync', feature_name: 'Cloud Sync', description: 'Real-time cloud data synchronization', is_free: false, monthly_price: 199, yearly_price: 1999 },
    { feature_key: 'email_reports', feature_name: 'Email Reports', description: 'Automated daily/weekly email reports', is_free: false, monthly_price: 149, yearly_price: 1499 },
    { feature_key: 'multi_outlet', feature_name: 'Multi-Outlet Management', description: 'Manage multiple store locations', is_free: false, monthly_price: 999, yearly_price: 9999 },
    { feature_key: 'customer_management', feature_name: 'Customer Management', description: 'CRM with loyalty points and history', is_free: false, monthly_price: 199, yearly_price: 1999 },
    { feature_key: 'staff_management', feature_name: 'Staff Management', description: 'Employee roles, shifts, and attendance', is_free: false, monthly_price: 249, yearly_price: 2499 },
    { feature_key: 'analytics', feature_name: 'Advanced Analytics', description: 'Business intelligence and insights dashboard', is_free: false, monthly_price: 499, yearly_price: 4999 },
    { feature_key: 'whatsapp_integration', feature_name: 'WhatsApp Integration', description: 'Send bills and updates via WhatsApp', is_free: false, monthly_price: 299, yearly_price: 2999 },
    { feature_key: 'expenses', feature_name: 'Expense Management', description: 'Track daily expenses and cash outs', is_free: false, monthly_price: 199, yearly_price: 1999 },
  ];

  for (const f of featuresData) {
    await prisma.features.upsert({
      where: { feature_key: f.feature_key },
      update: {},
      create: f,
    });
  }
  console.log('✅ Features seeded:', featuresData.length);

  // Create plans
  const plansData = [
    {
      plan_key: 'one_time_basic',
      plan_name: 'Basic',
      description: 'Essential POS features for small businesses',
      one_time_price: 4999,
      amc_price_per_year: 1999,
      max_devices: 1,
      features: ['billing', 'menu_management'],
    },
    {
      plan_key: 'one_time_standard',
      plan_name: 'Standard',
      description: 'Advanced features for growing restaurants',
      one_time_price: 9999,
      amc_price_per_year: 3999,
      max_devices: 2,
      features: ['billing', 'menu_management', 'inventory', 'customer_management', 'cloud_sync', 'email_reports'],
    },
    {
      plan_key: 'one_time_premium',
      plan_name: 'Premium',
      description: 'Full-featured POS suite for enterprise restaurants',
      one_time_price: 19999,
      amc_price_per_year: 7999,
      max_devices: 5,
      features: ['billing', 'menu_management', 'inventory', 'qr_order', 'kitchen_display', 'cloud_sync', 'email_reports', 'customer_management', 'staff_management', 'analytics', 'whatsapp_integration', 'website_orders', 'expenses'],
    },
  ];

  for (const p of plansData) {
    await prisma.plans.upsert({
      where: { plan_key: p.plan_key },
      update: {},
      create: p,
    });
  }
  console.log('✅ Plans seeded:', plansData.length);

  console.log('\n🎉 Seeding complete!');
  console.log('📧 Admin Login: admin@flashbill.com');
  console.log('🔑 Admin Password: admin123');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
