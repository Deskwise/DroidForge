// JS shim so tests that import the .js entrypoint can resolve the TypeScript
// implementation when running under tsx. Re-export the createSnapshot implementation
// which lives in createSnapshot.ts.
import * as impl from './createSnapshot.ts';
export const createSnapshotTool = impl.createSnapshotTool;
export default impl;
