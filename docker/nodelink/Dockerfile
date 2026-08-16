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

RUN cp config.default.js config.js

# --ignore-scripts disables the prepare (husky) lifecycle script that causes exit code 127
RUN npm install --ignore-scripts

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
