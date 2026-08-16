FROM node:22

RUN git clone --depth 1 https://github.com/PerformanC/NodeLink.git /app

WORKDIR /app

RUN cp config.default.js config.js

RUN npm install --production

ENV NODELINK_SERVER_PORT=2333 \
    NODELINK_SERVER_HOST=0.0.0.0

EXPOSE 2333

CMD ["npm", "start"]
