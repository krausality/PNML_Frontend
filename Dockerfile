# Angular 16 → Node 18
FROM node:18.20.4-bookworm-slim

# Optional: Telemetrie aus, weniger Lärm
ENV NG_CLI_ANALYTICS=false \
    CI=true

WORKDIR /app

# 1) CLI global wie in der README
RUN npm install -g @angular/cli@16

# 2) Dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --ignore-optional; \
    else \
      npm install --ignore-optional; \
    fi

# 3) Quellcode
COPY . .

# 4)
EXPOSE 4200

# 5) Plain dev server – genau wie "ng serve" aus der README
CMD ["ng", "serve", "--host=0.0.0.0", "--port=4200"]