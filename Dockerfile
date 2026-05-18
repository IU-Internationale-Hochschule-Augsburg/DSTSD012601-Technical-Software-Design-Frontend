FROM node:25-alpine

# System dependencies
RUN apk add --no-cache \
    bash \
    git \
    libc6-compat

# Expo CLI
RUN npm install -g expo @expo/ngrok

# Arbeitsverzeichnis
WORKDIR /app

# Package Dateien zuerst kopieren für besseres Layer-Caching
COPY package*.json ./

# Dependencies installieren
RUN npm install

# Restliches Projekt kopieren
COPY . .

# Expo / Metro / DevTools
EXPOSE 3300
EXPOSE 8081
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

# File Watching in Docker stabilisieren
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

# Expo startet auf Port 3300
CMD ["npx", "expo", "start", "--port", "3300", "--host", "0.0.0.0"]