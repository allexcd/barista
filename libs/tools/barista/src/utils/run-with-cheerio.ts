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

import { load as loadWithCheerio } from 'cheerio';

/**
 * Runs a given function on a content while loading it into cheerio and giving the
 * appropriate scope of the cheerio content back again.
 */
export function runWithCheerio(
  content: string,
  transformFunction: ($: CheerioStatic) => void,
): string {
  // https://github.com/cheeriojs/cheerio/issues/720
  // Appending a string with quotes or single quotes as an attribute replaces the quotes with encodedEntities.
  const $ = loadWithCheerio(content);
  transformFunction($);
  return $('body').html() || '';
}
