// User Roles
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
  DELIVERY = 'DELIVERY',
}

// Order Statuses
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
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

// General User Interface
export interface IUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Restaurant / Vendor Interface
export interface IRestaurant {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  vendorId: string;
  address: string;
  isActive: boolean;
  rating: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Menu Item Interface
export interface IMenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isVeg: boolean;
  category: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Order Interface
export interface IOrder {
  id: string;
  customerId: string;
  restaurantId: string;
  deliveryPartnerId?: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  paymentId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  items: IOrderItem[];
}

export interface IOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem?: IMenuItem;
}

// Shared DTO Interfaces
export interface CreateUserDto {
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface CreateOrderDto {
  restaurantId: string;
  deliveryAddress: string;
  items: {
    menuItemId: string;
    quantity: number;
  }[];
}

export interface CreateRestaurantDto {
  name: string;
  description?: string;
  address: string;
  imageUrl?: string;
}

export interface CreateMenuItemDto {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  category: string;
}
