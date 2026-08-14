export function isDevelopmentAuthenticationEnabled() {
  return process.env.NODE_ENV === "development";
}
