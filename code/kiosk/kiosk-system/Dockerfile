FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN mkdir -p public/storage && chmod -R 775 public/storage
EXPOSE 3000
CMD ["node", "server.js"]