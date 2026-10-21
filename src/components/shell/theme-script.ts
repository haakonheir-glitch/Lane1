export const THEME_KEY = "lane-theme";

/** Inline, render-blocking script: applies a stored theme before first paint. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
