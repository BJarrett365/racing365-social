/** Minimal Pages Router shell required for `pages/api/*` alongside the App Router. */
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
