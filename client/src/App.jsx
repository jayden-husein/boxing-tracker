import { useState, useEffect } from "react";
import "./App.css";

const base = import.meta.env.VITE_API_URL;

const configError = base ? null : `VITE_API_URL is ${base}, check .env`;

function App() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (configError) return;

    async function load() {
      try {
        const res = await fetch(`${base}/sessions`);

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();

        setSessions(data);
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    }
    load();
  }, []);

  // if this runs, the rest of the page isnt loaded
  if (configError) {
    return <p>{configError}</p>;
  }

  return (
    <>
      <pre>{JSON.stringify(sessions)}</pre>
      <p>{error ? "Couldn't load sessions :(" : null}</p>
    </>
  );
}

export default App;
