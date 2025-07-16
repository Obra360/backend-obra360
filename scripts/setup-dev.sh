#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Obra360 Backend Development Setup${NC}"
echo -e "${BLUE}=====================================>${NC}\n"

# Check if running on WSL
if ! grep -q Microsoft /proc/version; then
    echo -e "${YELLOW}⚠️  Warning: This script is optimized for WSL but will work on Linux too${NC}\n"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check PostgreSQL connection
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    if PGPASSWORD=$1 psql -h localhost -U obra360_user -d postgres -c '\q' 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 1. Check Node.js installation
echo -e "${BLUE}1. Checking Node.js installation...${NC}"
if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js is installed: $NODE_VERSION${NC}"
    
    # Check if version is >= 16
    REQUIRED_VERSION=16
    CURRENT_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$CURRENT_VERSION" -lt "$REQUIRED_VERSION" ]; then
        echo -e "${RED}❌ Node.js version must be >= 16. Please upgrade.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 18 or higher: https://nodejs.org/${NC}"
    exit 1
fi

# 2. Check npm installation
echo -e "\n${BLUE}2. Checking npm installation...${NC}"
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm is installed: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# 3. Check PostgreSQL installation
echo -e "\n${BLUE}3. Checking PostgreSQL...${NC}"
if command_exists psql; then
    echo -e "${GREEN}✅ PostgreSQL client is installed${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL client not found. Installing...${NC}"
    sudo apt update
    sudo apt install -y postgresql-client
fi

# Check if PostgreSQL service is running
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL service is running${NC}"
else
    echo -e "${YELLOW}⚠️  PostgreSQL service is not running. Attempting to start...${NC}"
    sudo systemctl start postgresql
    
    if systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL service started${NC}"
    else
        echo -e "${RED}❌ Could not start PostgreSQL service${NC}"
        echo -e "${YELLOW}You may need to install PostgreSQL: sudo apt install postgresql${NC}"
        exit 1
    fi
fi

# 4. Setup PostgreSQL database
echo -e "\n${BLUE}4. Setting up PostgreSQL database...${NC}"

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='obra360_dev'" 2>/dev/null)

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${GREEN}✅ Database 'obra360_dev' already exists${NC}"
else
    echo -e "${YELLOW}Creating database and user...${NC}"
    
    # Create database and user
    sudo -u postgres psql <<EOF
CREATE DATABASE obra360_dev;
CREATE USER obra360_user WITH ENCRYPTED PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE obra360_dev TO obra360_user;
\q
EOF
    
    echo -e "${GREEN}✅ Database 'obra360_dev' created${NC}"
    echo -e "${GREEN}✅ User 'obra360_user' created with password 'dev_password'${NC}"
fi

# 5. Install npm dependencies
echo -e "\n${BLUE}5. Installing npm dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# 6. Setup environment file
echo -e "\n${BLUE}6. Setting up environment variables...${NC}"

if [ -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Keeping existing .env file${NC}"
    else
        cp .env.example .env
        echo -e "${GREEN}✅ Created new .env file from .env.example${NC}"
    fi
else
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    else
        # Create .env file
        cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://obra360_user:dev_password@localhost:5432/obra360_dev"

# JWT
JWT_SECRET="dev-secret-change-in-production"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production"
JWT_EXPIRE="15m"
JWT_REFRESH_EXPIRE="7d"

# Server
PORT=3000
NODE_ENV=development
EOF
        echo -e "${GREEN}✅ Created .env file with default values${NC}"
    fi
fi

# 7. Generate Prisma Client
echo -e "\n${BLUE}7. Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"

# 8. Run database migrations
echo -e "\n${BLUE}8. Running database migrations...${NC}"

# Check if we can connect to the database
if check_postgres "dev_password"; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    
    # Push the schema to database
    npx prisma db push --skip-generate
    echo -e "${GREEN}✅ Database schema synchronized${NC}"
    
    # Create initial migration record
    mkdir -p prisma/migrations/0_init
    npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
    npx prisma migrate resolve --applied 0_init 2>/dev/null || true
else
    echo -e "${RED}❌ Could not connect to database${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running and the credentials in .env are correct${NC}"
    exit 1
fi

# 9. Seed initial data (optional)
echo -e "\n${BLUE}9. Seeding initial data...${NC}"
read -p "Do you want to create a test admin user? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create seed script if it doesn't exist
    if [ ! -f prisma/seed.js ]; then
        cat > prisma/seed.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  
  try {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@obra360.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'Obra360',
        role: 'ADMIN',
      },
    });
    
    console.log('✅ Admin user created:', admin.email);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Admin user already exists');
    } else {
      throw error;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
    fi
    
    node prisma/seed.js
fi

# 10. Setup Git hooks
echo -e "\n${BLUE}10. Setting up Git hooks...${NC}"
if [ -d .git ]; then
    npm run prepare 2>/dev/null || true
    echo -e "${GREEN}✅ Git hooks configured${NC}"
else
    echo -e "${YELLOW}⚠️  Not a git repository. Skipping git hooks setup${NC}"
fi

# 11. Final checks
echo -e "\n${BLUE}11. Running final checks...${NC}"

# Test database connection
echo -n "Testing database connection... "
if npx prisma db execute --stdin <<< "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Check if all required files exist
echo -n "Checking project structure... "
MISSING_FILES=()
for file in "src/index.js" "src/controllers/authController.js" "src/routes/authRoutes.js" "src/middleware/auth.js"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo -e "${RED}Missing files:${NC}"
    printf '%s\n' "${MISSING_FILES[@]}"
fi

# Success message
echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Run ${YELLOW}npm run dev${NC} to start the development server"
echo -e "2. The API will be available at ${YELLOW}http://localhost:3000${NC}"
echo -e "3. Test the health endpoint: ${YELLOW}curl http://localhost:3000/health${NC}"
echo -e "\n${BLUE}Default credentials:${NC}"
echo -e "Database: ${YELLOW}obra360_user / dev_password${NC}"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "Admin user: ${YELLOW}admin@obra360.com / Admin123!${NC}"
fi

echo -e "\n${GREEN}Happy coding! 🚀${NC}"