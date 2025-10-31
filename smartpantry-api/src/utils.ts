export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const intersectCount = (a: string[], b: string[]) => {
  const setB = new Set(b.map(normalize));
  return a.reduce((acc, x) => acc + (setB.has(normalize(x)) ? 1 : 0), 0);
};

export const uniq = <T>(arr: T[]) => Array.from(new Set(arr));
