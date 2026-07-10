FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm
RUN pnpm install
RUN pnpm turbo run build --filter=@wenzapay/listener...

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/listener/dist ./dist
COPY --from=builder /app/services/listener/package.json ./
RUN npm install -g pnpm
RUN pnpm install --prod
CMD ["npm", "start"]
