FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.js ./
COPY src ./src
COPY lib ./lib

EXPOSE 3004

CMD ["node", "index.js"]