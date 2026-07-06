# Build static export with Mintlify, serve via bundled serve.js (Cloud Run listens on $PORT).
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY docs.json favicon.svg llms.txt logo ./ 
COPY en ./en

RUN apt-get update \
  && apt-get install -y --no-install-recommends unzip \
  && rm -rf /var/lib/apt/lists/* \
  && npx mintlify export --output /tmp/export.zip --disable-openapi \
  && mkdir /site \
  && unzip -q /tmp/export.zip -d /site

FROM node:20-bookworm-slim

WORKDIR /site
COPY --from=builder /site /site

ENV PORT=8080
EXPOSE 8080

CMD ["node", "serve.js"]
