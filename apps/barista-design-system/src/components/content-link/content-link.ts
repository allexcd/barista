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

import {
  Component,
  Input,
  HostListener,
  OnChanges,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router, Event, NavigationEnd } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

/**
 * The ba-content link component is used because we need to dynamically
 * instanciate a router link and this is not possible, because it is a directive.
 */
@Component({
  selector: 'a[contentLink]',
  template: '<ng-content></ng-content>',
  styles: ['a:hover { cursor: pointer; }'],
  host: {
    '[href]': 'contentLink',
  },
})
export class BaContentLink implements OnChanges, OnInit, OnDestroy {
  /** Absolute url for navigation on the page. For example /components/button */
  @Input() contentLink: string;

  /** QueryParams of absolute url */
  @Input() queryParams: { [k: string]: string };

  /** Fragement of absolute url */
  @Input() fragment: string;

  /** Href link to display */
  href: string;

  destroy$ = new Subject<void>();

  constructor(private _router: Router) {
    this._router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((navigation: Event) => {
        if (navigation instanceof NavigationEnd) {
          this._updateTargetUrlAndHref();
        }
      });
  }

  ngOnInit(): void {
    this._updateTargetUrlAndHref();
  }

  ngOnChanges(): void {
    this._updateTargetUrlAndHref();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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
  ): boolean {
    // Check if the click happens on a button or with some control keys pressed and let the
    // click event bubble to let consumers or the browser handle the event.
    if (button !== 0 || ctrlKey || metaKey || shiftKey) {
      return true;
    }

    this._router.navigate([this.contentLink], {
      fragment: this.fragment,
      queryParams: this.queryParams,
    });
    return false;
  }

  private _updateTargetUrlAndHref(): void {
    this.href = this.contentLink;
  }
}
