// Allows importing image files so the bundler resolves URLs for production/SSR builds.
declare module '*.webp' {
  const src: string;
  export default src;
}
