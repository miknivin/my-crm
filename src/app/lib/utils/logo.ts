export const TEST_MODE_LOGO_SRC = "/images/logo/logo-mark.svg";

export const isTestModeLogoEnabled =
  process.env.NEXT_PUBLIC_TEST_MODE === "true";

export function getLogoSrc(defaultSrc: string) {
  return isTestModeLogoEnabled ? TEST_MODE_LOGO_SRC : defaultSrc;
}
