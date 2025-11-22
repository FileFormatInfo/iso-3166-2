#!/usr/bin/env bash
#
# Download and unzip the ISO 3166 file from Github
#

set -o nounset
set -o errexit
set -o pipefail

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR=$(realpath "${SCRIPT_HOME}/..")

echo "INFO: starting gh download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

TMP_DIR="${BASE_DIR}/tmp"
if [ ! -d "${TMP_DIR}" ]; then
	echo "INFO: creating temp dir ${TMP_DIR}"
	mkdir -p "${TMP_DIR}"
else
	echo "INFO: using existing temp dir ${TMP_DIR}"
fi

echo "INFO: downloading iso3166_2.json from Github"
curl \
	--location \
	--output "${TMP_DIR}/iso3166_2.json" \
	--show-error \
	--silent \
	https://raw.githubusercontent.com/amckenna41/iso3166-2/refs/heads/main/iso3166_2/iso3166-2.json

echo "INFO: completed gh download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
