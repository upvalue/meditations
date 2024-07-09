FROM node:22.4-alpine

WORKDIR /app

RUN apk update
RUN apk add go git

# Run go build
ADD go.mod go.sum  main.go .

COPY backend backend/

RUN go get 

RUN go build 

CMD /bin/sh
# Run react build
#ADD package.json yarn.lock .

#RUN mkdir public
#RUN yarn


#CMD /bin/sh
