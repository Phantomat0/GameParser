export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const limitNumberWithinRange = (
  value: number,
  min: number,
  max: number
) => {
  if (min > max) throw Error(`Min ${min} is greater than Max ${max}`);
  return Math.min(Math.max(value, min), max);
};

export const round = (value: number, precision: number = 0): number => {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
};

export const parseStringArrToIntArr = (arrOfStr: string[]) => {
  return arrOfStr.map((str) => parseInt(str));
};

export function getQueryParam(link: string, paramName: string) {
  var q = link.match(new RegExp("[?&]" + paramName + "=([^&#]*)"));
  return q && q[1];
}
