import type { LikertQuestion } from "./types";

export const scaleAnchors: Record<LikertQuestion["scale"], [string, string, string, string, string]> = {
  agree: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
  like: ["Would dislike a lot", "Would dislike", "Indifferent", "Would like", "Would like a lot"],
  important: ["Not important", "Slightly", "Moderately", "Very", "Essential"],
};

export const scalePrompt: Record<LikertQuestion["scale"], string> = {
  agree: "How accurately does this describe you?",
  like: "How much would you enjoy this as part of your work?",
  important: "How important is this to you in work?",
};
