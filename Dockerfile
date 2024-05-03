FROM ghcr.io/puppeteer/puppeteer:latest
RUN apt update && apt install chromium-browser
RUN which google-chrome-stable

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "index.js"]
