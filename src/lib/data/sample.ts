/**
 * Sample data for the marketing page and /system specimen only.
 * Clearly labelled "Sample" wherever it appears. App pages never use it.
 */
import * as mock from "../mock";

const resolve = <T,>(value: T): Promise<T> => Promise.resolve(structuredClone(value));

export const getSampleLanes = () => resolve(mock.lanes);
export const getSampleProfile = () => Promise.resolve(mock.sampleProfile);
export const getSampleSprints = () => resolve(mock.sprints);
export const getSampleEvidence = () => resolve(mock.evidence);
export const getLaneIndex = () => resolve(mock.laneIndex);
