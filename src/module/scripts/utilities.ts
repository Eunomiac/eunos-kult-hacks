// import {gsap, MotionPathPlugin} from "../libraries";
import { PRE_SESSION } from "./constants";
import EunosItem from "../documents/EunosItem";
import Document = foundry.abstract.Document;
import type ActorDataPC from "../data-model/ActorDataPC";
// eslint-disable-next-line

// #region BRANDED TYPES ~
declare global {
  /** NOTE: Branded types have been disabled, by equating them to their non-branded counterparts. */
  const brand: unique symbol;
  type Brand<T, BrandName extends string> = T & {[brand]: BrandName;};

  // number === Float type guard
  type Float = number; // Brand<number, "Float">;
  // number === Positive float type guard
  type PosFloat = number; // Brand<number & Float, "PosFloat">;
  // string === HTML code
  type HTMLString = string; // Brand<string, "HTMLString">; // e.g. "<p>Hello World</p>"
  // string === RGB color
  type RGBColor = string //   `rgb(${number}${FlexComma}${number}${FlexComma}${number})` |
    // `rgba(${number}${FlexComma}${number}${FlexComma}${number}${FlexComma}${number})`;
  // string === Hex color
  type HexColor = string // Brand<string, "HexColor">; // e.g. "#FF0000"
  // string === Document id
  type IDString = string // Brand<string, "IDString">; // e.g. "5e4e7b1c322f2e1c"
  // string === UUID
  type UUIDString = string; // Brand<string, "string">; // e.g. "Actor.5e4e7b1c322f2e1c"
  // string === Dotkey
  type DotKey = string; // Brand<string, "DotKey">; // e.g. "system.attributes.hp.value"
  // string === Dotkey appropriate for update() data object
  type TargetKey = string; // Brand<string & DotKey, "TargetKey">;
  // string === Dotkey pointing to a flag instead of the document schema
  type TargetFlagKey = string; // Brand<string & DotKey, "TargetFlagKey">;
}
// #endregion

// #region ▒▒▒▒▒▒▒ [HELPERS] Internal Functions, Data & References Used by Utility Functions ▒▒▒▒▒▒▒ ~

// _noCapWords -- Patterns matching words that should NOT be capitalized when converting to TITLE case.
const _noCapWords = "a|above|after|an|and|at|below|but|by|down|for|for|from|in|nor|of|off|on|onto|or|out|so|the|to|under|up|with|yet"
  .split("|")
  .map((word) => new RegExp(`\\b${String(word)}\\b`, "gui"));

// _capWords -- Patterns matching words that should ALWAYS be capitalized when converting to SENTENCE case.
const _capWords = [
  "I", /[^a-z]{3,}|[.0-9]/gu
].map((word) => (Object.prototype.toString.call(word).includes("RegExp") ? word : new RegExp(`\\b${String(word)}\\b`, "gui"))) as RegExp[];

// _loremIpsumText -- Boilerplate lorem ipsum
const _loremIpsumText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ultricies
nibh sed massa euismod lacinia. Aliquam nec est ac nunc ultricies scelerisque porta vulputate odio.
number gravida mattis odio, semper volutpat tellus. Ut elit leo, auctor eget fermentum hendrerit,
aliquet ac nunc. Suspendisse porta turpis vitae mi posuere molestie. Cras lectus lacus, vulputate a
vestibulum in, mattis vel mi. Mauris quis semper mauris. Praesent blandit nec diam eget tincidunt. Nunc
aliquet consequat massa ac lacinia. Ut posuere velit sagittis, vehicula nisl eget, fringilla nibh. Duis
volutpat mattis libero, a porttitor sapien viverra ut. Phasellus vulputate imperdiet ligula, eget
eleifend metus tempor nec. Nam eget sapien risus. Praesent id suscipit elit. Sed pellentesque ligula
diam, non aliquet magna feugiat vitae. Pellentesque ut tortor id erat placerat dignissim. Pellentesque
ut dui vel leo laoreet sodales nec ac tellus. In hac habitasse platea dictumst. Proin sed ex sed augue
sollicitudin interdum. Sed id lacus porttitor nisi vestibulum tincidunt. Nulla facilisi. Vestibulum
feugiat finibus magna in pretium. Proin consectetur lectus nisi, non commodo lectus tempor et. Cras
viverra, mi in consequat aliquet, justo mauris fringilla tellus, at accumsan magna metus in eros. Sed
vehicula, diam ut sagittis semper, purus massa mattis dolor, in posuere.`;

// _randomWords -- A collection of random words for various debugging purposes.
const _randomWords = `
aboveboard|account|achiever|acoustics|act|action|activity|actor|addition|adjustment|advertisement|advice|afterglow|afterimage|afterlife|aftermath|afternoon|afterthought|agreement
air|aircraft|airfield|airlift|airline|airmen|airplane|airport|airtime|alarm|allover|allspice|alongside|also|amount|amusement|anger|angle|animal|another|ants|anyhow|anymore
anyone|anyplace|anytime|anywhere|apparatus|apparel|appliance|approval|arch|argument|arithmetic|arm|army|around|art|ashtray|attack|attraction|aunt|authority|babies|baby|babysitter
back|backache|backbone|backbreaker|backdrop|backfire|background|backhand|backlash|backlog|backpack|backside|backslap|backslide|backspace|backspin|backstroke|backtrack|backward
badge|bag|bait|balance|ball|ballroom|bankbook|bankroll|base|baseball|basin|basket|basketball|bat|bath|battle|beachcomb|bead|bear|because|become|bed|bedrock|bedroll|bedroom
beds|bee|beef|beginner|behavior|belief|believe|bell|bellboy|bellhop|bells|below|berry|bike|bikes|bird|birds|birth|birthday|bit|bite|blackball|blackberries|blackbird|blackboard
blackjack|blacklist|blackmail|blackout|blacksmith|blacktop|blade|blood|blow|blowgun|bluebell|blueberry|bluebird|bluefish|bluegrass|blueprint|board|boardwalk|boat|bodyguard
bomb|bone|book|bookcase|bookend|bookkeeper|bookmark|bookmobile|books|bookseller|bookshelf|bookworm|boot|border|bottle|boundary|bowlegs|bowtie|box|boy|brainchild|brake|branch
brass|breath|brick|bridge|brother|bubble|bucket|bugspray|building|bulb|burst|bushes|business|butter|butterball|buttercup|butterfingers|buttermilk|butternut|butterscotch|button
bypass|cabbage|cabdriver|cable|cactus|cake|cakes|calculator|calendar|camera|camp|can|cancan|candlelight|candlestick|cannon|cannot|canvas|cap|caption|car|card|cardsharp|care
carefree|careworn|carfare|carload|carpenter|carpool|carport|carriage|cars|carsick|cart|cartwheel|cast|cat|cats|cattle|catwalk|cause|cave|caveman|celery|cellar|cemetery|cent
centercut|chalk|chance|change|channel|cheese|cheeseburger|cherries|cherry|chess|chicken|chickens|children|chin|church|circle|clam|class|clockwise|cloth|clover|club|coach|coal
coast|coat|cobweb|coffeemaker|coil|collar|color|comeback|committee|commonplace|commonwealth|company|comparison|competition|condition|connection|control|cook|copper|corn|cornmeal
cough|country|courthouse|cover|cow|cows|crack|cracker|crate|crayon|cream|creator|creature|credit|crewcut|crib|crime|crook|crossbow|crossbreed|crosscut|crossover|crosswalk
crow|crowd|crown|cub|cup|current|curtain|curve|cushion|dad|dairymaid|daisywheel|daughter|day|daybed|daybook|daybreak|daydream|daylight|daytime|deadend|deadline|death|debt
decision|deer|degree|design|desire|desk|destruction|detail|development|digestion|dime|dinner|dinosaurs|direction|dirt|discovery|discussion|dishcloth|dishpan|dishwasher|dishwater
diskdrive|distance|distribution|division|dock|doctor|dog|dogs|doll|dolls|donkey|door|doorstop|downtown|downunder|drain|drawbridge|drawer|dress|drink|driveway|driving|drop
duck|duckbill|duckpin|ducks|dust|ear|earache|earring|earth|earthquake|earthward|earthworm|edge|education|effect|egg|egghead|eggnog|eggs|eggshell|elbow|end|engine|error|event
everything|example|exchange|existence|expansion|experience|expert|eye|eyeballs|eyecatching|eyeglasses|eyelash|eyelid|eyes|eyesight|eyewitness|face|fact|fairies|fall|fang|farm
fatherland|fear|feeling|field|finger|fire|fireball|fireboat|firebomb|firebreak|firecracker|firefighter|firehouse|fireman|fireproof|fireworks|fish|fishbowl|fisherman|fisheye
fishhook|fishmonger|fishnet|fishpond|fishtail|flag|flame|flavor|flesh|flight|flock|floor|flower|flowers|fly|fog|fold|food|foot|football|foothill|footlights|footlocker|footprints
forbearer|force|forearm|forebear|forebrain|forecast|foreclose|foreclosure|foredoom|forefather|forefeet|forefinger|forefoot|forego|foregone|forehand|forehead|foreknowledge
foreleg|foreman|forepaws|foresee|foreshadow|forestall|forethought|foretold|forever|forewarn|foreword|forget|fork|forklift|form|fowl|frame|friction|friend|friends|frog|frogs
front|fruit|fruitcup|fuel|furniture|gate|gearshift|geese|ghost|giants|giraffe|girl|girls|glass|glassmaking|glove|gold|goodbye|goodnight|government|governor|grade|grain|grandaunt
granddaughter|grandfather|grandmaster|grandmother|grandnephew|grandparent|grandson|grandstand|granduncle|grape|grass|grassland|graveyard|grip|ground|group|growth|guide|guitar
gumball|gun|hair|haircut|hall|hamburger|hammer|hand|handbook|handgun|handmade|handout|hands|harbor|harmony|hat|hate|head|headache|headlight|headline|headquarters|health|heat
hereafter|hereby|herein|hereupon|highchair|highland|highway|hill|himself|history|hobbies|hole|holiday|home|homemade|hometown|honey|honeybee|honeydew|honeysuckle|hook|hookup
hope|horn|horse|horseback|horsefly|horsehair|horseman|horseplay|horsepower|horseradish|horses|hose|hospital|hot|hour|house|houseboat|household|housekeeper|houses|housetop
however|humor|hydrant|ice|icicle|idea|impulse|income|increase|industry|ink|insect|inside|instrument|insurance|intake|interest|invention|iron|island|itself|jail|jailbait|jam
jar|jeans|jelly|jellybean|jellyfish|jetliner|jetport|jewel|join|judge|juice|jump|jumpshot|kettle|key|keyboard|keyhole|keynote|keypad|keypunch|keystone|keystroke|keyword|kick
kiss|kittens|kitty|knee|knife|knot|knowledge|laborer|lace|ladybug|lake|lamp|land|language|laugh|leather|leg|legs|letter|letters|lettuce|level|library|lifeblood|lifeguard|lifelike
lifeline|lifelong|lifetime|lifework|limelight|limestone|limit|line|linen|lip|liquid|loaf|lock|locket|longhand|look|loss|love|low|lukewarm|lumber|lunch|lunchroom|machine|magic
maid|mailbox|mainline|man|marble|mark|market|mask|mass|match|matchbox|meal|meantime|meanwhile|measure|meat|meeting|memory|men|metal|mice|middle|milk|mind|mine|minister|mint
minute|mist|mitten|mom|money|monkey|month|moon|moonbeam|moonlight|moonlit|moonscape|moonshine|moonstruck|moonwalk|moreover|morning|mother|motion|motorcycle|mountain|mouth
move|muscle|name|nation|nearby|neck|need|needle|nerve|nest|nevermore|newsboy|newsbreak|newscaster|newsdealer|newsletter|newsman|newspaper|newsprint|newsreel|newsroom|night
nightfall|nobody|noise|noisemaker|north|northeast|nose|note|notebook|nowhere|number|nursemaid|nut|nutcracker|oatmeal|observation|ocean|offer|office|oil|oneself|onetime|orange
oranges|order|oven|overboard|overcoat|overflow|overland|pacemaker|page|pail|pan|pancake|paper|parcel|part|partner|party|passbook|passenger|passkey|Passover|passport|payment
peace|pear|pen|pencil|peppermint|person|pest|pet|pets|pickle|pickup|picture|pie|pies|pig|pigs|pin|pinhole|pinstripe|pinup|pinwheel|pipe|pizzas|place|plane|planes|plant|plantation
plants|plastic|plate|play|playback|playground|playhouse|playthings|pleasure|plot|plough|pocket|point|poison|pollution|ponytail|popcorn|porter|position|postcard|pot|potato
powder|power|price|produce|profit|property|prose|protest|pull|pump|punishment|purpose|push|quarter|quartz|queen|question|quicksand|quiet|quill|quilt|quince|quiver|rabbit|rabbits
racquetball|rail|railroad|railway|rain|raincheck|raincoat|rainstorm|rainwater|rake|range|rat|rate|rattlesnake|rattletrap|ray|reaction|reading|reason|receipt|recess|record
regret|relation|religion|repairman|representative|request|respect|rest|reward|rhythm|rice|riddle|rifle|ring|rings|river|riverbanks|road|robin|rock|rod|roll|roof|room|root
rose|route|rub|rubberband|rule|run|sack|sail|sailboat|salesclerk|salt|sand|sandlot|sandstone|saucepan|scale|scapegoat|scarecrow|scarf|scene|scent|school|schoolbook|schoolboy
schoolbus|schoolhouse|science|scissors|screw|sea|seashore|seat|secretary|seed|selection|self|sense|servant|shade|shadyside|shake|shame|shape|sharecropper|sharpshooter|sheep
sheepskin|sheet|shelf|ship|shirt|shock|shoe|shoelace|shoemaker|shoes|shop|shortbread|show|showoff|showplace|side|sidekick|sidewalk|sign|silk|silver|silversmith|sink|sister
sisterhood|sisters|sixfold|size|skate|skateboard|skin|skintight|skirt|sky|skylark|skylight|slave|sleep|sleet|slip|slope|slowdown|slumlord|smash|smell|smile|smoke|snail|snails
snake|snakes|snakeskin|sneeze|snow|snowball|snowbank|snowbird|snowdrift|snowshovel|soap|society|sock|soda|sofa|softball|somebody|someday|somehow|someone|someplace|something
sometimes|somewhat|somewhere|son|song|songs|sort|sound|soundproof|soup|southeast|southwest|soybean|space|spacewalk|spade|spark|spearmint|spiders|spillway|spokesperson|sponge
spoon|spot|spring|spy|square|squirrel|stage|stagehand|stamp|standby|standoff|standout|standpoint|star|starfish|start|statement|station|steam|steamship|steel|stem|step|stepson
stew|stick|sticks|stitch|stocking|stockroom|stomach|stone|stop|stoplight|stopwatch|store|story|stove|stranger|straw|stream|street|stretch|string|stronghold|structure|substance
subway|sugar|suggestion|suit|summer|sun|sunbaked|sunbathe|sundial|sundown|sunfish|sunflower|sunglasses|sunlit|sunray|sunroof|sunup|supercargo|supercharge|supercool|superego
superfine|supergiant|superhero|superhighways|superhuman|superimpose|supermarket|supermen|supernatural|superpower|superscript|supersensitive|supersonic|superstar|superstrong
superstructure|supertanker|superweapon|superwoman|support|surprise|sweater|sweetheart|sweetmeat|swim|swing|system|table|tablecloth|tablespoon|tabletop|tableware|tail|tailcoat
tailgate|taillight|taillike|tailpiece|tailspin|takeoff|takeout|takeover|talebearer|taleteller|talk|tank|tapeworm|taproom|taproot|target|taskmaster|taste|tax|taxicab|taxpayer
teaching|teacup|team|teammate|teamwork|teapot|teaspoon|teenager|teeth|telltale|temper|tendency|tenderfoot|tenfold|tent|territory|test|textbook|texture|theory|therefore|thing
things|thought|thread|thrill|throat|throne|throwaway|throwback|thumb|thunder|thunderbird|thunderstorm|ticket|tiger|time|timekeeper|timesaving|timeshare|timetable|tin|title
toad|toe|toes|together|tomatoes|tongue|toolbox|tooth|toothbrush|toothpaste|toothpick|top|touch|touchdown|town|township|toy|toys|trade|trail|train|trains|tramp|transport|tray
treatment|tree|trees|trick|trip|trouble|trousers|truck|trucks|tub|turkey|turn|turnabout|turnaround|turnbuckle|turndown|turnkey|turnoff|turntable|twig|twist|typewriter|umbrella
uncle|underachieve|underage|underarm|underbelly|underbid|undercharge|underclothes|undercover|undercut|underdevelop|underestimate|underexpose|underfoot|underground|underwear
unit|upbeat|upbringing|upcoming|update|upend|upgrade|upheaval|uphill|uphold|upkeep|upland|uplift|upload|upmarket|upon|uppercase|upperclassman|uppercut|uproar|uproot|upset
upshot|upside|upstage|upstairs|upstanding|upstart|upstate|upstream|uptake|upthrust|uptight|uptime|uptown|upward|upwind|use|vacation|value|van|vase|vegetable|veil|vein|verse
vessel|vest|view|visitor|voice|volcano|volleyball|voyage|waistline|walk|walkways|wall|walleyed|wallpaper|war|wardroom|warfare|warmblooded|warpath|wash|washbowl|washcloth|washhouse
washout|washrag|washroom|washstand|washtub|waste|wastebasket|wasteland|wastepaper|wastewater|watch|watchband|watchdog|watchmaker|watchman|watchtower|watchword|water|watercolor
watercooler|watercraft|waterfall|waterfront|waterline|waterlog|watermelon|waterpower|waterproof|waterscape|watershed|waterside|waterspout|watertight|wave|wavelike|waves|wax
waxwork|way|waybill|wayfarer|waylaid|wayside|wayward|wealth|weather|weathercock|weatherman|weatherproof|week|weekday|weekend|weeknight|weight|whatever|whatsoever|wheel|wheelchair
wheelhouse|whip|whistle|whitecap|whitefish|whitewall|whitewash|widespread|wilderness|wind|window|wine|wing|winter|wipeout|wire|wish|without|woman|women|wood|woodshop|wool
word|work|worm|wound|wren|wrench|wrist|writer|writing|yak|yam|yard|yarn|year|yoke|zebra|zephyr|zinc|zipper|zoo
`.split("|");
const _numberWords = {
  ones: [
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
    "twenty"
  ],
  tens:        ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
  tiers:       ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion", "nonillion"],
  bigPrefixes: ["", "un", "duo", "tre", "quattuor", "quin", "sex", "octo", "novem"],
  bigSuffixes: ["", "decillion", "vigintillion", "trigintillion", "quadragintillion", "quinquagintillion", "sexagintillion", "septuagintillion", "octogintillion", "nonagintillion", "centillion"]
} as const;
const _ordinals = {
  zero:    "zeroeth", one:     "first", two:     "second", three:   "third", four:    "fourth", five:    "fifth", eight:   "eighth", nine:    "ninth", twelve:  "twelfth",
  twenty:  "twentieth", thirty:  "thirtieth", forty:   "fortieth", fifty:   "fiftieth", sixty:   "sixtieth", seventy: "seventieth", eighty:  "eightieth", ninety:  "ninetieth"
} as const;
const _romanNumerals = {
  grouped: [
    ["", "\u2160", "\u2161", "\u2162", "\u2163", "\u2164", "\u2165", "\u2166", "\u2167", "\u2168", "\u2169", "\u216A", "\u216B"],
    ["", "\u2169", "\u2169\u2169", "\u2169\u2169\u2169", "\u2169\u216C", "\u216C", "\u216C\u2169", "\u216C\u2169\u2169", "\u216C\u2169\u2169\u2169", "\u2169\u216D"],
    ["", "\u216D", "\u216D\u216D", "\u216D\u216D\u216D", "\u216D\u216E", "\u216E", "\u216E\u216D", "\u216E\u216D\u216D", "\u216E\u216D\u216D\u216D", "\u216D\u216F"],
    ["", "\u216F", "\u216F\u216F", "\u216F\u216F\u216F", "\u216F\u2181", "\u2181", "\u2181\u216F", "\u2181\u216F\u216F", "\u2181\u216F\u216F\u216F", "\u2181\u2182"],
    ["", "\u2182", "\u2182\u2182", "\u2182\u2182\u2182", "\u2182\u2187", "\u2187", "\u2187\u2182", "\u2187\u2182\u2182", "\u2187\u2182\u2182\u2182", "\u2187\u2188"],
    ["", "\u2188", "\u2188\u2188", "\u2188\u2188\u2188"]
  ],
  ungrouped: [
    ["", "\u2160", "\u2160\u2160", "\u2160\u2160\u2160", "\u2160\u2164", "\u2164", "\u2164\u2160", "\u2164\u2160\u2160", "\u2164\u2160\u2160\u2160", "\u2160\u2169"],
    ["", "\u2169", "\u2169\u2169", "\u2169\u2169\u2169", "\u2169\u216C", "\u216C", "\u216C\u2169", "\u216C\u2169\u2169", "\u216C\u2169\u2169\u2169", "\u2169\u216D"],
    ["", "\u216D", "\u216D\u216D", "\u216D\u216D\u216D", "\u216D\u216E", "\u216E", "\u216E\u216D", "\u216E\u216D\u216D", "\u216E\u216D\u216D\u216D", "\u216D\u216F"],
    ["", "\u216F", "\u216F\u216F", "\u216F\u216F\u216F", "\u216F\u2181", "\u2181", "\u2181\u216F", "\u2181\u216F\u216F", "\u2181\u216F\u216F\u216F", "\u2181\u2182"],
    ["", "\u2182", "\u2182\u2182", "\u2182\u2182\u2182", "\u2182\u2187", "\u2187", "\u2187\u2182", "\u2187\u2182\u2182", "\u2187\u2182\u2182\u2182", "\u2187\u2188"],
    ["", "\u2188", "\u2188\u2188", "\u2188\u2188\u2188"]
  ]
} as const;
const UUIDLOG: Array<[string, string, number]> = [];

// #endregion ▒▒▒▒[HELPERS]▒▒▒▒


// #region █████████████████ INITIALIZATION ███████████████████████
const Initialize = () => {
  Object.assign(globalThis, {_backTrace: {} });
};
// #endregion ▄▄▄▄▄ INITIALIZATION ▄▄▄▄▄

// #region ████████ GETTERS: Basic Data Lookup & Retrieval ████████ ~
// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
const GMID = (): string | false => getGame().users.find((user) => user.isGM)?.id ?? false;
// #endregion ▄▄▄▄▄ GETTERS ▄▄▄▄▄

// #region ████████ TYPES: Type Checking, Validation, Conversion, Casting ████████ ~
const isNumString = <T>(ref: T): ref is T & NumString =>
  typeof ref === "string" && /^-?\d*\.?\d+$/.test(ref);
const isBooleanString = <T>(ref: T): ref is T & BoolString => typeof ref === "string"
  && (ref === "true" || ref === "false");
const isSystemScalar = <T>(ref: T): ref is T & SystemScalar => typeof ref === "string" || typeof ref === "number" || typeof ref === "boolean";

const isArray = <T>(ref: T): ref is T & Array<ValOf<T>> => Array.isArray(ref);
const isSimpleObj = <T>(ref: T): ref is T & Record<Key, ValOf<T>> => ref === Object(ref) && !isArray(ref);
const isNumber = <T>(ref: T): ref is T & number => typeof ref === "number" && !isNaN(ref);
const isInt = <T>(ref: T): ref is T & number => isNumber(ref) && ref % 1 === 0;
const isFloat = <T>(ref: T): ref is T & Float => isNumber(ref) && String(ref).includes(".");
const isPosInt = <T>(ref: T): ref is T & number => isInt(ref) && ref >= 0;
const isPosFloat = <T>(ref: T): ref is T & PosFloat => isFloat(ref) && ref >= 0;

const isList = <T>(ref: T): ref is T & List => ref === Object(ref) && !isArray(ref);
const isIndex = <T>(ref: T): ref is T & Index<ValOf<T>> => isList(ref) || isArray(ref);
const isIterable = <T>(ref: T): ref is T & Iterable<unknown> => typeof ref === "object" && ref !== null && Symbol.iterator in ref;

const isHTMLString = <T>(ref: T): ref is T & HTMLString => typeof ref === "string" && /^<.*>$/u.test(ref);
const isJQuery = <T>(ref: T): ref is T & JQuery => ref instanceof jQuery;
const isHexColor = <T>(ref: T): ref is T & HexColor => typeof ref === "string" && /^#(([0-9a-fA-F]{2}){3,4}|[0-9a-fA-F]{3,4})$/.test(ref);
const isRGBColor = <T>(ref: T): ref is T & RGBColor => typeof ref === "string" && /^rgba?\((\d{1,3},\s*){1,2}?\d{1,3},\s*\d{1,3}(\.\d+)?\)$/.test(ref);

const isFunc = <T>(ref: T): ref is T & ((...args: unknown[]) => unknown) => typeof ref === "function";
const isUndefined = (ref: unknown): ref is undefined => ref === undefined;
const isNullOrUndefined = <T>(ref: T): ref is T & (null | undefined) => ref === null || ref === undefined;
const isDefined = <T>(ref: T): ref is T & (null | NonNullable<T>) => !isUndefined(ref);

const isEmpty = (ref: Index): boolean => Object.keys(ref).length === 0;
const hasItems = (ref: Index): boolean => !isEmpty(ref);
const isInstanceOf = <T, C extends new (...args: unknown[]) => unknown>(ref: T, classRef: C): ref is T & InstanceType<C> => ref instanceof classRef;

/**
 * Asserts that a given value is of a specified type.
 * Throws an error if the value is not of the expected type.
 *
 * @param val - The value to check.
 * @param type - The expected type of the value.
 * @throws Error - If the value is not of the expected type.
 *
 * This function uses a generic type parameter `T` to specify the expected type.
 */
function assertNonNullType<T>(
  val: unknown,
  type: (new(...args: unknown[]) => T) | string
): asserts val is NonNullable<T> {
  let valStr: string;
  // Attempt to convert the value to a string for error messaging.
  try {
    valStr = JSON.stringify(val);
  } catch{
    valStr = String(val);
  }

  // Check if the value is undefined
  if (val === undefined) {
    throw new Error(`Value ${String(valStr)} is undefined!`);
  }

  // If the type is a string, compare the typeof the value to the type string.
  if (typeof type === "string") {
    if (typeof val !== type) {
      throw new Error(`Value ${String(valStr)} is not a ${String(type)}!`);
    }
  } else if (!(val instanceof type)) {
    // If the type is a function (constructor), check if the value is an instance of the type.
    throw new Error(`Value ${String(valStr)} is not a ${String(type.name)}!`);
  }
}


/**
 * Checks if multiple values are fuzzy equal.
 * @param refs - The values to compare.
 * @returns true if all values are fuzzy equal, false otherwise.
 */
const areFuzzyEqual = (...refs: unknown[]) => {

  const _areFuzzyEqual = (val1: unknown, val2: unknown): boolean => {
    if (val1 === val2) {
      return true;
    }

    // If any of the values are either null or undefined, they are considered equal only if both are null or undefined
    if (isNullOrUndefined(val1) || isNullOrUndefined(val2)) {
      return isNullOrUndefined(val1 ?? val2);
    }

    // If the values are both of the same type, they are considered equal if their values are equal
    if (typeof val1 === typeof val2) {
      return val1 === val2;
    }

    // If one value is a number, they are considered equal if the other can be converted to the same number.
    if ([val1, val2].some((v) => typeof v === "number")) {
      return Number(typeof val1 === "boolean" ? NaN : val1) === Number(typeof val2 === "boolean" ? NaN : val2);
    }

    // If one value is a boolean and the other is a string, an empty string equals false, and a non-empty string equals true.
    if (
      [val1, val2].some((v) => typeof v === "boolean")
      && [val1, val2].some((v) => typeof v === "string")
    ) {
      return Boolean((val1 && val2 !== "") || (!val1 && val2 === ""));
    }

    // If none of the above conditions are met, the values are not equal
    return false;
  };

  do {
    const ref = refs.pop();
    if (refs.length && !_areFuzzyEqual(ref, refs[0])) {
      return false;
    }
  } while (refs.length);
  return true;
};

/**
 * Checks if all provided values of any type are identical in type and form
 *  (e.g. two different objects are considered equal if all of their properties and values are equal).
 *
 * @param refs - The values to compare.
 * @returns true if all values are identical in form, false otherwise.
 */
const areEqual = (...refs: unknown[]) => {
  const _areEqual = (val1: unknown, val2: unknown): boolean => {
    if (typeof val1 !== typeof val2) { return false; }
    if (val1 === val2) { return true; }
    if (isNullOrUndefined(val1) || isNullOrUndefined(val2)) { return isNullOrUndefined(val1 ?? val2); }
    return false;
  };

  do {
    const ref = refs.pop();
    if (refs.length && !_areEqual(ref, refs[0])) { return false; }
  } while (refs.length);
  return true;
};

const pFloat = <IsStrict extends boolean>(
  ref: unknown,
  sigDigits?: number,
  isStrict = false as IsStrict
): IsStrict extends true ? (typeof NaN  ) : Float => {
  let num: number;

  if (typeof ref === "string") {
    num = parseFloat(ref);
  } else if (typeof ref === "number") {
    num = ref;
  } else {
    return (isStrict ? NaN : 0) as IsStrict extends true ? (typeof NaN  ) : Float;
  }

  if (isNaN(num)) {
    return (isStrict ? NaN : 0) as IsStrict extends true ? (typeof NaN  ) : Float;
  }

  if (isUndefined(sigDigits)) {
    return num;
  }

  // Calculate the number to the specified significant digits
  const factor = Math.pow(10, sigDigits);
  const rounded = Math.round(num * factor) / factor;

  return rounded; // Explicitly cast to Float for clarity
};

const pInt: {
  (ref: unknown, isStrict?: boolean): number;
  (ref: unknown, index: number, array: unknown[]): number; // So this can be used in Array.map()
} = (ref: unknown, isStrictOrIndex?: boolean | number, _arr?: unknown[]): typeof NaN => {
  let isStrict = false;
  if (typeof isStrictOrIndex === "boolean") {
    isStrict = isStrictOrIndex;
  }
  return isNaN(pFloat(ref, 0, isStrict))
    ? NaN
    : Math.round(pFloat(ref, 0, isStrict));
};

const pBool = (
  ref: unknown
): boolean => {
  if (typeof ref === "boolean") { return ref; }
  if (([0, null, undefined, ""] as unknown[]).includes(ref)) { return false; }
  if (typeof ref === "string") {
    return !["0", "false", "null", "undefined", ""].includes(ref);
  }
  if (isArray(ref) && ref.length === 0) { return false; }
  if (isList(ref) && isEmpty(ref)) { return false; }
  return true;
};

const castToScalar = (val: unknown): SystemScalar => {
  if (["number", "boolean"].includes(typeof val)) { return val as number|boolean as SystemScalar; }
  if (typeof val === "string") {
    if (isNumString(val)) {
      const numVal = pFloat(val);
      if (isInt(numVal)) {
        return pInt(val) as SystemScalar;
      }
      return numVal as SystemScalar;
    }
    if (isBooleanString(val)) {
      return pBool(val) as SystemScalar;
    }
  }
  return String(val) as SystemScalar;
};


const radToDeg = (rad: number, isConstrained = true): number => {
  rad = isConstrained ? rad % (2 * Math.PI) : rad;
  rad *= 180 / Math.PI;
  return rad;
};
const degToRad = (deg: number, isConstrained = true): number => {
  deg = isConstrained ? deg % 360 : deg;
  deg *= Math.PI / 180;
  return deg;
};
const getKey = <T>(key: Key, obj: Record<Key, T>): Maybe<T> => {
  if (key in obj) {
    return obj[key];
  }
  return undefined;
};

/**
 * Sorts an array of strings by their last word, returning a new array
 * @param items - Array of strings to sort
 * @returns A new sorted array
 */
const sortByLastWord = (items: string[]): string[] => {
  return items.toSorted((a, b) => {
    if (/ /u.test(a)) {
      a = a.split(" ").pop() as string;
    }
    if (/ /u.test(b)) {
      b = b.split(" ").pop() as string;
    }
    return a.localeCompare(b);
  });
};

/**
 * Sorts an array of Document instances by the last word in their name
 * @param docs - Array of Document instances to sort
 * @returns A new sorted array
 */
const sortDocsByLastWord = <T extends EunosDocument = EunosDocument>(docs: T[]): T[] => {
  return docs.toSorted((a, b) => {
    let aName = a.name;
    let bName = b.name;
    if (/ /u.test(aName)) {
      aName = aName.split(" ").pop() as string;
    }
    if (/ /u.test(bName)) {
      bName = bName.split(" ").pop() as string;
    }
    return aName.localeCompare(bName);
  });
};

const FILTERS = {
  IsInstance: ((classRef: unknown) => ((item: unknown) => typeof classRef === "function" && item instanceof classRef))
};
// #endregion ▄▄▄▄▄ TYPES ▄▄▄▄▄

// #region ████████ BOOLEAN: Combining & Manipulating Boolean Tests ████████

// A combining test function that accepts an array of unknown values and a single-value test function. It will return 'true' if the test function passes for all values.
const checkAll = <T>(items: T[], test: (item: T) => boolean): boolean => items.every(test);

// A combining test function that accepts an array of unknown values and a single-value test function. It will return 'true' if the test function passes for at least one value.
const checkAny = <T>(items: T[], test: (item: T) => boolean): boolean => items.some(test);

// A combining test function that accepts an array of unknown values and a single-value test function. It will return 'true' if the test function fails for all values.
const checkAllFail = <T>(items: T[], test: (item: T) => boolean): boolean => !checkAny(items, test);


/**
 * Asserts that a given value is of a specified type.
 * Throws an error if the value is not of the expected type.
 *
 * @param val - The value to check.
 * @param type - The expected type of the value.
 * @throws Error - If the value is not of the expected type.
 *
 * This function uses a generic type parameter `T` to specify the expected type.
 */
// Overload 1: Just check that value is defined
function assertIs<T>(val: T): NonNullable<T>;
// Overload 2: Check that value is of specified type while preserving original type
function assertIs<T, S extends "string" | "number" | "boolean" | "object" | "symbol" | "bigint" | "function" | "undefined">(
  val: T,
  type: S
): NonNullable<T & (
  S extends "string" ? string :
  S extends "number" ? number :
  S extends "boolean" ? boolean :
  S extends "object" ? object :
  S extends "symbol" ? symbol :
  S extends "bigint" ? bigint :
  S extends "function" ? (...args: unknown[]) => unknown :
  unknown
)>;
// Overload 3: Check that value is instance of specified class while preserving original type
function assertIs<T, C>(val: T, type: new(...args: unknown[]) => C): NonNullable<T & C>;
// Implementation
function assertIs<T, C>(val: T, type?: (new(...args: unknown[]) => C) | string): T {
  if (type === undefined) {
    // Case 1: Nothing passed - assert value is defined
    if (val === undefined) {
      throw new Error("Value is undefined!");
    }
    return val as NonNullable<T>;
  } else if (typeof type === "string") {
    // Case 2: String passed - check typeof
    if (typeof val !== type) {
      throw new Error(`Value ${String(val)} is not a ${String(type)}!`);
    }
    // TypeScript can't express the exact conditional type in the implementation
    // so we use a type assertion for the return value
    return val as NonNullable<T>;
  } else {
    // Case 3: Class passed - check instanceof
    if (!(val instanceof type)) {
      throw new Error(`Value ${String(val)} is not an instance of ${type.name}!`);
    }
    return val as NonNullable<T & C>;
  }
}

// #endregion ▄▄▄▄▄ BOOLEAN ▄▄▄▄▄

// #region ████████ STRINGS: String Parsing, Manipulation, Conversion, Regular Expressions ████████
// #region ■■■■■■■[Case Conversion]■■■■ Upper, Lower, Sentence & Title Case ■■■■■■■ ~
const uCase = (str: unknown): Uppercase<string> => String(str).toUpperCase() as Uppercase<string>;
const lCase = (str: unknown): Lowercase<string> => String(str).toLowerCase() as Lowercase<string>;
const sCase = (str: unknown): Capitalize<string> => {
  if (typeof str === "object") {
    throw new Error("Cannot convert object to sentence case.");
  }
  const strValue = String(str as Exclude<typeof str, object>); // Explicitly convert to string after the check
  let [first, ...rest] = strValue.split(/\s+/) as [string, ...unknown[]];
  first = testRegExp(first, _capWords)
    ? first
    : `${String(uCase(first.charAt(0)))}${String(lCase(first.slice(1)))}`;
  if (hasItems(rest)) {
    rest = rest.map((word) => (testRegExp(word, _capWords) ? word : lCase(word)));
  }
  return [first, ...rest].join(" ").trim() as Capitalize<string>;
};
const tCase = (str: unknown): Capitalize<string> => String(str).split(/\s/)
  .map((word, i) => (i && testRegExp(word, _noCapWords) ? lCase(word) : sCase(word)))
  .join(" ").trim() as Capitalize<string>;
/**
 * Converts a string to camel case, replacing spaces and hyphens with underscores and capitalizing each word except the first.
 * @param str - The string to convert to camel case.
 * @returns The string in camel case.
 */
/**
 * Converts a string to camel case by:
 * - Converting spaces, hyphens, and underscores to word boundaries
 * - Capitalizing the first letter of each word except the first
 * - Removing all separators
 * @param str - The string or string-like value to convert to camel case
 * @returns The string in camel case format
 * @example
 * camelCase("hello world") // returns "helloWorld"
 * camelCase("hello-world") // returns "helloWorld"
 * camelCase("hello_world") // returns "helloWorld"
 */
const camelCase = (str: string | number | boolean): string => {
  return String(str)
    // Remove all non-alphanumeric characters except spaces/hyphens/underscores
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    // Convert separators to spaces
    .replace(/[-_]+/g, " ")
    // Handle word boundaries, keeping first letter lowercase
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (match, index) =>
      index === 0 ? match.toLowerCase() : match.toUpperCase()
    )
    // Remove all spaces
    .replace(/\s+/g, "");
};

// #endregion ■■■■[Case Conversion]■■■■
// #region ■■■■■■■[RegExp]■■■■ Regular Expressions ■■■■■■■ ~
const testRegExp = (str: unknown, patterns: Array<RegExp | string> = [], flags = "gui", isTestingAll = false) => patterns
  .map((pattern) => (pattern instanceof RegExp
    ? pattern
    : new RegExp(`\\b${String(pattern)}\\b`, flags)))[isTestingAll ? "every" : "some"]((pattern) => pattern.test(String(str)));
const regExtract = (ref: unknown, pattern: string | RegExp, flags?: string) => {
  /* Wrapper around String.match() that removes the need to worry about match()'s different handling of the 'g' flag.
      - IF your pattern contains unescaped parentheses -> Returns Array of all matching groups.
      - OTHERWISE -> Returns string that matches the provided pattern. */
  const splitFlags: string[] = [];
  (flags ?? "").replace(/g/g, "").split("").forEach((flag) => {
    if (flag && !splitFlags.includes(flag)) {
      splitFlags.push(flag);
    }
  });
  const isGrouping = /[)(]/.test(pattern.toString().replace(/\\\)|\\\(/g, ""));
  if (isGrouping) {
    splitFlags.push("g");
  }
  flags = splitFlags.join("");
  pattern = new RegExp(pattern, flags);
  const matches = RegExp(pattern).exec(String(ref)) ?? [];
  return isGrouping ? Array.from(matches) : matches.pop();
};

// #endregion ■■■■[RegExp]■■■■
// #region ■■■■■■■[Formatting]■■■■ Hyphenation, Pluralization, "a"/"an" Fixing ■■■■■■■ ~
// const hyphenate = (str: unknown) => (/^<|\u00AD|\u200B/.test(`${String(str)}`) ? `${String(str)}` : _hyph(`${String(str)}`));
const unhyphenate = (str: StringLike) => String(str).replace(/[\u00AD\u200B]/gu, "");
const parseArticles = (str: StringLike) => String(str).replace(/\b([aA])\s([aeiouAEIOU])/gu, "$1n $2");
const pluralize = (singular: string, num = 2, plural?: string) => {
  if (pFloat(num) === 1) {return singular;}
  return plural ?? `${String(singular.replace(/y$/, "ie").replace(/s$/, "se"))}s`;
};
const oxfordize = (items: Array<number | string>, useOxfordComma = true, andString = "and") => {
  if (items.length === 0) {return "";}
  if (items.length === 1) {return String(items[0]);}
  const lastItem = items.pop();
  return [
    items.join(", "),
    useOxfordComma ? "," : "",
    ` ${String(andString)} `,
    lastItem
  ].join("");
};
const ellipsize = (text: unknown, maxLength: number): string => {
  const str = String(text);
  return str.length > maxLength ? `${String(str.slice(0, maxLength - 3))}\u2926` : str;
};
const pad = (text: unknown, minLength: number, delim = " "): string => {
  const str = String(text);
  if (str.length < minLength) {
    return `${String(delim.repeat(minLength - str.length))}${String(str)}`;
  }
  return str;
};
/**
 * Given a string, returns the string with exterior whitespace trimmed and interior whitespace collapsed to a single space.
 */
const trimInner = (text: string): string => text.replace(/\s+/gu, " ").trim();
const toKey = (text: string): string => text.toLowerCase().replace(/ /g, "-").replace(/default/, "DEFAULT");
// #region ========== Numbers: Formatting Numbers Into Strings =========== ~
const signNum = (num: number, delim = "", zeroSign = "+") => {
  let sign;
  const parsedNum = pFloat(num);
  if (parsedNum < 0) {
    sign = "-";
  } else if (parsedNum === 0) {
    sign = zeroSign;
  } else {
    sign = "+";
  }
  return `${String(sign)}${String(delim)}${String(Math.abs(parsedNum))}`;
};
const padNum = (num: number, numDecDigits: number, includePlus = false) => {
  const prefix = (includePlus && num >= 0) ? "+" : "";
  const [leftDigits, rightDigits] = String(pFloat(num)).split(/\./);
  if (isDefined(rightDigits) && isInt(parseInt(rightDigits, 10))) {
    if (rightDigits.length > numDecDigits) {
      return `${String(prefix)}${String(pFloat(num, numDecDigits))}`;
    } else if (rightDigits.length < numDecDigits) {
      return `${String(prefix)}${String(leftDigits)}.${String(rightDigits)}${String("0".repeat(numDecDigits - rightDigits.length))}`;
    } else {
      return `${String(prefix)}${String(pFloat(num))}`;
    }
  }
  return `${String(prefix)}${String(leftDigits)}.${String("0".repeat(numDecDigits))}`;
};

const stringifyNum = (num: number | string): NumString => {
  // Can take string representations of numbers, either in standard or scientific/engineering notation.
  // Returns a string representation of the number in standard notation.
  const parsedNum = pFloat(num, undefined, true);
  if (isNaN(parsedNum)) { return "0" as NumString;}
  const stringyNum = lCase(parsedNum).replace(/[^\d.e+-]/g, "");
  const base = regExtract(stringyNum, /^-?[\d.]+/) as string | undefined;
  const exp = pInt(regExtract(stringyNum, /e([+-]?\d+)$/) as string | undefined);
  if (typeof base !== "string") { return String(parsedNum) as NumString; }
  if (typeof exp !== "number") { return String(parsedNum) as NumString; }
  let baseInts = regExtract(base, /^-?(\d+)/);
  let baseDecs = regExtract(base, /\.(\d+)/);
  if (!isArray(baseInts)) { return String(parsedNum) as NumString; }
  if (!isArray(baseDecs)) { return String(parsedNum) as NumString; }
  const lastBaseInt = baseInts.pop();
  const lastBaseDec = baseDecs.pop();
  if (typeof lastBaseInt !== "string") { return String(parsedNum) as NumString; }
  if (typeof lastBaseDec !== "string") { return String(parsedNum) as NumString; }
  baseInts = lastBaseInt.replace(/^0+/, "");
  baseDecs = lCase(lastBaseDec).replace(/0+$/, "");
  if (isUndefined(baseInts)) { return String(parsedNum) as NumString; }
  if (isUndefined(baseDecs)) { return String(parsedNum) as NumString; }
  const numFinalInts = Math.max(0, baseInts.length + exp);
  const numFinalDecs = Math.max(0, baseDecs.length - exp);
  const finalInts = [
    baseInts.slice(0, numFinalInts),
    baseDecs.slice(0, Math.max(0, exp))
  ].join("") || "0";
  const finalDecs = [
    baseInts.length - numFinalInts > 0
      ? baseInts.slice(baseInts.length - numFinalInts - 1)
      : "",
    baseDecs.slice(baseDecs.length - numFinalDecs)
  ].join("");
  return [
    stringyNum.startsWith("-") ? "-" : "",
    finalInts,
    "0".repeat(Math.max(0, numFinalInts - finalInts.length)),
    finalDecs.length ? "." : "",
    "0".repeat(Math.max(0, numFinalDecs - finalDecs.length)),
    finalDecs
  ].join("") as NumString;
};

/**
 * Converts a number into its word representation
 * @param num - The number to convert to words. Can be a number or string representation of a number
 * @returns The number spelled out in words
 * @example
 * verbalizeNum(123) // returns "one hundred and twenty-three"
 * verbalizeNum("-45.67") // returns "negative forty-five point six seven"
 * verbalizeNum("1e3") // returns "one thousand"
 * @throws Error if unable to parse digits in the number
 */
const verbalizeNum = (num: number | string) => {
  // Converts a float with absolute magnitude <= 9.99e303 into words.
  num = stringifyNum(num);
  const getTier = (trioNum: number) => {
    if (trioNum < _numberWords.tiers.length) {
      return _numberWords.tiers[trioNum];
    }
    return [
      _numberWords.bigPrefixes[(trioNum % 10) - 1],
      _numberWords.bigSuffixes[Math.floor(trioNum / 10)]
    ].join("");
  };
  const parseThreeDigits = (trio: string) => {
    if (pInt(trio) === 0) {return "";}
    const digits = trio.split("").map((digit) => pInt(digit));
    let result = "";
    if (digits.length === 3) {
      const hundreds = digits.shift();
      if (isUndefined(hundreds)) {
        throw new Error(`[U.verbalizeNum] Undefined digit in trio '${String(digits.join(""))}'.`);
      }
      result += hundreds > 0 ? `${String(_numberWords.ones[hundreds])} hundred` : "";
      if (hundreds && (digits[0] || digits[1])) {
        result += " and ";
      }
    }
    if (pInt(digits.join("")) <= _numberWords.ones.length) {
      result += _numberWords.ones[pInt(digits.join(""))]!;
    } else {
      const tens = _numberWords.tens[pInt(digits.shift())];
      const ones = pInt(digits[0]) > 0 ? `-${String(_numberWords.ones[pInt(digits[0])])}` : "";
      result += `${String(tens)}${String(ones)}`;
    }
    return result;
  };
  const numWords = [];
  if (num.startsWith("-")) {
    numWords.push("negative");
  }
  const [integers, decimals] = num.replace(/[,\s-]/g, "").split(".");
  const intArray = [...(integers ?? "").split("")].reverse().join("")
    .match(/.{1,3}/g)
    ?.map((v) => [...v.split("")].reverse().join("")) ?? [];
  const intStrings = [];
  while (intArray.length) {
    const thisTrio = intArray.pop();
    if (thisTrio) {
      const theseWords = parseThreeDigits(thisTrio);
      if (theseWords) {
        intStrings.push(`${String(theseWords)} ${String(getTier(intArray.length))}`);
      }
    }
  }
  numWords.push(intStrings.join(", ").trim());
  if (isDefined(decimals) && isInt(parseFloat(decimals))) {
    if (integers === "0") {
      numWords.push("zero");
    }
    numWords.push("point");
    for (const digit of decimals.split("")) {
      numWords.push(_numberWords.ones[pInt(digit)]);
    }
  }
  return numWords.join(" ");
};

/**
 * Converts a verbal number (in words) to its numeric value, supporting numbers up to centillion
 * @param text - The number in word form
 * @returns The numeric value
 * @throws Error if the text cannot be parsed into a valid number
 * @example
 * deverbalizeNum("one hundred and twenty-three") // Returns 123
 * deverbalizeNum("negative five point two") // Returns -5.2
 * deverbalizeNum("one quinquagintillion") // Returns 1e153
 */
const deverbalizeNum = (text: string): number => {
  // Normalize input text
  const normalizedText = text.toLowerCase().trim().replace(/\s+/g, " ");

  // Handle negative numbers
  const isNegative = normalizedText.startsWith("negative");
  const cleanText = isNegative ? normalizedText.replace(/^negative\s+/, "") : normalizedText;

  // Split into integer and decimal parts if "point" exists
  const parts = cleanText.split(/\s+point\s+/);
  const integerPart = parts[0];
  const decimalPart = parts[1];

  if (!integerPart) {
    throw new Error("Invalid number format: empty string");
  }

  /**
   * Gets the exponent for a large number suffix (e.g., "decillion")
   * @param word - The suffix word to look up
   * @returns The exponent value (e.g., 33 for "decillion")
   */
  const getLargeSuffixExponent = (word: (typeof _numberWords.bigSuffixes)[number]): number => {
    // Handle special case for centillion
    if (word === "centillion") return 303;

    // Find the suffix and its index
    const suffixIndex = _numberWords.bigSuffixes.indexOf(word);
    if (suffixIndex > 0) {
      return suffixIndex * 3 + 30; // decillion starts at 33, vigintillion at 63, etc.
    }
    return -1;
  };

  /**
   * Gets the multiplier for a large number prefix (e.g., "quin")
   * @param word - The prefix to look up
   * @returns The multiplier value
   */
  const getLargePrefixMultiplier = (word: (typeof _numberWords.bigPrefixes)[number]): number => {
    const prefixIndex = _numberWords.bigPrefixes.indexOf(word);
    return prefixIndex > 0 ? prefixIndex : -1;
  };

  // Process the integer portion
  const processIntegerWords = (words: string): number => {
    const groups = words.split(/,\s*|\s+and\s+|\s+/);
    let total = 0;
    let currentGroup = 0;
    let lastTierValue = Infinity;

    for (const word of groups) {
      if (!word) continue;

      // Handle hyphenated numbers (e.g., "twenty-three")
      const hyphenatedParts = word.split("-");

      for (const part of hyphenatedParts) {
        // First check for compound large numbers (e.g., "quinquagintillion")
        // Try to match prefix + suffix pattern
        for (const prefix of _numberWords.bigPrefixes) {
          for (const suffix of _numberWords.bigSuffixes) {
            if (part === prefix + suffix && prefix && suffix) {
              const exponent = getLargeSuffixExponent(suffix);
              const multiplier = getLargePrefixMultiplier(prefix);
              if (exponent > 0 && multiplier > 0) {
                const tierValue = Math.pow(10, exponent);
                if (tierValue >= lastTierValue) {
                  throw new Error(`Invalid number format: tiers out of order near "${word}"`);
                }
                lastTierValue = tierValue;
                total += currentGroup * tierValue;
                currentGroup = 0;
                continue;
              }
            }
          }
        }

        // Check for regular tiers (thousand, million, etc.)
        const tierIndex = _numberWords.tiers.indexOf(part as (typeof _numberWords.tiers)[number]);
        if (tierIndex > 0) {
          const tierValue = Math.pow(1000, tierIndex);
          if (tierValue >= lastTierValue) {
            throw new Error(`Invalid number format: tiers out of order near "${word}"`);
          }
          lastTierValue = tierValue;
          total += currentGroup * tierValue;
          currentGroup = 0;
          continue;
        }

        // Check for "hundred"
        if (part === "hundred") {
          currentGroup *= 100;
          continue;
        }

        // Check for tens words (twenty, thirty, etc.)
        const tensIndex = _numberWords.tens.indexOf(part as (typeof _numberWords.tens)[number]);
        if (tensIndex > 1) {
          currentGroup += tensIndex * 10;
          continue;
        }

        // Check for ones words (one, two, three, etc.)
        const onesIndex = _numberWords.ones.indexOf(part as (typeof _numberWords.ones)[number]);
        if (onesIndex >= 0) {
          currentGroup += onesIndex;
          continue;
        }

        if (part !== "and") {
          throw new Error(`Invalid number word: ${part}`);
        }
      }
    }

    return total + currentGroup;
  };

  // Calculate integer result
  const integerResult = processIntegerWords(integerPart);

  // Process decimal part if it exists
  let result = integerResult;
  if (decimalPart) {
    const decimalDigits = decimalPart.split(/\s+/)
      .map(word => {
        const index = _numberWords.ones.indexOf(word as (typeof _numberWords.ones)[number]);
        if (index === -1) {
          throw new Error(`Invalid decimal digit: ${word}`);
        }
        return index;
      })
      .join("");
    result = parseFloat(`${integerResult}.${decimalDigits}`);
  }

  return isNegative ? -result : result;
};


const ordinalizeNum = (num: string | number, isReturningWords = false) => {
  if (isReturningWords) {
    const [numText, suffix]: RegExpMatchArray = RegExp(/.*?[-\s]?(\w*)$/i).exec(lCase(verbalizeNum(num))) ?? ["", ""];
    return numText.replace(
      new RegExp(`${String(suffix)}$`),
      suffix in _ordinals ? _ordinals[suffix as KeyOf<typeof _ordinals>] : `${String(suffix)}th`
    );
  }
  if (/(\.)|(1[1-3]$)/.test(String(num))) {
    return `${String(num)}th`;
  }
  return `${String(num)}${["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"][
    pInt(String(num).charAt(String(num).length - 1))
  ]
  }`;
};
const romanizeNum = (num: number, isUsingGroupedChars = true) => {
  if (isFloat(num)) {throw new Error(`Error: Can't Romanize Floats (${String(num)})`);}
  if (num >= 400000) {throw new Error(`Error: Can't Romanize >= 400,000 (${String(num)})`);}
  if (num < 0) {throw new Error(`Error: Can't Romanize Negative Numbers (${String(num)})`);}
  if (num === 0) {return "0";}
  const romanRef = _romanNumerals[isUsingGroupedChars ? "grouped" : "ungrouped"];
  const romanNum = [...stringifyNum(num).split("")]
    .reverse()
    .map((digit, i) => romanRef[i]![pInt(digit)])
    .reverse()
    .join("");
  return isUsingGroupedChars
    ? romanNum
      .replace(/\b\u2169\u2160\u2160\b/gu, "\u216B")
      .replace(/\b\u2169\u2160\b/gu, "\u216A")
    : romanNum;
};
// #endregion _______ Numbers _______
// #endregion ■■■■[Formatting]■■■■
// #region ■■■■■■■[Content]■■■■ Lorem Ipsum, Random Content Generation, Randum UUID ■■■■■■■ ~
const loremIpsum = (numWords = 200) => {
  const lrWordList = _loremIpsumText.split(/\n?\s+/g);
  const words = lrWordList[randNum(0, lrWordList.length - 1)]!.split("");
  while (words.length < numWords) {
    words.push(...lrWordList);
  }
  words.length = numWords;
  return `${String(sCase(words.join(" ")).trim().replace(/[^a-z\s]*$/ui, ""))}.`;
};
const randString = (length = 5) => Array.from({length})
  .map(() => String.fromCharCode(randInt(...["a", "z"].map((char) => char.charCodeAt(0)) as [number, number])))
  .join("");
const randWord = (numWords = 1, wordList = _randomWords) => Array.from({length: numWords}).map(() => randElem([...wordList])).join(" ");
const getUID = (id: string): string => {
  const indexNum = Math.max(
    0,
    ...UUIDLOG.filter(([genericID]) => genericID.startsWith(id)).map(([, , num]) => num)
  ) + 1;
  const uuid = indexNum === 1 ? id : `${String(id)}_${String(indexNum)}`;
  UUIDLOG.push([id, uuid, indexNum]);
  Object.assign(globalThis, {UUIDLOG});
  return uuid;
};
const getID = (): IDString => foundry.utils.randomID();
// #endregion ■■■■[Content]■■■■
// #endregion ▄▄▄▄▄ STRINGS ▄▄▄▄▄

// #region ████████ SEARCHING: Searching Various Data Types w/ Fuzzy Matching ████████ ~
const fuzzyMatch = (val1: unknown, val2: unknown): boolean => {
  const [str1, str2] = [val1, val2].map((val) => lCase(String(val).replace(/[^a-zA-Z0-9.+-]/g, "").trim()));
  return isDefined(str1) && str1.length > 0 && str1 === str2;
};
const isIn = (needle: unknown, haystack: unknown[] = [], fuzziness = 0) => {
  // Looks for needle in haystack using fuzzy matching, then returns value as it appears in haystack.

  // STEP ONE: POPULATE SEARCH TESTS ACCORDING TO FUZZINESS SETTING
  const SearchTests = [
    (ndl: unknown, item: unknown) => new RegExp(`^${String(ndl)}$`, "gu").test(String(item)),
    (ndl: unknown, item: unknown) => new RegExp(`^${String(ndl)}$`, "gui").test(String(item))
  ];
  if (fuzziness >= 1) {
    const fuzzyTests = [
      (ndl: unknown, item: unknown) => new RegExp(`^${String(ndl)}`, "gui").test(String(item)),
      (ndl: unknown, item: unknown) => new RegExp(`${String(ndl)}$`, "gui").test(String(item)),
      (ndl: unknown, item: unknown) => new RegExp(String(ndl), "gui").test(String(item)),
      (ndl: unknown, item: unknown) => new RegExp(String(item), "gui").test(String(ndl))
    ];
    SearchTests.push(...fuzzyTests);
    if (fuzziness >= 2) {
      SearchTests.push(...fuzzyTests
        .map((func) => (ndl: unknown, item: unknown) => func(String(ndl).replace(/\W/g, ""), String(item).replace(/\W/gu, ""))));
      if (fuzziness >= 3) {
        SearchTests.push(() => false); // Have to implement Fuse matching
      }
    }
  }

  // STEP TWO: PARSE NEEDLE & CONSTRUCT SEARCHABLE HAYSTACK.
  const searchNeedle = String(needle);
  const searchStack = (() => {
    if (isArray(haystack)) {
      return [...haystack] as unknown[];
    }
    if (isList(haystack)) {
      return Object.keys(haystack) as unknown[];
    }
    try {
      return Array.from(haystack);
    } catch{
      throw new Error(`Haystack type must be [list, array], not ${String(typeof haystack)}: ${String(JSON.stringify(haystack))}`);
    }
  })();
  if (!isArray(searchStack)) {return false;}

  // STEP THREE: SEARCH HAY FOR NEEDLE USING PROGRESSIVELY MORE FUZZY SEARCH TESTS
  let matchIndex = -1;
  while (!isPosInt(matchIndex)) {
    const testFunc = SearchTests.shift();
    if (!testFunc) {
      return false;
    }
    matchIndex = searchStack.findIndex((item) => testFunc(searchNeedle, String(item)));
  }
  if (isPosInt(matchIndex)) {
    return isList(haystack) ? Object.values(haystack)[matchIndex] : haystack[matchIndex];
  }
  return false;
};
const isInExact = (needle: unknown, haystack: unknown[]) => isIn(needle, haystack, 0);
// #endregion ▄▄▄▄▄ SEARCHING ▄▄▄▄▄

// #region ████████ NUMBERS: Number Casting, Mathematics, Conversion ████████ ~
// reusable function. Feed in min, max, an ease, and an optional snap value.
// It returns a random float between min and max, weighted according to the ease you provide,
// and snapped to the nearest multiple of the snap value if provided.
function randNumWeighted(min: number, max: number, ease: string, snap?: number): () => number {
  return gsap.utils.pipe(
      Math.random,            // random number between 0 and 1
      gsap.parseEase(ease),   // apply the ease
      gsap.utils.mapRange(0, 1, min, max), // map to the range [min, max]
      (value: number) => snap ? Math.round(value / snap) * snap : value // snap to the nearest multiple if snap is provided
  );
}

// Overload signatures for randNum
function randNum(min: number, max: number, snap?: number, ease?: string): number; // Optional snap
function randNum(min: number, max: number, ease?: string, snap?: number): number; // Ease only
// Implementation of randNum
function randNum(min: number, max: number, arg3?: string|number, arg4?: string|number): number {
  const snap = [arg3, arg4].find((arg) => typeof arg === "number") ?? undefined;
  const ease = [arg3, arg4].find((arg) => typeof arg === "string") ?? "none";

  if (ease !== "none") {
    return randNumWeighted(min, max, ease, snap)(); // Call randNumWeighted if ease is provided
  }
  return gsap.utils.random(min, max, snap); // Use gsap's random function if no ease is provided
}
const randInt = (min: number, max: number) => randNum(min, max, 1);
const coinFlip = () => randNum(0, 1, 1) === 1;
const cycleNum = (num: number, [min = 0, max = Infinity] = []): number => gsap.utils.wrap(min, max, num);
const clampNum = (num: number, [min = 0, max = Infinity] = []): number => gsap.utils.clamp(min, max, num);
const cycleAngle = (angle: number, range: [number, number] = [0, 360]) => cycleNum(angle, range);
const roundNum = (num: number, sigDigits = 0) => (sigDigits === 0 ? pInt(num) : pFloat(num, sigDigits));
const sum = (...nums: Array<number | number[]>) => Object.values(nums.flat()).reduce((num, tot) => tot + num, 0);
const average = (...nums: Array<number | number[]>) => sum(...nums) / nums.flat().length;
// #region ■■■■■■■[Positioning]■■■■ Relationships On 2D Cartesian Plane ■■■■■■■ ~
const getDistance = ({x: x1, y: y1}: Point, {x: x2, y: y2}: Point) => (((x1 - x2) ** 2) + ((y1 - y2) ** 2)) ** 0.5;
const getAngle = (
  {x: x1, y: y1}: Point,
  {x: x2, y: y2}: Point,
  {x: xO, y: yO}: Point = {x: 0, y: 0},
  range: [number, number] = [0, 360]
) => {
  x1 -= xO; y1 -= yO; x2 -= xO; y2 -= yO;
  return cycleAngle(radToDeg(Math.atan2(y2 - y1, x2 - x1)), range);
};
const getAngleDelta = (
  angleStart: number,
  angleEnd: number,
  range: [number, number] = [0, 360]
) => cycleAngle(angleEnd - angleStart, range);
/**
 * Function to calculate the smallest rectangle that can contain all the given shapes.
 * @param arrayOfShapes - Array of objects, each describing a shape's position and size.
 * @returns An object describing the position (center) and size of the smallest rectangle that can contain all the shapes.
 */
const getBoundingRectangle = (
  arrayOfShapes: Array<{x: number, y: number, radius?: number, size?: number, width?: number, height?: number}>
): {x: number, y: number, width: number, height: number} => {
  // Initialize the minimum and maximum x and y coordinates.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Iterate over the array of shapes.
  for (const shape of arrayOfShapes) {
    let {size, width, height, radius, x, y} = shape;
    // Calculate the minimum and maximum x and y coordinates for the current shape.
    let shapeMinX; let shapeMinY; let shapeMaxX; let shapeMaxY;

    if (radius !== undefined) {
      // The shape is a circle.
      shapeMinX = x - radius;
      shapeMinY = y - radius;
      shapeMaxX = x + radius;
      shapeMaxY = y + radius;

    } else if (size !== undefined) {
      // The shape is a square.
      shapeMinX = (x - size) / 2;
      shapeMinY = (y - size) / 2;
      shapeMaxX = (x + size) / 2;
      shapeMaxY = (y + size) / 2;

    } else if (width !== undefined || height !== undefined) {

      // The shape is a rectangle (or possibly a square).
      width = width ?? height!;
      height = height ?? width;
      shapeMinX = (x - width) / 2;
      shapeMinY = (y - height) / 2;
      shapeMaxX = (x + width) / 2;
      shapeMaxY = (y + height) / 2;
    } else {
      throw new Error(`[getBoundingRectangle] Error: shape must be a circle, square, or rectangle, not ${String(JSON.stringify(shape))}`);
    }

    // Update the overall minimum and maximum x and y coordinates.
    minX = Math.min(minX, shapeMinX);
    minY = Math.min(minY, shapeMinY);
    maxX = Math.max(maxX, shapeMaxX);
    maxY = Math.max(maxY, shapeMaxY);
  }

  // Calculate the width and height of the smallest rectangle.
  const sWidth = maxX - minX;
  const sHeight = maxY - minY;

  // Calculate the center of the rectangle.
  const sX = (minX + sWidth) / 2;
  const sY = (minY + sHeight) / 2;

  // Return the position (center) and size of the smallest rectangle.
  return {x: sX, y: sY, width: sWidth, height: sHeight};
};
// #endregion ■■■■[Positioning]■■■■
// #endregion ▄▄▄▄▄ NUMBERS ▄▄▄▄▄

// #region ████████ ARRAYS: Array Manipulation ████████ ~
const randElem = <Type>(array: Type[]): Type => gsap.utils.random(array);
const randIndex = (array: unknown[]): number => randInt(0, array.length - 1);


/**
 * Reusable function. Feed in an array and an ease and it'll return
 * a function that pulls a random element from that array, weighted
 * according to the ease you provide.
 * @param collection - The array to sample from
 * @param ease - The ease function to use for weighting
 * @returns A function that pulls a random element from the array, weighted according to the ease
 */
function randElemWeighted(collection: unknown[], ease: gsap.EaseString | gsap.EaseFunction) {
  return gsap.utils.pipe(
      Math.random,            //random number between 0 and 1
      gsap.parseEase(ease),   //apply the ease
      gsap.utils.mapRange(0, 1, -0.5, collection.length-0.5), //map to the index range of the array, stretched by 0.5 each direction because we'll round and want to keep distribution (otherwise linear distribution would be center-weighted slightly)
      gsap.utils.snap(1),     //snap to the closest integer
      i => collection[i]      //return that element from the array
  );
}
const makeIntRange = (min: number, max: number) => {
  const intRange: number[] = [];
  for (let i = min; i <= max; i++) {
    intRange.push(i);
  }
  return intRange;
};
const makeCycler = (array: unknown[], index = 0): Generator => {
  // Given an array and a starting index, returns a generator function that can be used
  // to iterate over the array indefinitely, wrapping out-of-bounds index values
  const wrapper = gsap.utils.wrap(array);
  index--;
  return (function*() {
    for (let i = index + 1; ; i++) {
      yield wrapper(i);
    }
  })();
};

/**
 * Returns the last element of an array, or the last value of an object literal.
 *
 * @param array - An array or object literal
 * @returns The last element, or undefined if empty.
 */
function getLast<Type>(array: Index<Type>): Type {
  array = Object.values(array);
  if (array.length === 0) { throw new Error("Cannot get last element of an empty array."); }
  return array[array.length - 1]!;
}
// Const getLast = <Type>(array: Type[]): typeof array extends [] ? undefined : Type => ;
const unique = <Type>(array: Type[]): Type[] => {
  const returnArray: Type[] = [];
  array.forEach((item) => {if (!returnArray.includes(item)) {returnArray.push(item);} });
  return returnArray;
};
const group = <Type extends Record<string, unknown>>(
  array: Type[],
  key: KeyOf<Type>
): Partial<Record<string & ValOf<Type>, Type[]>> => {
  const returnObj: Partial<Record<string & ValOf<Type>, Type[]>> = {};
  array.forEach((item) => {
    const returnKey = item[key] as string & ValOf<Type>;
    let returnVal = returnObj[returnKey];
    if (!returnVal) {
      returnVal = [];
      returnObj[returnKey] = returnVal;
    }
    returnVal.push(item);
  });
  return returnObj;
};
const sample = <Type>(
  array: Type[],
  numElems = 1,
  isUniqueOnly = true,
  uniqueTestFunc: (e: Type, a: Type[]) => boolean = (e, a) => !a.includes(e)
): Type[] => {
  const elems: Type[] = [];
  let overloadCounter = 0;
  while (elems.length < numElems && overloadCounter < 1_000_000) {
    const randomElem = randElem(array);
    if (isUniqueOnly && uniqueTestFunc(randomElem, elems)) {
      elems.push(randomElem);
    }
    overloadCounter++;
  }
  return elems;
};
const removeFirst = (array: unknown[], element: unknown) => array.splice(array.findIndex((v) => v === element));


/**
 * This function removes and returns the first element in an array that equals the provided value
 * or satisfies the provided testing function.
 * If no elements satisfy the testing function, the function will return undefined.
 *
 * @param array - The array to be searched
 * @param checkFunc - The testing function or value to be searched for
 * @returns The first element in the array that passes the test.
 *          If no elements pass the test, return undefined.
 */
function pullElement<T>(array: T[], checkFunc: T|((_v: T, _i?: number, _a?: T[]) => boolean)): T | undefined {
  // Define the test function
  let testFunction: (_v: T, _i?: number, _a?: T[]) => boolean;

  // If checkFunc is not a function, create a function that checks for equality with checkFunc
  if (typeof checkFunc !== "function") {
    testFunction = (_v: T) => _v === checkFunc;
  } else {
    testFunction = checkFunc as ((_v: T, _i?: number, _a?: T[]) => boolean);
  }

  // Find the index of the first element that passes the test
  const index = array.findIndex((v, i, a) => testFunction(v, i, a));

  // If no element passes the test, return undefined
  if (index === -1) {return undefined;}

  // Remove the element from the array and return it
  return array.splice(index, 1).pop();
}

function pullElements<T>(array: T[], checkFunc: T|((_v: T, _i?: number, _a?: T[]) => boolean)): T[] {
  const elems: T[] = [];
  let elem: Maybe<T> = pullElement(array, checkFunc);
  while (isDefined(elem)) {
    elems.push(elem);
    elem = pullElement(array, checkFunc);
  }
  return elems.filter((e): e is T => isDefined(e));
}

const pullIndex = <T>(array: T[], index: number) => pullElement<T>(array, (_, i) => i === index);
const subGroup = (array: unknown[], groupSize: number) => {
  const subArrays = [];
  while (array.length > groupSize) {
    const subArray = [];
    while (subArray.length < groupSize) {
      subArray.push(array.shift());
    }
    subArrays.push(subArray);
  }
  subArrays.push(array);
  return subArrays;
};
const shuffle = <T>(array: T[]): T[] => {
  let currentIndex = array.length; let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex]!, array[currentIndex]!];
  }

  return array;
};
const toArray = gsap.utils.toArray;
// #endregion ▄▄▄▄▄ ARRAYS ▄▄▄▄▄

// #region ████████ OBJECTS: Manipulation of Simple Key/Val Objects ████████ ~

const checkVal = ({k, v}: {k?: unknown, v?: unknown}, checkTest: checkTest) => {
  if (isFunc(checkTest)) {
    if (isDefined(v)) {return checkTest(v, k);}
    return checkTest(k);
  }
  return (new RegExp(String(checkTest))).test(String(v));
};
/**
 * Given an array or list and a search function, will remove the first matching element and return it.
 * @param obj - The array or list to be searched.
 * @param checkTest - The search function.
 * @returns - The removed element (undefined if none was found)
 */
const remove = (obj: Index, checkTest: testFunc | number | string) => {
  if (isArray(obj)) {
    const index = obj.findIndex((v) => checkVal({v}, checkTest));
    if (index >= 0) {
      return obj.splice(index, 1)[0];
    }
    return undefined;
  } else if (isList(obj)) {
    const [remKey, remVal] = Object.entries(obj)
      .find(([k, v]) => checkVal({k, v}, checkTest)) ?? [];
    if (remKey) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete obj[remKey];
    }
    return remVal;
  }
  return undefined;
};

/**
 * Replaces the first matching element in an array or list with the provided value.
 *
 * @param obj - The array or list to be searched.
 * @param checkTest - The search function or value to match.
 * @param repVal - The value to replace the matched element with.
 * @returns - True if the replace action succeeded, false otherwise.
 */
const replace = (obj: Index, checkTest: checkTest, repVal: unknown): boolean => {
  let repKey: string | number | undefined;

  // If the object is a list
  if (isList(obj)) {
    // Find the key of the first matching element
    [repKey] = Object.entries(obj).find(([k, v]) => checkVal({ k, v }, checkTest)) ?? [undefined];
    if (repKey === undefined) {
      return false;
    }
    obj[repKey] = repVal;
    return true;
  }
  // If the object is an array
  if (isArray(obj)) {
    // Find the index of the first matching element
    repKey = obj.findIndex((v) => checkVal({ v }, checkTest));
    if (repKey === -1) {
      return false;
    }
    obj[repKey] = repVal;
    return true;
  }
  return false;
};

/**
 * Cleans an object or value by removing specified values recursively.
 *
 * @param data - The object or value to be cleaned.
 * @param remVals - An array of values to be removed during the cleaning process.
 * @returns The cleaned version of the input object or value.
 *          If marked for removal, returns "KILL".
 */
const objClean = <T>(data: T, remVals: UncleanValues[] = [undefined, null, "", {}, []]): T | Partial<T> | "KILL" => {
  const remStrings = remVals.map((rVal) => JSON.stringify(rVal));
  if (remStrings.includes(JSON.stringify(data)) || remVals.includes(data as ValOf<typeof remVals>)) {return "KILL";}
  if (Array.isArray(data)) {
    const newData = data.map((elem: unknown) => objClean(elem, remVals))
      .filter((elem) => elem !== "KILL") as T;
    return Array.isArray(newData) && newData.length
      ? newData
      : "KILL";
  }
  if (data && typeof data === "object" && JSON.stringify(data).startsWith("{")) {
    const newData = Object.entries(data)
      .map(([key, val]) => [key, objClean<unknown>(val, remVals)] as const)
      .filter(([, val]) => val !== "KILL");
    return newData.length
      ? Object.fromEntries<unknown>(newData) as T | Partial<T>
      : "KILL";
  }
  return data;
};

/**
 * Partitions an array into two arrays based on a predicate function.
 *
 * @param arr - The array to be partitioned
 * @param predicate - The function used to test each element
 * @returns An array containing two arrays:
 *          the first with elements that pass the predicate,
 *          the second with elements that fail the predicate
 */
function partition<T>(arr: T[], predicate: (value: T, index: number) => boolean = () => true): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];

  arr.forEach((value, index) => {
    (predicate(value, index) ? pass : fail).push(value);
  });

  return [pass, fail];
}

/**
 * Zips two arrays into an object.
 *
 * @param keys - The array of keys.
 * @param values - The array of values.
 * @returns The resulting object.
 * @throws Throws an error if the arrays are not of equal length, if the keys are not unique, or if the keys are not of a type that can be used as object keys.
 */
const zip = <T extends Key, U>(keys: T[], values: U[]): Record<T, U> => {
  // Check that the arrays are of equal length
  if (keys.length !== values.length) {
    throw new Error("The arrays must be of equal length.");
  }

  // Check that the keys are unique
  if (new Set(keys).size !== keys.length) {
    throw new Error("The keys must be unique.");
  }

  // Zip the arrays into an object
  const result = {} as Record<T, U>;
  keys.forEach((key, i) => {
    result[key] = values[i]!;
  });

  return result;
};

/**
 * An object-equivalent Array.map() function that transforms values of an object or array.
 * For objects, it applies the mapping function to each value while preserving the keys.
 * For arrays, it behaves like the standard Array.map() method.
 *
 * @param obj - The object or array to be mapped
 * @param mapFunc - The function to apply to each value. It receives the value and key/index as arguments.
 * @returns A new object or array of the same type as the input, with transformed values
 */
function objMap<T extends Record<ObjectKey, ObjectValue> | unknown[]>(
  obj: T,
  mapFunc: MapFunction
): T {
  if (Array.isArray(obj)) {
    return obj.map((v, i) => mapFunc(v, i)) as T;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, mapFunc(v, k)])
  ) as T;
}


// function oldObjMap<T extends Record<PropertyKey, unknown>|unknown[]>(
//   obj: Index,
//   valFunc: mapFunc<valFunc>
// ): T extends Record<PropertyKey, unknown> ? Record<PropertyKey, unknown> : unknown[]
// function oldObjMap<T extends Record<PropertyKey, unknown>|unknown[]>(
//   obj: Index,
//   valFunc: false,
//   keyFunc: mapFunc<keyFunc>
// ): T extends Record<PropertyKey, unknown> ? Record<PropertyKey, unknown> : unknown[]
// function oldObjMap<T extends Record<PropertyKey, unknown>|unknown[]>(
//   obj: Index,
//   keyFunc: mapFunc<keyFunc>,
//   valFunc: mapFunc<valFunc>
// ): T extends Record<PropertyKey, unknown> ? Record<PropertyKey, unknown> : unknown[]
// function oldObjMap<T extends Record<PropertyKey, unknown> | unknown[]>(
//   obj: T,
//   keyFunc: mapFunc<keyFunc> | mapFunc<valFunc> | false,
//   valFunc?: mapFunc<valFunc> | mapFunc<keyFunc>
// ): T {
//   let valFuncTyped = valFunc as mapFunc<valFunc> | undefined;
//   let keyFuncTyped = keyFunc as mapFunc<keyFunc> | false;

//   if (!valFuncTyped) {
//     valFuncTyped = keyFunc as mapFunc<valFunc>;
//     keyFuncTyped = false;
//   }
//   if (!keyFuncTyped) {
//     keyFuncTyped = ((k: unknown) => k) as mapFunc<keyFunc>;
//   }

//   if (Array.isArray(obj)) {
//     return obj.map(valFuncTyped) as T;
//   }

//   return Object.fromEntries(Object.entries(obj).map(([key, val]) => {
//     assertNonNullType<mapFunc<valFunc>>(valFuncTyped, "function");
//     assertNonNullType<mapFunc<keyFunc>>(keyFuncTyped, "function");
//     return [keyFuncTyped(key, val), valFuncTyped(val, key)];
//   })) as T;
// }
/**
 * This function returns the 'size' of any reference passed into it, following these rules:
 * - object: the number of enumerable keys
 * - array: the number of elements
 * - false/null/undefined: 0
 * - anything else: 1
 */
const objSize = (obj: unknown) => {
  if (isSimpleObj(obj)) { return Object.keys(obj).length; }
  if (isArray(obj)) { return obj.length; }
  if (obj === false || obj === null || obj === undefined) { return 0; }
  return 1;
};


// /**
//  * This function is an object-equivalent of Array.findIndex() function.
//  * It accepts check functions for both keys and/or values.
//  * If only one function is provided, it's assumed to be searching via values and will receive (v, k) args.
//  *
//  * @param {Type} obj The object to be searched.
//  * @param {testFunc<keyFunc> | testFunc<valFunc> | false} keyFunc The testing function for keys.
//  * @param {testFunc<valFunc>} valFunc The testing function for values.
//  * @returns {KeyOf<Type> | false} The key of the first entry that passes the test.
//  *                                If no entries pass the test, return false.
//  */
// function objFindKey<Type extends Index>(
//   obj: Type,
//   keyFunc: testFunc<keyFunc> | testFunc<valFunc> | false,
//   valFunc?: testFunc<valFunc>
// ): KeyOf<Type> | false {

//   const [kFunc, vFunc] = getKeyValFunc(keyFunc, valFunc);

//   // If obj is an array, find the index of the first element that passes the test
//   if (isArray(obj)) {return obj.findIndex(vFunc);}

//   // Find the first entry that passes the test
//   const validEntry = Object.entries(obj)
//     .find(([k, v]) => kFunc(k, v) && vFunc(v, k));
//   // If an entry passes the test, return its key
//   if (validEntry) {
//     return validEntry[0] as KeyOf<Type>;
//   }
//   // If no entries pass the test, return false
//   return false;
// }

// /**
//  * An object-equivalent Array.filter() function, which accepts filter functions for both keys and/or values.
//  * If only one function is provided, it's assumed to be mapping the values and will receive (v, k) args.
//  *
//  * @param {Type} obj The object to be searched.
//  * @param {testFunc<keyFunc> | testFunc<valFunc> | false} keyFunc The testing function for keys.
//  * @param {testFunc<valFunc>} [valFunc] The testing function for values.
//  * @returns {Type} The filtered object.
//  */
// const objFilter = <Type extends Index>(
//   obj: Type,
//   keyFunc: testFunc<keyFunc> | testFunc<valFunc> | false,
//   valFunc?: testFunc<valFunc>,
//   isMutating = false
// ): Type => {

//   const [kFunc, vFunc] = getKeyValFunc(keyFunc, valFunc);

//   if (isArray(obj)) {
//     const keptValues = obj.filter(vFunc);
//     if (isMutating) {
//       obj.splice(0, obj.length, ...keptValues);
//       return obj;
//     }
//     return keptValues as Type;
//   }

//   if (isMutating) {
//     const entriesToRemove = Object.entries(obj)
//       .filter(([key, val]: [string, unknown]) => !(kFunc(key, val) && vFunc(val, key)));
//     for (const [key] of entriesToRemove) {
//       // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
//       delete obj[key as KeyOf<Type>];
//     }
//     return obj;
//   }
//   return Object.fromEntries(
//     Object.entries(obj)
//       .filter(([key, val]: [string, unknown]) => kFunc(key, val) && vFunc(val, key))
//   ) as Type;
// };
// const objForEach = (obj: Index, func: valFunc): void => {
//   // An object-equivalent Array.forEach() function, which accepts one function(val, key) to perform for each member.
//   if (isArray(obj)) {
//     obj.forEach(func);
//   } else {
//     Object.entries(obj).forEach(([key, val]) => func(val, key));
//   }
// };

/**
 * Finds the key of the first entry in an object or index of an array element that passes the test function.
 *
 * @param obj - The object or array to search
 * @param testFunc - The function used to test each entry or element
 * @returns The key of the first passing entry, the index of the first passing element, or false if none pass
 *
 * This function uses a generic type parameter `T` to specify the expected type.
 */
function objFindKey<T extends Record<ObjectKey, ObjectValue> | unknown[]>(
  obj: T,
  testFunc: TestFunction
): keyof T | false {
  if (Array.isArray(obj)) {
    const index = obj.findIndex((v, i) => testFunc(v, i));
    return index !== -1 ? index as keyof T : false;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (testFunc(value, key)) {
      return key as keyof T;
    }
  }

  return false;
}

/**
 * Filters an object or array based on a test function.
 *
 * @param obj - The object or array to filter
 * @param testFunc - The function used to test each entry or element
 * @param isMutating - If true, modifies the original object or array instead of creating a new one
 * @returns The filtered object or array
 *
 * This function uses a generic type parameter `T` to specify the expected type.
 */
function objFilter<T extends Record<ObjectKey, ObjectValue> | unknown[]>(
  obj: T,
  testFunc: TestFunction,
  isMutating = false
): T {
  if (Array.isArray(obj)) {
    const filteredArray = obj.filter((v, i) => testFunc(v, i));
    if (isMutating) {
      obj.length = 0;
      obj.push(...filteredArray);
      return obj;
    }
    return filteredArray as T;
  }

  if (isMutating) {
    for (const [key, value] of Object.entries(obj)) {
      if (!testFunc(value, key)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete obj[key as keyof T];
      }
    }
    return obj;
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => testFunc(value, key))
  ) as T;
}

/**
 * Executes a provided function once for each array element or object entry.
 *
 * @param obj - The object or array to iterate over
 * @param func - The function to execute for each entry or element
 *
 * This function uses a generic type parameter `T` to specify the expected type.
 */
function objForEach(
  obj: Record<ObjectKey, ObjectValue> | unknown[],
  func: (value: ObjectValue, key: ObjectKey) => void
): void {
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => { func(value, index); });
  } else {
    Object.entries(obj).forEach(([key, value]) => { func(value, key); });
  }
}

// Prunes an object of given set of values, [undefined, null] default
const objCompact = <Type extends (Index)>(
  obj: Type,
  removeWhiteList: unknown[] = [undefined, null],
  isMutating = false
): Type => objFilter(obj, (val: unknown) => !removeWhiteList.includes(val), isMutating);

const objClone = <T>(obj: T, isStrictlySafe = false): T => {
  const cloneArray = <aT extends unknown[]>(arr: aT): aT => [...arr] as aT;
  const cloneObject = <oT>(o: oT): oT => ({...o});
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch(err) {
    if (isStrictlySafe) {throw err;}
    if (Array.isArray(obj)) {return cloneArray(obj as T extends unknown[] ? T : never);}
    if (typeof obj === "object") {return cloneObject(obj);}
  }
  return obj;
};
/**
 * Returns a deep merge of source into target. Does not mutate target unless `isMutatingOk` is true.
 *
 * @param target - The target object to be merged.
 * @param source - The source object to be merged.
 * @param options - An object containing various options for the merge operation:
 *   - `isMutatingOk`: If true, allows mutation of the target object.
 *   - `isStrictlySafe`: If true, ensures strict safety during the merge.
 *   - `isConcatenatingArrays`: If true, concatenates arrays instead of replacing them.
 *   - `isReplacingArrays`: If true, replaces arrays instead of merging them.
 * @returns The merged object.
 */
function objMerge<Tx, Ty>(
  target: Tx,
  source: Ty,
  {
    isMutatingOk = false,
    isStrictlySafe = false,
    isConcatenatingArrays = true,
    isReplacingArrays = false
  } = {}
): Tx & Ty {
  // Clone the target if mutation is not allowed
  target = isMutatingOk ? target : objClone(target, isStrictlySafe);

  // If source is an instance of or target is undefined, return source
  if (source && typeof source === "object" && "id" in source && isDocID(source.id)) {
    return source as unknown as Tx & Ty;
  }

  if (isUndefined(target)) {
    return source as unknown as Tx & Ty;
  }

  // If source is undefined, return target
  if (isUndefined(source)) {
    return target as Tx & Ty;
  }

  // If source is not an index, return target
  if (!isIndex(source)) {
    return target as Tx & Ty;
  }

  // Iterate over each entry in the source object
  for (const [key, val] of Object.entries(source)) {
    const targetVal = target[key as KeyOf<typeof target>];

    // If replacing arrays is enabled and both target and source values are
    // arrays, replace target value with source value
    if (isReplacingArrays && isArray(targetVal) && isArray(val)) {
      target[key as KeyOf<typeof target>] = val as Tx[KeyOf<Tx>];
    } else if (isConcatenatingArrays && isArray(targetVal) && isArray(val)) {

      // If concatenating arrays is enabled and both target and source values
      // are arrays, concatenate source value to target value
      (target[key as KeyOf<typeof target>] as unknown[]).push(...val);
    } else if (val !== null && typeof val === "object") {
      // If source value is an object and not null, merge it into target value
      if (isUndefined(targetVal) && !(val instanceof Application)) {
        const valPrototype = Object.getPrototypeOf(val) as Constructor;
        target[key as KeyOf<typeof target>] = new valPrototype() as Tx[KeyOf<Tx>];
      }
      target[key as KeyOf<typeof target>] = objMerge(
        target[key as KeyOf<typeof target>],
        val,
        {isMutatingOk: true, isStrictlySafe}
      );
    } else {
    // For all other cases, assign source value to target
      target[key as KeyOf<typeof target>] = val as Tx[KeyOf<Tx>] & Ty[KeyOf<Ty>];
    }
  }

  // Return the merged target
  return target as Tx & Ty;
}
/**
 * Deep-compares two objects and returns an object containing only the keys and values
 * in the second object that differ from the first.
 * If the second object is missing a key or value contained in the first, it sets the
 * value in the returned object to null, and prefixes the key with "-=".
 * @param obj1 - The first object to be compared.
 * @param obj2 - The second object to be compared.
 * @returns - An object containing the differences between the two input objects.
 */
function objDiff(obj1: Record<string, unknown>, obj2: Record<string, unknown>): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const bothObj1AndObj2Keys = Object.keys(obj2).filter((key) => Object.hasOwn(obj2, key) && Object.hasOwn(obj1, key));
  const onlyObj2Keys = Object.keys(obj2).filter((key) => Object.hasOwn(obj2, key) && !Object.hasOwn(obj1, key));

  for (const key of bothObj1AndObj2Keys) {
    // If both values are non-array objects, recursively compare them
    if (typeof obj1[key] === "object" && typeof obj2[key] === "object" && !Array.isArray(obj1[key]) && !Array.isArray(obj2[key])) {
      const nestedDiff = objDiff(obj1[key] as Record<string, unknown>, obj2[key] as Record<string, unknown>);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      const array1 = obj1[key] as unknown[];
      const array2 = obj2[key] as unknown[];
      if (array1.toString() !== array2.toString()) {
        // If both values are arrays and they are not equal, add the second array to the diff
        diff[key] = obj2[key];
      }
    } else if (obj1[key] !== obj2[key]) {
      // If the values are not equal, add the second value to the diff
      diff[key] = obj2[key];
    }
  }

  for (const key of onlyObj2Keys) {
    // If the second object has a key that the first does not, add it to the diff with a "-=" prefix
    diff[`-=${String(key)}`] = obj2[key];
  }
  return diff;
}

/**
 * Expands a flattened object with dot notation keys into a nested object structure.
 * Also converts object literals to arrays where appropriate based on numeric keys.
 *
 * @param obj - The flattened object to expand
 * @returns The expanded nested object/array structure
 * @example
 * objExpand(\{"0.name": "foo", "0.value": 1, "1.name": "bar", "1.value": 2\})
 * // Returns: [\{name: "foo", value: 1\}, \{name: "bar", value: 2\}]
 */
const objExpand = <T>(obj: List<T>): List<T> => {
  const expObj = {};
  for (const [key, val] of Object.entries(obj)) {
    if (isList(val)) {
      const expandedVal = objExpand(val) as T;
      foundry.utils.setProperty(expObj, key, expandedVal);
    } else {
      foundry.utils.setProperty(expObj, key, val);
    }
  }
  // Iterate through expanded Object, converting object literals to arrays where it makes sense
  /**
   * Recursively converts object literals to arrays when all keys are sequential numbers.
   * Processes nested objects/arrays to ensure deep conversion.
   *
   * @param o - The object/value to process
   * @returns The processed object/array/value
   */
  function arrayify<X>(o: Index<X> | X): Index<X> | X {
    if (isList(o)) {
      if (/^\d+$/.test(Object.keys(o).join(""))) {
        return Object.values(o).map((val) => arrayify(val)) as X[];
      }
      return objMap(o, (v: unknown): unknown => arrayify(v)) as List<X>;
    }
    if (isArray(o)) {
      return o.map((val) => arrayify(val as Index<X>)) as X[];
    }
    return o;
  }

  return arrayify(expObj) as List<T>;
};
const objFlatten = <ST>(obj: Index<ST>): Record<string, ST> => {
  const flatObj: Record<string, ST> = {};
  for (const [key, val] of Object.entries(obj)) {
    if ((isArray(val) || isList(val)) && hasItems(val)) {
      for (const [subKey, subVal] of Object.entries(objFlatten(val)) as Array<[string, ST]>) {
        flatObj[`${String(key)}.${String(subKey)}`] = subVal;
      }
    } else {
      flatObj[key] = val;
    }
  }
  return flatObj;
};
type DeepFlattenOptions = {
  isKeepingLastObject?: boolean;
};

/**
 * Deeply flattens an object literal into an array of [key, value] tuples
 * @param obj - The object to flatten
 * @param options - Configuration options
 * @param options.isKeepingLastObject - If true, keeps the last level of objects intact. If false, breaks them into their component key/value pairs
 * @returns Array of [key, value] tuples
 */
type DeepKeys<T> = T extends Record<Key, unknown>
  ? { [K in keyof T]: K | DeepKeys<T[K]> }[keyof T]
  : never;

type DeepLeafValue<T> = T extends Record<Key, unknown>
  ? { [K in keyof T]: DeepLeafValue<T[K]> }[keyof T]
  : T;

type LastObjectKeys<T> = T extends Record<Key, unknown>
  ? { [K in keyof T]: T[K] extends Record<Key, unknown>
      ? LastObjectKeys<T[K]>
      : K
    }[keyof T]
  : never;

type LastObjects<T> = T extends Record<Key, unknown>
  ? T[keyof T] extends Record<Key, unknown>
    ? { [K in keyof T]: LastObjects<T[K]> }[keyof T]
    : T
  : T;

/**
 * Deeply flattens an object literal into an array of [key, value] tuples, breaking down to primitive values
 * @param obj - The object to flatten
 * @param options - Configuration options with isKeepingLastObject: false
 */
function objDeepFlatten<T extends Record<Key, unknown>>(
  obj: T,
  options: { isKeepingLastObject: false }
): [DeepKeys<T>, DeepLeafValue<T>][];

/**
 * Deeply flattens an object literal into an array of [key, value] tuples, stopping at object literals that don't contain nested objects
 * @param obj - The object to flatten
 * @param options - Configuration options with isKeepingLastObject: true
 */
function objDeepFlatten<T extends Record<Key, unknown>>(
  obj: T,
  options: { isKeepingLastObject: true }|{ isKeepingLastObject: undefined }|undefined
): [LastObjectKeys<T>, LastObjects<T>][];

/**
 * Implementation signature
 */
function objDeepFlatten<T extends Record<Key, unknown>>(
  obj: T,
  options: { isKeepingLastObject: boolean|undefined } = { isKeepingLastObject: true }
): [Key, unknown][] {
  const { isKeepingLastObject = true } = options;

  function isNestedObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object") return false;
    // Don't consider arrays or null as nested objects
    if (Array.isArray(value) || value === null) return false;
    // If keeping last objects, check if this object contains other objects
    if (isKeepingLastObject) {
      return Object.values(value).some(v => v && typeof v === "object" && !Array.isArray(v) && v !== null);
    }
    // If not keeping last objects, all objects should be flattened
    return true;
  }

  return Object.entries(obj).reduce<[Key, unknown][]>((acc, [key, value]) => {
    if (isNestedObject(value)) {
      // Recursively flatten nested objects
      return [
        ...acc,
        ...(isKeepingLastObject
            ? objDeepFlatten(value, {...options, isKeepingLastObject: true})
            : objDeepFlatten(value, {...options, isKeepingLastObject: false}))
      ];
    }
    return [...acc, [key, value]];
  }, []);
}

/**
 * This function nullifies all properties of an object or elements of an array.
 * If the input is not an object or an array, it returns the input as is.
 * @param obj - The object or array to be nullified.
 * @returns - The nullified object or array, or the input as is.
 */
function objNullify<T extends List>(obj: T & Record<KeyOf<T>, null>): Record<KeyOf<T>, null>
function objNullify(obj: unknown[] & null[]): null[]
function objNullify<T>(obj: T): Record<KeyOf<T>, null> | null[] | T {
  // Check if the input is an object or an array
  if (!isIndex(obj)) {return obj;}

  // If the input is an array, nullify all its elements
  if (Array.isArray(obj)) {
    obj.forEach((_, i) => {
      obj[i] = null as ValOf<T>;
    });
    return obj as null[];
  }

  // If the input is an object, nullify all its properties
  Object.keys(obj).forEach((objKey) => {
    (obj as Record<KeyOf<T>, null>)[objKey as KeyOf<T>] = null;
  });

  return obj;
}

/**
 * This function freezes the properties of an object based on a provided schema or keys.
 * If a property is missing, it throws an error.
 * @param data - The object whose properties are to be frozen.
 * @param keysOrSchema - The keys or schema to freeze the properties.
 * @returns The object with frozen properties.
 * @throws Throws an error if a property is missing.
 */
function objFreezeProps<T>(data: Partial<T>, ...keysOrSchema: Array<keyof T> | [T]): T {
  const firstArg = keysOrSchema[0];

  // If the first argument is an object and not an array, treat it as a schema
  if (firstArg instanceof Object && !Array.isArray(firstArg)) {
    const schema = firstArg as T;
    for (const key in schema) {
      if (data[key as keyof T] === undefined) {
        throw new Error(`Missing value for ${String(key)}`);
      }
    }
  } else {
    // If the first argument is not an object or is an array, treat it as an array of keys
    for (const key of keysOrSchema as Array<keyof T>) {
      if (data[key] === undefined) {
        throw new Error(`Missing value for ${String(key)}`);
      }
    }
  }

  // Return the data as type T
  return data as T;
}
// #endregion ▄▄▄▄▄ OBJECTS ▄▄▄▄▄

// #region ████████ FUNCTIONS: Function Wrapping, Queuing, Manipulation ████████ ~
const getDynamicFunc = (funcName: string, func: (...args: unknown[]) => unknown, context?: object) => {
  if (typeof func === "function") {
    const dFunc = {[funcName](...args: unknown[]) {return func(...args);}}[funcName];
    if (dFunc) {
      return context ? dFunc.bind(context) : dFunc;
    }
  }
  return false;
};

const withLog = (fn: (...args: unknown[]) => unknown) => {
  return (...args: unknown[]) => {
    console.log(`calling ${String(fn.name)}`);
    return fn(...args);
  };
};
// #endregion ▄▄▄▄▄ FUNCTIONS ▄▄▄▄▄

// #region ████████ HTML: Parsing HTML Code, Manipulating DOM Objects ████████ ~

// const changeContainer = (elem: HTMLElement, container: HTMLElement, isCloning = false): HTMLElement => {
//   // Get the element's current container, which defines its current coordinate space.
//   const curContainer = $(elem).parent()[0];
//   if (!curContainer) {
//     throw new Error("Element's current container not found");
//   }
//   // Get the element's current position in its current coordinate space.
//   const curPosition: gsap.Point2D = {
//     x: gsap.getProperty(elem, "x") as number,
//     y: gsap.getProperty(elem, "y") as number
//   };
//   // Convert the element's position in its current space, to the equivalent position in the target space.
//   const relPos = MotionPathPlugin.convertCoordinates(
//     curContainer,
//     container,
//     curPosition
//   );

//   // Clone the element, if indicated
//   if (isCloning) {
//     elem = $(elem).clone()[0]!;
//   }
//   // Append the element to the new container, and set its new position
//   $(elem).appendTo($(container));
//   gsap.set(elem, relPos);
//   return elem;
// };

/**
 * Adjusts the aspect ratio of a text container to match a target ratio by modifying its font size and line height.
 * This function recursively adjusts the font size and line height until the container's aspect ratio or maximum dimensions are met.
 *
 * @param textContainer - The text container element or jQuery object to adjust
 * @param targetRatio - The target aspect ratio (width / height) to achieve
 * @param maxHeight - Optional maximum height for the text container
 * @param maxWidth - Optional maximum width for the text container
 * @param minFontSize - Optional minimum font size to prevent the text from becoming too small (defaults to 8)
 * @returns void
 */
const adjustTextContainerAspectRatio = (
  textContainer: HTMLElement|JQuery,
  targetRatio: number,
  maxHeight?: number,
  maxWidth?: number,
  minFontSize = 8
): void => {
  // Ensure textContainer is an HTMLElement
  textContainer = $(textContainer)[0]!;

  // If no maxWidth is provided, initialize textContainer's width to maximum possible
  if (!maxWidth) {
    textContainer.style.setProperty("width", "max-content", "important");
  } else {
    textContainer.style.setProperty("width", `${String(maxWidth)}px`, "important");
  }

  /**
   * Recursively adjusts the font size and line height of the text container.
   * This function is called if the current adjustments do not meet the target aspect ratio or maximum dimensions.
   *
   * @returns false if the new font size is below the minimum font size, indicating no further adjustments should be made.
   */
  function recurAdjustment(): boolean {
    // Ensure textContainer is an HTMLElement for each recursive call
    textContainer = $(textContainer)[0]!;
    // Calculate new font size and line height as 80% of their current values
    const newFontSize = parseFloat(style.fontSize) * 0.8;
    const newLineHeight = parseFloat(style.lineHeight) * 0.8;
    // Stop recursion if the new font size is below the minimum
    if (newFontSize < minFontSize) {
      return false;
    }
    // Apply the new font size and line height
    textContainer.style.fontSize = `${String(newFontSize)}px`;
    textContainer.style.lineHeight = `${String(newLineHeight)}px`;
    // Recursively call adjustTextContainerAspectRatio with updated parameters
    adjustTextContainerAspectRatio(textContainer, targetRatio, lineCount ?? maxHeight, maxWidth, minFontSize);
    return true;
  }

  // Get computed styles of the text container
  const style = window.getComputedStyle(textContainer);
  const lineHeight = parseFloat(style.lineHeight);

  // Initialize lineCount as undefined
  let lineCount: number|undefined = undefined;
  // If maxHeight is provided and is an integer less than lineHeight, calculate lineCount
  if (isInt(maxHeight) && maxHeight < lineHeight) {
    lineCount = maxHeight;
  }

  // Get the initial width of the text container
  const initialWidth = parseFloat(style.width);
  // Initialize bestWidth with the initial width
  let bestWidth = initialWidth;
  // Flag to indicate if the maximum line count has been reached
  let isAtMaxLineCount = false;

  // Loop to find the best width that matches the target aspect ratio
  let lines = 1;
  let isContinuing = true;
  while (isContinuing) {
    const expectedHeight = lineHeight * lines;
    const expectedWidth = initialWidth / lines;
    const expectedRatio = expectedWidth / expectedHeight;

    // Break the loop if the expected ratio is less than the target ratio
    if (expectedRatio < targetRatio) {
      isContinuing = false;
    } else if (isInt(lineCount)) {
      // Handle cases where lineCount is defined
      if (lines > lineCount && recurAdjustment()) { return undefined; }
      isContinuing = false;
    } else if (maxHeight && expectedHeight > maxHeight) {
      // Handle cases where maxHeight is exceeded
      if (recurAdjustment()) { return undefined; }
      isContinuing = false;
    } else {
      // Update bestWidth with the expected width
      bestWidth = expectedWidth;
      // Check if the current line count matches the maximum line count
      if (isInt(lineCount) && lines === lineCount) {
        isAtMaxLineCount = true;
        isContinuing = false;
      }
    }
    lines++;
  }

  // If the best width exceeds maxWidth, attempt to adjust font size and line height
  if (!isAtMaxLineCount && maxWidth && bestWidth > maxWidth && recurAdjustment()) { return undefined; }

  // Apply the best width to the text container
  textContainer.style.setProperty("width", `${String(bestWidth)}px`, "important");
};

/**
 * Creates a mutable (editable) version of a DOMRect object.
 * @param rect - The DOMRect to convert.
 * @returns A new object with the properties of the DOMRect.
 */
const getMutableRect = (rect: DOMRect): MutableRect => ({
  x:      rect.x,
  y:      rect.y,
  width:  rect.width,
  height: rect.height,
  top:    rect.top,
  right:  rect.right,
  bottom: rect.bottom,
  left:   rect.left
});

// #region ■■■■■■■[SVG]■■■■ SVG Generation & Manipulation ■■■■■■■ ~
const getRawCirclePath = (r: number, {x: xO, y: yO}: Point = {x: 0, y: 0}): Array<Array<number | string>> => {
  [r, xO, yO] = [r, xO, yO].map((val) => roundNum(val, 2)) as [number, number, number];
  const [b1, b2] = [0.4475 * r, (1 - 0.4475) * r];
  const [xT, yT] = [xO, yO - r];
  return [[
    ...[xT, yT],
    ...[b2, 0, r, b1, r, r],
    ...[0, b2, -b1, r, -r, r],
    ...[-b2, 0, -r, -b1, -r, -r],
    ...[0, -b2, b1, -r, r, -r]
  ]];
};
const drawCirclePath = (radius: number, origin: Point) => {
  const [xT, yT, ...segments] = getRawCirclePath(radius, origin)[0] as Array<number | string>;
  const path: Array<number | string> = [`m ${String(xT)} ${String(yT)}`];
  segments.forEach((coord, i) => {
    if (i % 6 === 0) {path.push("c");}
    path.push(coord);
  });
  path.push("z");
  return path.join(" ");
};
function positionAlongCircle(index: number, maxIndex: number, origin: Point, radius: number): Point {

  // Calculate the angle in radians for this index
  const angle = (index / maxIndex) * 2 * Math.PI;

  // Calculate x and y coordinates
  const x = origin.x + radius * Math.cos(angle);
  const y = origin.y + radius * Math.sin(angle);

  return { x, y };
}
/**
 * Encodes an SVG string for use in CSS background-image
 * @param viewBox - The viewBox attribute value
 * @param pathD - The path d attribute value
 * @returns Encoded SVG data URI string
 */
function encodeSVGforCSS(viewBox: string, pathD: string, options?: {
  fill?: string;
  stroke?: string;
}): string {
  // Create the SVG string with optional fill/stroke
  const fillAttr = options?.fill ? ` fill="${options.fill}"` : "";
  const strokeAttr = options?.stroke ? ` stroke="${options.stroke}"` : "";

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path${fillAttr}${strokeAttr} d="${pathD}"/></svg>`;

  // Encode the SVG - keep double quotes and encode them
  const encoded = svgString
      .replace(/%/g, "%25")   // Encode % first to avoid double-encoding
      .replace(/"/g, "%22")   // Encode " to %22 instead of converting to single quotes
      .replace(/#/g, "%23")   // Encode #
      .replace(/\{/g, "%7B")  // Encode {
      .replace(/\}/g, "%7D")  // Encode }
      .replace(/</g, "%3C")   // Encode <
      .replace(/>/g, "%3E")   // Encode >
      .replace(/\s/g, "%20"); // Encode spaces

    // Return as data URI
    return `data:image/svg+xml,${encoded}`;
}
// #endregion ■■■■[SVG]■■■■

// #region ■■■■■■■[Colors]■■■■ Color Manipulation ■■■■■■■ ~
const getColorVals = (
  red?: HexColor   | ValueOrList<number>,
  green?: number,
  blue?: number,
  alpha?: number
): Maybe<number[]> => {
  if (isUndefined(red)) { return undefined; }
  let [redVal, greenVal, blueVal, alphaVal]: Array<Maybe<number>> = [];
  if (isRGBColor(red)) {
    [redVal, greenVal, blueVal, alphaVal] = red
      .replace(/[^\d.,]/g, "")
      .split(/,/)
      .map((color) => (isUndefined(color) ? undefined : pFloat(color)));
  } else if (isHexColor(red)) {
    if ([3, 4].includes(red.length - 1)) {
      red = parseInt(red.replace(/([^#])/g, "$1$1"), 16);
    }
    [redVal, greenVal, blueVal, alphaVal] = String(red)
      .match(/[^#]{2}/g)
      ?.map((val) => parseInt(val, 16)) ?? [];
  } else if (isIndex(red)) {
    [redVal, greenVal, blueVal, alphaVal] = Object.values(red).map((val) => Number(val));
  } else {
    [redVal, greenVal, blueVal, alphaVal] = [red, green, blue, alpha];
  }

  if ([redVal, greenVal, blueVal].every(isPosInt)) {
    return [redVal, greenVal, blueVal, alphaVal].filter(isPosFloat);
  }
  return undefined;
};
const getRGBString = (red: string | number, green?: number, blue?: number, alpha?: number): RGBColor | undefined => {
  if (isRGBColor(red) || isHexColor(red)) {
    [red, green, blue, alpha] = getColorVals(red) as [number, ...Maybe<number>[]];
  }
  if ([red, green, blue].every((color) => /^[.\d]+$/.test(String(color)))) {
    let colorString = "rgb";
    const colors = [red, green, blue];
    if (/^[.\d]+$/.test(String(alpha))) {
      colors.push(alpha! >= 1 ? pInt(alpha) : pFloat(alpha, 2));
      colorString += "a";
    }
    return `${String(colorString)}(${String(colors.join(", "))})`;
  }
  return undefined;
};
const getHEXString = (red: string | number, green?: number, blue?: number): HexColor | undefined => {

  function componentToHex(c: string | number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? `0${String(hex)}` : hex;
  }
  if (isHexColor(red)) {return red;}
  if (isRGBColor(red)) {
    [red, green, blue] = getColorVals(red) as [number, ...Maybe<number>[]];
  }
  if (
       [red, green, blue].every(isDefined)
    && [red, green, blue].every((color) => isPosInt(color) || isNumString(color))
  ) {
    return `#${String(componentToHex(red))}${String(componentToHex(green ?? 0))}${String(componentToHex(blue ?? 0))}`;
  }
  return undefined;
};
const getContrastingColor = (...colorVals: [HexColor]   | number[]): RGBColor | undefined => {
  const [red, green, blue] = getColorVals(...colorVals) ?? [];
  if ([red, green, blue].every(isNumber)) {
    const YIQ = ((red! * 299) + (green! * 587) + (blue! * 114)) / 1000;
    return (YIQ >= 128) ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 0.8)";
  }
  return undefined;
};
const getRandomColor = () => getRGBString(
  gsap.utils.random(0, 255, 1),
  gsap.utils.random(0, 255, 1),
  gsap.utils.random(0, 255, 1)
)!;
// #endregion ■■■■[Colors]■■■■

// #region ■■■■■■■[DOM]■■■■ DOM Manipulation ■■■■■■■ ~
const getSiblings = (elem: Node) => {
  const siblings: HTMLElement[] = [];
  // If no parent, return no sibling
  if (!elem.parentNode) {return siblings;}

  Array.from(elem.parentNode.children).forEach((sibling) => {
    if (sibling !== elem) {
      siblings.push(sibling as HTMLElement);
    }
  });

  return siblings;
};
// #endregion ■■■■[DOM]■■■■

const escapeHTML = <T = unknown>(str: T): T => (typeof str === "string"
  ? str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[`']/g, "&#039;") as T
  : str);

/**
 * Extracts the computed styles of a given jQuery element.
 * @param element - The jQuery element from which to extract styles.
 * @returns A JSON object containing the computed styles.
 */
function extractComputedStyles(element: JQuery|Element) {
  if (!(element instanceof Element)) {
    element = element[0]!;
  }
  const style = window.getComputedStyle(element);
  const styleObject: List<string> = {};

  // Convert the CSSStyleDeclaration to an array and iterate over it
  const properties = Array.from(style);
  for (const prop of properties) {
    styleObject[prop] = style.getPropertyValue(prop);
  }

  return JSON.stringify(styleObject);
}

/**
* Compares the computed styles of a new element against a previously saved styles object.
* @param savedStyles - The object containing previously saved styles.
* @param newElement - The new jQuery element to compare against.
* @returns A list of differences in computed styles.
*/
function compareComputedStyles(savedStyles: string|List<string>, newElement: Element|JQuery) {
  let savedStylesData: List<string>;
  if (typeof savedStyles === "string") {
    savedStylesData = JSON.parse(savedStyles) as List<string>;
  } else {
    savedStylesData = savedStyles;
  }
  const newStyles = JSON.parse(extractComputedStyles(newElement)) as List<string>;
  const differences: string[] = [];
  const allProps = new Set([...Object.keys(savedStyles), ...Object.keys(newStyles)]);

  // Check for differences
  allProps.forEach((prop) => {
      const oldStyle = savedStylesData[prop];
      const newStyle = newStyles[prop];
      if (oldStyle !== newStyle) {
          differences.push(`Property: ${String(prop)}, Old: ${String(oldStyle)}, New: ${String(newStyle)}`);
      }
  });

  return differences;
}

/**
 * Finds the maximum z-index value among the selected elements.
 * @param elements - The jQuery object containing the elements to check.
 * @returns The maximum z-index value found, or 0 if no z-index is set.
 */
function getMaxZIndex(elements: JQuery): number {
  let maxZIndex = 0;

  elements.each(function() {
    const zIndex = parseInt($(this).css("z-index"), 10);
    if (!isNaN(zIndex) && zIndex > maxZIndex) {
      maxZIndex = zIndex;
    }
  });

  return maxZIndex;
}

// #region ████████ PERFORMANCE: Performance Testing & Metrics ████████
/**
 * Test the performance of a function (synchronous or asynchronous).
 * The function will be called repeatedly for 10 seconds, and the total and average execution times will be logged.
 * @param func - The function to test. Can be synchronous or asynchronous.
 * @param params - The parameters to pass to the function.
 */
const testFuncPerformance = (
  func: (...args: unknown[]) => unknown,
  ...params: unknown[]
): void => {
  const start = performance.now(); // Start the timer
  let tally = 0; // Keep track of how many times the function is called

  // This function will be called each time 'func' finishes executing
  const handleResult = () => {
    // Check if 10 seconds have passed
    if (performance.now() - start < 10000) {
      runFunc(); // If not, call 'func' again
      tally++; // And increment the tally
    } else {
      // If 10 seconds have passed, calculate the total and average time and log them
      const elapsedTime = performance.now() - start;
      const timePerCall = roundNum(elapsedTime / tally / 4000, 4);
      kLog.log("performance", `[TestPerformance] Function Ran ${String(tally)} Times in ${String(roundNum(elapsedTime / 1000, 4))}s, Averaging ${String(timePerCall)}s per Call`);
    }
  };

  // This function calls 'func' and handles its result, whether it's a Promise or not
  const runFunc = () => {
    const result = func(...params); // Call 'func' with the provided parameters
    if (result instanceof Promise) {
      // If 'func' is asynchronous, wait for the Promise to resolve before handling the result
      void result.then(handleResult);
    } else {
      // If 'func' is synchronous, handle the result immediately
      handleResult();
    }
  };

  runFunc(); // Start the first call to 'func'
};
// #endregion

// #region ■■■■■■■[GreenSock]■■■■ Wrappers for GreenSock Functions ■■■■■■■ ~
const timeline = gsap.timeline;

const set = (targets: gsap.TweenTarget, vars: gsap.TweenVars): gsap.core.Tween => gsap.set(targets, vars);
function get(target: gsap.TweenTarget, property: keyof gsap.CSSProperties & string, unit: string): number;
function get(target: gsap.TweenTarget, property: keyof gsap.CSSProperties & string): string | number;
function get(target: gsap.TweenTarget, property: keyof gsap.CSSProperties & string, unit?: string): string | number {
  if (unit) {
    const propVal = regExtract(gsap.getProperty(target, property, unit), /[\d.]+/);
    if (typeof propVal === "string") {
      return pFloat(propVal);
    }
    throw new Error(`Unable to extract property '${String(property)}' in '${String(unit)}' units from ${String(target as Exclude<typeof target, object>)}`);
  }
  if (target instanceof $ && (target as JQuery)[0]) {
    target = (target as JQuery)[0]!;
  }
  return gsap.getProperty(target, property);
}

const getGSAngleDelta = (startAngle: number, endAngle: number) => signNum(roundNum(getAngleDelta(startAngle, endAngle), 2)).replace(/^(.)/, "$1=");

const getNearestLabel = (tl: gsap.core.Timeline, matchTest?: RegExp|string): string|undefined => {
  if (!(tl instanceof gsap.core.Timeline)) { return undefined; }
  if (!objSize(tl.labels)) { return undefined; }
  if (typeof matchTest === "string") {
    matchTest = new RegExp(matchTest);
  }

  // Filter the labels against the matchTest, if one provided, and sort by time in ascending order.
  const labelTimes = Object.entries(tl.labels)
    .filter(([label]) => {
      return matchTest instanceof RegExp
        ? matchTest.test(label)
        : true;
    })
    .sort((a, b) => a[1] - b[1]);

  // Snap the current time of the timeline to the values in labelTimes
  const nearestTime = gsap.utils.snap(labelTimes.map(([_label, time]) => time), tl.time());

  // Get the associated label for the nearest time
  const [nearestLabel] = labelTimes.find(([_label, time]) => time === nearestTime)!;

  return nearestLabel;
};

const reverseRepeatingTimeline = (tl: gsap.core.Timeline): gsap.core.Timeline => {
  // FIRST: Determine if timeline itself is repeating, or if most-recent child tween of timeline is repeating
  if (tl.repeat() === -1) {
    // Timeline itself is repeating. Set totalTime equal to time, reverse.
    tl.totalTime(tl.time());
  } else {
    // Get currently-running child tween, check if that is repeating.
    const [tw] = tl.getChildren(false, true, true, tl.time());
    if ((tw instanceof gsap.core.Timeline || tw instanceof gsap.core.Tween) && tw.repeat() === -1) {
      // Child tween is repeating. Set totalTime of TWEEN equal to time, reverse TIMELINE.
      tw.totalTime(tw.time());
    }
    tl.reverse();
  }
  return tl;
};

/**
 * Creates a distribution function for staggered animations based on element positions.
 * This function is useful for creating animations where the timing of each element's
 * animation is based on its position relative to other elements.
 *
 * @param vars - Configuration object for the distribution.
 *  - `amount` - Total amount of time (in seconds) to distribute across elements.
 *  - `each` - Time (in seconds) to allocate for each element.
 *  - `from` - Starting point for the distribution. Defaults to "start".
 *  - `base` - Base value to add to the calculated distribution. Defaults to 0.
 *  - `ease` - Easing function to apply to the distribution.
 *  - `axis` - Axis to use for distribution calculation. If omitted, uses both x and y.
 * @returns Distribution function.
 *
 * @example
 * gsap.to(".box", \{
 *   duration: 1,
 *   scale: 0.1,
 *   y: 40,
 *   ease: "power1.inOut",
 *   stagger: U.distributeByPosition(\{
 *     from: "center",
 *     amount: 2
 *   \})
 * \});
 */
const distributeByPosition = (vars: {
  amount?: number;
  each?: number;
  from?: "center" | "end" | "edges" | "start" | number;
  base?: number;
  ease?: string | gsap.EaseFunction;
  axis?: "x" | "y";
}): (index: number, target: Element, elements: Element[]) => number => {
  const ease = vars.ease && gsap.parseEase(vars.ease);
  const from = vars.from ?? "start";
  const base = vars.base ?? 0;
  const axis = vars.axis;
  const ratio = typeof from === "string" ? { center: 0.5, end: 1, edges: 0.5, start: 0 }[from] : 0;

  let distances: number[] & { max?: number; min?: number; v?: number; b?: number } = [];

  return (index: number, target: Element, elements: Element[]): number => {
    const elementsCount = elements.length;

    if (distances.length === 0) {
      // Initialize position calculations
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const positions: Point[] = [];

      // Calculate positions and find extremes
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const centerX = (rect.left + rect.right) / 2;
        const centerY = (rect.top + rect.bottom) / 2;
        positions.push({ x: centerX, y: centerY });

        minX = Math.min(minX, centerX);
        maxX = Math.max(maxX, centerX);
        minY = Math.min(minY, centerY);
        maxY = Math.max(maxY, centerY);
      });

      // Calculate origin based on 'from' parameter
      const originX = typeof from === "number" ? positions[from]?.x ?? 0 : minX + (maxX - minX) * ratio;
      const originY = typeof from === "number" ? positions[from]?.y ?? 0 : minY + (maxY - minY) * ratio;

      // Calculate distances from origin
      let maxDistance = 0, minDistance = Infinity;
      distances = positions.map(({ x, y }) => {
        const dx = x - originX;
        const dy = originY - y;
        const distance = !axis ? Math.sqrt(dx * dx + dy * dy) : Math.abs(axis === "y" ? dy : dx);
        maxDistance = Math.max(maxDistance, distance);
        minDistance = Math.min(minDistance, distance);
        return distance;
      });

      // Set additional properties on distances array
      distances.max = maxDistance - minDistance;
      distances.min = minDistance;
      distances.v = (vars.amount ?? (vars.each ? vars.each * elementsCount : 0)) * (from === "edges" ? -1 : 1);
      distances.b = distances.v < 0 ? base - distances.v : base;
    }

    // Calculate the distribution value for the current element
    const normalizedDistance = (distances[index]! - distances.min!) / distances.max!;
    const easedDistance = ease ? ease(normalizedDistance) : normalizedDistance;
    return distances.b! + easedDistance * distances.v!;
  };
};
// #endregion ■■■■[GreenSock]■■■■

// #endregion ▄▄▄▄▄ HTML ▄▄▄▄▄

// #region ████████ ASYNC: Async Functions, Asynchronous Flow Control ████████ ~
/**
 * Pauses execution for a specified duration.
 *
 * @param duration - Time to sleep in milliseconds if >= 100, otherwise in seconds
 * @returns A promise that resolves after the specified duration
 */
const sleep = (duration: number): Promise<void> => new Promise(
  (resolve) => {
    setTimeout(resolve, duration >= 100 ? duration : duration * 1000);
  }
);

/**
 * Waits for a target or targets to resolve before resolving itself.
 * This function can handle multiple types of input:
 * - An array of Promises or GSAP animations: The function will wait for all to complete.
 * - A single Promise or GSAP animation: The function will wait for it to complete.
 * - Any other value: The function will resolve immediately.
 *
 * @param waitForTarget - The target(s) to wait for, which can be an array of Promises/GSAP animations,
 *                       a single Promise/GSAP animation, or any other value
 * @returns A promise that resolves when the target(s) have resolved
 */
function waitFor(waitForTarget: unknown): Promise<void> {
  return new Promise<void>(
    (resolve, reject) => {
      if (waitForTarget instanceof Promise
        || waitForTarget instanceof gsap.core.Animation) {
        waitForTarget.then(() => { resolve(); }).catch((error: unknown) => { reject(error instanceof Error ? error : new Error(String(error))); });
      } else if (Array.isArray(waitForTarget)) {
        Promise.all(waitForTarget.map((target) => waitFor(target))).then(() => { resolve(); }).catch((error: unknown) => { reject(error instanceof Error ? error : new Error(String(error))); });
      } else {
        resolve();
      }
    }
  );
}

/**
 * Yields control to the main thread, allowing it to process higher-priority tasks.
 *
 * This function is useful for breaking long tasks into smaller chunks, preventing
 * the creation of bottlenecks in the main thread. By awaiting this function,
 * you give the main thread an opportunity to handle important tasks (like user input)
 * before your function continues its operations.
 *
 * The timeout is set to 0, so it won't significantly slow down your function
 * unless the main thread is already busy with other tasks.
 *
 * @returns A promise that resolves immediately after yielding to the main thread.
 *
 * @example
 * async function longRunningTask() \{
 *   for (let i = 0; i \< 1000000; i++) \{
 *     // Do some work...
 *     if (i % 10000 === 0) \{
 *       await yieldToMain();
 *     \}
 *   \}
 * \}
 */
function yieldToMain(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Storage for timestamp references, mapping unique IDs to timestamps
 */
const timeRefs: Record<IDString, number> = {};

/**
 * Creates a closure that measures elapsed time from when it was created.
 * This function generates a unique ID, stores the current timestamp,
 * and returns a function that calculates seconds elapsed since creation.
 *
 * @returns A function that returns the number of seconds elapsed since getTimeStamp() was called
 *
 * @example
 * const timer = getTimeStamp();
 * // Do some work...
 * console.log(timer()); // Logs seconds elapsed
 */
function getTimeStamp() {
  // Generate unique ID for this timer instance
  const id = getID();
  // Store current timestamp for this ID
  timeRefs[id] = Date.now();

  // Return closure that calculates elapsed time in seconds
  return function() {
    return (Date.now() - timeRefs[id]!) / 1000;
  };
}

// #endregion ▄▄▄▄▄ ASYNC ▄▄▄▄▄

// const EventHandlers = {
//   onSelectChange: async (inst: EntitySheet, event: SelectChangeEvent) => {
//     const elem = event.currentTarget;
//     const {action, dtype, target, flagTarget} = elem.dataset;

//     if (!action) {
//       throw new Error("Select elements require a data-action attribute.");
//     }
//     if (!target && !flagTarget) {
//       throw new Error("Select elements require a 'data-target' or 'data-flag-target' attribute.");
//     }
//     const dataType = lCase(dtype);
//     let value;
//     switch (dataType) {
//       case "number": value = pFloat(elem.value); break;
//       case "boolean": value = lCase(elem.value) === "true"; break;
//       case "string": value = elem.value; break;
//       default: {
//         if (isNumString(value)) {
//           throw new Error("You must set 'data-dtype=\"Number\"' for <select> elements with number values.");
//         }
//         if (isBooleanString(value)) {
//           throw new Error("You must set 'data-dtype=\"Boolean\"' for <select> elements with boolean values.");
//         }
//         value = elem.value;
//         break;
//       }
//     }
//     if (target) {
//       await inst.document.update({[target]: value});
//     } else if (flagTarget) {
//       if (elem.value === "") {
//         await inst.document.unsetFlag(getGame().system.id, flagTarget);
//       } else {
//         await (inst.document as K4Item).setFlag(getGame().system.id, flagTarget, value);
//       }
//     }
//   }
// };

// #region ████████ FOUNDRY: Requires Configuration of System ID in constants.ts ████████ ~

const isDocID = (ref: unknown): ref is IDString => typeof ref === "string" && /^[A-Za-z0-9]{16}$/.test(ref);

const isDocUUID = (ref: unknown): ref is UUIDString => {
  if (typeof ref !== "string") { return false; }
  const [docName, docID] = ref.split(/\./) as [string, Maybe<string>];
  if (!isDocID(docID)) { return false; }
  const {collections} = getGame();
  return collections.has(docName);
};

const isDotKey = (ref: unknown): ref is DotKey => typeof ref === "string";

const isTargetKey = (ref: unknown): ref is TargetKey => {
  if (!isDotKey(ref)) { return false; }
  if (["name", "img", "id", "_id"].includes(ref)) { return true; }
  if (ref.startsWith("system")) { return true; }
  if (ref.startsWith("flag")) { return true; }
  return false;
};

const isTargetFlagKey = (ref: unknown): ref is TargetFlagKey => {
  if (!isDotKey(ref)) { return false; }
  if (isTargetKey(ref)) { return false; }
  return true;
};

const getProp = <T>(obj: object, key: string): Maybe<T> => foundry.utils.getProperty(obj, key) as Maybe<T>;

const parseDocRefToUUID = (ref: unknown): UUIDString => {
  if (isDocUUID(ref)) {
    return ref;
  } else if (isDocID(ref)) {
    const {collections} = getGame();
    const doc = collections.find((collection) => collection.has(ref))?.get(ref);
    if (doc && "uuid" in doc) {
      return doc.uuid;
    }
    throw new Error(`[U.parseDocRefToUUID] Unable to find document with id '${String(ref)}'`);
  } else if (ref && typeof ref === "object" && "uuid" in ref && typeof ref.uuid === "string") {
    return ref.uuid;
  }
  throw new Error(`[U.parseDocRefToUUID] Unrecognized reference: '${String(ref)}'`);
};

const loc = (locRef: string, formatDict: Record<string, string> = {}) => {
  if (/[a-z]/.test(locRef)) { // Reference contains lower-case characters: add system ID namespacing to dot notation
    locRef = locRef.replace(new RegExp(`^(${String(getGame().system.id)}.)*`), `${String(getGame().system.id)}.`);
  }
  if (typeof getLocalizer().localize(locRef) === "string") {
    for (const [key, val] of Object.entries(formatDict)) {
      formatDict[key] = loc(val);
    }
    return getLocalizer().format(locRef, formatDict) || getLocalizer().localize(locRef) || locRef;
  }
  return locRef;
};

const getSetting = <T = unknown>(setting: string, submenu?: string): Maybe<T> => {
  const settingPath = [submenu, setting].filter(isDefined).join(".");
  // @ts-expect-error TypeScript is overly strict about map keys and string literals
  if (getGame().settings.settings.has(`${String(getGame().system.id)}.${String(settingPath)}`)) {
    return getGame().settings.get(getGame().system.id as ClientSettings.Namespace, settingPath as ClientSettings.KeyFor<ClientSettings.Namespace>) as T;
  }
  return undefined;
};

function getTemplatePath(subFolder: string, fileName: string): string;
function getTemplatePath(subFolder: string, fileName: string[]): string[]
function getTemplatePath(subFolder: string, fileName: string | string[]) {
  if (typeof fileName === "string") {
    return `modules/eunos-kult-hacks/templates/${String(subFolder)}/${String(fileName.replace(/\..*$/, ""))}.hbs`;
  }
  return fileName.map((fName) => getTemplatePath(subFolder, fName));
}

// DisplayImageSelector: Displays a file selector in tiles mode at the indicated path root.
function displayImageSelector(
  callback: (path: string) => void,
  pathRoot = `systems/${String(getGame().system.id)}/assets`,
  position: {top: number | null, left: number | null} = {top: 200, left: 200}
) {
  const fp = new FilePicker({
    type:         "image",
    activeSource: "public",
    displayMode:  "tiles",
    callback,
    top:          position.top ?? 200 + 40,
    left:         position.left ?? 200 + 10
  });
  return fp.browse(pathRoot);
}

function getOwnerOfDoc(doc: EunosActor|EunosItem): Maybe<User> {
  const ownerID = Object.keys(doc.ownership)
    .filter((key) => isDocID(key) && !getGame().users.find((user) => user.id === key)?.isGM)
    .find((key) => doc.ownership[key] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  if (ownerID) {
    return getUser(ownerID);
  }
  return undefined;
}

function getActorFromRef(ref: PCTarget|UserTarget|EunosActor|EunosItem|User): Maybe<EunosActor> {
  let doc: EunosActor|EunosItem|User|undefined = undefined;
  if (typeof ref === "string") {
    if (isDocID(ref)) {
      doc = getActors().find((actor) => actor.id === ref);
      if (doc) {
        return doc;
      }
      doc = getUsers().find((user) => user.id === ref);
      if (doc) {
        return doc.character as Maybe<EunosActor>;
      }
      return undefined;
    }
  }
  doc ??= ref;
  if ((doc as unknown) instanceof Actor) {
    return doc as EunosActor;
  } else if ((doc as unknown) instanceof User) {
    return (doc as User).character as Maybe<EunosActor>;
  } else if ((doc as unknown) instanceof EunosItem) {
    const itemUuid = (doc as EunosItem).uuid;
    if (/^Actor.*?Item/.test(itemUuid)) {
      const actorId = itemUuid.replace(/^Actor\.(.*?)\.Item.*$/, "$1");
      return getActors().find((actor) => actor.id === actorId);
    }
  }
  return undefined;
}

function getUserFromRef(ref: PCTarget|UserTarget): Maybe<User> {
  let doc: EunosActor|EunosItem|User|undefined = undefined;
  if (typeof ref === "string") {
    if (isDocID(ref)) {
      doc = getUsers().find((user) => user.id === ref);
      if (doc) {
        return doc;
      }
      doc = getActors().find((actor) => actor.id === ref);
      if (doc) {
        return getOwnerOfDoc(doc);
      }
      return undefined;
    } else if (isDocUUID(ref)) {
      doc = (fromUuidSync(ref) ?? undefined) as Maybe<EunosActor|EunosItem|User>;
    }
  }
  doc ??= ref;
  if ((doc as unknown) instanceof User) {
    return doc as User;
  } else if ((doc as unknown) instanceof Actor) {
    return getOwnerOfDoc(doc as EunosActor);
  }
  return undefined;
}

function getOwnedActors(): Array<EunosActor & {system: ActorDataPC}> {
  const playerUsers = getUsers().filter((user) => !user.isGM);
  const unsortedActors: Array<EunosActor & {system: ActorDataPC}> = [];
  for (const user of playerUsers) {
    const actor = user.character as Maybe<EunosActor>;
    if (actor) {
      unsortedActors.push(actor as EunosActor & {system: ActorDataPC});
    }
  }
  return sortDocsByLastWord(unsortedActors);
}

function getOwnedAndActiveActors(): Array<EunosActor & {system: ActorDataPC}> {
  const ownedActors = getOwnedActors();
  const activeActors = ownedActors
    .filter((actor) => getOwnerOfDoc(actor)?.active);
  return sortDocsByLastWord([...ownedActors, ...activeActors]);
}

/**
 * Calculates time remaining until next game session
 * @returns Object containing days, hours, minutes, seconds and total seconds until target time
 * @throws Error if nextGameSession setting is invalid
 */
function countdownUntil(): CountdownTime {
  // Get next session time from settings
  const nextSessionStr = getSettings().get("eunos-kult-hacks", "nextGameSession");
  if (!nextSessionStr) {
    throw new Error("Next game session time not set");
  }

  // Parse the date in Toronto timezone
  const targetDate = new Date(nextSessionStr);
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid next game session time format");
  }

  // Get current time in Toronto
  const torontoTz = "America/Toronto";
  const now = new Date().toLocaleString("en-US", { timeZone: torontoTz });
  const currentDate = new Date(now);

  // Calculate difference in milliseconds
  const diffMs = targetDate.getTime() - currentDate.getTime();

  // If countdown has reached zero, advance to next week
  if (diffMs <= 0 && getUser().isGM) {
    // Add 7 days to target date
    targetDate.setDate(targetDate.getDate() + 7);

    // Update the setting
    void setSetting(
      "nextGameSession",
      formatDateAsISO(new Date(targetDate.toLocaleString("en-US", { timeZone: torontoTz })))
    );

    // Return countdown for next week
    return {
      days: 7,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 7 * 24 * 60 * 60
    };
  }

  // Convert to days, hours, minutes, seconds
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds
  };
}
// #endregion ▄▄▄▄▄ FOUNDRY ▄▄▄▄▄

// #region EVENT HANDLERS
function stripEventHandlers(html: JQuery, ...exclusions: string[]): JQuery {
  const ALL_EVENTS = [
    "click", "dblclick", "contextmenu", "mousedown", "touchstart", "mouseup", "touchend", "mouseleave", "touchcancel"
  ];
  return html.off(
    ALL_EVENTS
      .filter((event) => !exclusions.includes(event))
      .join(" ")
  );
}
// #endregion EVENT HANDLERS


/**
 * Converts a date between Toronto timezone and UTC
 * @param date - The date to convert
 * @param toUTC - Whether to convert to UTC (true) or from UTC to Toronto time (false)
 * @returns The converted date
 */
function convertTorontoTime(date: Date, toUTC = false): Date {
  const torontoTz = "America/Toronto";

  if (toUTC) {
    // Convert Toronto time to UTC
    const utcString = date.toLocaleString("en-US", { timeZone: torontoTz });
    return new Date(utcString);
  } else {
    // Convert UTC to Toronto time
    return new Date(date.toLocaleString("en-US", { timeZone: torontoTz }));
  }
}

/**
 * Formats a date into a modified ISO 8601 format (YYYY-MM-DD HH:mm:ss) in Toronto timezone
 * Attempts to normalize various input formats before throwing an error
 * @param input - Optional Date object, timestamp number, date string, or undefined
 * @returns Formatted date string
 * @throws Error if input cannot be converted to a valid Date after normalization
 */
function formatDateAsISO(input?: Date | string | number): string {
  // Create a Date object based on input type
  const date = (() => {
    if (input === undefined) {
      return new Date();
    }
    if (input instanceof Date) {
      return input;
    }

    // If it's a string, try to normalize it first
    if (typeof input === "string") {
      // Remove multiple spaces and trim
      let normalized = input.replace(/\s+/g, " ").trim();

      // Try to handle common date formats
      // DD/MM/YYYY or MM/DD/YYYY
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(normalized)) {
        normalized = normalized.replace(/\//g, "-");
      }

      // Handle 12-hour time format (convert to 24-hour)
      if (/\d{1,2}:\d{2}(?::\d{2})?\s*[AaPp][Mm]/.test(normalized)) {
        const [datePart, timePart] = normalized.split(/\s+/);
        const [time, meridiem] = timePart!.split(/(?=[AaPp][Mm])/);
        const [hours, minutes, seconds = "00"] = time!.split(":");
        let hour = parseInt(hours!, 10);

        if (meridiem!.toLowerCase() === "pm" && hour < 12) {
          hour += 12;
        } else if (meridiem!.toLowerCase() === "am" && hour === 12) {
          hour = 0;
        }

        normalized = `${datePart} ${hour.toString().padStart(2, "0")}:${minutes}:${seconds}`;
      }

      // Add seconds if missing
      if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
        normalized += ":00";
      }

      // Try the normalized string first
      const normalizedDate = new Date(normalized);
      if (!isNaN(normalizedDate.getTime())) {
        return normalizedDate;
      }
    }

    // If normalization failed or input was a number, try direct construction
    const constructed = new Date(input);
    if (isNaN(constructed.getTime())) {
      throw new Error(`Invalid date input: ${String(input)}`);
    }
    return constructed;
  })();

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Toronto"
  }).replace(",", "");
}

/**
 * Gets the next occurrence of a specified day and time in Toronto timezone
 * @param dayOfWeek - Day to find (0-6 for Sunday-Saturday, or day name)
 * @param hours - Hour in 24-hour format (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Date object set to next occurrence of specified day/time in Toronto timezone
 * @throws Error if parameters are invalid
 */
function getNextDayTime(
  dayOfWeek: number | string,
  hours: number,
  minutes: number
): Date {
  // Validate and normalize inputs
  const dayNum = (() => {
    if (typeof dayOfWeek === "number") {
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new Error("Day of week must be 0-6 (Sunday-Saturday)");
      }
      return dayOfWeek;
    }

    // Minimum unique patterns to match each day
    const dayPatterns = [
      /^su/i,    // Sunday
      /^m/i,     // Monday
      /^tu/i,    // Tuesday
      /^w/i,     // Wednesday
      /^th/i,    // Thursday
      /^f/i,     // Friday
      /^sa/i     // Saturday
    ];

    const index = dayPatterns.findIndex(pattern => pattern.test(dayOfWeek));
    if (index === -1) {
      throw new Error(`Invalid day name: ${dayOfWeek}`);
    }
    return index;
  })();

  if (hours < 0 || hours > 23) {
    throw new Error("Hours must be 0-23");
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error("Minutes must be 0-59");
  }

  // Create a date object in Toronto timezone
  const date = new Date();
  const torontoDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Toronto" }));

  // Set the time
  torontoDate.setHours(hours, minutes, 0, 0);

  // If we've already passed this time today, add a day
  if (torontoDate < date) {
    torontoDate.setDate(torontoDate.getDate() + 1);
  }

  // Keep adding days until we hit the target day
  while (torontoDate.getDay() !== dayNum) {
    torontoDate.setDate(torontoDate.getDate() + 1);
  }

  return torontoDate;
}

export {
  // █████████████████ FOUNDRY UTILS ████████████████████████
  //  - augment custom utility functions with Foundry's)
  //  - see https://foundryvtt.com/api/modules/foundry.utils.html
  // ...foundry.utils,

  // █████████████████ INITIALIZATION ███████████████████████
  Initialize,

  // ████████ GETTERS: Basic Data Lookup & Retrieval ████████
  GMID, getUID, getID,

  // ████████ TYPES: Type Checking, Validation, Conversion, Casting ████████
  isNumber, isNumString, isBooleanString, isSystemScalar, isSimpleObj, isList, isArray, isFunc, isInt, isFloat, isPosInt, isIterable,
  isHTMLString, isJQuery, isRGBColor, isHexColor,
  isUndefined, isDefined, isEmpty, hasItems, isInstanceOf,
  areEqual, areFuzzyEqual,
  castToScalar, pFloat, pInt, pBool, radToDeg, degToRad,
  getKey,
  assertNonNullType,

  FILTERS,

  sortByLastWord, sortDocsByLastWord,

  // ████████ BOOLEAN: Combining & Manipulating Boolean Tests ████████
  checkAll, checkAny, checkAllFail, assertIs,

  // ████████ REGEXP: Regular Expressions, Replacing, Matching ████████
  testRegExp,
  regExtract,

  // ████████ STRINGS: String Parsing, Manipulation, Conversion ████████
  // ■■■■■■■ Case Conversion ■■■■■■■
  uCase, lCase, sCase, tCase, camelCase,
  // ■■■■■■■ Formatting ■■■■■■■
  /* hyphenate, */ unhyphenate, pluralize, oxfordize, ellipsize, pad, trimInner,
  toKey,
  parseArticles,
  signNum, padNum, stringifyNum, verbalizeNum, deverbalizeNum,ordinalizeNum, romanizeNum,
  // ■■■■■■■ Content ■■■■■■■
  loremIpsum, randString, randWord,

  // ████████ SEARCHING: Searching Various Data Types w/ Fuzzy Matching ████████
  fuzzyMatch, isIn, isInExact,

  // ████████ NUMBERS: Number Casting, Mathematics, Conversion ████████
  randNum, randInt, randNumWeighted,
  coinFlip,
  cycleNum, cycleAngle, roundNum, clampNum,
  sum, average,
  // ■■■■■■■ Positioning ■■■■■■■
  getDistance,
  getAngle, getAngleDelta,
  getBoundingRectangle,

  // ████████ ARRAYS: Array Manipulation ████████
  randElem, randIndex, randElemWeighted,
  makeIntRange,
  makeCycler,
  unique, group, sample,
  getLast, removeFirst, pullElement, pullElements, pullIndex,
  subGroup, shuffle,
  toArray,

  // ████████ OBJECTS: Manipulation of Simple Key/Val Objects ████████
  remove, replace, partition, zip,
  objClean, objSize, objMap, objFindKey, objFilter, objForEach, objCompact,
  objClone, objMerge, objDiff, objExpand, objFlatten, objDeepFlatten,objNullify,
  objFreezeProps,

  // ████████ FUNCTIONS: Function Wrapping, Queuing, Manipulation ████████
  getDynamicFunc, withLog,

  // ████████ HTML: Parsing HTML Code, Manipulating DOM Objects ████████
  /* changeContainer, */ adjustTextContainerAspectRatio, getMutableRect,

  getRawCirclePath, drawCirclePath, positionAlongCircle,

  getColorVals, getRGBString, getHEXString, getContrastingColor, getRandomColor,

  getSiblings,

  escapeHTML, encodeSVGforCSS,

  extractComputedStyles, compareComputedStyles,

  getMaxZIndex,

  // ████████ PERFORMANCE & DEBUG: Debugging Functions, Performance Testing & Metrics ████████
  testFuncPerformance,

  // ■■■■■■■ GreenSock ■■■■■■■
  timeline, get, set, getGSAngleDelta, getNearestLabel, reverseRepeatingTimeline,

  distributeByPosition,

  // ████████ ASYNC: Async Functions, Asynchronous Flow Control ████████
  sleep, waitFor, yieldToMain, getTimeStamp,

  countdownUntil,

  // EVENT HANDLERS
  stripEventHandlers,
  // EventHandlers,

  // ■■■■■■■ SYSTEM: System-Specific Functions (Requires Configuration of System ID in constants.js) ■■■■■■■
  isDocID, isDocUUID, isDotKey, isTargetKey, isTargetFlagKey,
  getProp,

  parseDocRefToUUID,

  loc, getSetting, getTemplatePath, displayImageSelector, getOwnerOfDoc, getActorFromRef, getUserFromRef, getOwnedActors, getOwnedAndActiveActors,

  convertTorontoTime, formatDateAsISO, getNextDayTime

};
// #endregion ▄▄▄▄▄ EXPORTS ▄▄▄▄▄
