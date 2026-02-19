FROM node:20-alpine

LABEL maintainer="RIFT-2026 CI/CD Healing Agent"
LABEL description="Node.js sandbox for autonomous CI/CD test execution"

WORKDIR /app

CMD ["node", "--version"]
