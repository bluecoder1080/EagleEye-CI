FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install git (for cloning repos) and Python (for running Python test repos)
RUN apk add --no-cache git python3 py3-pip
# Symlink python → python3 so `python err.py` works
RUN ln -sf /usr/bin/python3 /usr/bin/python

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# PORT is provided by Railway at runtime
EXPOSE ${PORT:-3001}
CMD ["node", "dist/index.js"]
