FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

EXPOSE 8080

CMD ["node", "src/http-server.js"]

