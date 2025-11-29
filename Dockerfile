FROM node:18-alpine

ARG PORT
ENV PORT=${PORT}
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Create app directory
WORKDIR /usr/src/app

# where available (npm@5+)
# COPY pnpm-lock.yaml .
COPY package.json .

# RUN npm install -g pnpm

COPY . .

RUN npm i
RUN npm -v

RUN npm run build
# HEALTHCHECK CMD curl --fail http://localhost:8080 || exit 1
# EXPOSE 8080
CMD [ "npm", "run", "start" ]