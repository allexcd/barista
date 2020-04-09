#!/bin/sh

echo "
---------------------------------------------------------
Welcome to the Barista Workspace! 🔥

You are currently working in:
$(pwd)
---------------------------------------------------------

"

if [ ! "$(sha1sum -c package-lock.sha1)" ]; then
  echo "⚠️ Need to install packages due to updated package-lock.json"
  # When the checksums are not matching perform an npm install
  npm ci --ignore-scripts

  # TODO: saving of the builders can be removed after #844 is merged
  # THen the builders arn't located in the node modules anymore
  cp -R ./dist/tmp/workspace ./node_modules/@dynatrace/workspace
  cp -R ./dist/tmp/barista-builders ./node_modules/@dynatrace/barista-builders
fi

# Run the command from the docker image
exec "$@"
