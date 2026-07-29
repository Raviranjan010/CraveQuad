// User Roles
export enum Role {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

// Vendor Onboarding Status
export enum VendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

// Order Status Pipeline
export enum OrderStatus {
  PLACED = 'PLACED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Payment Statuses
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Coupon Discount Formats
export enum DiscountType {
  FLAT = 'FLAT',
  PERCENT = 'PERCENT',
}

// User Model Interface
export interface User {
  id: string;
  firebaseUid: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  role: Role;
  campusId?: string;
  isVerified: boolean;
  isActive: boolean;
  deviceToken?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Campus Model Interface
export interface Campus {
  id: string;
  name: string;
  address: string;
  emailDomain?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Vendor Model Interface
export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  status: VendorStatus;
  campusId: string;
  openingHours: any;
  isOpenNow: boolean;
  avgRating: number;
  totalOrders: number;
  licenseNumber?: string;
  bankDetails?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Menu Category Model Interface
export interface MenuCategory {
  id: string;
  vendorId: string;
  name: string;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Menu Item Model Interface
export interface MenuItem {
  id: string;
  vendorId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  discountPercent?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Cart Model Interface
export interface Cart {
  id: string;
  userId: string;
  vendorId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Cart Item Model Interface
export interface CartItem {
  id: string;
  cartId: string;
  menuItemId: string;
  quantity: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Order Model Interface
export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  deliveryPartnerId?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  deliveryAddress: string;
  deliverySlot?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Order Item Model Interface
export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceAtOrder: number;
}

// Payment Model Interface
export interface Payment {
  id: string;
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: PaymentStatus;
  amount: number;
  method?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Coupon Model Interface
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: Date | string;
  validTo: Date | string;
  usageLimit: number;
  perUserLimit: number;
  isActive: boolean;
  vendorId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Review Model Interface
export interface Review {
  id: string;
  userId: string;
  orderId: string;
  vendorId: string;
  rating: number;
  comment?: string;
  createdAt: Date | string;
}

// Delivery Partner Profile Interface
export interface DeliveryPartner {
  id: string;
  userId: string;
  isAvailable: boolean;
  currentOrderId?: string;
  campusId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Notification Interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: Date | string;
}

// DTOs
export interface CreateOrderDto {
  deliveryAddress: string;
  deliverySlot?: string;
  couponCode?: string;
  paymentMethod: 'COD' | 'ONLINE';
  idempotencyKey: string;
}

export interface UpdateVendorStatusDto {
  status: VendorStatus;
  rejectionReason?: string;
}

export interface CreateMenuItemDto {
  vendorId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
  prepTimeMinutes?: number;
  discountPercent?: number;
}

export interface CreateCouponDto {
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom: Date | string;
  validTo: Date | string;
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  vendorId?: string;
}

export interface CreateReviewDto {
  userId: string;
  orderId: string;
  vendorId: string;
  rating: number;
  comment?: string;
}
