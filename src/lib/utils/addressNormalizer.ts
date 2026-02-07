/**
 * Normalizes an address string for consistent storage and searching.
 * Converts to uppercase, standardizes suffixes (Street -> ST, Road -> RD),
 * removes punctuation, and handles directionals.
 */
export function normalizeAddress(address: string): string {
  if (!address) return "";

  let normalized = address.trim().toUpperCase();

  // Remove punctuation
  normalized = normalized.replace(/[.,#]/g, " ");

  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, " ");

  // Standardize Directionals
  normalized = normalized
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W");

  // Standardize Suffixes
  // Commonly used suffixes based on USPS standards
  // Ambiguous names (like PINE, RIVER, LAKE) are excluded to prevent over-normalization of street names
  const suffixMap: Record<string, string> = {
    AVENUE: "AVE",
    BOULEVARD: "BLVD",
    LANE: "LN",
    DRIVE: "DR",
    COURT: "CT",
    CIRCLE: "CIR",
    TRAIL: "TRL",
    PARKWAY: "PKWY",
    HIGHWAY: "HWY",
    PLACE: "PL",
    SQUARE: "SQ",
    TERRACE: "TER",
    WAY: "WAY",
    LOOP: "LOOP",
    TRACE: "TRCE",
    ALLEY: "ALY",
    ANNEX: "ANX",
    ARCADE: "ARC",
    BAYOO: "BYU",
    BEACH: "BCH",
    BEND: "BND",
    BLUFF: "BLF",
    BOTTOM: "BTM",
    BRANCH: "BR",
    BRIDGE: "BRG",
    BROOK: "BRK",
    BURG: "BG",
    BYPASS: "BYP",
    CAMP: "CP",
    CANYON: "CYN",
    CAPE: "CPE",
    CAUSEWAY: "CSWY",
    CENTER: "CTR",
    CENTERS: "CTRS",
    CLIFF: "CLF",
    CLIFFS: "CLFS",
    CLUB: "CLB",
    COMMON: "CMN",
    COMMONS: "CMNS",
    CORNER: "COR",
    CORNERS: "CORS",
    COURSE: "CRSE",
    CROSSING: "XING",
    CROSSROAD: "XRD",
    CROSSROADS: "XRDS",
    // CREEK: "CRK", // Ambiguous
    CRESCENT: "CRES",
    CREST: "CRST",
    DALE: "DL",
    DAM: "DM",
    DIVIDE: "DV",
    ESTATE: "EST",
    ESTATES: "ESTS",
    EXPRESSWAY: "EXPY",
    EXTENSION: "EXT",
    // FALL: "FALL", // Ambiguous
    FALLS: "FLS",
    FERRY: "FRY",
    FIELD: "FLD",
    FIELDS: "FLDS",
    FLAT: "FLT",
    FLATS: "FLTS",
    FORD: "FRD",
    // FOREST: "FRST", // Ambiguous
    FORGE: "FRG",
    FORK: "FRK",
    FORKS: "FRKS",
    FORT: "FT",
    FREEWAY: "FWY",
    // GARDEN: "GDN", // Ambiguous
    GARDENS: "GDNS",
    GATEWAY: "GTWY",
    GLEN: "GLN",
    GLENS: "GLNS",
    GREEN: "GRN",
    GREENS: "GRNS",
    // GROVE: "GRV", // Ambiguous
    HARBOR: "HBR",
    HAVEN: "HVN",
    // HEIGHTS: "HTS",
    // HILL: "HL", // Ambiguous
    // HILLS: "HLS",
    HOLLOW: "HOLW",
    INLET: "INLT",
    ISLAND: "IS",
    ISLANDS: "ISS",
    ISLE: "ISLE",
    JUNCTION: "JCT",
    JUNCTIONS: "JCTS",
    KEY: "KY",
    KEYS: "KYS",
    KNOLL: "KNL",
    KNOLLS: "KNLS",
    // LAKE: "LK", // Ambiguous
    LAKES: "LKS",
    LANDING: "LNDG",
    LIGHT: "LGT",
    LIGHTS: "LGTS",
    LOAF: "LF",
    LOCK: "LCK",
    LOCKS: "LCKS",
    LODGE: "LDG",
    MANOR: "MNR",
    MANORS: "MNRS",
    // MEADOW: "MDW", // Ambiguous
    MEADOWS: "MDWS",
    MEWS: "MEWS",
    MILL: "ML",
    MILLS: "MLS",
    MISSION: "MSN",
    MOTORWAY: "MTWY",
    MOUNT: "MT",
    MOUNTAIN: "MTN",
    MOUNTAINS: "MTNS",
    NECK: "NCK",
    ORCHARD: "ORCH",
    OVAL: "OVAL",
    OVERPASS: "OPAS",
    // PARK: "PARK", // Ambiguous
    PARKS: "PARK",
    PASS: "PASS",
    PASSAGE: "PSGE",
    PATH: "PATH",
    PIKE: "PIKE",
    // PINE: "PNE", // Ambiguous
    PINES: "PNES",
    // PLAIN: "PLN",
    PLAINS: "PLNS",
    PLAZA: "PLZ",
    POINT: "PT",
    POINTS: "PTS",
    PORT: "PRT",
    PORTS: "PRTS",
    PRAIRIE: "PR",
    RADIAL: "RADL",
    RAMP: "RAMP",
    RANCH: "RNCH",
    RAPID: "RPD",
    RAPIDS: "RPDS",
    REST: "RST",
    // RIDGE: "RDG",
    RIDGES: "RDGS",
    // RIVER: "RIV", // Ambiguous
    ROAD: "RD",
    ROUTE: "RTE",
    ROW: "ROW",
    RUE: "RUE",
    RUN: "RUN",
    SHOAL: "SHL",
    SHOALS: "SHLS",
    SHORE: "SHR",
    SHORES: "SHRS",
    SKYWAY: "SKWY",
    SPRING: "SPG",
    SPRINGS: "SPGS",
    SPUR: "SPUR",
    STATION: "STA",
    STRAVENU: "STRA",
    STREAM: "STRM",
    STREET: "ST",
    SUMMIT: "SMT",
    TERR: "TER",
    THROUGHWAY: "TRWY",
    TRACK: "TRAK",
    TRAFFICWAY: "TRFY",
    TUNNEL: "TUNL",
    TURNPIKE: "TPKE",
    UNDERPASS: "UPAS",
    UNION: "UN",
    UNIONS: "UNS",
    // VALLEY: "VLY",
    VALLEYS: "VLYS",
    VIADUCT: "VIA",
    // VIEW: "VW",
    VIEWS: "VWS",
    VILLAGE: "VLG",
    VILLAGES: "VLGS",
    VILLE: "VL",
    VISTA: "VIS",
    WALK: "WALK",
    WALL: "WALL",
    WELL: "WL",
    WELLS: "WLS",
  };

  const words = normalized.split(/\s+/).filter(Boolean);
  const mappedWords = words.map((word) => suffixMap[word] || word);

  return mappedWords.join(" ");
}
