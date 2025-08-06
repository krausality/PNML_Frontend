# Stufe 1: "Builder" - Baut die Angular App
FROM node:18.20.4-bookworm-slim AS builder

ENV NG_CLI_ANALYTICS=false \
    CI=true

WORKDIR /app

# Dependencies installieren
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --ignore-optional

# Quellcode kopieren
COPY . .

# Angular App für die Produktion bauen (nutzt automatisch environment.prod.ts wegen der angular.json)
RUN npm run build -- --configuration production


# Stufe 2: "Server" - Liefert die gebaute App aus
FROM nginx:1.25-alpine

# Nginx so konfigurieren, dass es mit Angular-Routing umgehen kann
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Die gebauten Dateien aus der "builder"-Stufe in das Web-Verzeichnis von Nginx kopieren
# Der Pfad /app/dist/fapra-template ist in angular.json -> outputPath definiert
COPY --from=builder /app/dist/fapra-template /usr/share/nginx/html

# Port 4200 (durch Nginx) freigeben
EXPOSE 4200