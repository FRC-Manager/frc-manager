'use strict';
/* FRC Manager — the world map and season scouting (v3.0 careers).
   G.Geo: a simple map of North America with the six areas, the districts, the cities teams come from and where every
   team and event sits. G.Scout: what every team has done this season (OPR and its auto / teleop / endgame split,
   record, best finish), from the events the match engine played and from the fast simulation of all the others. */
(function () {
  const U = G.U, D = G.Data;
  const Geo = G.Geo = {}, Sc = G.Scout = {};

  // ---------- projection: longitude and latitude to map units (1000 x 622) ----------
  const LON0 = -128, LAT0 = 57, KX = 1000 / 68, KY = KX / 0.78;
  Geo.W = 1000; Geo.H = 622;
  Geo.xy = (lon, lat) => [(lon - LON0) * KX, (LAT0 - lat) * KY];
  Geo.path = poly => 'M' + poly.map(p => { const q = Geo.xy(p[0], p[1]); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z';
  const inPoly = (poly, lon, lat) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  Geo.inPoly = inPoly;

  // ---------- land and water (rough outlines; the border runs through the middle of the Great Lakes) ----------
  const BORDER = [[-66.95, 44.81], [-67.79, 45.7], [-67.79, 47.07], [-68.9, 47.18], [-69.24, 47.45], [-70.0, 46.7], [-70.3, 45.9], [-71.5, 45.01], [-74.7, 45.0], [-75.8, 44.4], [-76.4, 44.1],
    [-79.2, 43.45], [-79.05, 42.95], [-81.0, 42.25], [-83.1, 42.0], [-83.15, 42.35], [-82.5, 43.0], [-82.2, 44.0], [-82.5, 45.3], [-83.5, 45.9], [-84.2, 46.5], [-84.8, 46.9], [-88.4, 48.3],
    [-89.6, 48.0], [-95.15, 49.0], [-123.3, 49.0], [-123.2, 48.3], [-124.7, 48.4]];
  Geo.US = BORDER.concat([[-124.6, 47.9], [-124.0, 46.3], [-124.1, 43.0], [-124.4, 40.4], [-123.8, 39.0], [-122.5, 37.8], [-121.9, 36.6], [-121.0, 35.5], [-120.6, 34.6], [-118.5, 34.0], [-117.1, 32.55],
    [-114.7, 32.72], [-111.0, 31.33], [-108.2, 31.33], [-108.2, 31.78], [-106.5, 31.78], [-104.5, 29.6], [-103.0, 29.0], [-102.4, 29.8], [-101.4, 29.77], [-99.5, 27.5], [-97.4, 25.9],
    [-97.2, 27.6], [-96.0, 28.6], [-94.7, 29.4], [-93.8, 29.7], [-92.0, 29.6], [-91.0, 29.2], [-89.4, 28.9], [-89.7, 30.2], [-88.0, 30.4], [-87.0, 30.4], [-85.4, 29.8], [-84.0, 30.0], [-83.0, 29.1],
    [-82.6, 27.8], [-82.0, 26.5], [-81.1, 25.2], [-80.4, 25.2], [-80.1, 26.0], [-80.0, 27.0], [-80.6, 28.5], [-81.2, 29.8], [-81.4, 30.7], [-80.9, 32.0], [-79.2, 33.2], [-77.9, 33.9], [-76.5, 34.7],
    [-75.5, 35.3], [-75.9, 36.9], [-75.6, 37.9], [-75.1, 38.6], [-74.9, 38.9], [-74.0, 39.8], [-74.0, 40.5], [-73.0, 40.7], [-71.9, 41.1], [-71.0, 41.5], [-70.0, 41.7], [-70.5, 42.2], [-70.6, 42.7],
    [-70.2, 43.6], [-69.0, 44.1], [-67.6, 44.5]]);
  Geo.CA = [[-140, 62], [-50, 62], [-55, 52], [-56.5, 51.4], [-59.0, 47.6], [-60.0, 46.2], [-61.5, 45.2], [-63.6, 44.5], [-65.8, 43.6], [-66.2, 44.4], [-64.7, 45.4]]
    .concat(BORDER, [[-125.4, 48.9], [-127.4, 50.1], [-128.3, 50.8], [-130.0, 53.6], [-130.6, 54.7], [-131.5, 56.0], [-135, 59]]);
  Geo.WATER = [
    [[-92.1, 46.75], [-90.5, 46.6], [-88.9, 46.85], [-87.6, 46.45], [-85.3, 46.75], [-84.6, 46.45], [-84.65, 47.0], [-85.0, 47.8], [-86.5, 48.7], [-88.3, 48.85], [-89.4, 48.3], [-90.8, 47.9], [-91.8, 47.2]], // Superior
    [[-87.55, 41.65], [-86.75, 41.75], [-86.2, 42.6], [-86.45, 43.6], [-86.2, 44.6], [-85.55, 45.2], [-84.8, 45.75], [-85.5, 46.05], [-86.6, 45.9], [-87.6, 44.9], [-87.9, 43.9], [-87.8, 42.6]], // Michigan
    [[-84.75, 45.85], [-84.0, 46.15], [-82.5, 46.0], [-81.3, 45.95], [-80.4, 45.4], [-80.15, 44.8], [-80.9, 44.6], [-81.7, 44.1], [-81.7, 43.3], [-82.4, 43.0], [-82.6, 43.9], [-83.3, 44.05], [-83.4, 44.9], [-84.0, 45.6]], // Huron
    [[-83.45, 41.72], [-82.6, 41.45], [-81.6, 41.5], [-80.5, 41.95], [-79.75, 42.25], [-78.9, 42.85], [-79.6, 42.85], [-80.4, 42.6], [-81.4, 42.65], [-82.1, 42.1], [-82.9, 42.05]], // Erie
    [[-79.8, 43.3], [-78.9, 43.35], [-77.5, 43.25], [-76.3, 43.5], [-76.2, 44.15], [-76.9, 44.05], [-77.9, 43.95], [-79.4, 43.65]], // Ontario
    [[-95.5, 58], [-92.4, 57.0], [-88.7, 56.5], [-85.5, 55.3], [-82.3, 55.1], [-82.2, 53.0], [-80.7, 51.3], [-79.6, 51.2], [-78.9, 52.0], [-79.0, 54.1], [-77.0, 55.6], [-77.4, 58]], // Hudson and James Bay
    [[-71.0, 46.9], [-69.6, 48.0], [-67.2, 49.2], [-64.4, 50.2], [-58, 50.4], [-58, 46.0], [-60.4, 46.0], [-61.5, 45.7], [-62.5, 45.75], [-64.0, 46.3], [-64.8, 47.8], [-65.6, 48.1], [-66.6, 48.9], [-68.5, 48.6], [-70.2, 47.3]], // Gulf of St. Lawrence
    [[-66.95, 44.95], [-66.0, 45.3], [-64.5, 45.4], [-64.4, 45.15], [-65.5, 44.7], [-66.2, 44.3]] // Bay of Fundy
  ];
  // the six areas (cut to the land when drawn); Canada is its own outline
  Geo.REGION = {
    West: [[-131, 50], [-111.05, 50], [-111.05, 42.0], [-114.05, 42.0], [-114.05, 36.2], [-114.6, 35.0], [-114.6, 32.72], [-114.8, 30], [-131, 30]],
    Southwest: [[-114.05, 42.0], [-111.05, 42.0], [-111.05, 41.0], [-102.05, 41.0], [-102.05, 37.0], [-94.6, 37.0], [-94.6, 36.5], [-94.45, 35.4], [-94.48, 33.64], [-94.04, 33.55], [-94.04, 31.99],
      [-93.84, 31.2], [-93.84, 29.7], [-93.8, 22], [-114.8, 22], [-114.8, 30], [-114.6, 32.72], [-114.6, 35.0], [-114.05, 36.2]],
    Midwest: [[-111.05, 50], [-80.52, 50], [-80.52, 40.64], [-80.6, 40.6], [-82.6, 38.4], [-83.7, 38.6], [-84.8, 39.1], [-85.8, 38.3], [-86.5, 38.0], [-87.6, 37.9], [-88.1, 37.5], [-89.1, 37.0],
      [-89.5, 36.5], [-90.15, 36.5], [-94.6, 36.5], [-94.6, 37.0], [-102.05, 37.0], [-102.05, 41.0], [-111.05, 41.0], [-111.05, 42.0]],
    Northeast: [[-80.52, 50], [-58, 50], [-58, 38.0], [-75.2, 38.0], [-76.4, 38.0], [-77.1, 38.9], [-77.8, 39.3], [-79.48, 39.2], [-79.48, 39.72], [-80.52, 39.72], [-80.52, 40.64]],
    Southeast: [[-80.52, 40.64], [-80.52, 39.72], [-79.48, 39.72], [-79.48, 39.2], [-77.8, 39.3], [-77.1, 38.9], [-76.4, 38.0], [-75.2, 38.0], [-58, 38.0], [-58, 20], [-93.8, 20], [-93.8, 22],
      [-93.84, 29.7], [-93.84, 31.2], [-94.04, 31.99], [-94.04, 33.55], [-94.48, 33.64], [-94.45, 35.4], [-94.6, 36.5], [-90.15, 36.5], [-89.5, 36.5], [-89.1, 37.0], [-88.1, 37.5], [-87.6, 37.9],
      [-86.5, 38.0], [-85.8, 38.3], [-84.8, 39.1], [-83.7, 38.6], [-82.6, 38.4], [-80.6, 40.6]],
    Canada: Geo.CA
  };
  Geo.DIST = {
    lakeshore: [[-87.2, 41.76], [-84.8, 41.7], [-83.45, 41.73], [-82.3, 42.9], [-82.3, 43.9], [-83.3, 45.0], [-84.5, 46.0], [-85.6, 45.6], [-86.6, 44.8], [-86.6, 43.2], [-86.9, 42.2]],
    harbor: [[-73.73, 40.98], [-73.5, 42.05], [-73.26, 42.75], [-73.35, 45.01], [-71.5, 45.01], [-70.0, 46.7], [-69.24, 47.45], [-67.79, 47.07], [-66.0, 44.6], [-69.5, 41.0], [-71.9, 40.9]],
    evergreen: [[-126, 49.2], [-117.04, 49.2], [-117.04, 46.0], [-116.9, 45.6], [-116.5, 45.5], [-117.0, 44.3], [-117.03, 42.0], [-126, 42.0]],
    mesa: [[-106.65, 31.9], [-103.06, 32.0], [-103.04, 36.5], [-100.0, 36.5], [-100.0, 34.56], [-99.2, 34.4], [-97.1, 33.8], [-95.5, 33.9], [-94.48, 33.64], [-94.04, 33.55], [-94.04, 31.99],
      [-93.84, 31.2], [-93.84, 29.7], [-93.8, 24], [-97.0, 24], [-99.5, 27.0], [-101.4, 29.3], [-103.0, 28.6], [-104.6, 29.4], [-106.5, 31.7]],
    sierra: [[-126, 42.0], [-120.0, 42.0], [-120.0, 39.0], [-114.6, 35.0], [-114.6, 32.72], [-117.12, 32.53], [-126, 30]]
  };
  // where the area and district names sit on the map
  // (on open ground or water, away from the big cities, so the team circles do not cover them)
  Geo.LABEL = { West: [-115.6, 38.6], Southwest: [-108.7, 37.6], Midwest: [-99.5, 44.6], Northeast: [-64.5, 41.0], Southeast: [-90.0, 32.0], Canada: [-100, 53.6],
    lakeshore: [-85.0, 47.0], harbor: [-70.15, 45.65, 'start'], evergreen: [-119.5, 42.35], mesa: [-102.3, 30.8], sierra: [-120.6, 40.9] };
  // the Championship cities
  Geo.CITY = { 'St. Louis': [-90.2, 38.63], Houston: [-95.37, 29.76], Detroit: [-83.1, 42.36] };

  // ---------- the cities teams come from: [name, area, district (if inside one), lon, lat, weight] ----------
  Geo.HUBS = [
    ['Toronto', 'Canada', null, -79.4, 43.75, 5], ['Waterloo', 'Canada', null, -80.5, 43.47, 1.5], ['London', 'Canada', null, -81.25, 42.98, 0.6], ['Windsor', 'Canada', null, -82.95, 42.28, 0.5],
    ['Ottawa', 'Canada', null, -75.7, 45.4, 1.2], ['Montreal', 'Canada', null, -73.6, 45.55, 2.2], ['Quebec City', 'Canada', null, -71.3, 46.8, 0.6], ['Halifax', 'Canada', null, -63.6, 44.7, 0.4],
    ['Vancouver', 'Canada', null, -122.9, 49.25, 1.5], ['Calgary', 'Canada', null, -114.05, 51.05, 0.8], ['Edmonton', 'Canada', null, -113.5, 53.55, 0.6], ['Winnipeg', 'Canada', null, -97.15, 49.9, 0.4],
    ['Chicago', 'Midwest', null, -87.85, 41.85, 4], ['Milwaukee', 'Midwest', null, -88.05, 43.05, 1.5], ['Madison', 'Midwest', null, -89.4, 43.07, 0.8], ['Minneapolis', 'Midwest', null, -93.3, 44.98, 3],
    ['Indianapolis', 'Midwest', null, -86.15, 39.77, 2], ['Columbus', 'Midwest', null, -83.0, 39.96, 1.5], ['Cleveland', 'Midwest', null, -81.7, 41.35, 1.2], ['Cincinnati', 'Midwest', null, -84.5, 39.15, 1],
    ['St. Louis', 'Midwest', null, -90.3, 38.63, 1.5], ['Kansas City', 'Midwest', null, -94.6, 39.1, 1], ['Des Moines', 'Midwest', null, -93.6, 41.6, 0.6], ['Omaha', 'Midwest', null, -96.0, 41.25, 0.5],
    ['Fargo', 'Midwest', null, -96.8, 46.88, 0.3], ['Duluth', 'Midwest', null, -92.2, 46.7, 0.4], ['Wichita', 'Midwest', null, -97.3, 37.7, 0.4], ['Billings', 'Midwest', null, -108.5, 45.8, 0.25],
    ['Marquette', 'Midwest', null, -87.5, 46.4, 0.3],
    ['Detroit', 'Midwest', 'lakeshore', -83.3, 42.5, 5], ['Ann Arbor', 'Midwest', 'lakeshore', -83.75, 42.28, 1.5], ['Grand Rapids', 'Midwest', 'lakeshore', -85.67, 42.96, 2], ['Lansing', 'Midwest', 'lakeshore', -84.55, 42.73, 1.5],
    ['Kalamazoo', 'Midwest', 'lakeshore', -85.59, 42.29, 1], ['Flint', 'Midwest', 'lakeshore', -83.69, 43.01, 1], ['Saginaw', 'Midwest', 'lakeshore', -83.95, 43.42, 0.7], ['Traverse City', 'Midwest', 'lakeshore', -85.62, 44.76, 0.5],
    ['Muskegon', 'Midwest', 'lakeshore', -86.1, 43.23, 0.5], ['Port Huron', 'Midwest', 'lakeshore', -82.7, 42.97, 0.4],
    ['New York', 'Northeast', null, -73.95, 40.75, 3], ['North Jersey', 'Northeast', null, -74.4, 40.85, 2], ['Central Jersey', 'Northeast', null, -74.6, 40.3, 1.2], ['Philadelphia', 'Northeast', null, -75.2, 40.0, 3],
    ['Pittsburgh', 'Northeast', null, -80.0, 40.44, 1], ['Buffalo', 'Northeast', null, -78.75, 42.88, 1], ['Rochester', 'Northeast', null, -77.6, 43.12, 1], ['Syracuse', 'Northeast', null, -76.15, 43.05, 0.6],
    ['Albany', 'Northeast', null, -73.8, 42.65, 0.7], ['Long Island', 'Northeast', null, -73.2, 40.8, 1], ['Baltimore', 'Northeast', null, -76.6, 39.3, 1.3], ['Harrisburg', 'Northeast', null, -76.9, 40.27, 0.6],
    ['Wilmington', 'Northeast', null, -75.55, 39.75, 0.4],
    ['Boston', 'Northeast', 'harbor', -71.25, 42.38, 4], ['Worcester', 'Northeast', 'harbor', -71.8, 42.27, 1], ['Hartford', 'Northeast', 'harbor', -72.7, 41.77, 1.5], ['New Haven', 'Northeast', 'harbor', -72.93, 41.4, 0.8],
    ['Providence', 'Northeast', 'harbor', -71.42, 41.82, 1], ['Manchester', 'Northeast', 'harbor', -71.46, 42.99, 1.5], ['Portland, Maine', 'Northeast', 'harbor', -70.4, 43.7, 0.7], ['Burlington', 'Northeast', 'harbor', -73.2, 44.48, 0.4],
    ['Springfield', 'Northeast', 'harbor', -72.6, 42.1, 0.6], ['Bangor', 'Northeast', 'harbor', -68.8, 44.8, 0.3],
    ['Atlanta', 'Southeast', null, -84.4, 33.75, 3], ['Raleigh', 'Southeast', null, -78.65, 35.8, 2.5], ['Charlotte', 'Southeast', null, -80.85, 35.22, 2], ['Orlando', 'Southeast', null, -81.4, 28.55, 2],
    ['Miami', 'Southeast', null, -80.3, 25.85, 1.4], ['Tampa', 'Southeast', null, -82.4, 28.0, 1.2], ['Jacksonville', 'Southeast', null, -81.7, 30.3, 0.8], ['Nashville', 'Southeast', null, -86.8, 36.15, 1],
    ['Richmond', 'Southeast', null, -77.45, 37.55, 1.5], ['Northern Virginia', 'Southeast', null, -77.3, 38.85, 2], ['Norfolk', 'Southeast', null, -76.35, 36.85, 0.7], ['New Orleans', 'Southeast', null, -90.1, 30.0, 0.7],
    ['Birmingham', 'Southeast', null, -86.8, 33.5, 0.7], ['Louisville', 'Southeast', null, -85.75, 38.2, 0.8], ['Columbia', 'Southeast', null, -81.0, 34.0, 0.6], ['Knoxville', 'Southeast', null, -83.9, 35.95, 0.5],
    ['Little Rock', 'Southeast', null, -92.3, 34.75, 0.4], ['Memphis', 'Southeast', null, -89.95, 35.15, 0.5],
    ['Phoenix', 'Southwest', null, -112.05, 33.5, 2], ['Tucson', 'Southwest', null, -110.95, 32.25, 0.6], ['Albuquerque', 'Southwest', null, -106.6, 35.1, 0.6], ['Denver', 'Southwest', null, -104.95, 39.7, 2],
    ['Colorado Springs', 'Southwest', null, -104.8, 38.85, 0.6], ['Salt Lake City', 'Southwest', null, -111.9, 40.7, 1.3], ['Oklahoma City', 'Southwest', null, -97.5, 35.5, 0.8], ['Tulsa', 'Southwest', null, -95.95, 36.15, 0.6],
    ['Las Cruces', 'Southwest', null, -106.8, 32.4, 0.2],
    ['Houston', 'Southwest', 'mesa', -95.45, 29.8, 3], ['Dallas', 'Southwest', 'mesa', -96.85, 32.8, 3], ['Fort Worth', 'Southwest', 'mesa', -97.35, 32.75, 1], ['Austin', 'Southwest', 'mesa', -97.75, 30.3, 2],
    ['San Antonio', 'Southwest', 'mesa', -98.5, 29.45, 1.5], ['El Paso', 'Southwest', 'mesa', -106.4, 31.82, 0.4], ['Lubbock', 'Southwest', 'mesa', -101.85, 33.58, 0.3], ['Corpus Christi', 'Southwest', 'mesa', -97.5, 27.8, 0.4],
    ['Las Vegas', 'West', null, -115.15, 36.15, 1], ['Reno', 'West', null, -119.75, 39.5, 0.6], ['Boise', 'West', null, -116.2, 43.6, 0.6], ['Missoula', 'West', null, -114.0, 46.87, 0.25], ['Idaho Falls', 'West', null, -112.0, 43.5, 0.2],
    ['Seattle', 'West', 'evergreen', -122.3, 47.6, 4], ['Tacoma', 'West', 'evergreen', -122.45, 47.25, 1.2], ['Everett', 'West', 'evergreen', -122.2, 47.95, 0.8], ['Portland', 'West', 'evergreen', -122.65, 45.5, 2.5],
    ['Salem', 'West', 'evergreen', -123.0, 44.93, 0.6], ['Eugene', 'West', 'evergreen', -123.1, 44.05, 0.5], ['Spokane', 'West', 'evergreen', -117.4, 47.65, 0.7], ['Bend', 'West', 'evergreen', -121.3, 44.05, 0.3],
    ['Yakima', 'West', 'evergreen', -120.5, 46.6, 0.3],
    ['Los Angeles', 'West', 'sierra', -118.25, 34.05, 4], ['Orange County', 'West', 'sierra', -117.85, 33.75, 1.5], ['San Diego', 'West', 'sierra', -117.1, 32.8, 2], ['Inland Empire', 'West', 'sierra', -117.35, 34.05, 1],
    ['San Francisco Bay', 'West', 'sierra', -122.1, 37.55, 4], ['San Jose', 'West', 'sierra', -121.9, 37.3, 1.5], ['Sacramento', 'West', 'sierra', -121.45, 38.6, 1.2], ['Fresno', 'West', 'sierra', -119.8, 36.75, 0.8],
    ['Santa Barbara', 'West', 'sierra', -119.7, 34.45, 0.5], ['Bakersfield', 'West', 'sierra', -119.0, 35.37, 0.4]
  ].map(a => ({ n: a[0], r: a[1], d: a[2], lon: a[3], lat: a[4], w: a[5] }));

  const formed = (d, cy) => !!D.DISTRICT[d] && D.DISTRICT[d].from <= cy;
  // the cities a team of this area can come from (a district that has not formed yet is still regional country)
  Geo.hubsFor = function (region, dist, cy) {
    const list = dist ? Geo.HUBS.filter(x => x.d === dist) : Geo.HUBS.filter(x => x.r === region && (!x.d || !formed(x.d, cy)));
    return list.length ? list : Geo.HUBS.filter(x => x.r === region);
  };
  const water = (lon, lat) => Geo.WATER.some(p => inPoly(p, lon, lat));
  // is this point a fair place for a team of that area?
  function fits(lon, lat, region, dist, cy) {
    if (water(lon, lat)) return false;
    if (region === 'Canada') return inPoly(Geo.CA, lon, lat) && !inPoly(Geo.US, lon, lat);
    if (!inPoly(Geo.US, lon, lat)) return false;
    if (dist) return inPoly(Geo.DIST[dist], lon, lat);
    if (!inPoly(Geo.REGION[region], lon, lat)) return false;
    return !Object.keys(Geo.DIST).some(d => formed(d, cy) && inPoly(Geo.DIST[d], lon, lat));
  }
  // a team's spot on the map: always the same for the same team and home
  const cache = {};
  Geo.teamPos = function (num, region, dist, cy) {
    const fk = Object.keys(Geo.DIST).filter(d => formed(d, cy)).join(','), key = num + '|' + region + '|' + (dist || '') + '|' + fk;
    if (cache[key]) return cache[key];
    const rng = G.makeRng((num * 2654435761) >>> 0 || 7), hubs = Geo.hubsFor(region, dist, cy), hb = rng.wpick(hubs, x => x.w);
    const sd = 0.22 + 0.12 * Math.sqrt(hb.w);
    let lon = hb.lon, lat = hb.lat;
    for (let i = 0; i < 8; i++) {
      const a = hb.lon + rng.norm(0, sd), b = hb.lat + rng.norm(0, sd * 0.75);
      if (fits(a, b, region, dist, cy)) { lon = a; lat = b; break; }
    }
    return (cache[key] = { xy: Geo.xy(lon, lat), hub: hb.n });
  };
  // an event's city: district events round the district's cities, regionals round the area's (biggest first)
  Geo.eventPos = function (ws, e) {
    const cy = ws.cy, hubs = Geo.hubsFor(e.region, e.dist, cy).slice().sort((a, b) => b.w - a.w);
    const same = ws.events.filter(x => x.kind === e.kind && (e.dist ? x.dist === e.dist : !x.dist && x.region === e.region));
    const k = e.kind === 'dcmp' ? 0 : same.indexOf(e), hb = hubs[Math.max(0, k) % hubs.length], lap = Math.floor(Math.max(0, k) / hubs.length);
    const xy = Geo.xy(hb.lon, hb.lat);
    return { xy: [xy[0] + lap * 7, xy[1] - lap * 5], hub: hb.n };
  };
  Geo.areaName = (region, dist) => (dist ? D.DISTRICT[dist].name : region + ' (regional)');

  // ---------- season scouting ----------
  // How many points a robot adds in auto, teleop and endgame, by team strength, in this season's game: measured once a
  // season with the match engine (six robots of one strength a match), so the simulated events read like the ones you play.
  const LV = [10, 22, 34, 46, 58, 70, 82, 94];
  // least-squares parabola through (x, y): a smooth curve through noisy measurements
  const fit2 = (xs, ys) => {
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    xs.forEach((x, i) => { const v = [1, x, x * x]; for (let r = 0; r < 3; r++) { b[r] += v[r] * ys[i]; for (let c = 0; c < 3; c++) M[r][c] += v[r] * v[c]; } });
    for (let c = 0; c < 3; c++) for (let r = c + 1; r < 3; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k < 3; k++) M[r][k] -= f * M[c][k]; b[r] -= f * b[c]; }
    const w = [0, 0, 0]; for (let r = 2; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < 3; k++) s -= M[r][k] * w[k]; w[r] = s / M[r][r]; }
    return x => w[0] + w[1] * x + w[2] * x * x;
  };
  Sc.curve = function (S) {
    const ws = S.wseason; if (!ws) return null;
    if (ws.cal && ws.cal.gy === ws.gy && ws.cal.v === 2) return ws.cal;
    const gy = ws.gy, rng = G.makeRng(7919 + gy * 31 + (ws.cy || 0)), raw = [];
    LV.forEach((s, li) => {
      let a = 0, t = 0, e = 0, n = 0;
      for (let i = 0; i < 4; i++) {
        const ent = k => G.AI.entry({ num: 90000 + li * 10 + k, str: s, rb: null }, gy, 1, 1, rng);
        try {
          const r = G.Engine.run(G.Engine.create({ year: gy, red: [ent(0), ent(1), ent(2)], blue: [ent(3), ent(4), ent(5)], seed: rng.int(1, 1e9), headless: true }));
          ['red', 'blue'].forEach(x => { a += r[x].auto; t += r[x].tele; e += r[x].end; n += 3; });
        } catch (err) { /* a broken calibration match counts for nothing */ }
      }
      raw.push(n ? [a / n, t / n, e / n] : null);
    });
    const ok = LV.map((s, i) => i).filter(i => raw[i]), cal = { v: 2, gy, lv: LV, p: LV.map(() => [0, 0, 0]) };
    [0, 1, 2].forEach(j => {
      const f = fit2(ok.map(i => LV[i] / 100), ok.map(i => raw[i][j]));
      let m = 0; LV.forEach((s, i) => { m = Math.max(m, f(s / 100), 0); cal.p[i][j] = m; }); // stronger never scores less
    });
    return (ws.cal = cal);
  };
  Sc.at = function (cal, s) {
    const lv = cal.lv, p = cal.p;
    if (s <= lv[0]) return p[0].map(v => v * Math.max(0.2, s / lv[0]));
    for (let i = 1; i < lv.length; i++) if (s <= lv[i]) { const f = (s - lv[i - 1]) / (lv[i] - lv[i - 1]); return [0, 1, 2].map(j => p[i - 1][j] + (p[i][j] - p[i - 1][j]) * f); }
    return p[lv.length - 1].slice();
  };
  const hashStr = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; };
  const r1 = v => Math.round(v * 10) / 10;
  // A robot scores a little less in a mixed field (defenders, crowded paths) than with partners and opponents of its own
  // strength: at the events you play, AI teams' OPR came to 0.89 to 0.97 of the curve (2019, 2024, 2026).
  Sc.MIX = 0.93;
  // A team's style for a season: how much more (or less) than an average robot of its strength it scores in auto and in
  // the endgame. The same at all its events that season; on average 1.
  Sc.style = function (num, gy) {
    const r = G.makeRng(((num * 2246822519) ^ (gy * 3266489917)) >>> 0 || 3);
    return [Math.exp(r.norm(0, 0.3) - 0.045), Math.exp(r.norm(0, 0.75) - 0.28)];
  };
  // the scouting numbers of a simulated event (its own random numbers: the world simulation's results stay as they were)
  Sc.simStats = function (S, e, teams, st) {
    const cal = Sc.curve(S), out = {}; if (!cal) return out;
    const rng = G.makeRng(hashStr(e.id + ':' + (S.wseason.cy || 0)));
    const wm = e.kind === 'dcmp' ? 1.03 : 0.85 + 0.03 * ((e.week || 1) - 1), dm = { easy: 0.9, normal: 1, hard: 1.1 }[S.diff] || 1, k = Math.pow(wm * dm, 1 / 1.3);
    teams.forEach(t => {
      const p = Sc.at(cal, st[t] * k).map(v => v * Sc.MIX), f = Sc.style(t, cal.gy);
      // the team's own style moves points between the periods; its total stays what its strength gives
      const a0 = p[0] * f[0], e0 = p[2] * f[1], t0 = Math.max(p[1] * 0.3, p[0] + p[1] + p[2] - a0 - e0);
      const au = Math.max(0, a0 * (1 + rng.norm(0, 0.15))), te = Math.max(0, t0 * (1 + rng.norm(0, 0.1))), en = Math.max(0, e0 * (1 + rng.norm(0, 0.2)));
      out[t] = [r1(au + te + en), r1(au), r1(te), r1(en)];
    });
    return out;
  };
  // the scouting numbers of an event you played, from its matches
  Sc.evStats = function (ev, num) {
    const o = G.Ev.opr(ev), a = G.Ev.oprPart(ev, 'auto'), t = G.Ev.oprPart(ev, 'tele'), e = G.Ev.oprPart(ev, 'end'), r = ev.rank[num] || {};
    // (a least-squares split can come out a little below zero for a team that never scores in that period: shown as 0)
    return { s: [r1(o[num] || 0), r1(Math.max(0, a[num] || 0)), r1(Math.max(0, t[num] || 0)), r1(Math.max(0, e[num] || 0))], wl: [r.w || 0, r.l || 0, r.t || 0], rs: r.played ? Math.round(r.rp / r.played * 100) / 100 : 0 };
  };
  // best finish first
  Sc.FIN = { Winner: 1, Finalist: 2, '3rd place': 3, Semifinalist: 3, '4th place': 4, 'Lower R2': 5, 'Lower R1': 6, Quarterfinalist: 6 };
  // one row per team: everything it has done in this season's events so far
  Sc.rows = function (S) {
    const ws = S.wseason, me = S.team.num, cy = ws.cy, rows = [];
    const add = (num, region, dist, rookie, str) => {
      const recs = ws.rec[num] || [], sr = recs.filter(r => r.s), n = sr.length;
      const row = { num, me: num === me, region, dist, area: dist ? D.DISTRICT[dist].short + ' District' : region, rookie, str, ev: recs.length, q: num === me ? !!S.season.champsQualified : !!ws.q[num],
        w: 0, l: 0, t: 0, wp: null, rs: null, opr: null, au: null, te: null, en: null, best: 9, bestTxt: '', wins: 0, aw: 0 };
      recs.forEach(r => {
        const f = Sc.FIN[r.f] || (r.a ? 7 : 9); if (f < row.best) { row.best = f; row.bestTxt = r.f || (r.a ? 'Alliance ' + r.a : ''); }
        if (r.f === 'Winner') row.wins++; row.aw += (r.aw || []).length;
      });
      if (row.best === 9 && recs.length) row.bestTxt = 'Qualifications';
      if (n) {
        sr.forEach(r => { row.w += r.wl[0]; row.l += r.wl[1]; row.t += r.wl[2]; });
        const g = row.w + row.l + row.t; row.wp = g ? (row.w + row.t / 2) / g : 0;
        row.rs = Math.round(sr.reduce((s, r) => s + (r.rs || 0), 0) / n * 100) / 100;
        ['opr', 'au', 'te', 'en'].forEach((k, j) => { row[k] = r1(sr.reduce((s, r) => s + r.s[j], 0) / n); });
      }
      rows.push(row);
    };
    Object.values(S.teams).forEach(t => add(t.num, t.region, t.home || null, t.ry === cy, t.str));
    add(me, S.team.region, S.team.home || null, S.profile === 'rookie' && S.cal[0] === cy, null);
    return rows;
  };
  // the last competition week with results
  Sc.week = S => (S.wseason ? S.wseason.events.filter(e => e.done).reduce((m, e) => Math.max(m, e.week), 0) : 0);
})();
