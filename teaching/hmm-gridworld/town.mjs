// The street geometry is shared by the illustration and both Markov models.
// Every consecutive pair in a street is joined by unit orthogonal road edges.
export const TOWN = {
  name: "Linden Town",
  width: 18,
  height: 14,
  streets: [
    [
      [2, 1],
      [8, 1],
    ],
    [
      [1, 3],
      [16, 3],
    ],
    [
      [0, 6],
      [9, 6],
    ],
    [
      [1, 9],
      [16, 9],
    ],
    [
      [2, 11],
      [6, 11],
    ],
    [
      [2, 1],
      [2, 11],
    ],
    [
      [6, 1],
      [6, 11],
    ],
    [
      [9, 3],
      [9, 9],
    ],
    [
      [14, 1],
      [14, 11],
    ],
    [
      [14, 1],
      [16, 1],
      [16, 3],
    ],
    [
      [14, 6],
      [17, 6],
    ],
    [
      [13, 11],
      [16, 11],
    ],
    [
      [4, 0],
      [4, 1],
    ],
    [
      [4, 3],
      [4, 4],
    ],
    [
      [4, 7],
      [6, 7],
    ],
    [
      [4, 11],
      [4, 12],
    ],
  ],
  landmarks: [
    { name: "Station", x: 4, y: 0 },
    { name: "Bakery", x: 0, y: 6 },
    { name: "Cafe", x: 4, y: 4 },
    { name: "Park", x: 4, y: 7 },
    { name: "Town Hall", x: 9, y: 6 },
    { name: "Library", x: 4, y: 12 },
    { name: "School", x: 6, y: 11 },
    { name: "Hospital", x: 17, y: 6 },
    { name: "Harbor", x: 13, y: 11 },
  ],
  bridges: [3, 9],
};
