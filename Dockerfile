# Stage 1: "Builder" - Builds the Angular App
FROM node:18.20.4-bookworm-slim AS builder

ENV NG_CLI_ANALYTICS=false \
    CI=true

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --ignore-optional

# Copy source code
COPY . .


# Build Angular app for production (automatically uses environment.prod.ts due to angular.json)
RUN npm run build -- --configuration production


# Stage 2: "Server" - Serves the built app
FROM nginx:1.25-alpine

# Configure Nginx to handle Angular routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the "builder" stage to Nginx's web directory
# The path /app/dist/fapra-template is defined in angular.json -> outputPath
COPY --from=builder /app/dist/fapra-template /usr/share/nginx/html

# Expose port 4200 (through Nginx)
EXPOSE 4200