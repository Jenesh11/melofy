FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Pin the radio/streaming contract instead of changing it on every rebuild.
ARG NODELINK_REVISION=f6f526f3875ed5c36afd245f1ff5e5c59356ec40
RUN git init /app && cd /app && \
    git remote add origin https://github.com/PerformanC/NodeLink.git && \
    git fetch --depth 1 origin "$NODELINK_REVISION" && \
    git checkout --detach FETCH_HEAD

WORKDIR /app

RUN cp config.default.js config.js && \
    node -e "import fs from 'node:fs'; let c = fs.readFileSync('config.default.js', 'utf8'); c = c.replace(/enableTrackStreamEndpoint:\s*false/g, 'enableTrackStreamEndpoint: true'); if (!c.includes('enableTrackStreamEndpoint: true')) { c = c.replace(/export\s+default\s*\{/, 'export default {\n  enableTrackStreamEndpoint: true,'); } fs.writeFileSync('config.js', c);"

RUN npm install --ignore-scripts

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
