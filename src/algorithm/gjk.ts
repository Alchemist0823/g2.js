//https://github.com/kroitor/gjk.c

import {Vector} from "../vector";
import {Polygon} from "../polygon";
import * as util from "../util";

/**
 * GJK (collision detection)
 */
function tripleProduct(a:Vector,  b:Vector,  c:Vector,  r: Vector) {
    let ac = a.x * c.x + a.y * c.y; // perform a.dot(c)
    let bc = b.x * c.x + b.y * c.y; // perform b.dot(c)

    // perform b * a.dot(c) - a * b.dot(c)
    r.x = b.x * ac - a.x * bc;
    r.y = b.y * ac - a.y * bc;
    return r;
}

//-----------------------------------------------------------------------------
// This is to compute average center (roughly). It might be different from
// Center of Gravity, especially for bodies with nonuniform density,
// but this is ok as initial direction of simplex search in GJK.

function averagePoint (vertices: Array<Vector>) {
    let avg = new Vector();
    for (let i = 0; i < vertices.length; i++) {
        avg.x += vertices[i].x;
        avg.y += vertices[i].y;
    }
    avg.x /= vertices.length;
    avg.y /= vertices.length;
    return avg;
}

//-----------------------------------------------------------------------------
// Get furthest vertex along a certain direction

function indexOfFurthestPoint (vertices: Array<Vector>, d: Vector) {

    let maxProduct = d.dot(vertices[0]);
    let index = 0;
    for (let i = 1; i < vertices.length; i++) {
        let product = d.dot(vertices[i]);
        if (product > maxProduct) {
            maxProduct = product;
            index = i;
        }
    }
    return index;
}

//-----------------------------------------------------------------------------
// Minkowski sum support function for GJK

function support (vertices1: Array<Vector>, vertices2: Array<Vector>, d: Vector) {

    // get furthest point of first body along an arbitrary direction
    let i = indexOfFurthestPoint (vertices1, d);

    // get furthest point of second body along the opposite direction
    let j = indexOfFurthestPoint (vertices2, d.clone().reverse());

    // subtract (Minkowski sum) the two points to see if bodies 'overlap'
    return vertices1[i].clone().sub(vertices2[j]);
}

//-----------------------------------------------------------------------------
// The GJK yes/no test
function gjk (vertices1: Array<Vector>, vertices2: Array<Vector>) {
    let iter_count = 0;
    let index = 0; // index of current vertex of simplex
    let a: Vector = new Vector(), b: Vector = new Vector(), c: Vector = new Vector(), d: Vector = new Vector();
    let ao: Vector = new Vector(), ab: Vector = new Vector(), ac: Vector = new Vector();
    let abperp: Vector = new Vector(), acperp: Vector = new Vector();
    let simplex: [Vector, Vector, Vector] = [new Vector(), new Vector(), new Vector()];

    let position1 = averagePoint (vertices1); // not a CoG but
    let position2 = averagePoint (vertices2); // it's ok for GJK )

    // initial direction from the center of 1st body to the center of 2nd body

    d.set(position1).sub(position2);

    // if initial direction is zero – set it to any arbitrary axis (we choose X)
    if ((d.x == 0) && (d.y == 0))
        d.x = 1;

    // set the first support as initial point of the new simplex
    a.set(simplex[0].set(support (vertices1, vertices2, d)));

    if (a.dot(d) <= 0)
        return 0; // no collision

    d.set(a).reverse(); // The next search direction is always towards the origin, so the next search direction is negate(a)

    while (1) {
        iter_count++;

        a.set(simplex[++index].set(support (vertices1, vertices2, d)));

        if (a.dot(d) <= 0)
            return 0; // no collision

        ao.set(a).reverse(); // from point A to Origin is just negative A

        // simplex has 2 points (a line segment, not a triangle yet)
        if (index < 2) {
            b.set(simplex[0]);
            ab.set(b).sub(a); // from point A to B
            tripleProduct (ab, ao, ab, d); // normal to AB towards Origin
            if (d.len2() == 0)
                d.set(ab).perp();
            continue; // skip to next iteration
        }

        b.set(simplex[1]);
        c.set(simplex[0]);
        ab.set(b.sub(a)); // from point A to B
        ac.set(c.sub(a)); // from point A to C

        tripleProduct(ab, ac, ac, acperp);

        if (acperp.dot(ao) >= 0) {

            d.set(acperp); // new direction is normal to AC towards Origin

        } else {

            tripleProduct (ac, ab, ab, acperp);

            if (abperp.dot(ao) < 0)
                return 1; // collision

            simplex[0].set(simplex[1]); // swap first element (point C)

            d.set(abperp); // new direction is normal to AB towards Origin
        }

        simplex[1].set(simplex[2]); // swap element in the middle (point B)
        --index;
    }
    return 0;
}

/* test
function Perturbation()
{
    return Math.random() * FLT_EPSILON * 100.0 * (Math.random() > 0.5 ? 1.0 : -1.0);
}

function Jostle(vec2 a)
{
    vec2 b;
    b.x = a.x + Perturbation();
    b.y = a.y + Perturbation();
    return b;
}
int main(int argc, const char * argv[]) {

    // test case from dyn4j

    vec2 vertices1[] = {
    { 4.0f, 11.0f },
    { 5.0f, 5.0f },
    { 9.0f, 9.0f },
};

    vec2 vertices2[] = {
    { 4.0f, 11.0f },
    { 5.0f, 5.0f },
    { 9.0f, 9.0f },
};

    size_t count1 = sizeof (vertices1) / sizeof (vec2); // == 3
    size_t count2 = sizeof (vertices2) / sizeof (vec2); // == 4

    while (1)
    {
        vec2 a[sizeof (vertices1) / sizeof (vec2)];
        vec2 b[sizeof (vertices2) / sizeof (vec2)];

        for (size_t i = 0; i < count1; ++i) a[i] = Jostle(vertices1[i]);
        for (size_t i = 0; i < count2; ++i) b[i] = Jostle(vertices2[i]);

        int collisionDetected = gjk (a, count1, b, count2);
        if (!collisionDetected)
        {
            printf("Found failing case:\n\t{%f, %f}, {%f, %f}, {%f, %f}\n\t{%f, %f}, {%f, %f}, {%f, %f}\n\n",
                a[0].x, a[0].y, a[1].x, a[1].y, a[2].x, a[2].y,
                b[0].x, b[0].y, b[1].x, b[1].y, b[2].x, b[2].y
            );
        }
        else
        {
            printf("Collision correctly detected\n");
        }
        iter_count = 0;
    }

    return 0;
}*/

