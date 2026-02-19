FROM python:3.12-slim

LABEL maintainer="RIFT-2026 CI/CD Healing Agent"
LABEL description="Python sandbox for autonomous CI/CD test execution"

WORKDIR /app

# Pre-install common test tools
RUN pip install --no-cache-dir pytest flake8 pylint 2>/dev/null || true

CMD ["python", "--version"]
