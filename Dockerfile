FROM node:16-buster

RUN apt update
RUN apt install -y ffmpeg

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN npm install
RUN npm run tsc

WORKDIR /config
ENTRYPOINT ["node", "/usr/src/app/out/index.js"]