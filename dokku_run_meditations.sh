#!/bin/bash
./node_modules/.bin/webpack -p
./bin/meditations serve --migrate --port $PORT --message "This is a demo, reset every hour. <a href=\"https://ioddly.com\">Like what you see?</a>" 
