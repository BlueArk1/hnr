# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 4000
CMD ["node", "server/index.js"]