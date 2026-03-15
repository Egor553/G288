FROM node:20-slim

# Установка зависимостей для Prisma и сборки
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем конфиги
COPY package*.json ./
COPY prisma ./prisma/

# Установка всех зависимостей (включая dev для билда)
RUN npm install

# Копируем исходный код
COPY . .

# Генерируем клиент Prisma и собираем фронтенд (Vite)
RUN npx prisma generate
RUN npm run build

# Удаляем лишнее
RUN npm prune --production

EXPOSE 3000

# Запуск через tsx в продакшн моде (или скомпилированным кодом)
# Но так как у нас TS, проще всего оставить tsx
CMD ["npx", "tsx", "server.ts"]
