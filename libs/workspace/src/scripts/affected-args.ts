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

import { appendFileSync } from 'fs';
import { Octokit } from '@octokit/rest';

import { CircleCiApi } from '@dynatrace/shared/node';

const {
  GITHUB_TOKEN,
  CIRCLE_API_TOKEN,
  CIRCLE_BRANCH, // = '6.3.x', //'master',
  BASH_ENV,
  CIRCLE_PROJECT_USERNAME, // = 'dynatrace-oss',
  CIRCLE_PROJECT_REPONAME, // = 'barista',
  CIRCLE_PR_NUMBER, //= '663',
} = process.env;

const FALLBACK = 'origin/master';

/** Checks if the script is running inside a forked pull request */
export function isRunningInFork(): boolean {
  // Forked pull requests have CIRCLE_BRANCH set to pull/XXX
  return /pull\/[0-9]+/.test(CIRCLE_BRANCH!);
}

/** Returns the base SHA of the commit or origin/master as fallback */
async function main(): Promise<string> {
  // Octokit API instance that can be used to make Github API calls.
  const githubApi = new Octokit({
    auth: !isRunningInFork ? GITHUB_TOKEN : undefined,
  });

  // If it is a pull request get the sha of the compare branch from the
  // github api.
  if (CIRCLE_PR_NUMBER) {
    const pullRequest = await githubApi.pulls.get({
      pull_number: parseInt(CIRCLE_PR_NUMBER, 10),
      owner: CIRCLE_PROJECT_USERNAME!,
      repo: CIRCLE_PROJECT_REPONAME!,
    });

    return pullRequest.data?.base?.sha || FALLBACK;
  }

  // If the branch is not a pull request get the last successful
  // run of the workflow and its commit sha as base.
  if (CIRCLE_API_TOKEN) {
    try {
      const circleApi = new CircleCiApi(CIRCLE_API_TOKEN);

      return await circleApi.getCommitShaOfLastSuccessfulRun('6.x').toPromise();
    } catch {
      return FALLBACK;
    }
  }

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
