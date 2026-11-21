// PoliGo demo data.
// IMPORTANT: universities, courses, places and topics below are DEMO DATA for the prototype.
// Replace them with the real Erasmus partners of your faculty and their real course catalogues.

export const TOPICS = {
  web: 'Web development', htmlcss: 'HTML & CSS', js: 'JavaScript', http: 'HTTP & REST', backend: 'Server-side programming', frontend: 'Front-end frameworks',
  sql: 'SQL', relmodel: 'Relational model', normal: 'Normalization', trans: 'Transactions', dbdesign: 'Database design', nosql: 'NoSQL',
  search: 'Search algorithms', ml: 'Machine learning', kr: 'Knowledge representation', nn: 'Neural networks', logic: 'Logic & reasoning',
  proc: 'Processes & threads', conc: 'Concurrency', mem: 'Memory management', fs: 'File systems', linux: 'Linux internals',
  agile: 'Agile & Scrum', estim: 'Estimation', risk: 'Risk management', planning: 'Project planning', team: 'Team management',
  img: 'Image processing', audio: 'Audio processing', video: 'Video compression', codecs: 'Codecs & formats', graphics: 'Computer graphics',
  bigdata: 'Big data', spark: 'Spark', hadoop: 'Hadoop & MapReduce', distr: 'Distributed processing', streaming: 'Stream processing',
  android: 'Android development', mobileui: 'Mobile UI', sensors: 'Sensors', mobnet: 'Mobile networking', lifecycle: 'App lifecycle', crossplat: 'Cross-platform apps',
  faulttol: 'Fault tolerance', redund: 'Redundancy', reliab: 'Reliability', recovery: 'Error recovery', replication: 'Replication',
  uml: 'UML & modelling', patterns: 'Design patterns', testing: 'Software testing', requirements: 'Requirements engineering',
  tcpip: 'TCP/IP', routing: 'Routing', sockets: 'Socket programming', netsec: 'Network security', wireless: 'Wireless networks',
  opengl: 'OpenGL', geometry: 'Computational geometry', rendering: 'Rendering',
  cloud: 'Cloud computing', security: 'Security', crypto: 'Cryptography', ux: 'UX design', embedded: 'Embedded systems', iot: 'IoT', agri: 'Agricultural tech', gis: 'GIS', etl: 'ETL pipelines',
};

export const SEMESTERS = { fall: 'Fall 2027', spring: 'Spring 2028' };

// UPT courses (study plan, demo split by semester)
export const PROGRAMS = {
  cti: {
    name: 'Computers & IT (CTI)', short: 'CTI', year: 3,
    courses: {
      fall: [
        { id: 'f-web', name: 'Programarea Web', ects: 5, topics: ['web', 'htmlcss', 'js', 'http', 'backend'] },
        { id: 'f-bigdata', name: 'Analiza Volumelor Mari de Date', ects: 5, topics: ['bigdata', 'spark', 'hadoop', 'distr', 'nosql'] },
        { id: 'f-pm', name: 'Managementul Proiectelor Software', ects: 4, topics: ['agile', 'estim', 'risk', 'planning', 'team'] },
        { id: 'f-mm', name: 'Sisteme Multimedia', ects: 4, topics: ['img', 'audio', 'video', 'codecs'] },
        { id: 'f-ft', name: 'Structuri Tolerante la Defecte', ects: 5, topics: ['faulttol', 'redund', 'reliab', 'distr', 'recovery'] },
        { id: 'f-mobile', name: 'Sisteme Mobile și Aplicații', ects: 5, topics: ['android', 'mobileui', 'sensors', 'lifecycle', 'mobnet'] },
      ],
      spring: [
        { id: 's-db', name: 'Proiectarea Bazelor de Date', ects: 5, topics: ['sql', 'relmodel', 'normal', 'trans', 'dbdesign'] },
        { id: 's-ai', name: 'Bazele Inteligenței Artificiale', ects: 5, topics: ['search', 'ml', 'kr', 'nn', 'logic'] },
        { id: 's-os', name: 'Sisteme de Operare 2', ects: 5, topics: ['proc', 'conc', 'mem', 'fs', 'linux'] },
        { id: 's-se', name: 'Ingineria Programării', ects: 5, topics: ['uml', 'patterns', 'testing', 'requirements', 'agile'] },
        { id: 's-net', name: 'Rețele de Calculatoare', ects: 5, topics: ['tcpip', 'routing', 'sockets', 'netsec', 'wireless'] },
        { id: 's-cg', name: 'Grafică Asistată de Calculator', ects: 4, topics: ['graphics', 'opengl', 'geometry', 'rendering'] },
      ],
    },
  },
};

export const HOME = { name: 'Timișoara', lon: 21.21, lat: 45.75, iso3: 'ROU' };

// c(name, ects, semester: 'fall' | 'spring' | 'both', topics)
const c = (name, ects, sem, topics) => ({ name, ects, sem, topics });

export const UNIVERSITIES = [
  {
    id: 'ips-setubal', name: 'Instituto Politécnico de Setúbal', short: 'IPS Setúbal', city: 'Setúbal', country: 'Portugal', cc: 'PT', iso3: 'PRT',
    lon: -8.89, lat: 38.52, language: 'English B2', places: 4, costGroup: 2, greeting: 'Boa viagem!',
    courses: [
      c('Web Technologies', 6, 'both', ['web', 'htmlcss', 'js', 'http', 'backend', 'frontend']),
      c('Big Data Analytics', 5, 'fall', ['bigdata', 'spark', 'hadoop', 'distr', 'ml']),
      c('Software Project Management', 5, 'both', ['agile', 'estim', 'risk', 'planning']),
      c('Multimedia Systems', 5, 'fall', ['img', 'audio', 'video', 'codecs', 'graphics']),
      c('Mobile Application Development', 5, 'fall', ['android', 'mobileui', 'lifecycle', 'crossplat', 'mobnet']),
      c('Distributed Systems', 6, 'fall', ['distr', 'conc', 'cloud', 'replication']),
      c('Databases II', 6, 'spring', ['sql', 'trans', 'dbdesign', 'nosql']),
      c('Artificial Intelligence', 6, 'spring', ['search', 'ml', 'nn', 'logic', 'kr']),
      c('Computer Networks', 5, 'spring', ['tcpip', 'routing', 'sockets', 'wireless']),
      c('Software Engineering', 6, 'spring', ['uml', 'patterns', 'testing', 'requirements']),
      c('Computer Graphics', 5, 'spring', ['graphics', 'opengl', 'rendering']),
    ],
  },
  {
    id: 'fh-stpolten', name: 'St. Pölten University of Applied Sciences', short: 'St. Pölten UAS', city: 'St. Pölten', country: 'Austria', cc: 'AT', iso3: 'AUT',
    lon: 15.63, lat: 48.2, language: 'English B2', places: 2, costGroup: 2, greeting: 'Gute Reise!',
    courses: [
      c('Web Development', 5, 'fall', ['web', 'htmlcss', 'js', 'http', 'frontend']),
      c('Mobile Computing', 5, 'fall', ['android', 'mobileui', 'sensors', 'mobnet']),
      c('Digital Media Processing', 5, 'fall', ['img', 'audio', 'video', 'codecs']),
      c('IT Project Management', 4, 'both', ['agile', 'planning', 'risk', 'team']),
      c('Data Engineering', 5, 'fall', ['bigdata', 'nosql', 'etl', 'streaming']),
      c('IT Security', 5, 'both', ['security', 'netsec', 'crypto']),
      c('Machine Learning', 5, 'spring', ['ml', 'nn', 'search']),
      c('Computer Graphics', 5, 'spring', ['graphics', 'rendering', 'opengl', 'geometry']),
      c('Network Engineering', 5, 'spring', ['tcpip', 'routing', 'wireless', 'netsec']),
      c('Database Systems', 5, 'spring', ['sql', 'relmodel', 'normal', 'dbdesign']),
    ],
  },
  {
    id: 'saxion', name: 'Saxion University of Applied Sciences', short: 'Saxion UAS', city: 'Enschede', country: 'Netherlands', cc: 'NL', iso3: 'NLD',
    lon: 6.89, lat: 52.22, language: 'English B2', places: 3, costGroup: 2, greeting: 'Goede reis!',
    courses: [
      c('Web Engineering', 5, 'both', ['web', 'js', 'http', 'backend', 'frontend']),
      c('Agile Project Management', 5, 'both', ['agile', 'estim', 'planning', 'team']),
      c('Mobile Development', 5, 'fall', ['android', 'mobileui', 'lifecycle', 'sensors', 'crossplat']),
      c('Big Data & Cloud', 5, 'fall', ['bigdata', 'spark', 'distr', 'cloud', 'nosql']),
      c('Creative Media Technology', 5, 'fall', ['video', 'img', 'ux']),
      c('Embedded Systems', 5, 'fall', ['embedded', 'iot', 'sensors']),
      c('Software Testing & Quality', 5, 'spring', ['testing', 'patterns', 'requirements']),
      c('Data Science', 5, 'spring', ['ml', 'sql', 'nn']),
      c('Databases', 5, 'spring', ['sql', 'relmodel', 'dbdesign', 'trans', 'normal']),
      c('Networking', 5, 'spring', ['tcpip', 'routing', 'sockets']),
    ],
  },
  {
    id: 'ucll', name: 'UC Leuven-Limburg', short: 'UCLL', city: 'Leuven', country: 'Belgium', cc: 'BE', iso3: 'BEL',
    lon: 4.70, lat: 50.88, language: 'English B2', places: 2, costGroup: 2, greeting: 'Goede reis!',
    courses: [
      c('Web Applications', 6, 'fall', ['web', 'htmlcss', 'js', 'backend', 'http']),
      c('Project Management', 3, 'fall', ['agile', 'planning', 'team', 'risk']),
      c('Media Technology', 4, 'fall', ['img', 'video', 'audio']),
      c('App Development', 6, 'fall', ['android', 'mobileui', 'crossplat', 'lifecycle']),
      c('Cloud Platforms', 5, 'fall', ['cloud', 'distr', 'security']),
      c('AI Fundamentals', 5, 'spring', ['search', 'ml', 'logic', 'kr']),
      c('Data Management', 5, 'spring', ['sql', 'nosql', 'dbdesign']),
      c('Software Architecture', 6, 'spring', ['patterns', 'uml', 'requirements', 'cloud']),
    ],
  },
  {
    id: 'hs-fulda', name: 'Hochschule Fulda – University of Applied Sciences', short: 'HS Fulda', city: 'Fulda', country: 'Germany', cc: 'DE', iso3: 'DEU',
    lon: 9.68, lat: 50.56, language: 'English B2', places: 2, costGroup: 2, greeting: 'Gute Reise!',
    courses: [
      c('Web Programming', 5, 'fall', ['web', 'htmlcss', 'js', 'http']),
      c('Big Data Systems', 5, 'fall', ['bigdata', 'hadoop', 'spark', 'distr']),
      c('Dependable Systems', 5, 'fall', ['faulttol', 'redund', 'reliab', 'recovery']),
      c('Software Project Organisation', 5, 'fall', ['agile', 'team', 'planning']),
      c('Human-Computer Interaction', 5, 'fall', ['ux', 'mobileui']),
      c('Operating Systems', 5, 'spring', ['proc', 'conc', 'mem', 'fs']),
      c('Computer Networks', 5, 'spring', ['tcpip', 'routing', 'sockets', 'netsec', 'wireless']),
      c('Intelligent Systems', 5, 'spring', ['ml', 'kr', 'logic']),
    ],
  },
  {
    id: 'jamk', name: 'JAMK University of Applied Sciences', short: 'JAMK', city: 'Jyväskylä', country: 'Finland', cc: 'FI', iso3: 'FIN',
    lon: 25.75, lat: 62.24, language: 'English B2', places: 3, costGroup: 1, greeting: 'Hyvää matkaa!',
    courses: [
      c('Mobile Programming', 5, 'fall', ['android', 'mobileui', 'sensors', 'lifecycle']),
      c('Game & Media Production', 5, 'fall', ['graphics', 'audio', 'video', 'img']),
      c('Full Stack Web Development', 5, 'fall', ['web', 'js', 'backend', 'http', 'frontend']),
      c('Data Analytics', 5, 'fall', ['bigdata', 'spark', 'nosql', 'ml']),
      c('Cyber Security', 5, 'both', ['security', 'netsec']),
      c('Linux Server Administration', 5, 'spring', ['linux', 'proc', 'fs']),
      c('Network Technologies', 5, 'spring', ['tcpip', 'wireless', 'routing', 'netsec']),
      c('Database Design', 5, 'spring', ['sql', 'relmodel', 'dbdesign', 'normal']),
    ],
  },
  {
    id: 'vidzeme', name: 'Vidzeme University of Applied Sciences', short: 'ViA', city: 'Valmiera', country: 'Latvia', cc: 'LV', iso3: 'LVA',
    lon: 25.43, lat: 57.54, language: 'English B2', places: 2, costGroup: 3, greeting: 'Laimīgu ceļu!',
    courses: [
      c('Web Systems', 6, 'fall', ['web', 'htmlcss', 'js', 'http']),
      c('IT Project Management', 6, 'fall', ['agile', 'planning', 'risk', 'estim']),
      c('Multimedia Design', 6, 'fall', ['img', 'ux']),
      c('Data Visualization', 3, 'fall', ['bigdata']),
      c('Databases', 6, 'spring', ['sql', 'relmodel', 'dbdesign']),
      c('E-Government Systems', 6, 'spring', ['requirements', 'uml']),
    ],
  },
  {
    id: 'mate', name: 'Hungarian University of Agriculture and Life Sciences', short: 'MATE', city: 'Gödöllő', country: 'Hungary', cc: 'HU', iso3: 'HUN',
    lon: 19.36, lat: 47.60, language: 'English B2', places: 2, costGroup: 3, greeting: 'Jó utat!',
    courses: [
      c('Web Development Basics', 5, 'fall', ['web', 'htmlcss', 'js', 'http']),
      c('Agricultural Informatics', 5, 'fall', ['agri', 'gis', 'sql']),
      c('Precision Farming Data', 5, 'fall', ['agri', 'bigdata', 'sensors']),
      c('GIS Databases', 5, 'spring', ['gis', 'sql', 'dbdesign']),
      c('Remote Sensing', 5, 'spring', ['img', 'gis']),
    ],
  },
];

// Erasmus deadline template. Offsets in days from S (start), A (arrival) or E (end).
// DEMO values: confirm them with the UPT Erasmus Office before using them for real.
export const TIMELINE = [
  { id: 't-housing', stage: 'before', title: 'Book accommodation for the first month', from: 'S', days: -45 },
  { id: 't-ola', stage: 'before', title: 'Sign your Learning Agreement in OLA', from: 'S', days: -30 },
  { id: 't-grant', stage: 'before', title: 'Sign the Erasmus+ grant agreement', from: 'S', days: -30 },
  { id: 't-ticket', stage: 'before', title: 'Buy your ticket, keep the travel proofs', from: 'S', days: -21 },
  { id: 't-insurance', stage: 'before', title: 'Insurance and European Health Insurance Card', from: 'S', days: -14 },
  { id: 't-arrival', stage: 'arrival', title: 'Certificate of arrival, signed by the host university', from: 'A', days: 3 },
  { id: 't-register', stage: 'arrival', title: 'Register with local authorities if required', from: 'A', days: 14 },
  { id: 't-la-change', stage: 'during', title: 'Changes to your Learning Agreement, if any', from: 'S', days: 28 },
  { id: 't-transcript', stage: 'return', title: 'Ask for your Transcript of Records', from: 'E', days: -14 },
  { id: 't-attendance', stage: 'return', title: 'Certificate of attendance, signed', from: 'E', days: 0 },
  { id: 't-documents', stage: 'after', title: 'Hand in your documents to the UPT Erasmus Office', from: 'E', days: 14 },
  { id: 't-recognition', stage: 'after', title: 'Ask your faculty to recognize your credits', from: 'E', days: 30 },
];
export const STAGES = { before: 'Before departure', arrival: 'Arrival · first 2 weeks', during: 'During', return: 'Before return', after: 'After return' };

// Example requests shown in the admin panel so it is not empty in a demo.
export const DEMO_REQUESTS = [
  { id: 'demo-1', email: 'mihai.ionescu@student.upt.ro', name: 'Mihai Ionescu', program: 'CTI · Year 3', uniId: 'saxion', start: '2027-09-01', end: '2028-01-31', letter: { name: 'letter_saxion.pdf', size: 184000 }, status: 'pending', createdAt: '2026-11-18T09:12:00Z', demo: true },
  { id: 'demo-2', email: 'ioana.dumitru@student.upt.ro', name: 'Ioana Dumitru', program: 'CTI · Year 3', uniId: 'jamk', start: '2027-08-23', end: '2027-12-20', letter: { name: 'jamk_acceptance.pdf', size: 231000 }, status: 'pending', createdAt: '2026-11-19T14:40:00Z', demo: true },
  { id: 'demo-3', email: 'radu.stan@student.upt.ro', name: 'Radu Stan', program: 'CTI · Year 3', uniId: 'fh-stpolten', start: '2027-09-01', end: '2028-01-31', letter: { name: 'acceptance.pdf', size: 158000 }, status: 'confirmed', createdAt: '2026-11-10T08:00:00Z', decidedAt: '2026-11-12T10:00:00Z', demo: true },
];
