FROM alpine:3.20

WORKDIR /app

ENV CGO_ENABLED 1
RUN apk update
# add dependencies. gcc required by go-sqlite3
RUN apk add nodejs yarn go git gcc musl-dev

# Run go build
ADD go.mod go.sum  main.go .

COPY backend backend/

RUN go get 

RUN go build 

# Run react build
ADD package.json yarn.lock .

COPY config config/
COPY public public/
COPY scripts scripts/
COPY src src/
COPY tsconfig.json tsconfig.json

RUN yarn
RUN yarn build

# make the final container size smaller by getting rid of stuff we don't need
# since this is now basically just a statically compiled binary and some web assets
RUN rm -rf node_modules
RUN apk del nodejs yarn go git gcc musl-dev 

COPY docker_run_meditations.sh docker_run_meditations.sh

CMD ./docker_run_meditations.sh
