// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.
function GetTransform(positionX, positionY, rotation, scale) {
    const rad = rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Combined transformation matrix: T * R * S
    const m00 = cos * scale;
    const m01 = -sin * scale;
    const m10 = sin * scale;
    const m11 = cos * scale;

    return [
        m00, m10, 0,
        m01, m11, 0,
        positionX, positionY, 1
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform(trans1, trans2) {
    const result = new Array(9);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            result[col * 3 + row] =
                trans2[0 * 3 + row] * trans1[col * 3 + 0] +
                trans2[1 * 3 + row] * trans1[col * 3 + 1] +
                trans2[2 * 3 + row] * trans1[col * 3 + 2];
        }
    }

    return result;
}


