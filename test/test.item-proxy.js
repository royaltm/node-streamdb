"use strict";

const util = require('util');
const test = require('tap').test;

const { itemProxyHandler } = require('../lib/collection/proxy');
const { Iterator } = require('../lib/iter');

test("item proxy handler", suite => {

  suite.test("should proxy", t => {
    t.plan(107 + 2*4 + 2*3 + 2*2);

    var item = {
      foo: 'bar',
      1: 42,
      toJSON() {
        t.strictEquals(this, item);
        return '';
      },
      deep: {
        property: {
          aMap: new Map(([[0,'a'],[1,'b']])),
          aSet: new Set(['x','y','z']),
          anArray: [100, 101, 102, 104]
        }
      },
      aMap: new Map([['00','A'],['11','B']]),
      aSet: new Set(['X','Y','Z']),
      anArray: [200, 201, 202, 204]
    };

    var proxy = new Proxy(item, itemProxyHandler);

    t.strictEquals(proxy.toJSON(), '');
    t.strictEquals(proxy[Symbol.for('x')], undefined);
    proxy[Symbol.for('x')] = 1001;
    t.strictEquals(proxy[Symbol.for('x')], 1001);

    t.type(proxy.anArray.iter, Iterator);
    t.strictEquals(proxy.anArray.length, 4);
    t.deepEquals(proxy.anArray, [200, 201, 202, 204]);
    t.strictSame(proxy.anArray.slice(0), [200, 201, 202, 204]);
    t.strictSame(proxy.anArray.slice(1,3), [201, 202]);
    t.throws(() => { proxy.anArray.copyWithin() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.fill() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.pop() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.reverse() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.shift() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.sort() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.splice() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.unshift() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.anArray.x = 1 }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { delete proxy.anArray.x }, new Error("can't modify collection item's value array in this way"));
    proxy.anArray.forEach((v,i) => t.strictEquals(proxy.anArray[i], v));
    t.strictEquals(proxy.anArray[0], 200);
    t.strictEquals(proxy.anArray[1], 201);
    t.strictEquals(proxy.anArray[2], 202);
    t.strictEquals(proxy.anArray[3], 204);
    t.strictEquals(proxy.anArray[-1], undefined);
    t.strictEquals(proxy.anArray[4], undefined);

    t.type(proxy.deep.property.anArray.iter, Iterator);
    t.strictEquals(proxy.deep.property.anArray.length, 4);
    t.deepEquals(proxy.deep.property.anArray, [100, 101, 102, 104]);
    t.strictSame(proxy.deep.property.anArray.slice(0), [100, 101, 102, 104]);
    t.strictSame(proxy.deep.property.anArray.slice(1,3), [101, 102]);
    t.throws(() => { proxy.deep.property.anArray.copyWithin() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.fill() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.pop() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.reverse() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.shift() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.sort() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.splice() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.unshift() }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { proxy.deep.property.anArray.x = 1 }, new Error("can't modify collection item's value array in this way"));
    t.throws(() => { delete proxy.deep.property.anArray.x }, new Error("can't modify collection item's value array in this way"));
    proxy.deep.property.anArray.forEach((v,i) => t.strictEquals(proxy.deep.property.anArray[i], v));
    t.strictEquals(proxy.deep.property.anArray[0], 100);
    t.strictEquals(proxy.deep.property.anArray[1], 101);
    t.strictEquals(proxy.deep.property.anArray[2], 102);
    t.strictEquals(proxy.deep.property.anArray[3], 104);
    t.strictEquals(proxy.deep.property.anArray[-1], undefined);
    t.strictEquals(proxy.deep.property.anArray[4], undefined);

    t.type(proxy.aSet.iter, Iterator);
    t.strictEquals(proxy.aSet.size, 3);
    t.strictEquals(proxy.aSet.has('X'), true);
    t.strictEquals(proxy.aSet.has('Y'), true);
    t.strictEquals(proxy.aSet.has('Z'), true);
    t.strictEquals(proxy.aSet.has('x'), false);
    t.strictSame(proxy.aSet.toArray(), ['X','Y','Z']);
    t.strictSame(proxy.aSet.ary, ['X','Y','Z']);
    t.throws(() => { proxy.aSet.clear() }, new Error("can't modify collection item's value set in this way"));
    t.throws(() => { proxy.aSet.x = 1 }, new Error("can't modify collection item's value set in this way"));
    t.throws(() => { delete proxy.aSet.x }, new Error("can't modify collection item's value set in this way"));
    proxy.aSet.forEach(v => t.strictEquals(proxy.aSet.has(v), true));
    t.strictEquals(proxy.aSet[0], 'X');
    t.strictEquals(proxy.aSet[1], 'Y');
    t.strictEquals(proxy.aSet[2], 'Z');
    t.strictEquals(proxy.aSet[3], undefined);

    t.type(proxy.deep.property.aSet.iter, Iterator);
    t.strictEquals(proxy.deep.property.aSet.size, 3);
    t.strictEquals(proxy.deep.property.aSet.has('x'), true);
    t.strictEquals(proxy.deep.property.aSet.has('y'), true);
    t.strictEquals(proxy.deep.property.aSet.has('z'), true);
    t.strictEquals(proxy.deep.property.aSet.has('X'), false);
    t.strictSame(proxy.deep.property.aSet.toArray(), ['x','y','z']);
    t.strictSame(proxy.deep.property.aSet.ary, ['x','y','z']);
    t.throws(() => { proxy.deep.property.aSet.clear() }, new Error("can't modify collection item's value set in this way"));
    t.throws(() => { proxy.deep.property.aSet.x = 1 }, new Error("can't modify collection item's value set in this way"));
    t.throws(() => { delete proxy.deep.property.aSet.x }, new Error("can't modify collection item's value set in this way"));
    proxy.deep.property.aSet.forEach(v => t.ok(v === 'x'||v === 'y'||v === 'z'));
    t.strictEquals(proxy.deep.property.aSet[0], 'x');
    t.strictEquals(proxy.deep.property.aSet[1], 'y');
    t.strictEquals(proxy.deep.property.aSet[2], 'z');
    t.strictEquals(proxy.deep.property.aSet[3], undefined);

    t.type(proxy.aMap.iter, Iterator);
    t.strictEquals(proxy.aMap.size, 2);
    t.strictEquals(proxy.aMap.has('11'), true);
    t.strictEquals(proxy.aMap.has(11), false);
    t.strictEquals(proxy.aMap.get('00'), 'A');
    t.strictEquals(proxy.aMap.get('11'), 'B');
    t.strictEquals(proxy.aMap.get(0), undefined);
    t.strictSame(proxy.aMap.toArray(), [['00','A'],['11','B']]);
    t.strictSame(proxy.aMap.ary, [['00','A'],['11','B']]);
    t.throws(() => { proxy.aMap.clear() }, new Error("can't modify collection item's value map in this way"));
    t.throws(() => { proxy.aMap.x = 1 }, new Error("can't modify collection item's value map in this way"));
    t.throws(() => { delete proxy.aMap.x }, new Error("can't modify collection item's value map in this way"));
    proxy.aMap.forEach((v,k) => {
      if (k === '00') t.strictEquals(v, 'A'); else if (k === '11') t.strictEquals(v, 'B');
    });
    t.strictSame(proxy.aMap[0], ['00','A']);
    t.strictSame(proxy.aMap[1], ['11','B']);
    t.strictEquals(proxy.aMap[2], undefined);

    t.type(proxy.deep.property.aMap.iter, Iterator);
    t.strictEquals(proxy.deep.property.aMap.size, 2);
    t.strictEquals(proxy.deep.property.aMap.has(1), true);
    t.strictEquals(proxy.deep.property.aMap.has('1'), false);
    t.strictEquals(proxy.deep.property.aMap.get(0), 'a');
    t.strictEquals(proxy.deep.property.aMap.get('0'), undefined);
    t.strictEquals(proxy.deep.property.aMap.get(1), 'b');
    t.strictEquals(proxy.deep.property.aMap.get('1'), undefined);
    t.strictSame(proxy.deep.property.aMap.toArray(), [[0,'a'],[1,'b']]);
    t.strictSame(proxy.deep.property.aMap.ary, [[0,'a'],[1,'b']]);
    t.throws(() => { proxy.deep.property.aMap.clear() }, new Error("can't modify collection item's value map in this way"));
    t.throws(() => { proxy.deep.property.aMap.x = 1 }, new Error("can't modify collection item's value map in this way"));
    t.throws(() => { delete proxy.deep.property.aMap.x }, new Error("can't modify collection item's value map in this way"));
    proxy.deep.property.aMap.forEach((v,k) => {
      if (k === 0) t.strictEquals(v, 'a'); else if (k === 1) t.strictEquals(v, 'b');
    });
    t.strictSame(proxy.deep.property.aMap[0], [0,'a']);
    t.strictSame(proxy.deep.property.aMap[1], [1,'b']);
    t.strictEquals(proxy.deep.property.aMap[2], undefined);
  });

  suite.end();
});