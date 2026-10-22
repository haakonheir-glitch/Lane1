/** Lane matching: pure functions over a profile in the ProfileScores shape and the taxonomy. */
export { matchLanes, sortMatches, constructTable, BAND_ORDER, bandLabel, type Band, type Driver, type LaneMatch, type TaxonomyForMatching } from "./fit";
export { rankRoles, entryPoint, startingRoles, type EntryNote, type EntryPoint, type Experience, type RoleRecommendation, type YearsBand } from "./roles";
export { resolveConstruct, parseConstruct, isResolved, EXPERIMENTAL_PREFIXES, type Resolved, type Unresolved } from "./constructs";
export { payoffCurve, payoffLabel, WINNER_TAKE_ALL_NOTE } from "./payoff";
