import getRect from './utils/getRect';
import splitNode from './utils/splitNode';
import sagitta from './utils/sagitta';
import chord from './utils/chord';
import getLetterRotations from './utils/getLetterRotations';

const { PI, max, min } = Math;

/**
 * A CircleType instance creates a circular text element.
 *
 * @param  {HTMLElement} elem A target HTML element.
 * @param {Function} [splitter] An optional function used to split the element's
 *                              text content into individual characters
 *
 * @example
 * // Instantiate `CircleType` with an HTML element.
 * const circleType = new CircleType(document.getElementById('myElement'));
 *
 * // Set the text radius and direction. Note: setter methods are chainable.
 * circleType.radius(200).dir(-1);
 *
 * // Provide your own splitter function to handle emojis
 * // @see https://github.com/orling/grapheme-splitter
 * const splitter = new GraphemeSplitter()
 * new CircleType(
 *   document.getElementById('myElement'),
 *   splitter.splitGraphemes.bind(splitter)
 * );
 *
 */
class CircleType {
  constructor(elem, splitter) {
    this.element = elem;
    this.originalHTML = this.element.innerHTML;

    const container = document.createElement('div');
    const fragment = document.createDocumentFragment();
    container.setAttribute('aria-label', elem.innerText);
    container.style.position = 'relative';
    this.container = container;

    this._letters = splitNode(elem, splitter);
    this._letters.forEach(letter => fragment.appendChild(letter));
    container.appendChild(fragment);

    this.element.innerHTML = '';
    this.element.appendChild(container);

    const { fontSize, lineHeight } = window.getComputedStyle(this.element);

    this._fontSize = parseFloat(fontSize);
    this._lineHeight = parseFloat(lineHeight) || this._fontSize;
    this._metrics = this._letters.map(getRect);
    this._totalWidth = this._metrics.reduce((sum, { width }) => sum + width, 0);
    this._minRadius = (this._totalWidth / PI / 2) + this._lineHeight;

    this._dir = 1;
    this._forceWidth = false;
    this._forceHeight = true;
    this._radius = this._minRadius;

    this._invalidate();
  }

  /**
   * Gets the text radius in pixels. The default radius is the radius required
   * for the text to form a complete circle.
   *
   * @name radius
   * @function
   * @instance
   * @memberof CircleType
   * @return {number} The current text radius.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.radius();
   * //=> 150
   */

  /**
   * Sets the desired text radius. The minimum radius is the radius required
   * for the text to form a complete circle. If `value` is less than the minimum
   * radius, the minimum radius is used.
   *
   * @name radius
   * @function
   * @instance
   * @memberof CircleType
   * @param  {number} value A new text radius in pixels.
   * @return {CircleType}   The current instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * // Set the radius to 150 pixels.
   * circleType.radius(150);
   */
  radius(value) {
    if (value !== undefined) {
      this._radius = max(this._minRadius, value);

      this._invalidate();

      return this;
    }

    return this._radius;
  }

  /**
   * Sets the desired text radius. The minimum radius is the radius required
   * for the text to form a complete circle. If `value` is less than the minimum
   * radius, the minimum radius is used.
   *
   * @name halfCircle
   * @function
   * @instance
   * @memberof CircleType
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * // Have text span at least half of itself
   * circleType.halfCircle();
   */
  halfCircle() {
    var names = [];
    var name = [];
    var nameText = [];
    const wrapperElement = document.createElement('span');

    // font size is 2ch so 1ch = width of 0 is / 2
    const gapSignificance = this._fontSize / 2;

    //span of seperator
    const seperator = wrapperElement.cloneNode();
    seperator.insertAdjacentHTML('afterbegin', "*");

    //span of spacer
    const space = wrapperElement.cloneNode();
    space.insertAdjacentHTML('afterbegin', '0');
    space.style.opacity = 0;

    //get element array of array of names
    for (var i = 0; i < this._letters.length; i++) {
      var letter = this._letters[i];
      if (letter.innerHTML != "*") {
        name.push(letter);
        nameText.push(letter.innerText);
      }

      if (letter.innerHTML == "*" || i + 1 == this._letters.length) {
        names.push({
          arr: name,
          name: nameText.join(""),
          width: name.map(getRect).reduce((sum, { width }) => sum + width, 0)
        });
        name = [];
        nameText = [];
      }
    }

    //if only one name return
    if (names.length <= 0) return;

    //width of half circle
    var halfCircle = this._radius * Math.PI;

    //difference of half circle width and element width
    var gap = Math.floor(halfCircle - this._totalWidth);

    // return if element is already full width
    if (gap <= gapSignificance * 2) return;

    var WidthPerName = Math.floor(halfCircle / names.length);

    //every word should be this long for it to be even
    var allowedWidthPerName = names.reduce((acc, cur) => {
      if (cur.width > acc) {
        var reduce = Math.floor(acc - cur.width);
        return acc + reduce;
      } else {
        return acc;
      }
    }, WidthPerName);

    var newLetters = [];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var nameWithSpaces = [];

      //difference bettwen name length and ideal width
      var dif = allowedWidthPerName - name.width;

      //dif for each side
      var difSpace = (dif / gapSignificance) / 2;

      // if difference is large enough to create two spaces on either side proceede to add spaces
      if (difSpace > 0) {
        var spaceArray = [];
        for (var k = 0; k <= difSpace; k++) {
          spaceArray.push(space.cloneNode(true));
        }
        nameWithSpaces = [...spaceArray, ...name.arr, ...spaceArray];
      } else {
        nameWithSpaces = name.arr;
      }

      // I don't know how this one is woriking ??
      if (i > 0) {
        newLetters.push(seperator.cloneNode(true));
      }

      newLetters = newLetters.concat(nameWithSpaces);
    }

    this._letters = newLetters;
    const fragment = document.createDocumentFragment();
    this._letters.forEach(letter => fragment.appendChild(letter));
    this.element.children[0].innerHTML = '';
    this.element.children[0].appendChild(fragment);
    this.element.children[0].children;

    this._metrics = this._letters.map(getRect);
    this._totalWidth = this._metrics.reduce((sum, { width }) => sum + width, 0);
    this._minRadius = (this._totalWidth / PI / 2) + this._lineHeight;

    this._invalidate();

    return this;
  }


  /**
   * Gets the text direction. `1` is clockwise, `-1` is counter-clockwise.
   *
   * @name dir
   * @function
   * @instance
   * @memberof CircleType
   * @return {number} The current text radius.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.dir();
   * //=> 1 (clockwise)
   */

  /**
   * Sets the text direction. `1` is clockwise, `-1` is counter-clockwise.
   *
   * @name dir
   * @function
   * @instance
   * @memberof CircleType
   * @param  {number} value A new text direction.
   * @return {CircleType}   The current instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * // Set the direction to counter-clockwise.
   * circleType.dir(-1);
   *
   * // Set the direction to clockwise.
   * circleType.dir(1);
   */
  dir(value) {
    if (value !== undefined) {
      this._dir = value;

      this._invalidate();

      return this;
    }

    return this._dir;
  }

  /**
   * Gets the `forceWidth` option. If `true` the width of the arc is calculated
   * and applied to the element as an inline style. Defaults to `false`.
   *
   * @name forceWidth
   * @function
   * @instance
   * @memberof CircleType
   * @return {boolean} The current `forceWidth` value
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.forceWidth();
   * //=> false
   */

  /**
   * Sets the `forceWidth` option. If `true` the width of the arc is calculated
   * and applied to the element as an inline style.
   *
   * @name forceWidth
   * @function
   * @instance
   * @memberof CircleType
   * @param  {boolean} value `true` if the width should be set
   * @return {CircleType}   The current instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.radius(384);
   *
   * console.log(circleType.container);
   * //=> <div style="position: relative; height: 3.18275em;">...</div>
   *
   * // Enable the force width option
   * circleType.forceWidth(true);
   *
   * console.log(circleType.container);
   * //=> <div style="position: relative; height: 3.18275em; width: 12.7473em;">...</div>
   */
  forceWidth(value) {
    if (value !== undefined) {
      this._forceWidth = value;

      this._invalidate();

      return this;
    }

    return this._forceWidth;
  }

  /**
   * Gets the `forceHeight` option. If `true` the height of the arc is calculated
   * and applied to the element as an inline style. Defaults to `true`.
   *
   * @name forceHeight
   * @function
   * @instance
   * @memberof CircleType
   * @return {boolean} The current `forceHeight` value
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.forceHeight();
   * //=> true
   */

  /**
   * Sets the `forceHeight` option. If `true` the height of the arc is calculated
   * and applied to the element as an inline style.
   *
   * @name forceHeight
   * @function
   * @instance
   * @memberof CircleType
   * @param  {boolean} value `true` if the height should be set
   * @return {CircleType}   The current instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.radius(384);
   *
   * console.log(circleType.container);
   * //=> <div style="position: relative; height: 3.18275em;">...</div>
   *
   * // Disable the force height option
   * circleType.forceHeight(false);
   *
   * console.log(circleType.container);
   * //=> <div style="position: relative;">...</div>
   */
  forceHeight(value) {
    if (value !== undefined) {
      this._forceHeight = value;

      this._invalidate();

      return this;
    }

    return this._forceHeight;
  }

  /**
   * Schedules a task to recalculate the height of the element. This should be
   * called if the font size is ever changed.
   *
   * @return {CircleType} The current instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * circleType.refresh();
   */
  refresh() {
    return this._invalidate();
  }

  /**
   * Removes the CircleType effect from the element, restoring it to its
   * original state.
   *
   * @return {CircleType} This instance.
   *
   * @example
   * const circleType = new CircleType(document.getElementById('myElement'));
   *
   * // Restore `myElement` to its original state.
   * circleType.destroy();
   */
  destroy() {
    this.element.innerHTML = this.originalHTML;

    return this;
  }

  /**
   * Invalidates the current state and schedules a task to refresh the layout
   * in the next animation frame.
   *
   * @private
   *
   * @return {CircleType} This instance.
   */
  _invalidate() {
    cancelAnimationFrame(this._raf);

    this._raf = requestAnimationFrame(() => {
      this._layout();
    });

    return this;
  }

  /**
   * Rotates and positions the letters.
   *
   * @private
   *
   * @return {CircleType} This instance.
   */
  _layout() {
    const { _radius, _dir } = this;
    const originY = _dir === -1 ? (-_radius + this._lineHeight) : _radius;
    const origin = `center ${originY / this._fontSize}em`;
    const innerRadius = _radius - this._lineHeight;
    const { rotations, θ } = getLetterRotations(this._metrics, innerRadius);


    this._letters.forEach((letter, index) => {
      const { style } = letter;
      const rotate = ((θ * -0.5) + rotations[index]) * _dir;
      const translateX = (this._metrics[index].width * -0.5) / this._fontSize;
      const transform = `translateX(${translateX}em) rotate(${rotate}deg)`;

      style.position = 'absolute';
      style.bottom = _dir === -1 ? 0 : 'auto';
      style.left = '50%';
      style.transform = transform;
      style.transformOrigin = origin;
      style.webkitTransform = transform;
      style.webkitTransformOrigin = origin;
    });

    if (this._forceHeight) {
      const height = θ > 180 ? sagitta(_radius, θ) : sagitta(innerRadius, θ) + this._lineHeight;

      this.container.style.height = `${height / this._fontSize}em`;
    }

    if (this._forceWidth) {
      const width = chord(_radius, min(180, θ));

      this.container.style.width = `${width / this._fontSize}em`;
    }

    return this;
  }
}

export default CircleType;
