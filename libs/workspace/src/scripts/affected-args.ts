/**
 * @license
 * Copyright 2020 Dynatrace LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { executeCommand } from '@dynatrace/shared/node';
import { appendFileSync } from 'fs';
import { Octokit } from '@octokit/rest';

const {
  GITHUB_TOKEN = 'c3c815ac3266b840a17e57b0bb4372c33ff69962',
  CIRCLE_BRANCH = '6.3.x', //'master',
  BASH_ENV,
  CIRCLE_PROJECT_USERNAME = 'dynatrace-oss',
  CIRCLE_PROJECT_REPONAME = 'barista',
  CIRCLE_PR_NUMBER, //= '663',
} = process.env;

// /**
//  * @link https://regex101.com/r/Z3zGjA/1/
//  */
// const BRANCH_REGEX = new RegExp(
//   /^([0-9]{1,}\.x|[0-9]{1,}\.[0-9]{1,}\.x|master)$/gm,
// );

const FALLBACK = 'origin/master';

/** Checks if the script is running inside a forked pull request */
export function isRunningInFork(): boolean {
  // Forked pull requests have CIRCLE_BRANCH set to pull/XXX
  return /pull\/[0-9]+/.test(CIRCLE_BRANCH);
}

async function main(): Promise<string> {
  // Octokit API instance that can be used to make Github API calls.
  const githubApi = new Octokit({
    auth: !isRunningInFork ? GITHUB_TOKEN : undefined,
  });

  if (CIRCLE_PR_NUMBER) {
    const pullRequest = await githubApi.pulls.get({
      pull_number: parseInt(CIRCLE_PR_NUMBER, 10),
      owner: CIRCLE_PROJECT_USERNAME,
      repo: CIRCLE_PROJECT_REPONAME,
    });

    return pullRequest.data?.base?.sha || FALLBACK;
  }

  executeCommand('ls -lah');
  // if (BRANCH_REGEX.test(CIRCLE_BRANCH)) {
  //   if (CIRCLE_BRANCH === 'master') {
  //   } else {
  //     const version = [...(CIRCLE_BRANCH.match(/\./g) || [])].length;
  //     console.log(version);
  //   }
  // }

  return FALLBACK;
}

main()
  .then(base => {
    // Store the affected args in the $BASH_ENV variable that
    // is set through circle ci.

    if (BASH_ENV) {
      appendFileSync(BASH_ENV, `\nexport AFFECTED_ARGS="--base=${base}"\n`);
      console.log(`Successfully added the --base=${base}`);
    }
  })
  .catch();
