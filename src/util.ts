import {Polygon} from "./polygon";
import {Vector} from "./vector";
import {TestResult} from "./test-result";
import {Circle} from "./circle";
import {Segment} from "./segment";

const PI = Math.PI;
const PI2 = Math.PI * 2;

export const Geom2Const = {
    PI,
    PI2
};
// ## Object Pools

// A pool of `Vector` objects that are used in calculations to avoid
// allocating memory.
let T_VECTORS: Array<Vector> = [];
for (let i = 0; i < 10; i++) { T_VECTORS.push(new Vector()); }

// A pool of arrays of numbers used in calculations to avoid allocating
// memory.
let T_ARRAYS: Array<Array<number>> = [];
for (let i = 0; i < 5; i++) { T_ARRAYS.push([]); }

// Temporary response used for polygon hit detection.
let T_TESTRESULT = new TestResult();

/*****               Array                        *******/
/**
 * Randomly shuffle an array
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
export function shuffle(array: Array<any>) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

/******              number                            *****/

// value
export function sameSign(num1: number, num2: number)
{
    return num1 >= 0 && num2 >= 0 || num1 < 0 && num2 < 0
}

export function pMod(a: number, n: number) {
    return (a % n + n) % n;
}

export function angleNormalize(a: number) {
    return pMod((a + PI), PI2) - PI;
}

export function angleNormalizePI2(a: number) {
    return pMod(a, PI2);
}

export function angleDiff(angle1: number, angle2: number) {
    let a = angle1 - angle2;
    return angleNormalize(a);
}

export function angleDiffPI2(angle1: number, angle2: number) {
    let a = angle1 - angle2;
    return angleNormalizePI2(a);
}
/******              Vector                            *****/
// Given three colinear points p, q, r, the function checks if
// point q lies on line segment 'pr'
export function onSegment(s1: Vector, s2: Vector, v: Vector) : boolean
{
    return v.x <= Math.max(s1.x, s2.x) && v.x >= Math.min(s1.x, s2.x) &&
        v.y <= Math.max(s1.y, s2.y) && v.y >= Math.min(s1.y, s2.y);
}

// To find orientation of ordered triplet (v1, ref, v2).
export function crossProduct3(v1: Vector, v2: Vector, v3: Vector) {
    return (v2.x - v1.x) * (v3.y - v2.y) - (v2.y - v1.y) * (v3.x - v2.x);
}


// To find orientation of ordered triplet (v1, ref, v2).
export function orientation(s: Segment, v: Vector) {
    return crossProduct3(s.v1, s.v2, v);
}

export function testSegmentSegment(s1p1: Vector, s1p2: Vector, s2p1: Vector, s2p2: Vector) : boolean
{
    // Find the four orientations needed for general and
    // special cases
    let o1 = crossProduct3(s1p1, s1p2, s2p1);
    let o2 = crossProduct3(s1p1, s1p2, s2p2);
    let o3 = crossProduct3(s2p1, s2p2, s1p1);
    let o4 = crossProduct3(s2p1, s2p2, s1p2);

    // General case
    if (!sameSign(o1, o2) && !sameSign(o3, o4))
        return true;


    // Special Cases
    // s1p1, s1p2 and s2p1 are colinear and s2p1 lies on segment p1q1
    if (o1 == 0 && onSegment(s1p1, s2p1, s1p2)) return true;

    // s1p1, s1p2 and s2p2 are colinear and s2p2 lies on segment p1q1
    if (o2 == 0 && onSegment(s1p1, s2p2, s1p2)) return true;

    // s2p1, s2p2 and s1p1 are colinear and s1p1 lies on segment p2q2
    if (o3 == 0 && onSegment(s2p1, s1p1, s2p2)) return true;

    // s2p1, s2p2 and s1p2 are colinear and s1p2 lies on segment p2q2
    if (o4 == 0 && onSegment(s2p1, s1p2, s2p2)) return true;

    return false; // Doesn't fall in any of the above cases
}


export function lineIntersection(p1:Vector, p2:Vector, p3:Vector, p4:Vector):Vector {
    // From http://paulbourke.net/geometry/lineline2d/
    var s = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x))
        / ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
    return new Vector(p1.x + s * (p2.x - p1.x), p1.y + s * (p2.y - p1.y));
}


/******              Polygon                            *****/

/**
 * Flattens the specified array of points onto a unit vector axis,
 * resulting in a one dimensional range of the minimum and
 * maximum value on that axis.
 * @param points The points to flatten.
 * @param normal The unit vector axis to flatten on.
 * @param result An array.  After calling this function,
 *   result[0] will be the minimum value,
 *   result[1] will be the maximum value.
 */
function flattenPointsOn(points: Array<Vector>, normal: Vector, result: Array<number>) {
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    let len = points.length;
    for (let i = 0; i < len; i++ ) {
        // The magnitude of the projection of the point onto the normal
        let dot = points[i].dot(normal);
        if (dot < min) { min = dot; }
        if (dot > max) { max = dot; }
    }
    result[0] = min; result[1] = max;
}

/**
 * Check whether two convex polygons are separated by the specified
 * axis (must be a unit vector).
 * @param aPos
 * @param bPos
 * @param aPoints The points in the first polygon.
 * @param bPoints The points in the second polygon.
 * @param axis The axis (unit sized) to test against.  The points of both polygons
 *   will be projected onto this axis.
 * @param testResult A Response object (optional) which will be populated
 *   if the axis is not a separating axis.
 * @return true if it is a separating axis, false otherwise.  If false,
 *   and a response is passed in, information about how much overlap and
 *   the direction of the overlap will be populated.
 */
export function isSeparatingAxis(aPos: Vector, bPos: Vector, aPoints: Array<Vector>, bPoints: Array<Vector>, axis: Vector, testResult: TestResult) {
    let rangeA = T_ARRAYS.pop();
    let rangeB = T_ARRAYS.pop();
    var offsetV = T_VECTORS.pop();
    if (rangeA === undefined || rangeB === undefined || offsetV === undefined)
        throw new Error('memory allocation error');

    offsetV.set(bPos).sub(aPos);
    let projectedOffset = offsetV.dot(axis);
    // Project the polygons onto the axis.
    flattenPointsOn(aPoints, axis, rangeA);
    flattenPointsOn(bPoints, axis, rangeB);

    rangeB[0] += projectedOffset;
    rangeB[1] += projectedOffset;
    // Check if there is a gap. If there is, this is a separating axis and we can stop
    if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        T_VECTORS.push(offsetV);
        T_ARRAYS.push(rangeA);
        T_ARRAYS.push(rangeB);
        return true;
    }
    // This is not a separating axis. If we're calculating a response, calculate the overlap.
    if (testResult) {
        let overlap = 0;
        // A starts further left than B
        if (rangeA[0] < rangeB[0]) {
            testResult.aInB = false;
            // A ends before B does. We have to pull A out of B
            if (rangeA[1] < rangeB[1]) {
                overlap = rangeA[1] - rangeB[0];
                testResult.bInA = false;
                // B is fully inside A.  Pick the shortest way out.
            } else {
                let option1 = rangeA[1] - rangeB[0];
                let option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
            // B starts further left than A
        } else {
            testResult.bInA = false;
            // B ends before A ends. We have to push A out of B
            if (rangeA[1] > rangeB[1]) {
                overlap = rangeA[0] - rangeB[1];
                testResult.aInB = false;
                // A is fully inside B.  Pick the shortest way out.
            } else {
                let option1 = rangeA[1] - rangeB[0];
                let option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }
        // If this is the smallest amount of overlap we've seen so far, set it as the minimum overlap.
        let absOverlap = Math.abs(overlap);
        if (absOverlap < testResult.overlap) {
            testResult.overlap = absOverlap;
            testResult.overlapN.set(axis);
            if (overlap < 0) {
                testResult.overlapN.reverse();
            }
        }
    }
    T_VECTORS.push(offsetV);
    T_ARRAYS.push(rangeA);
    T_ARRAYS.push(rangeB);
    return false;
}
// Check if two circles collide.
/**
 * @param {Circle} a The first circle.
 * @param {Circle} b The second circle.
 * @param {TestResult} testResult Response object (optional) that will be populated if
 *   the circles intersects.
 * @return {boolean} true if the circles intersects, false if they don't.
 */
export function testCircleCircle(a: Circle, b: Circle, testResult: TestResult) {
    // Check if the distance between the centers of the two
    // circles is greater than their combined radius.
    let differenceV = T_VECTORS.pop();
    if (differenceV === undefined)
        throw new Error('memory allocation error');
    differenceV.set(b.c).sub(a.c);
    let totalRadius = a.r + b.r;
    let totalRadiusSq = totalRadius * totalRadius;
    let distanceSq = differenceV.len2();
    // If the distance is bigger than the combined radius, they don't intersects.
    if (distanceSq > totalRadiusSq) {
        T_VECTORS.push(differenceV);
        return false;
    }
    // They intersects.  If we're calculating a testResult, calculate the overlap.
    if (testResult) {
        let dist = Math.sqrt(distanceSq);
        testResult.overlap = totalRadius - dist;
        testResult.overlapN.set(differenceV.normalize());
        testResult.overlapV.set(differenceV).scl(testResult.overlap);
        testResult.aInB= a.r <= b.r && dist <= b.r - a.r;
        testResult.bInA = b.r <= a.r && dist <= a.r - b.r;
    }
    T_VECTORS.push(differenceV);
    return true;
}

export function testPolygonPolygon(a: Polygon, b: Polygon, testResult: TestResult) {
    let aPoints = a.calcPoints;
    let aLen = aPoints.length;
    let bPoints = b.calcPoints;
    let bLen = bPoints.length;
    // If any of the edge normals of A is a separating axis, no intersection.
    for (let i = 0; i < aLen; i++) {
        let normal = T_VECTORS.pop();
        if (normal === undefined)
            throw new Error('memory allocation error');

        normal.set(aPoints[(i + 1) % aLen]).sub(aPoints[i]).perp().normalize();
        if (isSeparatingAxis(Vector.ZERO, Vector.ZERO, aPoints, bPoints, normal, testResult)) {
            T_VECTORS.push(normal);
            return false;
        }
        T_VECTORS.push(normal);
    }
    // If any of the edge normals of B is a separating axis, no intersection.
    for (let i = 0;i < bLen; i++) {
        let normal = T_VECTORS.pop();
        if (normal === undefined)
            throw new Error('memory allocation error');

        normal.set(bPoints[(i + 1) % bLen]).sub(bPoints[i]).perp().normalize();
        if (isSeparatingAxis(Vector.ZERO, Vector.ZERO, aPoints, bPoints, normal, testResult)) {
            T_VECTORS.push(normal);
            return false;
        }
        T_VECTORS.push(normal);
    }
    // Since none of the edge normals of A or B are a separating axis, there is an intersection
    // and we've already calculated the smallest overlap (in isSeparatingAxis).  Calculate the
    // final overlap vector.
    if (testResult) {
        testResult.overlapV.set(testResult.overlapN).scl(testResult.overlap);
    }
    return true;
}

enum VORONOI_REGION {
    LEFT = -1,
    MIDDLE = 0,
    RIGHT = 1,
}

// Calculates which Voronoi region a point is on a line segment.
// It is assumed that both the line and the point are relative to `(0,0)`
//
//            |       (0)      |
//     (-1)  [S]--------------[E]  (1)
//            |       (0)      |
/**
 * @param {Vector} line The line segment.
 * @param {Vector} point The point.
 * @return  {number} LEFT_VORONOI_REGION (-1) if it is the left region,
 *          MIDDLE_VORONOI_REGION (0) if it is the middle region,
 *          RIGHT_VORONOI_REGION (1) if it is the right region.
 */
function voronoiRegion(line: Vector, point: Vector) {
    let len2 = line.len2();
    let dp = point.dot(line);
    // If the point is beyond the start of the line, it is in the
    // left voronoi region.
    if (dp < 0) { return VORONOI_REGION.LEFT; }
    // If the point is beyond the end of the line, it is in the
    // right voronoi region.
    else if (dp > len2) { return VORONOI_REGION.RIGHT; }
    // Otherwise, it's in the middle one.
    else { return VORONOI_REGION.MIDDLE; }
}

/**
 * Check if a polygon and a circle collide.
 * @param {Polygon} polygon The polygon.
 * @param {Circle} circle The circle.
 * @param {TestResult} response Response object (optional) that will be populated if
 *   they interset.
 * @return {boolean} true if they intersects, false if they don't.
 */
export function testPolygonCircle(polygon: Polygon, circle: Circle, response: TestResult) {
    let circlePos = T_VECTORS.pop();
    if (circlePos === undefined)
        throw new Error('memory allocation error');
    // Get the position of the circle relative to the polygon.
    circlePos.set(circle.c);

    let radius = circle.r;
    let radius2 = radius * radius;
    let points = polygon.calcPoints;
    let len = points.length;

    let edge = T_VECTORS.pop();
    let point = T_VECTORS.pop();
    if (point === undefined || edge === undefined)
        throw new Error('memory allocation error');
    // For each edge in the polygon:
    for (let i = 0; i < len; i++) {
        let next = (i + 1) % len;
        let prev = (i - 1 + len) % len;
        let overlap = 0;
        let overlapN = null;

        // Get the edge.
        edge.set(polygon.calcPoints[next]).sub(polygon.calcPoints[i]);
        // Calculate the center of the circle relative to the starting point of the edge.
        point.set(circlePos).sub(points[i]);

        // If the distance between the center of the circle and the point
        // is bigger than the radius, the polygon is definitely not fully in
        // the circle.
        if (response && point.len2() > radius2) {
            response.aInB = false;
        }

        // Calculate which Voronoi region the center of the circle is in.
        let region = voronoiRegion(edge, point);
        // If it's the left region:
        if (region === VORONOI_REGION.LEFT) {
            // We need to make sure we're in the RIGHT_VORONOI_REGION of the previous edge.
            edge.set(polygon.calcPoints[i]).sub(polygon.calcPoints[prev]);
            // Calculate the center of the circle relative the starting point of the previous edge
            let point2 = T_VECTORS.pop();
            if (point2 === undefined)
                throw new Error('memory allocation error');
            point2.set(circlePos).sub(points[prev]);
            region = voronoiRegion(edge, point2);
            if (region === VORONOI_REGION.RIGHT) {
                // It's in the region we want.  Check if the circle intersects the point.
                let dist = point.len();
                if (dist > radius) {
                    // No intersection
                    T_VECTORS.push(circlePos);
                    T_VECTORS.push(edge);
                    T_VECTORS.push(point);
                    T_VECTORS.push(point2);
                    return false;
                } else if (response) {
                    // It intersects, calculate the overlap.
                    response.bInA = false;
                    overlapN = point.normalize();
                    overlap = radius - dist;
                }
            }
            T_VECTORS.push(point2);
            // If it's the right region:
        } else if (region === VORONOI_REGION.RIGHT) {
            // We need to make sure we're in the left region on the next edge
            edge.set(polygon.calcPoints[(next + 1) % len]).sub(polygon.calcPoints[next]);
            // Calculate the center of the circle relative to the starting point of the next edge.
            point.set(circlePos).sub(points[next]);
            region = voronoiRegion(edge, point);
            if (region === VORONOI_REGION.LEFT) {
                // It's in the region we want.  Check if the circle intersects the point.
                let dist = point.len();
                if (dist > radius) {
                    // No intersection
                    T_VECTORS.push(circlePos);
                    T_VECTORS.push(edge);
                    T_VECTORS.push(point);
                    return false;
                } else if (response) {
                    // It intersects, calculate the overlap.
                    response.bInA = false;
                    overlapN = point.normalize();
                    overlap = radius - dist;
                }
            }
            // Otherwise, it's the middle region:
        } else {
            // Need to check if the circle is intersecting the edge,
            // Change the edge into its "edge normal".
            let normal = edge.perp().normalize();
            // Find the perpendicular distance between the center of the
            // circle and the edge.
            let dist = point.dot(normal);
            let distAbs = Math.abs(dist);
            // If the circle is on the outside of the edge, there is no intersection.
            if (dist > 0 && distAbs > radius) {
                // No intersection
                T_VECTORS.push(circlePos);
                T_VECTORS.push(normal);
                T_VECTORS.push(point);
                return false;
            } else if (response) {
                // It intersects, calculate the overlap.
                overlapN = normal;
                overlap = radius - dist;
                // If the center of the circle is on the outside of the edge, or part of the
                // circle is on the outside, the circle is not fully inside the polygon.
                if (dist >= 0 || overlap < 2 * radius) {
                    response.bInA = false;
                }
            }
        }

        // If this is the smallest overlap we've seen, keep it.
        // (overlapN may be null if the circle was in the wrong Voronoi region).
        if (overlapN && response && Math.abs(overlap) < Math.abs(response.overlap)) {
            response.overlap = overlap;
            response.overlapN.set(overlapN);
        }
    }

    // Calculate the final overlap vector - based on the smallest overlap.
    if (response) {
        response.overlapV.set(response.overlapN).scl(response.overlap);
    }
    T_VECTORS.push(circlePos);
    T_VECTORS.push(edge);
    T_VECTORS.push(point);
    return true;
}

export function lineHasPoint(v1:Vector, v2:Vector, p:Vector, tolerance:number = 0.1) {
    return Math.abs(v1.dist2(v2) - (v1.dist2(p) + v2.dist2(p))) <= tolerance;
}

/**
 * Calculate distance and closest point between point and segment
 * @param pt the point
 * @param seg1 the start of segment
 * @param seg2 the end of segment
 * @param cp the closest point
 * @returns distance
 */
export function point2segment(pt: Vector, seg1: Vector, seg2: Vector, cp?: Vector) {
    /* Degenerated case of zero-length segment */
    if (seg1.equalsTo(seg2)) {
        if (cp !== undefined)
            cp.set(seg1);
        return pt.dist(seg1);
    }
    let vSeg = T_VECTORS.pop();
    let vSeg1 = T_VECTORS.pop();
    let vSeg2 = T_VECTORS.pop();

    if (vSeg === undefined || vSeg1 === undefined || vSeg2 === undefined) {
        throw new Error('temp variable memory allocation error');
    }
    vSeg.set(seg1).sub(seg2);
    vSeg1.set(seg1).sub(pt);
    vSeg2.set(seg2).sub(pt);

    let start_sp = vSeg.dot(vSeg1);
    let end_sp = -vSeg.dot(vSeg2);

    let dist;
    if (start_sp >= 0 && end_sp >= 0) {    /* point inside segment scope */
        // get unit vector
        vSeg.normalize();
        if (cp !== undefined)
            cp.set(seg1).addMul(vSeg, vSeg.dot(vSeg2));
        dist = Math.abs(vSeg.cross(vSeg2));
    } else if (start_sp < 0) {                             /* point is out of scope closer to ps */
        if (cp !== undefined)
            cp.set(seg1);
        dist = pt.dist(seg1);
    } else {                                               /* point is out of scope closer to pe */
        if (cp !== undefined)
            cp.set(seg2);
        dist = pt.dist(seg2);
    }
    T_VECTORS.push(vSeg);
    T_VECTORS.push(vSeg1);
    T_VECTORS.push(vSeg2);
    return dist;
};

export function point2polygon(pt:Vector, points:Array<Vector>, cp?: Vector): number {
    let n = points.length;
    let local_cp = T_VECTORS.pop();
    let min_dist = Number.POSITIVE_INFINITY;
    if (local_cp === undefined) {
        throw new Error('temp variable memory allocation error');
    }
    for (let i = 0; i < n; i++) {
        let next = (i + 1) % n;
        let dist = point2segment(pt, points[i], points[next], local_cp);
        if (min_dist > dist) {
            min_dist = dist;
            if (cp !== undefined) {
              cp.set(local_cp);
            }
        }
    }
    T_VECTORS.push(local_cp);
    return min_dist;
}