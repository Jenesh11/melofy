FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/PerformanC/NodeLink.git .

RUN cp config.default.js config.js

RUN npm install --omit=dev

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
