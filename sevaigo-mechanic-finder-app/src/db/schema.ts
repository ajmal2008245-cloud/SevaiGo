import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const mechanics = pgTable("mechanics", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhoto: text("owner_photo").notNull().default("/images/owner-1.jpg"),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  pincode: text("pincode"),
  shopPhone: text("shop_phone"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  vehicleTypes: text("vehicle_types").array().notNull(),
  specializations: text("specializations").array().notNull(),
  workingDays: text("working_days").array(),
  openTime: text("open_time").notNull().default("08:00"),
  closeTime: text("close_time").notNull().default("21:00"),
  rating: doublePrecision("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  photos: text("photos").array().notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  approvalStatus: text("approval_status").notNull().default("pending"),
  availabilityStatus: text("availability_status").notNull().default("free"),
  priceMin: integer("price_min").notNull().default(300),
  priceMax: integer("price_max").notNull().default(2500),
  yearsExperience: integer("years_experience").notNull().default(1),
  businessDoc: text("business_doc"),
  spareParts: text("spare_parts").array(),
  isOnline: boolean("is_online").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  mechanicId: uuid("mechanic_id").notNull().references(() => mechanics.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("reviews_user_mechanic_unique").on(table.userId, table.mechanicId)]);

export const favorites = pgTable("favorites", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mechanicId: uuid("mechanic_id").notNull().references(() => mechanics.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.mechanicId] })]);

export const vehicles = pgTable("vehicles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  type: text("type").notNull(),
  registration: text("registration"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const breakdowns = pgTable("breakdowns", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  mechanicId: uuid("mechanic_id").notNull().references(() => mechanics.id, { onDelete: "cascade" }),
  issue: text("issue").notNull().default("Roadside assistance"),
  status: text("status").notNull().default("pending"),
  vehicleType: text("vehicle_type"),
  userName: text("user_name"),
  userPhone: text("user_phone"),
  address: text("address"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  spareParts: text("spare_parts").array(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  mechanicLat: doublePrecision("mechanic_lat"),
  mechanicLng: doublePrecision("mechanic_lng"),
  etaMinutes: integer("eta_minutes"),
  action: text("action").notNull().default("called"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
