FROM node:25-alpine

# Expo CLI
RUN npm install -g expo @expo/ngrok

# Arbeitsverzeichnis
WORKDIR /app

# Package Dateien zuerst kopieren für besseres Layer-Caching
COPY package*.json ./

# Dependencies installieren
RUN npm ci

# Restliches Projekt kopieren
COPY . .

EXPOSE 8081

# Expo startet auf Port 3300
CMD ["npm", "run", "web"]