import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!cart) {
      return { cartItems: [], vendorId: null, vendorName: null };
    }

    return {
      vendorId: cart.vendorId,
      vendorName: cart.vendor?.businessName || null,
      cartItems: cart.items.map((item) => ({
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: item.menuItem.price,
        quantity: item.quantity,
        isVeg: item.menuItem.isVeg,
        vendorId: cart.vendorId,
        imageUrl: item.menuItem.imageUrl,
      })),
    };
  }

  async updateCart(userId: string, vendorId: string, items: { id: string; quantity: number }[]) {
    // If cart is empty, delete it
    if (items.length === 0 || !vendorId) {
      await this.prisma.cart.deleteMany({
        where: { userId },
      });
      return { cartItems: [], vendorId: null, vendorName: null };
    }

    return this.prisma.$transaction(async (tx) => {
      // Upsert cart
      const cart = await tx.cart.upsert({
        where: { userId },
        create: {
          userId,
          vendorId,
        },
        update: {
          vendorId,
        },
      });

      // Delete existing items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // Insert new items
      if (items.length > 0) {
        await tx.cartItem.createMany({
          data: items.map((item) => ({
            cartId: cart.id,
            menuItemId: item.id,
            quantity: item.quantity,
          })),
        });
      }

      // Re-fetch cart
      const updatedCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          vendor: {
            select: {
              id: true,
              businessName: true,
            },
          },
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      if (!updatedCart) {
        return { cartItems: [], vendorId: null, vendorName: null };
      }

      return {
        vendorId: updatedCart.vendorId,
        vendorName: updatedCart.vendor?.businessName || null,
        cartItems: updatedCart.items.map((item) => ({
          id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          isVeg: item.menuItem.isVeg,
          vendorId: updatedCart.vendorId,
          imageUrl: item.menuItem.imageUrl,
        })),
      };
    });
  }

  async clearCart(userId: string) {
    await this.prisma.cart.deleteMany({
      where: { userId },
    });
    return { cartItems: [], vendorId: null, vendorName: null };
  }
}
