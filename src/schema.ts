import { pgTable, uuid, text, timestamp, boolean, pgEnum, primaryKey, integer, decimal, serial} from "drizzle-orm/pg-core";

// Enums
export const userRole = pgEnum("UserRole", ["ADMIN", "SUPERVISOR", "OPERARIO"]);
export const tipoMovimiento = pgEnum("TipoMovimiento", ["ingreso", "venta"]);

// Tablas
export const users = pgTable("User", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  role: userRole("role").default("OPERARIO").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(), // No hay @updatedAt automático
});

export const refreshTokens = pgTable("RefreshToken", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").unique().notNull(),
  userId: uuid("userId").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const obras = pgTable("Obra", {
  id: uuid("id").primaryKey().defaultRandom(), // gen_random_uuid() no lo maneja Drizzle directamente
  empresa: text("empresa").notNull(),
  tipo: text("tipo").notNull(),
  ciudad: text("ciudad").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  userid: uuid("userid").notNull(),
});

export const articulos = pgTable("Articulos", {
  ID_Producto: serial("ID_Producto").primaryKey(),
  CodigoInterno: text("CodigoInterno").notNull().unique(),
  Nombre: text("Nombre").notNull(),
  Unidad: text("Unidad").notNull(),
  Cantidad: integer("Cantidad").notNull(),
  ObraID: uuid("ObraID").notNull(),
  precio: decimal("precio", { precision: 10, scale: 2 }).default("0").notNull(),
  precio_final: decimal("precio_final", { precision: 10, scale: 2 }),
});

export const movimientos = pgTable("Movimientos", {
  ID_transaccion: serial("ID_transaccion").primaryKey(),
  ID_producto: integer("ID_producto").notNull(),
  Producto: text("Producto").notNull(),
  Cantidad: integer("Cantidad").notNull(),
  Tipo_movimiento: tipoMovimiento("Tipo_movimiento").notNull(),
  Fecha_transaccion: timestamp("Fecha_transaccion").defaultNow().notNull(),
  Obra_destino: text("Obra_destino"),
  Remito: text("Remito"),
  Observacion: text("Observacion"),
  Precio: decimal("Precio", { precision: 10, scale: 2 }).notNull(),
  Tipo_unidad: text("Tipo_unidad").notNull(),
  Precio_total_disponible: decimal("Precio_total_disponible", { precision: 10, scale: 2 }).notNull(),
});

export const certificaciones = pgTable("Certificacion", {
  Codigo: serial("Codigo").primaryKey(),
  Tipo_certificaion: text("Tipo_certificaion").notNull(),
  Fecha: timestamp("Fecha", { mode: "date" }).notNull(),
  Precio: decimal("Precio", { precision: 10, scale: 2 }).notNull(),
  Estado: text("Estado").notNull(),
  Obra: integer("Obra").notNull(),
  Cantidad: integer("Cantidad").notNull(),
  Descripcion: text("Descripcion"),
  Auto_fecha: timestamp("Auto_fecha").defaultNow().notNull(),
});

// Tipos exportables opcionales
export type UserRole = typeof userRole.enumValues[number];
export type TipoMovimiento = typeof tipoMovimiento.enumValues[number];
