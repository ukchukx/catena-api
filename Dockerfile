FROM node:9-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY . .

RUN npm install -g pm2 && \
  npm install --production && \
  npm cache clean --force

# Start the app
CMD pm2 start server.js --no-daemon
