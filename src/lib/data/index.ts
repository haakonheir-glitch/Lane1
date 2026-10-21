/**
 * Data access — the API seam.
 * Pages call these functions; components only ever receive their results as props.
 * Today they resolve mock fixtures. Replace the bodies with real fetches later.
 */
import * as mock from "../mock";
import type {
  AssessmentModule,
  AssessmentModuleId,
  Evidence,
  Lane,
  LikertQuestion,
  PatternItem,
  Profile,
  Sprint,
  User,
} from "../types";

const resolve = <T,>(value: T): Promise<T> => Promise.resolve(structuredClone(value));

export const getToday = (): string => mock.TODAY;

export const getUser = (): Promise<User> => resolve(mock.user);
export const getProfile = (): Promise<Profile> => resolve(mock.profile);

export const getLanes = (): Promise<Lane[]> => resolve(mock.lanes);
export const getLane = async (id: string): Promise<Lane | undefined> =>
  (await getLanes()).find((l) => l.id === id);
export const getLaneIndex = () => resolve(mock.laneIndex);

export const getModules = (): Promise<AssessmentModule[]> => resolve(mock.modules);
export const getModule = async (id: string): Promise<AssessmentModule | undefined> =>
  (await getModules()).find((m) => m.id === id);
export const getQuestions = (id: Exclude<AssessmentModuleId, "cognitive">): Promise<LikertQuestion[]> =>
  resolve(mock.questions[id]);
export const getPatternItems = (): Promise<PatternItem[]> => resolve(mock.patternItems);

export const getSprints = (): Promise<Sprint[]> => resolve(mock.sprints);
export const getSprint = async (id: string): Promise<Sprint | undefined> =>
  (await getSprints()).find((s) => s.id === id);

export const getEvidence = (): Promise<Evidence> => resolve(mock.evidence);
