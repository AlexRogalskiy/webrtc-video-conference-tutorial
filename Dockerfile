FROM node:carbon-alpine

MAINTAINER ops@glasnostic.com

# install dependency
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN mkdir -p /var/www/

# set npm loglevel back to warn
# https://github.com/nodejs/docker-node#verbosity
ENV NPM_CONFIG_LOGLEVEL warn

# Fast the npm install
COPY package.json /tmp/package.json
COPY package-lock.json /tmp/package-lock.json
RUN cd /tmp && npm ci && cp -a /tmp/node_modules /var/www/ && rm -rf /tmp/node_modules

WORKDIR /var/www/
COPY . /var/www/

ENTRYPOINT ["node", "server.js"]
EXPOSE 3000
