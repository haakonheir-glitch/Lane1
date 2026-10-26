/**
 * Sample data for the marketing page, /sample, the share image and the /system specimen only.
 * Clearly labelled "Sample" wherever it appears. App pages never use it.
 */
import "server-only";
import * as mock from "../mock";
import { FAMILIES, LANES } from "../taxonomy";
import { buildCareerPicks, buildLaneDetail, buildLaneMap } from "./lanes";
import type { ExperienceAnswers } from ".";

const NO_EXPERIENCE: ExperienceAnswers = { current: null, considering: [] };

export const getSampleProfile = () => Promise.resolve(mock.sampleProfile);
export const getSampleLaneMap = () => Promise.resolve(buildLaneMap(mock.sampleProfile, NO_EXPERIENCE));
/** The sample person's best-fitting career paths (the Career map's top five). */
export const getSamplePicks = () => Promise.resolve(buildCareerPicks(mock.sampleProfile, NO_EXPERIENCE).overall);
export const getSampleUser = () => Promise.resolve(mock.user);
export const getSampleLaneDetail = async (id: string) => buildLaneDetail(id, mock.sampleProfile, NO_EXPERIENCE);
/** Families with their lane names, for the marketing page's index. */
export const getTaxonomyIndex = () =>
  Promise.resolve({ families: FAMILIES.map((f) => ({ id: f.id, name: f.name, lanes: f.lanes.map((l) => l.name) })), laneCount: LANES.length });
