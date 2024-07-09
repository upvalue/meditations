#!/usr/bin/env sh
# docker_run_meditations.sh - migrates db and runs in docker environment

MEDITATIONS_DB=${MEDITATIONS_DB:-db.sqlite3}

./meditations migrate --database ${MEDITATIONS_DB}
exec ./meditations serve --database ${MEDITATIONS_DB}
