/** Consistent, grep-friendly logs for pipelines and Cursor debugging. */

const PREFIX = "[runway-image-gen]";

export const log = {
  info(msg: string, extra?: Record<string, unknown>) {
    if (extra && Object.keys(extra).length) {
      console.log(`${PREFIX} ${msg}`, extra);
    } else {
      console.log(`${PREFIX} ${msg}`);
    }
  },
  warn(msg: string, extra?: unknown) {
    console.warn(`${PREFIX} ${msg}`, extra ?? "");
  },
  error(msg: string, err?: unknown) {
    console.error(`${PREFIX} ${msg}`, err ?? "");
  },
};
