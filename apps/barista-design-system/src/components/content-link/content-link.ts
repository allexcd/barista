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

import { Component, Input, HostListener } from '@angular/core';
import { Router } from '@angular/router';

/**
 * The ba-content link component is used because we need to dynamically
 * instanciate a router link and this is not possible, because it is a directive.
 * So we create a component that handles the navigation.
 */
@Component({
  selector: 'a[contentlink]',
  template: '{{linkValue}}',
})
//TODO: Implement HTML sanitizer in on init for linkValue if <ng-content> doesn't work.
export class BaContentLink {
  /** Absolute url for navigation on the page. For example /components/button */
  @Input() contentlink: string;

  /** QueryParams of absolute url */
  @Input() queryParams: { [k: string]: string };

  /** Fragement of absolute url */
  @Input() fragment: string;

  /** link value of absolute url */
  @Input() linkValue: string;

  constructor(private _router: Router) {}

  @HostListener('click', [
    '$event.button',
    '$event.ctrlKey',
    '$event.metaKey',
    '$event.shiftKey',
  ])
  onClick(
    button: number,
    ctrlKey: boolean,
    metaKey: boolean,
    shiftKey: boolean,
  ): void {
    if (button !== 0 || ctrlKey || metaKey || shiftKey) {
      return;
    }

    this._router.navigate([this.contentlink], {
      fragment: this.fragment,
      queryParams: this.queryParams,
    });
  }
}
