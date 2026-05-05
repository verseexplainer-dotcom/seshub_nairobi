FROM node:22-bookworm-slim

WORKDIR /app

ENV ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tools/python/requirements.txt ./tools/python/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r tools/python/requirements.txt

COPY . .

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
