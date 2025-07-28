#!/bin/bash

echo "🔍 Running comprehensive build validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to invero directory
cd "$(dirname "$0")/.."

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install

echo -e "${YELLOW}🔧 Running TypeScript check...${NC}"
if pnpm run check-types; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript check failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🧹 Running linter...${NC}"
if pnpm run lint; then
    echo -e "${GREEN}✅ Linting passed${NC}"
else
    echo -e "${RED}❌ Linting failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🏗️ Running build...${NC}"
if pnpm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All validations passed! Ready for deployment.${NC}"