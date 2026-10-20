import { useState, useEffect } from "react";
import "./App.css";

// helper funcs
import durationFormatter from "./helpers/durationFormatter";
import dateFormatter from "./helpers/dateFormatter";

const base = import.meta.env.VITE_API_URL;

const configError = base ? null : `VITE_API_URL is ${base}, check .env`;

function SessionRow({ session }) {
  return (
    <tr>
      <td>{dateFormatter(session.session_date)}</td>
      <td>{session.session_type}</td>
      <td>{durationFormatter(session.duration_in_mins)}</td>
      <td>{session.notes}</td>
    </tr>
  );
}

function SessionList({ sessions }) {
  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Session Date</th>
            <th>Session Type</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </tbody>
      </table>
      {sessions.length === 0 && <p>No sessions logged</p>}
    </>
  );
}

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
      <SessionList sessions={sessions} />
      <p>{error ? "Couldn't load sessions :(" : null}</p>
    </>
  );
}

export default App;
