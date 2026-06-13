FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY index.js ./
COPY src ./src
COPY lib ./lib

EXPOSE 3002

CMD ["node", "index.js"]
