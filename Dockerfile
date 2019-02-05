FROM node:9-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY ./package.json .
RUN npm install -g pm2 && \
  npm install && \
  npm prune --production && \
  npm cache clean --force

COPY . .
# Start the app
CMD pm2 start server.js --no-daemon
