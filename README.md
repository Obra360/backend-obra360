# Obra360 Backend

Backend API for Obra360 - Construction Project Management Platform

## 🚀 Quick Start (WSL/Linux)

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Git
- TypeScript

## 📦 Dependencias principales

- [Express](https://expressjs.com/) ^4.18.2
- [Prisma ORM](https://www.prisma.io/) ^6.12.0
- [JWT](https://github.com/auth0/node-jsonwebtoken) ^9.0.2
- [BcryptJS](https://github.com/dcodeIO/bcrypt.js) ^3.0.2
- [Supabase JS](https://supabase.com/docs/reference/javascript/installing) ^2.52.0
- [Dotenv](https://www.npmjs.com/package/dotenv) ^17.2.0
- [CORS](https://www.npmjs.com/package/cors) ^2.8.5
- [Express-validator](https://express-validator.github.io/) ^7.2.1

## ⚙️ Dependencias de desarrollo

- TypeScript, ts-node
- Prisma CLI
- Nodemon
- ESLint + Prettier
- Husky
- @types/\* para tipado de dependencias



### Automatic Setup

We provide a setup script that handles everything automatically:

# First, make sure you're in the project directory
cd backend-obra360

# Make the script executable (only needed once)
chmod +x scripts/setup-dev.sh

# Run the script
./scripts/setup-dev.sh



# Clone the repository
git clone https://github.com/your-org/backend-obra360.git
cd backend-obra360

# Run the setup script
./scripts/setup-dev.sh


#Triggers{
actualizar stock
CREATE OR REPLACE FUNCTION actualizar_stock_articulo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_movimiento = 'ingreso' THEN
    UPDATE "Articulos"
    SET stock = stock + NEW.cantidad
    WHERE id = NEW.id_producto;

  ELSIF NEW.tipo_movimiento = 'venta' THEN
    UPDATE "Articulos"
    SET stock = stock - NEW.cantidad
    WHERE id = NEW.id_producto;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
auto fecha
CREATE OR REPLACE FUNCTION actualizar_auto_fecha()
RETURNS TRIGGER AS $$
BEGIN
  NEW."auto_fecha" := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
calcular precio total
CREATE OR REPLACE FUNCTION calcular_precio_total()
RETURNS TRIGGER AS $$
DECLARE
  precio_unitario REAL;
BEGIN
  SELECT precio INTO precio_unitario
  FROM "Articulos"
  WHERE id = NEW.id_producto;

  NEW.precio_total := precio_unitario * NEW.cantidad;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
validar stock
CREATE OR REPLACE FUNCTION validar_stock_suficiente()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_movimiento = 'venta' THEN
    PERFORM 1 FROM "Articulos"
    WHERE id = NEW.id_producto AND stock >= NEW.cantidad;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para el producto %', NEW.id_producto;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


function:
actualizar fecha
CREATE TRIGGER trigger_auto_fecha
BEFORE INSERT OR UPDATE ON "Certificacion"
FOR EACH ROW
EXECUTE FUNCTION actualizar_auto_fecha();
actualizar stock
CREATE TRIGGER trigger_actualizar_stock
AFTER INSERT ON "Movimientos"
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_articulo();
actualizar precio
CREATE TRIGGER trigger_calcular_precio_total
BEFORE INSERT OR UPDATE ON "Movimientos"
FOR EACH ROW
EXECUTE FUNCTION calcular_precio_total();
validar stock suficiente
CREATE TRIGGER trigger_validar_stock
BEFORE INSERT OR UPDATE ON "Movimientos"
FOR EACH ROW
EXECUTE FUNCTION validar_stock_suficiente();
} #En caso de actualizar la base de datos