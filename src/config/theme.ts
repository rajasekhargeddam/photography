export type Theme = 'light' | 'dark';
export const themeStorageKey = 'photography-theme';
export const themeInitScript = `try{var t=localStorage.getItem('${themeStorageKey}');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch{document.documentElement.dataset.theme='light'}`;
