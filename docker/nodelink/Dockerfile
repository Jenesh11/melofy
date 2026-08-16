FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/PerformanC/NodeLink.git /app

WORKDIR /app

RUN cp config.default.js config.js && \
    node -e "import fs from 'node:fs'; let c = fs.readFileSync('config.default.js', 'utf8'); c = c.replace(/enableTrackStreamEndpoint:\s*false/g, 'enableTrackStreamEndpoint: true'); if (!c.includes('enableTrackStreamEndpoint: true')) { c = c.replace(/export\s+default\s*\{/, 'export default {\n  enableTrackStreamEndpoint: true,'); } fs.writeFileSync('config.js', c);"

RUN npm install --ignore-scripts

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
