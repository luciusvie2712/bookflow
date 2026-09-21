import { PrismaPg } from "@prisma/adapter-pg";

import {
  BookingSource,
  BookingStatus,
  DepositType,
  PrismaClient,
  VoucherType,
} from "../src/generated/prisma/client.js";
import { loadApiEnvironmentFiles } from "../src/config/environment-loader.js";

loadApiEnvironmentFiles();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed development data.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ids = {
  ownerUser: "00000000-0000-4000-8000-000000000001",
  customerUser: "00000000-0000-4000-8000-000000000002",
  plan: "10000000-0000-4000-8000-000000000001",
  business: "20000000-0000-4000-8000-000000000001",
  member: "21000000-0000-4000-8000-000000000001",
  ownerRole: "22000000-0000-4000-8000-000000000001",
  branch: "30000000-0000-4000-8000-000000000001",
  category: "31000000-0000-4000-8000-000000000001",
  service: "32000000-0000-4000-8000-000000000001",
  staff: "33000000-0000-4000-8000-000000000001",
  customer: "40000000-0000-4000-8000-000000000001",
  booking: "50000000-0000-4000-8000-000000000001",
  bookingService: "51000000-0000-4000-8000-000000000001",
  voucher: "60000000-0000-4000-8000-000000000001",
  subscription: "70000000-0000-4000-8000-000000000001",
} as const;

const permissionCodes = [
  "business.read",
  "business.update",
  "business.publish",
  "branch.read",
  "branch.manage",
  "service.read",
  "service.manage",
  "staff.read",
  "staff.manage",
  "schedule.read",
  "schedule.manage",
  "booking.read",
  "booking.create",
  "booking.update",
  "booking.cancel",
  "booking.refund",
  "queue.read",
  "queue.manage",
  "customer.read",
  "customer.manage",
  "voucher.read",
  "voucher.manage",
  "review.read",
  "review.reply",
  "review.manage",
  "payment.read",
  "payment.manage",
  "payment.refund",
  "analytics.read",
  "role.read",
  "role.manage",
  "member.read",
  "member.manage",
  "subscription.read",
  "subscription.manage",
  "audit.read",
  "file.manage",
] as const;

function permissionDescription(code: string): string {
  const [resource, action] = code.split(".");
  return `Allows ${action} access to ${resource} resources.`;
}

function utcDateAt(daysFromToday: number, hour: number): Date {
  const value = new Date();
  value.setUTCHours(hour, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + daysFromToday);
  return value;
}

async function seed(): Promise<void> {
  const permissions = await Promise.all(
    permissionCodes.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: { description: permissionDescription(code) },
        create: { code, description: permissionDescription(code) },
      }),
    ),
  );

  await prisma.subscriptionPlan.upsert({
    where: { id: ids.plan },
    update: {
      code: "DEMO",
      name: "Demo",
      priceMinor: 0,
      billingInterval: "MONTHLY",
      active: true,
    },
    create: {
      id: ids.plan,
      code: "DEMO",
      name: "Demo",
      priceMinor: 0,
      billingInterval: "MONTHLY",
    },
  });

  await prisma.planFeature.upsert({
    where: {
      planId_featureCode: {
        planId: ids.plan,
        featureCode: "custom_roles",
      },
    },
    update: { enabled: true, limitValue: 10 },
    create: {
      planId: ids.plan,
      featureCode: "custom_roles",
      enabled: true,
      limitValue: 10,
    },
  });

  await prisma.user.upsert({
    where: { id: ids.ownerUser },
    update: {
      email: "owner@bookflow.local",
      fullName: "BookFlow Demo Owner",
      status: "ACTIVE",
    },
    create: {
      id: ids.ownerUser,
      email: "owner@bookflow.local",
      fullName: "BookFlow Demo Owner",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { id: ids.customerUser },
    update: {
      email: "customer@bookflow.local",
      fullName: "BookFlow Demo Customer",
      status: "ACTIVE",
    },
    create: {
      id: ids.customerUser,
      email: "customer@bookflow.local",
      fullName: "BookFlow Demo Customer",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.business.upsert({
    where: { id: ids.business },
    update: {
      ownerUserId: ids.ownerUser,
      name: "BookFlow Demo Studio",
      slug: "bookflow-demo",
      type: "SALON",
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
      status: "ACTIVE",
      subscriptionPlanId: ids.plan,
    },
    create: {
      id: ids.business,
      ownerUserId: ids.ownerUser,
      name: "BookFlow Demo Studio",
      slug: "bookflow-demo",
      type: "SALON",
      timezone: "Asia/Ho_Chi_Minh",
      currency: "VND",
      status: "ACTIVE",
      subscriptionPlanId: ids.plan,
      publishedAt: new Date(),
    },
  });

  await prisma.businessSubscription.upsert({
    where: { id: ids.subscription },
    update: {
      planId: ids.plan,
      status: "ACTIVE",
      currentPeriodStart: utcDateAt(0, 0),
      currentPeriodEnd: utcDateAt(30, 0),
    },
    create: {
      id: ids.subscription,
      businessId: ids.business,
      planId: ids.plan,
      status: "ACTIVE",
      currentPeriodStart: utcDateAt(0, 0),
      currentPeriodEnd: utcDateAt(30, 0),
    },
  });

  await prisma.businessMember.upsert({
    where: { id: ids.member },
    update: { status: "ACTIVE", joinedAt: new Date() },
    create: {
      id: ids.member,
      businessId: ids.business,
      userId: ids.ownerUser,
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await prisma.role.upsert({
    where: { id: ids.ownerRole },
    update: { name: "Owner", isSystem: false },
    create: {
      id: ids.ownerRole,
      businessId: ids.business,
      name: "Owner",
    },
  });

  await prisma.memberRole.upsert({
    where: {
      businessMemberId_roleId: {
        businessMemberId: ids.member,
        roleId: ids.ownerRole,
      },
    },
    update: {},
    create: { businessMemberId: ids.member, roleId: ids.ownerRole },
  });

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ids.ownerRole,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: ids.ownerRole, permissionId: permission.id },
      }),
    ),
  );

  await prisma.branch.upsert({
    where: { id: ids.branch },
    update: {
      name: "District 1 Studio",
      slug: "district-1",
      address: "1 Nguyen Hue, District 1, Ho Chi Minh City",
      timezone: "Asia/Ho_Chi_Minh",
      status: "ACTIVE",
    },
    create: {
      id: ids.branch,
      businessId: ids.business,
      name: "District 1 Studio",
      slug: "district-1",
      address: "1 Nguyen Hue, District 1, Ho Chi Minh City",
      timezone: "Asia/Ho_Chi_Minh",
      status: "ACTIVE",
    },
  });

  for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek += 1) {
    const openingHourId = `30100000-0000-4000-8000-00000000000${dayOfWeek}`;
    await prisma.branchOpeningHour.upsert({
      where: { id: openingHourId },
      update: {
        dayOfWeek,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
        closed: false,
      },
      create: {
        id: openingHourId,
        branchId: ids.branch,
        dayOfWeek,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T18:00:00.000Z"),
        closed: false,
      },
    });
  }

  await prisma.serviceCategory.upsert({
    where: { id: ids.category },
    update: { name: "Hair", sortOrder: 1, active: true },
    create: {
      id: ids.category,
      businessId: ids.business,
      name: "Hair",
      sortOrder: 1,
    },
  });

  await prisma.service.upsert({
    where: { id: ids.service },
    update: {
      categoryId: ids.category,
      name: "Classic Haircut",
      slug: "classic-haircut",
      durationMinutes: 45,
      priceMinor: 150_000,
      currency: "VND",
      depositType: DepositType.NONE,
      depositValue: 0,
      active: true,
    },
    create: {
      id: ids.service,
      businessId: ids.business,
      categoryId: ids.category,
      name: "Classic Haircut",
      slug: "classic-haircut",
      durationMinutes: 45,
      priceMinor: 150_000,
      currency: "VND",
      depositType: DepositType.NONE,
      depositValue: 0,
    },
  });

  await prisma.serviceBranch.upsert({
    where: {
      serviceId_branchId: { serviceId: ids.service, branchId: ids.branch },
    },
    update: {},
    create: { serviceId: ids.service, branchId: ids.branch },
  });

  await prisma.staffProfile.upsert({
    where: { id: ids.staff },
    update: {
      userId: ids.ownerUser,
      defaultBranchId: ids.branch,
      displayName: "Demo Stylist",
      title: "Senior Stylist",
      active: true,
    },
    create: {
      id: ids.staff,
      businessId: ids.business,
      userId: ids.ownerUser,
      defaultBranchId: ids.branch,
      displayName: "Demo Stylist",
      title: "Senior Stylist",
    },
  });

  await prisma.staffBranch.upsert({
    where: {
      staffId_branchId: { staffId: ids.staff, branchId: ids.branch },
    },
    update: {},
    create: { staffId: ids.staff, branchId: ids.branch },
  });

  await prisma.staffService.upsert({
    where: {
      staffId_serviceId: { staffId: ids.staff, serviceId: ids.service },
    },
    update: {},
    create: { staffId: ids.staff, serviceId: ids.service },
  });

  await prisma.staffWorkingHour.upsert({
    where: { id: "33100000-0000-4000-8000-000000000001" },
    update: {
      dayOfWeek: 1,
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T18:00:00.000Z"),
    },
    create: {
      id: "33100000-0000-4000-8000-000000000001",
      staffId: ids.staff,
      branchId: ids.branch,
      dayOfWeek: 1,
      startTime: new Date("1970-01-01T09:00:00.000Z"),
      endTime: new Date("1970-01-01T18:00:00.000Z"),
    },
  });

  await prisma.businessCustomer.upsert({
    where: { id: ids.customer },
    update: {
      userId: ids.customerUser,
      name: "Demo Customer",
      email: "customer@bookflow.local",
      phone: "+84900000000",
    },
    create: {
      id: ids.customer,
      businessId: ids.business,
      userId: ids.customerUser,
      name: "Demo Customer",
      email: "customer@bookflow.local",
      phone: "+84900000000",
    },
  });

  const bookingStart = utcDateAt(1, 2);
  const bookingEnd = new Date(bookingStart.getTime() + 45 * 60 * 1000);
  await prisma.booking.upsert({
    where: { id: ids.booking },
    update: {
      status: BookingStatus.CONFIRMED,
      startAt: bookingStart,
      endAt: bookingEnd,
    },
    create: {
      id: ids.booking,
      publicCode: "BF-DEMO-001",
      businessId: ids.business,
      branchId: ids.branch,
      customerId: ids.customer,
      staffId: ids.staff,
      status: BookingStatus.CONFIRMED,
      source: BookingSource.WEB,
      startAt: bookingStart,
      endAt: bookingEnd,
      timezone: "Asia/Ho_Chi_Minh",
      subtotalMinor: 150_000,
      totalMinor: 150_000,
      currency: "VND",
    },
  });

  await prisma.bookingService.upsert({
    where: { id: ids.bookingService },
    update: {
      serviceNameSnapshot: "Classic Haircut",
      durationMinutesSnapshot: 45,
      priceMinorSnapshot: 150_000,
      sortOrder: 0,
    },
    create: {
      id: ids.bookingService,
      bookingId: ids.booking,
      serviceId: ids.service,
      serviceNameSnapshot: "Classic Haircut",
      durationMinutesSnapshot: 45,
      priceMinorSnapshot: 150_000,
      sortOrder: 0,
    },
  });

  await prisma.voucher.upsert({
    where: { id: ids.voucher },
    update: {
      code: "WELCOME20",
      type: VoucherType.PERCENT,
      value: 2_000,
      startsAt: utcDateAt(-1, 0),
      endsAt: utcDateAt(365, 0),
      active: true,
    },
    create: {
      id: ids.voucher,
      businessId: ids.business,
      code: "WELCOME20",
      type: VoucherType.PERCENT,
      value: 2_000,
      maxDiscountMinor: 100_000,
      minimumOrderMinor: 100_000,
      startsAt: utcDateAt(-1, 0),
      endsAt: utcDateAt(365, 0),
      perCustomerLimit: 1,
    },
  });

  console.log(
    JSON.stringify({
      event: "database_seed_completed",
      businessSlug: "bookflow-demo",
      permissions: permissions.length,
    }),
  );
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
