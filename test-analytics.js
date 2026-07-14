import fs from 'fs';

// Mock DB
const engine = {
    db: {
        familyList: [],
        birth: [],
        death: [],
        marriage: [],
        places: [],
        names: []
    }
};

const COLUMNS = {
    places: { id: "place_id", nameCurrent: "name_current" },
    death: { personId: "person_id", cause: "d_cause" }
};

let placesCount = {};
let topPlaces = Object.entries(placesCount).sort((a, b) => b[1].total - a[1].total);
console.log("topPlaces:", topPlaces);
