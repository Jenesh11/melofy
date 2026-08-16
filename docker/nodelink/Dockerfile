FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

RUN git clone --depth 1 https://github.com/PerformanC/NodeLink.git .

RUN npm install --production

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
