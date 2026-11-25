import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { loadName, saveName } from "../lobby/useLobby";
import { ContentPage } from "../site/ContentPage";
import { pageMeta } from "../site/site";
import "../lobby/lobby.css";

export const meta = () =>
  pageMeta(
    "Séance",
    "Play Urn Run live with up to 16 friends: everyone answers the same prompt at once, and answers nobody else gave earn a bonus.",
    "/lobby",
  );

const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{5}$/;

export default function Lobby() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : loadName()));
  const nameRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (typed: string) => {
    setBusy(true);
    setError(null);
    const name = typed.trim() || "Courier";
    saveName(name);
    try {
      const res = await fetch("/api/lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        data?: { code: string };
        error?: { message: string };
      };
      if (!body.ok || !body.data) throw new Error(body.error?.message ?? "Couldn't open a room");
      await navigate(`/lobby/${body.data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open a room");
      setBusy(false);
    }
  };

  const cleanCode = code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5);
  return (
    <ContentPage title="Séance" kicker="Live with friends">
      <p>
        Up to 16 couriers answer the same prompt at once. Rare answers score as usual — and an
        answer <strong>nobody else in the room</strong> gave earns +250 souls. Say the same thing as
        someone else? <em>Jinx.</em>
      </p>
      <label className="lobby-field">
        Your name
        <input
          ref={nameRef}
          className="guess-input"
          value={name}
          maxLength={20}
          autoComplete="nickname"
          placeholder="Courier"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="lobby-actions">
        <button
          type="button"
          className="cta"
          disabled={busy}
          onClick={() => void create(nameRef.current?.value ?? name)}
        >
          Open a séance
        </button>
      </div>
      <form
        className="lobby-join"
        onSubmit={(e) => {
          e.preventDefault();
          if (!CODE_RE.test(cleanCode)) {
            setError("Room codes are five letters, like BKTRM.");
            return;
          }
          saveName(nameRef.current?.value.trim() || name);
          void navigate(`/lobby/${cleanCode}`);
        }}
      >
        <label className="lobby-field">
          Or join with a code
          <input
            className="guess-input lobby-code-input"
            value={cleanCode}
            inputMode="text"
            autoCapitalize="characters"
            placeholder="BKTRM"
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <button type="submit" className="cta">
          Join
        </button>
      </form>
      {error ? (
        <p className="lobby-error" role="alert">
          {error}
        </p>
      ) : null}
    </ContentPage>
  );
}
