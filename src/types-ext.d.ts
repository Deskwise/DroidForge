declare module 'inquirer';
declare module 'js-yaml';
declare module 'mustache';

declare module 'express' {
  const exp: any;
  export default exp;
  export type Request = any;
  export type Response = any;
}

declare module 'cors' {
  const cors: any;
  export default cors;
}

declare module 'micromatch' {
  const micromatch: any;
  export default micromatch;
}

