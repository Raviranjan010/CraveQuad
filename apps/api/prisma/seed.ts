import { PrismaClient, Role, VendorStatus, OrderStatus, PaymentStatus, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Clean up existing data in reverse dependency order
  console.log('Cleaning up existing database records...');
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.deliveryPartner.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.campus.deleteMany({});
  console.log('Cleanup complete.');

  // 2. Seed Campus
  console.log('Seeding campus...');
  const campus = await prisma.campus.create({
    data: {
      name: 'BITS Pilani Hyderabad Campus',
      address: 'Jawahar Nagar, Shameerpet, Hyderabad, Telangana 500078',
      isActive: true,
    },
  });

  // 3. Seed Users
  console.log('Seeding users...');
  // Customers (Student & Faculty)
  const student = await prisma.user.create({
    data: {
      name: 'Aarav Patel',
      email: 'aarav.patel@student.bits.ac.in',
      phone: '+919876543210',
      role: Role.STUDENT,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  const faculty = await prisma.user.create({
    data: {
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@faculty.bits.ac.in',
      phone: '+919876543211',
      role: Role.FACULTY,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  // Vendor Owner Users
  const nescafeOwner = await prisma.user.create({
    data: {
      name: 'Ramesh Sen',
      email: 'ramesh.nescafe@vendor.bits.ac.in',
      phone: '+919876543212',
      role: Role.VENDOR,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  const canteenOwner = await prisma.user.create({
    data: {
      name: 'Sanjeev Kumar',
      email: 'sanjeev.canteen@vendor.bits.ac.in',
      phone: '+919876543213',
      role: Role.VENDOR,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  const bakeryOwner = await prisma.user.create({
    data: {
      name: 'Aditya Mehta',
      email: 'aditya.bakery@vendor.bits.ac.in',
      phone: '+919876543214',
      role: Role.VENDOR,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  // Delivery Partner User
  const deliveryRider = await prisma.user.create({
    data: {
      name: 'Rahul Kumar',
      email: 'rahul.rider@delivery.bits.ac.in',
      phone: '+919876543215',
      role: Role.DELIVERY_PARTNER,
      campusId: campus.id,
      isVerified: true,
      isActive: true,
    },
  });

  // 4. Seed Delivery Partner Profile
  console.log('Seeding delivery partner profile...');
  await prisma.deliveryPartner.create({
    data: {
      userId: deliveryRider.id,
      isAvailable: true,
      campusId: campus.id,
    },
  });

  // 5. Seed Vendors
  console.log('Seeding vendors...');
  const openingHours = {
    monday: '09:00-22:00',
    tuesday: '09:00-22:00',
    wednesday: '09:00-22:00',
    thursday: '09:00-22:00',
    friday: '09:00-22:00',
    saturday: '10:00-22:00',
    sunday: '10:00-20:00',
  };

  const nescafe = await prisma.vendor.create({
    data: {
      userId: nescafeOwner.id,
      businessName: 'Nescafe Booth',
      description: 'Vibrant beverages, warm coffee, and quick bites.',
      status: VendorStatus.APPROVED,
      campusId: campus.id,
      openingHours: openingHours,
      isOpenNow: true,
      avgRating: 4.8,
    },
  });

  const canteen = await prisma.vendor.create({
    data: {
      userId: canteenOwner.id,
      businessName: 'Canteen Central',
      description: 'Delicious hot meals, authentic Biryani, and South Indian tiffins.',
      status: VendorStatus.APPROVED,
      campusId: campus.id,
      openingHours: openingHours,
      isOpenNow: true,
      avgRating: 4.5,
    },
  });

  const bakery = await prisma.vendor.create({
    data: {
      userId: bakeryOwner.id,
      businessName: 'Bits & Bytes Bakery',
      description: 'Freshly baked sandwiches, savory rolls, cookies, and desserts.',
      status: VendorStatus.APPROVED,
      campusId: campus.id,
      openingHours: openingHours,
      isOpenNow: true,
      avgRating: 4.6,
    },
  });

  // 6. Seed Menu Categories and Items
  console.log('Seeding categories and items...');

  // --- Nescafe Menu ---
  const nescafeDrinksCat = await prisma.menuCategory.create({
    data: { vendorId: nescafe.id, name: 'Beverages', sortOrder: 1 },
  });
  const nescafeSnacksCat = await prisma.menuCategory.create({
    data: { vendorId: nescafe.id, name: 'Quick Snacks', sortOrder: 2 },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: nescafe.id,
      categoryId: nescafeDrinksCat.id,
      name: 'Hot Hazelnut Latte',
      description: 'Rich espresso mixed with steamed milk and hazelnut syrup.',
      price: 90.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 5,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: nescafe.id,
      categoryId: nescafeDrinksCat.id,
      name: 'Iced Caramel Frappe',
      description: 'Creamy blended milk, espresso, and ice, topped with sweet caramel sauce.',
      price: 120.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 7,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: nescafe.id,
      categoryId: nescafeSnacksCat.id,
      name: 'Maggi Noodles',
      description: 'The standard 2-minute snack prepared with vegetables.',
      price: 50.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 8,
    },
  });

  // --- Canteen Central Menu ---
  const canteenMainsCat = await prisma.menuCategory.create({
    data: { vendorId: canteen.id, name: 'Mains', sortOrder: 1 },
  });
  const canteenSouthCat = await prisma.menuCategory.create({
    data: { vendorId: canteen.id, name: 'South Indian', sortOrder: 2 },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: canteen.id,
      categoryId: canteenMainsCat.id,
      name: 'Special Veg Biryani',
      description: 'Basmati rice cooked with garden-fresh vegetables and aromatic spices.',
      price: 180.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 15,
      discountPercent: 10.0, // 10% off promotion
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: canteen.id,
      categoryId: canteenMainsCat.id,
      name: 'Chicken Biryani',
      description: 'Classic Hyderabad chicken biryani served with raita and salan.',
      price: 220.0,
      isVeg: false,
      isAvailable: true,
      prepTimeMinutes: 15,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: canteen.id,
      categoryId: canteenMainsCat.id,
      name: 'Paneer Butter Masala Combo',
      description: 'Rich, creamy paneer dish served with 2 pieces of Butter Naan.',
      price: 160.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 12,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: canteen.id,
      categoryId: canteenSouthCat.id,
      name: 'Masala Dosa',
      description: 'Crispy rice crepe filled with potato masala, served with chutneys and sambar.',
      price: 70.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 10,
    },
  });

  // --- Bakery Menu ---
  const bakeryCat = await prisma.menuCategory.create({
    data: { vendorId: bakery.id, name: 'Bakes & Rolls', sortOrder: 1 },
  });
  const bakeryDessertCat = await prisma.menuCategory.create({
    data: { vendorId: bakery.id, name: 'Desserts', sortOrder: 2 },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: bakery.id,
      categoryId: bakeryCat.id,
      name: 'Grilled Cheese Sandwich',
      description: 'Double layered toasted bread overflowing with cheddar and mozzarella.',
      price: 85.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 8,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: bakery.id,
      categoryId: bakeryCat.id,
      name: 'Veg Puff',
      description: 'Flaky baked pastry filled with spicy mixed vegetables.',
      price: 35.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 5,
    },
  });

  await prisma.menuItem.create({
    data: {
      vendorId: bakery.id,
      categoryId: bakeryDessertCat.id,
      name: 'Choco Lava Cake',
      description: 'Decadent chocolate cake with a molten liquid fudge center.',
      price: 65.0,
      isVeg: true,
      isAvailable: true,
      prepTimeMinutes: 6,
    },
  });

  // 7. Seed Coupons
  console.log('Seeding coupons...');
  // Global coupon
  await prisma.coupon.create({
    data: {
      code: 'WELCOME100',
      description: 'Flat ₹100 off on order above ₹300',
      discountType: DiscountType.FLAT,
      value: 100.0,
      minOrderAmount: 300.0,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
      usageLimit: 500,
      perUserLimit: 1,
    },
  });

  // Vendor-specific coupon (Canteen Central)
  await prisma.coupon.create({
    data: {
      code: 'CANT20',
      description: 'Get 20% off at Canteen Central, max discount ₹50',
      discountType: DiscountType.PERCENT,
      value: 20.0,
      minOrderAmount: 150.0,
      maxDiscount: 50.0,
      vendorId: canteen.id,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Valid for 15 days
      usageLimit: 200,
      perUserLimit: 2,
    },
  });

  console.log('Database seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error('Error during database seed execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
