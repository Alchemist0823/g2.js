import {TestResult} from "./test-result";
import {AABB} from "./aabb";
import {Vector} from "./vector";

export interface Shape {
    intersect(shape: Shape, result: TestResult): boolean;
    isPointIn(vector: Vector): boolean;
    getAABB(): AABB;
}
