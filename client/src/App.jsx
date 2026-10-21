import { useState, useEffect } from "react";
import "./App.css";

// helper funcs
import durationFormatter from "./helpers/durationFormatter";
import dateFormatter from "./helpers/dateFormatter";

const base = import.meta.env.VITE_API_URL;

const configError = base ? null : `VITE_API_URL is ${base}, check .env`;

const emptyForm = {
  session_date: "",
  session_type: "",
  duration_in_mins: "",
  notes: "",
};

function SessionForm({ base, onCreated }) {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // fill the dropdown once, after the first render
  useEffect(() => {
    async function loadTypes() {
      try {
        const res = await fetch(`${base}/session-types`);

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        setTypes(await res.json());
      } catch (err) {
        console.error(err.message);
        setFormError("Couldn't load session types");
      }
    }
    loadTypes();
  }, [base]);

  // one handler for every input: the input's `name` picks which field changes
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // client-side checks; the server still checks everything again
  function validate() {
    const duration = Number(form.duration_in_mins);

    if (!form.session_date) return "Date is required";
    if (!form.session_type) return "Choose a session type";
    if (!Number.isInteger(duration) || duration <= 0) {
      return "Duration must be a whole number above 0";
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser's default full-page form submit

    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`${base}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: form.session_date,
          session_type: form.session_type,
          duration_in_mins: Number(form.duration_in_mins),
          notes: form.notes.trim() || null,
        }),
      });

      const data = await res.json();

      // a 400 doesn't make fetch throw, so check res.ok and show the server's message
      if (!res.ok) {
        setFormError(data.error || "Couldn't save session");
        return;
      }

      onCreated(data);
      setForm(emptyForm);
    } catch (err) {
      console.error(err.message);
      setFormError("Couldn't save session");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="session-form" onSubmit={handleSubmit}>
      <label>
        Date
        <input
          type="date"
          name="session_date"
          value={form.session_date}
          onChange={handleChange}
        />
      </label>

      <label>
        Type
        <select
          name="session_type"
          value={form.session_type}
          onChange={handleChange}
        >
          <option value="" disabled>
            Choose a type
          </option>
          {types.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Duration (mins)
        <input
          type="number"
          name="duration_in_mins"
          min="1"
          step="1"
          value={form.duration_in_mins}
          onChange={handleChange}
        />
      </label>

      <label>
        Notes
        <textarea name="notes" value={form.notes} onChange={handleChange} />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Log session"}
      </button>

      {formError && <p className="form-error">{formError}</p>}
    </form>
  );
}

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

  function handleCreated(created) {
    setSessions((prev) =>
      [created, ...prev]
        .sort((a, b) => b.session_date.localeCompare(a.session_date))
        .slice(0, 15),
    );
  }

  // if this runs, the rest of the page isnt loaded
  if (configError) {
    return <p>{configError}</p>;
  }

  return (
    <>
      <SessionForm base={base} onCreated={handleCreated} />
      <SessionList sessions={sessions} />
      <p>{error ? "Couldn't load sessions :(" : null}</p>
    </>
  );
}

export default App;
