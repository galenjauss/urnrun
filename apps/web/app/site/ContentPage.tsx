import { Link } from "react-router";
import { SiteFooter } from "./SiteFooter";
import "./content.css";

/** Shell for static content pages: wordmark header, readable column, legal footer. */
export function ContentPage({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="content-shell">
      <header className="content-top">
        <Link to="/" className="content-mark">
          Urn Run
        </Link>
        <Link to="/dive" className="content-play">
          Play today’s dive
        </Link>
      </header>
      <main className="content-main">
        <article className="content-article">
          {kicker ? <p className="content-kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
