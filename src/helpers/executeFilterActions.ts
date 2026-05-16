/* eslint-disable @typescript-eslint/no-explicit-any */
export function executeFilterActions(
  builder: any,
  actions: { method: string; args: any[] }[]
) {
  for (const action of actions) {
    const { method, args } = action;

    if (typeof builder[method] !== "function") {
      throw new Error(`Unknown filter method: ${method}`);
    }

    builder[method](...(args || []));
  }

  return builder;
}