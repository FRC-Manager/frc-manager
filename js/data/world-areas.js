'use strict';
/* FRC Manager — the world's areas (3.5): where teams come from outside the five areas of the United States, with the
   real numbers behind them. Teams, team numbers, event places, the best teams and the average strength of every area
   follow the real seasons of 2016 to 2026 (FIRST's team index for the teams, The Blue Alliance for the events, match13
   for the ratings). Team origins are areas of the world, never countries; events keep made-up names in real places. */
(function () {
  const D = G.Data;

  // ---------- areas, neighbours and travel ----------
  D.US_REGIONS = ['West', 'Southwest', 'Midwest', 'Northeast', 'Southeast'];
  D.REGIONS = D.US_REGIONS.concat(['North', 'Central America', 'South America', 'Europe', 'Anatolia', 'Middle East', 'East Asia', 'Asia Pacific']);
  D.REGION_OLD = { Canada: 'North' }; // names from before 3.5 (old saves)
  // a drive away
  D.ADJ = {
    West: ['Southwest'], Southwest: ['West', 'Midwest', 'Southeast', 'Central America'], Midwest: ['Southwest', 'Northeast', 'Southeast', 'North'],
    Northeast: ['Midwest', 'Southeast', 'North'], Southeast: ['Southwest', 'Midwest', 'Northeast'], North: ['Midwest', 'Northeast'],
    'Central America': ['Southwest'], 'South America': [], Europe: [], Anatolia: [], 'Middle East': [], 'East Asia': [], 'Asia Pacific': []
  };
  // the part of the world an area is in: a flight inside it is an ordinary one, a flight out of it goes overseas
  D.GROUP = { West: 'NA', Southwest: 'NA', Midwest: 'NA', Northeast: 'NA', Southeast: 'NA', North: 'NA', 'Central America': 'NA', 'South America': 'SA', Europe: 'EME', Anatolia: 'EME', 'Middle East': 'EME', 'East Asia': 'EA', 'Asia Pacific': 'AP' };
  // where an area's teams go when they have to travel far (the world simulation's teams; yours go where you send them)
  D.NEAR = { 'South America': ['Central America', 'Southeast'], 'Central America': ['South America'], Europe: ['Anatolia', 'Northeast'], Anatolia: ['Europe', 'Middle East'], 'Middle East': ['Anatolia', 'Europe'], 'East Asia': ['Asia Pacific', 'West'], 'Asia Pacific': ['East Asia', 'West'] };
  D.overseas = (home, region) => (D.GROUP[home] || 'NA') !== (D.GROUP[region] || 'NA');
  D.TRAVEL.intl = { name: 'Fly overseas', cost: 15000 };
  D.INTL_KNOCKS = [6, 12];  // condition lost by a robot shipped overseas (an ordinary flight: 4 to 9)
  D.FATIGUE_INTL = 3;       // jet lag: an event overseas tires the team a little more
  D.travelTier = (home, region, localFlag) => (home === region ? (localFlag ? 'local' : 'drive') : (D.ADJ[home] || []).includes(region) ? 'drive' : D.overseas(home, region) ? 'intl' : 'fly');
  // how likely a team of `home` is to enter an event in `region`
  D.goW = (home, region) => (home === region ? 3 : (D.ADJ[home] || []).includes(region) ? 1.1 : (D.NEAR[home] || []).includes(region) ? 0.5 : D.overseas(home, region) ? 0.03 : 0.2);
  // the Championship's half of the world in the years with two Championships (1: the northern one)
  D.SIDE1 = ['Midwest', 'Northeast', 'North', 'Europe', 'Anatolia', 'Middle East'];

  // ---------- the areas outside the United States ----------
  // Their teams follow the real numbers (D.NUMS), about one team in the game for every 2.2 real ones, so that an area
  // can fill its own events. sites: the cities that host a regional each season, about one for every two real ones
  // (none in a season the area really had none). names: what a regional in that city is called.
  D.SCALE = 1 / 2.2;
  // (the Middle East has no zone of its own: all of its cities are the Levant District's, before and after it forms)
  D.EXPLICIT = ['North', 'trillium', 'Central America', 'South America', 'Europe', 'Anatolia', 'levant', 'East Asia', 'Asia Pacific'];
  D.WORLD_AREAS = {
    North: { sites: { 2016: ['Toronto', 'Waterloo', 'Windsor', 'Montreal'], 2017: ['Montreal'], 2018: ['Montreal', 'Victoria'], 2019: ['Montreal', 'Calgary'], 2020: ['Montreal', 'Victoria'], 2022: ['Montreal'], 2023: ['Victoria'], 2024: ['Montreal'], 2025: ['Vancouver'], 2026: ['Montreal'] },
      names: { Toronto: ['Maple Leaf'], Waterloo: ['Grand River'], Windsor: ['Border Lakes'], Montreal: ['Laurentian'], Victoria: ['Pacific Rainforest'], Vancouver: ['Coast Mountains'], Calgary: ['Rocky Summit'] },
      about: 'A few dozen teams from the Saint Lawrence to the Pacific, and one regional most years.' },
    'Central America': { sites: { 2016: ['Mexico City'], 2017: ['Torreon'], 2018: ['Monterrey'], 2019: ['Monterrey', 'Mexico City'], 2020: ['Monterrey'], 2022: ['Monterrey'], 2023: ['Monterrey', 'Torreon'], 2024: ['Monterrey', 'Torreon'], 2025: ['Monterrey', 'Torreon'], 2026: ['Monterrey'] },
      names: { 'Mexico City': ['Valley of the Volcanoes'], Monterrey: ['Saddle Mountain'], Torreon: ['Desert Lagoon'] },
      about: 'Industrial cities of the north and a capital on a high plateau.' },
    'South America': { sites: { 2023: ['Brasilia'], 2024: ['Brasilia'], 2025: ['Sao Paulo'], 2026: ['Sao Paulo'] },
      names: { Brasilia: ['Central Plateau'], 'Sao Paulo': ['Tropic Line'] }, first: 2023,
      about: 'A handful of veteran teams, then dozens of new ones from 2023, when its first regional arrives.' },
    Europe: { sites: {}, names: {},
      about: 'A few scattered teams and no regional at all: the nearest are a flight away in Anatolia.' },
    Anatolia: { sites: { 2018: ['Istanbul'], 2019: ['Istanbul'], 2020: ['Istanbul'], 2022: ['Istanbul', 'Izmir'], 2023: ['Istanbul', 'Izmir'], 2024: ['Istanbul', 'Istanbul'], 2025: ['Istanbul', 'Istanbul', 'Ankara'], 2026: ['Istanbul', 'Istanbul', 'Istanbul', 'Ankara'] },
      names: { Istanbul: ['Two Continents', 'Tulip Gardens', 'Strait Lights'], Izmir: ['Aegean Breeze'], Ankara: ['Steppe Winds'] }, first: 2018,
      about: 'The fastest-growing area in the world: a dozen teams in 2016, about a hundred ten years later. No regional of its own before 2018, and no district.' },
    // every city of the Middle East is one of the Levant District's: its teams play one regional in 2016 and district events from 2017
    'Middle East': { sites: { 2016: ['Tel Aviv'] }, names: { 'Tel Aviv': ['Coastal Plain'] },
      about: 'A small coast where every team is an hour from every other, and the level is high.' },
    'East Asia': { sites: { 2017: ['Shenzhen'], 2018: ['Shanghai'], 2020: ['Taichung', 'Beijing'], 2022: ['Taipei'], 2025: ['Taipei'], 2026: ['Shanghai'] },
      names: { Shenzhen: ['Pearl Delta'], Shanghai: ['Great River Delta'], Taichung: ['Island Peaks'], Beijing: ['Jade Capital'], Taipei: ['Jade Mountain'] }, first: 2017,
      about: 'Coastal megacities and an island of makers; the numbers rise, fall and rise again.' },
    'Asia Pacific': { sites: { 2016: ['Sydney'], 2017: ['Sydney'], 2018: ['Sydney'], 2019: ['Sydney'], 2020: ['Sydney'], 2022: ['Sydney'], 2023: ['Sydney'], 2024: ['Sydney'], 2025: ['Sydney'], 2026: ['Sydney'] },
      names: { Sydney: ['Blue Mountains'] },
      about: 'Mostly one harbour city and its coast, with a few teams across a very wide ocean.' }
  };
  D.isExplicit = a => D.EXPLICIT.includes(a);
  D.regionThe = r => (D.US_REGIONS.includes(r) || r === 'North' || r === 'Middle East' ? 'the ' : '') + r; // "in the West", "in East Asia"
  // the seasons the tables know: 2021 was not played, later years (a fantasy single season) repeat 2026
  D.dataYear = cy => (cy <= 2016 ? 2016 : cy === 2021 ? 2020 : cy >= 2026 ? 2026 : cy);
  D.sitesOf = (region, cy) => ((D.WORLD_AREAS[region] || {}).sites || {})[cy] || [];

  // ---------- names with a local flavour ----------
  // Default school names and sponsor names by the team's home (a district's own list first, then its area's, then the
  // general one). All made up; they borrow the industries and the school types of each part of the world.
  D.SCHOOL_BY = {
    West: ['Sierra Vista High School', 'Palo Verde High School', 'Canyon Crest Academy', 'Golden Valley High School', 'Silver State Technical Academy', 'Sawtooth Ridge High School', 'Bitterroot Valley High School', 'Trade Winds Academy'],
    sierra: ['Mission Hills High School', 'Sierra Vista High School', 'Redwood Shores High School', 'Canyon Crest Academy', 'Golden Valley High School', 'El Camino High School'],
    evergreen: ['Cedar Ridge High School', 'Rainier View High School', 'Salmon Creek High School', 'Puget Sound Academy', 'Douglas Fir High School'],
    Southwest: ['Mesa Vista High School', 'Red Canyon High School', 'Saguaro High School', 'Front Range High School', 'Sandia Peak High School'],
    mesa: ['Lone Star High School', 'Bluebonnet High School', 'Brazos Valley High School', 'Alamo Heights Academy', 'Cedar Creek High School', 'Longhorn Trail High School'],
    Midwest: ['Prairie View High School', 'Maple Grove High School', 'Lincoln Central High School', 'Twin Lakes High School', 'Cornerstone Academy', 'River Bend High School'],
    lakeshore: ['Lakeshore High School', 'Motor City Technical High School', 'Grand Traverse High School', 'Pine River High School', 'Huron Valley High School', 'Assembly Line Career Academy'],
    Northeast: ['Hudson Valley High School', 'Liberty Regional High School', 'Keystone Central High School', 'Brooklyn Bridge Technical High School', 'Chesapeake Academy'],
    harbor: ['Old Mill Regional High School', 'Minuteman Regional High School', 'Granite Hills High School', 'Whaling City Academy', 'Covered Bridge High School'],
    Southeast: ['Magnolia High School', 'Cypress Creek High School', 'Palmetto Ridge High School', 'Peachtree Academy', 'Blue Ridge High School', 'Space Coast High School'],
    North: ['Laurentian Secondary School', 'Rocky Ridge Secondary School', 'Salish Coast Secondary School', 'Saint-Laurent College', 'Prairie Sky Collegiate'],
    trillium: ['Grand River Collegiate Institute', 'Lakeshore Secondary School', 'Trillium Heights Secondary School', 'Escarpment District High School', 'St. Brendan Catholic Secondary School'],
    'Central America': ['North Technological Preparatory', 'Sierra Madre Preparatory', 'Laguna Technical Institute', 'Valley Bachillerato', 'Agave Hills College', 'Ozama Polytechnic School', 'Two Oceans Bilingual Academy'],
    'South America': ['Industry Social Service School', 'Planalto Technical School', 'Santa Cruz College', 'Serra Azul Industrial School', 'Tropic Institute of Technology', 'Cordillera Scientific Lyceum', 'Andean Valley Technical Institute'],
    Europe: ['Canal District Lyceum', 'Old Town Gymnasium', 'International School of the Lowlands', 'Vistula Technical Secondary School', 'Alpine Cantonal School', 'Thames Reach Sixth Form College', 'Vltava Technical Gymnasium', 'Rhone Valley Lycee',
      'Azure Coast Lycee', 'Kvarner Bay Technical School', 'Vitosha Mathematics High School', 'Transylvanian Hills National College', 'Attica Model Lyceum', 'Lake Malaren Technical Gymnasium', 'Dnipro Riverside Lyceum'],
    Anatolia: ['Bosphorus Science High School', 'Golden Hills Anatolian High School', 'Strait Private College', 'Plateau Science and Art Centre', 'Aegean Anatolian High School'],
    levant: ['Carmel Technological High School', 'Coastal Plain Science High School', 'Desert Blossom High School', 'Galilee Regional School', 'Sharon Youth Village School'],
    'East Asia': ['Pearl Delta Experimental School', 'No. 2 High School of the Eastern District', 'Jade Mountain Senior High School', 'River Delta Foreign Language School', 'Affiliated High School of Island Normal University', 'Lotus Bay International School', 'Sumida River Technical High School', 'Han River Science High School', 'Kowloon Bay Secondary School'],
    'Asia Pacific': ['Harbour City Grammar School', 'Blue Gum Secondary College', 'Outback Community High School', 'St. Alba\'s College', 'Coral Coast State High School', 'Lotus Valley Public School', 'Lion City Secondary School', 'Long White Cloud College',
      'Saigon River High School for the Gifted', 'Klang Valley International School', 'Pasig River Science High School']
  };
  D.SCHOOL_BY['Middle East'] = D.SCHOOL_BY.levant;
  // A school named after a place stands in that place: the cities (G.Geo.HUBS) its name points to. Your team is put
  // in one of them that its home has (G.Geo.teamPos); a name that is not here could be anywhere in the home.
  D.SCHOOL_AT = {
    'Sierra Vista High School': ['Reno', 'Las Vegas'], 'Palo Verde High School': ['Las Vegas'], 'Silver State Technical Academy': ['Las Vegas', 'Reno'], 'Sawtooth Ridge High School': ['Boise', 'Idaho Falls'],
    'Bitterroot Valley High School': ['Missoula'], 'Trade Winds Academy': ['Honolulu'], 'Redwood Shores High School': ['San Francisco Bay', 'San Jose'],
    'Rainier View High School': ['Tacoma', 'Seattle'], 'Puget Sound Academy': ['Seattle', 'Tacoma', 'Everett'],
    'Saguaro High School': ['Phoenix', 'Tucson'], 'Front Range High School': ['Denver', 'Colorado Springs'], 'Sandia Peak High School': ['Albuquerque'],
    'Brazos Valley High School': ['Houston'], 'Alamo Heights Academy': ['San Antonio'],
    'Motor City Technical High School': ['Detroit'], 'Grand Traverse High School': ['Traverse City'], 'Huron Valley High School': ['Ann Arbor', 'Detroit'], 'Assembly Line Career Academy': ['Detroit', 'Flint'],
    'Hudson Valley High School': ['Albany', 'New York'], 'Keystone Central High School': ['Harrisburg', 'Philadelphia', 'Pittsburgh'], 'Brooklyn Bridge Technical High School': ['New York'], 'Chesapeake Academy': ['Baltimore'],
    'Minuteman Regional High School': ['Boston'], 'Granite Hills High School': ['Manchester'], 'Whaling City Academy': ['Providence'],
    'Palmetto Ridge High School': ['Columbia'], 'Peachtree Academy': ['Atlanta'], 'Blue Ridge High School': ['Knoxville', 'Charlotte'], 'Space Coast High School': ['Orlando'],
    'Laurentian Secondary School': ['Montreal', 'Trois-Rivieres', 'Quebec City'], 'Rocky Ridge Secondary School': ['Calgary', 'Lethbridge'], 'Salish Coast Secondary School': ['Vancouver', 'Victoria'],
    'Saint-Laurent College': ['Montreal', 'Trois-Rivieres', 'Quebec City'], 'Prairie Sky Collegiate': ['Regina', 'Winnipeg', 'Edmonton', 'Lethbridge'],
    'Grand River Collegiate Institute': ['Waterloo'], 'Escarpment District High School': ['Hamilton', 'St. Catharines', 'Owen Sound'],
    'North Technological Preparatory': ['Monterrey', 'Saltillo', 'Torreon', 'Chihuahua', 'Reynosa'], 'Sierra Madre Preparatory': ['Monterrey', 'Saltillo', 'Durango'], 'Laguna Technical Institute': ['Torreon'],
    'Valley Bachillerato': ['Mexico City', 'Toluca'], 'Agave Hills College': ['Guadalajara'], 'Ozama Polytechnic School': ['Santo Domingo'], 'Two Oceans Bilingual Academy': ['Panama City'],
    'Planalto Technical School': ['Brasilia', 'Goiania'], 'Tropic Institute of Technology': ['Sao Paulo', 'Campinas', 'Sao Jose dos Campos'],
    'Industry Social Service School': ['Sao Paulo', 'Sao Jose dos Campos', 'Campinas', 'Rio de Janeiro', 'Brasilia', 'Cuiaba', 'Goiania', 'Porto Alegre', 'Joinville', 'Curitiba', 'Belo Horizonte', 'Salvador', 'Fortaleza', 'Recife', 'Natal', 'Manaus', 'Belem', 'Vitoria', 'Campo Grande'],
    'Serra Azul Industrial School': ['Belo Horizonte', 'Curitiba', 'Joinville', 'Porto Alegre', 'Rio de Janeiro', 'Vitoria', 'Cuiaba', 'Campo Grande'],
    'Cordillera Scientific Lyceum': ['Santiago'], 'Andean Valley Technical Institute': ['Cali', 'Medellin'],
    'Old Town Gymnasium': ['Prague', 'Krakow', 'Lublin'], 'Thames Reach Sixth Form College': ['Greater London'], 'Vltava Technical Gymnasium': ['Prague'], 'Rhone Valley Lycee': ['Lyon'], 'Azure Coast Lycee': ['Nice'],
    'Kvarner Bay Technical School': ['Rijeka'], 'Vitosha Mathematics High School': ['Sofia'], 'Transylvanian Hills National College': ['Cluj'], 'Attica Model Lyceum': ['Athens'], 'Lake Malaren Technical Gymnasium': ['Stockholm'], 'Dnipro Riverside Lyceum': ['Kyiv'],
    'Canal District Lyceum': ['Eindhoven', 'Groningen'], 'International School of the Lowlands': ['Eindhoven', 'Groningen'], 'Vistula Technical Secondary School': ['Warsaw', 'Krakow'], 'Alpine Cantonal School': ['Zurich'],
    'Bosphorus Science High School': ['Istanbul'], 'Strait Private College': ['Istanbul'], 'Plateau Science and Art Centre': ['Ankara', 'Eskisehir', 'Konya'], 'Aegean Anatolian High School': ['Izmir', 'Mugla'],
    'Carmel Technological High School': ['Haifa', 'Binyamina'], 'Coastal Plain Science High School': ['Tel Aviv', 'Herzliya', 'Netanya', 'Rehovot', 'Ashkelon'], 'Desert Blossom High School': ['Be\'er Sheva'],
    'Galilee Regional School': ['Afula'], 'Sharon Youth Village School': ['Netanya', 'Herzliya'],
    'Pearl Delta Experimental School': ['Guangzhou', 'Shenzhen'], 'Jade Mountain Senior High School': ['Taipei', 'Chiayi', 'Taichung'], 'River Delta Foreign Language School': ['Shanghai', 'Suzhou', 'Hangzhou', 'Nanjing'],
    'Affiliated High School of Island Normal University': ['Taipei', 'Taichung', 'Kaohsiung'],
    'No. 2 High School of the Eastern District': ['Shanghai', 'Beijing', 'Suzhou', 'Hangzhou', 'Qingdao', 'Zhengzhou', 'Wuhan', 'Jinan', 'Nanjing', 'Kunming', 'Chengdu'],
    'Sumida River Technical High School': ['Tokyo'], 'Han River Science High School': ['Seoul'], 'Kowloon Bay Secondary School': ['Hong Kong'],
    'Lotus Valley Public School': ['Delhi', 'Mumbai'], 'Lion City Secondary School': ['Singapore'], 'Long White Cloud College': ['Auckland'], 'Saigon River High School for the Gifted': ['Ho Chi Minh City'],
    'Klang Valley International School': ['Kuala Lumpur'], 'Pasig River Science High School': ['Manila'],
    'Harbour City Grammar School': ['Sydney'], 'Blue Gum Secondary College': ['Melbourne'], 'Outback Community High School': ['Coonabarabran'], 'Coral Coast State High School': ['Brisbane']
  };
  // A school of its own for every city of the map: each of these stands in that one city and nowhere else, so that
  // any city a home's teams come from can be chosen by its school. (The lists above keep the schools that point to a
  // wider place, or to nowhere in particular; what a school of an earlier version pointed to is never changed, so
  // that no team of an older save moves.) home: { city: school }.
  D.SCHOOL_IN = {
    West: { 'Las Vegas': 'Palo Verde High School', Reno: 'Truckee Meadows High School', Boise: 'Treasure Valley High School', Missoula: 'Bitterroot Valley High School', 'Idaho Falls': 'Teton View High School', Honolulu: 'Trade Winds Academy' },
    evergreen: { Seattle: 'Elliott Bay High School', Tacoma: 'Commencement Bay High School', Everett: 'Port Gardner High School', Portland: 'Rose City High School', Salem: 'Cherry City High School', Eugene: 'Emerald Valley High School',
      Spokane: 'Lilac City High School', Bend: 'Three Sisters High School', Yakima: 'Hop Valley High School' },
    sierra: { 'Los Angeles': 'Griffith Heights High School', 'Orange County': 'Citrus Coast High School', 'San Diego': 'Cabrillo Shores High School', 'Inland Empire': 'Inland Valley Technical High School', 'San Francisco Bay': 'Bayshore Technical High School',
      'San Jose': 'Orchard Valley High School', Sacramento: 'Confluence High School', Fresno: 'Raisin Valley High School', 'Santa Barbara': 'Channel View High School', Bakersfield: 'Grapevine Pass High School' },
    Southwest: { Phoenix: 'Valley of the Sun High School', Tucson: 'Old Pueblo High School', Albuquerque: 'Sandia Peak High School', Denver: 'Platte River High School', 'Colorado Springs': 'Red Rock Garden High School',
      'Salt Lake City': 'Wasatch Front High School', 'Oklahoma City': 'Land Run High School', Tulsa: 'Oil Capital High School', 'Las Cruces': 'Pecan Valley High School' },
    mesa: { Houston: 'Bayou City High School', Dallas: 'Trinity River High School', 'Fort Worth': 'Cowtown Technical High School', Austin: 'Barton Hills High School', 'San Antonio': 'Alamo Heights Academy', 'El Paso': 'Sun City High School',
      Lubbock: 'Llano Estacado High School', 'Corpus Christi': 'Coastal Bend High School' },
    Midwest: { Chicago: 'Windy City Technical High School', Milwaukee: 'Cream City High School', Madison: 'Four Lakes High School', Minneapolis: 'Mill City High School', Indianapolis: 'Circle City High School', Columbus: 'Scioto River High School',
      Cleveland: 'North Coast High School', Cincinnati: 'Queen City Technical High School', 'St. Louis': 'Mound City High School', 'Kansas City': 'Fountain City High School', 'Des Moines': 'Raccoon River High School', Omaha: 'Gate City High School',
      Fargo: 'Red River Valley High School', Duluth: 'Twin Ports High School', Wichita: 'Air Capital High School', Billings: 'Rimrock High School', Marquette: 'Superior Shore High School' },
    lakeshore: { Detroit: 'Motor City Technical High School', 'Ann Arbor': 'Tree Town High School', 'Grand Rapids': 'River Rapids High School', Lansing: 'Red Cedar High School', Kalamazoo: 'Celery Flats High School', Flint: 'Vehicle City High School',
      Saginaw: 'Bay Timber High School', 'Traverse City': 'Grand Traverse High School', Muskegon: 'Port City High School', 'Port Huron': 'Blue Water High School' },
    Northeast: { 'New York': 'Brooklyn Bridge Technical High School', 'North Jersey': 'Meadowlands Technical High School', 'Central Jersey': 'Pine Barrens Regional High School', Philadelphia: 'Boathouse Row High School', Pittsburgh: 'Steel City High School',
      Buffalo: 'Niagara Frontier High School', Rochester: 'Flower City High School', Syracuse: 'Salt City High School', Albany: 'Patroon Creek High School', 'Long Island': 'Great South Bay High School', Baltimore: 'Chesapeake Academy',
      Harrisburg: 'Midstate Technical High School', Wilmington: 'Christina River High School' },
    harbor: { Boston: 'Minuteman Regional High School', Worcester: 'Quinsigamond Lake High School', Hartford: 'Charter Oak High School', 'New Haven': 'Elm City High School', Providence: 'Narragansett Bay High School', Manchester: 'Granite Hills High School',
      'Portland, Maine': 'Head Light High School', Burlington: 'Lake Champlain Academy', Springfield: 'Hoop City High School', Bangor: 'Lumber Capital High School' },
    Southeast: { Atlanta: 'Peachtree Academy', Raleigh: 'Oak City High School', Charlotte: 'Crown Town High School', Orlando: 'Space Coast High School', Miami: 'Biscayne Bay High School', Tampa: 'Cigar City High School', Jacksonville: 'Bold City High School',
      Nashville: 'Music City High School', Richmond: 'Fall Line High School', 'Northern Virginia': 'Beltway Technical High School', Norfolk: 'Hampton Roads Maritime High School', 'New Orleans': 'Crescent City High School', Birmingham: 'Magic City High School',
      Louisville: 'Derby City High School', Columbia: 'Palmetto Ridge High School', Knoxville: 'Marble City High School', 'Little Rock': 'Rock Ridge High School', Memphis: 'Blues City High School' },
    North: { Montreal: 'Mount Royal Collegiate', Sherbrooke: 'Eastern Townships Secondary School', 'Quebec City': 'Cap Diamant College', 'Trois-Rivieres': 'Saint-Maurice College', Vancouver: 'Burrard Inlet Secondary School', Victoria: 'Garden City Secondary School',
      Kelowna: 'Okanagan Lake Secondary School', Calgary: 'Bow River High School', Lethbridge: 'Coulee Winds High School', Edmonton: 'River Valley Composite High School', Winnipeg: 'The Forks Collegiate', Regina: 'Wascana Lake Collegiate' },
    trillium: { Toronto: 'Don Valley Collegiate Institute', Mississauga: 'Credit River Secondary School', Brampton: 'Flower Town Secondary School', Markham: 'Rouge River Collegiate', Hamilton: 'Bayfront Technical Secondary School', London: 'Forest City Secondary School',
      Windsor: 'Ambassador Collegiate', Waterloo: 'Grand River Collegiate Institute', 'St. Catharines': 'Twelve Mile Creek Secondary School', Kingston: 'Limestone City Collegiate', Ottawa: 'Rideau Canal Collegiate', Barrie: 'Kempenfelt Bay Secondary School',
      Oshawa: 'Oshawa Creek Collegiate', Sarnia: 'Chemical Valley Secondary School', 'North Bay': 'Nipissing Shores Secondary School', Sudbury: 'Nickel City Secondary School', 'Owen Sound': 'Scenic City Secondary School' },
    'Central America': { Monterrey: 'Cerro de la Silla Preparatory', Torreon: 'Laguna Technical Institute', 'Mexico City': 'Twin Volcanoes College', Toluca: 'Nevado Technical Institute', Guadalajara: 'Agave Hills College', 'San Luis Potosi': 'Potosi Silver College',
      Chihuahua: 'Copper Canyon Preparatory', Hermosillo: 'Sonoran Sun Preparatory', Saltillo: 'Sarape Technical Institute', Leon: 'Leather Capital College', Queretaro: 'Aqueduct College', Puebla: 'Talavera College', Tampico: 'Gulf Port Technical School',
      Reynosa: 'Rio Bravo Technical Preparatory', Durango: 'Scorpion Hills Preparatory', Morelia: 'Cantera Rosa College', Culiacan: 'Humaya River Institute', Merida: 'Yucatan Sun College', 'Santo Domingo': 'Ozama Polytechnic School', 'Panama City': 'Two Oceans Bilingual Academy' },
    'South America': { 'Sao Paulo': 'Paulista Avenue Technical School', 'Sao Jose dos Campos': 'Aeronautics Valley Technical School', Campinas: 'Swallows Institute of Technology', 'Rio de Janeiro': 'Sugarloaf College', Brasilia: 'Pilot Plan School',
      Cuiaba: 'Pantanal Gate Technical School', Goiania: 'Cerrado Flower Institute', 'Porto Alegre': 'Guaiba Shore College', Joinville: 'City of Princes Technical School', Curitiba: 'Araucaria Pines College', 'Belo Horizonte': 'Curral Ridge School',
      Salvador: 'All Saints Bay College', Fortaleza: 'Green Sea Institute', Recife: 'Reef City Technical School', Natal: 'Dunes Institute', Manaus: 'Meeting of Waters School', Belem: 'Mango Trees College', Vitoria: 'Island Bay Technical School',
      'Campo Grande': 'Morena Plains School', Santiago: 'Cordillera Scientific Lyceum', Cali: 'Cauca Valley Technical Institute', Medellin: 'Eternal Spring Institute' },
    Europe: { 'Greater London': 'Thames Reach Sixth Form College', Eindhoven: 'City of Light Lyceum', Groningen: 'Martini Tower Lyceum', Prague: 'Vltava Technical Gymnasium', Lyon: 'Rhone Valley Lycee', Nice: 'Azure Coast Lycee', Warsaw: 'Royal Route Lyceum',
      Lublin: 'Castle Hill Lyceum', Krakow: 'Wawel Hill Lyceum', Zurich: 'Alpine Cantonal School', Rijeka: 'Kvarner Bay Technical School', Sofia: 'Vitosha Mathematics High School', Cluj: 'Transylvanian Hills National College', Athens: 'Attica Model Lyceum',
      Stockholm: 'Lake Malaren Technical Gymnasium', Kyiv: 'Dnipro Riverside Lyceum' },
    Anatolia: { Istanbul: 'Bosphorus Science High School', Ankara: 'Citadel Science High School', Izmir: 'Clock Tower Anatolian High School', Kocaeli: 'Gulf Shore Technical High School', Eskisehir: 'Porsuk River Science High School',
      Antalya: 'Turquoise Coast Anatolian High School', Bursa: 'Uludag Slopes Science High School', Mugla: 'Blue Voyage Anatolian High School', Diyarbakir: 'Basalt Walls Science High School', Adana: 'Stone Bridge Anatolian High School',
      Antakya: 'Orontes Valley High School', Konya: 'Seljuk Plains Science High School' },
    levant: { 'Tel Aviv': 'White City Technological High School', Herzliya: 'Marina Heights High School', Netanya: 'Sharon Cliffs High School', 'Modi\'in': 'Maccabee Hills High School', Rehovot: 'Orchard Science High School', Jerusalem: 'Judean Hills High School',
      Haifa: 'Bay Terraces High School', Binyamina: 'Vineyard Valley Regional School', Afula: 'Galilee Regional School', 'Be\'er Sheva': 'Desert Blossom High School', Ashkelon: 'Southern Dunes High School' },
    'East Asia': { Shanghai: 'Huangpu River Experimental High School', Shenzhen: 'Special Zone Science High School', Beijing: 'Western Hills High School', Suzhou: 'Classical Gardens High School', Hangzhou: 'West Lake Foreign Language School',
      Guangzhou: 'Five Rams Middle School', Qingdao: 'Laoshan Bay High School', Zhengzhou: 'Central Plains No. 1 High School', Wuhan: 'Yellow Crane High School', Jinan: 'City of Springs High School', Nanjing: 'Purple Mountain High School',
      Kunming: 'Spring City High School', Chengdu: 'Brocade River High School', 'Hong Kong': 'Kowloon Bay Secondary School', Taipei: 'Basin View Senior High School', Taichung: 'Dadu Plateau Senior High School', Chiayi: 'Alishan Forest Senior High School',
      Tainan: 'Old Fort Senior High School', Kaohsiung: 'Love River Senior High School', Tokyo: 'Sumida River Technical High School', Seoul: 'Han River Science High School' },
    'Asia Pacific': { Sydney: 'Harbour City Grammar School', Wollongong: 'Steel Coast High School', Newcastle: 'Nobbys Head High School', 'Port Macquarie': 'Koala Coast High School', Coonabarabran: 'Outback Community High School', Canberra: 'Bush Capital College',
      Melbourne: 'Blue Gum Secondary College', Perth: 'Swan River Senior High School', Adelaide: 'River Torrens College', Brisbane: 'Coral Coast State High School', Mumbai: 'Seven Islands Public School', Delhi: 'Yamuna Bank Public School',
      Singapore: 'Lion City Secondary School', Auckland: 'Long White Cloud College', 'Ho Chi Minh City': 'Saigon River High School for the Gifted', 'Kuala Lumpur': 'Klang Valley International School', Manila: 'Pasig River Science High School' }
  };
  Object.keys(D.SCHOOL_IN).forEach(h => Object.keys(D.SCHOOL_IN[h]).forEach(c => { const s = D.SCHOOL_IN[h][c]; if (!D.SCHOOL_BY[h].includes(s)) D.SCHOOL_BY[h].push(s); D.SCHOOL_AT[s] = [c]; }));
  D.schoolAt = name => D.SCHOOL_AT[String(name == null ? '' : name).trim()] || null;
  D.SPONSOR_BY = {
    West: { tech: ['Sandhill Semiconductors', 'Golden Gate Robotics', 'Redwood Cloud', 'Palo Verde Devices', 'Mission Bay Systems', 'Skyline Microsystems', 'Sierra Photonics', 'Cupola Space Systems', 'El Camino Microdevices', 'Tidepool Robotics', 'Pacific Quantum Works', 'Joshua Tree Avionics'], soft: ['Bayview Software', 'Loma Code Labs', 'Fogline Apps', 'Sunset Logic', 'Cable Car Software', 'Poppy Field Games', 'Marina Analytics', 'Eucalyptus Code'],
      local: ['Pacific Surf Shop', 'Orchard Street Tacos', 'Vineyard Credit Union', 'Golden Poppy Bakery', 'Sierra Outfitters', 'Coastline Auto', 'Boardwalk Burrito Co.', 'Sagebrush Feed & Supply', 'Lighthouse Point Cafe', 'Citrus Grove Market', 'Foothill Bike Shop', 'Silver State Credit Union'], eng: ['Seismic Structures', 'Baycrest Engineering', 'High Desert Aerospace', 'Solaris Energy Engineering', 'Golden State Transit Engineering', 'Tahoe Water Engineering', 'Pacific Offshore Wind Engineering', 'Canyon Rim Geotechnical'],
      mfg: ['Mojave Composites', 'Pacific Precision Machining', 'Silicon Foundry Works', 'Harborline Fabrication', 'Central Valley Farm Equipment', 'Redwood Mill Works', 'Desert Sun Solar Panels', 'Bay Shipyard Fabrication'], uni: ['Pacific Coast Institute of Technology', 'Sierra State University', 'Bayside Community College', 'Golden Coast University', 'Redwood State Polytechnic', 'High Sierra Community College'], found: ['Golden State STEM Fund', 'Coastal Futures Foundation', 'Valley Innovators Trust', 'Pacific Makers Foundation', 'Sunrise Valley Education Trust', 'Redwood STEM Alliance'] },
    evergreen: { tech: ['Rainier Cloud', 'Puget Devices', 'Cascade Networks', 'Evergreen Avionics', 'Olympic Aerospace', 'Salish Sea Sonar', 'Willamette Semiconductor', 'Tall Fir Robotics'], soft: ['Emerald Software', 'Mossy Rock Games', 'Sound Logic', 'Ferry Dock Software', 'Drizzle Cloud', 'Huckleberry Games'], local: ['Pike Street Coffee', 'Salmon Run Outfitters', 'Evergreen Credit Union', 'Rainy Day Books', 'Orchard Hill Farm Stand', 'Trailhead Bike Works', 'Harbor Fish Market', 'Mount View Credit Union'],
      eng: ['Columbia Hydro Engineering', 'Northwest Aerostructures', 'Glacier Peak Civil', 'Inland Rail Engineering'], mfg: ['Timberline Machine', 'Sound Composites', 'Cascade Fastener Co.', 'Big Timber Sawmill Equipment', 'Columbia River Aluminum', 'Evergreen Boat Works'], uni: ['Cascadia Institute of Technology', 'Puget State University', 'Willamette Valley University', 'Olympic Peninsula College'], found: ['Evergreen Futures Fund', 'Northwest STEM Trust', 'Cascade Makers Foundation', 'Tall Timber Youth Trust'] },
    Southwest: { tech: ['Saguaro Semiconductor', 'Front Range Aerospace', 'Mesa Verde Systems', 'Red Rock Optics', 'Painted Desert Photonics', 'Wasatch Data Centers', 'Pikes Peak Space Systems', 'Rio Grande Sensors'], soft: ['Pueblo Code', 'Mile High Apps', 'Tumbleweed Software', 'Slickrock Apps'], local: ['Cactus Wren Diner', 'Four Corners Credit Union', 'Adobe Hardware', 'Roadrunner Auto', 'Green Chili Grill', 'Turquoise Trail Trading Post', 'Mountain Pass Ski Shop', 'Sooner Feed Store'],
      eng: ['Canyon Civil', 'High Plains Energy Engineering', 'Copper State Mining Engineering', 'Great Basin Water Engineering', 'Mesa Solar Engineering', 'Divide Tunnel Engineering'], mfg: ['Sunbelt Machine Works', 'Rocky Mountain Fabrication', 'Desert Tooling Co.', 'Copper Canyon Smelting', 'Oil Patch Pump Works', 'Aspen Ridge Ski Lifts'], uni: ['Sonoran State University', 'Front Range School of Mines', 'High Desert Technical College', 'Wasatch State University', 'Rio Grande Institute of Technology', 'Red Earth Technical College'], found: ['Desert Bloom Foundation', 'Rockies STEM Fund', 'Four Corners Youth Fund', 'Sunset Mesa Makers Trust'] },
    mesa: { tech: ['Lone Star Instruments', 'Gulf Coast Space Systems', 'Bluebonnet Semiconductor', 'Alamo Networks', 'Silicon Prairie Devices', 'Mission Control Systems', 'Pecos Wind Systems', 'Trinity Telecom'], soft: ['Armadillo Software', 'Mockingbird Apps', 'Roadrunner Code Works', 'Prickly Pear Apps'], local: ['Hill Country Barbecue', 'Bluebonnet Credit Union', 'Rio Hardware', 'Lone Star Tire', 'Kolache Corner Bakery', 'Stockyard Boot Co.', 'Pecan Street Tacos', 'Gulf Shrimp Shack'],
      eng: ['Permian Energy Engineering', 'Space City Engineering', 'Longhorn Structures', 'Wildcatter Drilling Engineering', 'Ship Channel Engineering', 'Caprock Wind Engineering'], mfg: ['Gulf Refinery Fabrication', 'Brazos Machine Works', 'Panhandle Steel', 'Derrick Iron Works', 'Rio Bravo Trailer Works', 'Coastal Bend Polymers'], uni: ['Texas Plains Tech', 'Gulf Coast University', 'Hill Country College', 'Pecos Valley University', 'Alamo City Institute of Technology', 'Piney Woods State College'], found: ['Lone Star STEM Fund', 'Wide Sky Futures Trust', 'Big Bend Education Foundation', 'Bluebonnet Makers Fund'] },
    Midwest: { tech: ['Prairie Avionics', 'Twin Cities Medical Devices', 'Heartland Controls', 'Great River Automation', 'Gateway Aerospace', 'Buckeye Polymer Labs', 'Badger State Medical Imaging', 'Hawkeye Precision Agriculture'], soft: ['Silo Software', 'North Loop Code', 'Grain Elevator Software', 'Lakeshore Drive Analytics'], local: ['Main Street Diner', 'Farmers Cooperative Bank', 'Cornerstone Hardware', 'Dairyland Creamery', 'Cheese Curd Corner', 'Hoosier Hardware', 'Riverboat Pizza', 'Prairie Rose Bakery'],
      eng: ['Bridgeworks Engineering', 'Midland Agri-Systems', 'Windy City Structures', 'Lock and Dam Engineering', 'Great Plains Wind Engineering', 'Iron Range Mining Engineering'], mfg: ['Corn Belt Tractor Works', 'Rust Belt Stamping', 'Lakefront Tool & Die', 'Ironwood Machine', 'Flour Mill Machinery', 'Rubber City Tire Works', 'Combine Harvester Co.', 'Queen City Machine Tools'], uni: ['Prairie State University', 'Heartland Institute of Technology', 'Lakefront Technical College', 'Buckeye Technical University', 'Twin Rivers State University', 'Gateway Community College'], found: ['Heartland STEM Fund', 'Great Lakes Futures Foundation', 'Prairie Makers Foundation', 'Crossroads Youth Trust'] },
    lakeshore: { tech: ['Motor City Mobility', 'Wolverine Autonomy', 'Great Lakes Battery Systems', 'Mackinac Sensors', 'Arsenal Robotics', 'Huron Shore Lidar'], soft: ['Mitten Software', 'Dashboards & Co.', 'Cruise Control Code', 'Petoskey Stone Apps'], local: ['Coney Corner Diner', 'Lighthouse Credit Union', 'Cherry Orchard Market', 'Up North Hardware', 'Pasty Shop North', 'Tulip Town Bakery', 'Bay Fishing Charters', 'Cider Mill Donuts'],
      eng: ['Powertrain Engineering Group', 'Straits Structures', 'Proving Ground Engineering', 'Crash Lab Engineering', 'Blue Water Bridge Engineering', 'Electric Drive Engineering'], mfg: ['Assembly Line Tooling', 'Lakeshore Stamping', 'Peninsula Die & Mold', 'Three Rivers Axle', 'Furniture City Works', 'Cereal City Packaging', 'Saginaw Bay Castings', 'Copper Country Foundry'], uni: ['Great Lakes Technological University', 'Motor City College of Engineering', 'Peninsula State University', 'Copper Country Technological University', 'Grand Valley Institute of Engineering', 'Thumb Area Community College'], found: ['Automotive Heritage Foundation', 'Lakeshore STEM Fund', 'Two Peninsulas Education Fund', 'Motor Heritage Youth Trust'] },
    Northeast: { tech: ['Empire Photonics', 'Garden State Pharma Systems', 'Keystone Robotics', 'Chesapeake Defense Systems', 'Finger Lakes Optics', 'Harbor Light Radar', 'Delaware Valley Chem Systems', 'Turnpike Telecom'], soft: ['Midtown Software', 'Turnpike Apps', 'Exchange Street Analytics', 'Boardwalk Games', 'Subway Map Software', 'Three Rivers Data'], local: ['Brownstone Bagels', 'Boardwalk Pizza', 'Keystone Credit Union', 'Corner Deli & Co.', 'Pretzel Wagon', 'Crab Shack on the Bay', 'Diner on Route 9', 'Niagara Wing House'],
      eng: ['Hudson Bridge Engineering', 'Liberty Structures', 'Tidewater Naval Engineering', 'Tunnel & Tube Engineering', 'Skyscraper Structures', 'Anthracite Energy Engineering'], mfg: ['Steel Valley Works', 'Susquehanna Machine', 'Erie Canal Castings', 'Lehigh Valley Cement Works', 'Mohawk Valley Turbines', 'Garden State Glass'], uni: ['Hudson Polytechnic', 'Keystone State University', 'Chesapeake Institute of Technology', 'Empire Institute of Technology', 'Delaware Valley University', 'Finger Lakes College of Engineering'], found: ['Liberty Futures Foundation', 'Empire STEM Fund', 'Harbor Lights Education Fund', 'Three Rivers Youth Foundation'] },
    harbor: { tech: ['Bay State Biotech', 'Minuteman Defense Systems', 'Nutmeg Aerospace', 'Granite State Sensors', 'Cape Ocean Robotics', 'Kendall Lab Instruments', 'Pioneer Valley Optics', 'Submarine Base Systems'], soft: ['Beacon Hill Software', 'Lighthouse Code', 'Old North Software', 'Clam Chowder Games'], local: ['Lobster Shack', 'Town Common Bookshop', 'Covered Bridge Hardware', 'Maple Sugar Diner', 'Cider Donut Barn', 'Whale Watch Outfitters', 'Village Green Creamery', 'Saltbox Hardware'],
      eng: ['Old Port Marine Engineering', 'Charles River Engineering', 'Seacoast Wind Engineering', 'Notch Road Civil'], mfg: ['Yankee Precision', 'Mill River Machine', 'Shipyard Fabrication', 'Clocktower Instruments', 'Blackstone Valley Textiles', 'Down East Boat Builders'], uni: ['Commonwealth Institute of Technology', 'Harbor Polytechnic', 'Green Mountain College', 'Pioneer Valley Polytechnic', 'Ocean State Institute of Technology', 'White Mountain College'], found: ['Mayflower STEM Fund', 'New Harbor Foundation', 'Lighthouse Education Fund', 'Town Meeting Youth Trust'] },
    Southeast: { tech: ['Space Coast Launch Systems', 'Research Triangle Biosystems', 'Peachtree Logistics Tech', 'Rocket City Avionics', 'Music City Health Systems', 'Bluegrass Logistics Automation', 'Cape Launch Telemetry', 'Piedmont Semiconductors'], soft: ['Triangle Software', 'Sunshine Apps', 'Lowcountry Software', 'Gator Byte Apps'], local: ['Sweet Tea Cafe', 'Magnolia Credit Union', 'Peach Stand Market', 'Bayou Bait & Tackle', 'Biscuit Barn', 'Crawfish Corner', 'Smokehouse Barbecue Pit', 'Orange Grove Stand'],
      eng: ['Tidewater Shipbuilding Engineering', 'Blue Ridge Power Engineering', 'Gulf Stream Aerostructures', 'Delta Levee Engineering', 'Appalachian Tunnel Engineering', 'Hurricane Coast Structures'], mfg: ['Carolina Textile Machinery', 'Magnolia Motors Assembly', 'Bayou Petrochemical Fabrication', 'Bluegrass Auto Assembly', 'Piedmont Furniture Works', 'Peach State Carpet Mills'], uni: ['Palmetto Institute of Technology', 'Blue Ridge State University', 'Gulf Coast Technical College', 'Bayou State University', 'Bluegrass Institute of Technology', 'Sunshine Coast Polytechnic'], found: ['Southern Futures Foundation', 'Space Coast STEM Fund', 'Magnolia Makers Foundation', 'Tidewater Youth Trust'] },
    North: { tech: ['Laurentian Aerospace', 'Northern Lights Telecom', 'Pacific Rim Hydrogen', 'Prairie Sky Avionics', 'Great Plains Satellite', 'Chinook Wind Systems', 'Mont-Royal AI Labs', 'Fraser Valley Fuel Cells'], soft: ['Mile End Games', 'Snowbird Software', 'Toque Software', 'Whistler Peak Games'], local: ['Poutine Corner', 'Chinook Credit Union', 'Timber Trail Outfitters', 'Hockey Night Sports', 'Bannock & Bean Cafe', 'Sugar Shack on the Hill', 'Stampede Western Wear', 'Seawall Bike Rental'],
      eng: ['Oil Sands Engineering', 'St. Lawrence Hydro Engineering', 'Coast Mountain Engineering', 'Tundra Pipeline Engineering', 'Prairie Potash Engineering', 'Laurentian Dam Engineering'], mfg: ['Maple Rail Works', 'Boreal Paper Machinery', 'Rocky Mountain Fabricators', 'Snowplough Works', 'Prairie Grain Elevators Ltd.', 'Saguenay Aluminum Smelters'], uni: ['Polytechnic of the St. Lawrence', 'Rocky Mountain Institute of Technology', 'Pacific Coast University', 'Prairie Polytechnic', 'Coast Mountain University', 'Laurentian Technical College'], found: ['True North STEM Fund', 'Aurora Youth Foundation', 'Northern Makers Foundation', 'Great North Youth Trust'] },
    trillium: { tech: ['Tri-Cities Quantum', 'Trillium Telecom', 'Lakeshore Nuclear Systems', 'Escarpment Robotics', 'Seaway Navigation Systems', 'Capital Region Photonics'], soft: ['Twin City Code Works', 'Loon Lake Software', 'Streetcar Software', 'Dock Chair Apps'], local: ['Double-Double Cafe', 'Trillium Credit Union', 'Cottage Country Hardware', 'Butter Tart Bakery', 'Peameal Sandwich Counter', 'Rink Side Sports', 'Farmers Market on King', 'Maple Syrup Shack'],
      eng: ['Northern Shield Mining Engineering', 'Grand River Engineering', 'Seaway Lock Engineering', 'Transit Line Engineering'], mfg: ['Maple Auto Parts', 'Golden Horseshoe Steel', 'Queensway Tool & Die', 'Steel Town Rolling Mills', 'Border City Stamping', 'Lakehead Rail Cars'], uni: ['Grand River University', 'Lakeshore Polytechnic', 'Northern Shield College', 'Escarpment University', 'Capital Region Institute of Technology', 'Seaway College'], found: ['Trillium STEM Foundation', 'Great Lakes Youth Fund', 'Golden Horseshoe Makers Fund', 'Loon Call Education Trust'] },
    'Central America': { tech: ['Norte Telecom', 'Monte Aerospace', 'Sol Electronics', 'Quetzal Avionics', 'Cenote Data Centers', 'Pacifico Solar Systems'], soft: ['Nopal Software', 'Colibri Apps', 'Ocelote Software', 'Jacaranda Apps'], local: ['Taqueria La Esquina', 'Panaderia del Centro', 'Ferreteria El Norte', 'Mercado Agave', 'Tortilleria La Reina', 'Cafe de Olla', 'Carniceria Don Beto', 'Papeleria El Estudiante'],
      eng: ['Altiplano Engineering', 'Golfo Energy Engineering', 'Canal Zone Engineering', 'Sierra Tunnel Engineering'], mfg: ['Sierra Cement & Steel', 'Laguna Mining & Metals', 'Regio Glass Works', 'Bajio Auto Assembly', 'Tres Volcanes Brewing', 'Bajio Aerospace Castings', 'Norte Appliance Works', 'Frontera Wire Harness', 'Agave Valley Bottling', 'Desierto Copper Works'], uni: ['Technological Institute of the North', 'Sierra Madre Polytechnic', 'Autonomous University of the Plateau', 'Polytechnic University of the Bajio', 'Institute of Technology of the Gulf', 'University of the Isthmus'], found: ['Futuro STEM Foundation', 'Sierra Madre Youth Fund', 'Manos a la Obra Foundation', 'Monarca Education Trust'] },
    'South America': { tech: ['Cruzeiro Aerospace', 'Tropico Telecom', 'Amazonia Energy Systems', 'Pantanal Agritech', 'Bandeira Avionics', 'Atlantica Satellite'], soft: ['Tucano Software', 'Ipe Apps', 'Capivara Code', 'Sabia Software'], local: ['Padaria da Praca', 'Churrascaria Gaucha', 'Banco Cooperativo do Sul', 'Livraria Central', 'Lanchonete do Bairro', 'Acai da Esquina', 'Feira Livre Market', 'Sorveteria Tropical'],
      eng: ['Atlantic Offshore Engineering', 'Planalto Hydro Engineering', 'Cerrado Rail Engineering', 'Pre-Salt Subsea Engineering'], mfg: ['Serra Mining & Steel', 'Paulista Auto Assembly', 'Pampa Agro Machinery', 'Rio Doce Metals', 'Minas Iron Works', 'Cafezal Coffee Machinery', 'Litoral Shipyards', 'Andes Copper Works'], uni: ['Industrial Learning Institute', 'Federal University of the Plateau', 'Technological Institute of the Valley', 'Federal Technological University of the South', 'State University of the Coast', 'Andean Polytechnic School'], found: ['Industry Social Foundation', 'Futuro Jovem Trust', 'Semear Education Foundation', 'Novo Horizonte Trust'] },
    Europe: { tech: ['Lowlands Lithography', 'Alpine Precision Instruments', 'Baltic Embedded Systems', 'Rhone Avionics', 'Nordic Battery Works', 'Danube Microelectronics', 'Adriatic Space Systems', 'Brabant Photonics'], soft: ['Tulip Software', 'Nordlys Apps', 'Fjord Software', 'Kiosk Games'], local: ['Canal Street Bakery', 'Old Town Bicycle Shop', 'Market Square Cafe', 'Harbour Cooperative Bank', 'Stroopwafel Stand', 'Corner Patisserie', 'Pierogi Kitchen', 'Alpine Cheese Dairy'],
      eng: ['Delta Water Engineering', 'Channel Rail Engineering', 'Polder Engineering', 'Alpine Tunnel Engineering'], mfg: ['Vistula Machine Works', 'Thames Composites', 'Bohemia Motor Works', 'Rhine Valley Machine Tools', 'Silesia Steel Works', 'Carpathian Auto Parts'], uni: ['Lowlands University of Technology', 'Vistula Polytechnic', 'Alpine Federal Institute', 'Brabant Technical University', 'Danube University of Technology', 'Nordic Institute of Technology'], found: ['Continental STEM Foundation', 'Bridge Builders Trust', 'Makers of Europe Foundation', 'Windmill Education Trust'] },
    Anatolia: { tech: ['Anatolia Defence Electronics', 'Crescent Aerospace', 'Bosphorus Telecom', 'Sky Anatolia Airlines', 'Golden Horn Avionics', 'Cappadocia Drone Works', 'Marmara Satellite', 'Steppe Radar Systems'], soft: ['Tulip Era Software', 'Cay Code', 'Galata Software', 'Pomegranate Apps'], local: ['Simit Corner Bakery', 'Grand Bazaar Hardware', 'Ocakbasi Kebab House', 'Tea Garden Cafe', 'Baklava House', 'Fish Market on the Pier', 'Copper Bazaar Crafts', 'Borek Bakery'],
      eng: ['Strait Bridge Engineering', 'Plateau Energy Engineering', 'Euphrates Dam Engineering', 'Metro Tunnel Engineering'], mfg: ['Marmara Home Appliances', 'Taurus Automotive', 'Black Sea Steel', 'Aegean Textiles', 'Anatolian Tractor Works', 'Gulf Bay Shipyards', 'Caravan Road Auto Parts', 'Central Plateau Ceramics'], uni: ['Bosphorus Technical University', 'Anatolian Institute of Technology', 'Aegean University', 'Capital Technical University', 'Marmara Institute of Technology', 'Mediterranean University of Science'], found: ['Anatolian Education Foundation', 'Young Engineers Trust', 'Crescent Youth Foundation', 'Seven Hills Education Trust'] },
    levant: { tech: ['Carmel Semiconductor', 'Negev Solar Systems', 'Galilee Medical Devices', 'Iron Sky Defence Systems', 'Coastal Cyber Labs', 'Sharon Vision Systems', 'Red Sea Desalination Tech', 'Valley Agritech Labs', 'Carmel Bay Optics', 'Salt Sea Minerals Tech'], soft: ['Startup Alley Software', 'Sabra Apps', 'Boulevard Software', 'Hummus Bar Games'], local: ['Falafel Corner', 'Shuk Spice Market', 'Kibbutz Dairy', 'Olive Press Cafe', 'Shakshuka Kitchen', 'Bourekas Bakery', 'Date Palm Juice Bar', 'Old Port Fish Grill'],
      eng: ['Rift Valley Water Engineering', 'Coastal Plain Engineering', 'Desert Pipeline Engineering', 'Light Rail Engineering Group'], mfg: ['Desert Drip Irrigation', 'Sharon Plastics', 'Harbor Chemicals', 'Galilee Tooling Works', 'Southern Potash Works', 'Coastal Pharma Manufacturing'], uni: ['Carmel Institute of Technology', 'Desert University', 'Coastal College of Engineering', 'Negev University of Technology', 'Galilee Academic College', 'Sharon Institute of Science'], found: ['Bright Negev Foundation', 'Galilee Youth Fund', 'Start-Up Youth Foundation', 'Olive Branch Education Fund'] },
    'East Asia': { tech: ['Pearl Delta Drones', 'Huaxin Semiconductor', 'Jade Mountain Chipworks', 'Great River Telecom', 'Sakura Robotics', 'Golden Harbour Displays', 'Strait Island Semiconductor', 'Yellow Crane Telecom', 'Kanto Precision Robotics', 'Han River Electronics'], soft: ['Panda Cloud', 'Lantern Games', 'Koi Apps', 'Paper Crane Software', 'Bamboo Cloud', 'Ginkgo Games'], local: ['Bubble Tea Corner', 'Night Market Noodles', 'Lucky Dumpling House', 'Stationery & Books No. 8', 'Hot Pot Garden', 'Soy Milk Breakfast Shop', 'Ramen Alley', 'Moon Cake Bakery'],
      eng: ['Three Rivers Hydro Engineering', 'Harbour City Engineering', 'Grand Canal Engineering', 'High Speed Rail Engineering Bureau'], mfg: ['Hon Yuan Precision', 'Delta Bay Electronics Assembly', 'Lotus Motors', 'Eastern Bullet Rail Works', 'Dragon Gate Battery Works', 'Silk Road Machine Tools', 'Eastern Shipbuilding Yard', 'Plum Blossom Appliances'], uni: ['Eastern University of Science and Technology', 'Island Institute of Technology', 'Pearl Delta Polytechnic', 'Jade River University of Technology', 'Harbour Polytechnic University', 'Northern Capital Institute of Aeronautics'], found: ['Rising Dragon Education Foundation', 'Maker Youth Fund', 'Bamboo Shoots Education Foundation', 'Rising Tide Youth Fund'] },
    'Asia Pacific': { tech: ['Southern Sky Telecom', 'Reef Ocean Systems', 'Koala Biotech', 'Monsoon Software Services', 'Coral Sea Satellites', 'Southern Cross Quantum', 'Lion City Fintech Systems', 'Deccan Space Systems'], soft: ['Kookaburra Code', 'Billabong Apps', 'Wombat Software', 'Monsoon Games'], local: ['Surf Club Cafe', 'Corner Milk Bar', 'Bush Tucker Bakery', 'Wattle Hardware', 'Meat Pie Corner', 'Fish & Chips on the Wharf', 'Hawker Stall Kitchen', 'Chai Corner'],
      eng: ['Great Dividing Engineering', 'Red Centre Mining Engineering', 'High Country Hydro Engineering', 'Top End Gas Engineering'], mfg: ['Outback Mining Equipment', 'Iron Ore West Machinery', 'Ute Motor Works', 'Harbour Shipwrights', 'Sunraysia Solar Works', 'Shearing Shed Machinery', 'Southern Alps Dairy Equipment', 'Bay of Bengal Steel'], uni: ['Harbour City University', 'Outback Institute of Technology', 'Coral Coast University', 'Great Southern University of Technology', 'Lion City Polytechnic', 'Deccan Institute of Technology'], found: ['Down Under STEM Fund', 'Wattle Foundation', 'Kangaroo Paw Makers Fund', 'Southern Stars Youth Foundation'] }
  };
  D.SPONSOR_BY.sierra = D.SPONSOR_BY.West; D.SPONSOR_BY['Middle East'] = D.SPONSOR_BY.levant;
  // a team's home for names: its district, else its area
  D.nameHome = team => (team && (team.home || team.region)) || null;
  // A default school for a home. A school is as likely as the teams of its cities are many (each city's share of the
  // home's teams, split between the schools that stand there), so a team made with the default follows the real map;
  // a school that points nowhere counts as an average one.
  D.schoolWeights = function (l) {
    const Geo = G.Geo, W = {}; if (!Geo || !Geo.hub) { l.forEach(s => { W[s] = 1; }); return W; }
    const at = s => (D.SCHOOL_AT[s] || []).filter(c => Geo.hub(c)), own = {}, taken = {};
    l.forEach(s => { const a = at(s); if (a.length === 1) (own[a[0]] = own[a[0]] || []).push(s); }); // the home's cities: each has a school of its own here
    const cities = Object.keys(own), mean = cities.length ? cities.reduce((t, c) => t + Geo.hub(c).w, 0) / cities.length : 1;
    // a school of several cities (the team stands in any of them), or of none in this home (the team is placed as the map is): half an average school
    l.forEach(s => { const a = at(s); if (a.length === 1) return; const here = a.filter(c => own[c]);
      if (!here.length) { W[s] = mean * 0.5; return; }
      W[s] = 0.5 * here.reduce((t, c) => t + Geo.hub(c).w, 0) / here.length; here.forEach(c => { taken[c] = (taken[c] || 0) + W[s] / here.length; }); });
    // a city's own schools share what is left of the city's weight
    cities.forEach(c => { const w = Math.max(0.15 * Geo.hub(c).w, Geo.hub(c).w - (taken[c] || 0)); own[c].forEach(s => { W[s] = w / own[c].length; }); });
    return W;
  };
  // ---------- an area before its districts ----------
  // Until a district forms, its cities are part of the area: a regional team of the area can come from any of them,
  // as the area's other teams do (they carry the district as their zone, t.z), and so can its school. The districts
  // of an area that are still to form in season cy; all: the game has no districts at all (a single season), so
  // every district's cities belong to the area. Without a season, none: the area's own list, as before.
  D.zonesAhead = (region, cy, all) => (cy == null && !all ? [] : (D.DISTRICTS || []).filter(d => d.region === region && (all || d.from > cy)));
  // the schools a new team of a home can be given: a district's own, or the area's with those of the districts ahead
  D.schoolList = function (home, region, cy, all) {
    if (D.SCHOOL_BY[home]) return D.SCHOOL_BY[home];
    const own = D.SCHOOL_BY[region]; if (!own) return [];
    const more = D.zonesAhead(region, cy, all).map(d => D.SCHOOL_BY[d.id]).filter(l => l && l !== own); if (!more.length) return own;
    const out = own.slice(); more.forEach(l => l.forEach(s => { if (!out.includes(s)) out.push(s); })); return out;
  };
  // the district ahead that these cities lie in (null: the area's own cities)
  const zoneOfCities = (cities, region, ds) => { const hubs = (cities || []).map(c => G.Geo.hub(c)).filter(x => x && x.r === region); if (!hubs.length) return undefined; const z = hubs.map(hb => ds.find(d => d.id === hb.d)); return z.every(Boolean) ? z[0].id : null; };
  // the district ahead that a school of the lists stands in: by its cities, else by the list it is on (null: the
  // area's own cities; undefined: not a school of the lists)
  D.schoolZone = function (name, region, cy, all) {
    const ds = D.zonesAhead(region, cy, all), s = String(name == null ? '' : name).trim(); if (!ds.length) return null;
    const z = zoneOfCities(D.SCHOOL_AT[s], region, ds); if (z !== undefined) return z;
    if ((D.SCHOOL_BY[region] || []).includes(s)) return null;
    const d = ds.find(x => (D.SCHOOL_BY[x.id] || []).includes(s)); return d ? d.id : undefined;
  };
  // The zone a new regional team stands in: where its school points (place: the cities of the school it picked,
  // whatever the school is called now), else where a school of that name stands, else one drawn by the zones' real
  // numbers of teams, as the area's other teams are (always the same for the same team number).
  D.startZone = function (num, region, cy, all, school, place) {
    const ds = D.zonesAhead(region, cy, all); if (!ds.length) return null;
    let z = zoneOfCities(place, region, ds); if (z !== undefined) return z;
    z = D.schoolZone(school, region, cy, all); if (z !== undefined) return z;
    const zs = [{ z: null, n: D.realTeams(region, cy) }].concat(ds.map(d => ({ z: d.id, n: D.realTeams(d.id, cy) })));
    return G.makeRng((((Number(num) || 1) * 40503) ^ 0x51ed27) >>> 0 || 5).wpick(zs, x => x.n + 0.01).z;
  };
  // ... and the weights of such a list: each zone's schools share the zone's real number of teams
  D.schoolWeightsBy = function (l, region, cy, all) {
    if (!D.zonesAhead(region, cy, all).length) return D.schoolWeights(l);
    const by = {}, W = {}; l.forEach(s => { const z = D.schoolZone(s, region, cy, all) || ''; (by[z] = by[z] || []).push(s); });
    Object.keys(by).forEach(z => { const w = D.schoolWeights(by[z]), tot = by[z].reduce((t, s) => t + w[s], 0) || 1, n = D.realTeams(z || region, cy) || 1; by[z].forEach(s => { W[s] = n * w[s] / tot; }); });
    return W;
  };
  D.schoolName = (rng, home, region, cy, all) => { const l = D.schoolList(home, region, cy, all); if (!l.length) return rng.pick(D.SCHOOLS) + ' High School'; const W = D.SCHOOL_BY[home] ? D.schoolWeights(l) : D.schoolWeightsBy(l, region, cy, all); return rng.wpick(l, s => W[s]); };
  D.sponsorPool = (type, home, region) => { const a = D.SPONSOR_BY[home] || D.SPONSOR_BY[region] || D.SPONSOR_BY.Midwest; return a[type] || a.eng; }; // a home's own companies (the international ones are D.SPONSOR_NAMES)

  // ---------- people's names ----------
  // People are named as people of their place usually are when the name is written in English, and a first name
  // always goes with a family name of the same language. The place is the team's city on the map (G.Geo.HUBS): a
  // city with names of its own (D.NAME_AT), else its district's list, else its area's. So a team near the Saint
  // Lawrence has names of one language and a team on the prairies of the other, and East Asia's teams have an English
  // first name before a family name of their own shore (two cities there keep given names of their own).
  // D.FIRST and D.LAST (world.js) stay the international mix: the people of an international company, and anybody
  // with no home. A family name is one word (a first name is everything before the first space).
  {
    const US = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia', 'Lucas', 'Charlotte', 'Jacob', 'Amelia', 'Michael', 'Harper', 'Daniel', 'Abigail', 'Henry',
      'Emily', 'Jackson', 'Ella', 'Owen', 'Grace', 'Caleb', 'Chloe', 'Wyatt', 'Lily', 'Andrew', 'Hannah', 'Ryan', 'Natalie', 'Nathan', 'Zoe', 'Tyler', 'Sarah', 'Dylan', 'Megan', 'Connor'];
    // the English first names people of East Asia's shores and of the strait city go by
    const EN = ['Kevin', 'Jason', 'Eric', 'Andy', 'Tony', 'Vincent', 'Jerry', 'Frank', 'Leo', 'Sam', 'Allen', 'Peter', 'Daniel', 'Michael', 'Henry', 'Jack', 'Alex', 'Ryan', 'Steven', 'Brian', 'David', 'William',
      'Amy', 'Emily', 'Jessica', 'Cindy', 'Alice', 'Grace', 'Ivy', 'Tina', 'Vivian', 'Jenny', 'Angela', 'Wendy', 'Lily', 'Sophie', 'Coco', 'Iris', 'Joyce', 'Sharon', 'Annie', 'Karen', 'Michelle', 'Selina'];
    D.NAME_GROUPS = {
      // ----- the five areas of the United States, and their districts
      West: { first: US.concat(['Kevin', 'Jason', 'Sofia', 'Jasmine', 'Cody', 'Brooke', 'Carter', 'Paige']),
        last: ['Smith', 'Johnson', 'Anderson', 'Nelson', 'Miller', 'Davis', 'Wilson', 'Hansen', 'Larson', 'Christensen', 'Jensen', 'Peterson', 'Olsen', 'Taylor', 'Clark', 'Young', 'Campbell', 'Garcia', 'Martinez', 'Hernandez',
          'Lopez', 'Gonzalez', 'Ramirez', 'Flores', 'Nguyen', 'Lee', 'Kim', 'Tran', 'Wong', 'Chen', 'Patel', 'Singh', 'Park', 'Reyes', 'Santos', 'Baker', 'Hall', 'Allen', 'Wright', 'Hill'] },
      'us-islands': { first: US.concat(['Kai', 'Leilani', 'Keanu', 'Noelani', 'Makoa', 'Malia', 'Kekoa', 'Nalani']),
        last: ['Kealoha', 'Kahale', 'Kamaka', 'Akana', 'Kalani', 'Kanoho', 'Nakamura', 'Tanaka', 'Yamamoto', 'Sato', 'Watanabe', 'Higa', 'Oshiro', 'Kaneshiro', 'Matsumoto', 'Inouye', 'Wong', 'Lee', 'Chun', 'Ching',
          'Young', 'Lum', 'Kim', 'Park', 'Santos', 'Reyes', 'Ramos', 'Domingo', 'Agustin', 'Pascua', 'Silva', 'Souza', 'Medeiros', 'Cabral', 'Smith', 'Johnson', 'Williams', 'Brown', 'Lopez', 'Garcia'] },
      sierra: { first: US.concat(['Kevin', 'Jason', 'Sofia', 'Isabel', 'Jasmine', 'Andrea', 'Brandon', 'Justin']),
        last: ['Garcia', 'Hernandez', 'Lopez', 'Martinez', 'Gonzalez', 'Rodriguez', 'Ramirez', 'Sanchez', 'Perez', 'Flores', 'Torres', 'Nguyen', 'Tran', 'Le', 'Pham', 'Lee', 'Kim', 'Park', 'Chen', 'Wang',
          'Wong', 'Liu', 'Lin', 'Chang', 'Patel', 'Singh', 'Shah', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Anderson', 'Thompson', 'White', 'Clark', 'Santos', 'Reyes'] },
      evergreen: { first: US.concat(['Kevin', 'Jason', 'Sofia', 'Jasmine', 'Brooke', 'Carter', 'Evan', 'Claire']),
        last: ['Anderson', 'Johnson', 'Nelson', 'Olson', 'Larsen', 'Hansen', 'Peterson', 'Carlson', 'Erickson', 'Lund', 'Smith', 'Miller', 'Davis', 'Wilson', 'Brown', 'Jones', 'Williams', 'Thompson', 'Clark', 'Baker',
          'Nguyen', 'Tran', 'Kim', 'Lee', 'Chen', 'Wang', 'Park', 'Wong', 'Garcia', 'Martinez', 'Hernandez', 'Lopez', 'Singh', 'Patel', 'Campbell', 'Stewart', 'Murphy', 'Reed', 'Cooper', 'Fisher'] },
      Southwest: { first: US.concat(['Cody', 'Austin', 'Sofia', 'Isabel', 'Gabriel', 'Jasmine', 'Angel', 'Marcus']),
        last: ['Garcia', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Chavez', 'Romero', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Anderson',
          'Baker', 'Young', 'Christensen', 'Jensen', 'Begay', 'Yazzie', 'Nguyen', 'Patel', 'Tran', 'Walker', 'Hill', 'Moore', 'Scott', 'Cooper', 'Reed', 'Morales', 'Castillo', 'Vasquez', 'Trujillo', 'Guerrero'] },
      mesa: { first: US.concat(['Cody', 'Austin', 'Travis', 'Sofia', 'Isabel', 'Gabriel', 'Jasmine', 'Savannah']),
        last: ['Garcia', 'Martinez', 'Rodriguez', 'Hernandez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Flores', 'Garza', 'Trevino', 'Cantu', 'Salinas', 'Guerra', 'Smith', 'Johnson', 'Williams', 'Jones', 'Brown',
          'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Schneider', 'Mueller', 'Schulz', 'Novak', 'Kovar', 'Nguyen', 'Tran', 'Patel', 'Pham', 'Walker'] },
      Midwest: { first: US.concat(['Hunter', 'Cole', 'Paige', 'Brooke', 'Carter', 'Addison', 'Evan', 'Claire']),
        last: ['Johnson', 'Anderson', 'Nelson', 'Olson', 'Peterson', 'Larson', 'Schmidt', 'Miller', 'Meyer', 'Schultz', 'Mueller', 'Wagner', 'Hansen', 'Kowalski', 'Nowak', 'Novak', 'Smith', 'Williams', 'Brown', 'Davis',
          'Thompson', 'Becker', 'Hoffman', 'Schroeder', 'Weber', 'Klein', 'Koch', 'Carlson', 'Swanson', 'Erickson', 'Jackson', 'Robinson', 'Washington', 'Garcia', 'Nguyen', 'Patel', 'Vang', 'Dvorak', 'Kaminski', 'Sullivan'] },
      lakeshore: { first: US.concat(['Hunter', 'Cole', 'Paige', 'Brooke', 'Carter', 'Addison', 'Evan', 'Claire']),
        last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Miller', 'Jones', 'Davis', 'Anderson', 'Wilson', 'Thompson', 'Kowalski', 'Nowak', 'Wisniewski', 'Kaminski', 'Zielinski', 'Vanderberg', 'DeVries', 'DeJong', 'Hoekstra', 'Bakker',
          'Meyer', 'Schmidt', 'Schultz', 'Wagner', 'Becker', 'Haddad', 'Saad', 'Maki', 'Niemi', 'Koski', 'Jackson', 'Robinson', 'Washington', 'Harris', 'Murphy', 'Sullivan', 'Kelly', 'Nguyen', 'Patel', 'Garcia'] },
      Northeast: { first: US.concat(['Anthony', 'Dominic', 'Rachel', 'Rebecca', 'Sean', 'Brendan', 'Julia', 'Nicholas']),
        last: ['Murphy', 'Kelly', 'Sullivan', 'Walsh', 'Ryan', 'Rossi', 'Russo', 'Romano', 'Esposito', 'DeLuca', 'Marino', 'Cohen', 'Goldberg', 'Friedman', 'Schwartz', 'Katz', 'Smith', 'Johnson', 'Williams', 'Brown',
          'Rodriguez', 'Rivera', 'Chen', 'Li', 'Zhang', 'Patel', 'Singh', 'Kim', 'Kowalski', 'Fitzgerald', 'Gallagher', 'Doyle', 'McCarthy', 'Donovan', 'Campbell', 'Thompson', 'Jackson', 'Lewis', 'Clarke', 'Hughes'] },
      harbor: { first: US.concat(['Anthony', 'Dominic', 'Rachel', 'Rebecca', 'Sean', 'Brendan', 'Julia', 'Nicholas']),
        last: ['Sullivan', 'Murphy', 'Kelly', 'Walsh', 'Ryan', 'Doyle', 'Donovan', 'McCarthy', 'Gallagher', 'Fitzgerald', 'Smith', 'Johnson', 'Brown', 'Williams', 'Davis', 'Clark', 'White', 'Adams', 'Parker', 'Rossi',
          'Russo', 'DeLuca', 'Marino', 'Santoro', 'Silva', 'Pereira', 'Medeiros', 'Costa', 'Sousa', 'Pelletier', 'Ouellette', 'Gagnon', 'Roy', 'Cote', 'Levesque', 'Cohen', 'Goldberg', 'Nguyen', 'Patel', 'Chen'] },
      Southeast: { first: US.concat(['Savannah', 'Caroline', 'Madison', 'Carson', 'Jasmine', 'Isaiah', 'Gabriel', 'Marcus']),
        last: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Jackson', 'Harris', 'Robinson', 'Walker', 'Washington', 'Carter', 'Mitchell', 'Turner', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Rogers',
          'Reed', 'Cook', 'Bell', 'Bailey', 'Cooper', 'Howard', 'Ward', 'Brooks', 'Sanders', 'Hernandez', 'Rodriguez', 'Perez', 'Gonzalez', 'Fernandez', 'Diaz', 'Nguyen', 'Patel', 'Boudreaux', 'Landry', 'Hayes'] },
      // ----- the North: one language on the prairies, the coast and the great lakes, another along the Saint Lawrence
      North: { first: ['Liam', 'Noah', 'Olivia', 'Emma', 'William', 'Benjamin', 'Charlotte', 'Sophie', 'Ethan', 'Lucas', 'Chloe', 'Emily', 'Nathan', 'Thomas', 'Hannah', 'Owen', 'Connor', 'Avery', 'Jacob', 'Zoe',
        'Mackenzie', 'Logan', 'Sarah', 'Megan', 'Ryan', 'Isla', 'Jack', 'Ava', 'Mia', 'Abigail', 'Hudson', 'Carter', 'Grace', 'Ella', 'Lily', 'Evan', 'Tyler', 'Maya', 'Aiden', 'Claire'],
        last: ['Smith', 'Brown', 'Wilson', 'Johnson', 'MacDonald', 'Taylor', 'Campbell', 'Anderson', 'Martin', 'Lee', 'Thompson', 'Fraser', 'Stewart', 'Scott', 'Reid', 'Murray', 'Clarke', 'Friesen', 'Kowalchuk', 'Dhillon',
          'Sidhu', 'Singh', 'Wong', 'Chan', 'Li', 'Patel', 'Nguyen', 'Kim', 'Wang', 'Chen', 'Graham', 'Morrison', 'Ross', 'Cameron', 'Walker', 'Young', 'King', 'Robinson', 'Bell', 'Kelly'] },
      'north-fr': { first: ['Mathieu', 'Gabriel', 'Alexandre', 'Felix', 'Simon', 'Antoine', 'Etienne', 'Xavier', 'Olivier', 'Samuel', 'Thomas', 'William', 'Nathan', 'Raphael', 'Vincent', 'Maxime', 'Jeremie', 'Guillaume', 'Philippe', 'Louis',
        'Lea', 'Camille', 'Juliette', 'Rosalie', 'Maude', 'Amelie', 'Chloe', 'Florence', 'Charlotte', 'Alice', 'Emma', 'Sarah', 'Laurence', 'Ariane', 'Noemie', 'Catherine', 'Audrey', 'Gabrielle', 'Marianne', 'Elodie'],
        last: ['Tremblay', 'Gagnon', 'Roy', 'Cote', 'Bouchard', 'Gauthier', 'Morin', 'Lavoie', 'Fortin', 'Gagne', 'Ouellet', 'Pelletier', 'Belanger', 'Levesque', 'Bergeron', 'Leblanc', 'Paquette', 'Girard', 'Simard', 'Boucher',
          'Caron', 'Beaulieu', 'Cloutier', 'Dube', 'Poirier', 'Fournier', 'Lapointe', 'Leclerc', 'Lefebvre', 'Poulin', 'Thibault', 'Nadeau', 'Martin', 'Landry', 'Martel', 'Bedard', 'Grenier', 'Lessard', 'Bernier', 'Desjardins'] },
      // ----- Central America: the plateau and the north, then the islands and the isthmus
      'Central America': { first: ['Santiago', 'Mateo', 'Sebastian', 'Leonardo', 'Diego', 'Emiliano', 'Daniel', 'Miguel', 'Alejandro', 'Carlos', 'Luis', 'Jose', 'Juan', 'Angel', 'Fernando', 'Ricardo', 'Eduardo', 'Rodrigo', 'Andres', 'Javier',
        'Sofia', 'Valentina', 'Regina', 'Camila', 'Ximena', 'Maria', 'Renata', 'Fernanda', 'Daniela', 'Valeria', 'Natalia', 'Mariana', 'Paola', 'Andrea', 'Gabriela', 'Alejandra', 'Isabella', 'Victoria', 'Lucia', 'Montserrat'],
        last: ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Perez', 'Sanchez', 'Ramirez', 'Cruz', 'Flores', 'Gomez', 'Morales', 'Vazquez', 'Reyes', 'Jimenez', 'Torres', 'Diaz', 'Gutierrez', 'Ruiz',
          'Mendoza', 'Aguilar', 'Ortiz', 'Moreno', 'Castillo', 'Romero', 'Alvarez', 'Mendez', 'Chavez', 'Rivera', 'Juarez', 'Ramos', 'Dominguez', 'Herrera', 'Medina', 'Castro', 'Vargas', 'Guzman', 'Salazar', 'Trevino', 'Garza', 'Cantu', 'Villarreal', 'Elizondo'] },
      'es-isles': { first: ['Juan', 'Jose', 'Luis', 'Carlos', 'Miguel', 'Angel', 'Rafael', 'Pedro', 'Manuel', 'Francisco', 'Ramon', 'Victor', 'Jorge', 'Julio', 'Daniel', 'David', 'Sebastian', 'Diego', 'Adrian', 'Kevin',
        'Maria', 'Ana', 'Rosa', 'Carmen', 'Camila', 'Valentina', 'Sofia', 'Isabella', 'Daniela', 'Gabriela', 'Paola', 'Natalia', 'Laura', 'Andrea', 'Carolina', 'Mariana', 'Lucia', 'Elena', 'Patricia', 'Yolanda'],
        last: ['Rodriguez', 'Perez', 'Martinez', 'Garcia', 'Reyes', 'Sanchez', 'Diaz', 'Pena', 'Jimenez', 'Ramirez', 'Hernandez', 'Rosario', 'Nunez', 'Castillo', 'Santana', 'Guzman', 'Polanco', 'Mejia', 'Batista', 'Gonzalez',
          'Vargas', 'Moreno', 'Castro', 'Morales', 'Herrera', 'Rios', 'Quintero', 'Pinto', 'Cedeno', 'Samudio', 'Cordoba', 'Mendoza'] },
      // ----- South America: one language over most of it, another along the mountains
      'South America': { first: ['Miguel', 'Arthur', 'Heitor', 'Bernardo', 'Davi', 'Gabriel', 'Pedro', 'Lucas', 'Matheus', 'Rafael', 'Gustavo', 'Felipe', 'Joao', 'Guilherme', 'Vinicius', 'Thiago', 'Bruno', 'Caio', 'Enzo', 'Leonardo',
        'Alice', 'Sophia', 'Helena', 'Valentina', 'Laura', 'Isabella', 'Manuela', 'Julia', 'Luiza', 'Beatriz', 'Mariana', 'Larissa', 'Camila', 'Leticia', 'Ana', 'Giovanna', 'Fernanda', 'Bianca', 'Carolina', 'Gabriela'],
        last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
          'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Teixeira', 'Araujo', 'Cavalcanti', 'Monteiro', 'Correia', 'Batista', 'Pinto', 'Moraes', 'Tanaka', 'Schmidt'] },
      'es-andes': { first: ['Mateo', 'Sebastian', 'Matias', 'Benjamin', 'Vicente', 'Martin', 'Agustin', 'Tomas', 'Joaquin', 'Nicolas', 'Felipe', 'Diego', 'Juan', 'Andres', 'Camilo', 'Daniel', 'Samuel', 'Alejandro', 'David', 'Maximiliano',
        'Sofia', 'Isabella', 'Valentina', 'Emilia', 'Martina', 'Florencia', 'Catalina', 'Antonia', 'Josefa', 'Javiera', 'Camila', 'Mariana', 'Daniela', 'Valeria', 'Gabriela', 'Luciana', 'Paula', 'Laura', 'Manuela', 'Fernanda'],
        last: ['Gonzalez', 'Munoz', 'Rojas', 'Diaz', 'Perez', 'Soto', 'Contreras', 'Silva', 'Martinez', 'Sepulveda', 'Morales', 'Rodriguez', 'Lopez', 'Fuentes', 'Hernandez', 'Torres', 'Araya', 'Flores', 'Espinoza', 'Valenzuela',
          'Castillo', 'Tapia', 'Reyes', 'Gutierrez', 'Castro', 'Pizarro', 'Alvarez', 'Vasquez', 'Sanchez', 'Fernandez', 'Ramirez', 'Carrasco', 'Gomez', 'Cortes', 'Herrera', 'Nunez', 'Jara', 'Vergara', 'Restrepo', 'Giraldo', 'Zapata', 'Ospina', 'Cardona', 'Mejia'] },
      // ----- Europe: every city has its own language's names (this first list only for a team with no city)
      Europe: { first: ['Emma', 'Lucas', 'Sophie', 'Noah', 'Julia', 'Anna', 'Jan', 'Tomas', 'Louis', 'Chloe', 'Hugo', 'Oliver', 'Amelia', 'Luka', 'Petra', 'Nikola', 'Elena', 'Max', 'Lena', 'Felix', 'Mila', 'Erik', 'Sofia', 'Ivan'],
        last: ['Jansen', 'Bakker', 'Smith', 'Jones', 'Kowalski', 'Nowak', 'Novak', 'Dvorak', 'Dubois', 'Martin', 'Muller', 'Meier', 'Horvat', 'Petrov', 'Popescu', 'Andersson', 'Fischer', 'Weber', 'Keller', 'Laurent', 'Kovac', 'Lindberg', 'Taylor', 'Visser'] },
      'eu-thames': { first: ['Oliver', 'George', 'Harry', 'Jack', 'Charlie', 'Thomas', 'James', 'William', 'Oscar', 'Alfie', 'Henry', 'Leo', 'Freddie', 'Archie', 'Arthur', 'Olivia', 'Amelia', 'Isla', 'Emily', 'Ava', 'Lily', 'Sophie', 'Grace', 'Mia', 'Poppy', 'Ella', 'Evie', 'Charlotte', 'Jessica', 'Daisy'],
        last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Khan', 'Lewis', 'Phillips', 'Mason', 'Mitchell', 'Hughes', 'Edwards', 'Singh', 'Ahmed'] },
      'eu-lowlands': { first: ['Daan', 'Sem', 'Lucas', 'Levi', 'Luuk', 'Bram', 'Jesse', 'Thijs', 'Ruben', 'Lars', 'Jan', 'Sven', 'Niels', 'Stijn', 'Joris', 'Emma', 'Julia', 'Sanne', 'Lotte', 'Fleur', 'Anne', 'Lisa', 'Eva', 'Noor', 'Iris', 'Femke', 'Anouk', 'Sophie', 'Tess', 'Roos'],
        last: ['Jansen', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Dekker', 'Brouwer', 'Dijkstra', 'Vermeulen', 'Kok', 'Jacobs', 'Willems', 'Hoekstra', 'Maas', 'Verhoeven', 'Koster', 'Prins', 'Blom', 'Huisman', 'Peeters', 'Kuipers', 'Veenstra', 'Postma', 'Schouten', 'Wolters'] },
      'eu-vltava': { first: ['Jakub', 'Jan', 'Tomas', 'Adam', 'Matej', 'Vojtech', 'Ondrej', 'Filip', 'Lukas', 'David', 'Martin', 'Petr', 'Daniel', 'Marek', 'Stepan', 'Eliska', 'Tereza', 'Anna', 'Adela', 'Natalie', 'Karolina', 'Katerina', 'Barbora', 'Veronika', 'Lucie', 'Kristyna', 'Klara', 'Marketa', 'Zuzana', 'Hana'],
        last: ['Novak', 'Svoboda', 'Novotny', 'Dvorak', 'Cerny', 'Prochazka', 'Kucera', 'Vesely', 'Horak', 'Nemec', 'Pospisil', 'Pokorny', 'Hajek', 'Kral', 'Jelinek', 'Ruzicka', 'Benes', 'Fiala', 'Sedlacek', 'Dolezal', 'Zeman', 'Kolar', 'Navratil', 'Cermak', 'Urban', 'Vanek', 'Blazek', 'Kriz', 'Kovar', 'Maly'] },
      'eu-rhone': { first: ['Lucas', 'Hugo', 'Louis', 'Jules', 'Gabriel', 'Arthur', 'Nathan', 'Leo', 'Raphael', 'Theo', 'Maxime', 'Antoine', 'Baptiste', 'Clement', 'Romain', 'Emma', 'Chloe', 'Manon', 'Lea', 'Camille', 'Ines', 'Sarah', 'Jade', 'Louise', 'Alice', 'Juliette', 'Clara', 'Margaux', 'Pauline', 'Anais'],
        last: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin'] },
      'eu-vistula': { first: ['Jakub', 'Jan', 'Szymon', 'Antoni', 'Filip', 'Kacper', 'Mateusz', 'Michal', 'Piotr', 'Bartosz', 'Wojciech', 'Krzysztof', 'Tomasz', 'Pawel', 'Adam', 'Zofia', 'Zuzanna', 'Julia', 'Maja', 'Hanna', 'Lena', 'Alicja', 'Oliwia', 'Natalia', 'Kasia', 'Agnieszka', 'Magda', 'Ola', 'Weronika', 'Karolina'],
        last: ['Nowak', 'Kowalski', 'Wisniewski', 'Wojcik', 'Kowalczyk', 'Kaminski', 'Lewandowski', 'Zielinski', 'Szymanski', 'Wozniak', 'Dabrowski', 'Kozlowski', 'Jankowski', 'Mazur', 'Kwiatkowski', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Pawlowski', 'Michalski', 'Zajac', 'Krol', 'Wieczorek', 'Jablonski', 'Wrobel', 'Nowakowski', 'Majewski', 'Olszewski', 'Stepien', 'Malinowski'] },
      'eu-alps': { first: ['Noah', 'Luca', 'Leon', 'Liam', 'Elias', 'David', 'Nico', 'Jan', 'Tim', 'Fabian', 'Simon', 'Lukas', 'Samuel', 'Jonas', 'Matteo', 'Mia', 'Emma', 'Lena', 'Lea', 'Anna', 'Laura', 'Sara', 'Nina', 'Julia', 'Elena', 'Lara', 'Sophie', 'Alina', 'Livia', 'Chiara'],
        last: ['Muller', 'Meier', 'Schmid', 'Keller', 'Weber', 'Huber', 'Schneider', 'Meyer', 'Steiner', 'Fischer', 'Gerber', 'Brunner', 'Baumann', 'Frei', 'Zimmermann', 'Moser', 'Widmer', 'Wyss', 'Graf', 'Roth', 'Suter', 'Baumgartner', 'Bachmann', 'Studer', 'Kaufmann', 'Buhler', 'Hofer', 'Lehmann', 'Marti', 'Kunz'] },
      'eu-adriatic': { first: ['Luka', 'Ivan', 'Marko', 'Petar', 'Josip', 'Filip', 'Karlo', 'Matej', 'Ante', 'Tomislav', 'Nikola', 'Mateo', 'David', 'Jakov', 'Leon', 'Ana', 'Marija', 'Petra', 'Lucija', 'Ivana', 'Mia', 'Lana', 'Sara', 'Ema', 'Nika', 'Katarina', 'Marta', 'Dora', 'Iva', 'Tena'],
        last: ['Horvat', 'Kovacevic', 'Babic', 'Maric', 'Juric', 'Novak', 'Kovacic', 'Knezevic', 'Vukovic', 'Markovic', 'Petrovic', 'Matic', 'Tomic', 'Pavlovic', 'Kovac', 'Bozic', 'Blazevic', 'Grgic', 'Pavic', 'Radic', 'Peric', 'Filipovic', 'Saric', 'Lovric', 'Vidovic', 'Perkovic', 'Popovic', 'Bosnjak', 'Jukic', 'Barisic'] },
      'eu-balkan': { first: ['Georgi', 'Ivan', 'Dimitar', 'Nikolay', 'Petar', 'Aleksandar', 'Martin', 'Viktor', 'Kaloyan', 'Boris', 'Stefan', 'Hristo', 'Todor', 'Vasil', 'Daniel', 'Maria', 'Ivana', 'Elena', 'Viktoria', 'Gabriela', 'Aleksandra', 'Nikol', 'Raya', 'Simona', 'Teodora', 'Desislava', 'Kalina', 'Yana', 'Mila', 'Sofia'],
        last: ['Ivanov', 'Georgiev', 'Dimitrov', 'Petrov', 'Nikolov', 'Hristov', 'Stoyanov', 'Todorov', 'Iliev', 'Angelov', 'Vasilev', 'Atanasov', 'Kolev', 'Marinov', 'Popov', 'Mihaylov', 'Kostov', 'Stefanov', 'Yordanov', 'Petkov', 'Dimov', 'Aleksandrov', 'Borisov', 'Tsvetkov', 'Kirilov', 'Pavlov', 'Simeonov', 'Velikov', 'Zhelev', 'Radev'] },
      'eu-carpathian': { first: ['Andrei', 'Alexandru', 'Mihai', 'Stefan', 'David', 'Gabriel', 'Ionut', 'Cristian', 'Vlad', 'Tudor', 'Radu', 'Bogdan', 'Matei', 'Darius', 'Rares', 'Maria', 'Ioana', 'Elena', 'Ana', 'Andreea', 'Alexandra', 'Daria', 'Bianca', 'Diana', 'Cristina', 'Teodora', 'Raluca', 'Irina', 'Larisa', 'Denisa'],
        last: ['Popescu', 'Ionescu', 'Popa', 'Pop', 'Stan', 'Stoica', 'Rusu', 'Munteanu', 'Constantin', 'Moldovan', 'Dumitru', 'Dinu', 'Serban', 'Marin', 'Lazar', 'Florea', 'Ilie', 'Toma', 'Barbu', 'Cristea', 'Nistor', 'Oprea', 'Ciobanu', 'Lungu', 'Suciu', 'Muresan', 'Crisan', 'Dobre', 'Sandu', 'Vasile'] },
      'eu-aegean': { first: ['Giorgos', 'Dimitris', 'Nikos', 'Yannis', 'Kostas', 'Christos', 'Panagiotis', 'Vasilis', 'Alexandros', 'Stelios', 'Thanasis', 'Manolis', 'Petros', 'Michalis', 'Spyros', 'Maria', 'Eleni', 'Katerina', 'Sofia', 'Anna', 'Dimitra', 'Ioanna', 'Christina', 'Konstantina', 'Eirini', 'Zoe', 'Despina', 'Angeliki', 'Danae', 'Nefeli'],
        last: ['Papadopoulos', 'Papadakis', 'Georgiou', 'Dimitriou', 'Nikolaou', 'Ioannou', 'Christou', 'Konstantinou', 'Vasileiou', 'Karagiannis', 'Makris', 'Vlachos', 'Economou', 'Antoniou', 'Petrou', 'Alexiou', 'Pappas', 'Katsaros', 'Kokkinos', 'Mylonas', 'Samaras', 'Kyriakou', 'Lambrou', 'Raptis', 'Galanis', 'Stavrou', 'Zervas', 'Bakas', 'Manos', 'Sideris'] },
      'eu-nordic': { first: ['Oscar', 'William', 'Lucas', 'Elias', 'Hugo', 'Oliver', 'Liam', 'Axel', 'Erik', 'Viktor', 'Filip', 'Emil', 'Anton', 'Isak', 'Gustav', 'Alice', 'Maja', 'Elsa', 'Ella', 'Wilma', 'Ebba', 'Astrid', 'Saga', 'Freja', 'Alma', 'Linnea', 'Ida', 'Emma', 'Julia', 'Klara'],
        last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson', 'Lindberg', 'Lindstrom', 'Lindqvist', 'Lindgren', 'Berg', 'Axelsson', 'Bergstrom', 'Lundberg', 'Lundgren', 'Mattsson', 'Berglund', 'Fredriksson', 'Sandberg', 'Henriksson', 'Forsberg'] },
      'eu-dnipro': { first: ['Oleksandr', 'Andriy', 'Dmytro', 'Maksym', 'Artem', 'Ivan', 'Mykola', 'Bohdan', 'Yaroslav', 'Taras', 'Vladyslav', 'Denys', 'Nazar', 'Oleh', 'Danylo', 'Olena', 'Anna', 'Mariia', 'Sofiia', 'Anastasiia', 'Kateryna', 'Yuliia', 'Daryna', 'Viktoriia', 'Oksana', 'Iryna', 'Natalia', 'Tetiana', 'Polina', 'Solomiia'],
        last: ['Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Boyko', 'Melnyk', 'Kovalchuk', 'Oliynyk', 'Shevchuk', 'Polishchuk', 'Lysenko', 'Rudenko', 'Savchenko', 'Petrenko', 'Marchenko', 'Moroz', 'Koval', 'Pavlenko', 'Kuzmenko', 'Ponomarenko', 'Havrylenko', 'Klymenko', 'Vasylenko', 'Levchenko', 'Karpenko', 'Sydorenko', 'Mazur', 'Tkachuk', 'Honcharenko'] },
      // ----- Anatolia and the Middle East
      Anatolia: { first: ['Emre', 'Mert', 'Can', 'Burak', 'Kerem', 'Arda', 'Yusuf', 'Omer', 'Cem', 'Deniz', 'Ege', 'Kaan', 'Berk', 'Efe', 'Alp', 'Onur', 'Baris', 'Tolga', 'Umut', 'Mehmet',
        'Elif', 'Zeynep', 'Ece', 'Selin', 'Defne', 'Ayse', 'Ela', 'Irem', 'Melis', 'Naz', 'Asli', 'Buse', 'Ceren', 'Derya', 'Esra', 'Gizem', 'Ipek', 'Merve', 'Ozge', 'Yagmur'],
        last: ['Yilmaz', 'Kaya', 'Demir', 'Celik', 'Sahin', 'Yildiz', 'Yildirim', 'Ozturk', 'Aydin', 'Ozdemir', 'Arslan', 'Dogan', 'Kilic', 'Aslan', 'Cetin', 'Kara', 'Koc', 'Kurt', 'Ozkan', 'Simsek',
          'Polat', 'Korkmaz', 'Ozcan', 'Cakir', 'Erdem', 'Acar', 'Bulut', 'Gunes', 'Aksoy', 'Tekin', 'Karaca', 'Bozkurt', 'Turan', 'Avci', 'Keskin', 'Unal', 'Guler', 'Tas', 'Sen', 'Bayram'] },
      'Middle East': { first: ['Noa', 'Yael', 'Tamar', 'Maya', 'Shira', 'Adi', 'Roni', 'Tal', 'Gal', 'Michal', 'Hila', 'Liat', 'Dana', 'Neta', 'Ella', 'Lia', 'Avigail', 'Talia', 'Agam', 'Yuval',
        'Daniel', 'David', 'Yoni', 'Itai', 'Omer', 'Amit', 'Lior', 'Eitan', 'Ariel', 'Noam', 'Ido', 'Nadav', 'Guy', 'Roi', 'Yonatan', 'Uri', 'Alon', 'Tomer', 'Matan', 'Ori'],
        last: ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Friedman', 'Katz', 'Azoulay', 'Avraham', 'Shapiro', 'Golan', 'Segal', 'Sasson', 'Amar', 'Levin', 'Rosen', 'Klein', 'Weiss', 'Shalom',
          'Gabay', 'Ohana', 'Malka', 'Hadad', 'Ashkenazi', 'Shahar', 'Baruch', 'Navon', 'Stern', 'Goldberg', 'Yosef', 'Carmi', 'Dror', 'Erez', 'Harel', 'Koren', 'Lavi', 'Regev', 'Tzur', 'Khoury', 'Nasser', 'Mansour'] },
      // ----- East Asia: an English first name before a family name as each shore spells it; two cities with given names of their own
      'East Asia': { first: EN,
        last: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Lin', 'Gao', 'Luo', 'Zheng', 'Liang', 'Xie', 'Tang', 'Song', 'Han', 'Feng', 'Deng', 'Cao', 'Peng',
          'Zeng', 'Xiao', 'Tian', 'Dong', 'Pan', 'Yuan', 'Cai', 'Jiang', 'Yu', 'Du'] },
      'ea-island': { first: EN,
        last: ['Chen', 'Lin', 'Huang', 'Chang', 'Lee', 'Wang', 'Wu', 'Liu', 'Tsai', 'Yang', 'Hsu', 'Cheng', 'Hsieh', 'Kuo', 'Hung', 'Chiu', 'Tseng', 'Liao', 'Lai', 'Chou', 'Yeh', 'Su', 'Chuang', 'Lu', 'Chiang', 'Ho', 'Lo', 'Kao', 'Hsiao', 'Pan',
          'Chien', 'Chu', 'Chung', 'Peng', 'Yu', 'Tu', 'Shih', 'Fang', 'Weng', 'Tsao'] },
      'ea-harbour': { first: EN,
        last: ['Chan', 'Wong', 'Lee', 'Cheung', 'Lau', 'Ng', 'Leung', 'Ho', 'Lam', 'Yeung', 'Chow', 'Tsang', 'Cheng', 'Lai', 'Yip', 'Fung', 'Kwok', 'Tang', 'Yuen', 'Mak', 'Poon', 'Tam', 'Siu', 'Kwan', 'Law', 'Hui', 'Chiu', 'Tse', 'Wan', 'Luk'] },
      'ea-kanto': { first: ['Haruto', 'Yuto', 'Sota', 'Ren', 'Riku', 'Kaito', 'Hinata', 'Kenta', 'Daiki', 'Takumi', 'Sho', 'Akira', 'Hiroshi', 'Yuki', 'Ryo', 'Yui', 'Aoi', 'Sakura', 'Hina', 'Mio', 'Rin', 'Yuna', 'Emi', 'Mai', 'Nanami', 'Misaki', 'Haruka', 'Ayaka', 'Kana', 'Miyu'],
        last: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Saito', 'Mori', 'Ikeda', 'Hashimoto', 'Ishikawa', 'Ogawa', 'Fujita', 'Okada', 'Goto', 'Hasegawa', 'Murakami'] },
      'ea-han': { first: ['Minjun', 'Seojun', 'Jiho', 'Hyunwoo', 'Dohyun', 'Junho', 'Sungmin', 'Woojin', 'Taeyang', 'Jisung', 'Minho', 'Jaehyun', 'Donghyun', 'Seungwoo', 'Yunho', 'Jisoo', 'Jiwoo', 'Seoyeon', 'Minseo', 'Yuna', 'Jimin', 'Sumin', 'Yejin', 'Eunji', 'Hana', 'Jiwon', 'Soyeon', 'Chaewon', 'Dahyun', 'Nayeon'],
        last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong', 'Jeon', 'Ko', 'Moon', 'Yang', 'Son', 'Bae', 'Baek', 'Heo', 'Nam', 'Ryu'] },
      // ----- Asia Pacific: the southern continent, then the cities across the ocean, each with its own
      'Asia Pacific': { first: ['Jack', 'Oliver', 'William', 'Noah', 'Lachlan', 'Hamish', 'Angus', 'Liam', 'Ethan', 'Harry', 'Riley', 'Cooper', 'Mitchell', 'Flynn', 'Archie', 'Hugo', 'Charlotte', 'Mia', 'Zoe', 'Ruby',
        'Chloe', 'Isla', 'Matilda', 'Amelia', 'Olivia', 'Sienna', 'Ella', 'Grace', 'Lucy', 'Imogen', 'Poppy', 'Hannah', 'Jasmine', 'Thomas', 'James', 'Samuel', 'Emily', 'Sophie', 'Ava', 'Max'],
        last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'White', 'Martin', 'Anderson', 'Thompson', 'Walker', 'Harris', 'Kelly', 'Ryan', 'King', 'Wright', 'Campbell', 'Robinson', 'Mitchell',
          'Nguyen', 'Tran', 'Lee', 'Chen', 'Wang', 'Singh', 'Patel', 'McDonald', 'Fraser', 'Murray', 'Stewart', 'Thomas', 'Roberts', 'Clarke', 'Edwards', 'Turner', 'Hughes', 'Baker', 'Morris', 'Watson'] },
      'ap-cloud': { first: ['Oliver', 'Jack', 'Noah', 'Leo', 'Lucas', 'George', 'Charlie', 'Hunter', 'Liam', 'Mason', 'Tane', 'Nikau', 'Ari', 'Manaia', 'Kahu', 'Charlotte', 'Isla', 'Amelia', 'Olivia', 'Mia', 'Ava', 'Harper', 'Lily', 'Ella', 'Sophie', 'Aroha', 'Mere', 'Anahera', 'Maia', 'Kiri'],
        last: ['Smith', 'Wilson', 'Williams', 'Brown', 'Taylor', 'Jones', 'Walker', 'Thompson', 'Anderson', 'King', 'Harris', 'Scott', 'Campbell', 'Stewart', 'Robinson', 'Young', 'Mitchell', 'Clark', 'Parata', 'Ngata', 'Tamihana', 'Tipene', 'Paewai', 'Waaka', 'Rangi', 'Hohepa', 'Singh', 'Patel', 'Wang', 'Li'] },
      'ap-ganges': { first: ['Aarav', 'Arjun', 'Rohan', 'Vivaan', 'Aditya', 'Ishaan', 'Kabir', 'Rahul', 'Karan', 'Dev', 'Vihaan', 'Siddharth', 'Aryan', 'Nikhil', 'Varun', 'Priya', 'Ananya', 'Diya', 'Aanya', 'Isha', 'Kavya', 'Meera', 'Neha', 'Riya', 'Saanvi', 'Tanvi', 'Anika', 'Pooja', 'Shreya', 'Aditi'],
        last: ['Sharma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Shah', 'Mehta', 'Joshi', 'Desai', 'Iyer', 'Nair', 'Rao', 'Verma', 'Kapoor', 'Malhotra', 'Chopra', 'Agarwal', 'Kulkarni', 'Deshmukh', 'Pillai', 'Menon', 'Bose', 'Chatterjee', 'Mishra', 'Pandey', 'Jain', 'Bhatt', 'Saxena', 'Banerjee'] },
      'ap-strait': { first: EN,
        last: ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Chan', 'Koh', 'Teo', 'Ang', 'Yeo', 'Tay', 'Ho', 'Low', 'Toh', 'Sim', 'Chong', 'Chia', 'Seah', 'Lau', 'Chew', 'Foo', 'Quek', 'Neo', 'Leong', 'Phua', 'Soh', 'Wee'] },
      'ap-klang': { first: ['Aiman', 'Amir', 'Danial', 'Hakim', 'Irfan', 'Haziq', 'Farhan', 'Syafiq', 'Adam', 'Imran', 'Arif', 'Faiz', 'Nurul', 'Aisyah', 'Siti', 'Farah', 'Alya', 'Amira', 'Hana', 'Sofea', 'Iman', 'Zara', 'Nadia', 'Aina', 'Balqis', 'Dina'],
        last: ['Rahman', 'Ismail', 'Hassan', 'Ibrahim', 'Abdullah', 'Ahmad', 'Yusof', 'Aziz', 'Hamid', 'Razak', 'Osman', 'Salleh', 'Zainal', 'Halim', 'Rashid', 'Karim', 'Latif', 'Mahmud', 'Hashim', 'Idris', 'Jaafar', 'Kassim', 'Mansor', 'Nordin', 'Othman', 'Zakaria'] },
      'ap-mekong': { first: ['Minh', 'Anh', 'Huy', 'Khoa', 'Nam', 'Duc', 'Long', 'Tuan', 'Quang', 'Phuc', 'Bao', 'Dat', 'Hieu', 'Khang', 'Thanh', 'Linh', 'Mai', 'Lan', 'Thao', 'Trang', 'Ngoc', 'Vy', 'My', 'Hanh', 'Nhi', 'Chi', 'Ha', 'Yen', 'Thu', 'Quynh'],
        last: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Phan', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly', 'Truong', 'Dinh', 'Lam', 'Trinh', 'Luong', 'Dao', 'Doan', 'Vuong', 'Ta', 'Cao'] },
      'ap-pasig': { first: ['Miguel', 'Gabriel', 'Joshua', 'Christian', 'Angelo', 'Paolo', 'Carlo', 'Marco', 'John', 'Mark', 'Rafael', 'Luis', 'Enzo', 'Nathan', 'Daniel', 'Angel', 'Nicole', 'Bea', 'Bianca', 'Patricia', 'Kristine', 'Andrea', 'Maria', 'Sofia', 'Isabel', 'Jasmine', 'Angela', 'Camille', 'Samantha', 'Althea'],
        last: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Castillo', 'Villanueva', 'Ramos', 'Delacruz', 'Fernandez', 'Gonzales', 'Lopez', 'Navarro', 'Salazar', 'Domingo', 'Pascual', 'Soriano', 'Mercado', 'Aguilar', 'Tolentino', 'Manalo', 'Dizon', 'Pangilinan', 'Flores', 'Rivera', 'Castro', 'Aquino'] }
    };
  }
  // the cities with names of their own (every other city: its district's list if it has one, else its area's)
  D.NAME_AT = {
    Honolulu: 'us-islands',
    Montreal: 'north-fr', Sherbrooke: 'north-fr', 'Quebec City': 'north-fr', 'Trois-Rivieres': 'north-fr',
    'Santo Domingo': 'es-isles', 'Panama City': 'es-isles',
    Santiago: 'es-andes', Cali: 'es-andes', Medellin: 'es-andes',
    'Greater London': 'eu-thames', Eindhoven: 'eu-lowlands', Groningen: 'eu-lowlands', Prague: 'eu-vltava', Lyon: 'eu-rhone', Nice: 'eu-rhone', Warsaw: 'eu-vistula', Lublin: 'eu-vistula', Krakow: 'eu-vistula',
    Zurich: 'eu-alps', Rijeka: 'eu-adriatic', Sofia: 'eu-balkan', Cluj: 'eu-carpathian', Athens: 'eu-aegean', Stockholm: 'eu-nordic', Kyiv: 'eu-dnipro',
    Taipei: 'ea-island', Taichung: 'ea-island', Chiayi: 'ea-island', Tainan: 'ea-island', Kaohsiung: 'ea-island', 'Hong Kong': 'ea-harbour', Tokyo: 'ea-kanto', Seoul: 'ea-han',
    Auckland: 'ap-cloud', Mumbai: 'ap-ganges', Delhi: 'ap-ganges', Singapore: 'ap-strait', 'Kuala Lumpur': 'ap-klang', 'Ho Chi Minh City': 'ap-mekong', Manila: 'ap-pasig'
  };
  D.NAMES_INTL = { first: D.FIRST, last: D.LAST };
  // the name list of a city of the map
  D.namesAt = function (hub) {
    const NG = D.NAME_GROUPS, hb = hub && G.Geo && G.Geo.hub ? G.Geo.hub(hub) : null;
    return NG[D.NAME_AT[hub]] || (hb && (NG[hb.d] || NG[hb.r])) || null;
  };
  // whose names: a team (yours or another: the city it stands in), { hub } (a city), an area or a district by name
  // (its own list), 'intl' (the international mix), or nothing at all: your own team, and before there is a game the mix
  D.namesFor = function (who) {
    const t = who === undefined ? (G.S && G.S.team) || null : who, NG = D.NAME_GROUPS;
    if (!t || t === 'intl') return D.NAMES_INTL;
    if (typeof t === 'string') return NG[t] || NG[(D.DISTRICT && D.DISTRICT[t] || {}).region] || NG[(D.REGION_OLD || {})[t]] || D.NAMES_INTL;
    let hub = t.hub && t.num == null ? t.hub : null;
    if (!hub && t.num != null && G.S && G.Geo && G.Geo.posOf) { try { hub = G.Geo.posOf(G.S, t, G.Geo.cyOf(G.S)).hub; } catch (e) { hub = null; } }
    return D.namesAt(hub) || NG[t.home] || NG[t.z] || NG[t.region] || NG[(D.REGION_OLD || {})[t.region]] || D.NAMES_INTL;
  };
  D.personName = function (rng, who) {
    const L = D.namesFor(who), f = rng.pick(L.first); let l = rng.pick(L.last);
    if (l === f) l = L.last[(L.last.indexOf(l) + 1) % L.last.length]; // nobody is called Mitchell Mitchell
    return f + ' ' + l;
  };

  // ---------- offseason events ----------
  // Every home has its own offseason events: [name, city] for each of D.OFFSEASON_EVENTS, in one of the home's cities.
  // All of them are a short trip. Outside North America there is no October event: the month is kept free, so that an
  // invited team can fly to Summit Champs.
  D.OFFSEASON_BY = {
    West: { os_jun: ['Neon Nights Invitational', 'Las Vegas'], os_jul: ['Sagebrush Showdown', 'Reno'], os_sep: ['Gem State Robot Rodeo', 'Boise'], os_oct: ['Big Sky Brawl', 'Missoula'], os_nov: ['Silver State Showcase', 'Las Vegas'] },
    sierra: { os_jun: ['Golden Coast Invitational', 'Los Angeles'], os_jul: ['Surf City Scrimmage', 'Orange County'], os_sep: ['Gold Rush Rumble', 'Sacramento'], os_oct: ['Central Valley Throwdown', 'Fresno'], os_nov: ['Bay Fog Showcase', 'San Francisco Bay'] },
    evergreen: { os_jun: ['Rose City Invitational', 'Portland'], os_jul: ['Puget Sound Summer Scrimmage', 'Tacoma'], os_sep: ['Salmon Run Showdown', 'Seattle'], os_oct: ['Apple Harvest Classic', 'Yakima'], os_nov: ['First Snow Showcase', 'Spokane'] },
    Southwest: { os_jun: ['Sonoran Sun Invitational', 'Phoenix'], os_jul: ['Mile High Mayhem', 'Denver'], os_sep: ['High Mesa Showdown', 'Albuquerque'], os_oct: ['Wasatch Fall Classic', 'Salt Lake City'], os_nov: ['Route 66 Roundup', 'Tulsa'] },
    mesa: { os_jun: ['Gulf Coast Gearfest', 'Houston'], os_jul: ['Hill Country Heat', 'Austin'], os_sep: ['Stockyards Showdown', 'Fort Worth'], os_oct: ['State Fair Classic', 'Dallas'], os_nov: ['Alamo City Roundup', 'San Antonio'] },
    Midwest: { os_jun: ['Windy City Warm-Up', 'Chicago'], os_jul: ['Crossroads Invitational', 'Indianapolis'], os_sep: ['North Star Showdown', 'Minneapolis'], os_oct: ['Fountain City Throwdown', 'Kansas City'], os_nov: ['Buckeye Bot Brawl', 'Columbus'] },
    lakeshore: { os_jun: ['Mitten Summer Invitational', 'Grand Rapids'], os_jul: ['Cherry Capital Clash', 'Traverse City'], os_sep: ['Motor City Showdown', 'Detroit'], os_oct: ['Cider Mill Classic', 'Ann Arbor'], os_nov: ['Lake Effect Showcase', 'Kalamazoo'] },
    Northeast: { os_jun: ['Boardwalk Brawl', 'Central Jersey'], os_jul: ['Liberty Bell Rally', 'Philadelphia'], os_sep: ['Erie Canal Classic', 'Rochester'], os_oct: ['Three Rivers Rumble', 'Pittsburgh'], os_nov: ['Charm City Showcase', 'Baltimore'] },
    harbor: { os_jun: ['Pine Tree Invitational', 'Bangor'], os_jul: ['Ocean State Open', 'Providence'], os_sep: ['Granite State Rumble', 'Manchester'], os_oct: ['Fall Foliage Classic', 'Burlington'], os_nov: ['Minuteman Muster', 'Boston'] },
    Southeast: { os_jun: ['Sunshine State Scrimmage', 'Orlando'], os_jul: ['Sweet Tea Showdown', 'Atlanta'], os_sep: ['Tobacco Road Rumble', 'Raleigh'], os_oct: ['Smoky Mountain Classic', 'Knoxville'], os_nov: ['Bayou Bot Boil', 'New Orleans'] },
    North: { os_jun: ['St. Lawrence Summer Open', 'Montreal'], os_jul: ['Stampede City Showdown', 'Calgary'], os_sep: ['Pacific Gateway Invitational', 'Vancouver'], os_oct: ['Prairie Harvest Classic', 'Winnipeg'], os_nov: ['First Frost Showcase', 'Quebec City'] },
    trillium: { os_jun: ['Golden Horseshoe Invitational', 'Hamilton'], os_jul: ['Cottage Country Classic', 'Barrie'], os_sep: ['Tech Triangle Tune-Up', 'Waterloo'], os_oct: ['Niagara Harvest Cup', 'St. Catharines'], os_nov: ['Hat Trick Showdown', 'Toronto'] },
    'Central America': { os_jun: ['Laguna Summer Cup', 'Torreon'], os_jul: ['Saddle Mountain Invitational', 'Monterrey'], os_sep: ['Independence Cup', 'Mexico City'], os_oct: ['Mariachi Classic', 'Guadalajara'], os_nov: ['Marigold Showcase', 'Puebla'] },
    'South America': { os_jun: ['June Festival Showdown', 'Sao Paulo'], os_jul: ['Planalto Winter Cup', 'Brasilia'], os_sep: ['Pampas Open', 'Porto Alegre'], os_nov: ['Carioca Showcase', 'Rio de Janeiro'] },
    Europe: { os_jun: ['Midsummer Robot Games', 'Stockholm'], os_jul: ['Lowlands Open', 'Eindhoven'], os_sep: ['Vistula Cup', 'Warsaw'], os_nov: ['Alpine Winter Showcase', 'Zurich'] },
    Anatolia: { os_jun: ['Bosphorus Summer Cup', 'Istanbul'], os_jul: ['Aegean Open', 'Izmir'], os_sep: ['Anatolian Plateau Invitational', 'Ankara'], os_nov: ['Turquoise Coast Showcase', 'Antalya'] },
    levant: { os_jun: ['White City Summer Scrimmage', 'Tel Aviv'], os_jul: ['Carmel Cup', 'Haifa'], os_sep: ['Citrus Grove Open', 'Rehovot'], os_nov: ['Golden Stone Showcase', 'Jerusalem'] },
    'East Asia': { os_jun: ['Dragon Boat Invitational', 'Hangzhou'], os_jul: ['Pearl River Summer Open', 'Shenzhen'], os_sep: ['Mid-Autumn Moon Cup', 'Shanghai'], os_nov: ['Jade Mountain Showcase', 'Taipei'] },
    'Asia Pacific': { os_jun: ['Harbour City Winter Open', 'Sydney'], os_jul: ['Yarra Robot Carnival', 'Melbourne'], os_sep: ['Golden Wattle Invitational', 'Canberra'], os_nov: ['Jacaranda Showcase', 'Brisbane'] }
  };
  D.OFFSEASON_BY['Middle East'] = D.OFFSEASON_BY.levant;
  // the offseason events of a team: its district's (or the district its cities will form), else its area's
  D.offseasonHome = team => (team && (team.home || team.z || team.region)) || null;
  D.offseasonAbroad = team => !!team && D.GROUP[team.region] !== undefined && D.GROUP[team.region] !== 'NA';

  // ---------- the real seasons, 2016 to 2026 ----------
  // real teams that played each season (FIRST's team index)
  D.REAL_TEAMS = { 2016: 3130, 2017: 3346, 2018: 3645, 2019: 3790, 2020: 3910, 2022: 3176, 2023: 3323, 2024: 3498, 2025: 3706, 2026: 3753 };
  // real teams per block of a thousand numbers (0xxx, 1xxx … 11xxx), by zone and season
  D.NUMS = {
    West: { 2016: [5,5,17,12,4,9,0,0,0,0,0,0], 2017: [5,5,16,12,3,7,7,0,0,0,0,0], 2018: [5,4,15,12,3,7,11,3,0,0,0,0], 2019: [5,4,16,11,2,6,8,16,0,0,0,0], 2020: [5,5,15,10,2,5,7,13,7,0,0,0], 2022: [5,4,10,8,2,5,5,12,12,0,0,0], 2023: [5,4,13,8,2,5,6,11,11,10,0,0], 2024: [5,4,13,7,2,5,5,8,9,14,0,0], 2025: [4,4,13,7,2,5,4,7,10,13,4,0], 2026: [3,4,13,7,2,3,3,6,9,8,4,3] },
    Southwest: { 2016: [10,24,39,36,26,27,5,0,0,0,0,0], 2017: [10,24,38,35,23,23,25,0,0,0,0,0], 2018: [10,23,36,34,20,20,31,6,0,0,0,0], 2019: [10,23,35,31,19,17,22,25,0,0,0,0], 2020: [10,22,31,31,19,14,20,24,21,0,0,0], 2022: [8,18,26,25,17,12,12,14,20,0,0,0], 2023: [7,16,27,23,18,10,13,14,13,9,0,0], 2024: [7,16,25,24,17,9,10,14,10,21,0,0], 2025: [8,17,24,22,16,7,10,10,9,18,13,0], 2026: [8,17,24,21,14,6,7,9,6,15,13,6] },
    Midwest: { 2016: [36,64,107,101,113,88,24,0,0,0,0,0], 2017: [37,62,104,97,102,85,65,0,0,0,0,0], 2018: [37,64,99,94,100,79,79,26,0,0,0,0], 2019: [37,62,98,92,96,77,65,70,0,0,0,0], 2020: [38,60,95,88,94,74,59,65,32,0,0,0], 2022: [34,56,83,74,78,61,44,45,49,0,0,0], 2023: [35,54,83,75,75,57,43,49,47,15,0,0], 2024: [35,53,79,78,74,57,43,45,47,45,0,0], 2025: [37,55,78,72,78,55,42,43,44,42,31,0], 2026: [37,54,78,70,75,56,41,40,45,38,28,15] },
    Northeast: { 2016: [90,56,44,42,51,49,8,0,0,0,0,0], 2017: [87,56,43,41,46,46,24,0,0,0,0,0], 2018: [85,54,43,39,47,40,40,14,0,0,0,0], 2019: [83,55,43,37,43,40,38,29,0,0,0,0], 2020: [84,53,44,36,40,38,33,24,14,0,0,0], 2022: [78,44,41,28,29,31,28,20,24,0,0,0], 2023: [77,44,41,27,27,30,25,19,22,12,0,0], 2024: [78,41,38,28,28,29,25,18,20,21,0,0], 2025: [80,39,37,28,27,26,26,18,19,22,30,0], 2026: [81,41,37,27,27,25,24,18,19,21,33,8] },
    Southeast: { 2016: [47,59,42,78,87,103,29,0,0,0,0,0], 2017: [47,54,41,74,79,93,79,0,0,0,0,0], 2018: [48,54,40,66,76,83,91,36,0,0,0,0], 2019: [48,52,38,60,69,77,82,100,0,0,0,0], 2020: [48,51,38,55,66,72,73,77,31,0,0,0], 2022: [42,42,35,43,51,52,54,33,57,0,0,0], 2023: [45,44,35,40,45,45,47,34,47,35,0,0], 2024: [44,41,33,42,44,45,43,24,42,79,0,0], 2025: [45,41,33,47,42,39,42,26,38,67,50,0], 2026: [45,41,33,44,42,38,42,25,33,58,49,45] },
    lakeshore: { 2016: [48,23,26,45,53,158,58,0,0,0,0,0], 2017: [48,23,26,43,54,143,112,0,0,0,0,0], 2018: [48,23,26,43,53,142,117,56,0,0,0,0], 2019: [47,22,26,42,53,134,109,109,0,0,0,0], 2020: [46,21,25,42,52,133,99,101,50,0,0,0], 2022: [44,20,23,38,42,105,68,72,44,0,0,0], 2023: [44,19,23,37,43,102,67,65,39,40,0,0], 2024: [42,19,23,37,43,99,63,63,37,88,0,0], 2025: [42,20,23,37,40,99,59,58,36,77,35,0], 2026: [40,20,22,36,40,94,57,55,32,72,33,29] },
    harbor: { 2016: [45,31,17,25,28,31,5,0,0,0,0,0], 2017: [45,31,17,23,27,27,24,0,0,0,0,0], 2018: [47,32,17,23,26,26,26,12,0,0,0,0], 2019: [47,30,18,20,24,21,24,19,0,0,0,0], 2020: [46,30,18,19,26,21,24,20,7,0,0,0], 2022: [44,26,16,14,19,18,18,12,15,0,0,0], 2023: [43,26,16,15,18,17,17,12,14,7,0,0], 2024: [43,26,16,15,16,17,17,10,14,11,0,0], 2025: [44,24,16,14,16,16,15,10,14,10,12,0], 2026: [44,24,17,14,15,16,15,8,13,9,16,9] },
    evergreen: { 2016: [10,13,35,36,40,21,2,0,0,0,0,0], 2017: [10,13,34,28,37,20,12,0,0,0,0,0], 2018: [10,13,31,28,37,16,13,4,0,0,0,0], 2019: [10,13,31,28,31,14,13,10,0,0,0,0], 2020: [10,13,30,25,30,14,10,5,9,0,0,0], 2022: [9,11,26,20,26,11,7,3,8,0,0,0], 2023: [10,10,26,18,24,10,8,3,8,2,0,0], 2024: [11,9,26,18,23,10,8,3,7,12,0,0], 2025: [11,10,26,19,21,10,8,3,7,11,6,0], 2026: [11,9,25,17,20,9,7,3,7,11,6,1] },
    mesa: { 2016: [11,6,17,32,28,36,11,0,0,0,0,0], 2017: [10,6,16,33,23,33,34,0,0,0,0,0], 2018: [9,6,17,27,22,31,34,16,0,0,0,0], 2019: [9,5,17,27,19,28,28,40,0,0,0,0], 2020: [9,5,17,23,18,27,26,33,26,0,0,0], 2022: [7,4,16,19,15,23,12,21,37,0,0,0], 2023: [7,4,17,16,15,21,13,20,28,18,0,0], 2024: [7,4,16,14,15,21,13,18,29,39,0,0], 2025: [8,4,15,15,15,22,14,17,26,31,8,0], 2026: [9,4,16,13,16,22,15,15,17,22,9,9] },
    sierra: { 2016: [46,30,29,41,44,58,10,0,0,0,0,0], 2017: [47,28,28,41,43,52,40,0,0,0,0,0], 2018: [47,27,30,41,42,50,57,19,0,0,0,0], 2019: [45,27,30,37,42,47,51,35,0,0,0,0], 2020: [45,28,28,37,43,44,46,34,19,0,0,0], 2022: [40,27,28,30,36,33,33,21,23,0,0,0], 2023: [41,28,26,29,33,31,32,18,23,10,0,0], 2024: [37,28,26,31,33,31,31,18,19,29,0,0], 2025: [38,25,26,30,32,33,29,17,19,22,18,0], 2026: [38,26,26,28,32,33,30,15,18,21,18,11] },
    North: { 2016: [1,1,1,18,18,23,7,0,0,0,0,0], 2017: [1,1,1,17,15,20,25,0,0,0,0,0], 2018: [1,1,1,16,12,18,25,18,0,0,0,0], 2019: [1,1,1,15,12,16,21,30,0,0,0,0], 2020: [1,1,1,15,11,15,16,28,16,0,0,0], 2022: [1,0,1,12,7,7,10,11,8,0,0,0], 2023: [1,0,1,12,7,7,8,13,6,8,0,0], 2024: [1,0,1,11,5,6,9,11,6,16,0,0], 2025: [1,0,1,10,6,5,7,10,6,12,5,0], 2026: [1,0,1,11,6,4,7,10,7,11,3,5] },
    trillium: { 2016: [10,12,13,11,42,37,12,0,0,0,0,0], 2017: [11,13,13,7,39,32,30,0,0,0,0,0], 2018: [11,11,12,7,36,28,42,9,0,0,0,0], 2019: [11,11,13,6,35,24,42,31,0,0,0,0], 2020: [11,11,13,7,30,19,34,28,13,0,0,0], 2022: [6,8,8,5,15,7,10,6,12,0,0,0], 2023: [8,10,12,7,19,14,22,18,11,6,0,0], 2024: [7,9,12,6,19,15,21,18,11,20,0,0], 2025: [8,9,12,6,16,14,14,15,9,15,12,0], 2026: [8,8,11,6,16,14,13,11,8,13,6,6] },
    'Central America': { 2016: [0,0,1,11,20,12,11,0,0,0,0,0], 2017: [0,0,1,9,19,14,28,0,0,0,0,0], 2018: [0,0,1,11,18,13,31,9,0,0,0,0], 2019: [0,0,1,11,15,11,22,20,0,0,0,0], 2020: [0,0,1,11,17,11,23,18,11,0,0,0], 2022: [0,0,1,9,15,11,17,12,13,0,0,0], 2023: [0,0,1,9,16,10,17,13,13,14,0,0], 2024: [0,0,1,10,15,10,17,13,9,15,0,0], 2025: [0,0,1,10,17,10,15,11,9,13,8,0], 2026: [0,0,1,10,17,10,15,10,8,12,7,8] },
    'South America': { 2016: [1,4,1,0,0,3,1,0,0,0,0,0], 2017: [1,4,1,0,0,3,2,0,0,0,0,0], 2018: [1,4,1,0,0,2,5,1,0,0,0,0], 2019: [1,4,1,0,0,2,4,8,0,0,0,0], 2020: [1,4,1,0,0,2,2,7,3,0,0,0], 2022: [0,3,0,0,0,1,2,5,1,0,0,0], 2023: [0,3,0,0,0,1,2,6,5,29,0,0], 2024: [0,3,0,0,0,1,2,6,3,43,0,0], 2025: [0,3,0,0,0,1,2,6,3,40,17,0], 2026: [0,3,0,0,0,1,2,6,4,39,13,3] },
    Europe: { 2016: [0,2,0,2,1,5,1,0,0,0,0,0], 2017: [0,2,0,1,1,5,3,0,0,0,0,0], 2018: [0,2,0,1,1,5,5,2,0,0,0,0], 2019: [0,2,0,1,1,5,5,6,0,0,0,0], 2020: [0,2,0,1,1,5,4,5,4,0,0,0], 2022: [0,2,0,0,1,3,3,2,1,0,0,0], 2023: [0,1,0,0,1,4,3,2,2,6,0,0], 2024: [0,2,0,0,1,3,3,2,2,8,0,0], 2025: [0,1,0,0,1,3,1,3,1,7,4,0], 2026: [0,1,0,0,1,3,1,3,0,7,2,3] },
    Anatolia: { 2016: [0,0,1,2,1,6,10,0,0,0,0,0], 2017: [0,0,1,2,1,4,22,0,0,0,0,0], 2018: [0,0,1,2,2,5,23,20,0,0,0,0], 2019: [0,0,1,2,2,4,24,50,0,0,0,0], 2020: [0,0,1,2,2,4,21,39,41,0,0,0], 2022: [0,0,1,1,2,4,16,26,57,0,0,0], 2023: [0,0,1,1,2,4,18,22,46,32,0,0], 2024: [0,0,1,2,2,4,17,22,34,56,0,0], 2025: [0,0,1,2,2,4,19,17,36,46,65,0], 2026: [0,0,1,2,2,4,19,17,31,38,59,35] },
    levant: { 2016: [0,12,7,9,13,16,5,0,0,0,0,0], 2017: [0,12,6,9,11,15,11,0,0,0,0,0], 2018: [0,12,6,9,11,14,10,8,0,0,0,0], 2019: [0,11,6,9,11,14,8,7,0,0,0,0], 2020: [0,10,6,9,9,13,8,7,5,0,0,0], 2022: [0,10,5,8,8,11,6,5,3,0,0,0], 2023: [0,10,6,8,8,11,6,5,2,2,0,0], 2024: [0,10,6,8,8,11,6,5,2,5,0,0], 2025: [0,10,6,8,8,11,5,5,2,5,2,0], 2026: [0,9,6,8,8,11,5,5,2,5,4,7] },
    'East Asia': { 2016: [0,0,0,0,2,27,10,0,0,0,0,0], 2017: [0,0,0,0,1,17,34,0,0,0,0,0], 2018: [0,0,0,0,1,17,45,24,0,0,0,0], 2019: [0,0,0,0,1,12,21,37,0,0,0,0], 2020: [0,0,0,0,2,14,25,31,27,0,0,0], 2022: [0,0,0,0,1,8,18,18,35,0,0,0], 2023: [0,0,0,0,1,0,8,10,16,3,0,0], 2024: [0,0,0,0,1,3,11,11,16,13,0,0], 2025: [0,0,0,0,1,5,18,15,17,13,14,0], 2026: [0,0,0,0,1,6,19,11,15,9,15,12] },
    'Asia Pacific': { 2016: [0,0,0,1,11,17,12,0,0,0,0,0], 2017: [0,0,0,1,10,15,29,0,0,0,0,0], 2018: [0,0,0,1,9,11,27,8,0,0,0,0], 2019: [0,0,0,1,9,10,17,20,0,0,0,0], 2020: [0,0,0,1,9,8,15,16,4,0,0,0], 2022: [0,0,0,1,8,7,9,9,8,0,0,0], 2023: [0,0,0,1,7,7,10,7,2,7,0,0], 2024: [0,0,0,1,7,7,7,5,3,12,0,0], 2025: [0,0,0,1,7,7,8,6,2,10,9,0], 2026: [0,0,0,1,6,6,8,6,2,9,7,3] },
  };
  // the lowest team number each zone has had
  D.NUM_MIN = { West: 359, Southwest: 31, Midwest: 45, Northeast: 11, Southeast: 16, lakeshore: 1, harbor: 23, evergreen: 360, mesa: 57, sierra: 4, North: 296, trillium: 188, 'Central America': 2283, 'South America': 383, Europe: 1797, Anatolia: 2905, levant: 1573, 'East Asia': 4253, 'Asia Pacific': 3132 };
  // the real top 100 teams by rating (match13 xP), by zone and season (2020: the mean of 2019 and 2022)
  D.TOP100 = {
    West: { 2016: 3, 2017: 2, 2018: 3, 2019: 4, 2020: 3, 2022: 2, 2023: 1, 2024: 3, 2025: 3, 2026: 3 },
    Southwest: { 2016: 1, 2017: 2, 2018: 2, 2019: 4, 2020: 3.5, 2022: 3, 2023: 3, 2024: 1, 2025: 1, 2026: 2 },
    Midwest: { 2016: 20, 2017: 18, 2018: 10, 2019: 9, 2020: 10.5, 2022: 12, 2023: 14, 2024: 14, 2025: 15, 2026: 11 },
    Northeast: { 2016: 10, 2017: 8, 2018: 9, 2019: 10, 2020: 6.5, 2022: 3, 2023: 10, 2024: 12, 2025: 5, 2026: 11 },
    Southeast: { 2016: 6, 2017: 9, 2018: 10, 2019: 6, 2020: 9, 2022: 12, 2023: 9, 2024: 9, 2025: 8, 2026: 4 },
    lakeshore: { 2016: 18, 2017: 14, 2018: 19, 2019: 24, 2020: 22.5, 2022: 21, 2023: 15, 2024: 15, 2025: 12, 2026: 11 },
    harbor: { 2016: 11, 2017: 7, 2018: 8, 2019: 10, 2020: 11.5, 2022: 13, 2023: 11, 2024: 13, 2025: 9, 2026: 10 },
    evergreen: { 2016: 3, 2017: 3, 2018: 8, 2019: 5, 2020: 5, 2022: 5, 2023: 4, 2024: 5, 2025: 8, 2026: 7 },
    mesa: { 2016: 3, 2017: 8, 2018: 5, 2019: 5, 2020: 6.5, 2022: 8, 2023: 7, 2024: 6, 2025: 5, 2026: 6 },
    sierra: { 2016: 9, 2017: 11, 2018: 10, 2019: 12, 2020: 11, 2022: 10, 2023: 16, 2024: 8, 2025: 13, 2026: 17 },
    North: { 2016: 3, 2017: 1, 2018: 0, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 },
    trillium: { 2016: 10, 2017: 13, 2018: 11, 2019: 10, 2020: 8.5, 2022: 7, 2023: 7, 2024: 6, 2025: 12, 2026: 11 },
    'Central America': { 2016: 0, 2017: 0, 2018: 1, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 2, 2025: 1, 2026: 1 },
    'South America': { 2016: 0, 2017: 0, 2018: 0, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 },
    Europe: { 2016: 0, 2017: 0, 2018: 0, 2019: 0, 2020: 0, 2022: 0, 2023: 1, 2024: 1, 2025: 1, 2026: 1 },
    Anatolia: { 2016: 0, 2017: 0, 2018: 0, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 2, 2025: 1, 2026: 2 },
    levant: { 2016: 3, 2017: 3, 2018: 3, 2019: 1, 2020: 2.5, 2022: 4, 2023: 2, 2024: 2, 2025: 6, 2026: 2 },
    'East Asia': { 2016: 0, 2017: 0, 2018: 0, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 1 },
    'Asia Pacific': { 2016: 0, 2017: 1, 2018: 1, 2019: 0, 2020: 0, 2022: 0, 2023: 0, 2024: 1, 2025: 0, 2026: 0 },
  };
  // how strong each zone's teams are: the mean rating of all its teams in standard deviations from the world's mean
  // (match13 xP; 2020, called off after two weeks, is left out), and how spread out its established teams are (sd, the decade's mean)
  D.ZSTR = {
    West: { sd: 0.99, z: { 2016: 0.22, 2017: 0.01, 2018: 0.08, 2019: -0.09, 2022: -0.08, 2023: -0.21, 2024: -0.14, 2025: -0.15, 2026: 0.01 } },
    Southwest: { sd: 0.83, z: { 2016: -0.16, 2017: -0.22, 2018: 0.01, 2019: -0.2, 2022: -0.18, 2023: -0.22, 2024: -0.16, 2025: -0.22, 2026: -0.14 } },
    Midwest: { sd: 0.92, z: { 2016: 0.01, 2017: -0.05, 2018: 0.14, 2019: -0.02, 2022: 0.11, 2023: 0.11, 2024: 0.13, 2025: 0.09, 2026: -0.02 } },
    Northeast: { sd: 0.94, z: { 2016: 0.09, 2017: 0.12, 2018: 0.24, 2019: 0.11, 2022: 0.02, 2023: 0.07, 2024: 0.05, 2025: 0.05, 2026: -0.03 } },
    Southeast: { sd: 0.96, z: { 2016: -0.13, 2017: -0.17, 2018: -0.2, 2019: -0.19, 2022: -0.11, 2023: -0.05, 2024: -0.14, 2025: -0.1, 2026: -0.14 } },
    lakeshore: { sd: 1.01, z: { 2016: 0.31, 2017: 0.28, 2018: 0.11, 2019: 0.23, 2022: 0.13, 2023: 0.04, 2024: 0.05, 2025: 0.09, 2026: 0.02 } },
    harbor: { sd: 1.01, z: { 2016: 0.35, 2017: 0.32, 2018: 0.24, 2019: 0.31, 2022: 0.31, 2023: 0.27, 2024: 0.41, 2025: 0.39, 2026: 0.29 } },
    evergreen: { sd: 1.04, z: { 2016: 0.09, 2017: 0.27, 2018: 0.21, 2019: 0.22, 2022: 0.2, 2023: 0.25, 2024: 0.22, 2025: 0.31, 2026: 0.23 } },
    mesa: { sd: 1.14, z: { 2016: -0.33, 2017: -0.21, 2018: -0.34, 2019: -0.09, 2022: -0.08, 2023: 0.02, 2024: -0.11, 2025: -0.01, 2026: 0.15 } },
    sierra: { sd: 1.08, z: { 2016: -0.05, 2017: 0.02, 2018: 0.04, 2019: 0.02, 2022: 0.1, 2023: 0.14, 2024: 0.14, 2025: 0.16, 2026: 0.21 } },
    North: { sd: 0.78, z: { 2016: -0.14, 2017: -0.35, 2018: -0.3, 2019: -0.26, 2022: -0.37, 2023: -0.37, 2024: -0.45, 2025: -0.48, 2026: -0.22 } },
    trillium: { sd: 1.14, z: { 2016: 0.07, 2017: 0.38, 2018: 0.33, 2019: 0.34, 2022: 0.35, 2023: 0.27, 2024: 0.27, 2025: 0.46, 2026: 0.48 } },
    'Central America': { sd: 0.81, z: { 2016: -0.71, 2017: -0.73, 2018: -0.88, 2019: -0.56, 2022: -0.74, 2023: -0.58, 2024: -0.37, 2025: -0.31, 2026: -0.26 } },
    'South America': { sd: 0.70, z: { 2016: -0.27, 2017: -0.09, 2018: -0.08, 2019: -0.32, 2022: -0.24, 2023: -0.53, 2024: -0.39, 2025: -0.53, 2026: -0.42 } },
    Europe: { sd: 0.83, z: { 2016: -0.38, 2017: -0.19, 2018: -0.33, 2019: -0.45, 2022: -0.23, 2023: -0.29, 2024: -0.13, 2025: -0.41, 2026: -0.1 } },
    Anatolia: { sd: 0.70, z: { 2016: -0.85, 2017: -0.78, 2018: -0.75, 2019: -0.41, 2022: -0.73, 2023: -0.73, 2024: -0.64, 2025: -0.78, 2026: -0.39 } },
    levant: { sd: 1.03, z: { 2016: -0.14, 2017: 0.28, 2018: 0.17, 2019: 0.14, 2022: 0.38, 2023: 0.45, 2024: 0.21, 2025: 0.47, 2026: 0.3 } },
    'East Asia': { sd: 0.78, z: { 2016: -0.68, 2017: -0.74, 2018: -0.85, 2019: -0.4, 2022: -0.52, 2023: -0.18, 2024: -0.21, 2025: -0.13, 2026: 0.05 } },
    'Asia Pacific': { sd: 0.98, z: { 2016: -0.46, 2017: -0.53, 2018: -0.41, 2019: -0.31, 2022: -0.34, 2023: -0.32, 2024: -0.15, 2025: -0.26, 2026: -0.24 } },
  };

  // ---------- reading the tables ----------
  const sum = a => a.reduce((s, x) => s + x, 0);
  // largest remainders: whole numbers that add up to the rounded total
  const share = function (x, total) {
    const out = x.map(Math.floor); let left = total - sum(out);
    x.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r || a.i - b.i).forEach(o => { if (left > 0) { out[o.i]++; left--; } });
    return out;
  };
  D.realTeams = (zone, cy) => { const h = (D.NUMS[zone] || {})[D.dataYear(cy)]; return h ? sum(h) : 0; };
  // the teams an area outside the United States has in the game that season, and how many in each block of numbers
  D.areaTeams = (zone, cy) => Math.round(D.realTeams(zone, cy) * D.SCALE);
  // (the area's oldest real block always keeps a team, so its lowest numbers are the real ones)
  D.blockTargets = function (zone, cy) {
    const h = D.NUMS[zone][D.dataYear(cy)], out = share(h.map(v => v * D.SCALE), D.areaTeams(zone, cy)), f = h.findIndex(v => v > 0);
    if (f >= 0 && !out[f] && sum(out) > 1) { out[out.indexOf(Math.max(...out))]--; out[f] = 1; }
    return out;
  };
  // the numbers of block b a zone's team may carry: never under the zone's oldest team, never over `top`
  D.blockRange = (zone, b, top) => [Math.max(b * 1000, D.NUM_MIN[zone] || 1, 1), Math.min(b * 1000 + 999, top == null ? 99999 : top)];
  // a team number from a zone's real spread that season (established teams: up to `top`)
  D.zoneNum = function (rng, zone, cy, top) {
    const h = (D.NUMS[zone] || D.NUMS.Midwest)[D.dataYear(cy)];
    const w = h.map((v, b) => { const r = D.blockRange(zone, b, top); return r[1] >= r[0] ? v * (r[1] - r[0] + 1) / 1000 : 0; });
    if (sum(w) <= 0) return rng.int(Math.min(D.NUM_MIN[zone] || 1, top), top);
    let x = rng.next() * sum(w), b = 0; while (b < w.length - 1 && (x -= w[b]) > 0) b++;
    while (b > 0 && w[b] <= 0) b--;
    const r = D.blockRange(zone, b, top); return rng.int(r[0], Math.max(r[0], r[1]));
  };
  // the real top 100, scaled to the size of the game's world: the elite teams each zone has that season
  // (total: every team of the game's world; mult: the difficulty's share)
  D.eliteTargets = function (cy, total, mult) {
    const y = D.dataYear(cy), zs = Object.keys(D.TOP100), n = total / D.REAL_TEAMS[y] * (mult == null ? 1 : mult);
    const got = share(zs.map(z => D.TOP100[z][y] * n), Math.round(100 * n)), out = {};
    zs.forEach((z, i) => { out[z] = got[i]; });
    return out;
  };
  // an area's strength that season, smoothed over the neighbouring seasons (a small area's mean jumps from year to
  // year); 2020 is the mean of 2019 and 2022
  const ZY = [2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026];
  const zRaw = (zone, y) => { const t = D.ZSTR[zone].z; return y === 2020 ? (t[2019] + t[2022]) / 2 : t[y]; };
  D.zStr = function (zone, cy) {
    if (!D.ZSTR[zone]) return 0;
    const i = ZY.indexOf(D.dataYear(cy));
    return 0.25 * zRaw(zone, ZY[Math.max(0, i - 1)]) + 0.5 * zRaw(zone, ZY[i]) + 0.25 * zRaw(zone, ZY[Math.min(ZY.length - 1, i + 1)]);
  };
  D.zSd = zone => (D.ZSTR[zone] ? D.ZSTR[zone].sd : 1);
})();
