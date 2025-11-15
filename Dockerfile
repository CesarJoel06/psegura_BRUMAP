
FROM node:20-bullseye-slim
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --omit=dev || npm install
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server.js"]
