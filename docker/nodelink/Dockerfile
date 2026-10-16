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

COPY configure.mjs /tmp/configure.mjs
RUN node /tmp/configure.mjs

RUN npm install --ignore-scripts

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
