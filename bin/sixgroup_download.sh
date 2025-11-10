#!/usr/bin/env bash
#
# Download and unzip the ISO 639-3 file from SIL.
#

set -o nounset
set -o errexit
set -o pipefail

SCRIPT_HOME="$( cd "$( dirname "$0" )" && pwd )"
BASE_DIR=$(realpath "${SCRIPT_HOME}/..")

echo "INFO: starting sil download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if ! command -v yq &> /dev/null; then
	echo "ERROR: yq is not installed or not in PATH"
	exit 1
fi

TMP_DIR="${BASE_DIR}/tmp"
if [ ! -d "${TMP_DIR}" ]; then
	echo "INFO: creating temp dir ${TMP_DIR}"
	mkdir -p "${TMP_DIR}"
else
	echo "INFO: using existing temp dir ${TMP_DIR}"
fi

echo "INFO: downloading list 1"
curl \
	--location \
	--output "${TMP_DIR}/list-one.xml" \
	--show-error \
	--silent \
	https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml

echo "INFO: converting list 1 to json"
yq -p=xml -o=json "${TMP_DIR}/list-one.xml" > "${TMP_DIR}/list-one.json"

echo "INFO: downloading list 2"
curl \
	--location \
	--output "${TMP_DIR}/list-three.xml" \
	--show-error \
	--silent \
	https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-three.xml

echo "INFO: converting list 2 to json"
yq -p=xml -o=json "${TMP_DIR}/list-three.xml" > "${TMP_DIR}/list-three.json"

echo "INFO: completed sil download at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
