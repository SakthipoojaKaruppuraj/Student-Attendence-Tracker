# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and config
COPY prisma ./prisma
COPY prisma.config.js ./
COPY .env ./

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 5001

CMD ["node", "server.js"]
