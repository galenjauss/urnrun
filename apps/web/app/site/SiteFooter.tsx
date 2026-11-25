import { Link } from "react-router";
import { DISCLAIMER, SITE } from "./site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Site">
        <Link to="/how-to-play">How to play</Link>
        <Link to="/ledger">Past dives</Link>
        <Link to="/stats">Your stats</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href={SITE.contactUrl} rel="noopener noreferrer" target="_blank">
          Contact
        </a>
      </nav>
      <p className="disclaimer">{DISCLAIMER}</p>
    </footer>
  );
}
