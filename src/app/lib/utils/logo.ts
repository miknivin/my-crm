export const TEST_MODE_LOGO_SRC = "/images/logo/logo-dark.png";

export const isTestModeLogoEnabled =
  process.env.NEXT_PUBLIC_TEST_MODE === "true";

export function getLogoSrc(defaultSrc: string) {
  return isTestModeLogoEnabled ? TEST_MODE_LOGO_SRC : defaultSrc;
}
