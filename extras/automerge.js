var Automerge =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

(function (global, factory) {
   true ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Immutable = factory());
}(this, function () { 'use strict';var SLICE$0 = Array.prototype.slice;

  function createClass(ctor, superClass) {
    if (superClass) {
      ctor.prototype = Object.create(superClass.prototype);
    }
    ctor.prototype.constructor = ctor;
  }

  function Iterable(value) {
      return isIterable(value) ? value : Seq(value);
    }


  createClass(KeyedIterable, Iterable);
    function KeyedIterable(value) {
      return isKeyed(value) ? value : KeyedSeq(value);
    }


  createClass(IndexedIterable, Iterable);
    function IndexedIterable(value) {
      return isIndexed(value) ? value : IndexedSeq(value);
    }


  createClass(SetIterable, Iterable);
    function SetIterable(value) {
      return isIterable(value) && !isAssociative(value) ? value : SetSeq(value);
    }



  function isIterable(maybeIterable) {
    return !!(maybeIterable && maybeIterable[IS_ITERABLE_SENTINEL]);
  }

  function isKeyed(maybeKeyed) {
    return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL]);
  }

  function isIndexed(maybeIndexed) {
    return !!(maybeIndexed && maybeIndexed[IS_INDEXED_SENTINEL]);
  }

  function isAssociative(maybeAssociative) {
    return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
  }

  function isOrdered(maybeOrdered) {
    return !!(maybeOrdered && maybeOrdered[IS_ORDERED_SENTINEL]);
  }

  Iterable.isIterable = isIterable;
  Iterable.isKeyed = isKeyed;
  Iterable.isIndexed = isIndexed;
  Iterable.isAssociative = isAssociative;
  Iterable.isOrdered = isOrdered;

  Iterable.Keyed = KeyedIterable;
  Iterable.Indexed = IndexedIterable;
  Iterable.Set = SetIterable;


  var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
  var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
  var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

  // Used for setting prototype methods that IE8 chokes on.
  var DELETE = 'delete';

  // Constants describing the size of trie nodes.
  var SHIFT = 5; // Resulted in best performance after ______?
  var SIZE = 1 << SHIFT;
  var MASK = SIZE - 1;

  // A consistent shared value representing "not set" which equals nothing other
  // than itself, and nothing that could be provided externally.
  var NOT_SET = {};

  // Boolean references, Rough equivalent of `bool &`.
  var CHANGE_LENGTH = { value: false };
  var DID_ALTER = { value: false };

  function MakeRef(ref) {
    ref.value = false;
    return ref;
  }

  function SetRef(ref) {
    ref && (ref.value = true);
  }

  // A function which returns a value representing an "owner" for transient writes
  // to tries. The return value will only ever equal itself, and will not equal
  // the return of any subsequent call of this function.
  function OwnerID() {}

  // http://jsperf.com/copy-array-inline
  function arrCopy(arr, offset) {
    offset = offset || 0;
    var len = Math.max(0, arr.length - offset);
    var newArr = new Array(len);
    for (var ii = 0; ii < len; ii++) {
      newArr[ii] = arr[ii + offset];
    }
    return newArr;
  }

  function ensureSize(iter) {
    if (iter.size === undefined) {
      iter.size = iter.__iterate(returnTrue);
    }
    return iter.size;
  }

  function wrapIndex(iter, index) {
    // This implements "is array index" which the ECMAString spec defines as:
    //
    //     A String property name P is an array index if and only if
    //     ToString(ToUint32(P)) is equal to P and ToUint32(P) is not equal
    //     to 2^32−1.
    //
    // http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
    if (typeof index !== 'number') {
      var uint32Index = index >>> 0; // N >>> 0 is shorthand for ToUint32
      if ('' + uint32Index !== index || uint32Index === 4294967295) {
        return NaN;
      }
      index = uint32Index;
    }
    return index < 0 ? ensureSize(iter) + index : index;
  }

  function returnTrue() {
    return true;
  }

  function wholeSlice(begin, end, size) {
    return (begin === 0 || (size !== undefined && begin <= -size)) &&
      (end === undefined || (size !== undefined && end >= size));
  }

  function resolveBegin(begin, size) {
    return resolveIndex(begin, size, 0);
  }

  function resolveEnd(end, size) {
    return resolveIndex(end, size, size);
  }

  function resolveIndex(index, size, defaultIndex) {
    return index === undefined ?
      defaultIndex :
      index < 0 ?
        Math.max(0, size + index) :
        size === undefined ?
          index :
          Math.min(size, index);
  }

  /* global Symbol */

  var ITERATE_KEYS = 0;
  var ITERATE_VALUES = 1;
  var ITERATE_ENTRIES = 2;

  var REAL_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';

  var ITERATOR_SYMBOL = REAL_ITERATOR_SYMBOL || FAUX_ITERATOR_SYMBOL;


  function Iterator(next) {
      this.next = next;
    }

    Iterator.prototype.toString = function() {
      return '[Iterator]';
    };


  Iterator.KEYS = ITERATE_KEYS;
  Iterator.VALUES = ITERATE_VALUES;
  Iterator.ENTRIES = ITERATE_ENTRIES;

  Iterator.prototype.inspect =
  Iterator.prototype.toSource = function () { return this.toString(); }
  Iterator.prototype[ITERATOR_SYMBOL] = function () {
    return this;
  };


  function iteratorValue(type, k, v, iteratorResult) {
    var value = type === 0 ? k : type === 1 ? v : [k, v];
    iteratorResult ? (iteratorResult.value = value) : (iteratorResult = {
      value: value, done: false
    });
    return iteratorResult;
  }

  function iteratorDone() {
    return { value: undefined, done: true };
  }

  function hasIterator(maybeIterable) {
    return !!getIteratorFn(maybeIterable);
  }

  function isIterator(maybeIterator) {
    return maybeIterator && typeof maybeIterator.next === 'function';
  }

  function getIterator(iterable) {
    var iteratorFn = getIteratorFn(iterable);
    return iteratorFn && iteratorFn.call(iterable);
  }

  function getIteratorFn(iterable) {
    var iteratorFn = iterable && (
      (REAL_ITERATOR_SYMBOL && iterable[REAL_ITERATOR_SYMBOL]) ||
      iterable[FAUX_ITERATOR_SYMBOL]
    );
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }

  function isArrayLike(value) {
    return value && typeof value.length === 'number';
  }

  createClass(Seq, Iterable);
    function Seq(value) {
      return value === null || value === undefined ? emptySequence() :
        isIterable(value) ? value.toSeq() : seqFromValue(value);
    }

    Seq.of = function(/*...values*/) {
      return Seq(arguments);
    };

    Seq.prototype.toSeq = function() {
      return this;
    };

    Seq.prototype.toString = function() {
      return this.__toString('Seq {', '}');
    };

    Seq.prototype.cacheResult = function() {
      if (!this._cache && this.__iterateUncached) {
        this._cache = this.entrySeq().toArray();
        this.size = this._cache.length;
      }
      return this;
    };

    // abstract __iterateUncached(fn, reverse)

    Seq.prototype.__iterate = function(fn, reverse) {
      return seqIterate(this, fn, reverse, true);
    };

    // abstract __iteratorUncached(type, reverse)

    Seq.prototype.__iterator = function(type, reverse) {
      return seqIterator(this, type, reverse, true);
    };



  createClass(KeyedSeq, Seq);
    function KeyedSeq(value) {
      return value === null || value === undefined ?
        emptySequence().toKeyedSeq() :
        isIterable(value) ?
          (isKeyed(value) ? value.toSeq() : value.fromEntrySeq()) :
          keyedSeqFromValue(value);
    }

    KeyedSeq.prototype.toKeyedSeq = function() {
      return this;
    };



  createClass(IndexedSeq, Seq);
    function IndexedSeq(value) {
      return value === null || value === undefined ? emptySequence() :
        !isIterable(value) ? indexedSeqFromValue(value) :
        isKeyed(value) ? value.entrySeq() : value.toIndexedSeq();
    }

    IndexedSeq.of = function(/*...values*/) {
      return IndexedSeq(arguments);
    };

    IndexedSeq.prototype.toIndexedSeq = function() {
      return this;
    };

    IndexedSeq.prototype.toString = function() {
      return this.__toString('Seq [', ']');
    };

    IndexedSeq.prototype.__iterate = function(fn, reverse) {
      return seqIterate(this, fn, reverse, false);
    };

    IndexedSeq.prototype.__iterator = function(type, reverse) {
      return seqIterator(this, type, reverse, false);
    };



  createClass(SetSeq, Seq);
    function SetSeq(value) {
      return (
        value === null || value === undefined ? emptySequence() :
        !isIterable(value) ? indexedSeqFromValue(value) :
        isKeyed(value) ? value.entrySeq() : value
      ).toSetSeq();
    }

    SetSeq.of = function(/*...values*/) {
      return SetSeq(arguments);
    };

    SetSeq.prototype.toSetSeq = function() {
      return this;
    };



  Seq.isSeq = isSeq;
  Seq.Keyed = KeyedSeq;
  Seq.Set = SetSeq;
  Seq.Indexed = IndexedSeq;

  var IS_SEQ_SENTINEL = '@@__IMMUTABLE_SEQ__@@';

  Seq.prototype[IS_SEQ_SENTINEL] = true;



  createClass(ArraySeq, IndexedSeq);
    function ArraySeq(array) {
      this._array = array;
      this.size = array.length;
    }

    ArraySeq.prototype.get = function(index, notSetValue) {
      return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
    };

    ArraySeq.prototype.__iterate = function(fn, reverse) {
      var array = this._array;
      var maxIndex = array.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        if (fn(array[reverse ? maxIndex - ii : ii], ii, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    ArraySeq.prototype.__iterator = function(type, reverse) {
      var array = this._array;
      var maxIndex = array.length - 1;
      var ii = 0;
      return new Iterator(function() 
        {return ii > maxIndex ?
          iteratorDone() :
          iteratorValue(type, ii, array[reverse ? maxIndex - ii++ : ii++])}
      );
    };



  createClass(ObjectSeq, KeyedSeq);
    function ObjectSeq(object) {
      var keys = Object.keys(object);
      this._object = object;
      this._keys = keys;
      this.size = keys.length;
    }

    ObjectSeq.prototype.get = function(key, notSetValue) {
      if (notSetValue !== undefined && !this.has(key)) {
        return notSetValue;
      }
      return this._object[key];
    };

    ObjectSeq.prototype.has = function(key) {
      return this._object.hasOwnProperty(key);
    };

    ObjectSeq.prototype.__iterate = function(fn, reverse) {
      var object = this._object;
      var keys = this._keys;
      var maxIndex = keys.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        var key = keys[reverse ? maxIndex - ii : ii];
        if (fn(object[key], key, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    ObjectSeq.prototype.__iterator = function(type, reverse) {
      var object = this._object;
      var keys = this._keys;
      var maxIndex = keys.length - 1;
      var ii = 0;
      return new Iterator(function()  {
        var key = keys[reverse ? maxIndex - ii : ii];
        return ii++ > maxIndex ?
          iteratorDone() :
          iteratorValue(type, key, object[key]);
      });
    };

  ObjectSeq.prototype[IS_ORDERED_SENTINEL] = true;


  createClass(IterableSeq, IndexedSeq);
    function IterableSeq(iterable) {
      this._iterable = iterable;
      this.size = iterable.length || iterable.size;
    }

    IterableSeq.prototype.__iterateUncached = function(fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterable = this._iterable;
      var iterator = getIterator(iterable);
      var iterations = 0;
      if (isIterator(iterator)) {
        var step;
        while (!(step = iterator.next()).done) {
          if (fn(step.value, iterations++, this) === false) {
            break;
          }
        }
      }
      return iterations;
    };

    IterableSeq.prototype.__iteratorUncached = function(type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterable = this._iterable;
      var iterator = getIterator(iterable);
      if (!isIterator(iterator)) {
        return new Iterator(iteratorDone);
      }
      var iterations = 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step : iteratorValue(type, iterations++, step.value);
      });
    };



  createClass(IteratorSeq, IndexedSeq);
    function IteratorSeq(iterator) {
      this._iterator = iterator;
      this._iteratorCache = [];
    }

    IteratorSeq.prototype.__iterateUncached = function(fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterator = this._iterator;
      var cache = this._iteratorCache;
      var iterations = 0;
      while (iterations < cache.length) {
        if (fn(cache[iterations], iterations++, this) === false) {
          return iterations;
        }
      }
      var step;
      while (!(step = iterator.next()).done) {
        var val = step.value;
        cache[iterations] = val;
        if (fn(val, iterations++, this) === false) {
          break;
        }
      }
      return iterations;
    };

    IteratorSeq.prototype.__iteratorUncached = function(type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = this._iterator;
      var cache = this._iteratorCache;
      var iterations = 0;
      return new Iterator(function()  {
        if (iterations >= cache.length) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          cache[iterations] = step.value;
        }
        return iteratorValue(type, iterations, cache[iterations++]);
      });
    };




  // # pragma Helper functions

  function isSeq(maybeSeq) {
    return !!(maybeSeq && maybeSeq[IS_SEQ_SENTINEL]);
  }

  var EMPTY_SEQ;

  function emptySequence() {
    return EMPTY_SEQ || (EMPTY_SEQ = new ArraySeq([]));
  }

  function keyedSeqFromValue(value) {
    var seq =
      Array.isArray(value) ? new ArraySeq(value).fromEntrySeq() :
      isIterator(value) ? new IteratorSeq(value).fromEntrySeq() :
      hasIterator(value) ? new IterableSeq(value).fromEntrySeq() :
      typeof value === 'object' ? new ObjectSeq(value) :
      undefined;
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of [k, v] entries, '+
        'or keyed object: ' + value
      );
    }
    return seq;
  }

  function indexedSeqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value);
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of values: ' + value
      );
    }
    return seq;
  }

  function seqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value) ||
      (typeof value === 'object' && new ObjectSeq(value));
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of values, or keyed object: ' + value
      );
    }
    return seq;
  }

  function maybeIndexedSeqFromValue(value) {
    return (
      isArrayLike(value) ? new ArraySeq(value) :
      isIterator(value) ? new IteratorSeq(value) :
      hasIterator(value) ? new IterableSeq(value) :
      undefined
    );
  }

  function seqIterate(seq, fn, reverse, useKeys) {
    var cache = seq._cache;
    if (cache) {
      var maxIndex = cache.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        var entry = cache[reverse ? maxIndex - ii : ii];
        if (fn(entry[1], useKeys ? entry[0] : ii, seq) === false) {
          return ii + 1;
        }
      }
      return ii;
    }
    return seq.__iterateUncached(fn, reverse);
  }

  function seqIterator(seq, type, reverse, useKeys) {
    var cache = seq._cache;
    if (cache) {
      var maxIndex = cache.length - 1;
      var ii = 0;
      return new Iterator(function()  {
        var entry = cache[reverse ? maxIndex - ii : ii];
        return ii++ > maxIndex ?
          iteratorDone() :
          iteratorValue(type, useKeys ? entry[0] : ii - 1, entry[1]);
      });
    }
    return seq.__iteratorUncached(type, reverse);
  }

  function fromJS(json, converter) {
    return converter ?
      fromJSWith(converter, json, '', {'': json}) :
      fromJSDefault(json);
  }

  function fromJSWith(converter, json, key, parentJSON) {
    if (Array.isArray(json)) {
      return converter.call(parentJSON, key, IndexedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
    }
    if (isPlainObj(json)) {
      return converter.call(parentJSON, key, KeyedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
    }
    return json;
  }

  function fromJSDefault(json) {
    if (Array.isArray(json)) {
      return IndexedSeq(json).map(fromJSDefault).toList();
    }
    if (isPlainObj(json)) {
      return KeyedSeq(json).map(fromJSDefault).toMap();
    }
    return json;
  }

  function isPlainObj(value) {
    return value && (value.constructor === Object || value.constructor === undefined);
  }

  /**
   * An extension of the "same-value" algorithm as [described for use by ES6 Map
   * and Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Key_equality)
   *
   * NaN is considered the same as NaN, however -0 and 0 are considered the same
   * value, which is different from the algorithm described by
   * [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).
   *
   * This is extended further to allow Objects to describe the values they
   * represent, by way of `valueOf` or `equals` (and `hashCode`).
   *
   * Note: because of this extension, the key equality of Immutable.Map and the
   * value equality of Immutable.Set will differ from ES6 Map and Set.
   *
   * ### Defining custom values
   *
   * The easiest way to describe the value an object represents is by implementing
   * `valueOf`. For example, `Date` represents a value by returning a unix
   * timestamp for `valueOf`:
   *
   *     var date1 = new Date(1234567890000); // Fri Feb 13 2009 ...
   *     var date2 = new Date(1234567890000);
   *     date1.valueOf(); // 1234567890000
   *     assert( date1 !== date2 );
   *     assert( Immutable.is( date1, date2 ) );
   *
   * Note: overriding `valueOf` may have other implications if you use this object
   * where JavaScript expects a primitive, such as implicit string coercion.
   *
   * For more complex types, especially collections, implementing `valueOf` may
   * not be performant. An alternative is to implement `equals` and `hashCode`.
   *
   * `equals` takes another object, presumably of similar type, and returns true
   * if the it is equal. Equality is symmetrical, so the same result should be
   * returned if this and the argument are flipped.
   *
   *     assert( a.equals(b) === b.equals(a) );
   *
   * `hashCode` returns a 32bit integer number representing the object which will
   * be used to determine how to store the value object in a Map or Set. You must
   * provide both or neither methods, one must not exist without the other.
   *
   * Also, an important relationship between these methods must be upheld: if two
   * values are equal, they *must* return the same hashCode. If the values are not
   * equal, they might have the same hashCode; this is called a hash collision,
   * and while undesirable for performance reasons, it is acceptable.
   *
   *     if (a.equals(b)) {
   *       assert( a.hashCode() === b.hashCode() );
   *     }
   *
   * All Immutable collections implement `equals` and `hashCode`.
   *
   */
  function is(valueA, valueB) {
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
      return true;
    }
    if (!valueA || !valueB) {
      return false;
    }
    if (typeof valueA.valueOf === 'function' &&
        typeof valueB.valueOf === 'function') {
      valueA = valueA.valueOf();
      valueB = valueB.valueOf();
      if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
        return true;
      }
      if (!valueA || !valueB) {
        return false;
      }
    }
    if (typeof valueA.equals === 'function' &&
        typeof valueB.equals === 'function' &&
        valueA.equals(valueB)) {
      return true;
    }
    return false;
  }

  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }

    if (
      !isIterable(b) ||
      a.size !== undefined && b.size !== undefined && a.size !== b.size ||
      a.__hash !== undefined && b.__hash !== undefined && a.__hash !== b.__hash ||
      isKeyed(a) !== isKeyed(b) ||
      isIndexed(a) !== isIndexed(b) ||
      isOrdered(a) !== isOrdered(b)
    ) {
      return false;
    }

    if (a.size === 0 && b.size === 0) {
      return true;
    }

    var notAssociative = !isAssociative(a);

    if (isOrdered(a)) {
      var entries = a.entries();
      return b.every(function(v, k)  {
        var entry = entries.next().value;
        return entry && is(entry[1], v) && (notAssociative || is(entry[0], k));
      }) && entries.next().done;
    }

    var flipped = false;

    if (a.size === undefined) {
      if (b.size === undefined) {
        if (typeof a.cacheResult === 'function') {
          a.cacheResult();
        }
      } else {
        flipped = true;
        var _ = a;
        a = b;
        b = _;
      }
    }

    var allEqual = true;
    var bSize = b.__iterate(function(v, k)  {
      if (notAssociative ? !a.has(v) :
          flipped ? !is(v, a.get(k, NOT_SET)) : !is(a.get(k, NOT_SET), v)) {
        allEqual = false;
        return false;
      }
    });

    return allEqual && a.size === bSize;
  }

  createClass(Repeat, IndexedSeq);

    function Repeat(value, times) {
      if (!(this instanceof Repeat)) {
        return new Repeat(value, times);
      }
      this._value = value;
      this.size = times === undefined ? Infinity : Math.max(0, times);
      if (this.size === 0) {
        if (EMPTY_REPEAT) {
          return EMPTY_REPEAT;
        }
        EMPTY_REPEAT = this;
      }
    }

    Repeat.prototype.toString = function() {
      if (this.size === 0) {
        return 'Repeat []';
      }
      return 'Repeat [ ' + this._value + ' ' + this.size + ' times ]';
    };

    Repeat.prototype.get = function(index, notSetValue) {
      return this.has(index) ? this._value : notSetValue;
    };

    Repeat.prototype.includes = function(searchValue) {
      return is(this._value, searchValue);
    };

    Repeat.prototype.slice = function(begin, end) {
      var size = this.size;
      return wholeSlice(begin, end, size) ? this :
        new Repeat(this._value, resolveEnd(end, size) - resolveBegin(begin, size));
    };

    Repeat.prototype.reverse = function() {
      return this;
    };

    Repeat.prototype.indexOf = function(searchValue) {
      if (is(this._value, searchValue)) {
        return 0;
      }
      return -1;
    };

    Repeat.prototype.lastIndexOf = function(searchValue) {
      if (is(this._value, searchValue)) {
        return this.size;
      }
      return -1;
    };

    Repeat.prototype.__iterate = function(fn, reverse) {
      for (var ii = 0; ii < this.size; ii++) {
        if (fn(this._value, ii, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    Repeat.prototype.__iterator = function(type, reverse) {var this$0 = this;
      var ii = 0;
      return new Iterator(function() 
        {return ii < this$0.size ? iteratorValue(type, ii++, this$0._value) : iteratorDone()}
      );
    };

    Repeat.prototype.equals = function(other) {
      return other instanceof Repeat ?
        is(this._value, other._value) :
        deepEqual(other);
    };


  var EMPTY_REPEAT;

  function invariant(condition, error) {
    if (!condition) throw new Error(error);
  }

  createClass(Range, IndexedSeq);

    function Range(start, end, step) {
      if (!(this instanceof Range)) {
        return new Range(start, end, step);
      }
      invariant(step !== 0, 'Cannot step a Range by 0');
      start = start || 0;
      if (end === undefined) {
        end = Infinity;
      }
      step = step === undefined ? 1 : Math.abs(step);
      if (end < start) {
        step = -step;
      }
      this._start = start;
      this._end = end;
      this._step = step;
      this.size = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
      if (this.size === 0) {
        if (EMPTY_RANGE) {
          return EMPTY_RANGE;
        }
        EMPTY_RANGE = this;
      }
    }

    Range.prototype.toString = function() {
      if (this.size === 0) {
        return 'Range []';
      }
      return 'Range [ ' +
        this._start + '...' + this._end +
        (this._step !== 1 ? ' by ' + this._step : '') +
      ' ]';
    };

    Range.prototype.get = function(index, notSetValue) {
      return this.has(index) ?
        this._start + wrapIndex(this, index) * this._step :
        notSetValue;
    };

    Range.prototype.includes = function(searchValue) {
      var possibleIndex = (searchValue - this._start) / this._step;
      return possibleIndex >= 0 &&
        possibleIndex < this.size &&
        possibleIndex === Math.floor(possibleIndex);
    };

    Range.prototype.slice = function(begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      begin = resolveBegin(begin, this.size);
      end = resolveEnd(end, this.size);
      if (end <= begin) {
        return new Range(0, 0);
      }
      return new Range(this.get(begin, this._end), this.get(end, this._end), this._step);
    };

    Range.prototype.indexOf = function(searchValue) {
      var offsetValue = searchValue - this._start;
      if (offsetValue % this._step === 0) {
        var index = offsetValue / this._step;
        if (index >= 0 && index < this.size) {
          return index
        }
      }
      return -1;
    };

    Range.prototype.lastIndexOf = function(searchValue) {
      return this.indexOf(searchValue);
    };

    Range.prototype.__iterate = function(fn, reverse) {
      var maxIndex = this.size - 1;
      var step = this._step;
      var value = reverse ? this._start + maxIndex * step : this._start;
      for (var ii = 0; ii <= maxIndex; ii++) {
        if (fn(value, ii, this) === false) {
          return ii + 1;
        }
        value += reverse ? -step : step;
      }
      return ii;
    };

    Range.prototype.__iterator = function(type, reverse) {
      var maxIndex = this.size - 1;
      var step = this._step;
      var value = reverse ? this._start + maxIndex * step : this._start;
      var ii = 0;
      return new Iterator(function()  {
        var v = value;
        value += reverse ? -step : step;
        return ii > maxIndex ? iteratorDone() : iteratorValue(type, ii++, v);
      });
    };

    Range.prototype.equals = function(other) {
      return other instanceof Range ?
        this._start === other._start &&
        this._end === other._end &&
        this._step === other._step :
        deepEqual(this, other);
    };


  var EMPTY_RANGE;

  createClass(Collection, Iterable);
    function Collection() {
      throw TypeError('Abstract');
    }


  createClass(KeyedCollection, Collection);function KeyedCollection() {}

  createClass(IndexedCollection, Collection);function IndexedCollection() {}

  createClass(SetCollection, Collection);function SetCollection() {}


  Collection.Keyed = KeyedCollection;
  Collection.Indexed = IndexedCollection;
  Collection.Set = SetCollection;

  var imul =
    typeof Math.imul === 'function' && Math.imul(0xffffffff, 2) === -2 ?
    Math.imul :
    function imul(a, b) {
      a = a | 0; // int
      b = b | 0; // int
      var c = a & 0xffff;
      var d = b & 0xffff;
      // Shift by 0 fixes the sign on the high part.
      return (c * d) + ((((a >>> 16) * d + c * (b >>> 16)) << 16) >>> 0) | 0; // int
    };

  // v8 has an optimization for storing 31-bit signed numbers.
  // Values which have either 00 or 11 as the high order bits qualify.
  // This function drops the highest order bit in a signed number, maintaining
  // the sign bit.
  function smi(i32) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xBFFFFFFF);
  }

  function hash(o) {
    if (o === false || o === null || o === undefined) {
      return 0;
    }
    if (typeof o.valueOf === 'function') {
      o = o.valueOf();
      if (o === false || o === null || o === undefined) {
        return 0;
      }
    }
    if (o === true) {
      return 1;
    }
    var type = typeof o;
    if (type === 'number') {
      if (o !== o || o === Infinity) {
        return 0;
      }
      var h = o | 0;
      if (h !== o) {
        h ^= o * 0xFFFFFFFF;
      }
      while (o > 0xFFFFFFFF) {
        o /= 0xFFFFFFFF;
        h ^= o;
      }
      return smi(h);
    }
    if (type === 'string') {
      return o.length > STRING_HASH_CACHE_MIN_STRLEN ? cachedHashString(o) : hashString(o);
    }
    if (typeof o.hashCode === 'function') {
      return o.hashCode();
    }
    if (type === 'object') {
      return hashJSObj(o);
    }
    if (typeof o.toString === 'function') {
      return hashString(o.toString());
    }
    throw new Error('Value type ' + type + ' cannot be hashed.');
  }

  function cachedHashString(string) {
    var hash = stringHashCache[string];
    if (hash === undefined) {
      hash = hashString(string);
      if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
        STRING_HASH_CACHE_SIZE = 0;
        stringHashCache = {};
      }
      STRING_HASH_CACHE_SIZE++;
      stringHashCache[string] = hash;
    }
    return hash;
  }

  // http://jsperf.com/hashing-strings
  function hashString(string) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
    // (exclusive) by dropping high bits.
    var hash = 0;
    for (var ii = 0; ii < string.length; ii++) {
      hash = 31 * hash + string.charCodeAt(ii) | 0;
    }
    return smi(hash);
  }

  function hashJSObj(obj) {
    var hash;
    if (usingWeakMap) {
      hash = weakMap.get(obj);
      if (hash !== undefined) {
        return hash;
      }
    }

    hash = obj[UID_HASH_KEY];
    if (hash !== undefined) {
      return hash;
    }

    if (!canDefineProperty) {
      hash = obj.propertyIsEnumerable && obj.propertyIsEnumerable[UID_HASH_KEY];
      if (hash !== undefined) {
        return hash;
      }

      hash = getIENodeHash(obj);
      if (hash !== undefined) {
        return hash;
      }
    }

    hash = ++objHashUID;
    if (objHashUID & 0x40000000) {
      objHashUID = 0;
    }

    if (usingWeakMap) {
      weakMap.set(obj, hash);
    } else if (isExtensible !== undefined && isExtensible(obj) === false) {
      throw new Error('Non-extensible objects are not allowed as keys.');
    } else if (canDefineProperty) {
      Object.defineProperty(obj, UID_HASH_KEY, {
        'enumerable': false,
        'configurable': false,
        'writable': false,
        'value': hash
      });
    } else if (obj.propertyIsEnumerable !== undefined &&
               obj.propertyIsEnumerable === obj.constructor.prototype.propertyIsEnumerable) {
      // Since we can't define a non-enumerable property on the object
      // we'll hijack one of the less-used non-enumerable properties to
      // save our hash on it. Since this is a function it will not show up in
      // `JSON.stringify` which is what we want.
      obj.propertyIsEnumerable = function() {
        return this.constructor.prototype.propertyIsEnumerable.apply(this, arguments);
      };
      obj.propertyIsEnumerable[UID_HASH_KEY] = hash;
    } else if (obj.nodeType !== undefined) {
      // At this point we couldn't get the IE `uniqueID` to use as a hash
      // and we couldn't use a non-enumerable property to exploit the
      // dontEnum bug so we simply add the `UID_HASH_KEY` on the node
      // itself.
      obj[UID_HASH_KEY] = hash;
    } else {
      throw new Error('Unable to set a non-enumerable property on object.');
    }

    return hash;
  }

  // Get references to ES5 object methods.
  var isExtensible = Object.isExtensible;

  // True if Object.defineProperty works as expected. IE8 fails this test.
  var canDefineProperty = (function() {
    try {
      Object.defineProperty({}, '@', {});
      return true;
    } catch (e) {
      return false;
    }
  }());

  // IE has a `uniqueID` property on DOM nodes. We can construct the hash from it
  // and avoid memory leaks from the IE cloneNode bug.
  function getIENodeHash(node) {
    if (node && node.nodeType > 0) {
      switch (node.nodeType) {
        case 1: // Element
          return node.uniqueID;
        case 9: // Document
          return node.documentElement && node.documentElement.uniqueID;
      }
    }
  }

  // If possible, use a WeakMap.
  var usingWeakMap = typeof WeakMap === 'function';
  var weakMap;
  if (usingWeakMap) {
    weakMap = new WeakMap();
  }

  var objHashUID = 0;

  var UID_HASH_KEY = '__immutablehash__';
  if (typeof Symbol === 'function') {
    UID_HASH_KEY = Symbol(UID_HASH_KEY);
  }

  var STRING_HASH_CACHE_MIN_STRLEN = 16;
  var STRING_HASH_CACHE_MAX_SIZE = 255;
  var STRING_HASH_CACHE_SIZE = 0;
  var stringHashCache = {};

  function assertNotInfinite(size) {
    invariant(
      size !== Infinity,
      'Cannot perform this action with an infinite size.'
    );
  }

  createClass(Map, KeyedCollection);

    // @pragma Construction

    function Map(value) {
      return value === null || value === undefined ? emptyMap() :
        isMap(value) && !isOrdered(value) ? value :
        emptyMap().withMutations(function(map ) {
          var iter = KeyedIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v, k)  {return map.set(k, v)});
        });
    }

    Map.of = function() {var keyValues = SLICE$0.call(arguments, 0);
      return emptyMap().withMutations(function(map ) {
        for (var i = 0; i < keyValues.length; i += 2) {
          if (i + 1 >= keyValues.length) {
            throw new Error('Missing value for key: ' + keyValues[i]);
          }
          map.set(keyValues[i], keyValues[i + 1]);
        }
      });
    };

    Map.prototype.toString = function() {
      return this.__toString('Map {', '}');
    };

    // @pragma Access

    Map.prototype.get = function(k, notSetValue) {
      return this._root ?
        this._root.get(0, undefined, k, notSetValue) :
        notSetValue;
    };

    // @pragma Modification

    Map.prototype.set = function(k, v) {
      return updateMap(this, k, v);
    };

    Map.prototype.setIn = function(keyPath, v) {
      return this.updateIn(keyPath, NOT_SET, function()  {return v});
    };

    Map.prototype.remove = function(k) {
      return updateMap(this, k, NOT_SET);
    };

    Map.prototype.deleteIn = function(keyPath) {
      return this.updateIn(keyPath, function()  {return NOT_SET});
    };

    Map.prototype.update = function(k, notSetValue, updater) {
      return arguments.length === 1 ?
        k(this) :
        this.updateIn([k], notSetValue, updater);
    };

    Map.prototype.updateIn = function(keyPath, notSetValue, updater) {
      if (!updater) {
        updater = notSetValue;
        notSetValue = undefined;
      }
      var updatedValue = updateInDeepMap(
        this,
        forceIterator(keyPath),
        notSetValue,
        updater
      );
      return updatedValue === NOT_SET ? undefined : updatedValue;
    };

    Map.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._root = null;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyMap();
    };

    // @pragma Composition

    Map.prototype.merge = function(/*...iters*/) {
      return mergeIntoMapWith(this, undefined, arguments);
    };

    Map.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoMapWith(this, merger, iters);
    };

    Map.prototype.mergeIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
      return this.updateIn(
        keyPath,
        emptyMap(),
        function(m ) {return typeof m.merge === 'function' ?
          m.merge.apply(m, iters) :
          iters[iters.length - 1]}
      );
    };

    Map.prototype.mergeDeep = function(/*...iters*/) {
      return mergeIntoMapWith(this, deepMerger, arguments);
    };

    Map.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoMapWith(this, deepMergerWith(merger), iters);
    };

    Map.prototype.mergeDeepIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
      return this.updateIn(
        keyPath,
        emptyMap(),
        function(m ) {return typeof m.mergeDeep === 'function' ?
          m.mergeDeep.apply(m, iters) :
          iters[iters.length - 1]}
      );
    };

    Map.prototype.sort = function(comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator));
    };

    Map.prototype.sortBy = function(mapper, comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator, mapper));
    };

    // @pragma Mutability

    Map.prototype.withMutations = function(fn) {
      var mutable = this.asMutable();
      fn(mutable);
      return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
    };

    Map.prototype.asMutable = function() {
      return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
    };

    Map.prototype.asImmutable = function() {
      return this.__ensureOwner();
    };

    Map.prototype.wasAltered = function() {
      return this.__altered;
    };

    Map.prototype.__iterator = function(type, reverse) {
      return new MapIterator(this, type, reverse);
    };

    Map.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      this._root && this._root.iterate(function(entry ) {
        iterations++;
        return fn(entry[1], entry[0], this$0);
      }, reverse);
      return iterations;
    };

    Map.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeMap(this.size, this._root, ownerID, this.__hash);
    };


  function isMap(maybeMap) {
    return !!(maybeMap && maybeMap[IS_MAP_SENTINEL]);
  }

  Map.isMap = isMap;

  var IS_MAP_SENTINEL = '@@__IMMUTABLE_MAP__@@';

  var MapPrototype = Map.prototype;
  MapPrototype[IS_MAP_SENTINEL] = true;
  MapPrototype[DELETE] = MapPrototype.remove;
  MapPrototype.removeIn = MapPrototype.deleteIn;


  // #pragma Trie Nodes



    function ArrayMapNode(ownerID, entries) {
      this.ownerID = ownerID;
      this.entries = entries;
    }

    ArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      var entries = this.entries;
      for (var ii = 0, len = entries.length; ii < len; ii++) {
        if (is(key, entries[ii][0])) {
          return entries[ii][1];
        }
      }
      return notSetValue;
    };

    ArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      var removed = value === NOT_SET;

      var entries = this.entries;
      var idx = 0;
      for (var len = entries.length; idx < len; idx++) {
        if (is(key, entries[idx][0])) {
          break;
        }
      }
      var exists = idx < len;

      if (exists ? entries[idx][1] === value : removed) {
        return this;
      }

      SetRef(didAlter);
      (removed || !exists) && SetRef(didChangeSize);

      if (removed && entries.length === 1) {
        return; // undefined
      }

      if (!exists && !removed && entries.length >= MAX_ARRAY_MAP_SIZE) {
        return createNodes(ownerID, entries, key, value);
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newEntries = isEditable ? entries : arrCopy(entries);

      if (exists) {
        if (removed) {
          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
        } else {
          newEntries[idx] = [key, value];
        }
      } else {
        newEntries.push([key, value]);
      }

      if (isEditable) {
        this.entries = newEntries;
        return this;
      }

      return new ArrayMapNode(ownerID, newEntries);
    };




    function BitmapIndexedNode(ownerID, bitmap, nodes) {
      this.ownerID = ownerID;
      this.bitmap = bitmap;
      this.nodes = nodes;
    }

    BitmapIndexedNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var bit = (1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK));
      var bitmap = this.bitmap;
      return (bitmap & bit) === 0 ? notSetValue :
        this.nodes[popCount(bitmap & (bit - 1))].get(shift + SHIFT, keyHash, key, notSetValue);
    };

    BitmapIndexedNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var bit = 1 << keyHashFrag;
      var bitmap = this.bitmap;
      var exists = (bitmap & bit) !== 0;

      if (!exists && value === NOT_SET) {
        return this;
      }

      var idx = popCount(bitmap & (bit - 1));
      var nodes = this.nodes;
      var node = exists ? nodes[idx] : undefined;
      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);

      if (newNode === node) {
        return this;
      }

      if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
        return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
      }

      if (exists && !newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
        return nodes[idx ^ 1];
      }

      if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
        return newNode;
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newBitmap = exists ? newNode ? bitmap : bitmap ^ bit : bitmap | bit;
      var newNodes = exists ? newNode ?
        setIn(nodes, idx, newNode, isEditable) :
        spliceOut(nodes, idx, isEditable) :
        spliceIn(nodes, idx, newNode, isEditable);

      if (isEditable) {
        this.bitmap = newBitmap;
        this.nodes = newNodes;
        return this;
      }

      return new BitmapIndexedNode(ownerID, newBitmap, newNodes);
    };




    function HashArrayMapNode(ownerID, count, nodes) {
      this.ownerID = ownerID;
      this.count = count;
      this.nodes = nodes;
    }

    HashArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var node = this.nodes[idx];
      return node ? node.get(shift + SHIFT, keyHash, key, notSetValue) : notSetValue;
    };

    HashArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var removed = value === NOT_SET;
      var nodes = this.nodes;
      var node = nodes[idx];

      if (removed && !node) {
        return this;
      }

      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);
      if (newNode === node) {
        return this;
      }

      var newCount = this.count;
      if (!node) {
        newCount++;
      } else if (!newNode) {
        newCount--;
        if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
          return packNodes(ownerID, nodes, newCount, idx);
        }
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newNodes = setIn(nodes, idx, newNode, isEditable);

      if (isEditable) {
        this.count = newCount;
        this.nodes = newNodes;
        return this;
      }

      return new HashArrayMapNode(ownerID, newCount, newNodes);
    };




    function HashCollisionNode(ownerID, keyHash, entries) {
      this.ownerID = ownerID;
      this.keyHash = keyHash;
      this.entries = entries;
    }

    HashCollisionNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      var entries = this.entries;
      for (var ii = 0, len = entries.length; ii < len; ii++) {
        if (is(key, entries[ii][0])) {
          return entries[ii][1];
        }
      }
      return notSetValue;
    };

    HashCollisionNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }

      var removed = value === NOT_SET;

      if (keyHash !== this.keyHash) {
        if (removed) {
          return this;
        }
        SetRef(didAlter);
        SetRef(didChangeSize);
        return mergeIntoNode(this, ownerID, shift, keyHash, [key, value]);
      }

      var entries = this.entries;
      var idx = 0;
      for (var len = entries.length; idx < len; idx++) {
        if (is(key, entries[idx][0])) {
          break;
        }
      }
      var exists = idx < len;

      if (exists ? entries[idx][1] === value : removed) {
        return this;
      }

      SetRef(didAlter);
      (removed || !exists) && SetRef(didChangeSize);

      if (removed && len === 2) {
        return new ValueNode(ownerID, this.keyHash, entries[idx ^ 1]);
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newEntries = isEditable ? entries : arrCopy(entries);

      if (exists) {
        if (removed) {
          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
        } else {
          newEntries[idx] = [key, value];
        }
      } else {
        newEntries.push([key, value]);
      }

      if (isEditable) {
        this.entries = newEntries;
        return this;
      }

      return new HashCollisionNode(ownerID, this.keyHash, newEntries);
    };




    function ValueNode(ownerID, keyHash, entry) {
      this.ownerID = ownerID;
      this.keyHash = keyHash;
      this.entry = entry;
    }

    ValueNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      return is(key, this.entry[0]) ? this.entry[1] : notSetValue;
    };

    ValueNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      var removed = value === NOT_SET;
      var keyMatch = is(key, this.entry[0]);
      if (keyMatch ? value === this.entry[1] : removed) {
        return this;
      }

      SetRef(didAlter);

      if (removed) {
        SetRef(didChangeSize);
        return; // undefined
      }

      if (keyMatch) {
        if (ownerID && ownerID === this.ownerID) {
          this.entry[1] = value;
          return this;
        }
        return new ValueNode(ownerID, this.keyHash, [key, value]);
      }

      SetRef(didChangeSize);
      return mergeIntoNode(this, ownerID, shift, hash(key), [key, value]);
    };



  // #pragma Iterators

  ArrayMapNode.prototype.iterate =
  HashCollisionNode.prototype.iterate = function (fn, reverse) {
    var entries = this.entries;
    for (var ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      if (fn(entries[reverse ? maxIndex - ii : ii]) === false) {
        return false;
      }
    }
  }

  BitmapIndexedNode.prototype.iterate =
  HashArrayMapNode.prototype.iterate = function (fn, reverse) {
    var nodes = this.nodes;
    for (var ii = 0, maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
      var node = nodes[reverse ? maxIndex - ii : ii];
      if (node && node.iterate(fn, reverse) === false) {
        return false;
      }
    }
  }

  ValueNode.prototype.iterate = function (fn, reverse) {
    return fn(this.entry);
  }

  createClass(MapIterator, Iterator);

    function MapIterator(map, type, reverse) {
      this._type = type;
      this._reverse = reverse;
      this._stack = map._root && mapIteratorFrame(map._root);
    }

    MapIterator.prototype.next = function() {
      var type = this._type;
      var stack = this._stack;
      while (stack) {
        var node = stack.node;
        var index = stack.index++;
        var maxIndex;
        if (node.entry) {
          if (index === 0) {
            return mapIteratorValue(type, node.entry);
          }
        } else if (node.entries) {
          maxIndex = node.entries.length - 1;
          if (index <= maxIndex) {
            return mapIteratorValue(type, node.entries[this._reverse ? maxIndex - index : index]);
          }
        } else {
          maxIndex = node.nodes.length - 1;
          if (index <= maxIndex) {
            var subNode = node.nodes[this._reverse ? maxIndex - index : index];
            if (subNode) {
              if (subNode.entry) {
                return mapIteratorValue(type, subNode.entry);
              }
              stack = this._stack = mapIteratorFrame(subNode, stack);
            }
            continue;
          }
        }
        stack = this._stack = this._stack.__prev;
      }
      return iteratorDone();
    };


  function mapIteratorValue(type, entry) {
    return iteratorValue(type, entry[0], entry[1]);
  }

  function mapIteratorFrame(node, prev) {
    return {
      node: node,
      index: 0,
      __prev: prev
    };
  }

  function makeMap(size, root, ownerID, hash) {
    var map = Object.create(MapPrototype);
    map.size = size;
    map._root = root;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_MAP;
  function emptyMap() {
    return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
  }

  function updateMap(map, k, v) {
    var newRoot;
    var newSize;
    if (!map._root) {
      if (v === NOT_SET) {
        return map;
      }
      newSize = 1;
      newRoot = new ArrayMapNode(map.__ownerID, [[k, v]]);
    } else {
      var didChangeSize = MakeRef(CHANGE_LENGTH);
      var didAlter = MakeRef(DID_ALTER);
      newRoot = updateNode(map._root, map.__ownerID, 0, undefined, k, v, didChangeSize, didAlter);
      if (!didAlter.value) {
        return map;
      }
      newSize = map.size + (didChangeSize.value ? v === NOT_SET ? -1 : 1 : 0);
    }
    if (map.__ownerID) {
      map.size = newSize;
      map._root = newRoot;
      map.__hash = undefined;
      map.__altered = true;
      return map;
    }
    return newRoot ? makeMap(newSize, newRoot) : emptyMap();
  }

  function updateNode(node, ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (!node) {
      if (value === NOT_SET) {
        return node;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return new ValueNode(ownerID, keyHash, [key, value]);
    }
    return node.update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter);
  }

  function isLeafNode(node) {
    return node.constructor === ValueNode || node.constructor === HashCollisionNode;
  }

  function mergeIntoNode(node, ownerID, shift, keyHash, entry) {
    if (node.keyHash === keyHash) {
      return new HashCollisionNode(ownerID, keyHash, [node.entry, entry]);
    }

    var idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK;
    var idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;

    var newNode;
    var nodes = idx1 === idx2 ?
      [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)] :
      ((newNode = new ValueNode(ownerID, keyHash, entry)), idx1 < idx2 ? [node, newNode] : [newNode, node]);

    return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
  }

  function createNodes(ownerID, entries, key, value) {
    if (!ownerID) {
      ownerID = new OwnerID();
    }
    var node = new ValueNode(ownerID, hash(key), [key, value]);
    for (var ii = 0; ii < entries.length; ii++) {
      var entry = entries[ii];
      node = node.update(ownerID, 0, undefined, entry[0], entry[1]);
    }
    return node;
  }

  function packNodes(ownerID, nodes, count, excluding) {
    var bitmap = 0;
    var packedII = 0;
    var packedNodes = new Array(count);
    for (var ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
      var node = nodes[ii];
      if (node !== undefined && ii !== excluding) {
        bitmap |= bit;
        packedNodes[packedII++] = node;
      }
    }
    return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
  }

  function expandNodes(ownerID, nodes, bitmap, including, node) {
    var count = 0;
    var expandedNodes = new Array(SIZE);
    for (var ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
      expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
    }
    expandedNodes[including] = node;
    return new HashArrayMapNode(ownerID, count + 1, expandedNodes);
  }

  function mergeIntoMapWith(map, merger, iterables) {
    var iters = [];
    for (var ii = 0; ii < iterables.length; ii++) {
      var value = iterables[ii];
      var iter = KeyedIterable(value);
      if (!isIterable(value)) {
        iter = iter.map(function(v ) {return fromJS(v)});
      }
      iters.push(iter);
    }
    return mergeIntoCollectionWith(map, merger, iters);
  }

  function deepMerger(existing, value, key) {
    return existing && existing.mergeDeep && isIterable(value) ?
      existing.mergeDeep(value) :
      is(existing, value) ? existing : value;
  }

  function deepMergerWith(merger) {
    return function(existing, value, key)  {
      if (existing && existing.mergeDeepWith && isIterable(value)) {
        return existing.mergeDeepWith(merger, value);
      }
      var nextValue = merger(existing, value, key);
      return is(existing, nextValue) ? existing : nextValue;
    };
  }

  function mergeIntoCollectionWith(collection, merger, iters) {
    iters = iters.filter(function(x ) {return x.size !== 0});
    if (iters.length === 0) {
      return collection;
    }
    if (collection.size === 0 && !collection.__ownerID && iters.length === 1) {
      return collection.constructor(iters[0]);
    }
    return collection.withMutations(function(collection ) {
      var mergeIntoMap = merger ?
        function(value, key)  {
          collection.update(key, NOT_SET, function(existing )
            {return existing === NOT_SET ? value : merger(existing, value, key)}
          );
        } :
        function(value, key)  {
          collection.set(key, value);
        }
      for (var ii = 0; ii < iters.length; ii++) {
        iters[ii].forEach(mergeIntoMap);
      }
    });
  }

  function updateInDeepMap(existing, keyPathIter, notSetValue, updater) {
    var isNotSet = existing === NOT_SET;
    var step = keyPathIter.next();
    if (step.done) {
      var existingValue = isNotSet ? notSetValue : existing;
      var newValue = updater(existingValue);
      return newValue === existingValue ? existing : newValue;
    }
    invariant(
      isNotSet || (existing && existing.set),
      'invalid keyPath'
    );
    var key = step.value;
    var nextExisting = isNotSet ? NOT_SET : existing.get(key, NOT_SET);
    var nextUpdated = updateInDeepMap(
      nextExisting,
      keyPathIter,
      notSetValue,
      updater
    );
    return nextUpdated === nextExisting ? existing :
      nextUpdated === NOT_SET ? existing.remove(key) :
      (isNotSet ? emptyMap() : existing).set(key, nextUpdated);
  }

  function popCount(x) {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    x = x + (x >> 8);
    x = x + (x >> 16);
    return x & 0x7f;
  }

  function setIn(array, idx, val, canEdit) {
    var newArray = canEdit ? array : arrCopy(array);
    newArray[idx] = val;
    return newArray;
  }

  function spliceIn(array, idx, val, canEdit) {
    var newLen = array.length + 1;
    if (canEdit && idx + 1 === newLen) {
      array[idx] = val;
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        newArray[ii] = val;
        after = -1;
      } else {
        newArray[ii] = array[ii + after];
      }
    }
    return newArray;
  }

  function spliceOut(array, idx, canEdit) {
    var newLen = array.length - 1;
    if (canEdit && idx === newLen) {
      array.pop();
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        after = 1;
      }
      newArray[ii] = array[ii + after];
    }
    return newArray;
  }

  var MAX_ARRAY_MAP_SIZE = SIZE / 4;
  var MAX_BITMAP_INDEXED_SIZE = SIZE / 2;
  var MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4;

  createClass(List, IndexedCollection);

    // @pragma Construction

    function List(value) {
      var empty = emptyList();
      if (value === null || value === undefined) {
        return empty;
      }
      if (isList(value)) {
        return value;
      }
      var iter = IndexedIterable(value);
      var size = iter.size;
      if (size === 0) {
        return empty;
      }
      assertNotInfinite(size);
      if (size > 0 && size < SIZE) {
        return makeList(0, size, SHIFT, null, new VNode(iter.toArray()));
      }
      return empty.withMutations(function(list ) {
        list.setSize(size);
        iter.forEach(function(v, i)  {return list.set(i, v)});
      });
    }

    List.of = function(/*...values*/) {
      return this(arguments);
    };

    List.prototype.toString = function() {
      return this.__toString('List [', ']');
    };

    // @pragma Access

    List.prototype.get = function(index, notSetValue) {
      index = wrapIndex(this, index);
      if (index >= 0 && index < this.size) {
        index += this._origin;
        var node = listNodeFor(this, index);
        return node && node.array[index & MASK];
      }
      return notSetValue;
    };

    // @pragma Modification

    List.prototype.set = function(index, value) {
      return updateList(this, index, value);
    };

    List.prototype.remove = function(index) {
      return !this.has(index) ? this :
        index === 0 ? this.shift() :
        index === this.size - 1 ? this.pop() :
        this.splice(index, 1);
    };

    List.prototype.insert = function(index, value) {
      return this.splice(index, 0, value);
    };

    List.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = this._origin = this._capacity = 0;
        this._level = SHIFT;
        this._root = this._tail = null;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyList();
    };

    List.prototype.push = function(/*...values*/) {
      var values = arguments;
      var oldSize = this.size;
      return this.withMutations(function(list ) {
        setListBounds(list, 0, oldSize + values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(oldSize + ii, values[ii]);
        }
      });
    };

    List.prototype.pop = function() {
      return setListBounds(this, 0, -1);
    };

    List.prototype.unshift = function(/*...values*/) {
      var values = arguments;
      return this.withMutations(function(list ) {
        setListBounds(list, -values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(ii, values[ii]);
        }
      });
    };

    List.prototype.shift = function() {
      return setListBounds(this, 1);
    };

    // @pragma Composition

    List.prototype.merge = function(/*...iters*/) {
      return mergeIntoListWith(this, undefined, arguments);
    };

    List.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoListWith(this, merger, iters);
    };

    List.prototype.mergeDeep = function(/*...iters*/) {
      return mergeIntoListWith(this, deepMerger, arguments);
    };

    List.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoListWith(this, deepMergerWith(merger), iters);
    };

    List.prototype.setSize = function(size) {
      return setListBounds(this, 0, size);
    };

    // @pragma Iteration

    List.prototype.slice = function(begin, end) {
      var size = this.size;
      if (wholeSlice(begin, end, size)) {
        return this;
      }
      return setListBounds(
        this,
        resolveBegin(begin, size),
        resolveEnd(end, size)
      );
    };

    List.prototype.__iterator = function(type, reverse) {
      var index = 0;
      var values = iterateList(this, reverse);
      return new Iterator(function()  {
        var value = values();
        return value === DONE ?
          iteratorDone() :
          iteratorValue(type, index++, value);
      });
    };

    List.prototype.__iterate = function(fn, reverse) {
      var index = 0;
      var values = iterateList(this, reverse);
      var value;
      while ((value = values()) !== DONE) {
        if (fn(value, index++, this) === false) {
          break;
        }
      }
      return index;
    };

    List.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        return this;
      }
      return makeList(this._origin, this._capacity, this._level, this._root, this._tail, ownerID, this.__hash);
    };


  function isList(maybeList) {
    return !!(maybeList && maybeList[IS_LIST_SENTINEL]);
  }

  List.isList = isList;

  var IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';

  var ListPrototype = List.prototype;
  ListPrototype[IS_LIST_SENTINEL] = true;
  ListPrototype[DELETE] = ListPrototype.remove;
  ListPrototype.setIn = MapPrototype.setIn;
  ListPrototype.deleteIn =
  ListPrototype.removeIn = MapPrototype.removeIn;
  ListPrototype.update = MapPrototype.update;
  ListPrototype.updateIn = MapPrototype.updateIn;
  ListPrototype.mergeIn = MapPrototype.mergeIn;
  ListPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
  ListPrototype.withMutations = MapPrototype.withMutations;
  ListPrototype.asMutable = MapPrototype.asMutable;
  ListPrototype.asImmutable = MapPrototype.asImmutable;
  ListPrototype.wasAltered = MapPrototype.wasAltered;



    function VNode(array, ownerID) {
      this.array = array;
      this.ownerID = ownerID;
    }

    // TODO: seems like these methods are very similar

    VNode.prototype.removeBefore = function(ownerID, level, index) {
      if (index === level ? 1 << level : 0 || this.array.length === 0) {
        return this;
      }
      var originIndex = (index >>> level) & MASK;
      if (originIndex >= this.array.length) {
        return new VNode([], ownerID);
      }
      var removingFirst = originIndex === 0;
      var newChild;
      if (level > 0) {
        var oldChild = this.array[originIndex];
        newChild = oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
        if (newChild === oldChild && removingFirst) {
          return this;
        }
      }
      if (removingFirst && !newChild) {
        return this;
      }
      var editable = editableVNode(this, ownerID);
      if (!removingFirst) {
        for (var ii = 0; ii < originIndex; ii++) {
          editable.array[ii] = undefined;
        }
      }
      if (newChild) {
        editable.array[originIndex] = newChild;
      }
      return editable;
    };

    VNode.prototype.removeAfter = function(ownerID, level, index) {
      if (index === (level ? 1 << level : 0) || this.array.length === 0) {
        return this;
      }
      var sizeIndex = ((index - 1) >>> level) & MASK;
      if (sizeIndex >= this.array.length) {
        return this;
      }

      var newChild;
      if (level > 0) {
        var oldChild = this.array[sizeIndex];
        newChild = oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
        if (newChild === oldChild && sizeIndex === this.array.length - 1) {
          return this;
        }
      }

      var editable = editableVNode(this, ownerID);
      editable.array.splice(sizeIndex + 1);
      if (newChild) {
        editable.array[sizeIndex] = newChild;
      }
      return editable;
    };



  var DONE = {};

  function iterateList(list, reverse) {
    var left = list._origin;
    var right = list._capacity;
    var tailPos = getTailOffset(right);
    var tail = list._tail;

    return iterateNodeOrLeaf(list._root, list._level, 0);

    function iterateNodeOrLeaf(node, level, offset) {
      return level === 0 ?
        iterateLeaf(node, offset) :
        iterateNode(node, level, offset);
    }

    function iterateLeaf(node, offset) {
      var array = offset === tailPos ? tail && tail.array : node && node.array;
      var from = offset > left ? 0 : left - offset;
      var to = right - offset;
      if (to > SIZE) {
        to = SIZE;
      }
      return function()  {
        if (from === to) {
          return DONE;
        }
        var idx = reverse ? --to : from++;
        return array && array[idx];
      };
    }

    function iterateNode(node, level, offset) {
      var values;
      var array = node && node.array;
      var from = offset > left ? 0 : (left - offset) >> level;
      var to = ((right - offset) >> level) + 1;
      if (to > SIZE) {
        to = SIZE;
      }
      return function()  {
        do {
          if (values) {
            var value = values();
            if (value !== DONE) {
              return value;
            }
            values = null;
          }
          if (from === to) {
            return DONE;
          }
          var idx = reverse ? --to : from++;
          values = iterateNodeOrLeaf(
            array && array[idx], level - SHIFT, offset + (idx << level)
          );
        } while (true);
      };
    }
  }

  function makeList(origin, capacity, level, root, tail, ownerID, hash) {
    var list = Object.create(ListPrototype);
    list.size = capacity - origin;
    list._origin = origin;
    list._capacity = capacity;
    list._level = level;
    list._root = root;
    list._tail = tail;
    list.__ownerID = ownerID;
    list.__hash = hash;
    list.__altered = false;
    return list;
  }

  var EMPTY_LIST;
  function emptyList() {
    return EMPTY_LIST || (EMPTY_LIST = makeList(0, 0, SHIFT));
  }

  function updateList(list, index, value) {
    index = wrapIndex(list, index);

    if (index !== index) {
      return list;
    }

    if (index >= list.size || index < 0) {
      return list.withMutations(function(list ) {
        index < 0 ?
          setListBounds(list, index).set(0, value) :
          setListBounds(list, 0, index + 1).set(index, value)
      });
    }

    index += list._origin;

    var newTail = list._tail;
    var newRoot = list._root;
    var didAlter = MakeRef(DID_ALTER);
    if (index >= getTailOffset(list._capacity)) {
      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
    } else {
      newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter);
    }

    if (!didAlter.value) {
      return list;
    }

    if (list.__ownerID) {
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
  }

  function updateVNode(node, ownerID, level, index, value, didAlter) {
    var idx = (index >>> level) & MASK;
    var nodeHas = node && idx < node.array.length;
    if (!nodeHas && value === undefined) {
      return node;
    }

    var newNode;

    if (level > 0) {
      var lowerNode = node && node.array[idx];
      var newLowerNode = updateVNode(lowerNode, ownerID, level - SHIFT, index, value, didAlter);
      if (newLowerNode === lowerNode) {
        return node;
      }
      newNode = editableVNode(node, ownerID);
      newNode.array[idx] = newLowerNode;
      return newNode;
    }

    if (nodeHas && node.array[idx] === value) {
      return node;
    }

    SetRef(didAlter);

    newNode = editableVNode(node, ownerID);
    if (value === undefined && idx === newNode.array.length - 1) {
      newNode.array.pop();
    } else {
      newNode.array[idx] = value;
    }
    return newNode;
  }

  function editableVNode(node, ownerID) {
    if (ownerID && node && ownerID === node.ownerID) {
      return node;
    }
    return new VNode(node ? node.array.slice() : [], ownerID);
  }

  function listNodeFor(list, rawIndex) {
    if (rawIndex >= getTailOffset(list._capacity)) {
      return list._tail;
    }
    if (rawIndex < 1 << (list._level + SHIFT)) {
      var node = list._root;
      var level = list._level;
      while (node && level > 0) {
        node = node.array[(rawIndex >>> level) & MASK];
        level -= SHIFT;
      }
      return node;
    }
  }

  function setListBounds(list, begin, end) {
    // Sanitize begin & end using this shorthand for ToInt32(argument)
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
    if (begin !== undefined) {
      begin = begin | 0;
    }
    if (end !== undefined) {
      end = end | 0;
    }
    var owner = list.__ownerID || new OwnerID();
    var oldOrigin = list._origin;
    var oldCapacity = list._capacity;
    var newOrigin = oldOrigin + begin;
    var newCapacity = end === undefined ? oldCapacity : end < 0 ? oldCapacity + end : oldOrigin + end;
    if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
      return list;
    }

    // If it's going to end after it starts, it's empty.
    if (newOrigin >= newCapacity) {
      return list.clear();
    }

    var newLevel = list._level;
    var newRoot = list._root;

    // New origin might need creating a higher root.
    var offsetShift = 0;
    while (newOrigin + offsetShift < 0) {
      newRoot = new VNode(newRoot && newRoot.array.length ? [undefined, newRoot] : [], owner);
      newLevel += SHIFT;
      offsetShift += 1 << newLevel;
    }
    if (offsetShift) {
      newOrigin += offsetShift;
      oldOrigin += offsetShift;
      newCapacity += offsetShift;
      oldCapacity += offsetShift;
    }

    var oldTailOffset = getTailOffset(oldCapacity);
    var newTailOffset = getTailOffset(newCapacity);

    // New size might need creating a higher root.
    while (newTailOffset >= 1 << (newLevel + SHIFT)) {
      newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
      newLevel += SHIFT;
    }

    // Locate or create the new tail.
    var oldTail = list._tail;
    var newTail = newTailOffset < oldTailOffset ?
      listNodeFor(list, newCapacity - 1) :
      newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;

    // Merge Tail into tree.
    if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.array.length) {
      newRoot = editableVNode(newRoot, owner);
      var node = newRoot;
      for (var level = newLevel; level > SHIFT; level -= SHIFT) {
        var idx = (oldTailOffset >>> level) & MASK;
        node = node.array[idx] = editableVNode(node.array[idx], owner);
      }
      node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
    }

    // If the size has been reduced, there's a chance the tail needs to be trimmed.
    if (newCapacity < oldCapacity) {
      newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
    }

    // If the new origin is within the tail, then we do not need a root.
    if (newOrigin >= newTailOffset) {
      newOrigin -= newTailOffset;
      newCapacity -= newTailOffset;
      newLevel = SHIFT;
      newRoot = null;
      newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);

    // Otherwise, if the root has been trimmed, garbage collect.
    } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
      offsetShift = 0;

      // Identify the new top root node of the subtree of the old root.
      while (newRoot) {
        var beginIndex = (newOrigin >>> newLevel) & MASK;
        if (beginIndex !== (newTailOffset >>> newLevel) & MASK) {
          break;
        }
        if (beginIndex) {
          offsetShift += (1 << newLevel) * beginIndex;
        }
        newLevel -= SHIFT;
        newRoot = newRoot.array[beginIndex];
      }

      // Trim the new sides of the new root.
      if (newRoot && newOrigin > oldOrigin) {
        newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
      }
      if (newRoot && newTailOffset < oldTailOffset) {
        newRoot = newRoot.removeAfter(owner, newLevel, newTailOffset - offsetShift);
      }
      if (offsetShift) {
        newOrigin -= offsetShift;
        newCapacity -= offsetShift;
      }
    }

    if (list.__ownerID) {
      list.size = newCapacity - newOrigin;
      list._origin = newOrigin;
      list._capacity = newCapacity;
      list._level = newLevel;
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
  }

  function mergeIntoListWith(list, merger, iterables) {
    var iters = [];
    var maxSize = 0;
    for (var ii = 0; ii < iterables.length; ii++) {
      var value = iterables[ii];
      var iter = IndexedIterable(value);
      if (iter.size > maxSize) {
        maxSize = iter.size;
      }
      if (!isIterable(value)) {
        iter = iter.map(function(v ) {return fromJS(v)});
      }
      iters.push(iter);
    }
    if (maxSize > list.size) {
      list = list.setSize(maxSize);
    }
    return mergeIntoCollectionWith(list, merger, iters);
  }

  function getTailOffset(size) {
    return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
  }

  createClass(OrderedMap, Map);

    // @pragma Construction

    function OrderedMap(value) {
      return value === null || value === undefined ? emptyOrderedMap() :
        isOrderedMap(value) ? value :
        emptyOrderedMap().withMutations(function(map ) {
          var iter = KeyedIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v, k)  {return map.set(k, v)});
        });
    }

    OrderedMap.of = function(/*...values*/) {
      return this(arguments);
    };

    OrderedMap.prototype.toString = function() {
      return this.__toString('OrderedMap {', '}');
    };

    // @pragma Access

    OrderedMap.prototype.get = function(k, notSetValue) {
      var index = this._map.get(k);
      return index !== undefined ? this._list.get(index)[1] : notSetValue;
    };

    // @pragma Modification

    OrderedMap.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._map.clear();
        this._list.clear();
        return this;
      }
      return emptyOrderedMap();
    };

    OrderedMap.prototype.set = function(k, v) {
      return updateOrderedMap(this, k, v);
    };

    OrderedMap.prototype.remove = function(k) {
      return updateOrderedMap(this, k, NOT_SET);
    };

    OrderedMap.prototype.wasAltered = function() {
      return this._map.wasAltered() || this._list.wasAltered();
    };

    OrderedMap.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._list.__iterate(
        function(entry ) {return entry && fn(entry[1], entry[0], this$0)},
        reverse
      );
    };

    OrderedMap.prototype.__iterator = function(type, reverse) {
      return this._list.fromEntrySeq().__iterator(type, reverse);
    };

    OrderedMap.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      var newList = this._list.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        this._list = newList;
        return this;
      }
      return makeOrderedMap(newMap, newList, ownerID, this.__hash);
    };


  function isOrderedMap(maybeOrderedMap) {
    return isMap(maybeOrderedMap) && isOrdered(maybeOrderedMap);
  }

  OrderedMap.isOrderedMap = isOrderedMap;

  OrderedMap.prototype[IS_ORDERED_SENTINEL] = true;
  OrderedMap.prototype[DELETE] = OrderedMap.prototype.remove;



  function makeOrderedMap(map, list, ownerID, hash) {
    var omap = Object.create(OrderedMap.prototype);
    omap.size = map ? map.size : 0;
    omap._map = map;
    omap._list = list;
    omap.__ownerID = ownerID;
    omap.__hash = hash;
    return omap;
  }

  var EMPTY_ORDERED_MAP;
  function emptyOrderedMap() {
    return EMPTY_ORDERED_MAP || (EMPTY_ORDERED_MAP = makeOrderedMap(emptyMap(), emptyList()));
  }

  function updateOrderedMap(omap, k, v) {
    var map = omap._map;
    var list = omap._list;
    var i = map.get(k);
    var has = i !== undefined;
    var newMap;
    var newList;
    if (v === NOT_SET) { // removed
      if (!has) {
        return omap;
      }
      if (list.size >= SIZE && list.size >= map.size * 2) {
        newList = list.filter(function(entry, idx)  {return entry !== undefined && i !== idx});
        newMap = newList.toKeyedSeq().map(function(entry ) {return entry[0]}).flip().toMap();
        if (omap.__ownerID) {
          newMap.__ownerID = newList.__ownerID = omap.__ownerID;
        }
      } else {
        newMap = map.remove(k);
        newList = i === list.size - 1 ? list.pop() : list.set(i, undefined);
      }
    } else {
      if (has) {
        if (v === list.get(i)[1]) {
          return omap;
        }
        newMap = map;
        newList = list.set(i, [k, v]);
      } else {
        newMap = map.set(k, list.size);
        newList = list.set(list.size, [k, v]);
      }
    }
    if (omap.__ownerID) {
      omap.size = newMap.size;
      omap._map = newMap;
      omap._list = newList;
      omap.__hash = undefined;
      return omap;
    }
    return makeOrderedMap(newMap, newList);
  }

  createClass(ToKeyedSequence, KeyedSeq);
    function ToKeyedSequence(indexed, useKeys) {
      this._iter = indexed;
      this._useKeys = useKeys;
      this.size = indexed.size;
    }

    ToKeyedSequence.prototype.get = function(key, notSetValue) {
      return this._iter.get(key, notSetValue);
    };

    ToKeyedSequence.prototype.has = function(key) {
      return this._iter.has(key);
    };

    ToKeyedSequence.prototype.valueSeq = function() {
      return this._iter.valueSeq();
    };

    ToKeyedSequence.prototype.reverse = function() {var this$0 = this;
      var reversedSequence = reverseFactory(this, true);
      if (!this._useKeys) {
        reversedSequence.valueSeq = function()  {return this$0._iter.toSeq().reverse()};
      }
      return reversedSequence;
    };

    ToKeyedSequence.prototype.map = function(mapper, context) {var this$0 = this;
      var mappedSequence = mapFactory(this, mapper, context);
      if (!this._useKeys) {
        mappedSequence.valueSeq = function()  {return this$0._iter.toSeq().map(mapper, context)};
      }
      return mappedSequence;
    };

    ToKeyedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var ii;
      return this._iter.__iterate(
        this._useKeys ?
          function(v, k)  {return fn(v, k, this$0)} :
          ((ii = reverse ? resolveSize(this) : 0),
            function(v ) {return fn(v, reverse ? --ii : ii++, this$0)}),
        reverse
      );
    };

    ToKeyedSequence.prototype.__iterator = function(type, reverse) {
      if (this._useKeys) {
        return this._iter.__iterator(type, reverse);
      }
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      var ii = reverse ? resolveSize(this) : 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, reverse ? --ii : ii++, step.value, step);
      });
    };

  ToKeyedSequence.prototype[IS_ORDERED_SENTINEL] = true;


  createClass(ToIndexedSequence, IndexedSeq);
    function ToIndexedSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    ToIndexedSequence.prototype.includes = function(value) {
      return this._iter.includes(value);
    };

    ToIndexedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      return this._iter.__iterate(function(v ) {return fn(v, iterations++, this$0)}, reverse);
    };

    ToIndexedSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      var iterations = 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, iterations++, step.value, step)
      });
    };



  createClass(ToSetSequence, SetSeq);
    function ToSetSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    ToSetSequence.prototype.has = function(key) {
      return this._iter.includes(key);
    };

    ToSetSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._iter.__iterate(function(v ) {return fn(v, v, this$0)}, reverse);
    };

    ToSetSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, step.value, step.value, step);
      });
    };



  createClass(FromEntriesSequence, KeyedSeq);
    function FromEntriesSequence(entries) {
      this._iter = entries;
      this.size = entries.size;
    }

    FromEntriesSequence.prototype.entrySeq = function() {
      return this._iter.toSeq();
    };

    FromEntriesSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._iter.__iterate(function(entry ) {
        // Check if entry exists first so array access doesn't throw for holes
        // in the parent iteration.
        if (entry) {
          validateEntry(entry);
          var indexedIterable = isIterable(entry);
          return fn(
            indexedIterable ? entry.get(1) : entry[1],
            indexedIterable ? entry.get(0) : entry[0],
            this$0
          );
        }
      }, reverse);
    };

    FromEntriesSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function()  {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          // Check if entry exists first so array access doesn't throw for holes
          // in the parent iteration.
          if (entry) {
            validateEntry(entry);
            var indexedIterable = isIterable(entry);
            return iteratorValue(
              type,
              indexedIterable ? entry.get(0) : entry[0],
              indexedIterable ? entry.get(1) : entry[1],
              step
            );
          }
        }
      });
    };


  ToIndexedSequence.prototype.cacheResult =
  ToKeyedSequence.prototype.cacheResult =
  ToSetSequence.prototype.cacheResult =
  FromEntriesSequence.prototype.cacheResult =
    cacheResultThrough;


  function flipFactory(iterable) {
    var flipSequence = makeSequence(iterable);
    flipSequence._iter = iterable;
    flipSequence.size = iterable.size;
    flipSequence.flip = function()  {return iterable};
    flipSequence.reverse = function () {
      var reversedSequence = iterable.reverse.apply(this); // super.reverse()
      reversedSequence.flip = function()  {return iterable.reverse()};
      return reversedSequence;
    };
    flipSequence.has = function(key ) {return iterable.includes(key)};
    flipSequence.includes = function(key ) {return iterable.has(key)};
    flipSequence.cacheResult = cacheResultThrough;
    flipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(function(v, k)  {return fn(k, v, this$0) !== false}, reverse);
    }
    flipSequence.__iteratorUncached = function(type, reverse) {
      if (type === ITERATE_ENTRIES) {
        var iterator = iterable.__iterator(type, reverse);
        return new Iterator(function()  {
          var step = iterator.next();
          if (!step.done) {
            var k = step.value[0];
            step.value[0] = step.value[1];
            step.value[1] = k;
          }
          return step;
        });
      }
      return iterable.__iterator(
        type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES,
        reverse
      );
    }
    return flipSequence;
  }


  function mapFactory(iterable, mapper, context) {
    var mappedSequence = makeSequence(iterable);
    mappedSequence.size = iterable.size;
    mappedSequence.has = function(key ) {return iterable.has(key)};
    mappedSequence.get = function(key, notSetValue)  {
      var v = iterable.get(key, NOT_SET);
      return v === NOT_SET ?
        notSetValue :
        mapper.call(context, v, key, iterable);
    };
    mappedSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(
        function(v, k, c)  {return fn(mapper.call(context, v, k, c), k, this$0) !== false},
        reverse
      );
    }
    mappedSequence.__iteratorUncached = function (type, reverse) {
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      return new Iterator(function()  {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var key = entry[0];
        return iteratorValue(
          type,
          key,
          mapper.call(context, entry[1], key, iterable),
          step
        );
      });
    }
    return mappedSequence;
  }


  function reverseFactory(iterable, useKeys) {
    var reversedSequence = makeSequence(iterable);
    reversedSequence._iter = iterable;
    reversedSequence.size = iterable.size;
    reversedSequence.reverse = function()  {return iterable};
    if (iterable.flip) {
      reversedSequence.flip = function () {
        var flipSequence = flipFactory(iterable);
        flipSequence.reverse = function()  {return iterable.flip()};
        return flipSequence;
      };
    }
    reversedSequence.get = function(key, notSetValue) 
      {return iterable.get(useKeys ? key : -1 - key, notSetValue)};
    reversedSequence.has = function(key )
      {return iterable.has(useKeys ? key : -1 - key)};
    reversedSequence.includes = function(value ) {return iterable.includes(value)};
    reversedSequence.cacheResult = cacheResultThrough;
    reversedSequence.__iterate = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(function(v, k)  {return fn(v, k, this$0)}, !reverse);
    };
    reversedSequence.__iterator =
      function(type, reverse)  {return iterable.__iterator(type, !reverse)};
    return reversedSequence;
  }


  function filterFactory(iterable, predicate, context, useKeys) {
    var filterSequence = makeSequence(iterable);
    if (useKeys) {
      filterSequence.has = function(key ) {
        var v = iterable.get(key, NOT_SET);
        return v !== NOT_SET && !!predicate.call(context, v, key, iterable);
      };
      filterSequence.get = function(key, notSetValue)  {
        var v = iterable.get(key, NOT_SET);
        return v !== NOT_SET && predicate.call(context, v, key, iterable) ?
          v : notSetValue;
      };
    }
    filterSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      var iterations = 0;
      iterable.__iterate(function(v, k, c)  {
        if (predicate.call(context, v, k, c)) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0);
        }
      }, reverse);
      return iterations;
    };
    filterSequence.__iteratorUncached = function (type, reverse) {
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var iterations = 0;
      return new Iterator(function()  {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          var key = entry[0];
          var value = entry[1];
          if (predicate.call(context, value, key, iterable)) {
            return iteratorValue(type, useKeys ? key : iterations++, value, step);
          }
        }
      });
    }
    return filterSequence;
  }


  function countByFactory(iterable, grouper, context) {
    var groups = Map().asMutable();
    iterable.__iterate(function(v, k)  {
      groups.update(
        grouper.call(context, v, k, iterable),
        0,
        function(a ) {return a + 1}
      );
    });
    return groups.asImmutable();
  }


  function groupByFactory(iterable, grouper, context) {
    var isKeyedIter = isKeyed(iterable);
    var groups = (isOrdered(iterable) ? OrderedMap() : Map()).asMutable();
    iterable.__iterate(function(v, k)  {
      groups.update(
        grouper.call(context, v, k, iterable),
        function(a ) {return (a = a || [], a.push(isKeyedIter ? [k, v] : v), a)}
      );
    });
    var coerce = iterableClass(iterable);
    return groups.map(function(arr ) {return reify(iterable, coerce(arr))});
  }


  function sliceFactory(iterable, begin, end, useKeys) {
    var originalSize = iterable.size;

    // Sanitize begin & end using this shorthand for ToInt32(argument)
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
    if (begin !== undefined) {
      begin = begin | 0;
    }
    if (end !== undefined) {
      if (end === Infinity) {
        end = originalSize;
      } else {
        end = end | 0;
      }
    }

    if (wholeSlice(begin, end, originalSize)) {
      return iterable;
    }

    var resolvedBegin = resolveBegin(begin, originalSize);
    var resolvedEnd = resolveEnd(end, originalSize);

    // begin or end will be NaN if they were provided as negative numbers and
    // this iterable's size is unknown. In that case, cache first so there is
    // a known size and these do not resolve to NaN.
    if (resolvedBegin !== resolvedBegin || resolvedEnd !== resolvedEnd) {
      return sliceFactory(iterable.toSeq().cacheResult(), begin, end, useKeys);
    }

    // Note: resolvedEnd is undefined when the original sequence's length is
    // unknown and this slice did not supply an end and should contain all
    // elements after resolvedBegin.
    // In that case, resolvedSize will be NaN and sliceSize will remain undefined.
    var resolvedSize = resolvedEnd - resolvedBegin;
    var sliceSize;
    if (resolvedSize === resolvedSize) {
      sliceSize = resolvedSize < 0 ? 0 : resolvedSize;
    }

    var sliceSeq = makeSequence(iterable);

    // If iterable.size is undefined, the size of the realized sliceSeq is
    // unknown at this point unless the number of items to slice is 0
    sliceSeq.size = sliceSize === 0 ? sliceSize : iterable.size && sliceSize || undefined;

    if (!useKeys && isSeq(iterable) && sliceSize >= 0) {
      sliceSeq.get = function (index, notSetValue) {
        index = wrapIndex(this, index);
        return index >= 0 && index < sliceSize ?
          iterable.get(index + resolvedBegin, notSetValue) :
          notSetValue;
      }
    }

    sliceSeq.__iterateUncached = function(fn, reverse) {var this$0 = this;
      if (sliceSize === 0) {
        return 0;
      }
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var skipped = 0;
      var isSkipping = true;
      var iterations = 0;
      iterable.__iterate(function(v, k)  {
        if (!(isSkipping && (isSkipping = skipped++ < resolvedBegin))) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0) !== false &&
                 iterations !== sliceSize;
        }
      });
      return iterations;
    };

    sliceSeq.__iteratorUncached = function(type, reverse) {
      if (sliceSize !== 0 && reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      // Don't bother instantiating parent iterator if taking 0.
      var iterator = sliceSize !== 0 && iterable.__iterator(type, reverse);
      var skipped = 0;
      var iterations = 0;
      return new Iterator(function()  {
        while (skipped++ < resolvedBegin) {
          iterator.next();
        }
        if (++iterations > sliceSize) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (useKeys || type === ITERATE_VALUES) {
          return step;
        } else if (type === ITERATE_KEYS) {
          return iteratorValue(type, iterations - 1, undefined, step);
        } else {
          return iteratorValue(type, iterations - 1, step.value[1], step);
        }
      });
    }

    return sliceSeq;
  }


  function takeWhileFactory(iterable, predicate, context) {
    var takeSequence = makeSequence(iterable);
    takeSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterations = 0;
      iterable.__iterate(function(v, k, c) 
        {return predicate.call(context, v, k, c) && ++iterations && fn(v, k, this$0)}
      );
      return iterations;
    };
    takeSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var iterating = true;
      return new Iterator(function()  {
        if (!iterating) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var k = entry[0];
        var v = entry[1];
        if (!predicate.call(context, v, k, this$0)) {
          iterating = false;
          return iteratorDone();
        }
        return type === ITERATE_ENTRIES ? step :
          iteratorValue(type, k, v, step);
      });
    };
    return takeSequence;
  }


  function skipWhileFactory(iterable, predicate, context, useKeys) {
    var skipSequence = makeSequence(iterable);
    skipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var isSkipping = true;
      var iterations = 0;
      iterable.__iterate(function(v, k, c)  {
        if (!(isSkipping && (isSkipping = predicate.call(context, v, k, c)))) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0);
        }
      });
      return iterations;
    };
    skipSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var skipping = true;
      var iterations = 0;
      return new Iterator(function()  {
        var step, k, v;
        do {
          step = iterator.next();
          if (step.done) {
            if (useKeys || type === ITERATE_VALUES) {
              return step;
            } else if (type === ITERATE_KEYS) {
              return iteratorValue(type, iterations++, undefined, step);
            } else {
              return iteratorValue(type, iterations++, step.value[1], step);
            }
          }
          var entry = step.value;
          k = entry[0];
          v = entry[1];
          skipping && (skipping = predicate.call(context, v, k, this$0));
        } while (skipping);
        return type === ITERATE_ENTRIES ? step :
          iteratorValue(type, k, v, step);
      });
    };
    return skipSequence;
  }


  function concatFactory(iterable, values) {
    var isKeyedIterable = isKeyed(iterable);
    var iters = [iterable].concat(values).map(function(v ) {
      if (!isIterable(v)) {
        v = isKeyedIterable ?
          keyedSeqFromValue(v) :
          indexedSeqFromValue(Array.isArray(v) ? v : [v]);
      } else if (isKeyedIterable) {
        v = KeyedIterable(v);
      }
      return v;
    }).filter(function(v ) {return v.size !== 0});

    if (iters.length === 0) {
      return iterable;
    }

    if (iters.length === 1) {
      var singleton = iters[0];
      if (singleton === iterable ||
          isKeyedIterable && isKeyed(singleton) ||
          isIndexed(iterable) && isIndexed(singleton)) {
        return singleton;
      }
    }

    var concatSeq = new ArraySeq(iters);
    if (isKeyedIterable) {
      concatSeq = concatSeq.toKeyedSeq();
    } else if (!isIndexed(iterable)) {
      concatSeq = concatSeq.toSetSeq();
    }
    concatSeq = concatSeq.flatten(true);
    concatSeq.size = iters.reduce(
      function(sum, seq)  {
        if (sum !== undefined) {
          var size = seq.size;
          if (size !== undefined) {
            return sum + size;
          }
        }
      },
      0
    );
    return concatSeq;
  }


  function flattenFactory(iterable, depth, useKeys) {
    var flatSequence = makeSequence(iterable);
    flatSequence.__iterateUncached = function(fn, reverse) {
      var iterations = 0;
      var stopped = false;
      function flatDeep(iter, currentDepth) {var this$0 = this;
        iter.__iterate(function(v, k)  {
          if ((!depth || currentDepth < depth) && isIterable(v)) {
            flatDeep(v, currentDepth + 1);
          } else if (fn(v, useKeys ? k : iterations++, this$0) === false) {
            stopped = true;
          }
          return !stopped;
        }, reverse);
      }
      flatDeep(iterable, 0);
      return iterations;
    }
    flatSequence.__iteratorUncached = function(type, reverse) {
      var iterator = iterable.__iterator(type, reverse);
      var stack = [];
      var iterations = 0;
      return new Iterator(function()  {
        while (iterator) {
          var step = iterator.next();
          if (step.done !== false) {
            iterator = stack.pop();
            continue;
          }
          var v = step.value;
          if (type === ITERATE_ENTRIES) {
            v = v[1];
          }
          if ((!depth || stack.length < depth) && isIterable(v)) {
            stack.push(iterator);
            iterator = v.__iterator(type, reverse);
          } else {
            return useKeys ? step : iteratorValue(type, iterations++, v, step);
          }
        }
        return iteratorDone();
      });
    }
    return flatSequence;
  }


  function flatMapFactory(iterable, mapper, context) {
    var coerce = iterableClass(iterable);
    return iterable.toSeq().map(
      function(v, k)  {return coerce(mapper.call(context, v, k, iterable))}
    ).flatten(true);
  }


  function interposeFactory(iterable, separator) {
    var interposedSequence = makeSequence(iterable);
    interposedSequence.size = iterable.size && iterable.size * 2 -1;
    interposedSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      iterable.__iterate(function(v, k) 
        {return (!iterations || fn(separator, iterations++, this$0) !== false) &&
        fn(v, iterations++, this$0) !== false},
        reverse
      );
      return iterations;
    };
    interposedSequence.__iteratorUncached = function(type, reverse) {
      var iterator = iterable.__iterator(ITERATE_VALUES, reverse);
      var iterations = 0;
      var step;
      return new Iterator(function()  {
        if (!step || iterations % 2) {
          step = iterator.next();
          if (step.done) {
            return step;
          }
        }
        return iterations % 2 ?
          iteratorValue(type, iterations++, separator) :
          iteratorValue(type, iterations++, step.value, step);
      });
    };
    return interposedSequence;
  }


  function sortFactory(iterable, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    var isKeyedIterable = isKeyed(iterable);
    var index = 0;
    var entries = iterable.toSeq().map(
      function(v, k)  {return [k, v, index++, mapper ? mapper(v, k, iterable) : v]}
    ).toArray();
    entries.sort(function(a, b)  {return comparator(a[3], b[3]) || a[2] - b[2]}).forEach(
      isKeyedIterable ?
      function(v, i)  { entries[i].length = 2; } :
      function(v, i)  { entries[i] = v[1]; }
    );
    return isKeyedIterable ? KeyedSeq(entries) :
      isIndexed(iterable) ? IndexedSeq(entries) :
      SetSeq(entries);
  }


  function maxFactory(iterable, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    if (mapper) {
      var entry = iterable.toSeq()
        .map(function(v, k)  {return [v, mapper(v, k, iterable)]})
        .reduce(function(a, b)  {return maxCompare(comparator, a[1], b[1]) ? b : a});
      return entry && entry[0];
    } else {
      return iterable.reduce(function(a, b)  {return maxCompare(comparator, a, b) ? b : a});
    }
  }

  function maxCompare(comparator, a, b) {
    var comp = comparator(b, a);
    // b is considered the new max if the comparator declares them equal, but
    // they are not equal and b is in fact a nullish value.
    return (comp === 0 && b !== a && (b === undefined || b === null || b !== b)) || comp > 0;
  }


  function zipWithFactory(keyIter, zipper, iters) {
    var zipSequence = makeSequence(keyIter);
    zipSequence.size = new ArraySeq(iters).map(function(i ) {return i.size}).min();
    // Note: this a generic base implementation of __iterate in terms of
    // __iterator which may be more generically useful in the future.
    zipSequence.__iterate = function(fn, reverse) {
      /* generic:
      var iterator = this.__iterator(ITERATE_ENTRIES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        iterations++;
        if (fn(step.value[1], step.value[0], this) === false) {
          break;
        }
      }
      return iterations;
      */
      // indexed:
      var iterator = this.__iterator(ITERATE_VALUES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        if (fn(step.value, iterations++, this) === false) {
          break;
        }
      }
      return iterations;
    };
    zipSequence.__iteratorUncached = function(type, reverse) {
      var iterators = iters.map(function(i )
        {return (i = Iterable(i), getIterator(reverse ? i.reverse() : i))}
      );
      var iterations = 0;
      var isDone = false;
      return new Iterator(function()  {
        var steps;
        if (!isDone) {
          steps = iterators.map(function(i ) {return i.next()});
          isDone = steps.some(function(s ) {return s.done});
        }
        if (isDone) {
          return iteratorDone();
        }
        return iteratorValue(
          type,
          iterations++,
          zipper.apply(null, steps.map(function(s ) {return s.value}))
        );
      });
    };
    return zipSequence
  }


  // #pragma Helper Functions

  function reify(iter, seq) {
    return isSeq(iter) ? seq : iter.constructor(seq);
  }

  function validateEntry(entry) {
    if (entry !== Object(entry)) {
      throw new TypeError('Expected [K, V] tuple: ' + entry);
    }
  }

  function resolveSize(iter) {
    assertNotInfinite(iter.size);
    return ensureSize(iter);
  }

  function iterableClass(iterable) {
    return isKeyed(iterable) ? KeyedIterable :
      isIndexed(iterable) ? IndexedIterable :
      SetIterable;
  }

  function makeSequence(iterable) {
    return Object.create(
      (
        isKeyed(iterable) ? KeyedSeq :
        isIndexed(iterable) ? IndexedSeq :
        SetSeq
      ).prototype
    );
  }

  function cacheResultThrough() {
    if (this._iter.cacheResult) {
      this._iter.cacheResult();
      this.size = this._iter.size;
      return this;
    } else {
      return Seq.prototype.cacheResult.call(this);
    }
  }

  function defaultComparator(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  }

  function forceIterator(keyPath) {
    var iter = getIterator(keyPath);
    if (!iter) {
      // Array might not be iterable in this environment, so we need a fallback
      // to our wrapped type.
      if (!isArrayLike(keyPath)) {
        throw new TypeError('Expected iterable or array-like: ' + keyPath);
      }
      iter = getIterator(Iterable(keyPath));
    }
    return iter;
  }

  createClass(Record, KeyedCollection);

    function Record(defaultValues, name) {
      var hasInitialized;

      var RecordType = function Record(values) {
        if (values instanceof RecordType) {
          return values;
        }
        if (!(this instanceof RecordType)) {
          return new RecordType(values);
        }
        if (!hasInitialized) {
          hasInitialized = true;
          var keys = Object.keys(defaultValues);
          setProps(RecordTypePrototype, keys);
          RecordTypePrototype.size = keys.length;
          RecordTypePrototype._name = name;
          RecordTypePrototype._keys = keys;
          RecordTypePrototype._defaultValues = defaultValues;
        }
        this._map = Map(values);
      };

      var RecordTypePrototype = RecordType.prototype = Object.create(RecordPrototype);
      RecordTypePrototype.constructor = RecordType;

      return RecordType;
    }

    Record.prototype.toString = function() {
      return this.__toString(recordName(this) + ' {', '}');
    };

    // @pragma Access

    Record.prototype.has = function(k) {
      return this._defaultValues.hasOwnProperty(k);
    };

    Record.prototype.get = function(k, notSetValue) {
      if (!this.has(k)) {
        return notSetValue;
      }
      var defaultVal = this._defaultValues[k];
      return this._map ? this._map.get(k, defaultVal) : defaultVal;
    };

    // @pragma Modification

    Record.prototype.clear = function() {
      if (this.__ownerID) {
        this._map && this._map.clear();
        return this;
      }
      var RecordType = this.constructor;
      return RecordType._empty || (RecordType._empty = makeRecord(this, emptyMap()));
    };

    Record.prototype.set = function(k, v) {
      if (!this.has(k)) {
        throw new Error('Cannot set unknown key "' + k + '" on ' + recordName(this));
      }
      if (this._map && !this._map.has(k)) {
        var defaultVal = this._defaultValues[k];
        if (v === defaultVal) {
          return this;
        }
      }
      var newMap = this._map && this._map.set(k, v);
      if (this.__ownerID || newMap === this._map) {
        return this;
      }
      return makeRecord(this, newMap);
    };

    Record.prototype.remove = function(k) {
      if (!this.has(k)) {
        return this;
      }
      var newMap = this._map && this._map.remove(k);
      if (this.__ownerID || newMap === this._map) {
        return this;
      }
      return makeRecord(this, newMap);
    };

    Record.prototype.wasAltered = function() {
      return this._map.wasAltered();
    };

    Record.prototype.__iterator = function(type, reverse) {var this$0 = this;
      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterator(type, reverse);
    };

    Record.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterate(fn, reverse);
    };

    Record.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map && this._map.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        return this;
      }
      return makeRecord(this, newMap, ownerID);
    };


  var RecordPrototype = Record.prototype;
  RecordPrototype[DELETE] = RecordPrototype.remove;
  RecordPrototype.deleteIn =
  RecordPrototype.removeIn = MapPrototype.removeIn;
  RecordPrototype.merge = MapPrototype.merge;
  RecordPrototype.mergeWith = MapPrototype.mergeWith;
  RecordPrototype.mergeIn = MapPrototype.mergeIn;
  RecordPrototype.mergeDeep = MapPrototype.mergeDeep;
  RecordPrototype.mergeDeepWith = MapPrototype.mergeDeepWith;
  RecordPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
  RecordPrototype.setIn = MapPrototype.setIn;
  RecordPrototype.update = MapPrototype.update;
  RecordPrototype.updateIn = MapPrototype.updateIn;
  RecordPrototype.withMutations = MapPrototype.withMutations;
  RecordPrototype.asMutable = MapPrototype.asMutable;
  RecordPrototype.asImmutable = MapPrototype.asImmutable;


  function makeRecord(likeRecord, map, ownerID) {
    var record = Object.create(Object.getPrototypeOf(likeRecord));
    record._map = map;
    record.__ownerID = ownerID;
    return record;
  }

  function recordName(record) {
    return record._name || record.constructor.name || 'Record';
  }

  function setProps(prototype, names) {
    try {
      names.forEach(setProp.bind(undefined, prototype));
    } catch (error) {
      // Object.defineProperty failed. Probably IE8.
    }
  }

  function setProp(prototype, name) {
    Object.defineProperty(prototype, name, {
      get: function() {
        return this.get(name);
      },
      set: function(value) {
        invariant(this.__ownerID, 'Cannot set on an immutable record.');
        this.set(name, value);
      }
    });
  }

  createClass(Set, SetCollection);

    // @pragma Construction

    function Set(value) {
      return value === null || value === undefined ? emptySet() :
        isSet(value) && !isOrdered(value) ? value :
        emptySet().withMutations(function(set ) {
          var iter = SetIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v ) {return set.add(v)});
        });
    }

    Set.of = function(/*...values*/) {
      return this(arguments);
    };

    Set.fromKeys = function(value) {
      return this(KeyedIterable(value).keySeq());
    };

    Set.prototype.toString = function() {
      return this.__toString('Set {', '}');
    };

    // @pragma Access

    Set.prototype.has = function(value) {
      return this._map.has(value);
    };

    // @pragma Modification

    Set.prototype.add = function(value) {
      return updateSet(this, this._map.set(value, true));
    };

    Set.prototype.remove = function(value) {
      return updateSet(this, this._map.remove(value));
    };

    Set.prototype.clear = function() {
      return updateSet(this, this._map.clear());
    };

    // @pragma Composition

    Set.prototype.union = function() {var iters = SLICE$0.call(arguments, 0);
      iters = iters.filter(function(x ) {return x.size !== 0});
      if (iters.length === 0) {
        return this;
      }
      if (this.size === 0 && !this.__ownerID && iters.length === 1) {
        return this.constructor(iters[0]);
      }
      return this.withMutations(function(set ) {
        for (var ii = 0; ii < iters.length; ii++) {
          SetIterable(iters[ii]).forEach(function(value ) {return set.add(value)});
        }
      });
    };

    Set.prototype.intersect = function() {var iters = SLICE$0.call(arguments, 0);
      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function(iter ) {return SetIterable(iter)});
      var originalSet = this;
      return this.withMutations(function(set ) {
        originalSet.forEach(function(value ) {
          if (!iters.every(function(iter ) {return iter.includes(value)})) {
            set.remove(value);
          }
        });
      });
    };

    Set.prototype.subtract = function() {var iters = SLICE$0.call(arguments, 0);
      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function(iter ) {return SetIterable(iter)});
      var originalSet = this;
      return this.withMutations(function(set ) {
        originalSet.forEach(function(value ) {
          if (iters.some(function(iter ) {return iter.includes(value)})) {
            set.remove(value);
          }
        });
      });
    };

    Set.prototype.merge = function() {
      return this.union.apply(this, arguments);
    };

    Set.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return this.union.apply(this, iters);
    };

    Set.prototype.sort = function(comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator));
    };

    Set.prototype.sortBy = function(mapper, comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator, mapper));
    };

    Set.prototype.wasAltered = function() {
      return this._map.wasAltered();
    };

    Set.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._map.__iterate(function(_, k)  {return fn(k, k, this$0)}, reverse);
    };

    Set.prototype.__iterator = function(type, reverse) {
      return this._map.map(function(_, k)  {return k}).__iterator(type, reverse);
    };

    Set.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        return this;
      }
      return this.__make(newMap, ownerID);
    };


  function isSet(maybeSet) {
    return !!(maybeSet && maybeSet[IS_SET_SENTINEL]);
  }

  Set.isSet = isSet;

  var IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';

  var SetPrototype = Set.prototype;
  SetPrototype[IS_SET_SENTINEL] = true;
  SetPrototype[DELETE] = SetPrototype.remove;
  SetPrototype.mergeDeep = SetPrototype.merge;
  SetPrototype.mergeDeepWith = SetPrototype.mergeWith;
  SetPrototype.withMutations = MapPrototype.withMutations;
  SetPrototype.asMutable = MapPrototype.asMutable;
  SetPrototype.asImmutable = MapPrototype.asImmutable;

  SetPrototype.__empty = emptySet;
  SetPrototype.__make = makeSet;

  function updateSet(set, newMap) {
    if (set.__ownerID) {
      set.size = newMap.size;
      set._map = newMap;
      return set;
    }
    return newMap === set._map ? set :
      newMap.size === 0 ? set.__empty() :
      set.__make(newMap);
  }

  function makeSet(map, ownerID) {
    var set = Object.create(SetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_SET;
  function emptySet() {
    return EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));
  }

  createClass(OrderedSet, Set);

    // @pragma Construction

    function OrderedSet(value) {
      return value === null || value === undefined ? emptyOrderedSet() :
        isOrderedSet(value) ? value :
        emptyOrderedSet().withMutations(function(set ) {
          var iter = SetIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v ) {return set.add(v)});
        });
    }

    OrderedSet.of = function(/*...values*/) {
      return this(arguments);
    };

    OrderedSet.fromKeys = function(value) {
      return this(KeyedIterable(value).keySeq());
    };

    OrderedSet.prototype.toString = function() {
      return this.__toString('OrderedSet {', '}');
    };


  function isOrderedSet(maybeOrderedSet) {
    return isSet(maybeOrderedSet) && isOrdered(maybeOrderedSet);
  }

  OrderedSet.isOrderedSet = isOrderedSet;

  var OrderedSetPrototype = OrderedSet.prototype;
  OrderedSetPrototype[IS_ORDERED_SENTINEL] = true;

  OrderedSetPrototype.__empty = emptyOrderedSet;
  OrderedSetPrototype.__make = makeOrderedSet;

  function makeOrderedSet(map, ownerID) {
    var set = Object.create(OrderedSetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_ORDERED_SET;
  function emptyOrderedSet() {
    return EMPTY_ORDERED_SET || (EMPTY_ORDERED_SET = makeOrderedSet(emptyOrderedMap()));
  }

  createClass(Stack, IndexedCollection);

    // @pragma Construction

    function Stack(value) {
      return value === null || value === undefined ? emptyStack() :
        isStack(value) ? value :
        emptyStack().unshiftAll(value);
    }

    Stack.of = function(/*...values*/) {
      return this(arguments);
    };

    Stack.prototype.toString = function() {
      return this.__toString('Stack [', ']');
    };

    // @pragma Access

    Stack.prototype.get = function(index, notSetValue) {
      var head = this._head;
      index = wrapIndex(this, index);
      while (head && index--) {
        head = head.next;
      }
      return head ? head.value : notSetValue;
    };

    Stack.prototype.peek = function() {
      return this._head && this._head.value;
    };

    // @pragma Modification

    Stack.prototype.push = function(/*...values*/) {
      if (arguments.length === 0) {
        return this;
      }
      var newSize = this.size + arguments.length;
      var head = this._head;
      for (var ii = arguments.length - 1; ii >= 0; ii--) {
        head = {
          value: arguments[ii],
          next: head
        };
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pushAll = function(iter) {
      iter = IndexedIterable(iter);
      if (iter.size === 0) {
        return this;
      }
      assertNotInfinite(iter.size);
      var newSize = this.size;
      var head = this._head;
      iter.reverse().forEach(function(value ) {
        newSize++;
        head = {
          value: value,
          next: head
        };
      });
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pop = function() {
      return this.slice(1);
    };

    Stack.prototype.unshift = function(/*...values*/) {
      return this.push.apply(this, arguments);
    };

    Stack.prototype.unshiftAll = function(iter) {
      return this.pushAll(iter);
    };

    Stack.prototype.shift = function() {
      return this.pop.apply(this, arguments);
    };

    Stack.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._head = undefined;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyStack();
    };

    Stack.prototype.slice = function(begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      var resolvedBegin = resolveBegin(begin, this.size);
      var resolvedEnd = resolveEnd(end, this.size);
      if (resolvedEnd !== this.size) {
        // super.slice(begin, end);
        return IndexedCollection.prototype.slice.call(this, begin, end);
      }
      var newSize = this.size - resolvedBegin;
      var head = this._head;
      while (resolvedBegin--) {
        head = head.next;
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    // @pragma Mutability

    Stack.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeStack(this.size, this._head, ownerID, this.__hash);
    };

    // @pragma Iteration

    Stack.prototype.__iterate = function(fn, reverse) {
      if (reverse) {
        return this.reverse().__iterate(fn);
      }
      var iterations = 0;
      var node = this._head;
      while (node) {
        if (fn(node.value, iterations++, this) === false) {
          break;
        }
        node = node.next;
      }
      return iterations;
    };

    Stack.prototype.__iterator = function(type, reverse) {
      if (reverse) {
        return this.reverse().__iterator(type);
      }
      var iterations = 0;
      var node = this._head;
      return new Iterator(function()  {
        if (node) {
          var value = node.value;
          node = node.next;
          return iteratorValue(type, iterations++, value);
        }
        return iteratorDone();
      });
    };


  function isStack(maybeStack) {
    return !!(maybeStack && maybeStack[IS_STACK_SENTINEL]);
  }

  Stack.isStack = isStack;

  var IS_STACK_SENTINEL = '@@__IMMUTABLE_STACK__@@';

  var StackPrototype = Stack.prototype;
  StackPrototype[IS_STACK_SENTINEL] = true;
  StackPrototype.withMutations = MapPrototype.withMutations;
  StackPrototype.asMutable = MapPrototype.asMutable;
  StackPrototype.asImmutable = MapPrototype.asImmutable;
  StackPrototype.wasAltered = MapPrototype.wasAltered;


  function makeStack(size, head, ownerID, hash) {
    var map = Object.create(StackPrototype);
    map.size = size;
    map._head = head;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_STACK;
  function emptyStack() {
    return EMPTY_STACK || (EMPTY_STACK = makeStack(0));
  }

  /**
   * Contributes additional methods to a constructor
   */
  function mixin(ctor, methods) {
    var keyCopier = function(key ) { ctor.prototype[key] = methods[key]; };
    Object.keys(methods).forEach(keyCopier);
    Object.getOwnPropertySymbols &&
      Object.getOwnPropertySymbols(methods).forEach(keyCopier);
    return ctor;
  }

  Iterable.Iterator = Iterator;

  mixin(Iterable, {

    // ### Conversion to other types

    toArray: function() {
      assertNotInfinite(this.size);
      var array = new Array(this.size || 0);
      this.valueSeq().__iterate(function(v, i)  { array[i] = v; });
      return array;
    },

    toIndexedSeq: function() {
      return new ToIndexedSequence(this);
    },

    toJS: function() {
      return this.toSeq().map(
        function(value ) {return value && typeof value.toJS === 'function' ? value.toJS() : value}
      ).__toJS();
    },

    toJSON: function() {
      return this.toSeq().map(
        function(value ) {return value && typeof value.toJSON === 'function' ? value.toJSON() : value}
      ).__toJS();
    },

    toKeyedSeq: function() {
      return new ToKeyedSequence(this, true);
    },

    toMap: function() {
      // Use Late Binding here to solve the circular dependency.
      return Map(this.toKeyedSeq());
    },

    toObject: function() {
      assertNotInfinite(this.size);
      var object = {};
      this.__iterate(function(v, k)  { object[k] = v; });
      return object;
    },

    toOrderedMap: function() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedMap(this.toKeyedSeq());
    },

    toOrderedSet: function() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedSet(isKeyed(this) ? this.valueSeq() : this);
    },

    toSet: function() {
      // Use Late Binding here to solve the circular dependency.
      return Set(isKeyed(this) ? this.valueSeq() : this);
    },

    toSetSeq: function() {
      return new ToSetSequence(this);
    },

    toSeq: function() {
      return isIndexed(this) ? this.toIndexedSeq() :
        isKeyed(this) ? this.toKeyedSeq() :
        this.toSetSeq();
    },

    toStack: function() {
      // Use Late Binding here to solve the circular dependency.
      return Stack(isKeyed(this) ? this.valueSeq() : this);
    },

    toList: function() {
      // Use Late Binding here to solve the circular dependency.
      return List(isKeyed(this) ? this.valueSeq() : this);
    },


    // ### Common JavaScript methods and properties

    toString: function() {
      return '[Iterable]';
    },

    __toString: function(head, tail) {
      if (this.size === 0) {
        return head + tail;
      }
      return head + ' ' + this.toSeq().map(this.__toStringMapper).join(', ') + ' ' + tail;
    },


    // ### ES6 Collection methods (ES6 Array and Map)

    concat: function() {var values = SLICE$0.call(arguments, 0);
      return reify(this, concatFactory(this, values));
    },

    includes: function(searchValue) {
      return this.some(function(value ) {return is(value, searchValue)});
    },

    entries: function() {
      return this.__iterator(ITERATE_ENTRIES);
    },

    every: function(predicate, context) {
      assertNotInfinite(this.size);
      var returnValue = true;
      this.__iterate(function(v, k, c)  {
        if (!predicate.call(context, v, k, c)) {
          returnValue = false;
          return false;
        }
      });
      return returnValue;
    },

    filter: function(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, true));
    },

    find: function(predicate, context, notSetValue) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[1] : notSetValue;
    },

    forEach: function(sideEffect, context) {
      assertNotInfinite(this.size);
      return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
    },

    join: function(separator) {
      assertNotInfinite(this.size);
      separator = separator !== undefined ? '' + separator : ',';
      var joined = '';
      var isFirst = true;
      this.__iterate(function(v ) {
        isFirst ? (isFirst = false) : (joined += separator);
        joined += v !== null && v !== undefined ? v.toString() : '';
      });
      return joined;
    },

    keys: function() {
      return this.__iterator(ITERATE_KEYS);
    },

    map: function(mapper, context) {
      return reify(this, mapFactory(this, mapper, context));
    },

    reduce: function(reducer, initialReduction, context) {
      assertNotInfinite(this.size);
      var reduction;
      var useFirst;
      if (arguments.length < 2) {
        useFirst = true;
      } else {
        reduction = initialReduction;
      }
      this.__iterate(function(v, k, c)  {
        if (useFirst) {
          useFirst = false;
          reduction = v;
        } else {
          reduction = reducer.call(context, reduction, v, k, c);
        }
      });
      return reduction;
    },

    reduceRight: function(reducer, initialReduction, context) {
      var reversed = this.toKeyedSeq().reverse();
      return reversed.reduce.apply(reversed, arguments);
    },

    reverse: function() {
      return reify(this, reverseFactory(this, true));
    },

    slice: function(begin, end) {
      return reify(this, sliceFactory(this, begin, end, true));
    },

    some: function(predicate, context) {
      return !this.every(not(predicate), context);
    },

    sort: function(comparator) {
      return reify(this, sortFactory(this, comparator));
    },

    values: function() {
      return this.__iterator(ITERATE_VALUES);
    },


    // ### More sequential methods

    butLast: function() {
      return this.slice(0, -1);
    },

    isEmpty: function() {
      return this.size !== undefined ? this.size === 0 : !this.some(function()  {return true});
    },

    count: function(predicate, context) {
      return ensureSize(
        predicate ? this.toSeq().filter(predicate, context) : this
      );
    },

    countBy: function(grouper, context) {
      return countByFactory(this, grouper, context);
    },

    equals: function(other) {
      return deepEqual(this, other);
    },

    entrySeq: function() {
      var iterable = this;
      if (iterable._cache) {
        // We cache as an entries array, so we can just return the cache!
        return new ArraySeq(iterable._cache);
      }
      var entriesSequence = iterable.toSeq().map(entryMapper).toIndexedSeq();
      entriesSequence.fromEntrySeq = function()  {return iterable.toSeq()};
      return entriesSequence;
    },

    filterNot: function(predicate, context) {
      return this.filter(not(predicate), context);
    },

    findEntry: function(predicate, context, notSetValue) {
      var found = notSetValue;
      this.__iterate(function(v, k, c)  {
        if (predicate.call(context, v, k, c)) {
          found = [k, v];
          return false;
        }
      });
      return found;
    },

    findKey: function(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry && entry[0];
    },

    findLast: function(predicate, context, notSetValue) {
      return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
    },

    findLastEntry: function(predicate, context, notSetValue) {
      return this.toKeyedSeq().reverse().findEntry(predicate, context, notSetValue);
    },

    findLastKey: function(predicate, context) {
      return this.toKeyedSeq().reverse().findKey(predicate, context);
    },

    first: function() {
      return this.find(returnTrue);
    },

    flatMap: function(mapper, context) {
      return reify(this, flatMapFactory(this, mapper, context));
    },

    flatten: function(depth) {
      return reify(this, flattenFactory(this, depth, true));
    },

    fromEntrySeq: function() {
      return new FromEntriesSequence(this);
    },

    get: function(searchKey, notSetValue) {
      return this.find(function(_, key)  {return is(key, searchKey)}, undefined, notSetValue);
    },

    getIn: function(searchKeyPath, notSetValue) {
      var nested = this;
      // Note: in an ES6 environment, we would prefer:
      // for (var key of searchKeyPath) {
      var iter = forceIterator(searchKeyPath);
      var step;
      while (!(step = iter.next()).done) {
        var key = step.value;
        nested = nested && nested.get ? nested.get(key, NOT_SET) : NOT_SET;
        if (nested === NOT_SET) {
          return notSetValue;
        }
      }
      return nested;
    },

    groupBy: function(grouper, context) {
      return groupByFactory(this, grouper, context);
    },

    has: function(searchKey) {
      return this.get(searchKey, NOT_SET) !== NOT_SET;
    },

    hasIn: function(searchKeyPath) {
      return this.getIn(searchKeyPath, NOT_SET) !== NOT_SET;
    },

    isSubset: function(iter) {
      iter = typeof iter.includes === 'function' ? iter : Iterable(iter);
      return this.every(function(value ) {return iter.includes(value)});
    },

    isSuperset: function(iter) {
      iter = typeof iter.isSubset === 'function' ? iter : Iterable(iter);
      return iter.isSubset(this);
    },

    keyOf: function(searchValue) {
      return this.findKey(function(value ) {return is(value, searchValue)});
    },

    keySeq: function() {
      return this.toSeq().map(keyMapper).toIndexedSeq();
    },

    last: function() {
      return this.toSeq().reverse().first();
    },

    lastKeyOf: function(searchValue) {
      return this.toKeyedSeq().reverse().keyOf(searchValue);
    },

    max: function(comparator) {
      return maxFactory(this, comparator);
    },

    maxBy: function(mapper, comparator) {
      return maxFactory(this, comparator, mapper);
    },

    min: function(comparator) {
      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator);
    },

    minBy: function(mapper, comparator) {
      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator, mapper);
    },

    rest: function() {
      return this.slice(1);
    },

    skip: function(amount) {
      return this.slice(Math.max(0, amount));
    },

    skipLast: function(amount) {
      return reify(this, this.toSeq().reverse().skip(amount).reverse());
    },

    skipWhile: function(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, true));
    },

    skipUntil: function(predicate, context) {
      return this.skipWhile(not(predicate), context);
    },

    sortBy: function(mapper, comparator) {
      return reify(this, sortFactory(this, comparator, mapper));
    },

    take: function(amount) {
      return this.slice(0, Math.max(0, amount));
    },

    takeLast: function(amount) {
      return reify(this, this.toSeq().reverse().take(amount).reverse());
    },

    takeWhile: function(predicate, context) {
      return reify(this, takeWhileFactory(this, predicate, context));
    },

    takeUntil: function(predicate, context) {
      return this.takeWhile(not(predicate), context);
    },

    valueSeq: function() {
      return this.toIndexedSeq();
    },


    // ### Hashable Object

    hashCode: function() {
      return this.__hash || (this.__hash = hashIterable(this));
    }


    // ### Internal

    // abstract __iterate(fn, reverse)

    // abstract __iterator(type, reverse)
  });

  // var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  // var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
  // var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
  // var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

  var IterablePrototype = Iterable.prototype;
  IterablePrototype[IS_ITERABLE_SENTINEL] = true;
  IterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.values;
  IterablePrototype.__toJS = IterablePrototype.toArray;
  IterablePrototype.__toStringMapper = quoteString;
  IterablePrototype.inspect =
  IterablePrototype.toSource = function() { return this.toString(); };
  IterablePrototype.chain = IterablePrototype.flatMap;
  IterablePrototype.contains = IterablePrototype.includes;

  mixin(KeyedIterable, {

    // ### More sequential methods

    flip: function() {
      return reify(this, flipFactory(this));
    },

    mapEntries: function(mapper, context) {var this$0 = this;
      var iterations = 0;
      return reify(this,
        this.toSeq().map(
          function(v, k)  {return mapper.call(context, [k, v], iterations++, this$0)}
        ).fromEntrySeq()
      );
    },

    mapKeys: function(mapper, context) {var this$0 = this;
      return reify(this,
        this.toSeq().flip().map(
          function(k, v)  {return mapper.call(context, k, v, this$0)}
        ).flip()
      );
    }

  });

  var KeyedIterablePrototype = KeyedIterable.prototype;
  KeyedIterablePrototype[IS_KEYED_SENTINEL] = true;
  KeyedIterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.entries;
  KeyedIterablePrototype.__toJS = IterablePrototype.toObject;
  KeyedIterablePrototype.__toStringMapper = function(v, k)  {return JSON.stringify(k) + ': ' + quoteString(v)};



  mixin(IndexedIterable, {

    // ### Conversion to other types

    toKeyedSeq: function() {
      return new ToKeyedSequence(this, false);
    },


    // ### ES6 Collection methods (ES6 Array and Map)

    filter: function(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, false));
    },

    findIndex: function(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    indexOf: function(searchValue) {
      var key = this.keyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    lastIndexOf: function(searchValue) {
      var key = this.lastKeyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    reverse: function() {
      return reify(this, reverseFactory(this, false));
    },

    slice: function(begin, end) {
      return reify(this, sliceFactory(this, begin, end, false));
    },

    splice: function(index, removeNum /*, ...values*/) {
      var numArgs = arguments.length;
      removeNum = Math.max(removeNum | 0, 0);
      if (numArgs === 0 || (numArgs === 2 && !removeNum)) {
        return this;
      }
      // If index is negative, it should resolve relative to the size of the
      // collection. However size may be expensive to compute if not cached, so
      // only call count() if the number is in fact negative.
      index = resolveBegin(index, index < 0 ? this.count() : this.size);
      var spliced = this.slice(0, index);
      return reify(
        this,
        numArgs === 1 ?
          spliced :
          spliced.concat(arrCopy(arguments, 2), this.slice(index + removeNum))
      );
    },


    // ### More collection methods

    findLastIndex: function(predicate, context) {
      var entry = this.findLastEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    first: function() {
      return this.get(0);
    },

    flatten: function(depth) {
      return reify(this, flattenFactory(this, depth, false));
    },

    get: function(index, notSetValue) {
      index = wrapIndex(this, index);
      return (index < 0 || (this.size === Infinity ||
          (this.size !== undefined && index > this.size))) ?
        notSetValue :
        this.find(function(_, key)  {return key === index}, undefined, notSetValue);
    },

    has: function(index) {
      index = wrapIndex(this, index);
      return index >= 0 && (this.size !== undefined ?
        this.size === Infinity || index < this.size :
        this.indexOf(index) !== -1
      );
    },

    interpose: function(separator) {
      return reify(this, interposeFactory(this, separator));
    },

    interleave: function(/*...iterables*/) {
      var iterables = [this].concat(arrCopy(arguments));
      var zipped = zipWithFactory(this.toSeq(), IndexedSeq.of, iterables);
      var interleaved = zipped.flatten(true);
      if (zipped.size) {
        interleaved.size = zipped.size * iterables.length;
      }
      return reify(this, interleaved);
    },

    keySeq: function() {
      return Range(0, this.size);
    },

    last: function() {
      return this.get(-1);
    },

    skipWhile: function(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, false));
    },

    zip: function(/*, ...iterables */) {
      var iterables = [this].concat(arrCopy(arguments));
      return reify(this, zipWithFactory(this, defaultZipper, iterables));
    },

    zipWith: function(zipper/*, ...iterables */) {
      var iterables = arrCopy(arguments);
      iterables[0] = this;
      return reify(this, zipWithFactory(this, zipper, iterables));
    }

  });

  IndexedIterable.prototype[IS_INDEXED_SENTINEL] = true;
  IndexedIterable.prototype[IS_ORDERED_SENTINEL] = true;



  mixin(SetIterable, {

    // ### ES6 Collection methods (ES6 Array and Map)

    get: function(value, notSetValue) {
      return this.has(value) ? value : notSetValue;
    },

    includes: function(value) {
      return this.has(value);
    },


    // ### More sequential methods

    keySeq: function() {
      return this.valueSeq();
    }

  });

  SetIterable.prototype.has = IterablePrototype.includes;
  SetIterable.prototype.contains = SetIterable.prototype.includes;


  // Mixin subclasses

  mixin(KeyedSeq, KeyedIterable.prototype);
  mixin(IndexedSeq, IndexedIterable.prototype);
  mixin(SetSeq, SetIterable.prototype);

  mixin(KeyedCollection, KeyedIterable.prototype);
  mixin(IndexedCollection, IndexedIterable.prototype);
  mixin(SetCollection, SetIterable.prototype);


  // #pragma Helper functions

  function keyMapper(v, k) {
    return k;
  }

  function entryMapper(v, k) {
    return [k, v];
  }

  function not(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    }
  }

  function neg(predicate) {
    return function() {
      return -predicate.apply(this, arguments);
    }
  }

  function quoteString(value) {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
  }

  function defaultZipper() {
    return arrCopy(arguments);
  }

  function defaultNegComparator(a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
  }

  function hashIterable(iterable) {
    if (iterable.size === Infinity) {
      return 0;
    }
    var ordered = isOrdered(iterable);
    var keyed = isKeyed(iterable);
    var h = ordered ? 1 : 0;
    var size = iterable.__iterate(
      keyed ?
        ordered ?
          function(v, k)  { h = 31 * h + hashMerge(hash(v), hash(k)) | 0; } :
          function(v, k)  { h = h + hashMerge(hash(v), hash(k)) | 0; } :
        ordered ?
          function(v ) { h = 31 * h + hash(v) | 0; } :
          function(v ) { h = h + hash(v) | 0; }
    );
    return murmurHashOfSize(size, h);
  }

  function murmurHashOfSize(size, h) {
    h = imul(h, 0xCC9E2D51);
    h = imul(h << 15 | h >>> -15, 0x1B873593);
    h = imul(h << 13 | h >>> -13, 5);
    h = (h + 0xE6546B64 | 0) ^ size;
    h = imul(h ^ h >>> 16, 0x85EBCA6B);
    h = imul(h ^ h >>> 13, 0xC2B2AE35);
    h = smi(h ^ h >>> 16);
    return h;
  }

  function hashMerge(a, b) {
    return a ^ b + 0x9E3779B9 + (a << 6) + (a >> 2) | 0; // int
  }

  var Immutable = {

    Iterable: Iterable,

    Seq: Seq,
    Collection: Collection,
    Map: Map,
    OrderedMap: OrderedMap,
    List: List,
    Stack: Stack,
    Set: Set,
    OrderedSet: OrderedSet,

    Record: Record,
    Range: Range,
    Repeat: Repeat,

    is: is,
    fromJS: fromJS

  };

  return Immutable;

}));

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, List, Set } = __webpack_require__(0)
const { SkipList } = __webpack_require__(5)
const ROOT_ID = '00000000-0000-0000-0000-000000000000'

// Returns true if the two operations are concurrent, that is, they happened without being aware of
// each other (neither happened before the other). Returns false if one supersedes the other.
function isConcurrent(opSet, op1, op2) {
  const [actor1, seq1] = [op1.get('actor'), op1.get('seq')]
  const [actor2, seq2] = [op2.get('actor'), op2.get('seq')]
  if (!actor1 || !actor2 || !seq1 || !seq2) return false

  const clock1 = opSet.getIn(['states', actor1, seq1 - 1, 'allDeps'])
  const clock2 = opSet.getIn(['states', actor2, seq2 - 1, 'allDeps'])

  return clock1.get(actor2, 0) < seq2 && clock2.get(actor1, 0) < seq1
}

// Returns true if all changes that causally precede the given change
// have already been applied in `opSet`.
function causallyReady(opSet, change) {
  const actor = change.get('actor'), seq = change.get('seq')
  let satisfied = true
  change.get('deps').set(actor, seq - 1).forEach((depSeq, depActor) => {
    if (opSet.getIn(['clock', depActor], 0) < depSeq) satisfied = false
  })
  return satisfied
}

function transitiveDeps(opSet, baseDeps) {
  return baseDeps.reduce((deps, depSeq, depActor) => {
    if (depSeq <= 0) return deps
    const transitive = opSet.getIn(['states', depActor, depSeq - 1, 'allDeps'])
    return deps
      .mergeWith((a, b) => Math.max(a, b), transitive)
      .set(depActor, depSeq)
  }, Map())
}

// Processes a 'makeMap', 'makeList', or 'makeText' operation
function applyMake(opSet, op) {
  const objectId = op.get('obj')
  if (opSet.hasIn(['byObject', objectId])) throw 'Duplicate creation of object ' + objectId

  let edit = {action: 'create', obj: objectId}
  let object = Map({_init: op, _inbound: Set()})
  if (op.get('action') === 'makeMap') {
    edit.type = 'map'
  } else {
    edit.type = (op.get('action') === 'makeText') ? 'text' : 'list'
    object = object.set('_elemIds', new SkipList())
  }

  opSet = opSet.setIn(['byObject', objectId], object)
  return [opSet, [edit]]
}

// Processes an 'ins' operation. Does not produce any diffs since the insertion alone
// produces no application-visible effect; the list element only becomes visible through
// a subsequent 'set' or 'link' operation on the inserted element.
function applyInsert(opSet, op) {
  const objectId = op.get('obj'), elem = op.get('elem'), elemId = op.get('actor') + ':' + elem
  if (!opSet.get('byObject').has(objectId)) throw 'Modification of unknown object ' + objectId
  if (opSet.hasIn(['byObject', objectId, '_insertion', elemId])) throw 'Duplicate list element ID ' + elemId

  opSet = opSet
    .updateIn(['byObject', objectId, '_following', op.get('key')], List(), list => list.push(op))
    .updateIn(['byObject', objectId, '_maxElem'], 0, maxElem => Math.max(elem, maxElem))
    .setIn(['byObject', objectId, '_insertion', elemId], op)
  return [opSet, []]
}

function getConflicts(ops) {
  const conflicts = []
  for (let op of ops.shift()) {
    let conflict = {actor: op.get('actor'), value: op.get('value')}
    if (op.get('action') === 'link') conflict.link = true
    conflicts.push(conflict)
  }
  return conflicts
}

function patchList(opSet, objectId, index, action, ops) {
  const objType = opSet.getIn(['byObject', objectId, '_init', 'action'])
  const firstOp = ops ? ops.first() : null
  let elemIds = opSet.getIn(['byObject', objectId, '_elemIds'])
  let value = firstOp ? firstOp.get('value') : null
  let edit = {action, type: (objType === 'makeText') ? 'text' : 'list', obj: objectId, index}
  if (firstOp && firstOp.get('action') === 'link') {
    edit.link = true
    value = {obj: firstOp.get('value')}
  }

  if (action === 'insert') {
    elemIds = elemIds.insertIndex(index, firstOp.get('key'), value)
    edit.value = firstOp.get('value')
  } else if (action === 'set') {
    elemIds = elemIds.setValue(firstOp.get('key'), value)
    edit.value = firstOp.get('value')
  } else if (action === 'remove') {
    elemIds = elemIds.removeIndex(index)
  } else throw 'Unknown action type: ' + action

  if (ops && ops.size > 1) edit.conflicts = getConflicts(ops)
  opSet = opSet.setIn(['byObject', objectId, '_elemIds'], elemIds)
  return [opSet, [edit]]
}

function updateListElement(opSet, objectId, elemId) {
  const ops = getFieldOps(opSet, objectId, elemId)
  const elemIds = opSet.getIn(['byObject', objectId, '_elemIds'])
  let index = elemIds.indexOf(elemId)

  if (index >= 0) {
    if (ops.isEmpty()) {
      return patchList(opSet, objectId, index, 'remove', null)
    } else {
      return patchList(opSet, objectId, index, 'set', ops)
    }

  } else {
    if (ops.isEmpty()) return [opSet, []] // deleting a non-existent element = no-op

    // find the index of the closest preceding list element
    let prevId = elemId
    while (true) {
      index = -1
      prevId = getPrevious(opSet, objectId, prevId)
      if (!prevId) break
      index = elemIds.indexOf(prevId)
      if (index >= 0) break
    }

    return patchList(opSet, objectId, index + 1, 'insert', ops)
  }
}

function updateMapKey(opSet, objectId, key) {
  const ops = getFieldOps(opSet, objectId, key)
  let edit = {action: '', type: 'map', obj: objectId, key}

  if (ops.isEmpty()) {
    edit.action = 'remove'
  } else {
    edit.action = 'set'
    edit.value = ops.first().get('value')
    if (ops.first().get('action') === 'link') {
      edit.link = true
    }

    if (ops.size > 1) edit.conflicts = getConflicts(ops)
  }
  return [opSet, [edit]]
}

// Processes a 'set', 'del', or 'link' operation
function applyAssign(opSet, op) {
  const objectId = op.get('obj')
  const objType = opSet.getIn(['byObject', objectId, '_init', 'action'])
  if (!opSet.get('byObject').has(objectId)) throw 'Modification of unknown object ' + objectId

  const priorOpsConcurrent = opSet
    .getIn(['byObject', objectId, op.get('key')], List())
    .groupBy(other => !!isConcurrent(opSet, other, op))
  let overwritten = priorOpsConcurrent.get(false, List())
  let remaining   = priorOpsConcurrent.get(true,  List())

  // If any links were overwritten, remove them from the index of inbound links
  for (let op of overwritten.filter(op => op.get('action') === 'link')) {
    opSet = opSet.updateIn(['byObject', op.get('value'), '_inbound'], ops => ops.remove(op))
  }

  if (op.get('action') === 'link') {
    opSet = opSet.updateIn(['byObject', op.get('value'), '_inbound'], Set(), ops => ops.add(op))
  }
  if (op.get('action') !== 'del') {
    remaining = remaining.push(op)
  }
  remaining = remaining.sortBy(op => op.get('actor')).reverse()
  opSet = opSet.setIn(['byObject', objectId, op.get('key')], remaining)

  if (objType === 'makeList' || objType === 'makeText') {
    return updateListElement(opSet, objectId, op.get('key'))
  } else {
    return updateMapKey(opSet, objectId, op.get('key'))
  }
}

function applyOp(opSet, op) {
  const action = op.get('action')
  if (action === 'makeMap' || action === 'makeList' || action === 'makeText') {
    return applyMake(opSet, op)
  } else if (action === 'ins') {
    return applyInsert(opSet, op)
  } else if (action === 'set' || action === 'del' || action === 'link') {
    return applyAssign(opSet, op)
  } else {
    throw 'Unknown operation type ' + action
  }
}

function applyChange(opSet, change) {
  const actor = change.get('actor'), seq = change.get('seq')
  const prior = opSet.getIn(['states', actor], List())
  if (seq <= prior.size) {
    if (!prior.get(seq - 1).get('change').equals(change)) {
      throw 'Inconsistent reuse of sequence number ' + seq + ' by ' + actor
    }
    return [opSet, []] // change already applied, return unchanged
  }

  const allDeps = transitiveDeps(opSet, change.get('deps').set(actor, seq - 1))
  opSet = opSet.setIn(['states', actor], prior.push(Map({change, allDeps})))

  let diff, diffs = []
  for (let op of change.get('ops')) {
    [opSet, diff] = applyOp(opSet, op.merge({actor, seq}))
    diffs.push(...diff)
  }

  const remainingDeps = opSet.get('deps')
    .filter((depSeq, depActor) => depSeq > allDeps.get(depActor, 0))
    .set(actor, seq)

  opSet = opSet
    .set('deps', remainingDeps)
    .setIn(['clock', actor], seq)
    .update('history', history => history.push(change))
  return [opSet, diffs]
}

function applyQueuedOps(opSet) {
  let queue = List(), diff, diffs = []
  while (true) {
    for (let change of opSet.get('queue')) {
      if (causallyReady(opSet, change)) {
        [opSet, diff] = applyChange(opSet, change)
        diffs.push(...diff)
      } else {
        queue = queue.push(change)
      }
    }

    if (queue.count() === opSet.get('queue').count()) return [opSet, diffs]
    opSet = opSet.set('queue', queue)
    queue = List()
  }
}

function init() {
  return Map()
    .set('states',   Map())
    .set('history',  List())
    .set('byObject', Map().set(ROOT_ID, Map()))
    .set('clock',    Map())
    .set('deps',     Map())
    .set('local',    List())
    .set('queue',    List())
}

function addLocalOp(opSet, op, actor) {
  const objectId = op.get('obj'), action = op.get('action'), key = op.get('key')
  let ops = opSet.get('local')

  // Override any prior assignment operations for the same object and key
  if (action === 'set' || action === 'del' || action === 'link') {
    ops = ops.filter(prev => prev.get('obj') != objectId || prev.get('key') != key)
  }
  ops = ops.push(op)
  return applyOp(opSet.set('local', ops), op.set('actor', actor))
}

function addChange(opSet, change) {
  opSet = opSet.update('queue', queue => queue.push(change))
  return applyQueuedOps(opSet)
}

function getMissingChanges(opSet, haveDeps) {
  const allDeps = transitiveDeps(opSet, haveDeps)
  return opSet.get('states')
    .map((states, actor) => states.skip(allDeps.get(actor, 0)))
    .valueSeq()
    .flatten(1)
    .map(state => state.get('change'))
}

function getChangesForActor(opSet, forActor, afterSeq) {
  afterSeq = afterSeq || 0

  return opSet.get('states')
    .filter((states, actor) => actor === forActor)
    .map((states, actor) => states.skip(afterSeq))
    .valueSeq()
    .flatten(1)
    .map(state => state.get('change'))
}

function getMissingDeps(opSet) {
  let missing = {}
  for (let change of opSet.get('queue')) {
    const deps = change.get('deps').set(change.get('actor'), change.get('seq') - 1)
    deps.forEach((depSeq, depActor) => {
      if (opSet.getIn(['clock', depActor], 0) < depSeq) {
        missing[depActor] = Math.max(depSeq, missing[depActor] || 0)
      }
    })
  }
  return missing
}

function getFieldOps(opSet, objectId, key) {
  return opSet.getIn(['byObject', objectId, key], List())
}

function getParent(opSet, objectId, key) {
  if (key === '_head') return
  const insertion = opSet.getIn(['byObject', objectId, '_insertion', key])
  if (!insertion) throw new TypeError('Missing index entry for list element ' + key)
  return insertion.get('key')
}

function lamportCompare(op1, op2) {
  if (op1.get('elem' ) < op2.get('elem' )) return -1
  if (op1.get('elem' ) > op2.get('elem' )) return  1
  if (op1.get('actor') < op2.get('actor')) return -1
  if (op1.get('actor') > op2.get('actor')) return  1
  return 0
}

function insertionsAfter(opSet, objectId, parentId, childId) {
  const match = /^(.*):(\d+)$/.exec(childId || '')
  const childKey = match ? Map({actor: match[1], elem: parseInt(match[2])}) : null

  return opSet
    .getIn(['byObject', objectId, '_following', parentId], List())
    .filter(op => (op.get('action') === 'ins'))
    .filter(op => !childKey || lamportCompare(op, childKey) < 0)
    .sort(lamportCompare)
    .reverse() // descending order
    .map(op => op.get('actor') + ':' + op.get('elem'))
}

function getNext(opSet, objectId, key) {
  const children = insertionsAfter(opSet, objectId, key)
  if (!children.isEmpty()) return children.first()

  let ancestor
  while (true) {
    ancestor = getParent(opSet, objectId, key)
    if (!ancestor) return
    const siblings = insertionsAfter(opSet, objectId, ancestor, key)
    if (!siblings.isEmpty()) return siblings.first()
    key = ancestor
  }
}

// Given the ID of a list element, returns the ID of the immediate predecessor list element,
// or null if the given list element is at the head.
function getPrevious(opSet, objectId, key) {
  const parentId = getParent(opSet, objectId, key)
  let children = insertionsAfter(opSet, objectId, parentId)
  if (children.first() === key) {
    if (parentId === '_head') return null; else return parentId;
  }

  let prevId
  for (let child of children) {
    if (child === key) break
    prevId = child
  }
  while (true) {
    children = insertionsAfter(opSet, objectId, prevId)
    if (children.isEmpty()) return prevId
    prevId = children.last()
  }
}

function getOpValue(opSet, op, context) {
  if (typeof op !== 'object' || op === null) return op
  switch (op.get('action')) {
    case 'set':  return op.get('value')
    case 'link': return context.instantiateObject(opSet, op.get('value'))
  }
}

function validFieldName(key) {
  return (typeof key === 'string' && key !== '' && !key.startsWith('_'))
}

function isFieldPresent(opSet, objectId, key) {
  return validFieldName(key) && !getFieldOps(opSet, objectId, key).isEmpty()
}

function getObjectFields(opSet, objectId) {
  return opSet.getIn(['byObject', objectId])
    .keySeq()
    .filter(key => isFieldPresent(opSet, objectId, key))
    .toSet()
    .add('_objectId')
}

function getObjectField(opSet, objectId, key, context) {
  if (key === '_objectId') return objectId
  if (!validFieldName(key)) return undefined
  const ops = getFieldOps(opSet, objectId, key)
  if (!ops.isEmpty()) return getOpValue(opSet, ops.first(), context)
}

function getObjectConflicts(opSet, objectId, context) {
  return opSet.getIn(['byObject', objectId])
    .filter((field, key) => validFieldName(key) && getFieldOps(opSet, objectId, key).size > 1)
    .mapEntries(([key, field]) => [key, field.shift().toMap()
      .mapEntries(([idx, op]) => [op.get('actor'), getOpValue(opSet, op, context)])
    ])
}

function listElemByIndex(opSet, objectId, index, context) {
  const elemId = opSet.getIn(['byObject', objectId, '_elemIds']).keyOf(index)
  if (elemId) {
    const ops = getFieldOps(opSet, objectId, elemId)
    if (!ops.isEmpty()) return getOpValue(opSet, ops.first(), context)
  }
}

function listLength(opSet, objectId) {
  return opSet.getIn(['byObject', objectId, '_elemIds']).length
}

function listIterator(opSet, listId, mode, context) {
  let elem = '_head', index = -1
  const next = () => {
    while (elem) {
      elem = getNext(opSet, listId, elem)
      if (!elem) return {done: true}

      const ops = getFieldOps(opSet, listId, elem)
      if (!ops.isEmpty()) {
        const value = getOpValue(opSet, ops.first(), context)
        index += 1
        switch (mode) {
          case 'keys':    return {done: false, value: index}
          case 'values':  return {done: false, value: value}
          case 'entries': return {done: false, value: [index, value]}
          case 'elems':   return {done: false, value: [index, elem]}
          case 'conflicts':
            let conflict = null
            if (ops.size > 1) {
              conflict = ops.shift().toMap()
                .mapEntries(([_, op]) => [op.get('actor'), getOpValue(opSet, op, context)])
            }
            return {done: false, value: conflict}
        }
      }
    }
  }

  const iterator = {next}
  iterator[Symbol.iterator] = () => { return iterator }
  return iterator
}

module.exports = {
  init, addLocalOp, addChange, getMissingChanges, getChangesForActor, getMissingDeps,
  getObjectFields, getObjectField, getObjectConflicts,
  listElemByIndex, listLength, listIterator, ROOT_ID
}


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, List, Set } = __webpack_require__(0)
const OpSet = __webpack_require__(1)
const { Text } = __webpack_require__(3)

function isObject(obj) {
  return typeof obj === 'object' && obj !== null
}

function updateMapObject(opSet, edit) {
  if (edit.action === 'create') {
    return opSet.setIn(['cache', edit.obj], Object.freeze({_objectId: edit.obj}))
  }

  const oldObject = opSet.getIn(['cache', edit.obj])
  const conflicts = Object.assign({}, oldObject._conflicts)
  const object = Object.assign(Object.create({_conflicts: conflicts}), oldObject)

  if (edit.action === 'set') {
    object[edit.key] = edit.link ? opSet.getIn(['cache', edit.value]) : edit.value
    if (edit.conflicts) {
      conflicts[edit.key] = {}
      for (let conflict of edit.conflicts) {
        const value = conflict.link ? opSet.getIn(['cache', conflict.value]) : conflict.value
        conflicts[edit.key][conflict.actor] = value
      }
      Object.freeze(conflicts[edit.key])
    } else {
      delete conflicts[edit.key]
    }
  } else if (edit.action === 'remove') {
    delete object[edit.key]
    delete conflicts[edit.key]
  } else throw 'Unknown action type: ' + edit.action

  Object.freeze(conflicts)
  return opSet.setIn(['cache', edit.obj], Object.freeze(object))
}

function parentMapObject(opSet, ref) {
  const oldObject = opSet.getIn(['cache', ref.get('obj')])
  const conflicts = Object.assign({}, oldObject._conflicts)
  const object = Object.assign(Object.create({_conflicts: conflicts}), oldObject)
  const value = opSet.getIn(['cache', ref.get('value')])
  let changed = false

  if (isObject(object[ref.get('key')]) && object[ref.get('key')]._objectId === ref.get('value')) {
    object[ref.get('key')] = value
    changed = true
  }
  if (isObject(conflicts[ref.get('key')])) {
    for (let actor of Object.keys(conflicts[ref.get('key')])) {
      const conflict = conflicts[ref.get('key')][actor]
      if (isObject(conflict) && conflict._objectId === ref.get('value')) {
        conflicts[ref.get('key')] = Object.assign({}, conflicts[ref.get('key')])
        conflicts[ref.get('key')][actor] = value
        Object.freeze(conflicts[ref.get('key')])
        changed = true
      }
    }
  }

  if (changed) {
    Object.freeze(conflicts)
    opSet = opSet.setIn(['cache', ref.get('obj')], Object.freeze(object))
  }
  return opSet
}

function updateListObject(opSet, edit) {
  if (edit.action === 'create') {
    let list = []
    Object.defineProperty(list, '_objectId',  {value: edit.obj})
    Object.defineProperty(list, '_conflicts', {value: Object.freeze([])})
    return opSet.setIn(['cache', edit.obj], Object.freeze(list))
  }

  let conflict = null
  if (edit.conflicts) {
    conflict = {}
    for (let c of edit.conflicts) {
      conflict[c.actor] = c.link ? opSet.getIn(['cache', c.value]) : c.value
    }
    Object.freeze(conflict)
  }

  let list = opSet.getIn(['cache', edit.obj])
  const value = edit.link ? opSet.getIn(['cache', edit.value]) : edit.value
  const conflicts = list._conflicts.slice()
  list = list.slice() // shallow clone
  Object.defineProperty(list, '_objectId',  {value: edit.obj})
  Object.defineProperty(list, '_conflicts', {value: conflicts})

  if (edit.action === 'insert') {
    list.splice(edit.index, 0, value)
    conflicts.splice(edit.index, 0, conflict)
  } else if (edit.action === 'set') {
    list[edit.index] = value
    conflicts[edit.index] = conflict
  } else if (edit.action === 'remove') {
    list.splice(edit.index, 1)
    conflicts.splice(edit.index, 1)
  } else throw 'Unknown action type: ' + edit.action

  Object.freeze(conflicts)
  return opSet.setIn(['cache', edit.obj], Object.freeze(list))
}

function parentListObject(opSet, ref) {
  const index = opSet.getIn(['byObject', ref.get('obj'), '_elemIds']).indexOf(ref.get('key'))
  if (index < 0) return opSet

  let changed = false
  let list = opSet.getIn(['cache', ref.get('obj')])
  const value = opSet.getIn(['cache', ref.get('value')])
  const conflicts = list._conflicts.slice()
  list = list.slice() // shallow clone
  Object.defineProperty(list, '_objectId',  {value: ref.get('obj')})
  Object.defineProperty(list, '_conflicts', {value: conflicts})

  if (isObject(list[index]) && list[index]._objectId === ref.get('value')) {
    list[index] = value
    changed = true
  }
  if (isObject(conflicts[index])) {
    for (let actor of Object.keys(conflicts[index])) {
      const conflict = conflicts[index][actor]
      if (isObject(conflict) && conflict._objectId === ref.get('value')) {
        conflicts[index] = Object.assign({}, conflicts[index])
        conflicts[index][actor] = value
        Object.freeze(conflicts[index])
        changed = true
      }
    }
  }

  if (changed) {
    Object.freeze(conflicts)
    opSet = opSet.setIn(['cache', ref.get('obj')], Object.freeze(list))
  }
  return opSet
}

function updateCache(opSet, diffs) {
  let affected = Set()
  for (let edit of diffs) {
    affected = affected.add(edit.obj)
    if (edit.type === 'map') {
      opSet = updateMapObject(opSet, edit)
    } else if (edit.type === 'list') {
      opSet = updateListObject(opSet, edit)
    } else if (edit.type === 'text') {
      opSet = opSet.setIn(['cache', edit.obj], new Text(opSet, edit.obj))
    } else throw 'Unknown object type: ' + edit.type
  }

  // Update cache entries on the path from the root to the modified object
  while (!affected.isEmpty()) {
    const parentOps = affected.flatMap(objectId => opSet.getIn(['byObject', objectId, '_inbound'], Set()))
    affected = Set()
    for (let ref of parentOps) {
      affected = affected.add(ref.get('obj'))
      const objType = opSet.getIn(['byObject', ref.get('obj'), '_init', 'action'])
      if (objType === 'makeList') {
        opSet = parentListObject(opSet, ref)
      } else if (objType === 'makeMap' || ref.get('obj') === OpSet.ROOT_ID) {
        opSet = parentMapObject(opSet, ref)
      } else if (objType === 'makeText') {
        opSet = opSet.setIn(['cache', ref.get('obj')], new Text(opSet, ref.get('obj')))
      } else {
        throw 'Unknown object type: ' + objType
      }
    }
  }
  return opSet
}

function instantiateImmutable(opSet, objectId) {
  const isRoot = (objectId === OpSet.ROOT_ID)
  const objType = opSet.getIn(['byObject', objectId, '_init', 'action'])

  // Don't read the root object from cache, because it may reference an outdated state.
  // The state may change without without invalidating the cache entry for the root object (for
  // example, adding an item to the queue of operations that are not yet causally ready).
  if (!isRoot) {
    if (opSet.hasIn(['cache', objectId])) return opSet.getIn(['cache', objectId])
    if (this.cache && this.cache[objectId]) return this.cache[objectId]
  }

  let obj
  if (isRoot || objType === 'makeMap') {
    const conflicts = OpSet.getObjectConflicts(opSet, objectId, this)
    obj = Object.create({_conflicts: Object.freeze(conflicts.toJS())})

    for (let field of OpSet.getObjectFields(opSet, objectId)) {
      obj[field] = OpSet.getObjectField(opSet, objectId, field, this)
    }
  } else if (objType === 'makeList') {
    obj = [...OpSet.listIterator(opSet, objectId, 'values', this)]
    const conflicts = List(OpSet.listIterator(opSet, objectId, 'conflicts', this)).toJS()
    Object.defineProperty(obj, '_objectId',  {value: objectId})
    Object.defineProperty(obj, '_conflicts', {value: Object.freeze(conflicts)})
  } else if (objType === 'makeText') {
    obj = new Text(opSet, objectId)
  } else {
    throw 'Unknown object type: ' + objType
  }

  Object.freeze(obj)
  if (this.cache) this.cache[objectId] = obj
  return obj
}

function materialize(opSet) {
  opSet = opSet.set('cache', Map())
  const context = {instantiateObject: instantiateImmutable, cache: {}}
  const snapshot = context.instantiateObject(opSet, OpSet.ROOT_ID)
  return [opSet.set('cache', Map(context.cache)), snapshot]
}

function rootObject(state, rootObj) {
  Object.assign(Object.getPrototypeOf(rootObj), {_state: state, _actorId: state.get('actorId')})
  Object.freeze(Object.getPrototypeOf(rootObj))
  return rootObj
}

function init(actorId) {
  const [opSet, rootObj] = materialize(OpSet.init())
  const state = Map({actorId, opSet})
  return rootObject(state, rootObj)
}

function applyChanges(root, changes, incremental) {
  let opSet = root._state.get('opSet'), diffs = [], diff
  for (let change of changes) {
    [opSet, diff] = OpSet.addChange(opSet, change)
    diffs.push(...diff)
  }

  let newRoot
  if (incremental) {
    opSet = updateCache(opSet, diffs)
    newRoot = opSet.getIn(['cache', OpSet.ROOT_ID])
    if (newRoot === root) {
      newRoot = Object.assign(Object.create({_conflicts: root._conflicts}), root)
    }
  } else {
    [opSet, newRoot] = materialize(opSet)
  }
  return rootObject(root._state.set('opSet', opSet), newRoot)
}

module.exports = {
  init, applyChanges
}


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

const { SkipList } = __webpack_require__(5)

class Text {
  constructor (opSet, objectId) {
    return makeInstance(opSet, objectId)
  }

  get elemIds () {
    if (this.opSet && this.objectId) {
      return this.opSet.getIn(['byObject', this.objectId, '_elemIds'])
    } else {
      return new SkipList()
    }
  }

  get length () {
    return this.elemIds.length
  }

  get (index) {
    const key = this.elemIds.keyOf(index)
    if (key) return this.elemIds.getValue(key)
  }

  get _objectId () {
    return this.objectId
  }

  [Symbol.iterator] () {
    return this.elemIds.iterator('values')
  }
}

// Read-only methods that can delegate to the JavaScript built-in array
for (let method of ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes',
                    'indexOf', 'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
                    'slice', 'some', 'toLocaleString', 'toString']) {
  Text.prototype[method] = function (...args) {
    const array = [...this.elemIds.iterator('values')]
    return array[method].call(array, ...args)
  }
}

function makeInstance(opSet, objectId) {
  const instance = Object.create(Text.prototype)
  instance.opSet = opSet
  instance.objectId = objectId
  return Object.freeze(instance)
}

module.exports = {Text}


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var rng = __webpack_require__(9);
var bytesToUuid = __webpack_require__(10);

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

const { Map } = __webpack_require__(0)

// Returns a random number from the geometric distribution with p = 0.75.
// That is, returns k with probability p * (1 - p)^(k - 1).
// For example, returns 1 with probability 3/4, returns 2 with probability 3/16,
// returns 3 with probability 3/64, and so on.
function* randomLevel() {
  while (true) {
    const rand = Math.floor(Math.random() * 4294967296)
    let level = 1
    while (rand < 1 << (32 - 2 * level) && level < 16) level += 1
    yield level
  }
}

class Node {
  constructor (key, value, level, prevKey, nextKey, prevCount, nextCount) {
    this.key = key
    this.value = value
    this.level = level
    this.prevKey = Object.freeze(prevKey)
    this.nextKey = Object.freeze(nextKey)
    this.prevCount = Object.freeze(prevCount)
    this.nextCount = Object.freeze(nextCount)
    Object.freeze(this)
  }

  setValue (key, value) {
    return new Node(this.key, value, this.level, this.prevKey, this.nextKey,
                    this.prevCount, this.nextCount)
  }

  insertAfter (newKey, newLevel, fromLevel, distance) {
    if (newLevel > this.level && this.key !== null) {
      throw new RangeError('Cannot increase the level of a non-head node')
    }
    const maxLevel = Math.max(this.level, newLevel)
    const nextKey = this.nextKey.slice()
    const nextCount = this.nextCount.slice()

    for (let level = fromLevel; level < maxLevel; level++) {
      if (level < newLevel) {
        nextKey[level] = newKey
        nextCount[level] = distance
      } else {
        nextCount[level] += 1
      }
    }

    return new Node(this.key, this.value, maxLevel,
                    this.prevKey, nextKey, this.prevCount, nextCount)
  }

  insertBefore (newKey, newLevel, fromLevel, distance) {
    if (newLevel > this.level) throw new RangeError('Cannot increase node level')
    const prevKey = this.prevKey.slice()
    const prevCount = this.prevCount.slice()

    for (let level = fromLevel; level < this.level; level++) {
      if (level < newLevel) {
        prevKey[level] = newKey
        prevCount[level] = distance
      } else {
        prevCount[level] += 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    prevKey, this.nextKey, prevCount, this.nextCount)
  }

  removeAfter (fromLevel, removedLevel, newKeys, distances) {
    const nextKey = this.nextKey.slice()
    const nextCount = this.nextCount.slice()

    for (let level = fromLevel; level < this.level; level++) {
      if (level < removedLevel) {
        nextKey[level] = newKeys[level]
        nextCount[level] = distances[level]
      } else {
        nextCount[level] -= 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    this.prevKey, nextKey, this.prevCount, nextCount)
  }

  removeBefore (fromLevel, removedLevel, newKeys, distances) {
    const prevKey = this.prevKey.slice()
    const prevCount = this.prevCount.slice()

    for (let level = fromLevel; level < this.level; level++) {
      if (level < removedLevel) {
        prevKey[level] = newKeys[level]
        prevCount[level] = distances[level]
      } else {
        prevCount[level] -= 1
      }
    }

    return new Node(this.key, this.value, this.level,
                    prevKey, this.nextKey, prevCount, this.nextCount)
  }
}

class SkipList {
  constructor (randomSource) {
    const head = new Node(null, null, 1, [], [null], [], [null])
    const random = randomSource ? randomSource() : randomLevel()
    return makeInstance(0, Map().set(null, head), random)
  }

  get headNode () {
    return this._nodes.get(null)
  }

  predecessors (predecessor, maxLevel) {
    const preKeys = [predecessor], preCounts = [1]

    for (let level = 1; level < maxLevel; level++) {
      let preKey = preKeys[level - 1]
      let count = preCounts[level - 1]
      while (preKey) {
        let node = this._nodes.get(preKey)
        if (node.level > level) break
        if (node.level < level) {
          throw new RangeError('Node ' + preKey + ' below expected level ' + (level - 1))
        }
        count += node.prevCount[level - 1]
        preKey = node.prevKey[level - 1]
      }
      preKeys[level] = preKey
      preCounts[level] = count
    }

    return {preKeys, preCounts}
  }

  successors (successor, maxLevel) {
    const sucKeys = [successor], sucCounts = [1]

    for (let level = 1; level < maxLevel; level++) {
      let sucKey = sucKeys[level - 1]
      let count = sucCounts[level - 1]
      while (sucKey) {
        let node = this._nodes.get(sucKey)
        if (node.level > level) break
        if (node.level < level) {
          throw new RangeError('Node ' + sucKey + ' below expected level ' + (level - 1))
        }
        count += node.nextCount[level - 1]
        sucKey = node.nextKey[level - 1]
      }
      sucKeys[level] = sucKey
      sucCounts[level] = count
    }

    return {sucKeys, sucCounts}
  }

  // Inserts a new list element immediately after the element with key `predecessor`.
  // If predecessor === null, inserts at the head of the list.
  insertAfter (predecessor, key, value) {
    if (typeof key !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    if (!this._nodes.has(predecessor)) {
      throw new RangeError('The referenced predecessor key does not exist')
    }
    if (this._nodes.has(key)) {
      throw new RangeError('Cannot insert a key that already exists')
    }

    const newLevel = this._randomSource.next().value
    const maxLevel = Math.max(newLevel, this.headNode.level)
    const successor = this._nodes.get(predecessor).nextKey[0] || null
    const { preKeys, preCounts } = this.predecessors(predecessor, maxLevel)
    const { sucKeys, sucCounts } = this.successors(successor, maxLevel)

    return makeInstance(this.length + 1, this._nodes.withMutations(nodes => {
      let preLevel = 0, sucLevel = 0
      for (let level = 1; level <= maxLevel; level++) {
        const updateLevel = Math.min(level, newLevel)
        if (level === maxLevel || preKeys[level] !== preKeys[preLevel]) {
          nodes.update(preKeys[preLevel],
                       node => node.insertAfter(key, updateLevel, preLevel, preCounts[preLevel]))
          preLevel = level
        }
        if (sucKeys[sucLevel] && (level === maxLevel || sucKeys[level] !== sucKeys[sucLevel])) {
          nodes.update(sucKeys[sucLevel],
                       node => node.insertBefore(key, updateLevel, sucLevel, sucCounts[sucLevel]))
          sucLevel = level
        }
      }

      nodes.set(key, new Node(key, value, newLevel,
                              preKeys.slice(0, newLevel),
                              sucKeys.slice(0, newLevel),
                              preCounts.slice(0, newLevel),
                              sucCounts.slice(0, newLevel)))
    }), this._randomSource)
  }

  insertIndex (index, key, value) {
    if (typeof index !== 'number' || index < 0) {
      throw new RangeError('Index must be a non-negative integer')
    }
    if (index === 0) {
      return this.insertAfter(null, key, value)
    } else {
      return this.insertAfter(this.keyOf(index - 1), key, value)
    }
  }

  removeKey (key) {
    if (typeof key !== 'string' || !this._nodes.has(key)) {
      throw new RangeError('The given key cannot be removed because it does not exist')
    }
    const removedNode = this._nodes.get(key)
    const maxLevel = this.headNode.level
    const { preKeys, preCounts } = this.predecessors(removedNode.prevKey[0], maxLevel)
    const { sucKeys, sucCounts } = this.successors  (removedNode.nextKey[0], maxLevel)
    const distances = new Array(maxLevel)

    for (let level = 0; level < maxLevel; level++) {
      distances[level] = preCounts[level] + sucCounts[level] - 1
    }

    return makeInstance(this.length - 1, this._nodes.withMutations(nodes => {
      nodes.remove(key)
      let preLevel = 0, sucLevel = 0

      for (let level = 1; level <= maxLevel; level++) {
        const updateLevel = Math.min(level, removedNode.level)
        if (level === maxLevel || preKeys[level] !== preKeys[preLevel]) {
          nodes.update(preKeys[preLevel],
                       node => node.removeAfter(preLevel, updateLevel, sucKeys, distances))
          preLevel = level
        }
        if (sucKeys[sucLevel] && (level === maxLevel || sucKeys[level] !== sucKeys[sucLevel])) {
          nodes.update(sucKeys[sucLevel],
                       node => node.removeBefore(sucLevel, updateLevel, preKeys, distances))
          sucLevel = level
        }
      }
    }), this._randomSource)
  }

  removeIndex (index) {
    return this.removeKey(this.keyOf(index))
  }

  indexOf (key) {
    if (typeof key !== 'string' || key === '' || !this._nodes.has(key)) return -1
    let node = this._nodes.get(key), count = 0
    while (node && node.key) {
      count += node.prevCount[node.level - 1]
      node = this._nodes.get(node.prevKey[node.level - 1])
    }
    return count - 1
  }

  keyOf (index) {
    if (typeof index !== 'number') return null
    if (index < 0) index = index + this.length
    if (index < 0 || index >= this.length) return null

    let node = this._nodes.get(null), level = node.level - 1, count = 0
    while (true) {
      if (count === index + 1) {
        return node.key
      } else if (count + node.nextCount[level] > index + 1) {
        level -= 1
      } else {
        count += node.nextCount[level]
        node = this._nodes.get(node.nextKey[level])
      }
    }
  }

  getValue (key) {
    if (typeof key !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    const node = this._nodes.get(key)
    return node && node.value
  }

  setValue (key, value) {
    if (typeof key !== 'string' || key === '') {
      throw new RangeError('Key must be a nonempty string')
    }
    let node = this._nodes.get(key)
    if (!node) throw new RangeError('The referenced key does not exist')

    node = node.setValue(key, value)
    return makeInstance(this.length, this._nodes.set(key, node), this._randomSource)
  }

  *iterator (mode) {
    let key = this._nodes.get(null).nextKey[0]
    while (key) {
      const node = this._nodes.get(key)
      switch (mode) {
        case 'keys':    yield key; break;
        case 'values':  yield node.value; break;
        case 'entries': yield [key, node.value]; break;
      }
      key = node.nextKey[0]
    }
  }

  [Symbol.iterator] () {
    return this.iterator('values')
  }
}

function makeInstance(length, nodes, randomSource) {
  const instance = Object.create(SkipList.prototype)
  instance.length = length
  instance._nodes = nodes
  instance._randomSource = randomSource
  return Object.freeze(instance)
}

module.exports = {SkipList}


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

const { List, fromJS } = __webpack_require__(0)
const OpSet = __webpack_require__(1)
const FreezeAPI = __webpack_require__(2)
const ImmutableAPI = __webpack_require__(7)

function isObject(obj) {
  return typeof obj === 'object' && obj !== null
}

// TODO when we move to Immutable.js 4.0.0, this function is provided by Immutable.js itself
function isImmutable(obj) {
  return isObject(obj) && !!obj['@@__IMMUTABLE_ITERABLE__@@']
}

function checkTarget(funcName, target, needMutable) {
  if (!target || !target._state || !target._objectId ||
      !target._state.hasIn(['opSet', 'byObject', target._objectId])) {
    throw new TypeError('The first argument to Automerge.' + funcName +
                        ' must be the object to modify, but you passed ' + JSON.stringify(target))
  }
  if (needMutable && (!target._change || !target._change.mutable)) {
    throw new TypeError('Automerge.' + funcName + ' requires a writable object as first argument, ' +
                        'but the one you passed is read-only. Please use Automerge.change() ' +
                        'to get a writable version.')
  }
}

function makeChange(root, newState, message) {
  const actor = root._state.get('actorId')
  const seq = root._state.getIn(['opSet', 'clock', actor], 0) + 1
  const deps = root._state.getIn(['opSet', 'deps']).remove(actor)
  const change = fromJS({actor, seq, deps, message})
    .set('ops', newState.getIn(['opSet', 'local']))

  if (isImmutable(root)) {
    return ImmutableAPI.applyChanges(root, List.of(change), true)
  } else {
    return FreezeAPI.applyChanges(root, List.of(change), true)
  }
}

function applyChanges(doc, changes) {
  checkTarget('applyChanges', doc)
  if (isImmutable(doc)) {
    return ImmutableAPI.applyChanges(doc, fromJS(changes), true)
  } else {
    return FreezeAPI.applyChanges(doc, fromJS(changes), true)
  }
}

function merge(local, remote) {
  checkTarget('merge', local)
  if (local._state.get('actorId') === remote._state.get('actorId')) {
    throw new RangeError('Cannot merge an actor with itself')
  }

  const clock = local._state.getIn(['opSet', 'clock'])
  const changes = OpSet.getMissingChanges(remote._state.get('opSet'), clock)
  if (isImmutable(local)) {
    return ImmutableAPI.applyChanges(local, changes, true)
  } else {
    return FreezeAPI.applyChanges(local, changes, true)
  }
}

module.exports = {
  checkTarget, isObject, isImmutable,
  makeChange,
  applyChanges,
  merge,
}


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, List, Set } = __webpack_require__(0)
const OpSet = __webpack_require__(1)
const { Text } = __webpack_require__(3)

function instantiateImmutable(opSet, objectId) {
  const isRoot = (objectId === OpSet.ROOT_ID)
  const objType = opSet.getIn(['byObject', objectId, '_init', 'action'])

  // Don't read the root object from cache, because it may reference an outdated state.
  // The state may change without without invalidating the cache entry for the root object (for
  // example, adding an item to the queue of operations that are not yet causally ready).
  if (!isRoot) {
    if (opSet.hasIn(['cache', objectId])) return opSet.getIn(['cache', objectId])
    if (this.cache && this.cache[objectId]) return this.cache[objectId]
  }

  let obj
  if (isRoot || objType === 'makeMap') {
    const conflicts = OpSet.getObjectConflicts(opSet, objectId, this)
    obj = Map().set('_conflicts', conflicts)

    for (let field of OpSet.getObjectFields(opSet, objectId)) {
      obj = obj.set(field, OpSet.getObjectField(opSet, objectId, field, this))
    }
  } else if (objType === 'makeList') {
    obj = List(OpSet.listIterator(opSet, objectId, 'values', this))
  } else if (objType === 'makeText') {
    obj = new Text(opSet, objectId)
  } else {
    throw 'Unknown object type: ' + objType
  }

  obj._objectId = objectId
  if (this.cache) this.cache[objectId] = obj
  return obj
}

function materialize(opSet) {
  opSet = opSet.set('cache', Map())
  const context = {instantiateObject: instantiateImmutable, cache: {}}
  const rootObj = context.instantiateObject(opSet, OpSet.ROOT_ID)
  return [opSet.set('cache', Map(context.cache)), rootObj]
}

function refresh(opSet, objectId) {
  opSet = opSet.deleteIn(['cache', objectId])
  const context = {instantiateObject: instantiateImmutable, cache: {}}
  const object = context.instantiateObject(opSet, objectId)
  return opSet.setIn(['cache', objectId], object)
}

function updateMapObject(opSet, edit) {
  if (edit.action === 'create') {
    const object = Map({_objectId: edit.obj})
    object._objectId = edit.obj
    return opSet.setIn(['cache', edit.obj], object)
  }

  let object = opSet.getIn(['cache', edit.obj])
  if (edit.action === 'set') {
    let conflicts = null
    if (edit.conflicts) {
      conflicts = Map().withMutations(conflicts => {
        for (let conflict of edit.conflicts) {
          const value = conflict.link ? opSet.getIn(['cache', conflict.value]) : conflict.value
          conflicts.set(conflict.actor, value)
        }
      })
    }

    object = object.withMutations(obj => {
      obj.set(edit.key, edit.link ? opSet.getIn(['cache', edit.value]) : edit.value)
      if (conflicts) {
        obj.setIn(['_conflicts', edit.key], conflicts)
      } else {
        obj.deleteIn(['_conflicts', edit.key])
      }
    })
  } else if (edit.action === 'remove') {
    object = object.withMutations(obj => {
      obj.delete(edit.key)
      obj.deleteIn(['_conflicts', edit.key])
    })
  } else throw 'Unknown action type: ' + edit.action

  object._objectId = edit.obj
  return opSet.setIn(['cache', edit.obj], object)
}

function updateListObject(opSet, edit) {
  if (edit.action === 'create') {
    const list = List()
    list._objectId = edit.obj
    return opSet.setIn(['cache', edit.obj], list)
  }

  const value = edit.link ? opSet.getIn(['cache', edit.value]) : edit.value
  let list = opSet.getIn(['cache', edit.obj])

  if (edit.action === 'insert') {
    list = list.insert(edit.index, value)
  } else if (edit.action === 'set') {
    list = list.set(edit.index, value)
  } else if (edit.action === 'remove') {
    list = list.delete(edit.index)
  } else throw 'Unknown action type: ' + edit.action

  list._objectId = edit.obj
  return opSet.setIn(['cache', edit.obj], list)
}

function updateCache(opSet, diffs) {
  let affected = Set()
  for (let edit of diffs) {
    affected = affected.add(edit.obj)
    if (edit.type === 'map') {
      opSet = updateMapObject(opSet, edit)
    } else if (edit.type === 'list') {
      opSet = updateListObject(opSet, edit)
    } else if (edit.type === 'text') {
      opSet = opSet.setIn(['cache', edit.obj], new Text(opSet, edit.obj))
    } else throw 'Unknown object type: ' + edit.type
  }

  // Update cache entries on the path from the root to the modified object
  while (!affected.isEmpty()) {
    affected = affected.flatMap(objectId => {
      return opSet
        .getIn(['byObject', objectId, '_inbound'], Set())
        .map(op => op.get('obj'))
    })
    for (let objectId of affected) opSet = refresh(opSet, objectId)
  }
  return opSet
}

function init(actorId) {
  const [opSet, rootObj] = materialize(OpSet.init())
  rootObj._state = Map({actorId, opSet})
  rootObj._actorId = actorId
  return rootObj
}

function applyChanges(root, changes, incremental) {
  let opSet = root._state.get('opSet'), diffs = [], diff
  for (let change of changes) {
    [opSet, diff] = OpSet.addChange(opSet, change)
    diffs.push(...diff)
  }

  let newRoot
  if (incremental) {
    opSet = updateCache(opSet, diffs)
    newRoot = opSet.getIn(['cache', OpSet.ROOT_ID])
    if (newRoot === root) {
      // Ugly hack to get a clone of the root object (since we mutably assign _state below)
      newRoot = root.set('_ignore', true).remove('_ignore')
    }
  } else {
    [opSet, newRoot] = materialize(opSet)
  }
  newRoot._state = root._state.set('opSet', opSet)
  newRoot._actorId = root._state.get('actorId')
  newRoot._objectId = root._objectId
  return newRoot
}

module.exports = {
  init, applyChanges
}


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, List, fromJS } = __webpack_require__(0)
const uuid = __webpack_require__(4)
const { rootObjectProxy } = __webpack_require__(11)
const OpSet = __webpack_require__(1)
const {isObject, checkTarget, makeChange, merge, applyChanges} = __webpack_require__(6)
const FreezeAPI = __webpack_require__(2)
const ImmutableAPI = __webpack_require__(7)
const { Text } = __webpack_require__(3)
const transit = __webpack_require__(12)

function makeOp(state, opProps) {
  const opSet = state.get('opSet'), actor = state.get('actorId'), op = fromJS(opProps)
  let [opSet2, diff] = OpSet.addLocalOp(opSet, op, actor)
  return state.set('opSet', opSet2)
}

function insertAfter(state, listId, elemId) {
  if (!state.hasIn(['opSet', 'byObject', listId])) throw 'List object does not exist'
  if (!state.hasIn(['opSet', 'byObject', listId, elemId]) && elemId !== '_head') {
    throw 'Preceding list element does not exist'
  }
  const elem = state.getIn(['opSet', 'byObject', listId, '_maxElem'], 0) + 1
  state = makeOp(state, { action: 'ins', obj: listId, key: elemId, elem })
  return [state, state.get('actorId') + ':' + elem]
}

function createNestedObjects(state, value) {
  if (typeof value._objectId === 'string') return [state, value._objectId]
  const objectId = uuid()

  if (value instanceof Text) {
    state = makeOp(state, { action: 'makeText', obj: objectId })
    if (value.length > 0) throw 'assigning non-empty text is not yet supported'
  } else if (Array.isArray(value)) {
    state = makeOp(state, { action: 'makeList', obj: objectId })
    let elemId = '_head'
    for (let i = 0; i < value.length; i++) {
      [state, elemId] = insertAfter(state, objectId, elemId)
      state = setField(state, objectId, elemId, value[i])
    }
  } else {
    state = makeOp(state, { action: 'makeMap', obj: objectId })
    for (let key of Object.keys(value)) state = setField(state, objectId, key, value[key])
  }
  return [state, objectId]
}

function setField(state, objectId, key, value) {
  if (typeof key !== 'string') {
    throw new TypeError('The key of a map entry must be a string, but ' +
                        JSON.stringify(key) + ' is a ' + (typeof key))
  }
  if (key === '') {
    throw new TypeError('The key of a map entry must not be an empty string')
  }
  if (key.startsWith('_')) {
    throw new TypeError('Map entries starting with underscore are not allowed: ' + key)
  }

  if (typeof value === 'undefined') {
    return deleteField(state, objectId, key)
  } else if (isObject(value)) {
    const [newState, newId] = createNestedObjects(state, value)
    return makeOp(newState, { action: 'link', obj: objectId, key, value: newId })
  } else {
    return makeOp(state, { action: 'set', obj: objectId, key, value })
  }
}

function splice(state, objectId, start, deletions, insertions) {
  let elemIds = state.getIn(['opSet', 'byObject', objectId, '_elemIds'])
  for (let i = 0; i < deletions; i++) {
    let elemId = elemIds.keyOf(start)
    if (elemId) {
      state = makeOp(state, {action: 'del', obj: objectId, key: elemId})
      elemIds = state.getIn(['opSet', 'byObject', objectId, '_elemIds'])
    }
  }

  // Apply insertions
  let prev = (start === 0) ? '_head' : elemIds.keyOf(start - 1)
  if (!prev && insertions.length > 0) {
    throw new RangeError('Cannot insert at index ' + start + ', which is past the end of the list')
  }
  for (let ins of insertions) {
    [state, prev] = insertAfter(state, objectId, prev)
    state = setField(state, objectId, prev, ins)
  }
  return state
}

function setListIndex(state, listId, index, value) {
  const elemIds = state.getIn(['opSet', 'byObject', listId, '_elemIds'])
  const elem = elemIds.keyOf(parseListIndex(index))
  if (elem) {
    return setField(state, listId, elem, value)
  } else {
    return splice(state, listId, index, 0, [value])
  }
}

function deleteField(state, objectId, key) {
  const objType = state.getIn(['opSet', 'byObject', objectId, '_init', 'action'])
  if (objType === 'makeList' || objType === 'makeText') {
    return splice(state, objectId, parseListIndex(key), 1, [])
  }
  if (!state.hasIn(['opSet', 'byObject', objectId, key])) {
    throw new RangeError('Field name does not exist: ' + key)
  }
  return makeOp(state, { action: 'del', obj: objectId, key: key })
}

///// Automerge.* API

function init(actorId) {
  return FreezeAPI.init(actorId || uuid())
}

function initImmutable(actorId) {
  return ImmutableAPI.init(actorId || uuid())
}

function parseListIndex(key) {
  if (typeof key === 'string' && /^[0-9]+$/.test(key)) key = parseInt(key)
  if (typeof key !== 'number')
    throw new TypeError('A list index must be a number, but you passed ' + JSON.stringify(key))
  if (key < 0 || isNaN(key) || key === Infinity || key === -Infinity)
    throw new RangeError('A list index must be positive, but you passed ' + key)
  return key
}

function change(doc, message, callback) {
  checkTarget('change', doc)
  if (doc._objectId !== '00000000-0000-0000-0000-000000000000') {
    throw new TypeError('The first argument to Automerge.change must be the document root')
  }
  if (doc._change && doc._change.mutable) {
    throw new TypeError('Calls to Automerge.change cannot be nested')
  }
  if (typeof message === 'function' && callback === undefined) {
    [message, callback] = [callback, message]
  }

  const context = {state: doc._state, mutable: true, setField, splice, setListIndex, deleteField}
  callback(rootObjectProxy(context))
  return makeChange(doc, context.state, message)
}

function assign(target, values) {
  checkTarget('assign', target, true)
  if (!isObject(values)) throw new TypeError('The second argument to Automerge.assign must be an ' +
                                             'object, but you passed ' + JSON.stringify(values))
  let state = target._state
  for (let key of Object.keys(values)) {
    if (target._type === 'list') {
      state = setListIndex(state, target._objectId, key, values[key])
    } else {
      state = setField(state, target._objectId, key, values[key])
    }
  }
  target._change.state = state
}

function load(string, actorId) {
  return FreezeAPI.applyChanges(FreezeAPI.init(actorId), transit.fromJSON(string), false)
}

function loadImmutable(string, actorId) {
  return ImmutableAPI.applyChanges(ImmutableAPI.init(actorId), transit.fromJSON(string), false)
}

function save(doc) {
  checkTarget('save', doc)
  return transit.toJSON(doc._state.getIn(['opSet', 'history']))
}

function equals(val1, val2) {
  if (!isObject(val1) || !isObject(val2)) return val1 === val2
  const keys1 = Object.keys(val1).sort(), keys2 = Object.keys(val2).sort()
  if (keys1.length !== keys2.length) return false
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) return false
    if (!equals(val1[keys1[i]], val2[keys2[i]])) return false
  }
  return true
}

function inspect(doc) {
  checkTarget('inspect', doc)
  return JSON.parse(JSON.stringify(doc))
}

function getHistory(doc) {
  checkTarget('inspect', doc)
  const history = doc._state.getIn(['opSet', 'history'])
  return history.map((change, index) => {
    return {
      get change () {
        return change.toJS()
      },
      get snapshot () {
        const root = FreezeAPI.init(doc._state.get('actorId'))
        return FreezeAPI.applyChanges(root, history.slice(0, index + 1), false)
      }
    }
  }).toArray()
}

// Returns true if all components of clock1 are less than or equal to those of clock2.
// Returns false if there is at least one component in which clock1 is greater than clock2
// (that is, either clock1 is overall greater than clock2, or the clocks are incomparable).
function lessOrEqual(clock1, clock2) {
  return clock1.keySeq().concat(clock2.keySeq()).reduce(
    (result, key) => (result && clock1.get(key, 0) <= clock2.get(key, 0)),
    true)
}

function diff(oldState, newState) {
  checkTarget('diff', oldState)

  const oldClock = oldState._state.getIn(['opSet', 'clock'])
  const newClock = newState._state.getIn(['opSet', 'clock'])
  if (!lessOrEqual(oldClock, newClock)) {
    throw new RangeError('Cannot diff two states that have diverged')
  }

  let opSet = oldState._state.get('opSet').set('diff', List())
  const changes = OpSet.getMissingChanges(newState._state.get('opSet'), oldClock)

  let diffs = [], diff
  for (let change of changes) {
    [opSet, diff] = OpSet.addChange(opSet, change)
    diffs.push(...diff)
  }
  return diffs
}

function getConflicts(doc, list) {
  checkTarget('getConflicts', doc)
  const opSet = doc._state.get('opSet')
  const objectId = list._objectId
  if (!objectId || opSet.getIn(['byObject', objectId, '_init', 'action']) !== 'makeList') {
    throw new TypeError('The second argument to Automerge.getConflicts must be a list object')
  }

  const context = {
    cache: {},
    instantiateObject (opSet, objectId) {
      return opSet.getIn(['cache', objectId])
    }
  }
  return List(OpSet.listIterator(opSet, objectId, 'conflicts', context))
}

function getChanges(oldState, newState) {
  checkTarget('getChanges', oldState)

  const oldClock = oldState._state.getIn(['opSet', 'clock'])
  const newClock = newState._state.getIn(['opSet', 'clock'])
  if (!lessOrEqual(oldClock, newClock)) {
    throw new RangeError('Cannot diff two states that have diverged')
  }

  return OpSet.getMissingChanges(newState._state.get('opSet'), oldClock).toJS()
}

function getChangesForActor(state, actorId) {
  checkTarget('getChanges', state)

  // I might want to validate the actorId here

  return OpSet.getChangesForActor(state._state.get('opSet'), actorId).toJS()
}

function getMissingDeps(doc) {
  checkTarget('getMissingDeps', doc)
  return OpSet.getMissingDeps(doc._state.get('opSet'))
}

module.exports = {
  init, change, merge, diff, assign, load, save, equals, inspect, getHistory,
  initImmutable, loadImmutable, getConflicts, fromJS,
  getChanges, getChangesForActor, applyChanges, getMissingDeps, Text,
  DocSet: __webpack_require__(19),
  WatchableDoc: __webpack_require__(20),
  Connection: __webpack_require__(21)
}


/***/ }),
/* 9 */
/***/ (function(module, exports) {

// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && msCrypto.getRandomValues.bind(msCrypto));
if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}


/***/ }),
/* 10 */
/***/ (function(module, exports) {

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

const { List, fromJS } = __webpack_require__(0)
const OpSet = __webpack_require__(1)

function listImmutable(attempt) {
  throw new TypeError('You tried to ' + attempt + ', but this list is read-only. ' +
                      'Please use Automerge.change() to get a writable version.')
}

function listMethods(context, listId) {
  const methods = {
    deleteAt(index, numDelete) {
      if (!context.mutable) listImmutable('delete the list element at index ' + index)
      context.state = context.splice(context.state, listId, index, numDelete || 1, [])
      return this
    },

    fill(value, start, end) {
      if (!context.mutable) listImmutable('fill a list with a value')
      for (let [index, elem] of OpSet.listIterator(context.state.get('opSet'), listId, 'elems', context)) {
        if (end && index >= end) break
        if (index >= (start || 0)) {
          context.state = context.setField(context.state, listId, elem, value)
        }
      }
      return this
    },

    insertAt(index, ...values) {
      if (!context.mutable) listImmutable('insert a list element at index ' + index)
      context.state = context.splice(context.state, listId, index, 0, values)
      return this
    },

    pop() {
      if (!context.mutable) listImmutable('pop the last element off a list')
      const length = OpSet.listLength(context.state.get('opSet'), listId)
      if (length == 0) return
      const last = OpSet.listElemByIndex(context.state.get('opSet'), listId, length - 1, context)
      context.state = context.splice(context.state, listId, length - 1, 1, [])
      return last
    },

    push(...values) {
      if (!context.mutable) listImmutable('push a new list element ' + JSON.stringify(values[0]))
      const length = OpSet.listLength(context.state.get('opSet'), listId)
      context.state = context.splice(context.state, listId, length, 0, values)
      return OpSet.listLength(context.state.get('opSet'), listId)
    },

    shift() {
      if (!context.mutable) listImmutable('shift the first element off a list')
      const first = OpSet.listElemByIndex(context.state.get('opSet'), listId, 0, context)
      context.state = context.splice(context.state, listId, 0, 1, [])
      return first
    },

    splice(start, deleteCount, ...values) {
      if (!context.mutable) listImmutable('splice a list')
      if (deleteCount === undefined) {
        deleteCount = OpSet.listLength(context.state.get('opSet'), listId) - start
      }
      const deleted = []
      for (let n = 0; n < deleteCount; n++) {
        deleted.push(OpSet.listElemByIndex(context.state.get('opSet'), listId, start + n, context))
      }
      context.state = context.splice(context.state, listId, start, deleteCount, values)
      return deleted
    },

    unshift(...values) {
      if (!context.mutable) listImmutable('unshift a new list element ' + JSON.stringify(values[0]))
      context.state = context.splice(context.state, listId, 0, 0, values)
      return OpSet.listLength(context.state.get('opSet'), listId)
    }
  }

  for (let iterator of ['entries', 'keys', 'values']) {
    methods[iterator] = () => OpSet.listIterator(context.state.get('opSet'), listId, iterator, context)
  }

  // Read-only methods that can delegate to the JavaScript built-in implementations
  for (let method of ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes',
                      'indexOf', 'join', 'lastIndexOf', 'map', 'reduce', 'reduceRight',
                      'slice', 'some', 'toLocaleString', 'toString']) {
    methods[method] = (...args) => {
      const array = [...OpSet.listIterator(context.state.get('opSet'), listId, 'values', context)]
      return array[method].call(array, ...args)
    }
  }

  return methods
}

const MapHandler = {
  get (target, key) {
    const { context, objectId } = target
    if (!context.state.hasIn(['opSet', 'byObject', objectId])) throw 'Target object does not exist: ' + objectId
    if (key === '_inspect') return JSON.parse(JSON.stringify(mapProxy(context, objectId)))
    if (key === '_type') return 'map'
    if (key === '_objectId') return objectId
    if (key === '_state') return context.state
    if (key === '_actorId') return context.state.get('actorId')
    if (key === '_conflicts') return OpSet.getObjectConflicts(context.state.get('opSet'), objectId, context).toJS()
    if (key === '_change') return context
    return OpSet.getObjectField(context.state.get('opSet'), objectId, key, context)
  },

  set (target, key, value) {
    const { context, objectId } = target
    if (!context.mutable) {
      throw new TypeError('You tried to set property ' + JSON.stringify(key) + ' to ' +
                          JSON.stringify(value) + ', but this object is read-only. ' +
                          'Please use Automerge.change() to get a writable version.')
    }
    context.state = context.setField(context.state, objectId, key, value)
    return true
  },

  deleteProperty (target, key) {
    const { context, objectId } = target
    if (!context.mutable) {
      throw new TypeError('You tried to delete the property ' + JSON.stringify(key) +
                          ', but this object is read-only. Please use Automerge.change() ' +
                          'to get a writable version.')
    }
    context.state = context.deleteField(context.state, objectId, key)
    return true
  },

  has (target, key) {
    return (key === '_type') || (key === '_state') || (key === '_actorId') || (key === '_conflicts') ||
      OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).has(key)
  },

  getOwnPropertyDescriptor (target, key) {
    if (OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).has(key)) {
      return {configurable: true, enumerable: true}
    }
  },

  ownKeys (target) {
    return OpSet.getObjectFields(target.context.state.get('opSet'), target.objectId).toJS()
  }
}

const ListHandler = {
  get (target, key) {
    const [context, objectId] = target
    if (!context.state.hasIn(['opSet', 'byObject', objectId])) throw 'Target object does not exist: ' + objectId
    if (key === Symbol.iterator) return () => OpSet.listIterator(context.state.get('opSet'), objectId, 'values', context)
    if (key === '_inspect') return JSON.parse(JSON.stringify(listProxy(context, objectId)))
    if (key === '_type') return 'list'
    if (key === '_objectId') return objectId
    if (key === '_state') return context.state
    if (key === '_actorId') return context.state.get('actorId')
    if (key === '_change') return context
    if (key === 'length') return OpSet.listLength(context.state.get('opSet'), objectId)
    if (typeof key === 'string' && /^[0-9]+$/.test(key)) {
      return OpSet.listElemByIndex(context.state.get('opSet'), objectId, parseInt(key), context)
    }
    return listMethods(context, objectId)[key]
  },

  set (target, key, value) {
    const [context, objectId] = target
    if (!context.mutable) {
      throw new TypeError('You tried to set index ' + key + ' to ' + JSON.stringify(value) +
                          ', but this list is read-only. Please use Automerge.change() ' +
                          'to get a writable version.')
    }
    context.state = context.setListIndex(context.state, objectId, key, value)
    return true
  },

  deleteProperty (target, key) {
    const [context, objectId] = target
    if (!context.mutable) {
      throw new TypeError('You tried to delete the list index ' + key + ', but this list is ' +
                          'read-only. Please use Automerge.change() to get a writable version.')
    }
    context.state = context.deleteField(context.state, objectId, key)
    return true
  },

  has (target, key) {
    const [context, objectId] = target
    if (typeof key === 'string' && /^[0-9]+$/.test(key)) {
      return parseInt(key) < OpSet.listLength(context.state.get('opSet'), objectId)
    }
    return (key === 'length') || (key === '_type') || (key === '_objectId') ||
      (key === '_state') || (key === '_actorId')
  },

  getOwnPropertyDescriptor (target, key) {
    const [context, objectId] = target
    if (key === 'length') return {}
    if (key === '_objectId' || (typeof key === 'string' && /^[0-9]+$/.test(key))) {
      if (parseInt(key) < OpSet.listLength(context.state.get('opSet'), objectId)) {
        return {configurable: true, enumerable: true}
      }
    }
  },

  ownKeys (target) {
    const [context, objectId] = target
    const length = OpSet.listLength(context.state.get('opSet'), objectId)
    let keys = ['length', '_objectId']
    for (let i = 0; i < length; i++) keys.push(i.toString())
    return keys
  }
}

function mapProxy(context, objectId) {
  return new Proxy({context, objectId}, MapHandler)
}

function listProxy(context, objectId) {
  return new Proxy([context, objectId], ListHandler)
}

function instantiateProxy(opSet, objectId) {
  const objectType = opSet.getIn(['byObject', objectId, '_init', 'action'])
  if (objectType === 'makeMap') {
    return mapProxy(this, objectId)
  } else if (objectType === 'makeList' || objectType === 'makeText') {
    return listProxy(this, objectId)
  } else throw 'Unknown object type: ' + objectType
}

function rootObjectProxy(context) {
  context.instantiateObject = instantiateProxy
  return mapProxy(context, '00000000-0000-0000-0000-000000000000')
}

module.exports = { rootObjectProxy }


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

var transit = __webpack_require__(13);
var Immutable = __webpack_require__(0);

function createReader(handlers) {
  return transit.reader('json', {
    mapBuilder: {
      init: function() {
        return {};
      },
      add: function(m, k, v) {
        m[k] = v;
        return m;
      },
      finalize: function(m) {
        return m;
      }
    },
    handlers: handlers
  });
}

function createReaderHandlers(extras, recordMap, missingRecordHandler) {
  var handlers = {
    iM: function(v) {
      var m = Immutable.Map().asMutable();
      for (var i = 0; i < v.length; i += 2) {
        m = m.set(v[i], v[i + 1]);
      }
      return m.asImmutable();
    },
    iOM: function(v) {
      var m = Immutable.OrderedMap().asMutable();
      for (var i = 0; i < v.length; i += 2) {
        m = m.set(v[i], v[i + 1]);
      }
      return m.asImmutable();
    },
    iL: function(v) {
      return Immutable.List(v);
    },
    iS: function(v) {
      return Immutable.Set(v);
    },
    iOS: function(v) {
      return Immutable.OrderedSet(v);
    },
    iR: function(v) {
      var RecordType = recordMap[v.n];
      if (!RecordType) {
        return missingRecordHandler(v.n, v.v);
      }

      return new RecordType(v.v);
    }
  };
  extras.forEach(function(extra) {
    handlers[extra.tag] = extra.read;
  });
  return handlers;
}

function createWriter(handlers) {
  return transit.writer('json', {
    handlers: handlers
  });
}

function createWriterHandlers(extras, recordMap, predicate) {
  function mapSerializer(m) {
    var i = 0;
    if (predicate) {
      m = m.filter(predicate);
    }
    var a = new Array(2 * m.size);
    m.forEach(function(v, k) {
      a[i++] = k;
      a[i++] = v;
    });
    return a;
  }

  var handlers = transit.map([
    Immutable.Map, transit.makeWriteHandler({
      tag: function() {
        return 'iM';
      },
      rep: mapSerializer
    }),
    Immutable.OrderedMap, transit.makeWriteHandler({
      tag: function() {
        return 'iOM';
      },
      rep: mapSerializer
    }),
    Immutable.List, transit.makeWriteHandler({
      tag: function() {
        return "iL";
      },
      rep: function(v) {
        if (predicate) {
          v = v.filter(predicate);
        }
        return v.toArray();
      }
    }),
    Immutable.Set, transit.makeWriteHandler({
      tag: function() {
        return "iS";
      },
      rep: function(v) {
        if (predicate) {
          v = v.filter(predicate);
        }
        return v.toArray();
      }
    }),
    Immutable.OrderedSet, transit.makeWriteHandler({
      tag: function() {
        return "iOS";
      },
      rep: function(v) {
        if (predicate) {
          v = v.filter(predicate);
        }
        return v.toArray();
      }
    }),
    Function, transit.makeWriteHandler({
      tag: function() {
        return '_';
      },
      rep: function() {
        return null;
      }
    }),
    "default", transit.makeWriteHandler({
      tag: function() {
        return 'iM';
      },
      rep: function(m) {
        if (!('toMap' in m)) {
          var e = "Error serializing unrecognized object " + m.toString();
          throw new Error(e);
        }
        return mapSerializer(m.toMap());
      }
    })
  ]);

  Object.keys(recordMap).forEach(function(name) {
    handlers.set(recordMap[name], makeRecordHandler(name, predicate));
  });

  extras.forEach(function(extra) {
    handlers.set(extra.class, transit.makeWriteHandler({
      tag: function() { return extra.tag; },
      rep: extra.write
    }));
  });

  return handlers;
}

function validateExtras(extras) {
  if (!Array.isArray(extras)) {
    invalidExtras(extras, "Expected array of handlers, got %j");
  }
  extras.forEach(function(extra) {
    if (typeof extra.tag !== "string") {
      invalidExtras(extra,
        "Expected %j to have property 'tag' which is a string");
    }
    if (typeof extra.class !== "function") {
      invalidExtras(extra,
        "Expected %j to have property 'class' which is a constructor function");
    }
    if (typeof extra.write !== "function") {
      invalidExtras(extra,
        "Expected %j to have property 'write' which is a function");
    }
    if (typeof extra.read !== "function") {
      invalidExtras(extra,
        "Expected %j to have property 'write' which is a function");
    }
  });
}
function invalidExtras(data, msg) {
  var json = JSON.stringify(data);
  throw new Error(msg.replace("%j", json));
}

function recordName(record) {
  /* eslint no-underscore-dangle: 0 */
  return record._name || record.constructor.name || 'Record';
}

function makeRecordHandler(name) {
  return transit.makeWriteHandler({
    tag: function() {
      return 'iR';
    },
    rep: function(m) {
      return {
        n: name,
        v: m.toObject()
      };
    }
  });
}

function buildRecordMap(recordClasses) {
  var recordMap = {};

  recordClasses.forEach(function(RecordType) {
    var rec = new RecordType({});
    var recName = recordName(rec);

    if (!recName || recName === 'Record') {
      throw new Error('Cannot (de)serialize Record() without a name');
    }

    if (recordMap[recName]) {
      throw new Error('There\'s already a constructor for a Record named ' +
                      recName);
    }
    recordMap[recName] = RecordType;
  });

  return recordMap;
}

function defaultMissingRecordHandler(recName) {
  var msg = 'Tried to deserialize Record type named `' + recName + '`, ' +
            'but no type with that name was passed to withRecords()';
  throw new Error(msg);
}

function createInstanceFromHandlers(handlers) {
  var reader = createReader(handlers.read);
  var writer = createWriter(handlers.write);

  return {
    toJSON: function toJSON(data) {
      return writer.write(data);
    },
    fromJSON: function fromJSON(json) {
      return reader.read(json);
    },
    withExtraHandlers: function(extra) {
      return createInstanceFromHandlers(handlers.withExtraHandlers(extra));
    },
    withFilter: function(predicate) {
      return createInstanceFromHandlers(handlers.withFilter(predicate));
    },
    withRecords: function(recordClasses, missingRecordHandler) {
      return createInstanceFromHandlers(
        handlers.withRecords(recordClasses, missingRecordHandler)
      );
    }
  };
}

function createHandlers(options) {
  var records = options.records || {};
  var filter = options.filter || false;
  var missingRecordFn = options.missingRecordHandler
                          || defaultMissingRecordHandler;
  var extras = options.extras || [];

  return {
    read: createReaderHandlers(extras, records, missingRecordFn),
    write: createWriterHandlers(extras, records, filter),
    withExtraHandlers: function(moreExtras) {
      validateExtras(moreExtras);

      return createHandlers({
        extras: extras.concat(moreExtras),
        records: records,
        filter: filter,
        missingRecordHandler: missingRecordFn
      });
    },
    withFilter: function(newFilter) {
      return createHandlers({
        extras: extras,
        records: records,
        filter: newFilter,
        missingRecordHandler: missingRecordFn
      });
    },
    withRecords: function(recordClasses, missingRecordHandler) {
      var recordMap = buildRecordMap(recordClasses);
      return createHandlers({
        extras: extras,
        records: recordMap,
        filter: filter,
        missingRecordHandler: missingRecordHandler
      });
    }
  };
}

module.exports = createInstanceFromHandlers(createHandlers({}));
module.exports.handlers = createHandlers({});


/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {// transit-js 0.8.847
// http://transit-format.org
// 
// Copyright 2014 Cognitect. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License..
var COMPILED = !0, goog = goog || {};
goog.global = this;
goog.isDef = function(a) {
  return void 0 !== a;
};
goog.exportPath_ = function(a, b, c) {
  a = a.split(".");
  c = c || goog.global;
  a[0] in c || !c.execScript || c.execScript("var " + a[0]);
  for (var d;a.length && (d = a.shift());) {
    !a.length && goog.isDef(b) ? c[d] = b : c = c[d] ? c[d] : c[d] = {};
  }
};
goog.define = function(a, b) {
  var c = b;
  COMPILED || (goog.global.CLOSURE_UNCOMPILED_DEFINES && Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_UNCOMPILED_DEFINES, a) ? c = goog.global.CLOSURE_UNCOMPILED_DEFINES[a] : goog.global.CLOSURE_DEFINES && Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_DEFINES, a) && (c = goog.global.CLOSURE_DEFINES[a]));
  goog.exportPath_(a, c);
};
goog.DEBUG = !0;
goog.LOCALE = "en";
goog.TRUSTED_SITE = !0;
goog.STRICT_MODE_COMPATIBLE = !1;
goog.DISALLOW_TEST_ONLY_CODE = COMPILED && !goog.DEBUG;
goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING = !1;
goog.provide = function(a) {
  if (!COMPILED && goog.isProvided_(a)) {
    throw Error('Namespace "' + a + '" already declared.');
  }
  goog.constructNamespace_(a);
};
goog.constructNamespace_ = function(a, b) {
  if (!COMPILED) {
    delete goog.implicitNamespaces_[a];
    for (var c = a;(c = c.substring(0, c.lastIndexOf("."))) && !goog.getObjectByName(c);) {
      goog.implicitNamespaces_[c] = !0;
    }
  }
  goog.exportPath_(a, b);
};
goog.VALID_MODULE_RE_ = /^[a-zA-Z_$][a-zA-Z0-9._$]*$/;
goog.module = function(a) {
  if (!goog.isString(a) || !a || -1 == a.search(goog.VALID_MODULE_RE_)) {
    throw Error("Invalid module identifier");
  }
  if (!goog.isInModuleLoader_()) {
    throw Error("Module " + a + " has been loaded incorrectly.");
  }
  if (goog.moduleLoaderState_.moduleName) {
    throw Error("goog.module may only be called once per module.");
  }
  goog.moduleLoaderState_.moduleName = a;
  if (!COMPILED) {
    if (goog.isProvided_(a)) {
      throw Error('Namespace "' + a + '" already declared.');
    }
    delete goog.implicitNamespaces_[a];
  }
};
goog.module.get = function(a) {
  return goog.module.getInternal_(a);
};
goog.module.getInternal_ = function(a) {
  if (!COMPILED) {
    return goog.isProvided_(a) ? a in goog.loadedModules_ ? goog.loadedModules_[a] : goog.getObjectByName(a) : null;
  }
};
goog.moduleLoaderState_ = null;
goog.isInModuleLoader_ = function() {
  return null != goog.moduleLoaderState_;
};
goog.module.declareTestMethods = function() {
  if (!goog.isInModuleLoader_()) {
    throw Error("goog.module.declareTestMethods must be called from within a goog.module");
  }
  goog.moduleLoaderState_.declareTestMethods = !0;
};
goog.module.declareLegacyNamespace = function() {
  if (!COMPILED && !goog.isInModuleLoader_()) {
    throw Error("goog.module.declareLegacyNamespace must be called from within a goog.module");
  }
  if (!COMPILED && !goog.moduleLoaderState_.moduleName) {
    throw Error("goog.module must be called prior to goog.module.declareLegacyNamespace.");
  }
  goog.moduleLoaderState_.declareLegacyNamespace = !0;
};
goog.setTestOnly = function(a) {
  if (goog.DISALLOW_TEST_ONLY_CODE) {
    throw a = a || "", Error("Importing test-only code into non-debug environment" + (a ? ": " + a : "."));
  }
};
goog.forwardDeclare = function(a) {
};
COMPILED || (goog.isProvided_ = function(a) {
  return a in goog.loadedModules_ || !goog.implicitNamespaces_[a] && goog.isDefAndNotNull(goog.getObjectByName(a));
}, goog.implicitNamespaces_ = {"goog.module":!0});
goog.getObjectByName = function(a, b) {
  for (var c = a.split("."), d = b || goog.global, e;e = c.shift();) {
    if (goog.isDefAndNotNull(d[e])) {
      d = d[e];
    } else {
      return null;
    }
  }
  return d;
};
goog.globalize = function(a, b) {
  var c = b || goog.global, d;
  for (d in a) {
    c[d] = a[d];
  }
};
goog.addDependency = function(a, b, c, d) {
  if (goog.DEPENDENCIES_ENABLED) {
    var e;
    a = a.replace(/\\/g, "/");
    for (var f = goog.dependencies_, g = 0;e = b[g];g++) {
      f.nameToPath[e] = a, f.pathIsModule[a] = !!d;
    }
    for (d = 0;b = c[d];d++) {
      a in f.requires || (f.requires[a] = {}), f.requires[a][b] = !0;
    }
  }
};
goog.ENABLE_DEBUG_LOADER = !0;
goog.logToConsole_ = function(a) {
  goog.global.console && goog.global.console.error(a);
};
goog.require = function(a) {
  if (!COMPILED) {
    goog.ENABLE_DEBUG_LOADER && goog.IS_OLD_IE_ && goog.maybeProcessDeferredDep_(a);
    if (goog.isProvided_(a)) {
      return goog.isInModuleLoader_() ? goog.module.getInternal_(a) : null;
    }
    if (goog.ENABLE_DEBUG_LOADER) {
      var b = goog.getPathFromDeps_(a);
      if (b) {
        return goog.included_[b] = !0, goog.writeScripts_(), null;
      }
    }
    a = "goog.require could not find: " + a;
    goog.logToConsole_(a);
    throw Error(a);
  }
};
goog.basePath = "";
goog.nullFunction = function() {
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(a) {
  a.getInstance = function() {
    if (a.instance_) {
      return a.instance_;
    }
    goog.DEBUG && (goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = a);
    return a.instance_ = new a;
  };
};
goog.instantiatedSingletons_ = [];
goog.LOAD_MODULE_USING_EVAL = !0;
goog.SEAL_MODULE_EXPORTS = goog.DEBUG;
goog.loadedModules_ = {};
goog.DEPENDENCIES_ENABLED = !COMPILED && goog.ENABLE_DEBUG_LOADER;
goog.DEPENDENCIES_ENABLED && (goog.included_ = {}, goog.dependencies_ = {pathIsModule:{}, nameToPath:{}, requires:{}, visited:{}, written:{}, deferred:{}}, goog.inHtmlDocument_ = function() {
  var a = goog.global.document;
  return "undefined" != typeof a && "write" in a;
}, goog.findBasePath_ = function() {
  if (goog.global.CLOSURE_BASE_PATH) {
    goog.basePath = goog.global.CLOSURE_BASE_PATH;
  } else {
    if (goog.inHtmlDocument_()) {
      for (var a = goog.global.document.getElementsByTagName("SCRIPT"), b = a.length - 1;0 <= b;--b) {
        var c = a[b].src, d = c.lastIndexOf("?"), d = -1 == d ? c.length : d;
        if ("base.js" == c.substr(d - 7, 7)) {
          goog.basePath = c.substr(0, d - 7);
          break;
        }
      }
    }
  }
}, goog.importScript_ = function(a, b) {
  (goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_)(a, b) && (goog.dependencies_.written[a] = !0);
}, goog.IS_OLD_IE_ = !goog.global.atob && goog.global.document && goog.global.document.all, goog.importModule_ = function(a) {
  goog.importScript_("", 'goog.retrieveAndExecModule_("' + a + '");') && (goog.dependencies_.written[a] = !0);
}, goog.queuedModules_ = [], goog.wrapModule_ = function(a, b) {
  return goog.LOAD_MODULE_USING_EVAL && goog.isDef(goog.global.JSON) ? "goog.loadModule(" + goog.global.JSON.stringify(b + "\n//# sourceURL=" + a + "\n") + ");" : 'goog.loadModule(function(exports) {"use strict";' + b + "\n;return exports});\n//# sourceURL=" + a + "\n";
}, goog.loadQueuedModules_ = function() {
  var a = goog.queuedModules_.length;
  if (0 < a) {
    var b = goog.queuedModules_;
    goog.queuedModules_ = [];
    for (var c = 0;c < a;c++) {
      goog.maybeProcessDeferredPath_(b[c]);
    }
  }
}, goog.maybeProcessDeferredDep_ = function(a) {
  goog.isDeferredModule_(a) && goog.allDepsAreAvailable_(a) && (a = goog.getPathFromDeps_(a), goog.maybeProcessDeferredPath_(goog.basePath + a));
}, goog.isDeferredModule_ = function(a) {
  return (a = goog.getPathFromDeps_(a)) && goog.dependencies_.pathIsModule[a] ? goog.basePath + a in goog.dependencies_.deferred : !1;
}, goog.allDepsAreAvailable_ = function(a) {
  if ((a = goog.getPathFromDeps_(a)) && a in goog.dependencies_.requires) {
    for (var b in goog.dependencies_.requires[a]) {
      if (!goog.isProvided_(b) && !goog.isDeferredModule_(b)) {
        return !1;
      }
    }
  }
  return !0;
}, goog.maybeProcessDeferredPath_ = function(a) {
  if (a in goog.dependencies_.deferred) {
    var b = goog.dependencies_.deferred[a];
    delete goog.dependencies_.deferred[a];
    goog.globalEval(b);
  }
}, goog.loadModule = function(a) {
  var b = goog.moduleLoaderState_;
  try {
    goog.moduleLoaderState_ = {moduleName:void 0, declareTestMethods:!1};
    var c;
    if (goog.isFunction(a)) {
      c = a.call(goog.global, {});
    } else {
      if (goog.isString(a)) {
        c = goog.loadModuleFromSource_.call(goog.global, a);
      } else {
        throw Error("Invalid module definition");
      }
    }
    var d = goog.moduleLoaderState_.moduleName;
    if (!goog.isString(d) || !d) {
      throw Error('Invalid module name "' + d + '"');
    }
    goog.moduleLoaderState_.declareLegacyNamespace ? goog.constructNamespace_(d, c) : goog.SEAL_MODULE_EXPORTS && Object.seal && Object.seal(c);
    goog.loadedModules_[d] = c;
    if (goog.moduleLoaderState_.declareTestMethods) {
      for (var e in c) {
        if (0 === e.indexOf("test", 0) || "tearDown" == e || "setUp" == e || "setUpPage" == e || "tearDownPage" == e) {
          goog.global[e] = c[e];
        }
      }
    }
  } finally {
    goog.moduleLoaderState_ = b;
  }
}, goog.loadModuleFromSource_ = function(a) {
  eval(a);
  return {};
}, goog.writeScriptSrcNode_ = function(a) {
  goog.global.document.write('<script type="text/javascript" src="' + a + '">\x3c/script>');
}, goog.appendScriptSrcNode_ = function(a) {
  var b = goog.global.document, c = b.createElement("script");
  c.type = "text/javascript";
  c.src = a;
  c.defer = !1;
  c.async = !1;
  b.head.appendChild(c);
}, goog.writeScriptTag_ = function(a, b) {
  if (goog.inHtmlDocument_()) {
    var c = goog.global.document;
    if (!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING && "complete" == c.readyState) {
      if (/\bdeps.js$/.test(a)) {
        return !1;
      }
      throw Error('Cannot write "' + a + '" after document load');
    }
    var d = goog.IS_OLD_IE_;
    void 0 === b ? d ? (d = " onreadystatechange='goog.onScriptLoad_(this, " + ++goog.lastNonModuleScriptIndex_ + ")' ", c.write('<script type="text/javascript" src="' + a + '"' + d + ">\x3c/script>")) : goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING ? goog.appendScriptSrcNode_(a) : goog.writeScriptSrcNode_(a) : c.write('<script type="text/javascript">' + b + "\x3c/script>");
    return !0;
  }
  return !1;
}, goog.lastNonModuleScriptIndex_ = 0, goog.onScriptLoad_ = function(a, b) {
  "complete" == a.readyState && goog.lastNonModuleScriptIndex_ == b && goog.loadQueuedModules_();
  return !0;
}, goog.writeScripts_ = function() {
  function a(e) {
    if (!(e in d.written)) {
      if (!(e in d.visited) && (d.visited[e] = !0, e in d.requires)) {
        for (var f in d.requires[e]) {
          if (!goog.isProvided_(f)) {
            if (f in d.nameToPath) {
              a(d.nameToPath[f]);
            } else {
              throw Error("Undefined nameToPath for " + f);
            }
          }
        }
      }
      e in c || (c[e] = !0, b.push(e));
    }
  }
  var b = [], c = {}, d = goog.dependencies_, e;
  for (e in goog.included_) {
    d.written[e] || a(e);
  }
  for (var f = 0;f < b.length;f++) {
    e = b[f], goog.dependencies_.written[e] = !0;
  }
  var g = goog.moduleLoaderState_;
  goog.moduleLoaderState_ = null;
  for (f = 0;f < b.length;f++) {
    if (e = b[f]) {
      d.pathIsModule[e] ? goog.importModule_(goog.basePath + e) : goog.importScript_(goog.basePath + e);
    } else {
      throw goog.moduleLoaderState_ = g, Error("Undefined script input");
    }
  }
  goog.moduleLoaderState_ = g;
}, goog.getPathFromDeps_ = function(a) {
  return a in goog.dependencies_.nameToPath ? goog.dependencies_.nameToPath[a] : null;
}, goog.findBasePath_(), goog.global.CLOSURE_NO_DEPS || goog.importScript_(goog.basePath + "deps.js"));
goog.normalizePath_ = function(a) {
  a = a.split("/");
  for (var b = 0;b < a.length;) {
    "." == a[b] ? a.splice(b, 1) : b && ".." == a[b] && a[b - 1] && ".." != a[b - 1] ? a.splice(--b, 2) : b++;
  }
  return a.join("/");
};
goog.loadFileSync_ = function(a) {
  if (goog.global.CLOSURE_LOAD_FILE_SYNC) {
    return goog.global.CLOSURE_LOAD_FILE_SYNC(a);
  }
  var b = new goog.global.XMLHttpRequest;
  b.open("get", a, !1);
  b.send();
  return b.responseText;
};
goog.retrieveAndExecModule_ = function(a) {
  if (!COMPILED) {
    var b = a;
    a = goog.normalizePath_(a);
    var c = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_, d = goog.loadFileSync_(a);
    if (null != d) {
      d = goog.wrapModule_(a, d), goog.IS_OLD_IE_ ? (goog.dependencies_.deferred[b] = d, goog.queuedModules_.push(b)) : c(a, d);
    } else {
      throw Error("load of " + a + "failed");
    }
  }
};
goog.typeOf = function(a) {
  var b = typeof a;
  if ("object" == b) {
    if (a) {
      if (a instanceof Array) {
        return "array";
      }
      if (a instanceof Object) {
        return b;
      }
      var c = Object.prototype.toString.call(a);
      if ("[object Window]" == c) {
        return "object";
      }
      if ("[object Array]" == c || "number" == typeof a.length && "undefined" != typeof a.splice && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("splice")) {
        return "array";
      }
      if ("[object Function]" == c || "undefined" != typeof a.call && "undefined" != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable("call")) {
        return "function";
      }
    } else {
      return "null";
    }
  } else {
    if ("function" == b && "undefined" == typeof a.call) {
      return "object";
    }
  }
  return b;
};
goog.isNull = function(a) {
  return null === a;
};
goog.isDefAndNotNull = function(a) {
  return null != a;
};
goog.isArray = function(a) {
  return "array" == goog.typeOf(a);
};
goog.isArrayLike = function(a) {
  var b = goog.typeOf(a);
  return "array" == b || "object" == b && "number" == typeof a.length;
};
goog.isDateLike = function(a) {
  return goog.isObject(a) && "function" == typeof a.getFullYear;
};
goog.isString = function(a) {
  return "string" == typeof a;
};
goog.isBoolean = function(a) {
  return "boolean" == typeof a;
};
goog.isNumber = function(a) {
  return "number" == typeof a;
};
goog.isFunction = function(a) {
  return "function" == goog.typeOf(a);
};
goog.isObject = function(a) {
  var b = typeof a;
  return "object" == b && null != a || "function" == b;
};
goog.getUid = function(a) {
  return a[goog.UID_PROPERTY_] || (a[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};
goog.hasUid = function(a) {
  return !!a[goog.UID_PROPERTY_];
};
goog.removeUid = function(a) {
  "removeAttribute" in a && a.removeAttribute(goog.UID_PROPERTY_);
  try {
    delete a[goog.UID_PROPERTY_];
  } catch (b) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + (1E9 * Math.random() >>> 0);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(a) {
  var b = goog.typeOf(a);
  if ("object" == b || "array" == b) {
    if (a.clone) {
      return a.clone();
    }
    var b = "array" == b ? [] : {}, c;
    for (c in a) {
      b[c] = goog.cloneObject(a[c]);
    }
    return b;
  }
  return a;
};
goog.bindNative_ = function(a, b, c) {
  return a.call.apply(a.bind, arguments);
};
goog.bindJs_ = function(a, b, c) {
  if (!a) {
    throw Error();
  }
  if (2 < arguments.length) {
    var d = Array.prototype.slice.call(arguments, 2);
    return function() {
      var c = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(c, d);
      return a.apply(b, c);
    };
  }
  return function() {
    return a.apply(b, arguments);
  };
};
goog.bind = function(a, b, c) {
  Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf("native code") ? goog.bind = goog.bindNative_ : goog.bind = goog.bindJs_;
  return goog.bind.apply(null, arguments);
};
goog.partial = function(a, b) {
  var c = Array.prototype.slice.call(arguments, 1);
  return function() {
    var b = c.slice();
    b.push.apply(b, arguments);
    return a.apply(this, b);
  };
};
goog.mixin = function(a, b) {
  for (var c in b) {
    a[c] = b[c];
  }
};
goog.now = goog.TRUSTED_SITE && Date.now || function() {
  return +new Date;
};
goog.globalEval = function(a) {
  if (goog.global.execScript) {
    goog.global.execScript(a, "JavaScript");
  } else {
    if (goog.global.eval) {
      if (null == goog.evalWorksForGlobals_ && (goog.global.eval("var _et_ = 1;"), "undefined" != typeof goog.global._et_ ? (delete goog.global._et_, goog.evalWorksForGlobals_ = !0) : goog.evalWorksForGlobals_ = !1), goog.evalWorksForGlobals_) {
        goog.global.eval(a);
      } else {
        var b = goog.global.document, c = b.createElement("SCRIPT");
        c.type = "text/javascript";
        c.defer = !1;
        c.appendChild(b.createTextNode(a));
        b.body.appendChild(c);
        b.body.removeChild(c);
      }
    } else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.evalWorksForGlobals_ = null;
goog.getCssName = function(a, b) {
  var c = function(a) {
    return goog.cssNameMapping_[a] || a;
  }, d = function(a) {
    a = a.split("-");
    for (var b = [], d = 0;d < a.length;d++) {
      b.push(c(a[d]));
    }
    return b.join("-");
  }, d = goog.cssNameMapping_ ? "BY_WHOLE" == goog.cssNameMappingStyle_ ? c : d : function(a) {
    return a;
  };
  return b ? a + "-" + d(b) : d(a);
};
goog.setCssNameMapping = function(a, b) {
  goog.cssNameMapping_ = a;
  goog.cssNameMappingStyle_ = b;
};
!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING && (goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING);
goog.getMsg = function(a, b) {
  b && (a = a.replace(/\{\$([^}]+)}/g, function(a, d) {
    return d in b ? b[d] : a;
  }));
  return a;
};
goog.getMsgWithFallback = function(a, b) {
  return a;
};
goog.exportSymbol = function(a, b, c) {
  goog.exportPath_(a, b, c);
};
goog.exportProperty = function(a, b, c) {
  a[b] = c;
};
goog.inherits = function(a, b) {
  function c() {
  }
  c.prototype = b.prototype;
  a.superClass_ = b.prototype;
  a.prototype = new c;
  a.prototype.constructor = a;
  a.base = function(a, c, f) {
    for (var g = Array(arguments.length - 2), h = 2;h < arguments.length;h++) {
      g[h - 2] = arguments[h];
    }
    return b.prototype[c].apply(a, g);
  };
};
goog.base = function(a, b, c) {
  var d = arguments.callee.caller;
  if (goog.STRICT_MODE_COMPATIBLE || goog.DEBUG && !d) {
    throw Error("arguments.caller not defined.  goog.base() cannot be used with strict mode code. See http://www.ecma-international.org/ecma-262/5.1/#sec-C");
  }
  if (d.superClass_) {
    for (var e = Array(arguments.length - 1), f = 1;f < arguments.length;f++) {
      e[f - 1] = arguments[f];
    }
    return d.superClass_.constructor.apply(a, e);
  }
  e = Array(arguments.length - 2);
  for (f = 2;f < arguments.length;f++) {
    e[f - 2] = arguments[f];
  }
  for (var f = !1, g = a.constructor;g;g = g.superClass_ && g.superClass_.constructor) {
    if (g.prototype[b] === d) {
      f = !0;
    } else {
      if (f) {
        return g.prototype[b].apply(a, e);
      }
    }
  }
  if (a[b] === d) {
    return a.constructor.prototype[b].apply(a, e);
  }
  throw Error("goog.base called from a method of one name to a method of a different name");
};
goog.scope = function(a) {
  a.call(goog.global);
};
COMPILED || (goog.global.COMPILED = COMPILED);
goog.defineClass = function(a, b) {
  var c = b.constructor, d = b.statics;
  c && c != Object.prototype.constructor || (c = function() {
    throw Error("cannot instantiate an interface (no constructor defined).");
  });
  c = goog.defineClass.createSealingConstructor_(c, a);
  a && goog.inherits(c, a);
  delete b.constructor;
  delete b.statics;
  goog.defineClass.applyProperties_(c.prototype, b);
  null != d && (d instanceof Function ? d(c) : goog.defineClass.applyProperties_(c, d));
  return c;
};
goog.defineClass.SEAL_CLASS_INSTANCES = goog.DEBUG;
goog.defineClass.createSealingConstructor_ = function(a, b) {
  if (goog.defineClass.SEAL_CLASS_INSTANCES && Object.seal instanceof Function) {
    if (b && b.prototype && b.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_]) {
      return a;
    }
    var c = function() {
      var b = a.apply(this, arguments) || this;
      b[goog.UID_PROPERTY_] = b[goog.UID_PROPERTY_];
      this.constructor === c && Object.seal(b);
      return b;
    };
    return c;
  }
  return a;
};
goog.defineClass.OBJECT_PROTOTYPE_FIELDS_ = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.defineClass.applyProperties_ = function(a, b) {
  for (var c in b) {
    Object.prototype.hasOwnProperty.call(b, c) && (a[c] = b[c]);
  }
  for (var d = 0;d < goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length;d++) {
    c = goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[d], Object.prototype.hasOwnProperty.call(b, c) && (a[c] = b[c]);
  }
};
goog.tagUnsealableClass = function(a) {
  !COMPILED && goog.defineClass.SEAL_CLASS_INSTANCES && (a.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_] = !0);
};
goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_ = "goog_defineClass_legacy_unsealable";
goog.math = {};
goog.math.Long = function(a, b) {
  this.low_ = a | 0;
  this.high_ = b | 0;
};
goog.math.Long.IntCache_ = {};
goog.math.Long.fromInt = function(a) {
  if (-128 <= a && 128 > a) {
    var b = goog.math.Long.IntCache_[a];
    if (b) {
      return b;
    }
  }
  b = new goog.math.Long(a | 0, 0 > a ? -1 : 0);
  -128 <= a && 128 > a && (goog.math.Long.IntCache_[a] = b);
  return b;
};
goog.math.Long.fromNumber = function(a) {
  return isNaN(a) || !isFinite(a) ? goog.math.Long.getZero() : a <= -goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.getMinValue() : a + 1 >= goog.math.Long.TWO_PWR_63_DBL_ ? goog.math.Long.getMaxValue() : 0 > a ? goog.math.Long.fromNumber(-a).negate() : new goog.math.Long(a % goog.math.Long.TWO_PWR_32_DBL_ | 0, a / goog.math.Long.TWO_PWR_32_DBL_ | 0);
};
goog.math.Long.fromBits = function(a, b) {
  return new goog.math.Long(a, b);
};
goog.math.Long.fromString = function(a, b) {
  if (0 == a.length) {
    throw Error("number format error: empty string");
  }
  var c = b || 10;
  if (2 > c || 36 < c) {
    throw Error("radix out of range: " + c);
  }
  if ("-" == a.charAt(0)) {
    return goog.math.Long.fromString(a.substring(1), c).negate();
  }
  if (0 <= a.indexOf("-")) {
    throw Error('number format error: interior "-" character: ' + a);
  }
  for (var d = goog.math.Long.fromNumber(Math.pow(c, 8)), e = goog.math.Long.getZero(), f = 0;f < a.length;f += 8) {
    var g = Math.min(8, a.length - f), h = parseInt(a.substring(f, f + g), c);
    8 > g ? (g = goog.math.Long.fromNumber(Math.pow(c, g)), e = e.multiply(g).add(goog.math.Long.fromNumber(h))) : (e = e.multiply(d), e = e.add(goog.math.Long.fromNumber(h)));
  }
  return e;
};
goog.math.Long.TWO_PWR_16_DBL_ = 65536;
goog.math.Long.getTwoPwr24DBL_ = 16777216;
goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;
goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;
goog.math.Long.getZero = function() {
  goog.math.Long.ZERO_ || (goog.math.Long.ZERO_ = goog.math.Long.fromInt(0));
  return goog.math.Long.ZERO_;
};
goog.math.Long.getOne = function() {
  goog.math.Long.ONE_ || (goog.math.Long.ONE_ = goog.math.Long.fromInt(1));
  return goog.math.Long.ONE_;
};
goog.math.Long.getNegOne = function() {
  goog.math.Long.NEG_ONE_ || (goog.math.Long.NEG_ONE_ = goog.math.Long.fromInt(-1));
  return goog.math.Long.NEG_ONE_;
};
goog.math.Long.getMaxValue = function() {
  goog.math.Long.MAX_VALUE_ || (goog.math.Long.MAX_VALUE_ = goog.math.Long.fromBits(-1, 2147483647));
  return goog.math.Long.MAX_VALUE_;
};
goog.math.Long.getMinValue = function() {
  goog.math.Long.MIN_VALUE_ || (goog.math.Long.MIN_VALUE_ = goog.math.Long.fromBits(0, -2147483648));
  return goog.math.Long.MIN_VALUE_;
};
goog.math.Long.getTwoPwr24 = function() {
  goog.math.Long.TWO_PWR_24_ || (goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(16777216));
  return goog.math.Long.TWO_PWR_24_;
};
goog.math.Long.prototype.toInt = function() {
  return this.low_;
};
goog.math.Long.prototype.toNumber = function() {
  return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned();
};
goog.math.Long.prototype.toString = function(a) {
  a = a || 10;
  if (2 > a || 36 < a) {
    throw Error("radix out of range: " + a);
  }
  if (this.isZero()) {
    return "0";
  }
  if (this.isNegative()) {
    if (this.equals(goog.math.Long.getMinValue())) {
      var b = goog.math.Long.fromNumber(a), c = this.div(b), b = c.multiply(b).subtract(this);
      return c.toString(a) + b.toInt().toString(a);
    }
    return "-" + this.negate().toString(a);
  }
  for (var c = goog.math.Long.fromNumber(Math.pow(a, 6)), b = this, d = "";;) {
    var e = b.div(c), f = b.subtract(e.multiply(c)).toInt().toString(a), b = e;
    if (b.isZero()) {
      return f + d;
    }
    for (;6 > f.length;) {
      f = "0" + f;
    }
    d = "" + f + d;
  }
};
goog.math.Long.prototype.getHighBits = function() {
  return this.high_;
};
goog.math.Long.prototype.getLowBits = function() {
  return this.low_;
};
goog.math.Long.prototype.getLowBitsUnsigned = function() {
  return 0 <= this.low_ ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
};
goog.math.Long.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    return this.equals(goog.math.Long.getMinValue()) ? 64 : this.negate().getNumBitsAbs();
  }
  for (var a = 0 != this.high_ ? this.high_ : this.low_, b = 31;0 < b && 0 == (a & 1 << b);b--) {
  }
  return 0 != this.high_ ? b + 33 : b + 1;
};
goog.math.Long.prototype.isZero = function() {
  return 0 == this.high_ && 0 == this.low_;
};
goog.math.Long.prototype.isNegative = function() {
  return 0 > this.high_;
};
goog.math.Long.prototype.isOdd = function() {
  return 1 == (this.low_ & 1);
};
goog.math.Long.prototype.equals = function(a) {
  return this.high_ == a.high_ && this.low_ == a.low_;
};
goog.math.Long.prototype.notEquals = function(a) {
  return this.high_ != a.high_ || this.low_ != a.low_;
};
goog.math.Long.prototype.lessThan = function(a) {
  return 0 > this.compare(a);
};
goog.math.Long.prototype.lessThanOrEqual = function(a) {
  return 0 >= this.compare(a);
};
goog.math.Long.prototype.greaterThan = function(a) {
  return 0 < this.compare(a);
};
goog.math.Long.prototype.greaterThanOrEqual = function(a) {
  return 0 <= this.compare(a);
};
goog.math.Long.prototype.compare = function(a) {
  if (this.equals(a)) {
    return 0;
  }
  var b = this.isNegative(), c = a.isNegative();
  return b && !c ? -1 : !b && c ? 1 : this.subtract(a).isNegative() ? -1 : 1;
};
goog.math.Long.prototype.negate = function() {
  return this.equals(goog.math.Long.getMinValue()) ? goog.math.Long.getMinValue() : this.not().add(goog.math.Long.getOne());
};
goog.math.Long.prototype.add = function(a) {
  var b = this.high_ >>> 16, c = this.high_ & 65535, d = this.low_ >>> 16, e = a.high_ >>> 16, f = a.high_ & 65535, g = a.low_ >>> 16, h;
  h = 0 + ((this.low_ & 65535) + (a.low_ & 65535));
  a = 0 + (h >>> 16);
  a += d + g;
  d = 0 + (a >>> 16);
  d += c + f;
  c = 0 + (d >>> 16);
  c = c + (b + e) & 65535;
  return goog.math.Long.fromBits((a & 65535) << 16 | h & 65535, c << 16 | d & 65535);
};
goog.math.Long.prototype.subtract = function(a) {
  return this.add(a.negate());
};
goog.math.Long.prototype.multiply = function(a) {
  if (this.isZero() || a.isZero()) {
    return goog.math.Long.getZero();
  }
  if (this.equals(goog.math.Long.getMinValue())) {
    return a.isOdd() ? goog.math.Long.getMinValue() : goog.math.Long.getZero();
  }
  if (a.equals(goog.math.Long.getMinValue())) {
    return this.isOdd() ? goog.math.Long.getMinValue() : goog.math.Long.getZero();
  }
  if (this.isNegative()) {
    return a.isNegative() ? this.negate().multiply(a.negate()) : this.negate().multiply(a).negate();
  }
  if (a.isNegative()) {
    return this.multiply(a.negate()).negate();
  }
  if (this.lessThan(goog.math.Long.getTwoPwr24()) && a.lessThan(goog.math.Long.getTwoPwr24())) {
    return goog.math.Long.fromNumber(this.toNumber() * a.toNumber());
  }
  var b = this.high_ >>> 16, c = this.high_ & 65535, d = this.low_ >>> 16, e = this.low_ & 65535, f = a.high_ >>> 16, g = a.high_ & 65535, h = a.low_ >>> 16;
  a = a.low_ & 65535;
  var m, k, l, n;
  n = 0 + e * a;
  l = 0 + (n >>> 16);
  l += d * a;
  k = 0 + (l >>> 16);
  l = (l & 65535) + e * h;
  k += l >>> 16;
  l &= 65535;
  k += c * a;
  m = 0 + (k >>> 16);
  k = (k & 65535) + d * h;
  m += k >>> 16;
  k &= 65535;
  k += e * g;
  m += k >>> 16;
  k &= 65535;
  m = m + (b * a + c * h + d * g + e * f) & 65535;
  return goog.math.Long.fromBits(l << 16 | n & 65535, m << 16 | k);
};
goog.math.Long.prototype.div = function(a) {
  if (a.isZero()) {
    throw Error("division by zero");
  }
  if (this.isZero()) {
    return goog.math.Long.getZero();
  }
  if (this.equals(goog.math.Long.getMinValue())) {
    if (a.equals(goog.math.Long.getOne()) || a.equals(goog.math.Long.getNegOne())) {
      return goog.math.Long.getMinValue();
    }
    if (a.equals(goog.math.Long.getMinValue())) {
      return goog.math.Long.getOne();
    }
    var b = this.shiftRight(1).div(a).shiftLeft(1);
    if (b.equals(goog.math.Long.getZero())) {
      return a.isNegative() ? goog.math.Long.getOne() : goog.math.Long.getNegOne();
    }
    var c = this.subtract(a.multiply(b));
    return b.add(c.div(a));
  }
  if (a.equals(goog.math.Long.getMinValue())) {
    return goog.math.Long.getZero();
  }
  if (this.isNegative()) {
    return a.isNegative() ? this.negate().div(a.negate()) : this.negate().div(a).negate();
  }
  if (a.isNegative()) {
    return this.div(a.negate()).negate();
  }
  for (var d = goog.math.Long.getZero(), c = this;c.greaterThanOrEqual(a);) {
    for (var b = Math.max(1, Math.floor(c.toNumber() / a.toNumber())), e = Math.ceil(Math.log(b) / Math.LN2), e = 48 >= e ? 1 : Math.pow(2, e - 48), f = goog.math.Long.fromNumber(b), g = f.multiply(a);g.isNegative() || g.greaterThan(c);) {
      b -= e, f = goog.math.Long.fromNumber(b), g = f.multiply(a);
    }
    f.isZero() && (f = goog.math.Long.getOne());
    d = d.add(f);
    c = c.subtract(g);
  }
  return d;
};
goog.math.Long.prototype.modulo = function(a) {
  return this.subtract(this.div(a).multiply(a));
};
goog.math.Long.prototype.not = function() {
  return goog.math.Long.fromBits(~this.low_, ~this.high_);
};
goog.math.Long.prototype.and = function(a) {
  return goog.math.Long.fromBits(this.low_ & a.low_, this.high_ & a.high_);
};
goog.math.Long.prototype.or = function(a) {
  return goog.math.Long.fromBits(this.low_ | a.low_, this.high_ | a.high_);
};
goog.math.Long.prototype.xor = function(a) {
  return goog.math.Long.fromBits(this.low_ ^ a.low_, this.high_ ^ a.high_);
};
goog.math.Long.prototype.shiftLeft = function(a) {
  a &= 63;
  if (0 == a) {
    return this;
  }
  var b = this.low_;
  return 32 > a ? goog.math.Long.fromBits(b << a, this.high_ << a | b >>> 32 - a) : goog.math.Long.fromBits(0, b << a - 32);
};
goog.math.Long.prototype.shiftRight = function(a) {
  a &= 63;
  if (0 == a) {
    return this;
  }
  var b = this.high_;
  return 32 > a ? goog.math.Long.fromBits(this.low_ >>> a | b << 32 - a, b >> a) : goog.math.Long.fromBits(b >> a - 32, 0 <= b ? 0 : -1);
};
goog.math.Long.prototype.shiftRightUnsigned = function(a) {
  a &= 63;
  if (0 == a) {
    return this;
  }
  var b = this.high_;
  return 32 > a ? goog.math.Long.fromBits(this.low_ >>> a | b << 32 - a, b >>> a) : 32 == a ? goog.math.Long.fromBits(b, 0) : goog.math.Long.fromBits(b >>> a - 32, 0);
};
goog.object = {};
goog.object.forEach = function(a, b, c) {
  for (var d in a) {
    b.call(c, a[d], d, a);
  }
};
goog.object.filter = function(a, b, c) {
  var d = {}, e;
  for (e in a) {
    b.call(c, a[e], e, a) && (d[e] = a[e]);
  }
  return d;
};
goog.object.map = function(a, b, c) {
  var d = {}, e;
  for (e in a) {
    d[e] = b.call(c, a[e], e, a);
  }
  return d;
};
goog.object.some = function(a, b, c) {
  for (var d in a) {
    if (b.call(c, a[d], d, a)) {
      return !0;
    }
  }
  return !1;
};
goog.object.every = function(a, b, c) {
  for (var d in a) {
    if (!b.call(c, a[d], d, a)) {
      return !1;
    }
  }
  return !0;
};
goog.object.getCount = function(a) {
  var b = 0, c;
  for (c in a) {
    b++;
  }
  return b;
};
goog.object.getAnyKey = function(a) {
  for (var b in a) {
    return b;
  }
};
goog.object.getAnyValue = function(a) {
  for (var b in a) {
    return a[b];
  }
};
goog.object.contains = function(a, b) {
  return goog.object.containsValue(a, b);
};
goog.object.getValues = function(a) {
  var b = [], c = 0, d;
  for (d in a) {
    b[c++] = a[d];
  }
  return b;
};
goog.object.getKeys = function(a) {
  var b = [], c = 0, d;
  for (d in a) {
    b[c++] = d;
  }
  return b;
};
goog.object.getValueByKeys = function(a, b) {
  for (var c = goog.isArrayLike(b), d = c ? b : arguments, c = c ? 0 : 1;c < d.length && (a = a[d[c]], goog.isDef(a));c++) {
  }
  return a;
};
goog.object.containsKey = function(a, b) {
  return b in a;
};
goog.object.containsValue = function(a, b) {
  for (var c in a) {
    if (a[c] == b) {
      return !0;
    }
  }
  return !1;
};
goog.object.findKey = function(a, b, c) {
  for (var d in a) {
    if (b.call(c, a[d], d, a)) {
      return d;
    }
  }
};
goog.object.findValue = function(a, b, c) {
  return (b = goog.object.findKey(a, b, c)) && a[b];
};
goog.object.isEmpty = function(a) {
  for (var b in a) {
    return !1;
  }
  return !0;
};
goog.object.clear = function(a) {
  for (var b in a) {
    delete a[b];
  }
};
goog.object.remove = function(a, b) {
  var c;
  (c = b in a) && delete a[b];
  return c;
};
goog.object.add = function(a, b, c) {
  if (b in a) {
    throw Error('The object already contains the key "' + b + '"');
  }
  goog.object.set(a, b, c);
};
goog.object.get = function(a, b, c) {
  return b in a ? a[b] : c;
};
goog.object.set = function(a, b, c) {
  a[b] = c;
};
goog.object.setIfUndefined = function(a, b, c) {
  return b in a ? a[b] : a[b] = c;
};
goog.object.setWithReturnValueIfNotSet = function(a, b, c) {
  if (b in a) {
    return a[b];
  }
  c = c();
  return a[b] = c;
};
goog.object.equals = function(a, b) {
  for (var c in a) {
    if (!(c in b) || a[c] !== b[c]) {
      return !1;
    }
  }
  for (c in b) {
    if (!(c in a)) {
      return !1;
    }
  }
  return !0;
};
goog.object.clone = function(a) {
  var b = {}, c;
  for (c in a) {
    b[c] = a[c];
  }
  return b;
};
goog.object.unsafeClone = function(a) {
  var b = goog.typeOf(a);
  if ("object" == b || "array" == b) {
    if (a.clone) {
      return a.clone();
    }
    var b = "array" == b ? [] : {}, c;
    for (c in a) {
      b[c] = goog.object.unsafeClone(a[c]);
    }
    return b;
  }
  return a;
};
goog.object.transpose = function(a) {
  var b = {}, c;
  for (c in a) {
    b[a[c]] = c;
  }
  return b;
};
goog.object.PROTOTYPE_FIELDS_ = "constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.object.extend = function(a, b) {
  for (var c, d, e = 1;e < arguments.length;e++) {
    d = arguments[e];
    for (c in d) {
      a[c] = d[c];
    }
    for (var f = 0;f < goog.object.PROTOTYPE_FIELDS_.length;f++) {
      c = goog.object.PROTOTYPE_FIELDS_[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
    }
  }
};
goog.object.create = function(a) {
  var b = arguments.length;
  if (1 == b && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }
  if (b % 2) {
    throw Error("Uneven number of arguments");
  }
  for (var c = {}, d = 0;d < b;d += 2) {
    c[arguments[d]] = arguments[d + 1];
  }
  return c;
};
goog.object.createSet = function(a) {
  var b = arguments.length;
  if (1 == b && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }
  for (var c = {}, d = 0;d < b;d++) {
    c[arguments[d]] = !0;
  }
  return c;
};
goog.object.createImmutableView = function(a) {
  var b = a;
  Object.isFrozen && !Object.isFrozen(a) && (b = Object.create(a), Object.freeze(b));
  return b;
};
goog.object.isImmutableView = function(a) {
  return !!Object.isFrozen && Object.isFrozen(a);
};
var com = {cognitect:{}};
com.cognitect.transit = {};
com.cognitect.transit.delimiters = {};
com.cognitect.transit.delimiters.ESC = "~";
com.cognitect.transit.delimiters.TAG = "#";
com.cognitect.transit.delimiters.SUB = "^";
com.cognitect.transit.delimiters.RES = "`";
com.cognitect.transit.delimiters.ESC_TAG = "~#";
com.cognitect.transit.caching = {};
com.cognitect.transit.caching.MIN_SIZE_CACHEABLE = 3;
com.cognitect.transit.caching.BASE_CHAR_IDX = 48;
com.cognitect.transit.caching.CACHE_CODE_DIGITS = 44;
com.cognitect.transit.caching.MAX_CACHE_ENTRIES = com.cognitect.transit.caching.CACHE_CODE_DIGITS * com.cognitect.transit.caching.CACHE_CODE_DIGITS;
com.cognitect.transit.caching.MAX_CACHE_SIZE = 4096;
com.cognitect.transit.caching.isCacheable = function(a, b) {
  if (a.length > com.cognitect.transit.caching.MIN_SIZE_CACHEABLE) {
    if (b) {
      return !0;
    }
    var c = a.charAt(0), d = a.charAt(1);
    return c === com.cognitect.transit.delimiters.ESC ? ":" === d || "$" === d || "#" === d : !1;
  }
  return !1;
};
com.cognitect.transit.caching.idxToCode = function(a) {
  var b = Math.floor(a / com.cognitect.transit.caching.CACHE_CODE_DIGITS);
  a = String.fromCharCode(a % com.cognitect.transit.caching.CACHE_CODE_DIGITS + com.cognitect.transit.caching.BASE_CHAR_IDX);
  return 0 === b ? com.cognitect.transit.delimiters.SUB + a : com.cognitect.transit.delimiters.SUB + String.fromCharCode(b + com.cognitect.transit.caching.BASE_CHAR_IDX) + a;
};
com.cognitect.transit.caching.WriteCache = function() {
  this.cacheSize = this.gen = this.idx = 0;
  this.cache = {};
};
com.cognitect.transit.caching.WriteCache.prototype.write = function(a, b) {
  if (com.cognitect.transit.caching.isCacheable(a, b)) {
    this.cacheSize === com.cognitect.transit.caching.MAX_CACHE_SIZE ? (this.clear(), this.gen = 0, this.cache = {}) : this.idx === com.cognitect.transit.caching.MAX_CACHE_ENTRIES && this.clear();
    var c = this.cache[a];
    return null == c ? (this.cache[a] = [com.cognitect.transit.caching.idxToCode(this.idx), this.gen], this.idx++, a) : c[1] != this.gen ? (c[1] = this.gen, c[0] = com.cognitect.transit.caching.idxToCode(this.idx), this.idx++, a) : c[0];
  }
  return a;
};
com.cognitect.transit.caching.WriteCache.prototype.clear = function() {
  this.idx = 0;
  this.gen++;
};
com.cognitect.transit.caching.writeCache = function() {
  return new com.cognitect.transit.caching.WriteCache;
};
com.cognitect.transit.caching.isCacheCode = function(a) {
  return a.charAt(0) === com.cognitect.transit.delimiters.SUB && " " !== a.charAt(1);
};
com.cognitect.transit.caching.codeToIdx = function(a) {
  if (2 === a.length) {
    return a.charCodeAt(1) - com.cognitect.transit.caching.BASE_CHAR_IDX;
  }
  var b = (a.charCodeAt(1) - com.cognitect.transit.caching.BASE_CHAR_IDX) * com.cognitect.transit.caching.CACHE_CODE_DIGITS;
  a = a.charCodeAt(2) - com.cognitect.transit.caching.BASE_CHAR_IDX;
  return b + a;
};
com.cognitect.transit.caching.ReadCache = function() {
  this.idx = 0;
  this.cache = [];
};
com.cognitect.transit.caching.ReadCache.prototype.write = function(a, b) {
  this.idx == com.cognitect.transit.caching.MAX_CACHE_ENTRIES && (this.idx = 0);
  this.cache[this.idx] = a;
  this.idx++;
  return a;
};
com.cognitect.transit.caching.ReadCache.prototype.read = function(a, b) {
  return this.cache[com.cognitect.transit.caching.codeToIdx(a)];
};
com.cognitect.transit.caching.ReadCache.prototype.clear = function() {
  this.idx = 0;
};
com.cognitect.transit.caching.readCache = function() {
  return new com.cognitect.transit.caching.ReadCache;
};
com.cognitect.transit.util = {};
com.cognitect.transit.util.objectKeys = "undefined" != typeof Object.keys ? function(a) {
  return Object.keys(a);
} : function(a) {
  return goog.object.getKeys(a);
};
com.cognitect.transit.util.isArray = "undefined" != typeof Array.isArray ? function(a) {
  return Array.isArray(a);
} : function(a) {
  return "array" === goog.typeOf(a);
};
com.cognitect.transit.util.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
com.cognitect.transit.util.randInt = function(a) {
  return Math.round(Math.random() * a);
};
com.cognitect.transit.util.randHex = function() {
  return com.cognitect.transit.util.randInt(15).toString(16);
};
com.cognitect.transit.util.randomUUID = function() {
  var a = (8 | 3 & com.cognitect.transit.util.randInt(14)).toString(16);
  return com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + "-" + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + "-4" + com.cognitect.transit.util.randHex() + 
  com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + "-" + a + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + "-" + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + 
  com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex() + com.cognitect.transit.util.randHex();
};
com.cognitect.transit.util.btoa = function(a) {
  if ("undefined" != typeof btoa) {
    return btoa(a);
  }
  a = String(a);
  for (var b, c, d = 0, e = com.cognitect.transit.util.chars, f = "";a.charAt(d | 0) || (e = "=", d % 1);f += e.charAt(63 & b >> 8 - d % 1 * 8)) {
    c = a.charCodeAt(d += .75);
    if (255 < c) {
      throw Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
    }
    b = b << 8 | c;
  }
  return f;
};
com.cognitect.transit.util.atob = function(a) {
  if ("undefined" != typeof atob) {
    return atob(a);
  }
  a = String(a).replace(/=+$/, "");
  if (1 == a.length % 4) {
    throw Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (var b = 0, c, d, e = 0, f = "";d = a.charAt(e++);~d && (c = b % 4 ? 64 * c + d : d, b++ % 4) ? f += String.fromCharCode(255 & c >> (-2 * b & 6)) : 0) {
    d = com.cognitect.transit.util.chars.indexOf(d);
  }
  return f;
};
com.cognitect.transit.util.Uint8ToBase64 = function(a) {
  for (var b = 0, c = a.length, d = "", e = null;b < c;) {
    e = a.subarray(b, Math.min(b + 32768, c)), d += String.fromCharCode.apply(null, e), b += 32768;
  }
  return com.cognitect.transit.util.btoa(d);
};
com.cognitect.transit.util.Base64ToUint8 = function(a) {
  a = com.cognitect.transit.util.atob(a);
  for (var b = a.length, c = new Uint8Array(b), d = 0;d < b;d++) {
    var e = a.charCodeAt(d);
    c[d] = e;
  }
  return c;
};
com.cognitect.transit.eq = {};
com.cognitect.transit.eq.hashCodeProperty = "transit$hashCode$";
com.cognitect.transit.eq.hashCodeCounter = 1;
com.cognitect.transit.eq.equals = function(a, b) {
  if (null == a) {
    return null == b;
  }
  if (a === b) {
    return !0;
  }
  if ("object" === typeof a) {
    if (com.cognitect.transit.util.isArray(a)) {
      if (com.cognitect.transit.util.isArray(b) && a.length === b.length) {
        for (var c = 0;c < a.length;c++) {
          if (!com.cognitect.transit.eq.equals(a[c], b[c])) {
            return !1;
          }
        }
        return !0;
      }
      return !1;
    }
    if (a.com$cognitect$transit$equals) {
      return a.com$cognitect$transit$equals(b);
    }
    if (null != b && "object" === typeof b) {
      if (b.com$cognitect$transit$equals) {
        return b.com$cognitect$transit$equals(a);
      }
      var c = 0, d = com.cognitect.transit.util.objectKeys(b).length, e;
      for (e in a) {
        if (a.hasOwnProperty(e) && (c++, !b.hasOwnProperty(e) || !com.cognitect.transit.eq.equals(a[e], b[e]))) {
          return !1;
        }
      }
      return c === d;
    }
  }
  return !1;
};
com.cognitect.transit.eq.hashCombine = function(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2);
};
com.cognitect.transit.eq.stringCodeCache = {};
com.cognitect.transit.eq.stringCodeCacheSize = 0;
com.cognitect.transit.eq.STR_CACHE_MAX = 256;
com.cognitect.transit.eq.hashString = function(a) {
  var b = com.cognitect.transit.eq.stringCodeCache[a];
  if (null != b) {
    return b;
  }
  for (var c = b = 0;c < a.length;++c) {
    b = 31 * b + a.charCodeAt(c), b %= 4294967296;
  }
  com.cognitect.transit.eq.stringCodeCacheSize++;
  com.cognitect.transit.eq.stringCodeCacheSize >= com.cognitect.transit.eq.STR_CACHE_MAX && (com.cognitect.transit.eq.stringCodeCache = {}, com.cognitect.transit.eq.stringCodeCacheSize = 1);
  return com.cognitect.transit.eq.stringCodeCache[a] = b;
};
com.cognitect.transit.eq.hashMapLike = function(a) {
  var b = 0;
  if (null != a.forEach) {
    a.forEach(function(a, c, d) {
      b = (b + (com.cognitect.transit.eq.hashCode(c) ^ com.cognitect.transit.eq.hashCode(a))) % 4503599627370496;
    });
  } else {
    for (var c = com.cognitect.transit.util.objectKeys(a), d = 0;d < c.length;d++) {
      var e = c[d], f = a[e], b = (b + (com.cognitect.transit.eq.hashCode(e) ^ com.cognitect.transit.eq.hashCode(f))) % 4503599627370496
    }
  }
  return b;
};
com.cognitect.transit.eq.hashArrayLike = function(a) {
  var b = 0;
  if (com.cognitect.transit.util.isArray(a)) {
    for (var c = 0;c < a.length;c++) {
      b = com.cognitect.transit.eq.hashCombine(b, com.cognitect.transit.eq.hashCode(a[c]));
    }
  } else {
    a.forEach && a.forEach(function(a, c) {
      b = com.cognitect.transit.eq.hashCombine(b, com.cognitect.transit.eq.hashCode(a));
    });
  }
  return b;
};
com.cognitect.transit.eq.hashCode = function(a) {
  if (null == a) {
    return 0;
  }
  switch(typeof a) {
    case "number":
      return a;
    case "boolean":
      return !0 === a ? 1 : 0;
    case "string":
      return com.cognitect.transit.eq.hashString(a);
    case "function":
      var b = a[com.cognitect.transit.eq.hashCodeProperty];
      b || (b = com.cognitect.transit.eq.hashCodeCounter, "undefined" != typeof Object.defineProperty ? Object.defineProperty(a, com.cognitect.transit.eq.hashCodeProperty, {value:b, enumerable:!1}) : a[com.cognitect.transit.eq.hashCodeProperty] = b, com.cognitect.transit.eq.hashCodeCounter++);
      return b;
    default:
      return a instanceof Date ? a.valueOf() : com.cognitect.transit.util.isArray(a) ? com.cognitect.transit.eq.hashArrayLike(a) : a.com$cognitect$transit$hashCode ? a.com$cognitect$transit$hashCode() : com.cognitect.transit.eq.hashMapLike(a);
  }
};
com.cognitect.transit.eq.extendToEQ = function(a, b) {
  a.com$cognitect$transit$hashCode = b.hashCode;
  a.com$cognitect$transit$equals = b.equals;
  return a;
};
com.cognitect.transit.types = {};
com.cognitect.transit.types.ITERATOR = "undefined" != typeof Symbol ? Symbol.iterator : "@@iterator";
com.cognitect.transit.types.TaggedValue = function(a, b) {
  this.tag = a;
  this.rep = b;
  this.hashCode = -1;
};
com.cognitect.transit.types.TaggedValue.prototype.toString = function() {
  return "[TaggedValue: " + this.tag + ", " + this.rep + "]";
};
com.cognitect.transit.types.TaggedValue.prototype.equiv = function(a) {
  return com.cognitect.transit.eq.equals(this, a);
};
com.cognitect.transit.types.TaggedValue.prototype.equiv = com.cognitect.transit.types.TaggedValue.prototype.equiv;
com.cognitect.transit.types.TaggedValue.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue ? this.tag === a.tag && com.cognitect.transit.eq.equals(this.rep, a.rep) : !1;
};
com.cognitect.transit.types.TaggedValue.prototype.com$cognitect$transit$hashCode = function() {
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashCombine(com.cognitect.transit.eq.hashCode(this.tag), com.cognitect.transit.eq.hashCode(this.rep)));
  return this.hashCode;
};
com.cognitect.transit.types.taggedValue = function(a, b) {
  return new com.cognitect.transit.types.TaggedValue(a, b);
};
com.cognitect.transit.types.isTaggedValue = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue;
};
com.cognitect.transit.types.nullValue = function() {
  return null;
};
com.cognitect.transit.types.boolValue = function(a) {
  return "t" === a;
};
com.cognitect.transit.types.MAX_INT = goog.math.Long.fromString("9007199254740991");
com.cognitect.transit.types.MIN_INT = goog.math.Long.fromString("-9007199254740991");
com.cognitect.transit.types.intValue = function(a) {
  if ("number" === typeof a || a instanceof goog.math.Long) {
    return a;
  }
  a = goog.math.Long.fromString(a, 10);
  return a.greaterThan(com.cognitect.transit.types.MAX_INT) || a.lessThan(com.cognitect.transit.types.MIN_INT) ? a : a.toNumber();
};
goog.math.Long.prototype.equiv = function(a) {
  return com.cognitect.transit.eq.equals(this, a);
};
goog.math.Long.prototype.equiv = goog.math.Long.prototype.equiv;
goog.math.Long.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof goog.math.Long && this.equals(a);
};
goog.math.Long.prototype.com$cognitect$transit$hashCode = function() {
  return this.toInt();
};
com.cognitect.transit.types.isInteger = function(a) {
  return a instanceof goog.math.Long ? !0 : "number" === typeof a && !isNaN(a) && Infinity !== a && parseFloat(a) === parseInt(a, 10);
};
com.cognitect.transit.types.floatValue = function(a) {
  return parseFloat(a);
};
com.cognitect.transit.types.bigInteger = function(a) {
  return com.cognitect.transit.types.taggedValue("n", a);
};
com.cognitect.transit.types.isBigInteger = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "n" === a.tag;
};
com.cognitect.transit.types.bigDecimalValue = function(a) {
  return com.cognitect.transit.types.taggedValue("f", a);
};
com.cognitect.transit.types.isBigDecimal = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "f" === a.tag;
};
com.cognitect.transit.types.charValue = function(a) {
  return a;
};
com.cognitect.transit.types.Keyword = function(a) {
  this._name = a;
  this.hashCode = -1;
};
com.cognitect.transit.types.Keyword.prototype.toString = function() {
  return ":" + this._name;
};
com.cognitect.transit.types.Keyword.prototype.namespace = function() {
  var a = this._name.indexOf("/");
  return -1 != a ? this._name.substring(0, a) : null;
};
com.cognitect.transit.types.Keyword.prototype.name = function() {
  var a = this._name.indexOf("/");
  return -1 != a ? this._name.substring(a + 1, this._name.length) : this._name;
};
com.cognitect.transit.types.Keyword.prototype.equiv = function(a) {
  return com.cognitect.transit.eq.equals(this, a);
};
com.cognitect.transit.types.Keyword.prototype.equiv = com.cognitect.transit.types.Keyword.prototype.equiv;
com.cognitect.transit.types.Keyword.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof com.cognitect.transit.types.Keyword && this._name == a._name;
};
com.cognitect.transit.types.Keyword.prototype.com$cognitect$transit$hashCode = function() {
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashCode(this._name));
  return this.hashCode;
};
com.cognitect.transit.types.keyword = function(a) {
  return new com.cognitect.transit.types.Keyword(a);
};
com.cognitect.transit.types.isKeyword = function(a) {
  return a instanceof com.cognitect.transit.types.Keyword;
};
com.cognitect.transit.types.Symbol = function(a) {
  this._name = a;
  this.hashCode = -1;
};
com.cognitect.transit.types.Symbol.prototype.namespace = function() {
  var a = this._name.indexOf("/");
  return -1 != a ? this._name.substring(0, a) : null;
};
com.cognitect.transit.types.Symbol.prototype.name = function() {
  var a = this._name.indexOf("/");
  return -1 != a ? this._name.substring(a + 1, this._name.length) : this._name;
};
com.cognitect.transit.types.Symbol.prototype.toString = function() {
  return this._name;
};
com.cognitect.transit.types.Symbol.prototype.equiv = function(a) {
  return com.cognitect.transit.eq.equals(this, a);
};
com.cognitect.transit.types.Symbol.prototype.equiv = com.cognitect.transit.types.Symbol.prototype.equiv;
com.cognitect.transit.types.Symbol.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof com.cognitect.transit.types.Symbol && this._name == a._name;
};
com.cognitect.transit.types.Symbol.prototype.com$cognitect$transit$hashCode = function() {
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashCode(this._name));
  return this.hashCode;
};
com.cognitect.transit.types.symbol = function(a) {
  return new com.cognitect.transit.types.Symbol(a);
};
com.cognitect.transit.types.isSymbol = function(a) {
  return a instanceof com.cognitect.transit.types.Symbol;
};
com.cognitect.transit.types.hexFor = function(a, b, c) {
  var d = "";
  c = c || b + 1;
  for (var e = 8 * (7 - b), f = goog.math.Long.fromInt(255).shiftLeft(e);b < c;b++, e -= 8, f = f.shiftRightUnsigned(8)) {
    var g = a.and(f).shiftRightUnsigned(e).toString(16);
    1 == g.length && (g = "0" + g);
    d += g;
  }
  return d;
};
com.cognitect.transit.types.UUID = function(a, b) {
  this.high = a;
  this.low = b;
  this.hashCode = -1;
};
com.cognitect.transit.types.UUID.prototype.getLeastSignificantBits = function() {
  return this.low;
};
com.cognitect.transit.types.UUID.prototype.getMostSignificantBits = function() {
  return this.high;
};
com.cognitect.transit.types.UUID.prototype.toString = function() {
  var a, b = this.high, c = this.low;
  a = "" + (com.cognitect.transit.types.hexFor(b, 0, 4) + "-");
  a += com.cognitect.transit.types.hexFor(b, 4, 6) + "-";
  a += com.cognitect.transit.types.hexFor(b, 6, 8) + "-";
  a += com.cognitect.transit.types.hexFor(c, 0, 2) + "-";
  return a += com.cognitect.transit.types.hexFor(c, 2, 8);
};
com.cognitect.transit.types.UUID.prototype.equiv = function(a) {
  return com.cognitect.transit.eq.equals(this, a);
};
com.cognitect.transit.types.UUID.prototype.equiv = com.cognitect.transit.types.UUID.prototype.equiv;
com.cognitect.transit.types.UUID.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof com.cognitect.transit.types.UUID && this.high.equals(a.high) && this.low.equals(a.low);
};
com.cognitect.transit.types.UUID.prototype.com$cognitect$transit$hashCode = function() {
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashCode(this.toString()));
  return this.hashCode;
};
com.cognitect.transit.types.UUIDfromString = function(a) {
  a = a.replace(/-/g, "");
  for (var b = null, c = null, d = c = 0, e = 24, f = 0, f = c = 0, e = 24;8 > f;f += 2, e -= 8) {
    c |= parseInt(a.substring(f, f + 2), 16) << e;
  }
  d = 0;
  f = 8;
  for (e = 24;16 > f;f += 2, e -= 8) {
    d |= parseInt(a.substring(f, f + 2), 16) << e;
  }
  b = goog.math.Long.fromBits(d, c);
  c = 0;
  f = 16;
  for (e = 24;24 > f;f += 2, e -= 8) {
    c |= parseInt(a.substring(f, f + 2), 16) << e;
  }
  d = 0;
  for (e = f = 24;32 > f;f += 2, e -= 8) {
    d |= parseInt(a.substring(f, f + 2), 16) << e;
  }
  c = goog.math.Long.fromBits(d, c);
  return new com.cognitect.transit.types.UUID(b, c);
};
com.cognitect.transit.types.uuid = function(a) {
  return com.cognitect.transit.types.UUIDfromString(a);
};
com.cognitect.transit.types.isUUID = function(a) {
  return a instanceof com.cognitect.transit.types.UUID;
};
com.cognitect.transit.types.date = function(a) {
  a = "number" === typeof a ? a : parseInt(a, 10);
  return new Date(a);
};
com.cognitect.transit.types.verboseDate = function(a) {
  return new Date(a);
};
Date.prototype.com$cognitect$transit$equals = function(a) {
  return a instanceof Date ? this.valueOf() === a.valueOf() : !1;
};
Date.prototype.com$cognitect$transit$hashCode = function() {
  return this.valueOf();
};
com.cognitect.transit.types.binary = function(a, b) {
  return b && !1 === b.preferBuffers || "undefined" == typeof Buffer ? "undefined" != typeof Uint8Array ? com.cognitect.transit.util.Base64ToUint8(a) : com.cognitect.transit.types.taggedValue("b", a) : new Buffer(a, "base64");
};
com.cognitect.transit.types.isBinary = function(a) {
  return "undefined" != typeof Buffer && a instanceof Buffer ? !0 : "undefined" != typeof Uint8Array && a instanceof Uint8Array ? !0 : a instanceof com.cognitect.transit.types.TaggedValue && "b" === a.tag;
};
com.cognitect.transit.types.uri = function(a) {
  return com.cognitect.transit.types.taggedValue("r", a);
};
com.cognitect.transit.types.isURI = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "r" === a.tag;
};
com.cognitect.transit.types.KEYS = 0;
com.cognitect.transit.types.VALUES = 1;
com.cognitect.transit.types.ENTRIES = 2;
com.cognitect.transit.types.TransitArrayMapIterator = function(a, b) {
  this.entries = a;
  this.type = b || com.cognitect.transit.types.KEYS;
  this.idx = 0;
};
com.cognitect.transit.types.TransitArrayMapIterator.prototype.next = function() {
  if (this.idx < this.entries.length) {
    var a = null, a = this.type === com.cognitect.transit.types.KEYS ? this.entries[this.idx] : this.type === com.cognitect.transit.types.VALUES ? this.entries[this.idx + 1] : [this.entries[this.idx], this.entries[this.idx + 1]], a = {value:a, done:!1};
    this.idx += 2;
    return a;
  }
  return {value:null, done:!0};
};
com.cognitect.transit.types.TransitArrayMapIterator.prototype.next = com.cognitect.transit.types.TransitArrayMapIterator.prototype.next;
com.cognitect.transit.types.TransitArrayMapIterator.prototype[com.cognitect.transit.types.ITERATOR] = function() {
  return this;
};
com.cognitect.transit.types.TransitMapIterator = function(a, b) {
  this.map = a;
  this.type = b || com.cognitect.transit.types.KEYS;
  this.keys = this.map.getKeys();
  this.idx = 0;
  this.bucket = null;
  this.bucketIdx = 0;
};
com.cognitect.transit.types.TransitMapIterator.prototype.next = function() {
  if (this.idx < this.map.size) {
    null != this.bucket && this.bucketIdx < this.bucket.length || (this.bucket = this.map.map[this.keys[this.idx]], this.bucketIdx = 0);
    var a = null, a = this.type === com.cognitect.transit.types.KEYS ? this.bucket[this.bucketIdx] : this.type === com.cognitect.transit.types.VALUES ? this.bucket[this.bucketIdx + 1] : [this.bucket[this.bucketIdx], this.bucket[this.bucketIdx + 1]], a = {value:a, done:!1};
    this.idx++;
    this.bucketIdx += 2;
    return a;
  }
  return {value:null, done:!0};
};
com.cognitect.transit.types.TransitMapIterator.prototype.next = com.cognitect.transit.types.TransitMapIterator.prototype.next;
com.cognitect.transit.types.TransitMapIterator.prototype[com.cognitect.transit.types.ITERATOR] = function() {
  return this;
};
com.cognitect.transit.types.mapEquals = function(a, b) {
  if (a instanceof com.cognitect.transit.types.TransitMap && com.cognitect.transit.types.isMap(b)) {
    if (a.size !== b.size) {
      return !1;
    }
    for (var c in a.map) {
      for (var d = a.map[c], e = 0;e < d.length;e += 2) {
        if (!com.cognitect.transit.eq.equals(d[e + 1], b.get(d[e]))) {
          return !1;
        }
      }
    }
    return !0;
  }
  if (a instanceof com.cognitect.transit.types.TransitArrayMap && com.cognitect.transit.types.isMap(b)) {
    if (a.size !== b.size) {
      return !1;
    }
    c = a._entries;
    for (e = 0;e < c.length;e += 2) {
      if (!com.cognitect.transit.eq.equals(c[e + 1], b.get(c[e]))) {
        return !1;
      }
    }
    return !0;
  }
  if (null != b && "object" === typeof b && (e = com.cognitect.transit.util.objectKeys(b), c = e.length, a.size === c)) {
    for (d = 0;d < c;d++) {
      var f = e[d];
      if (!a.has(f) || !com.cognitect.transit.eq.equals(b[f], a.get(f))) {
        return !1;
      }
    }
    return !0;
  }
  return !1;
};
com.cognitect.transit.types.SMALL_ARRAY_MAP_THRESHOLD = 8;
com.cognitect.transit.types.ARRAY_MAP_THRESHOLD = 32;
com.cognitect.transit.types.ARRAY_MAP_ACCESS_THRESHOLD = 32;
com.cognitect.transit.types.print = function(a) {
  return null == a ? "null" : goog.isArray(a) ? "[" + a.toString() + "]" : goog.isString(a) ? '"' + a + '"' : a.toString();
};
com.cognitect.transit.types.printMap = function(a) {
  var b = 0, c = "TransitMap {";
  a.forEach(function(d, e) {
    c += com.cognitect.transit.types.print(e) + " => " + com.cognitect.transit.types.print(d);
    b < a.size - 1 && (c += ", ");
    b++;
  });
  return c + "}";
};
com.cognitect.transit.types.printSet = function(a) {
  var b = 0, c = "TransitSet {";
  a.forEach(function(d) {
    c += com.cognitect.transit.types.print(d);
    b < a.size - 1 && (c += ", ");
    b++;
  });
  return c + "}";
};
com.cognitect.transit.types.TransitArrayMap = function(a) {
  this._entries = a;
  this.backingMap = null;
  this.hashCode = -1;
  this.size = a.length / 2;
  this.accesses = 0;
};
com.cognitect.transit.types.TransitArrayMap.prototype.toString = function() {
  return com.cognitect.transit.types.printMap(this);
};
com.cognitect.transit.types.TransitArrayMap.prototype.inspect = function() {
  return this.toString();
};
com.cognitect.transit.types.TransitArrayMap.prototype.convert = function() {
  if (this.backingMap) {
    throw Error("Invalid operation, already converted");
  }
  if (this.size < com.cognitect.transit.types.SMALL_ARRAY_MAP_THRESHOLD) {
    return !1;
  }
  this.accesses++;
  return this.accesses > com.cognitect.transit.types.ARRAY_MAP_ACCESS_THRESHOLD ? (this.backingMap = com.cognitect.transit.types.map(this._entries, !1, !0), this._entries = [], !0) : !1;
};
com.cognitect.transit.types.TransitArrayMap.prototype.clear = function() {
  this.hashCode = -1;
  this.backingMap ? this.backingMap.clear() : this._entries = [];
  this.size = 0;
};
com.cognitect.transit.types.TransitArrayMap.prototype.clear = com.cognitect.transit.types.TransitArrayMap.prototype.clear;
com.cognitect.transit.types.TransitArrayMap.prototype.keys = function() {
  return this.backingMap ? this.backingMap.keys() : new com.cognitect.transit.types.TransitArrayMapIterator(this._entries, com.cognitect.transit.types.KEYS);
};
com.cognitect.transit.types.TransitArrayMap.prototype.keys = com.cognitect.transit.types.TransitArrayMap.prototype.keys;
com.cognitect.transit.types.TransitArrayMap.prototype.keySet = function() {
  if (this.backingMap) {
    return this.backingMap.keySet();
  }
  for (var a = [], b = 0, c = 0;c < this._entries.length;b++, c += 2) {
    a[b] = this._entries[c];
  }
  return a;
};
com.cognitect.transit.types.TransitArrayMap.prototype.keySet = com.cognitect.transit.types.TransitArrayMap.prototype.keySet;
com.cognitect.transit.types.TransitArrayMap.prototype.entries = function() {
  return this.backingMap ? this.backingMap.entries() : new com.cognitect.transit.types.TransitArrayMapIterator(this._entries, com.cognitect.transit.types.ENTRIES);
};
com.cognitect.transit.types.TransitArrayMap.prototype.entries = com.cognitect.transit.types.TransitArrayMap.prototype.entries;
com.cognitect.transit.types.TransitArrayMap.prototype.values = function() {
  return this.backingMap ? this.backingMap.values() : new com.cognitect.transit.types.TransitArrayMapIterator(this._entries, com.cognitect.transit.types.VALUES);
};
com.cognitect.transit.types.TransitArrayMap.prototype.values = com.cognitect.transit.types.TransitArrayMap.prototype.values;
com.cognitect.transit.types.TransitArrayMap.prototype.forEach = function(a) {
  if (this.backingMap) {
    this.backingMap.forEach(a);
  } else {
    for (var b = 0;b < this._entries.length;b += 2) {
      a(this._entries[b + 1], this._entries[b]);
    }
  }
};
com.cognitect.transit.types.TransitArrayMap.prototype.forEach = com.cognitect.transit.types.TransitArrayMap.prototype.forEach;
com.cognitect.transit.types.TransitArrayMap.prototype.get = function(a, b) {
  if (this.backingMap) {
    return this.backingMap.get(a);
  }
  if (this.convert()) {
    return this.get(a);
  }
  for (var c = 0;c < this._entries.length;c += 2) {
    if (com.cognitect.transit.eq.equals(this._entries[c], a)) {
      return this._entries[c + 1];
    }
  }
  return b;
};
com.cognitect.transit.types.TransitArrayMap.prototype.get = com.cognitect.transit.types.TransitArrayMap.prototype.get;
com.cognitect.transit.types.TransitArrayMap.prototype.has = function(a) {
  if (this.backingMap) {
    return this.backingMap.has(a);
  }
  if (this.convert()) {
    return this.has(a);
  }
  for (var b = 0;b < this._entries.length;b += 2) {
    if (com.cognitect.transit.eq.equals(this._entries[b], a)) {
      return !0;
    }
  }
  return !1;
};
com.cognitect.transit.types.TransitArrayMap.prototype.has = com.cognitect.transit.types.TransitArrayMap.prototype.has;
com.cognitect.transit.types.TransitArrayMap.prototype.set = function(a, b) {
  this.hashCode = -1;
  if (this.backingMap) {
    this.backingMap.set(a, b), this.size = this.backingMap.size;
  } else {
    for (var c = 0;c < this._entries.length;c += 2) {
      if (com.cognitect.transit.eq.equals(this._entries[c], a)) {
        this._entries[c + 1] = b;
        return;
      }
    }
    this._entries.push(a);
    this._entries.push(b);
    this.size++;
    this.size > com.cognitect.transit.types.ARRAY_MAP_THRESHOLD && (this.backingMap = com.cognitect.transit.types.map(this._entries, !1, !0), this._entries = null);
  }
};
com.cognitect.transit.types.TransitArrayMap.prototype.set = com.cognitect.transit.types.TransitArrayMap.prototype.set;
com.cognitect.transit.types.TransitArrayMap.prototype["delete"] = function(a) {
  this.hashCode = -1;
  if (this.backingMap) {
    return a = this.backingMap["delete"](a), this.size = this.backingMap.size, a;
  }
  for (var b = 0;b < this._entries.length;b += 2) {
    if (com.cognitect.transit.eq.equals(this._entries[b], a)) {
      return a = this._entries[b + 1], this._entries.splice(b, 2), this.size--, a;
    }
  }
};
com.cognitect.transit.types.TransitArrayMap.prototype.clone = function() {
  var a = com.cognitect.transit.types.map();
  this.forEach(function(b, c) {
    a.set(c, b);
  });
  return a;
};
com.cognitect.transit.types.TransitArrayMap.prototype.clone = com.cognitect.transit.types.TransitArrayMap.prototype.clone;
com.cognitect.transit.types.TransitArrayMap.prototype[com.cognitect.transit.types.ITERATOR] = function() {
  return this.entries();
};
com.cognitect.transit.types.TransitArrayMap.prototype.com$cognitect$transit$hashCode = function() {
  if (this.backingMap) {
    return this.backingMap.com$cognitect$transit$hashCode();
  }
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashMapLike(this));
  return this.hashCode;
};
com.cognitect.transit.types.TransitArrayMap.prototype.com$cognitect$transit$equals = function(a) {
  return this.backingMap ? com.cognitect.transit.types.mapEquals(this.backingMap, a) : com.cognitect.transit.types.mapEquals(this, a);
};
com.cognitect.transit.types.TransitMap = function(a, b, c) {
  this.map = b || {};
  this._keys = a || [];
  this.size = c || 0;
  this.hashCode = -1;
};
com.cognitect.transit.types.TransitMap.prototype.toString = function() {
  return com.cognitect.transit.types.printMap(this);
};
com.cognitect.transit.types.TransitMap.prototype.inspect = function() {
  return this.toString();
};
com.cognitect.transit.types.TransitMap.prototype.clear = function() {
  this.hashCode = -1;
  this.map = {};
  this._keys = [];
  this.size = 0;
};
com.cognitect.transit.types.TransitMap.prototype.clear = com.cognitect.transit.types.TransitMap.prototype.clear;
com.cognitect.transit.types.TransitMap.prototype.getKeys = function() {
  return null != this._keys ? this._keys : com.cognitect.transit.util.objectKeys(this.map);
};
com.cognitect.transit.types.TransitMap.prototype["delete"] = function(a) {
  this.hashCode = -1;
  this._keys = null;
  for (var b = com.cognitect.transit.eq.hashCode(a), c = this.map[b], d = 0;d < c.length;d += 2) {
    if (com.cognitect.transit.eq.equals(a, c[d])) {
      return a = c[d + 1], c.splice(d, 2), 0 === c.length && delete this.map[b], this.size--, a;
    }
  }
};
com.cognitect.transit.types.TransitMap.prototype.entries = function() {
  return new com.cognitect.transit.types.TransitMapIterator(this, com.cognitect.transit.types.ENTRIES);
};
com.cognitect.transit.types.TransitMap.prototype.entries = com.cognitect.transit.types.TransitMap.prototype.entries;
com.cognitect.transit.types.TransitMap.prototype.forEach = function(a) {
  for (var b = this.getKeys(), c = 0;c < b.length;c++) {
    for (var d = this.map[b[c]], e = 0;e < d.length;e += 2) {
      a(d[e + 1], d[e], this);
    }
  }
};
com.cognitect.transit.types.TransitMap.prototype.forEach = com.cognitect.transit.types.TransitMap.prototype.forEach;
com.cognitect.transit.types.TransitMap.prototype.get = function(a, b) {
  var c = com.cognitect.transit.eq.hashCode(a), c = this.map[c];
  if (null != c) {
    for (var d = 0;d < c.length;d += 2) {
      if (com.cognitect.transit.eq.equals(a, c[d])) {
        return c[d + 1];
      }
    }
  } else {
    return b;
  }
};
com.cognitect.transit.types.TransitMap.prototype.get = com.cognitect.transit.types.TransitMap.prototype.get;
com.cognitect.transit.types.TransitMap.prototype.has = function(a) {
  var b = com.cognitect.transit.eq.hashCode(a), b = this.map[b];
  if (null != b) {
    for (var c = 0;c < b.length;c += 2) {
      if (com.cognitect.transit.eq.equals(a, b[c])) {
        return !0;
      }
    }
  }
  return !1;
};
com.cognitect.transit.types.TransitMap.prototype.has = com.cognitect.transit.types.TransitMap.prototype.has;
com.cognitect.transit.types.TransitMap.prototype.keys = function() {
  return new com.cognitect.transit.types.TransitMapIterator(this, com.cognitect.transit.types.KEYS);
};
com.cognitect.transit.types.TransitMap.prototype.keys = com.cognitect.transit.types.TransitMap.prototype.keys;
com.cognitect.transit.types.TransitMap.prototype.keySet = function() {
  for (var a = this.getKeys(), b = [], c = 0;c < a.length;c++) {
    for (var d = this.map[a[c]], e = 0;e < d.length;e += 2) {
      b.push(d[e]);
    }
  }
  return b;
};
com.cognitect.transit.types.TransitMap.prototype.keySet = com.cognitect.transit.types.TransitMap.prototype.keySet;
com.cognitect.transit.types.TransitMap.prototype.set = function(a, b) {
  this.hashCode = -1;
  var c = com.cognitect.transit.eq.hashCode(a), d = this.map[c];
  if (null == d) {
    this._keys && this._keys.push(c), this.map[c] = [a, b], this.size++;
  } else {
    for (var c = !0, e = 0;e < d.length;e += 2) {
      if (com.cognitect.transit.eq.equals(b, d[e])) {
        c = !1;
        d[e] = b;
        break;
      }
    }
    c && (d.push(a), d.push(b), this.size++);
  }
};
com.cognitect.transit.types.TransitMap.prototype.set = com.cognitect.transit.types.TransitMap.prototype.set;
com.cognitect.transit.types.TransitMap.prototype.values = function() {
  return new com.cognitect.transit.types.TransitMapIterator(this, com.cognitect.transit.types.VALUES);
};
com.cognitect.transit.types.TransitMap.prototype.values = com.cognitect.transit.types.TransitMap.prototype.values;
com.cognitect.transit.types.TransitMap.prototype.clone = function() {
  var a = com.cognitect.transit.types.map();
  this.forEach(function(b, c) {
    a.set(c, b);
  });
  return a;
};
com.cognitect.transit.types.TransitMap.prototype.clone = com.cognitect.transit.types.TransitMap.prototype.clone;
com.cognitect.transit.types.TransitMap.prototype[com.cognitect.transit.types.ITERATOR] = function() {
  return this.entries();
};
com.cognitect.transit.types.TransitMap.prototype.com$cognitect$transit$hashCode = function() {
  -1 === this.hashCode && (this.hashCode = com.cognitect.transit.eq.hashMapLike(this));
  return this.hashCode;
};
com.cognitect.transit.types.TransitMap.prototype.com$cognitect$transit$equals = function(a) {
  return com.cognitect.transit.types.mapEquals(this, a);
};
com.cognitect.transit.types.map = function(a, b, c) {
  a = a || [];
  b = !1 === b ? b : !0;
  if ((!0 !== c || !c) && a.length <= 2 * com.cognitect.transit.types.ARRAY_MAP_THRESHOLD) {
    if (b) {
      var d = a;
      a = [];
      for (b = 0;b < d.length;b += 2) {
        var e = !1;
        for (c = 0;c < a.length;c += 2) {
          if (com.cognitect.transit.eq.equals(a[c], d[b])) {
            a[c + 1] = d[b + 1];
            e = !0;
            break;
          }
        }
        e || (a.push(d[b]), a.push(d[b + 1]));
      }
    }
    return new com.cognitect.transit.types.TransitArrayMap(a);
  }
  var d = {}, e = [], f = 0;
  for (b = 0;b < a.length;b += 2) {
    c = com.cognitect.transit.eq.hashCode(a[b]);
    var g = d[c];
    if (null == g) {
      e.push(c), d[c] = [a[b], a[b + 1]], f++;
    } else {
      var h = !0;
      for (c = 0;c < g.length;c += 2) {
        if (com.cognitect.transit.eq.equals(g[c], a[b])) {
          g[c + 1] = a[b + 1];
          h = !1;
          break;
        }
      }
      h && (g.push(a[b]), g.push(a[b + 1]), f++);
    }
  }
  return new com.cognitect.transit.types.TransitMap(e, d, f);
};
com.cognitect.transit.types.isArrayMap = function(a) {
  return a instanceof com.cognitect.transit.types.TransitArrayMap;
};
com.cognitect.transit.types.isMap = function(a) {
  return a instanceof com.cognitect.transit.types.TransitArrayMap || a instanceof com.cognitect.transit.types.TransitMap;
};
com.cognitect.transit.types.TransitSet = function(a) {
  this.map = a;
  this.size = a.size;
};
com.cognitect.transit.types.TransitSet.prototype.toString = function() {
  return com.cognitect.transit.types.printSet(this);
};
com.cognitect.transit.types.TransitSet.prototype.inspect = function() {
  return this.toString();
};
com.cognitect.transit.types.TransitSet.prototype.add = function(a) {
  this.map.set(a, a);
  this.size = this.map.size;
};
com.cognitect.transit.types.TransitSet.prototype.add = com.cognitect.transit.types.TransitSet.prototype.add;
com.cognitect.transit.types.TransitSet.prototype.clear = function() {
  this.map = new com.cognitect.transit.types.TransitMap;
  this.size = 0;
};
com.cognitect.transit.types.TransitSet.prototype.clear = com.cognitect.transit.types.TransitSet.prototype.clear;
com.cognitect.transit.types.TransitSet.prototype["delete"] = function(a) {
  a = this.map["delete"](a);
  this.size = this.map.size;
  return a;
};
com.cognitect.transit.types.TransitSet.prototype.entries = function() {
  return this.map.entries();
};
com.cognitect.transit.types.TransitSet.prototype.entries = com.cognitect.transit.types.TransitSet.prototype.entries;
com.cognitect.transit.types.TransitSet.prototype.forEach = function(a, b) {
  var c = this;
  this.map.forEach(function(b, e, f) {
    a(e, c);
  });
};
com.cognitect.transit.types.TransitSet.prototype.forEach = com.cognitect.transit.types.TransitSet.prototype.forEach;
com.cognitect.transit.types.TransitSet.prototype.has = function(a) {
  return this.map.has(a);
};
com.cognitect.transit.types.TransitSet.prototype.has = com.cognitect.transit.types.TransitSet.prototype.has;
com.cognitect.transit.types.TransitSet.prototype.keys = function() {
  return this.map.keys();
};
com.cognitect.transit.types.TransitSet.prototype.keys = com.cognitect.transit.types.TransitSet.prototype.keys;
com.cognitect.transit.types.TransitSet.prototype.keySet = function() {
  return this.map.keySet();
};
com.cognitect.transit.types.TransitSet.prototype.keySet = com.cognitect.transit.types.TransitSet.prototype.keySet;
com.cognitect.transit.types.TransitSet.prototype.values = function() {
  return this.map.values();
};
com.cognitect.transit.types.TransitSet.prototype.values = com.cognitect.transit.types.TransitSet.prototype.values;
com.cognitect.transit.types.TransitSet.prototype.clone = function() {
  var a = com.cognitect.transit.types.set();
  this.forEach(function(b) {
    a.add(b);
  });
  return a;
};
com.cognitect.transit.types.TransitSet.prototype.clone = com.cognitect.transit.types.TransitSet.prototype.clone;
com.cognitect.transit.types.TransitSet.prototype[com.cognitect.transit.types.ITERATOR] = function() {
  return this.values();
};
com.cognitect.transit.types.TransitSet.prototype.com$cognitect$transit$equals = function(a) {
  if (a instanceof com.cognitect.transit.types.TransitSet) {
    if (this.size === a.size) {
      return com.cognitect.transit.eq.equals(this.map, a.map);
    }
  } else {
    return !1;
  }
};
com.cognitect.transit.types.TransitSet.prototype.com$cognitect$transit$hashCode = function(a) {
  return com.cognitect.transit.eq.hashCode(this.map);
};
com.cognitect.transit.types.set = function(a) {
  a = a || [];
  for (var b = {}, c = [], d = 0, e = 0;e < a.length;e++) {
    var f = com.cognitect.transit.eq.hashCode(a[e]), g = b[f];
    if (null == g) {
      c.push(f), b[f] = [a[e], a[e]], d++;
    } else {
      for (var f = !0, h = 0;h < g.length;h += 2) {
        if (com.cognitect.transit.eq.equals(g[h], a[e])) {
          f = !1;
          break;
        }
      }
      f && (g.push(a[e]), g.push(a[e]), d++);
    }
  }
  return new com.cognitect.transit.types.TransitSet(new com.cognitect.transit.types.TransitMap(c, b, d));
};
com.cognitect.transit.types.isSet = function(a) {
  return a instanceof com.cognitect.transit.types.TransitSet;
};
com.cognitect.transit.types.quoted = function(a) {
  return com.cognitect.transit.types.taggedValue("'", a);
};
com.cognitect.transit.types.isQuoted = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "'" === a.tag;
};
com.cognitect.transit.types.list = function(a) {
  return com.cognitect.transit.types.taggedValue("list", a);
};
com.cognitect.transit.types.isList = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "list" === a.tag;
};
com.cognitect.transit.types.link = function(a) {
  return com.cognitect.transit.types.taggedValue("link", a);
};
com.cognitect.transit.types.isLink = function(a) {
  return a instanceof com.cognitect.transit.types.TaggedValue && "link" === a.tag;
};
com.cognitect.transit.types.specialDouble = function(a) {
  switch(a) {
    case "-INF":
      return -Infinity;
    case "INF":
      return Infinity;
    case "NaN":
      return NaN;
    default:
      throw Error("Invalid special double value " + a);;
  }
};
com.cognitect.transit.handlers = {};
com.cognitect.transit.handlers.ctorGuid = 0;
com.cognitect.transit.handlers.ctorGuidProperty = "transit$guid$" + com.cognitect.transit.util.randomUUID();
com.cognitect.transit.handlers.typeTag = function(a) {
  if (null == a) {
    return "null";
  }
  if (a === String) {
    return "string";
  }
  if (a === Boolean) {
    return "boolean";
  }
  if (a === Number) {
    return "number";
  }
  if (a === Array) {
    return "array";
  }
  if (a === Object) {
    return "map";
  }
  var b = a[com.cognitect.transit.handlers.ctorGuidProperty];
  null == b && ("undefined" != typeof Object.defineProperty ? (b = ++com.cognitect.transit.handlers.ctorGuid, Object.defineProperty(a, com.cognitect.transit.handlers.ctorGuidProperty, {value:b, enumerable:!1})) : a[com.cognitect.transit.handlers.ctorGuidProperty] = b = ++com.cognitect.transit.handlers.ctorGuid);
  return b;
};
com.cognitect.transit.handlers.constructor = function(a) {
  return null == a ? null : a.constructor;
};
com.cognitect.transit.handlers.padZeros = function(a, b) {
  for (var c = a.toString(), d = c.length;d < b;d++) {
    c = "0" + c;
  }
  return c;
};
com.cognitect.transit.handlers.stringableKeys = function(a) {
  a = com.cognitect.transit.util.objectKeys(a);
  for (var b = 0;b < a.length;b++) {
  }
  return !0;
};
com.cognitect.transit.handlers.NilHandler = function() {
};
com.cognitect.transit.handlers.NilHandler.prototype.tag = function(a) {
  return "_";
};
com.cognitect.transit.handlers.NilHandler.prototype.rep = function(a) {
  return null;
};
com.cognitect.transit.handlers.NilHandler.prototype.stringRep = function(a) {
  return "null";
};
com.cognitect.transit.handlers.StringHandler = function() {
};
com.cognitect.transit.handlers.StringHandler.prototype.tag = function(a) {
  return "s";
};
com.cognitect.transit.handlers.StringHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.StringHandler.prototype.stringRep = function(a) {
  return a;
};
com.cognitect.transit.handlers.NumberHandler = function() {
};
com.cognitect.transit.handlers.NumberHandler.prototype.tag = function(a) {
  return "i";
};
com.cognitect.transit.handlers.NumberHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.NumberHandler.prototype.stringRep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.IntegerHandler = function() {
};
com.cognitect.transit.handlers.IntegerHandler.prototype.tag = function(a) {
  return "i";
};
com.cognitect.transit.handlers.IntegerHandler.prototype.rep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.IntegerHandler.prototype.stringRep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.BooleanHandler = function() {
};
com.cognitect.transit.handlers.BooleanHandler.prototype.tag = function(a) {
  return "?";
};
com.cognitect.transit.handlers.BooleanHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.BooleanHandler.prototype.stringRep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.ArrayHandler = function() {
};
com.cognitect.transit.handlers.ArrayHandler.prototype.tag = function(a) {
  return "array";
};
com.cognitect.transit.handlers.ArrayHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.ArrayHandler.prototype.stringRep = function(a) {
  return null;
};
com.cognitect.transit.handlers.MapHandler = function() {
};
com.cognitect.transit.handlers.MapHandler.prototype.tag = function(a) {
  return "map";
};
com.cognitect.transit.handlers.MapHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.MapHandler.prototype.stringRep = function(a) {
  return null;
};
com.cognitect.transit.handlers.VerboseDateHandler = function() {
};
com.cognitect.transit.handlers.VerboseDateHandler.prototype.tag = function(a) {
  return "t";
};
com.cognitect.transit.handlers.VerboseDateHandler.prototype.rep = function(a) {
  return a.getUTCFullYear() + "-" + com.cognitect.transit.handlers.padZeros(a.getUTCMonth() + 1, 2) + "-" + com.cognitect.transit.handlers.padZeros(a.getUTCDate(), 2) + "T" + com.cognitect.transit.handlers.padZeros(a.getUTCHours(), 2) + ":" + com.cognitect.transit.handlers.padZeros(a.getUTCMinutes(), 2) + ":" + com.cognitect.transit.handlers.padZeros(a.getUTCSeconds(), 2) + "." + com.cognitect.transit.handlers.padZeros(a.getUTCMilliseconds(), 3) + "Z";
};
com.cognitect.transit.handlers.VerboseDateHandler.prototype.stringRep = function(a, b) {
  return b.rep(a);
};
com.cognitect.transit.handlers.DateHandler = function() {
};
com.cognitect.transit.handlers.DateHandler.prototype.tag = function(a) {
  return "m";
};
com.cognitect.transit.handlers.DateHandler.prototype.rep = function(a) {
  return a.valueOf();
};
com.cognitect.transit.handlers.DateHandler.prototype.stringRep = function(a) {
  return a.valueOf().toString();
};
com.cognitect.transit.handlers.DateHandler.prototype.getVerboseHandler = function(a) {
  return new com.cognitect.transit.handlers.VerboseDateHandler;
};
com.cognitect.transit.handlers.UUIDHandler = function() {
};
com.cognitect.transit.handlers.UUIDHandler.prototype.tag = function(a) {
  return "u";
};
com.cognitect.transit.handlers.UUIDHandler.prototype.rep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.UUIDHandler.prototype.stringRep = function(a) {
  return a.toString();
};
com.cognitect.transit.handlers.KeywordHandler = function() {
};
com.cognitect.transit.handlers.KeywordHandler.prototype.tag = function(a) {
  return ":";
};
com.cognitect.transit.handlers.KeywordHandler.prototype.rep = function(a) {
  return a._name;
};
com.cognitect.transit.handlers.KeywordHandler.prototype.stringRep = function(a, b) {
  return b.rep(a);
};
com.cognitect.transit.handlers.SymbolHandler = function() {
};
com.cognitect.transit.handlers.SymbolHandler.prototype.tag = function(a) {
  return "$";
};
com.cognitect.transit.handlers.SymbolHandler.prototype.rep = function(a) {
  return a._name;
};
com.cognitect.transit.handlers.SymbolHandler.prototype.stringRep = function(a, b) {
  return b.rep(a);
};
com.cognitect.transit.handlers.TaggedHandler = function() {
};
com.cognitect.transit.handlers.TaggedHandler.prototype.tag = function(a) {
  return a.tag;
};
com.cognitect.transit.handlers.TaggedHandler.prototype.rep = function(a) {
  return a.rep;
};
com.cognitect.transit.handlers.TaggedHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.TransitSetHandler = function() {
};
com.cognitect.transit.handlers.TransitSetHandler.prototype.tag = function(a) {
  return "set";
};
com.cognitect.transit.handlers.TransitSetHandler.prototype.rep = function(a) {
  var b = [];
  a.forEach(function(a, d) {
    b.push(a);
  });
  return com.cognitect.transit.types.taggedValue("array", b);
};
com.cognitect.transit.handlers.TransitSetHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.TransitArrayMapHandler = function() {
};
com.cognitect.transit.handlers.TransitArrayMapHandler.prototype.tag = function(a) {
  return "map";
};
com.cognitect.transit.handlers.TransitArrayMapHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.TransitArrayMapHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.TransitMapHandler = function() {
};
com.cognitect.transit.handlers.TransitMapHandler.prototype.tag = function(a) {
  return "map";
};
com.cognitect.transit.handlers.TransitMapHandler.prototype.rep = function(a) {
  return a;
};
com.cognitect.transit.handlers.TransitMapHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.BufferHandler = function() {
};
com.cognitect.transit.handlers.BufferHandler.prototype.tag = function(a) {
  return "b";
};
com.cognitect.transit.handlers.BufferHandler.prototype.rep = function(a) {
  return a.toString("base64");
};
com.cognitect.transit.handlers.BufferHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.Uint8ArrayHandler = function() {
};
com.cognitect.transit.handlers.Uint8ArrayHandler.prototype.tag = function(a) {
  return "b";
};
com.cognitect.transit.handlers.Uint8ArrayHandler.prototype.rep = function(a) {
  return com.cognitect.transit.util.Uint8ToBase64(a);
};
com.cognitect.transit.handlers.Uint8ArrayHandler.prototype.stringRep = function(a, b) {
  return null;
};
com.cognitect.transit.handlers.defaultHandlers = function(a) {
  a.set(null, new com.cognitect.transit.handlers.NilHandler);
  a.set(String, new com.cognitect.transit.handlers.StringHandler);
  a.set(Number, new com.cognitect.transit.handlers.NumberHandler);
  a.set(goog.math.Long, new com.cognitect.transit.handlers.IntegerHandler);
  a.set(Boolean, new com.cognitect.transit.handlers.BooleanHandler);
  a.set(Array, new com.cognitect.transit.handlers.ArrayHandler);
  a.set(Object, new com.cognitect.transit.handlers.MapHandler);
  a.set(Date, new com.cognitect.transit.handlers.DateHandler);
  a.set(com.cognitect.transit.types.UUID, new com.cognitect.transit.handlers.UUIDHandler);
  a.set(com.cognitect.transit.types.Keyword, new com.cognitect.transit.handlers.KeywordHandler);
  a.set(com.cognitect.transit.types.Symbol, new com.cognitect.transit.handlers.SymbolHandler);
  a.set(com.cognitect.transit.types.TaggedValue, new com.cognitect.transit.handlers.TaggedHandler);
  a.set(com.cognitect.transit.types.TransitSet, new com.cognitect.transit.handlers.TransitSetHandler);
  a.set(com.cognitect.transit.types.TransitArrayMap, new com.cognitect.transit.handlers.TransitArrayMapHandler);
  a.set(com.cognitect.transit.types.TransitMap, new com.cognitect.transit.handlers.TransitMapHandler);
  "undefined" != typeof Buffer && a.set(Buffer, new com.cognitect.transit.handlers.BufferHandler);
  "undefined" != typeof Uint8Array && a.set(Uint8Array, new com.cognitect.transit.handlers.Uint8ArrayHandler);
  return a;
};
com.cognitect.transit.handlers.Handlers = function() {
  this.handlers = {};
  com.cognitect.transit.handlers.defaultHandlers(this);
};
com.cognitect.transit.handlers.Handlers.prototype.get = function(a) {
  var b = null, b = "string" === typeof a ? this.handlers[a] : this.handlers[com.cognitect.transit.handlers.typeTag(a)];
  return null != b ? b : this.handlers["default"];
};
com.cognitect.transit.handlers.Handlers.prototype.get = com.cognitect.transit.handlers.Handlers.prototype.get;
com.cognitect.transit.handlers.validTag = function(a) {
  switch(a) {
    case "null":
    ;
    case "string":
    ;
    case "boolean":
    ;
    case "number":
    ;
    case "array":
    ;
    case "map":
      return !1;
  }
  return !0;
};
com.cognitect.transit.handlers.Handlers.prototype.set = function(a, b) {
  "string" === typeof a && com.cognitect.transit.handlers.validTag(a) ? this.handlers[a] = b : this.handlers[com.cognitect.transit.handlers.typeTag(a)] = b;
};
com.cognitect.transit.impl = {};
com.cognitect.transit.impl.decoder = {};
com.cognitect.transit.impl.decoder.Tag = function(a) {
  this.str = a;
};
com.cognitect.transit.impl.decoder.tag = function(a) {
  return new com.cognitect.transit.impl.decoder.Tag(a);
};
com.cognitect.transit.impl.decoder.isTag = function(a) {
  return a && a instanceof com.cognitect.transit.impl.decoder.Tag;
};
com.cognitect.transit.impl.decoder.isGroundHandler = function(a) {
  switch(a) {
    case "_":
    ;
    case "s":
    ;
    case "?":
    ;
    case "i":
    ;
    case "d":
    ;
    case "b":
    ;
    case "'":
    ;
    case "array":
    ;
    case "map":
      return !0;
  }
  return !1;
};
com.cognitect.transit.impl.decoder.Decoder = function(a) {
  this.options = a || {};
  this.handlers = {};
  for (var b in this.defaults.handlers) {
    this.handlers[b] = this.defaults.handlers[b];
  }
  for (b in this.options.handlers) {
    if (com.cognitect.transit.impl.decoder.isGroundHandler(b)) {
      throw Error('Cannot override handler for ground type "' + b + '"');
    }
    this.handlers[b] = this.options.handlers[b];
  }
  this.preferStrings = null != this.options.preferStrings ? this.options.preferStrings : this.defaults.preferStrings;
  this.preferBuffers = null != this.options.preferBuffers ? this.options.preferBuffers : this.defaults.preferBuffers;
  this.defaultHandler = this.options.defaultHandler || this.defaults.defaultHandler;
  this.mapBuilder = this.options.mapBuilder;
  this.arrayBuilder = this.options.arrayBuilder;
};
com.cognitect.transit.impl.decoder.Decoder.prototype.defaults = {handlers:{_:function(a, b) {
  return com.cognitect.transit.types.nullValue();
}, "?":function(a, b) {
  return com.cognitect.transit.types.boolValue(a);
}, b:function(a, b) {
  return com.cognitect.transit.types.binary(a, b);
}, i:function(a, b) {
  return com.cognitect.transit.types.intValue(a);
}, n:function(a, b) {
  return com.cognitect.transit.types.bigInteger(a);
}, d:function(a, b) {
  return com.cognitect.transit.types.floatValue(a);
}, f:function(a, b) {
  return com.cognitect.transit.types.bigDecimalValue(a);
}, c:function(a, b) {
  return com.cognitect.transit.types.charValue(a);
}, ":":function(a, b) {
  return com.cognitect.transit.types.keyword(a);
}, $:function(a, b) {
  return com.cognitect.transit.types.symbol(a);
}, r:function(a, b) {
  return com.cognitect.transit.types.uri(a);
}, z:function(a, b) {
  return com.cognitect.transit.types.specialDouble(a);
}, "'":function(a, b) {
  return a;
}, m:function(a, b) {
  return com.cognitect.transit.types.date(a);
}, t:function(a, b) {
  return com.cognitect.transit.types.verboseDate(a);
}, u:function(a, b) {
  return com.cognitect.transit.types.uuid(a);
}, set:function(a, b) {
  return com.cognitect.transit.types.set(a);
}, list:function(a, b) {
  return com.cognitect.transit.types.list(a);
}, link:function(a, b) {
  return com.cognitect.transit.types.link(a);
}, cmap:function(a, b) {
  return com.cognitect.transit.types.map(a, !1);
}}, defaultHandler:function(a, b) {
  return com.cognitect.transit.types.taggedValue(a, b);
}, preferStrings:!0, preferBuffers:!0};
com.cognitect.transit.impl.decoder.Decoder.prototype.decode = function(a, b, c, d) {
  if (null == a) {
    return null;
  }
  switch(typeof a) {
    case "string":
      return this.decodeString(a, b, c, d);
    case "object":
      return com.cognitect.transit.util.isArray(a) ? "^ " === a[0] ? this.decodeArrayHash(a, b, c, d) : this.decodeArray(a, b, c, d) : this.decodeHash(a, b, c, d);
  }
  return a;
};
com.cognitect.transit.impl.decoder.Decoder.prototype.decode = com.cognitect.transit.impl.decoder.Decoder.prototype.decode;
com.cognitect.transit.impl.decoder.Decoder.prototype.decodeString = function(a, b, c, d) {
  return com.cognitect.transit.caching.isCacheable(a, c) ? (a = this.parseString(a, b, !1), b && b.write(a, c), a) : com.cognitect.transit.caching.isCacheCode(a) ? b.read(a, c) : this.parseString(a, b, c);
};
com.cognitect.transit.impl.decoder.Decoder.prototype.decodeHash = function(a, b, c, d) {
  c = com.cognitect.transit.util.objectKeys(a);
  var e = c[0];
  d = 1 == c.length ? this.decode(e, b, !1, !1) : null;
  if (com.cognitect.transit.impl.decoder.isTag(d)) {
    return a = a[e], c = this.handlers[d.str], null != c ? c(this.decode(a, b, !1, !0), this) : com.cognitect.transit.types.taggedValue(d.str, this.decode(a, b, !1, !1));
  }
  if (this.mapBuilder) {
    if (c.length < 2 * com.cognitect.transit.types.SMALL_ARRAY_MAP_THRESHOLD && this.mapBuilder.fromArray) {
      var f = [];
      for (d = 0;d < c.length;d++) {
        e = c[d], f.push(this.decode(e, b, !0, !1)), f.push(this.decode(a[e], b, !1, !1));
      }
      return this.mapBuilder.fromArray(f, a);
    }
    f = this.mapBuilder.init(a);
    for (d = 0;d < c.length;d++) {
      e = c[d], f = this.mapBuilder.add(f, this.decode(e, b, !0, !1), this.decode(a[e], b, !1, !1), a);
    }
    return this.mapBuilder.finalize(f, a);
  }
  f = [];
  for (d = 0;d < c.length;d++) {
    e = c[d], f.push(this.decode(e, b, !0, !1)), f.push(this.decode(a[e], b, !1, !1));
  }
  return com.cognitect.transit.types.map(f, !1);
};
com.cognitect.transit.impl.decoder.Decoder.prototype.decodeArrayHash = function(a, b, c, d) {
  if (this.mapBuilder) {
    if (a.length < 2 * com.cognitect.transit.types.SMALL_ARRAY_MAP_THRESHOLD + 1 && this.mapBuilder.fromArray) {
      d = [];
      for (c = 1;c < a.length;c += 2) {
        d.push(this.decode(a[c], b, !0, !1)), d.push(this.decode(a[c + 1], b, !1, !1));
      }
      return this.mapBuilder.fromArray(d, a);
    }
    d = this.mapBuilder.init(a);
    for (c = 1;c < a.length;c += 2) {
      d = this.mapBuilder.add(d, this.decode(a[c], b, !0, !1), this.decode(a[c + 1], b, !1, !1), a);
    }
    return this.mapBuilder.finalize(d, a);
  }
  d = [];
  for (c = 1;c < a.length;c += 2) {
    d.push(this.decode(a[c], b, !0, !1)), d.push(this.decode(a[c + 1], b, !1, !1));
  }
  return com.cognitect.transit.types.map(d, !1);
};
com.cognitect.transit.impl.decoder.Decoder.prototype.decodeArray = function(a, b, c, d) {
  if (d) {
    var e = [];
    for (d = 0;d < a.length;d++) {
      e.push(this.decode(a[d], b, c, !1));
    }
    return e;
  }
  e = b && b.idx;
  if (2 === a.length && "string" === typeof a[0] && (d = this.decode(a[0], b, !1, !1), com.cognitect.transit.impl.decoder.isTag(d))) {
    return a = a[1], e = this.handlers[d.str], null != e ? e = e(this.decode(a, b, c, !0), this) : com.cognitect.transit.types.taggedValue(d.str, this.decode(a, b, c, !1));
  }
  b && e != b.idx && (b.idx = e);
  if (this.arrayBuilder) {
    if (32 >= a.length && this.arrayBuilder.fromArray) {
      e = [];
      for (d = 0;d < a.length;d++) {
        e.push(this.decode(a[d], b, c, !1));
      }
      return this.arrayBuilder.fromArray(e, a);
    }
    e = this.arrayBuilder.init(a);
    for (d = 0;d < a.length;d++) {
      e = this.arrayBuilder.add(e, this.decode(a[d], b, c, !1), a);
    }
    return this.arrayBuilder.finalize(e, a);
  }
  e = [];
  for (d = 0;d < a.length;d++) {
    e.push(this.decode(a[d], b, c, !1));
  }
  return e;
};
com.cognitect.transit.impl.decoder.Decoder.prototype.parseString = function(a, b, c) {
  if (a.charAt(0) === com.cognitect.transit.delimiters.ESC) {
    b = a.charAt(1);
    if (b === com.cognitect.transit.delimiters.ESC || b === com.cognitect.transit.delimiters.SUB || b === com.cognitect.transit.delimiters.RES) {
      return a.substring(1);
    }
    if (b === com.cognitect.transit.delimiters.TAG) {
      return com.cognitect.transit.impl.decoder.tag(a.substring(2));
    }
    c = this.handlers[b];
    return null == c ? this.defaultHandler(b, a.substring(2)) : c(a.substring(2), this);
  }
  return a;
};
com.cognitect.transit.impl.decoder.decoder = function(a) {
  return new com.cognitect.transit.impl.decoder.Decoder(a);
};
com.cognitect.transit.impl.reader = {};
com.cognitect.transit.impl.reader.JSONUnmarshaller = function(a) {
  this.decoder = new com.cognitect.transit.impl.decoder.Decoder(a);
};
com.cognitect.transit.impl.reader.JSONUnmarshaller.prototype.unmarshal = function(a, b) {
  return this.decoder.decode(JSON.parse(a), b);
};
com.cognitect.transit.impl.reader.Reader = function(a, b) {
  this.unmarshaller = a;
  this.options = b || {};
  this.cache = this.options.cache ? this.options.cache : new com.cognitect.transit.caching.ReadCache;
};
com.cognitect.transit.impl.reader.Reader.prototype.read = function(a) {
  a = this.unmarshaller.unmarshal(a, this.cache);
  this.cache.clear();
  return a;
};
com.cognitect.transit.impl.reader.Reader.prototype.read = com.cognitect.transit.impl.reader.Reader.prototype.read;
com.cognitect.transit.impl.writer = {};
com.cognitect.transit.impl.writer.escape = function(a) {
  if (0 < a.length) {
    var b = a.charAt(0);
    return b === com.cognitect.transit.delimiters.ESC || b === com.cognitect.transit.delimiters.SUB || b === com.cognitect.transit.delimiters.RES ? com.cognitect.transit.delimiters.ESC + a : a;
  }
  return a;
};
com.cognitect.transit.impl.writer.JSONMarshaller = function(a) {
  this.opts = a || {};
  this.preferStrings = null != this.opts.preferStrings ? this.opts.preferStrings : !0;
  this.objectBuilder = this.opts.objectBuilder || null;
  this.handlers = new com.cognitect.transit.handlers.Handlers;
  if (a = this.opts.handlers) {
    if (com.cognitect.transit.util.isArray(a) || !a.forEach) {
      throw Error('transit writer "handlers" option must be a map');
    }
    var b = this;
    a.forEach(function(a, d) {
      if (void 0 !== d) {
        b.handlers.set(d, a);
      } else {
        throw Error("Cannot create handler for JavaScript undefined");
      }
    });
  }
  this.handlerForForeign = this.opts.handlerForForeign;
  this.unpack = this.opts.unpack || function(a) {
    return com.cognitect.transit.types.isArrayMap(a) && null === a.backingMap ? a._entries : !1;
  };
  this.verbose = this.opts && this.opts.verbose || !1;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.handler = function(a) {
  var b = this.handlers.get(com.cognitect.transit.handlers.constructor(a));
  return null != b ? b : (a = a && a.transitTag) ? this.handlers.get(a) : null;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.registerHandler = function(a, b) {
  this.handlers.set(a, b);
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitNil = function(a, b) {
  return a ? this.emitString(com.cognitect.transit.delimiters.ESC, "_", "", a, b) : null;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitString = function(a, b, c, d, e) {
  a = a + b + c;
  return e ? e.write(a, d) : a;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitBoolean = function(a, b, c) {
  return b ? this.emitString(com.cognitect.transit.delimiters.ESC, "?", a.toString()[0], b, c) : a;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitInteger = function(a, b, c) {
  return Infinity === a ? this.emitString(com.cognitect.transit.delimiters.ESC, "z", "INF", b, c) : -Infinity === a ? this.emitString(com.cognitect.transit.delimiters.ESC, "z", "-INF", b, c) : isNaN(a) ? this.emitString(com.cognitect.transit.delimiters.ESC, "z", "NaN", b, c) : b || "string" === typeof a || a instanceof goog.math.Long ? this.emitString(com.cognitect.transit.delimiters.ESC, "i", a.toString(), b, c) : a;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitDouble = function(a, b, c) {
  return b ? this.emitString(a.ESC, "d", a, b, c) : a;
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitBinary = function(a, b, c) {
  return this.emitString(com.cognitect.transit.delimiters.ESC, "b", a, b, c);
};
com.cognitect.transit.impl.writer.JSONMarshaller.prototype.emitQuoted = function(a, b, c) {
  if (a.verbose) {
    a = {};
    var d = this.emitString(com.cognitect.transit.delimiters.ESC_TAG, "'", "", !0, c);
    a[d] = com.cognitect.transit.impl.writer.marshal(this, b, !1, c);
    return a;
  }
  return [this.emitString(com.cognitect.transit.delimiters.ESC_TAG, "'", "", !0, c), com.cognitect.transit.impl.writer.marshal(this, b, !1, c)];
};
com.cognitect.transit.impl.writer.emitObjects = function(a, b, c) {
  var d = [];
  if (com.cognitect.transit.util.isArray(b)) {
    for (var e = 0;e < b.length;e++) {
      d.push(com.cognitect.transit.impl.writer.marshal(a, b[e], !1, c));
    }
  } else {
    b.forEach(function(b, e) {
      d.push(com.cognitect.transit.impl.writer.marshal(a, b, !1, c));
    });
  }
  return d;
};
com.cognitect.transit.impl.writer.emitArray = function(a, b, c, d) {
  return com.cognitect.transit.impl.writer.emitObjects(a, b, d);
};
com.cognitect.transit.impl.writer.isStringableKey = function(a, b) {
  if ("string" !== typeof b) {
    var c = a.handler(b);
    return c && 1 === c.tag(b).length;
  }
  return !0;
};
com.cognitect.transit.impl.writer.stringableKeys = function(a, b) {
  var c = a.unpack(b), d = !0;
  if (c) {
    for (var e = 0;e < c.length && (d = com.cognitect.transit.impl.writer.isStringableKey(a, c[e]), d);e += 2) {
    }
    return d;
  }
  if (b.keys && (c = b.keys(), e = null, c.next)) {
    for (e = c.next();!e.done;) {
      d = com.cognitect.transit.impl.writer.isStringableKey(a, e.value);
      if (!d) {
        break;
      }
      e = c.next();
    }
    return d;
  }
  if (b.forEach) {
    return b.forEach(function(b, c) {
      d = d && com.cognitect.transit.impl.writer.isStringableKey(a, c);
    }), d;
  }
  throw Error("Cannot walk keys of object type " + com.cognitect.transit.handlers.constructor(b).name);
};
com.cognitect.transit.impl.writer.isForeignObject = function(a) {
  if (a.constructor.transit$isObject) {
    return !0;
  }
  var b = a.constructor.toString(), b = b.substr(9), b = b.substr(0, b.indexOf("("));
  isObject = "Object" == b;
  "undefined" != typeof Object.defineProperty ? Object.defineProperty(a.constructor, "transit$isObject", {value:isObject, enumerable:!1}) : a.constructor.transit$isObject = isObject;
  return isObject;
};
com.cognitect.transit.impl.writer.emitMap = function(a, b, c, d) {
  var e = null, f = null, g = null, e = null;
  c = 0;
  if (b.constructor === Object || null != b.forEach || a.handlerForForeign && com.cognitect.transit.impl.writer.isForeignObject(b)) {
    if (a.verbose) {
      if (null != b.forEach) {
        if (com.cognitect.transit.impl.writer.stringableKeys(a, b)) {
          var h = {};
          b.forEach(function(b, c) {
            h[com.cognitect.transit.impl.writer.marshal(a, c, !0, !1)] = com.cognitect.transit.impl.writer.marshal(a, b, !1, d);
          });
        } else {
          e = a.unpack(b);
          f = [];
          g = a.emitString(com.cognitect.transit.delimiters.ESC_TAG, "cmap", "", !0, d);
          if (e) {
            for (;c < e.length;c += 2) {
              f.push(com.cognitect.transit.impl.writer.marshal(a, e[c], !1, !1)), f.push(com.cognitect.transit.impl.writer.marshal(a, e[c + 1], !1, d));
            }
          } else {
            b.forEach(function(b, c) {
              f.push(com.cognitect.transit.impl.writer.marshal(a, c, !1, !1));
              f.push(com.cognitect.transit.impl.writer.marshal(a, b, !1, d));
            });
          }
          h = {};
          h[g] = f;
        }
      } else {
        for (e = com.cognitect.transit.util.objectKeys(b), h = {};c < e.length;c++) {
          h[com.cognitect.transit.impl.writer.marshal(a, e[c], !0, !1)] = com.cognitect.transit.impl.writer.marshal(a, b[e[c]], !1, d);
        }
      }
      return h;
    }
    if (null != b.forEach) {
      if (com.cognitect.transit.impl.writer.stringableKeys(a, b)) {
        e = a.unpack(b);
        h = ["^ "];
        if (e) {
          for (;c < e.length;c += 2) {
            h.push(com.cognitect.transit.impl.writer.marshal(a, e[c], !0, d)), h.push(com.cognitect.transit.impl.writer.marshal(a, e[c + 1], !1, d));
          }
        } else {
          b.forEach(function(b, c) {
            h.push(com.cognitect.transit.impl.writer.marshal(a, c, !0, d));
            h.push(com.cognitect.transit.impl.writer.marshal(a, b, !1, d));
          });
        }
        return h;
      }
      e = a.unpack(b);
      f = [];
      g = a.emitString(com.cognitect.transit.delimiters.ESC_TAG, "cmap", "", !0, d);
      if (e) {
        for (;c < e.length;c += 2) {
          f.push(com.cognitect.transit.impl.writer.marshal(a, e[c], !1, d)), f.push(com.cognitect.transit.impl.writer.marshal(a, e[c + 1], !1, d));
        }
      } else {
        b.forEach(function(b, c) {
          f.push(com.cognitect.transit.impl.writer.marshal(a, c, !1, d));
          f.push(com.cognitect.transit.impl.writer.marshal(a, b, !1, d));
        });
      }
      return [g, f];
    }
    h = ["^ "];
    for (e = com.cognitect.transit.util.objectKeys(b);c < e.length;c++) {
      h.push(com.cognitect.transit.impl.writer.marshal(a, e[c], !0, d)), h.push(com.cognitect.transit.impl.writer.marshal(a, b[e[c]], !1, d));
    }
    return h;
  }
  if (null != a.objectBuilder) {
    return a.objectBuilder(b, function(b) {
      return com.cognitect.transit.impl.writer.marshal(a, b, !0, d);
    }, function(b) {
      return com.cognitect.transit.impl.writer.marshal(a, b, !1, d);
    });
  }
  c = com.cognitect.transit.handlers.constructor(b).name;
  e = Error("Cannot write " + c);
  e.data = {obj:b, type:c};
  throw e;
};
com.cognitect.transit.impl.writer.emitTaggedMap = function(a, b, c, d, e) {
  return a.verbose ? (d = {}, d[a.emitString(com.cognitect.transit.delimiters.ESC_TAG, b, "", !0, e)] = com.cognitect.transit.impl.writer.marshal(a, c, !1, e), d) : [a.emitString(com.cognitect.transit.delimiters.ESC_TAG, b, "", !0, e), com.cognitect.transit.impl.writer.marshal(a, c, !1, e)];
};
com.cognitect.transit.impl.writer.emitEncoded = function(a, b, c, d, e, f, g) {
  if (1 === c.length) {
    if ("string" === typeof d) {
      return a.emitString(com.cognitect.transit.delimiters.ESC, c, d, f, g);
    }
    if (f || a.preferStrings) {
      (d = a.verbose && b.getVerboseHandler()) ? (c = d.tag(e), d = d.stringRep(e, d)) : d = b.stringRep(e, b);
      if (null !== d) {
        return a.emitString(com.cognitect.transit.delimiters.ESC, c, d, f, g);
      }
      a = Error('Tag "' + c + '" cannot be encoded as string');
      a.data = {tag:c, rep:d, obj:e};
      throw a;
    }
  }
  return com.cognitect.transit.impl.writer.emitTaggedMap(a, c, d, f, g);
};
com.cognitect.transit.impl.writer.marshal = function(a, b, c, d) {
  var e = a.handler(b) || (a.handlerForForeign ? a.handlerForForeign(b, a.handlers) : null), f = e ? e.tag(b) : null, g = e ? e.rep(b) : null;
  if (null != e && null != f) {
    switch(f) {
      case "_":
        return a.emitNil(c, d);
      case "s":
        return a.emitString("", "", com.cognitect.transit.impl.writer.escape(g), c, d);
      case "?":
        return a.emitBoolean(g, c, d);
      case "i":
        return a.emitInteger(g, c, d);
      case "d":
        return a.emitDouble(g, c, d);
      case "b":
        return a.emitBinary(g, c, d);
      case "'":
        return a.emitQuoted(a, g, d);
      case "array":
        return com.cognitect.transit.impl.writer.emitArray(a, g, c, d);
      case "map":
        return com.cognitect.transit.impl.writer.emitMap(a, g, c, d);
      default:
        return com.cognitect.transit.impl.writer.emitEncoded(a, e, f, g, b, c, d);
    }
  } else {
    throw a = com.cognitect.transit.handlers.constructor(b).name, c = Error("Cannot write " + a), c.data = {obj:b, type:a}, c;
  }
};
com.cognitect.transit.impl.writer.maybeQuoted = function(a, b) {
  var c = a.handler(b) || (a.handlerForForeign ? a.handlerForForeign(b, a.handlers) : null);
  if (null != c) {
    return 1 === c.tag(b).length ? com.cognitect.transit.types.quoted(b) : b;
  }
  var c = com.cognitect.transit.handlers.constructor(b).name, d = Error("Cannot write " + c);
  d.data = {obj:b, type:c};
  throw d;
};
com.cognitect.transit.impl.writer.marshalTop = function(a, b, c, d) {
  return JSON.stringify(com.cognitect.transit.impl.writer.marshal(a, com.cognitect.transit.impl.writer.maybeQuoted(a, b), c, d));
};
com.cognitect.transit.impl.writer.Writer = function(a, b) {
  this._marshaller = a;
  this.options = b || {};
  this.cache = !1 === this.options.cache ? null : this.options.cache ? this.options.cache : new com.cognitect.transit.caching.WriteCache;
};
com.cognitect.transit.impl.writer.Writer.prototype.marshaller = function() {
  return this._marshaller;
};
com.cognitect.transit.impl.writer.Writer.prototype.marshaller = com.cognitect.transit.impl.writer.Writer.prototype.marshaller;
com.cognitect.transit.impl.writer.Writer.prototype.write = function(a, b) {
  var c = null, c = b || {}, d = c.asMapKey || !1, e = this._marshaller.verbose ? !1 : this.cache, c = !1 === c.marshalTop ? com.cognitect.transit.impl.writer.marshal(this._marshaller, a, d, e) : com.cognitect.transit.impl.writer.marshalTop(this._marshaller, a, d, e);
  null != this.cache && this.cache.clear();
  return c;
};
com.cognitect.transit.impl.writer.Writer.prototype.write = com.cognitect.transit.impl.writer.Writer.prototype.write;
com.cognitect.transit.impl.writer.Writer.prototype.register = function(a, b) {
  this._marshaller.registerHandler(a, b);
};
com.cognitect.transit.impl.writer.Writer.prototype.register = com.cognitect.transit.impl.writer.Writer.prototype.register;
var TRANSIT_DEV = !0, TRANSIT_NODE_TARGET = !0, TRANSIT_BROWSER_TARGET = !1, TRANSIT_BROWSER_AMD_TARGET = !1;
com.cognitect.transit.reader = function(a, b) {
  if ("json" === a || "json-verbose" === a || null == a) {
    var c = new com.cognitect.transit.impl.reader.JSONUnmarshaller(b);
    return new com.cognitect.transit.impl.reader.Reader(c, b);
  }
  throw Error("Cannot create reader of type " + a);
};
com.cognitect.transit.writer = function(a, b) {
  if ("json" === a || "json-verbose" === a || null == a) {
    "json-verbose" === a && (null == b && (b = {}), b.verbose = !0);
    var c = new com.cognitect.transit.impl.writer.JSONMarshaller(b);
    return new com.cognitect.transit.impl.writer.Writer(c, b);
  }
  c = Error('Type must be "json"');
  c.data = {type:a};
  throw c;
};
com.cognitect.transit.makeWriteHandler = function(a) {
  var b = function() {
  };
  b.prototype.tag = a.tag;
  b.prototype.rep = a.rep;
  b.prototype.stringRep = a.stringRep;
  b.prototype.getVerboseHandler = a.getVerboseHandler;
  return new b;
};
com.cognitect.transit.makeBuilder = function(a) {
  var b = function() {
  };
  b.prototype.init = a.init;
  b.prototype.add = a.add;
  b.prototype.finalize = a.finalize;
  b.prototype.fromArray = a.fromArray;
  return new b;
};
com.cognitect.transit.date = com.cognitect.transit.types.date;
com.cognitect.transit.integer = com.cognitect.transit.types.intValue;
com.cognitect.transit.isInteger = com.cognitect.transit.types.isInteger;
com.cognitect.transit.uuid = com.cognitect.transit.types.uuid;
com.cognitect.transit.isUUID = com.cognitect.transit.types.isUUID;
com.cognitect.transit.bigInt = com.cognitect.transit.types.bigInteger;
com.cognitect.transit.isBigInt = com.cognitect.transit.types.isBigInteger;
com.cognitect.transit.bigDec = com.cognitect.transit.types.bigDecimalValue;
com.cognitect.transit.isBigDec = com.cognitect.transit.types.isBigDecimal;
com.cognitect.transit.keyword = com.cognitect.transit.types.keyword;
com.cognitect.transit.isKeyword = com.cognitect.transit.types.isKeyword;
com.cognitect.transit.symbol = com.cognitect.transit.types.symbol;
com.cognitect.transit.isSymbol = com.cognitect.transit.types.isSymbol;
com.cognitect.transit.binary = com.cognitect.transit.types.binary;
com.cognitect.transit.isBinary = com.cognitect.transit.types.isBinary;
com.cognitect.transit.uri = com.cognitect.transit.types.uri;
com.cognitect.transit.isURI = com.cognitect.transit.types.isURI;
com.cognitect.transit.map = com.cognitect.transit.types.map;
com.cognitect.transit.isMap = com.cognitect.transit.types.isMap;
com.cognitect.transit.set = com.cognitect.transit.types.set;
com.cognitect.transit.isSet = com.cognitect.transit.types.isSet;
com.cognitect.transit.list = com.cognitect.transit.types.list;
com.cognitect.transit.isList = com.cognitect.transit.types.isList;
com.cognitect.transit.quoted = com.cognitect.transit.types.quoted;
com.cognitect.transit.isQuoted = com.cognitect.transit.types.isQuoted;
com.cognitect.transit.tagged = com.cognitect.transit.types.taggedValue;
com.cognitect.transit.isTaggedValue = com.cognitect.transit.types.isTaggedValue;
com.cognitect.transit.link = com.cognitect.transit.types.link;
com.cognitect.transit.isLink = com.cognitect.transit.types.isLink;
com.cognitect.transit.hash = com.cognitect.transit.eq.hashCode;
com.cognitect.transit.hashMapLike = com.cognitect.transit.eq.hashMapLike;
com.cognitect.transit.hashArrayLike = com.cognitect.transit.eq.hashArrayLike;
com.cognitect.transit.equals = com.cognitect.transit.eq.equals;
com.cognitect.transit.extendToEQ = com.cognitect.transit.eq.extendToEQ;
com.cognitect.transit.mapToObject = function(a) {
  var b = {};
  a.forEach(function(a, d) {
    if ("string" !== typeof d) {
      throw Error("Cannot convert map with non-string keys");
    }
    b[d] = a;
  });
  return b;
};
com.cognitect.transit.objectToMap = function(a) {
  var b = com.cognitect.transit.map(), c;
  for (c in a) {
    a.hasOwnProperty(c) && b.set(c, a[c]);
  }
  return b;
};
com.cognitect.transit.decoder = com.cognitect.transit.impl.decoder.decoder;
com.cognitect.transit.readCache = com.cognitect.transit.caching.readCache;
com.cognitect.transit.writeCache = com.cognitect.transit.caching.writeCache;
com.cognitect.transit.UUIDfromString = com.cognitect.transit.types.UUIDfromString;
com.cognitect.transit.randomUUID = com.cognitect.transit.util.randomUUID;
com.cognitect.transit.stringableKeys = com.cognitect.transit.impl.writer.stringableKeys;
TRANSIT_BROWSER_TARGET && (goog.exportSymbol("transit.reader", com.cognitect.transit.reader), goog.exportSymbol("transit.writer", com.cognitect.transit.writer), goog.exportSymbol("transit.makeBuilder", com.cognitect.transit.makeBuilder), goog.exportSymbol("transit.makeWriteHandler", com.cognitect.transit.makeWriteHandler), goog.exportSymbol("transit.date", com.cognitect.transit.types.date), goog.exportSymbol("transit.integer", com.cognitect.transit.types.intValue), goog.exportSymbol("transit.isInteger", 
com.cognitect.transit.types.isInteger), goog.exportSymbol("transit.uuid", com.cognitect.transit.types.uuid), goog.exportSymbol("transit.isUUID", com.cognitect.transit.types.isUUID), goog.exportSymbol("transit.bigInt", com.cognitect.transit.types.bigInteger), goog.exportSymbol("transit.isBigInt", com.cognitect.transit.types.isBigInteger), goog.exportSymbol("transit.bigDec", com.cognitect.transit.types.bigDecimalValue), goog.exportSymbol("transit.isBigDec", com.cognitect.transit.types.isBigDecimal), 
goog.exportSymbol("transit.keyword", com.cognitect.transit.types.keyword), goog.exportSymbol("transit.isKeyword", com.cognitect.transit.types.isKeyword), goog.exportSymbol("transit.symbol", com.cognitect.transit.types.symbol), goog.exportSymbol("transit.isSymbol", com.cognitect.transit.types.isSymbol), goog.exportSymbol("transit.binary", com.cognitect.transit.types.binary), goog.exportSymbol("transit.isBinary", com.cognitect.transit.types.isBinary), goog.exportSymbol("transit.uri", com.cognitect.transit.types.uri), 
goog.exportSymbol("transit.isURI", com.cognitect.transit.types.isURI), goog.exportSymbol("transit.map", com.cognitect.transit.types.map), goog.exportSymbol("transit.isMap", com.cognitect.transit.types.isMap), goog.exportSymbol("transit.set", com.cognitect.transit.types.set), goog.exportSymbol("transit.isSet", com.cognitect.transit.types.isSet), goog.exportSymbol("transit.list", com.cognitect.transit.types.list), goog.exportSymbol("transit.isList", com.cognitect.transit.types.isList), goog.exportSymbol("transit.quoted", 
com.cognitect.transit.types.quoted), goog.exportSymbol("transit.isQuoted", com.cognitect.transit.types.isQuoted), goog.exportSymbol("transit.tagged", com.cognitect.transit.types.taggedValue), goog.exportSymbol("transit.isTaggedValue", com.cognitect.transit.types.isTaggedValue), goog.exportSymbol("transit.link", com.cognitect.transit.types.link), goog.exportSymbol("transit.isLink", com.cognitect.transit.types.isLink), goog.exportSymbol("transit.hash", com.cognitect.transit.eq.hashCode), goog.exportSymbol("transit.hashMapLike", 
com.cognitect.transit.eq.hashMapLike), goog.exportSymbol("transit.hashArrayLike", com.cognitect.transit.eq.hashArrayLike), goog.exportSymbol("transit.equals", com.cognitect.transit.eq.equals), goog.exportSymbol("transit.extendToEQ", com.cognitect.transit.eq.extendToEQ), goog.exportSymbol("transit.mapToObject", com.cognitect.transit.mapToObject), goog.exportSymbol("transit.objectToMap", com.cognitect.transit.objectToMap), goog.exportSymbol("transit.decoder", com.cognitect.transit.impl.decoder.decoder), 
goog.exportSymbol("transit.UUIDfromString", com.cognitect.transit.types.UUIDfromString), goog.exportSymbol("transit.randomUUID", com.cognitect.transit.util.randomUUID), goog.exportSymbol("transit.stringableKeys", com.cognitect.transit.impl.writer.stringableKeys), goog.exportSymbol("transit.readCache", com.cognitect.transit.caching.readCache), goog.exportSymbol("transit.writeCache", com.cognitect.transit.caching.writeCache));
TRANSIT_NODE_TARGET && (module.exports = {reader:com.cognitect.transit.reader, writer:com.cognitect.transit.writer, makeBuilder:com.cognitect.transit.makeBuilder, makeWriteHandler:com.cognitect.transit.makeWriteHandler, date:com.cognitect.transit.types.date, integer:com.cognitect.transit.types.intValue, isInteger:com.cognitect.transit.types.isInteger, uuid:com.cognitect.transit.types.uuid, isUUID:com.cognitect.transit.types.isUUID, bigInt:com.cognitect.transit.types.bigInteger, isBigInt:com.cognitect.transit.types.isBigInteger, 
bigDec:com.cognitect.transit.types.bigDecimalValue, isBigDec:com.cognitect.transit.types.isBigDecimal, keyword:com.cognitect.transit.types.keyword, isKeyword:com.cognitect.transit.types.isKeyword, symbol:com.cognitect.transit.types.symbol, isSymbol:com.cognitect.transit.types.isSymbol, binary:com.cognitect.transit.types.binary, isBinary:com.cognitect.transit.types.isBinary, uri:com.cognitect.transit.types.uri, isURI:com.cognitect.transit.types.isURI, map:com.cognitect.transit.types.map, isMap:com.cognitect.transit.types.isMap, 
set:com.cognitect.transit.types.set, isSet:com.cognitect.transit.types.isSet, list:com.cognitect.transit.types.list, isList:com.cognitect.transit.types.isList, quoted:com.cognitect.transit.types.quoted, isQuoted:com.cognitect.transit.types.isQuoted, tagged:com.cognitect.transit.types.taggedValue, isTaggedValue:com.cognitect.transit.types.isTaggedValue, link:com.cognitect.transit.types.link, isLink:com.cognitect.transit.types.isLink, hash:com.cognitect.transit.eq.hashCode, hashArrayLike:com.cognitect.transit.eq.hashArrayLike, 
hashMapLike:com.cognitect.transit.eq.hashMapLike, equals:com.cognitect.transit.eq.equals, extendToEQ:com.cognitect.transit.eq.extendToEQ, mapToObject:com.cognitect.transit.mapToObject, objectToMap:com.cognitect.transit.objectToMap, decoder:com.cognitect.transit.impl.decoder.decoder, UUIDfromString:com.cognitect.transit.types.UUIDfromString, randomUUID:com.cognitect.transit.util.randomUUID, stringableKeys:com.cognitect.transit.impl.writer.stringableKeys, readCache:com.cognitect.transit.caching.readCache, 
writeCache:com.cognitect.transit.caching.writeCache});


/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(14).Buffer))

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(16)
var ieee754 = __webpack_require__(17)
var isArray = __webpack_require__(18)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(15)))

/***/ }),
/* 15 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}


/***/ }),
/* 17 */
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),
/* 18 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, Set } = __webpack_require__(0)
const uuid = __webpack_require__(4)
const FreezeAPI = __webpack_require__(2)

class DocSet {
  constructor () {
    this.docs = Map()
    this.handlers = Set()
  }

  get docIds () {
    return this.docs.keys()
  }

  getDoc (docId) {
    return this.docs.get(docId)
  }

  setDoc (docId, doc) {
    this.docs = this.docs.set(docId, doc)
    this.handlers.forEach(handler => handler(docId, doc))
  }

  applyChanges (docId, changes) {
    let doc = this.docs.get(docId) || FreezeAPI.init(uuid())
    doc = FreezeAPI.applyChanges(doc, changes, true)
    this.setDoc(docId, doc)
    return doc
  }

  registerHandler (handler) {
    this.handlers = this.handlers.add(handler)
  }

  unregisterHandler (handler) {
    this.handlers = this.handlers.remove(handler)
  }
}

module.exports = DocSet


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, Set, fromJS } = __webpack_require__(0)
const AutoAPI = __webpack_require__(6)

class WatchableDoc {
  constructor (doc) {
    if (!doc) throw new Error("doc argument is required")
    this.doc = doc
    this.handlers = Set()
  }

  get () {
    return this.doc
  }

  set (doc) {
    this.doc = doc
    this.handlers.forEach(handler => handler(doc))
  }

  applyChanges (changes) {
    let doc = this.doc
    doc = AutoAPI.applyChanges(doc, fromJS(changes), true)
    this.set(doc)
    return doc
  }

  registerHandler (handler) {
    this.handlers = this.handlers.add(handler)
  }

  unregisterHandler (handler) {
    this.handlers = this.handlers.remove(handler)
  }
}

module.exports = WatchableDoc


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

const { Map, fromJS } = __webpack_require__(0)
const OpSet = __webpack_require__(1)

// Returns true if all components of clock1 are less than or equal to those of clock2.
// Returns false if there is at least one component in which clock1 is greater than clock2
// (that is, either clock1 is overall greater than clock2, or the clocks are incomparable).
function lessOrEqual(clock1, clock2) {
  return clock1.keySeq().concat(clock2.keySeq()).reduce(
    (result, key) => (result && clock1.get(key, 0) <= clock2.get(key, 0)),
    true)
}

// Updates the vector clock for `docId` in `clockMap` (mapping from docId to vector clock)
// by merging in the new vector clock `clock`. Returns the updated `clockMap`, in which each node's
// sequence number has been set to the maximum for that node.
function clockUnion(clockMap, docId, clock) {
  clock = clockMap.get(docId, Map()).mergeWith((x, y) => Math.max(x, y), clock)
  return clockMap.set(docId, clock)
}

// Keeps track of the communication with one particular peer. Allows updates for many documents to
// be multiplexed over a single connection.
//
// To integrate a connection with a particular networking stack, two functions are used:
// * `sendMsg` (callback passed to the constructor, will be called when local state is updated)
//   takes a message as argument, and sends it out to the remote peer.
// * `receiveMsg` (method on the connection object) should be called by the network stack when a
//   message is received from the remote peer.
//
// The documents to be synced are managed by a `DocSet`. Whenever a document is changed locally,
// call `setDoc()` on the docSet. The connection registers a callback on the docSet, and it figures
// out whenever there are changes that need to be sent to the remote peer.
//
// theirClock is the most recent VClock that we think the peer has (either because they've told us
// that it's their clock, or because it corresponds to a state we have sent to them on this
// connection). Thus, everything more recent than theirClock should be sent to the peer.
//
// ourClock is the most recent VClock that we've advertised to the peer (i.e. where we've
// told the peer that we have it).
class Connection {
  constructor (docSet, sendMsg) {
    this._docSet = docSet
    this._sendMsg = sendMsg
    this._theirClock = Map()
    this._ourClock = Map()
    this._docChangedHandler = this.docChanged.bind(this)
  }

  open () {
    for (let docId of this._docSet.docIds) this.docChanged(docId, this._docSet.getDoc(docId))
    this._docSet.registerHandler(this._docChangedHandler)
  }

  close () {
    this._docSet.unregisterHandler(this._docChangedHandler)
  }

  sendMsg (docId, clock, changes) {
    const msg = {docId, clock: clock.toJS()}
    this._ourClock = clockUnion(this._ourClock, docId, clock)
    if (changes) msg.changes = changes.toJS()
    this._sendMsg(msg)
  }

  maybeSendChanges (docId) {
    const doc = this._docSet.getDoc(docId)
    const clock = doc._state.getIn(['opSet', 'clock'])

    if (this._theirClock.has(docId)) {
      const changes = OpSet.getMissingChanges(doc._state.get('opSet'), this._theirClock.get(docId))
      if (!changes.isEmpty()) {
        this._theirClock = clockUnion(this._theirClock, docId, clock)
        this.sendMsg(docId, clock, changes)
        return
      }
    }

    if (!clock.equals(this._ourClock.get(docId, Map()))) this.sendMsg(docId, clock)
  }

  // Callback that is called by the docSet whenever a document is changed
  docChanged (docId, doc) {
    const clock = doc._state.getIn(['opSet', 'clock'])
    if (!clock) {
      throw new TypeError('This object cannot be used for network sync. ' +
                          'Are you trying to sync a snapshot from the history?')
    }

    if (!lessOrEqual(this._ourClock.get(docId, Map()), clock)) {
      throw new RangeError('Cannot pass an old state object to a connection')
    }

    this.maybeSendChanges(docId)
  }

  receiveMsg (msg) {
    if (msg.clock) {
      this._theirClock = clockUnion(this._theirClock, msg.docId, fromJS(msg.clock))
    }
    if (msg.changes) {
      return this._docSet.applyChanges(msg.docId, fromJS(msg.changes))
    }

    if (this._docSet.getDoc(msg.docId)) {
      this.maybeSendChanges(msg.docId)
    } else if (!this._ourClock.has(msg.docId)) {
      // If the remote node has data that we don't, immediately ask for it.
      // TODO should we sometimes exercise restraint in what we ask for?
      this.sendMsg(msg.docId, Map())
    }

    return this._docSet.getDoc(msg.docId)
  }
}

module.exports = Connection


/***/ })
/******/ ]);