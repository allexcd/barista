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
  DOWN_ARROW,
  END,
  HOME,
  LEFT_ARROW,
  PAGE_DOWN,
  PAGE_UP,
  RIGHT_ARROW,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import { Platform } from '@angular/cdk/platform';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { clamp, isDefined } from '@dynatrace/barista-components/core';
import { DtInput } from '@dynatrace/barista-components/input';
import {
  BehaviorSubject,
  fromEvent,
  merge,
  Observable,
  of,
  Subject,
  animationFrameScheduler,
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
  observeOn,
} from 'rxjs/operators';
import {
  getKeyCodeValue,
  getSliderPositionBasedOnValue,
  getSliderValueForCoordinate,
  roundToSnap,
} from './slider-utils';

let uniqueId = 0;

const KEY_CODES_ARRAY: Array<number> = [
  LEFT_ARROW,
  DOWN_ARROW,
  RIGHT_ARROW,
  UP_ARROW,
  HOME,
  END,
  PAGE_UP,
  PAGE_DOWN,
];

declare const window: any;

@Component({
  selector: 'dt-slider',
  templateUrl: 'slider.html',
  styleUrls: ['slider.scss'],
  host: {
    class: 'dt-slider',
  },
  encapsulation: ViewEncapsulation.Emulated,
  exportAs: 'dtSlider',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DtSlider implements AfterViewInit, OnDestroy, OnInit {
  private _roundShift: number = 0;

  /** @internal Unique id for this input. */
  _labelUid = `dt-slider-label-${uniqueId++}`;

  private _value$ = new BehaviorSubject<number>(30);
  private _clientRect$: Observable<ClientRect>;
  private _resizeObserver$ = new Subject();
  private _observer: any;
  private inputFieldValue$ = new Subject<number>();

  @Input() min: number = 0;
  @Input() max: number = 100;

  @Input()
  get step(): number {
    return this._step;
  }
  set step(step: number) {
    if (isDefined(step)) {
      this._step = step;
    }

    this._roundShift = 0;
    // deal with rounding problems.
    let countingStep = this._step;

    while (countingStep % 1 !== 0) {
      countingStep *= 10;
      this._roundShift++;
    }
  }
  private _step: number = 5;

  @Input() disabled: boolean = false;

  private _value: number;

  @Input()
  get value(): number {
    return this._value;
  }
  set value(value: number) {
    this._updateValue(value);
  }

  private _updateValue(value: number, userTriggered: boolean = true): void {
    this._value = value;
    if (userTriggered) {
      this._value$.next(roundToSnap(value, this.step, this.min, this.max));
    }
  }

  inputValueChanged(event: Event): void {
    /**
     * Convert input string value to number and call
     * roundToSnap takes care of snapping the values to the steps
     */
    this.inputFieldValue$.next(
      +(event.currentTarget as HTMLInputElement).value,
    );
  }

  @Output() change = new EventEmitter<number>();

  /** @internal Holds the track wrapper */
  @ViewChild('trackWrapper', { static: true })
  _trackWrapper: ElementRef<HTMLDivElement>;

  /** @internal Holds the thumb */
  @ViewChild('thumb', { static: true })
  _thumb: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider fill */
  @ViewChild('sliderFill', { static: true })
  _sliderFill: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider background */
  @ViewChild('sliderBackground', { static: true })
  _sliderBackground: ElementRef<HTMLDivElement>;

  /** @internal Holds the slider input field */
  @ViewChild(DtInput, { static: true })
  _sliderInput: DtInput;

  private _destroy$ = new Subject<void>();

  constructor(private _zone: NgZone, private _platform: Platform) {}

  ngOnInit(): void {
    const initValue = roundToSnap(this.value, this.step, this.min, this.max);
    if (this._value$.value !== initValue) {
      this._updateValue(initValue);
    }
  }

  ngAfterViewInit(): void {
    if (this._platform.isBrowser && 'ResizeObserver' in window) {
      this._observer = new window.ResizeObserver(_ => {
        this._resizeObserver$.next();
      });

      this._observer.observe(this._trackWrapper.nativeElement);
    }

    this._clientRect$ = merge(
      this._resizeObserver$.pipe(debounceTime(50)),
      of(null),
    ).pipe(
      map(() => this._trackWrapper.nativeElement.getBoundingClientRect()),
      takeUntil(this._destroy$),
    );

    this._zone.runOutsideAngular(() => {
      this._captureEvents();
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
    if (this._platform.isBrowser && 'ResizeObserver' in window) {
      this._observer.unobserve(this._trackWrapper.nativeElement);
    }
  }

  private _updateInput(value: number): void {
    this._sliderInput.value = value.toString();
  }

  private _captureEvents(): void {
    const start$ = merge(
      fromEvent(this._trackWrapper.nativeElement, 'mousedown'),
      fromEvent(this._trackWrapper.nativeElement, 'touchstart'),
    );

    const move$ = merge(
      fromEvent<MouseEvent>(window, 'mousemove').pipe(
        map(mouseEvent => mouseEvent.clientX),
      ),
      fromEvent<TouchEvent>(window, 'touchmove').pipe(
        map(touchEvent => touchEvent.changedTouches[0].clientX),
      ),
    );

    const moveEnd$ = merge(
      fromEvent(window, 'mouseup'),
      fromEvent(window, 'touchend'),
    );

    const drag$ = start$.pipe(
      switchMap(() =>
        move$.pipe(
          distinctUntilChanged(),
          observeOn(animationFrameScheduler),
          takeUntil(moveEnd$),
        ),
      ),
      share(),
    );

    const click$ = fromEvent<MouseEvent>(
      this._trackWrapper.nativeElement,
      'click',
    ).pipe(map(mouseEvent => mouseEvent.clientX));

    // stream from keyboard events
    const keyDown$ = fromEvent<KeyboardEvent>(
      this._trackWrapper.nativeElement,
      'keydown',
    ).pipe(
      filter(keyboardEvent => KEY_CODES_ARRAY.includes(keyboardEvent.keyCode)),
      map(keyboardEvent => {
        keyboardEvent.stopPropagation(); // global angular keydown would trigger CD.
        const valueAddition = getKeyCodeValue(
          this.max,
          this.step,
          keyboardEvent.keyCode,
        );
        const newValue = clamp(this._value + valueAddition, this.min, this.max);
        return newValue;
      }),
      distinctUntilChanged(),
      takeUntil(this._destroy$),
    );

    // triggered by drag and click
    const mouse$ = merge(drag$, click$).pipe(
      withLatestFrom(this._clientRect$),
      map(([coordinate, { left, width }]) => {
        const newValue = getSliderValueForCoordinate({
          coordinate,
          offset: left,
          width,
          min: this.min,
          max: this.max,
          step: this.step,
          roundShift: this._roundShift,
        });
        return newValue;
      }),
      distinctUntilChanged(),
      takeUntil(this._destroy$),
    );

    const inputValue$ = this.inputFieldValue$.pipe(
      // distinctUntilChanged() purposefully left out, to round the value
      // and update the input field with the rounded value
      map(value => roundToSnap(value, this.step, this.min, this.max)),
      takeUntil(this._destroy$),
    );

    merge(this._value$, inputValue$, mouse$, keyDown$)
      .pipe(
        tap(value => {
          this._trackWrapper.nativeElement.setAttribute(
            'aria-valuenow',
            value.toString(),
          );
          this._updateInput(value);
          this._updateValue(value, false);
        }),
        map(value =>
          getSliderPositionBasedOnValue({
            value,
            min: this.min,
            max: this.max,
          }),
        ),
        takeUntil(this._destroy$),
      )
      .subscribe(offsetX => {
        this._thumb.nativeElement.style.transform = `translateX(-${100 -
          offsetX * 100}%)`;
        this._sliderFill.nativeElement.style.transform = `scale3d(${offsetX}, 1, 1)`;
        this._sliderBackground.nativeElement.style.transform = `scale3d(${1 -
          offsetX}, 1, 1)`;
      });
  }
}

@Directive({
  selector: `dt-slider-label, [dt-slider-label], [dtSliderLabel]`,
  exportAs: 'dtSliderLabel',
})
export class DtSliderLabel {}

@Directive({
  selector: `dt-slider-unit, [dt-slider-unit], [dtSliderUnit]`,
  exportAs: 'dtSliderUnit',
  host: {
    class: 'dt-slider-unit',
  },
})
export class DtSliderUnit {}
