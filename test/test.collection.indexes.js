"use strict";

const test = require('tap').test;
const indexes = require('../lib/collection/indexes');

test("UniqueIndex", suite => {
  const { UniqueIndex } = indexes;

  suite.test('should be a subclass of Map', t => {
    t.type(UniqueIndex, 'function');
    t.type(UniqueIndex.prototype, Map);
    t.end();
  });

  suite.test('should not be clearable', t => {
    var index = new UniqueIndex();
    t.strictEquals(index.set(1, 'a'), index);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.get(1), 'a');
    t.strictEquals(index.size, 1);
    t.strictEquals(index.has(2), false);
    t.strictEquals(index.set(2, 'a'), index);
    t.strictEquals(index.has(2), true);
    t.strictEquals(index.size, 2);
    t.strictEquals(index.set(2, 'b'), index);
    t.throws(() => index.clear(), new Error("unimplemented: can't clear unique index"));
    t.strictEquals(index.size, 2);
    t.strictEquals(index.delete(2), true);
    t.strictEquals(index.size, 1);
    t.strictEquals(index.delete(2), false);
    t.strictEquals(index.size, 1);
    t.throws(() => index.clear(), new Error("unimplemented: can't clear unique index"));
    t.strictEquals(index.size, 1);
    t.end();
  });

  suite.test('should be Iterable', t => {
    var index = new UniqueIndex();
    t.strictEquals(index.set(1, 'a'), index);
    t.strictEquals(index.set(2, 'b'), index);
    t.strictEquals(index.set(3, 'c'), index);
    t.strictSame(index.all(), ['a', 'b', 'c']);
    t.strictSame(index.toArray(), ['a', 'b', 'c']);
    t.strictSame(index.grep(/a|c/).toArray(), ['a', 'c']);
    t.strictSame(index.count(), 3);
    t.end();
  });

  suite.end();
});


test("MultiValueIndex", suite => {
  const { MultiValueIndex } = indexes;

  suite.test('should be a subclass of Map', t => {
    t.type(MultiValueIndex, 'function');
    t.type(MultiValueIndex.prototype, Map);
    t.end();
  });

  suite.test('should be have MultiValueSet and emptySet', t => {
    t.type(MultiValueIndex.MultiValueSet, 'function');
    t.type(MultiValueIndex.prototype, Map);
    t.type(MultiValueIndex.emptySet, MultiValueIndex.MultiValueSet);
    t.strictEquals(MultiValueIndex.emptySet.size, 0);
    t.end();
  });

  suite.test('should values not be settable deletable or clearable', t => {
    var index = new MultiValueIndex();
    t.throws(() => index.get(1).add('a'), new Error("this is a read only set"));
    t.throws(() => index.get(1).clear(), new Error("this is a read only set"));
    t.throws(() => index.get(1).delete(1), new Error("this is a read only set"));
    t.strictEquals(index.add(1, 'a'), index);
    t.throws(() => index.get(1).add('b'), new Error("this is a read only set"));
    t.throws(() => index.get(1).clear(), new Error("this is a read only set"));
    t.throws(() => index.get(1).delete(1), new Error("this is a read only set"));
    t.strictEquals(index.size, 1);
    t.strictSame(index.toArray(), ['a']);
    t.strictEquals(index.delete(1, 'a'), true);
    t.strictEquals(index.size, 0);
    t.strictSame(index.toArray(), []);
    t.end();
  });

  suite.test('should not be settable or clearable', t => {
    var index = new MultiValueIndex();
    t.throws(() => index.set(1, 'a'), new Error("forbidden: this is a multi-value index"));
    t.throws(() => index.clear(), new Error("unimplemented: can't clear multi-value index"));
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has(2), false);
    t.strictEquals(index.size, 0);
    t.type(index.get(1), MultiValueIndex.MultiValueSet);
    t.strictEquals(index.get(1), MultiValueIndex.emptySet);
    t.strictEquals(index.add(1, 'a'), index);
    t.strictEquals(index.add(1, 'b'), index);
    t.strictEquals(index.add(1, 'c'), index);
    t.strictSame(index.get(1).toArray(), ['a','b','c']);
    t.type(index.get(1), MultiValueIndex.MultiValueSet);
    t.strictEquals(index.size, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.add(2, 'a'), index);
    t.strictEquals(index.size, 2);
    t.strictEquals(index.has(2), true);
    t.strictSame(index.get(2).toArray(), ['a']);
    t.type(index.get(2), MultiValueIndex.MultiValueSet);
    t.strictEquals(index.delete(2, 'b'), false);
    t.strictEquals(index.delete(2, 'a'), true);
    t.strictEquals(index.delete(2, 'a'), false);
    t.strictEquals(index.has(2), false);
    t.strictEquals(index.size, 1);
    t.strictEquals(index.delete(1, 'a'), true);
    t.strictSame(index.get(1).toArray(), ['b','c']);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.size, 1);
    t.strictEquals(index.delete(1, 'b'), true);
    t.strictSame(index.get(1).toArray(), ['c']);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.size, 1);
    t.strictEquals(index.delete(1, 'c'), true);
    t.strictEquals(index.get(1), MultiValueIndex.emptySet);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.size, 0);
    t.end();
  });

  suite.test('should be Iterable', t => {
    var index = new MultiValueIndex();
    t.strictEquals(index.add(1, 'a'), index);
    t.strictEquals(index.add(1, 'b'), index);
    t.strictEquals(index.add(2, 'c'), index);
    t.strictSame(index.all(), ['a', 'b', 'c']);
    t.strictSame(index.toArray(), ['a', 'b', 'c']);
    t.strictSame(index.grep(/a|c/).toArray(), ['a', 'c']);
    t.strictSame(index.count(), 3);
    t.strictSame(index.get(1).all(), ['a', 'b']);
    t.strictSame(index.get(1).toArray(), ['a', 'b']);
    t.strictSame(index.get(1).grep(/a|c/).toArray(), ['a']);
    t.strictSame(index.get(1).count(), 2);
    t.strictSame(index.get(2).count(), 1);
    t.end();
  });

  suite.end();
});


test("CompositeUniqueIndex", suite => {
  const { CompositeUniqueIndex } = indexes;

  suite.test('should be a subclass of Map', t => {
    t.type(CompositeUniqueIndex, 'function');
    t.type(CompositeUniqueIndex.prototype, Map);
    t.end();
  });

  suite.test('should not be clearable and throw error on bad set/delete args', t => {
    var index = new CompositeUniqueIndex(1);
    t.strictEquals(index.componentCount, 1);
    t.throws(() => index.clear(), new Error("unimplemented: can't clear composite unique index"));
    t.throws(() => index.set(1, 2), new TypeError("CompositeUniqueIndex: 'keys` argument must be an Array"));
    t.throws(() => index.delete(1, 2), new TypeError("CompositeUniqueIndex: 'keys` argument must be an Array"));
    t.end();
  });

  suite.test('should be a composite unique index', t => {
    var index = new CompositeUniqueIndex(3);
    t.strictEquals(index.componentCount, 3);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has(1, 2), false);
    t.strictEquals(index.has(1, 2, 3), false);
    t.strictEquals(index.has([1, 2, 3]), false);
    t.strictEquals(index.size, 0);
    // t.strictEquals(index.length, 0);
    t.type(index.get(1), CompositeUniqueIndex);
    t.type(index.get(1, 2), CompositeUniqueIndex);
    t.type(index.get(1, 4), CompositeUniqueIndex);
    t.strictEquals(index.get(1, 2, 3), undefined);
    t.strictEquals(index.set([1, 2, 3], 'a'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has(1, 2), true);
    t.strictEquals(index.has(1, 2, 3), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has([1, 2]), true);
    t.strictEquals(index.has([1, 2, 3]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.type(index.get(1, 2), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['a']);
    t.strictSame(index.get(1).toArray(), ['a']);
    t.strictSame(index.get(1, 2).toArray(), ['a']);
    t.strictEquals(index.get([1]), index.get(1));
    t.strictEquals(index.get([1, 2]), index.get(1, 2));
    t.strictEquals(index.get(1, 2, 3), 'a');
    t.strictEquals(index.get([1, 2, 3]), 'a');
    t.strictEquals(index.set([1, 2, 3], 'b'), index);
    t.strictEquals(index.set([1, 4, 5], 'c'), index);
    t.strictEquals(index.set([1, 2, 4], 'd'), index);

    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 3);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has(1, 2), true);
    t.strictEquals(index.has(1, 3), false);
    t.strictEquals(index.has(1, 4), true);
    t.strictEquals(index.has(1, 2, 3), true);
    t.strictEquals(index.has(1, 2, 4), true);
    t.strictEquals(index.has(1, 2, 5), false);
    t.strictEquals(index.has(1, 3, 3), false);
    t.strictEquals(index.has(1, 4, 3), false);
    t.strictEquals(index.has(1, 4, 5), true);
    t.strictEquals(index.has([1, 2, 3]), true);
    t.strictEquals(index.has([1, 4, 5]), true);
    t.strictSame(index.toArray(), ['b', 'd', 'c']);
    t.strictSame(index.count(), 3);
    t.strictSame(index.grep(/d|c/).toArray(), ['d', 'c']);
    t.type(index.get(1), CompositeUniqueIndex);
    t.type(index.get(1, 2), CompositeUniqueIndex);
    t.type(index.get(1, 4), CompositeUniqueIndex);
    t.strictSame(index.get(1).toArray(), ['b', 'd', 'c']);
    t.strictSame(index.get(1).count(), 3);
    t.strictSame(index.get(1).grep(/d|c/).toArray(), ['d', 'c']);
    t.strictSame(index.get(1, 2).toArray(), ['b', 'd']);
    t.strictSame(index.get(1, 2).grep(/d|c/).toArray(), ['d']);
    t.strictSame(index.get(2).count(), 0);
    t.strictSame(index.get(1, 2).count(), 2);
    t.strictSame(index.get(1, 4).toArray(), ['c']);
    t.strictSame(index.get(1, 4).count(), 1);
    t.strictEquals(index.get(1, 2).size, 2);
    t.strictEquals(index.get(1, 4).size, 1);
    t.strictEquals(index.get([1]), index.get(1));
    t.strictEquals(index.get([1, 2]), index.get(1, 2));
    t.strictEquals(index.get([1, 4]), index.get(1, 4));
    t.strictEquals(index.get(1, 4, 5), 'c');
    t.strictEquals(index.get(1, 4, 3), undefined);
    t.strictEquals(index.get(1, 2, 5), undefined);
    t.strictEquals(index.delete([1, 2, 3]), true);
    t.strictEquals(index.delete([1, 2, 3]), false);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 2);
    t.throws(() => index.clear(), new Error("unimplemented: can't clear composite unique index"));
    t.strictEquals(index.get(1, 2).size, 1);
    t.strictEquals(index.get(1, 4).size, 1);
    t.strictEquals(index.delete([1, 2, 4]), true);
    t.strictEquals(index.delete([1, 2, 4]), false);
    t.strictEquals(index.get(1, 2).size, 0);
    t.strictEquals(index.get(1, 4).size, 1);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has(1, 2), false);
    t.strictEquals(index.has(1, 3), false);
    t.strictEquals(index.has(1, 4), true);
    t.strictEquals(index.has(1, 2, 3), false);
    t.strictEquals(index.has(1, 3, 3), false);
    t.strictEquals(index.has(1, 4, 3), false);
    t.strictEquals(index.has(1, 4, 5), true);
    t.strictEquals(index.has([1, 2, 3]), false);
    t.strictEquals(index.has([1, 4, 5]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.type(index.get(1, 2), CompositeUniqueIndex);
    t.type(index.get(1, 4), CompositeUniqueIndex);
    t.strictSame(index.get(1).toArray(), ['c']);
    t.strictSame(index.get(1, 4).toArray(), ['c']);
    t.strictSame(index.get(1, 2).toArray(), []);
    t.strictEquals(index.get([1]), index.get(1));
    t.strictEquals(index.get([1, 2]), index.get(1, 2));
    t.strictEquals(index.get([1, 4]), index.get(1, 4));
    t.strictEquals(index.get(1, 4, 5), 'c');
    t.strictEquals(index.get(1, 4, 3), undefined);
    t.strictEquals(index.get(1, 2, 3), undefined);
    t.strictEquals(index.get(1, 2, 5), undefined);
    t.strictEquals(index.delete([1, 4, 5]), true);
    t.strictEquals(index.delete([1, 4, 5]), false);
    t.strictEquals(index.size, 0);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has(1, 2), false);
    t.strictEquals(index.has(1, 3), false);
    t.strictEquals(index.has(1, 4), false);
    t.strictEquals(index.has(1, 2, 3), false);
    t.strictEquals(index.has(1, 3, 3), false);
    t.strictEquals(index.has(1, 4, 3), false);
    t.strictEquals(index.has(1, 4, 5), false);
    t.strictEquals(index.has([1, 2, 3]), false);
    t.strictEquals(index.has([1, 4, 5]), false);
    t.end();
  });

  suite.test('should treat undefined in a special way', t => {
    var index = new CompositeUniqueIndex(1);
    t.strictEquals(index.size, 0);
    t.strictEquals(index.count(), 0);
    t.strictEquals(index.set([undefined], 'x'), index);
    t.strictEquals(index.size, 0);
    t.type(index.get(undefined), undefined);
    t.strictEquals(index.has(undefined), false);
    t.strictEquals(index.delete([undefined], 'x'), false);

    var index = new CompositeUniqueIndex(2);
    t.strictEquals(index.size, 0);
    t.strictEquals(index.count(), 0);
    t.strictEquals(index.set([undefined, 1], 'x'), index);
    t.strictEquals(index.has(undefined), false);
    t.strictEquals(index.has(undefined, 1), false);
    t.strictEquals(index.size, 0);
    t.type(index.get(undefined), CompositeUniqueIndex);
    t.strictEquals(index.get(undefined).size, 0);
    t.strictEquals(index.delete([undefined, 1], 'x'), false);

    t.strictEquals(index.set([1, undefined], 'x'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['x']);
    t.strictSame(index.get(1).toArray(), ['x']);
    t.strictSame(index.count(), 1);
    t.strictSame(index.get(1).count(), 1);
    t.strictSame(index.get(1).size, 0);
    t.strictSame(index.get([1]).toArray(), ['x']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);

    t.strictEquals(index.set([1, undefined], 'y'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['x', 'y']);
    t.strictSame(index.get(1).toArray(), ['x', 'y']);
    t.strictSame(index.count(), 2);
    t.strictSame(index.get(1).count(), 2);
    t.strictSame(index.get(1).size, 0);
    t.strictSame(index.get([1]).toArray(), ['x', 'y']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);

    t.strictEquals(index.set([1, 1], 'z'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, 1), true);
    t.strictEquals(index.has([1, 1]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['x', 'y', 'z']);
    t.strictSame(index.get(1).toArray(), ['x', 'y', 'z']);
    t.strictSame(index.count(), 3);
    t.strictSame(index.get(1).count(), 3);
    t.strictSame(index.get(1).size, 1);
    t.strictSame(index.get([1]).toArray(), ['x', 'y', 'z']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.get(1, 1), 'z');
    t.strictEquals(index.get([1, 1]), 'z');

    t.strictEquals(index.delete([1, undefined], 'x'), true);
    t.strictEquals(index.delete([1, undefined], 'x'), false);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, 1), true);
    t.strictEquals(index.has([1, 1]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['y', 'z']);
    t.strictSame(index.get(1).toArray(), ['y', 'z']);
    t.strictSame(index.count(), 2);
    t.strictSame(index.get(1).count(), 2);
    t.strictSame(index.get(1).size, 1);
    t.strictSame(index.get([1]).toArray(), ['y', 'z']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.get(1, 1), 'z');
    t.strictEquals(index.get([1, 1]), 'z');

    t.strictEquals(index.delete([1, undefined], 'y'), true);
    t.strictEquals(index.delete([1, undefined], 'y'), false);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, 1), true);
    t.strictEquals(index.has([1, 1]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['z']);
    t.strictSame(index.get(1).toArray(), ['z']);
    t.strictSame(index.count(), 1);
    t.strictSame(index.get(1).count(), 1);
    t.strictSame(index.get(1).size, 1);
    t.strictSame(index.get([1]).toArray(), ['z']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.get(1, 1), 'z');
    t.strictEquals(index.get([1, 1]), 'z');

    t.strictEquals(index.delete([1, 1], 'z'), true);
    t.strictEquals(index.delete([1, 1], 'z'), false);
    t.strictEquals(index.size, 0);
    // t.strictEquals(index.length, 0);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), []);
    t.strictSame(index.get(1).toArray(), []);
    t.strictSame(index.get([1]).toArray(), []);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has([1]), false);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.get(1, 1), undefined);
    t.strictEquals(index.get([1, 1]), undefined);

    t.strictEquals(index.set([1, 1], 'z'), index);
    t.strictEquals(index.set([1, undefined], 'y'), index);
    t.strictEquals(index.set([1, undefined], 'x'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, 1), true);
    t.strictEquals(index.has([1, 1]), true);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['y', 'x', 'z']);
    t.strictSame(index.get(1).toArray(), ['y', 'x', 'z']);
    t.strictSame(index.count(), 3);
    t.strictSame(index.get(1).count(), 3);
    t.strictSame(index.get(1).size, 1);
    t.strictSame(index.get([1]).toArray(), ['y', 'x', 'z']);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.get(1, 1), 'z');
    t.strictEquals(index.get([1, 1]), 'z');

    t.strictEquals(index.delete([1, undefined], 'x'), true);
    t.strictEquals(index.delete([1, 1], 'z'), true);
    t.strictEquals(index.delete([1, undefined], 'y'), true);
    t.strictEquals(index.size, 0);
    // t.strictEquals(index.length, 0);
    t.type(index.get(1), CompositeUniqueIndex);
    t.strictSame(index.toArray(), []);
    t.strictSame(index.get(1).toArray(), []);
    t.strictSame(index.get([1]).toArray(), []);
    t.strictEquals(index.get(1, undefined), undefined);
    t.strictEquals(index.get([1, undefined]), undefined);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has([1]), false);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.get(1, 1), undefined);
    t.strictEquals(index.get([1, 1]), undefined);
    t.strictEquals(index.delete([1, undefined], 'x'), false);
    t.strictEquals(index.delete([1, 1], 'z'), false);
    t.strictEquals(index.delete([1, undefined], 'y'), false);

    var index = new CompositeUniqueIndex(3);
    t.strictEquals(index.size, 0);
    t.strictEquals(index.set([undefined, 1, 2], 'x'), index);
    t.strictEquals(index.has(undefined), false);
    t.strictEquals(index.has(undefined, 1), false);
    t.strictEquals(index.has(undefined, 1, 2), false);
    t.strictEquals(index.size, 0);
    t.strictEquals(index.count(), 0);
    t.type(index.get(undefined), CompositeUniqueIndex);
    t.strictEquals(index.get(undefined).size, 0);
    t.strictEquals(index.delete([undefined, 1], 'x'), false);

    t.strictEquals(index.set([1, undefined, 1], 'a'), index);
    t.strictEquals(index.set([1, undefined, undefined], 'b'), index);
    t.strictEquals(index.set([1, 1, 1], 'x'), index);
    t.strictEquals(index.set([1, 1, undefined], 'c'), index);
    t.strictEquals(index.set([1, 2, undefined], 'd'), index);
    t.strictEquals(index.size, 1);
    // t.strictEquals(index.length, 1);
    t.strictEquals(index.has(1), true);
    t.strictEquals(index.has([1]), true);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, undefined, undefined), false);
    t.strictEquals(index.has([1, undefined, undefined]), false);
    t.strictEquals(index.has(1, undefined, 1), false);
    t.strictEquals(index.has([1, undefined, 1]), false);
    t.strictEquals(index.has(1, 1), true);
    t.strictEquals(index.has([1, 1]), true);
    t.strictEquals(index.has(1, 1, 1), true);
    t.strictEquals(index.has([1, 1, 1]), true);
    t.strictEquals(index.has(1, 2), true);
    t.strictEquals(index.has([1, 2]), true);
    t.strictEquals(index.has(1, 1, undefined), false);
    t.strictEquals(index.has([1, 1, undefined]), false);
    t.strictEquals(index.has(1, 2, undefined), false);
    t.strictEquals(index.has([1, 2, undefined]), false);
    t.type(index.get(undefined), CompositeUniqueIndex);
    t.type(index.get(undefined, 1), CompositeUniqueIndex);
    t.type(index.get(1), CompositeUniqueIndex);
    t.type(index.get(1, 1), CompositeUniqueIndex);
    t.type(index.get(1, 2), CompositeUniqueIndex);
    t.type(index.get(1, undefined), CompositeUniqueIndex);
    t.strictSame(index.toArray(), ['a', 'b', 'c', 'x', 'd']);
    t.strictSame(index.count(), 5);
    t.strictSame(index.get(1).toArray(), ['a', 'b', 'c', 'x', 'd']);
    t.strictSame(index.get(1).size, 2);
    t.strictSame(index.get(1).count(), 5);
    t.strictSame(index.get(1, 1).toArray(), ['c', 'x']);
    t.strictSame(index.get(1, 1).size, 1);
    t.strictSame(index.get(1, 1).count(), 2);
    t.strictSame(index.get(1, 2).toArray(), ['d']);
    t.strictSame(index.get(1, 2).size, 0);
    t.strictSame(index.get(1, 2).count(), 1);
    t.strictEquals(index.get([1]), index.get(1));
    t.strictEquals(index.get([1, 2]), index.get(1, 2));
    t.strictEquals(index.get([1, undefined, 1]), undefined);
    t.strictEquals(index.get([1, undefined, undefined]), undefined);
    t.strictEquals(index.get([1, 1, 1]), 'x');
    t.strictEquals(index.get([1, 1, undefined]), undefined);
    t.strictEquals(index.get([1, 2, undefined]), undefined);

    t.strictEquals(index.delete([1, undefined, undefined], 'a'), true);
    t.strictEquals(index.delete([1, undefined, 100], 'b'), true);
    t.strictEquals(index.delete([1, 1, 1], 'x'), true);
    t.strictEquals(index.delete([1, 1, undefined], 'c'), true);
    t.strictEquals(index.delete([1, 2, undefined], 'd'), true);
    t.strictEquals(index.size, 0);
    // t.strictEquals(index.length, 0);
    t.strictSame(index.toArray(), []);
    t.strictSame(index.count(), 0);
    t.strictEquals(index.has(1), false);
    t.strictEquals(index.has([1]), false);
    t.strictEquals(index.has(1, undefined), false);
    t.strictEquals(index.has([1, undefined]), false);
    t.strictEquals(index.has(1, undefined, undefined), false);
    t.strictEquals(index.has([1, undefined, undefined]), false);
    t.strictEquals(index.has(1, undefined, 1), false);
    t.strictEquals(index.has([1, undefined, 1]), false);
    t.strictEquals(index.has(1, 1), false);
    t.strictEquals(index.has([1, 1]), false);
    t.strictEquals(index.has(1, 1, 1), false);
    t.strictEquals(index.has([1, 1, 1]), false);
    t.strictEquals(index.has(1, 2), false);
    t.strictEquals(index.has([1, 2]), false);
    t.strictEquals(index.has(1, 1, undefined), false);
    t.strictEquals(index.has([1, 1, undefined]), false);
    t.strictEquals(index.has(1, 2, undefined), false);
    t.strictEquals(index.has([1, 2, undefined]), false);

    t.end();
  });

  suite.end();
});