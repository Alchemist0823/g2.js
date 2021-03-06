import * as util from "../src/util";
import {Polygon, Vector as V} from "../src"
import {angleNormalize, angleNormalizePI2} from "../src/util";


describe('angle', () => {
    test('angleNormalizePI2', () => {
        expect(angleNormalizePI2(12)).toBeCloseTo(12 - Math.PI * 2, 0.00001);
    });

    test('angleNormalize', () => {
        expect(angleNormalize(12)).toBeCloseTo(12 - Math.PI * 4, 0.00001);
    });
});

describe('util.testSegmentSegment', () => {
    test('test general case', () => {
        expect(util.testSegmentSegment(new V(0, 0), new V(1, 1),
            new V(1, 0), new V(0, 1))).toBe(true);
        expect(util.testSegmentSegment(new V(0, 1), new V(1, 1),
            new V(0, 0), new V(1, 0))).toBe(false);
    });

    test('test colinear', () => {
        expect(util.testSegmentSegment(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(1, 1))).toBe(true);
        expect(util.testSegmentSegment(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(.8, .8))).toBe(true);
    });

    test('test 1 endpoint touch', () => {
        expect(util.testSegmentSegment(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(0, 1))).toBe(false);
        expect(util.testSegmentSegment(new V(0.5, 0.5), new V(0, 1),
            new V(0, 0), new V(1, 1))).toBe(false);
    });

});

describe('util.intersectingVertex', () => {
    test('test general cases', () => {
        expect(util.intersectingVertex(new V(0, 0), new V(10, 0),
            new V(20, 0), new V(20, 10))).toBe(null);
        expect(util.intersectingVertex(new V(0, 0), new V(1, 1),
            new V(1, 0), new V(0, 1))).toStrictEqual(new V(0.5, 0.5));
        let int = util.intersectingVertex(new V(0, 0), new V(30, 40),
            new V(-100, 4), new V(100, 4))
        expect(int!.x).toBeCloseTo(3);
        expect(int!.y).toBeCloseTo(4);
        expect(util.intersectingVertex(new V(0, 1), new V(1, 1),
            new V(0, 0), new V(-3, -2))).toBe(null);
    });

    test('test colinear', () => {
        expect(util.intersectingVertex(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(2, 2))).toStrictEqual(new V(0.5, 0.5));
        expect(util.intersectingVertex(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(.8, .8))).toStrictEqual(new V(0.5, 0.5));
        expect(util.intersectingVertex(new V(0, 0), new V(1, 1),
            new V(-0.5, -0.5), new V(.8, .8))).toStrictEqual(new V(-0.5, -0.5));
        expect(util.intersectingVertex(new V(0, 0), new V(0.5, 0.5),
            new V(0.5, 0.5), new V(.8, .8))).toStrictEqual(new V(0.5, 0.5));
        expect(util.intersectingVertex(new V(0, 0), new V(0.4, 0.4),
            new V(0.5, 0.5), new V(.8, .8))).toBe(null);
    });

    test('test 1 endpoint touch', () => {
        expect(util.intersectingVertex(new V(0, 0), new V(1, 1),
            new V(0.5, 0.5), new V(0, 1))).toStrictEqual(new V(0.5, 0.5));
        expect(util.intersectingVertex(new V(0.5, 0.5), new V(-20, 1),
            new V(0, 0), new V(1, 1))).toStrictEqual(new V(0.5, 0.5));

        expect(util.intersectingVertex(new V(0, 0), new V(10, 0),
            new V(10, 10), new V(10, 0))).toStrictEqual(new V(10, 0));
        expect(util.intersectingVertex(new V(10, 0), new V(20, 0),
            new V(0, 0), new V(10, 0))).toStrictEqual(new V(0, 0));
        expect(util.intersectingVertex(new V(10, 0), new V(20, 0),
            new V(10, 0), new V(10, 10))).toStrictEqual(new V(10, 0));
    });

});

describe('util.point2segment', () => {
    test('test closest point on segment', () => {
        let cp = new V();
        let dist = util.point2segment(new V(1, 1), new V(0, 2), new V(2, 2), cp);

        expect(dist).toBeCloseTo(1, 0.01);
        expect(cp.x).toBeCloseTo(1, 0.01);
        expect(cp.y).toBeCloseTo(2, 0.01);
    });

    test('test closest point on segment', () => {
        let cp = new V();
        let dist = util.point2segment(new V(0, 1), new V(0, 2), new V(2, 2), cp);

        expect(dist).toBeCloseTo(1, 0.01);
        expect(cp.x).toBeCloseTo(0, 0.01);
        expect(cp.y).toBeCloseTo(2, 0.01);
    });

    test('test closest point on start', () => {
        let cp = new V();
        let dist = util.point2segment(new V(1, 1), new V(2, 2), new V(3, 2), cp);

        expect(dist).toBeCloseTo(Math.sqrt(2), 0.01);
        expect(cp.x).toBeCloseTo(2, 0.01);
        expect(cp.y).toBeCloseTo(2, 0.01);
    });


    test('test closest point on end', () => {
        let cp = new V();
        let dist = util.point2segment(new V(4, 1), new V(2, 2), new V(3, 2), cp);

        expect(dist).toBeCloseTo(Math.sqrt(2), 0.01);
        expect(cp.x).toBeCloseTo(3, 0.01);
        expect(cp.y).toBeCloseTo(2, 0.01);
    });
});


describe('util.point2polygon', () => {
    test('test closest point on segment', () => {
        let cp = new V();
        let dist = util.point2polygon(new V(1, 1), [
            new V(0, 2), new V(1, 2), new V(2, 1), new V(2, 2), new V(1, 3), new V(0, 3)
        ], cp);

        expect(dist).toBeCloseTo(Math.sqrt(2) / 2, 0.01);
        expect(cp.x).toBeCloseTo(1.5, 0.01);
        expect(cp.y).toBeCloseTo(1.5, 0.01);
    });
});
