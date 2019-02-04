FROM node:9-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY . .

EXPOSE 3333
EXPOSE 3306

RUN npm install -g pm2 && \
  npm install --production && \
  npm cache clean --force

# Start the app
CMD pm2 start server.js
