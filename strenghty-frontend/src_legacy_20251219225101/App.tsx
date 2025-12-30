import React, { useState, useEffect } from "react";
import { Dumbbell } from 'lucide-react';

type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  description: string;
};

type Workout = {
  id: number;
  date: string;
  name: string;
  notes: string;
  created_at?: string;
  ended_at?: string | null;
};

type WorkoutSet = {
  id: number;
  workout: number;
  exercise: number;
  set_number: number;
  reps: number;
  weight: string | null;
  is_pr: boolean;
};

const API_BASE = "http://127.0.0.1:8000/api";

const DEFAULT_EXERCISES: { name: string; group: string }[] = [
  { name: "Bench Press", group: "CHEST" },
  { name: "Incline Press", group: "CHEST" },
  { name: "Squat", group: "LEGS" },
  { name: "Deadlift", group: "LEGS" },
  { name: "Overhead Press", group: "SHOULDERS" },
  { name: "Barbell Row", group: "BACK" },
  { name: "Pull Up", group: "BACK" },
  { name: "Biceps Curl", group: "ARMS" },
];

const LIBRARY_EXERCISES: { name: string; group: string }[] = [
  { name: "Barbell Back Squat", group: "LEGS" },
  { name: "Barbell Front Squat", group: "LEGS" },
  { name: "Barbell Zercher Squat", group: "LEGS" },
  { name: "Barbell Hack Squat", group: "LEGS" },
  { name: "Dumbbell Goblet Squat", group: "LEGS" },
  { name: "Dumbbell Bulgarian Split Squat", group: "LEGS" },
  { name: "Dumbbell Walking Lunge", group: "LEGS" },
  { name: "Dumbbell Step-Up", group: "LEGS" },
  { name: "Leg Press Machine", group: "LEGS" },
  { name: "Hack Squat Machine", group: "LEGS" },
  { name: "Pendulum Squat Machine", group: "LEGS" },
  { name: "V-Squat Machine", group: "LEGS" },
  { name: "Leg Extension Machine", group: "LEGS" },
  { name: "Sissy Squat Machine", group: "LEGS" },
  { name: "Smith Machine Squat", group: "LEGS" },
  { name: "Barbell Romanian Deadlift", group: "LEGS" },
  { name: "Barbell Stiff-Leg Deadlift", group: "LEGS" },
  { name: "Barbell Good Morning", group: "LEGS" },
  { name: "Dumbbell Romanian Deadlift", group: "LEGS" },
  { name: "Dumbbell Single-Leg RDL", group: "LEGS" },
  { name: "Lying Leg Curl Machine", group: "LEGS" },
  { name: "Seated Leg Curl Machine", group: "LEGS" },
  { name: "Standing Single-Leg Curl Machine", group: "LEGS" },
  { name: "Cable Pull-Through", group: "LEGS" },
  { name: "Glute Ham Raise", group: "LEGS" },
  { name: "Nordic Hamstring Curl", group: "LEGS" },
  { name: "Barbell Hip Thrust", group: "GLUTES" },
  { name: "Barbell Kas Glute Bridge", group: "GLUTES" },
  { name: "Dumbbell Sumo Squat", group: "GLUTES" },
  { name: "Cable Glute Kickback", group: "GLUTES" },
  { name: "Cable Hip Abduction", group: "GLUTES" },
  { name: "Seated Hip Abduction Machine", group: "GLUTES" },
  { name: "Machine Glute Kickback", group: "GLUTES" },
  { name: "Smith Machine Hip Thrust", group: "GLUTES" },
  { name: "Seated Calf Raise Machine", group: "CALVES" },
  { name: "Standing Calf Raise Machine", group: "CALVES" },
  { name: "Donkey Calf Raise Machine", group: "CALVES" },
  { name: "Leg Press Calf Press", group: "CALVES" },
  { name: "Dumbbell Single-Leg Calf Raise", group: "CALVES" },
  { name: "Barbell Incline Bench Press", group: "CHEST" },
  { name: "Dumbbell Incline Bench Press", group: "CHEST" },
  { name: "Incline Machine Chest Press", group: "CHEST" },
  { name: "Low-to-High Cable Fly", group: "CHEST" },
  { name: "Smith Machine Incline Press", group: "CHEST" },
  { name: "Barbell Flat Bench Press", group: "CHEST" },
  { name: "Barbell Decline Bench Press", group: "CHEST" },
  { name: "Dumbbell Flat Bench Press", group: "CHEST" },
  { name: "Dumbbell Decline Bench Press", group: "CHEST" },
  { name: "Dumbbell Flat Chest Fly", group: "CHEST" },
  { name: "Machine Chest Press", group: "CHEST" },
  { name: "Pec Deck Machine", group: "CHEST" },
  { name: "High-to-Low Cable Crossover", group: "CHEST" },
  { name: "Cable Chest Press", group: "CHEST" },
  { name: "Chest Dips", group: "CHEST" },
  { name: "Wide Grip Lat Pulldown", group: "BACK" },
  { name: "Close Grip Lat Pulldown", group: "BACK" },
  { name: "Underhand Lat Pulldown", group: "BACK" },
  { name: "Single-Arm Cable Lat Pulldown", group: "BACK" },
  { name: "Straight-Arm Cable Pulldown", group: "BACK" },
  { name: "Dumbbell Pullover", group: "BACK" },
  { name: "Pull-ups", group: "BACK" },
  { name: "Assisted Pull-up Machine", group: "BACK" },
  { name: "Barbell Bent-Over Row", group: "BACK" },
  { name: "Barbell Pendlay Row", group: "BACK" },
  { name: "Barbell T-Bar Row", group: "BACK" },
  { name: "Seated Cable Row", group: "BACK" },
  { name: "Single-Arm Dumbbell Row", group: "BACK" },
  { name: "Dumbbell Chest-Supported Row", group: "BACK" },
  { name: "Meadows Row", group: "BACK" },
  { name: "Machine T-Bar Row", group: "BACK" },
  { name: "Hammer Strength Row Machine", group: "BACK" },
  { name: "Barbell Overhead Press", group: "SHOULDERS" },
  { name: "Dumbbell Shoulder Press", group: "SHOULDERS" },
  { name: "Dumbbell Front Raise", group: "SHOULDERS" },
  { name: "Barbell Front Raise", group: "SHOULDERS" },
  { name: "Cable Front Raise", group: "SHOULDERS" },
  { name: "Shoulder Press Machine", group: "SHOULDERS" },
  { name: "Arnold Press", group: "SHOULDERS" },
  { name: "Dumbbell Lateral Raise", group: "SHOULDERS" },
  { name: "Cable Lateral Raise", group: "SHOULDERS" },
  { name: "Machine Lateral Raise", group: "SHOULDERS" },
  { name: "Barbell Upright Row", group: "SHOULDERS" },
  { name: "Dumbbell Upright Row", group: "SHOULDERS" },
  { name: "Dumbbell Rear Delt Fly", group: "SHOULDERS" },
  { name: "Cable Face Pull", group: "SHOULDERS" },
  { name: "Cable Rear Delt Fly", group: "SHOULDERS" },
  { name: "Reverse Pec Deck Machine", group: "SHOULDERS" },
  { name: "Barbell Bicep Curl", group: "ARMS" },
  { name: "EZ-Bar Bicep Curl", group: "ARMS" },
  { name: "Dumbbell Incline Curl", group: "ARMS" },
  { name: "Dumbbell Hammer Curl", group: "ARMS" },
  { name: "Dumbbell Concentration Curl", group: "ARMS" },
  { name: "Dumbbell Preacher Curl", group: "ARMS" },
  { name: "Cable Bicep Curl", group: "ARMS" },
  { name: "Cable Rope Hammer Curl", group: "ARMS" },
  { name: "Preacher Curl Machine", group: "ARMS" },
  { name: "Spider Curl", group: "ARMS" },
  { name: "Barbell Close-Grip Bench Press", group: "ARMS" },
  { name: "EZ-Bar Skull Crusher", group: "ARMS" },
  { name: "Dumbbell Overhead Extension", group: "ARMS" },
  { name: "Dumbbell Kickback", group: "ARMS" },
  { name: "Cable Rope Pushdown", group: "ARMS" },
  { name: "Cable Straight Bar Pushdown", group: "ARMS" },
  { name: "Cable Overhead Extension", group: "ARMS" },
  { name: "Cable Cross-Body Extension", group: "ARMS" },
  { name: "Tricep Dip Machine", group: "ARMS" },
  { name: "Smith Machine JM Press", group: "ARMS" },
  { name: "Cable Rope Crunch", group: "CORE" },
  { name: "Cable Woodchop", group: "CORE" },
  { name: "Ab Crunch Machine", group: "CORE" },
  { name: "Hanging Leg Raise", group: "CORE" },
  { name: "Captain's Chair Knee Raise", group: "CORE" },
  { name: "Barbell Ab Rollout", group: "CORE" },
  { name: "Dumbbell Russian Twist", group: "CORE" },
  { name: "Weighted Sit-Up", group: "CORE" },
];

function App() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  // empty string means "no muscle group selected yet"
  const [newGroup, setNewGroup] = useState("");
  const [newDescription, setNewDescription] = useState("");

  type View = "home" | "exercises" | "workout";
  const [view, setView] = useState<View>("home");
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [workoutsList, setWorkoutsList] = useState<Workout[]>([]);
  const [selectedPastWorkout, setSelectedPastWorkout] =
    useState<Workout | null>(null);
  const [pastWorkoutSets, setPastWorkoutSets] = useState<WorkoutSet[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([]);
  const [setExerciseId, setSetExerciseId] = useState("");
  const [setReps, setSetReps] = useState("");
  const [setWeight, setSetWeight] = useState("");
  const [setIsPr, setSetIsPr] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Login failed. Check username/password.");
        return;
      }
      const data: { token: string } = await res.json();
      setToken(data.token);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadExercises() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/exercises/`, {
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      if (!res.ok) {
        setError("Failed to load exercises.");
        return;
      }
      const data: Exercise[] = await res.json();
      setExercises(data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    const name = newName.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }

    if (!newGroup) {
      setError("Please select a muscle group.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/exercises/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name,
          muscle_group: newGroup,
          description: newDescription.trim(),
        }),
      });
      if (!res.ok) {
        setError("Failed to add exercise.");
        return;
      }
      const created: Exercise = await res.json();
      setExercises([...exercises, created]);
      setNewName("");
      setNewDescription("");
      setNewGroup("");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExercise(id: number) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/exercises/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${token}`,
        },
      });
      if (!res.ok) {
        setError("Failed to delete exercise.");
        return;
      }
      setExercises(exercises.filter((ex) => ex.id !== id));
    } catch {
      setError("Network error.");
    }
  }

  async function handleStartWorkout() {
    if (!token) {
      setError("You must be logged in to start a workout.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const res = await fetch(`${API_BASE}/workouts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          date: today,
          name: `Workout ${today}`,
          notes: "",
        }),
      });
      if (!res.ok) {
        let msg = `Failed to start workout (status ${res.status}).`;
        try {
          const body = await res.json();
          msg += ` ${JSON.stringify(body)}`;
        } catch {}
        setError(msg);
        return;
      }
      const workout: Workout = await res.json();
      setCurrentWorkout(workout);
      // ensure we have the user's exercises loaded so the quick-add and dropdown work
      await loadExercises();
      setWorkoutSets([]);
      setView("workout");
      // start timer based on created_at (or now)
      const startIso = workout.created_at ?? new Date().toISOString();
      const start = new Date(startIso).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      setTimerRunning(true);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // effect: update elapsedSeconds while timerRunning and currentWorkout exists and not finished
  useEffect(() => {
    if (!timerRunning || !currentWorkout) return;
    const interval = setInterval(() => {
      const startIso = currentWorkout.created_at ?? new Date().toISOString();
      const start = new Date(startIso).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, currentWorkout]);

  async function finishWorkout() {
    if (!token || !currentWorkout) return;
    setError(null);
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const res = await fetch(`${API_BASE}/workouts/${currentWorkout.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ ended_at: nowIso }),
      });
      if (!res.ok) {
        setError("Failed to finish workout.");
        return;
      }
      const updated: Workout = await res.json();
      setCurrentWorkout(updated);
      setTimerRunning(false);
      // refresh history so finished workout appears
      await loadWorkouts();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkouts() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workouts/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        setError("Failed to load workouts.");
        return;
      }
      const data: Workout[] = await res.json();
      setWorkoutsList(data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSetsForWorkout(workoutId: number) {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sets/?workout=${workoutId}`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        setError("Failed to load sets for workout.");
        return;
      }
      const data: WorkoutSet[] = await res.json();
      setPastWorkoutSets(data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteWorkout(workoutId: number) {
    if (!token) return setError("Not authenticated.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workouts/${workoutId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        let msg = `Failed to delete workout (status ${res.status}).`;
        try {
          const body = await res.json();
          msg += ` ${JSON.stringify(body)}`;
        } catch {}
        setError(msg);
        return;
      }
      setWorkoutsList((cur) => cur.filter((w) => w.id !== workoutId));
      if (selectedPastWorkout && selectedPastWorkout.id === workoutId) {
        setSelectedPastWorkout(null);
        setPastWorkoutSets([]);
      }
      if (currentWorkout && currentWorkout.id === workoutId) {
        setCurrentWorkout(null);
        setWorkoutSets([]);
        setTimerRunning(false);
        setView("home");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAddExercise(name: string, group = "OTHER") {
    if (!token) return setError("Not authenticated.");
    setError(null);

    // if user already has the exercise, just select it
    const existing = exercises.find(
      (ex) => ex.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setSetExerciseId(String(existing.id));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/exercises/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ name, muscle_group: group, description: "" }),
      });
      if (!res.ok) {
        // if it failed because of unique constraint, try to load exercises and pick it
        await loadExercises();
        const found = exercises.find(
          (ex) => ex.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
          setSetExerciseId(String(found.id));
          return;
        }
        setError("Failed to add quick exercise.");
        return;
      }
      const created: Exercise = await res.json();
      setExercises((cur) => [...cur, created]);
      setSetExerciseId(String(created.id));
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSet(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !currentWorkout) return;

    if (!setExerciseId) {
      setError("Please choose an exercise.");
      return;
    }

    const repsNumber = parseInt(setReps, 10);
    if (!repsNumber || repsNumber <= 0) {
      setError("Reps must be a positive number.");
      return;
    }

    const exerciseId = parseInt(setExerciseId, 10);
    const previousForExercise = workoutSets.filter(
      (s) => s.exercise === exerciseId
    );
    const nextSetNumber =
      previousForExercise.length > 0
        ? Math.max(...previousForExercise.map((s) => s.set_number)) + 1
        : 1;

    const weightValue = setWeight.trim() ? setWeight.trim() : null;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          workout: currentWorkout.id,
          exercise: exerciseId,
          set_number: nextSetNumber,
          reps: repsNumber,
          weight: weightValue,
          is_pr: setIsPr,
        }),
      });
      if (!res.ok) {
        setError("Failed to add set.");
        return;
      }
      const created: WorkoutSet = await res.json();
      setWorkoutSets([...workoutSets, created]);
      setSetExerciseId("");
      setSetReps("");
      setSetWeight("");
      setSetIsPr(false);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      <h1>Strengthy</h1>

      {!token ? (
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <h2>Login</h2>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </form>
      ) : (
        <>
          {view === "home" && (
            <>
              <h2>Welcome</h2>
              <button onClick={handleStartWorkout}>Start workout</button>
              <button
                onClick={() => {
                  loadWorkouts();
                  setView("history");
                }}
                style={{ marginLeft: "0.5rem" }}
              >
                View past workouts
              </button>
              <button onClick={() => setView("exercises")}>
                Manage exercises
              </button>
              <p style={{ marginTop: "1rem", opacity: 0.7 }}>
                Explore routines (coming soon)
              </p>
            </>
          )}

          {view === "exercises" && (
            <>
              <button onClick={() => setView("home")}> ← Back</button>
              <h2>Exercises</h2>

              <form
                onSubmit={handleAddExercise}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <input
                  placeholder="Exercise name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />

                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                >
                  <option value="" disabled>
                    Select muscle group
                  </option>
                  <option value="CHEST">Chest</option>
                  <option value="BACK">Back</option>
                  <option value="LEGS">Legs</option>
                  <option value="SHOULDERS">Shoulders</option>
                  <option value="ARMS">Arms</option>
                  <option value="CORE">Core</option>
                  <option value="OTHER">Other</option>
                </select>

                <textarea
                  placeholder="Description (optional)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                />

                <button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add exercise"}
                </button>
              </form>

              <button onClick={loadExercises} disabled={loading}>
                {loading ? "Loading..." : "Load exercises"}
              </button>

              {error && <p style={{ color: "red" }}>{error}</p>}

              <ul>
                {exercises.map((ex) => (
                  <li key={ex.id}>
                    <strong>{ex.name}</strong> – {ex.muscle_group}{" "}
                    {ex.description && <span>({ex.description})</span>}
                    <button
                      style={{ marginLeft: "0.5rem" }}
                      onClick={() => handleDeleteExercise(ex.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {view === "workout" && (
            <>
              <button onClick={() => setView("home")}> ← Back</button>
              <h2>Workout</h2>
              {currentWorkout ? (
                <>
                  <p>
                    Active workout for <strong>{currentWorkout.date}</strong>
                  </p>
                  {currentWorkout.name && <p>Name: {currentWorkout.name}</p>}
                  {currentWorkout.notes && <p>Notes: {currentWorkout.notes}</p>}
                  {exercises.length === 0 ? (
                    <p style={{ marginTop: "1rem" }}>
                      No exercises yet. Go to "Manage exercises" to add some,
                      then come back here to log sets.
                    </p>
                  ) : (
                    <>
                      <div style={{ marginTop: "0.5rem" }}>
                        <strong>Quick add common exercises:</strong>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.25rem",
                            marginTop: "0.25rem",
                          }}
                        >
                          {DEFAULT_EXERCISES.map((d) => (
                            <button
                              key={d.name}
                              onClick={() =>
                                handleQuickAddExercise(d.name, d.group)
                              }
                              style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.85rem",
                              }}
                            >
                              {d.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "0.6rem" }}>
                        <button
                          onClick={() => setShowLibrary((s) => !s)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.85rem",
                          }}
                        >
                          {showLibrary
                            ? "Close library"
                            : "Browse exercise library"}
                        </button>
                      </div>

                      {showLibrary && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <input
                            placeholder="Search library"
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            style={{ width: "100%", marginBottom: "0.5rem" }}
                          />
                          <div
                            style={{
                              maxHeight: 200,
                              overflowY: "auto",
                              border: "1px solid #eee",
                              padding: "0.25rem",
                            }}
                          >
                            {LIBRARY_EXERCISES.filter((it) =>
                              it.name
                                .toLowerCase()
                                .includes(librarySearch.toLowerCase())
                            ).map((it) => (
                              <div
                                key={it.name}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  padding: "0.25rem 0",
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{ width: 40, height: 40, background: '#0f1720', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Dumbbell />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{it.name}</div>
                                    <div style={{ marginTop: 6 }}>
                                      <span style={{ background: '#c2410c', color: '#fff', padding: '4px 8px', borderRadius: 9999, fontSize: '0.75rem', textTransform: 'lowercase' }}>{it.group.toLowerCase()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <button
                                    onClick={() =>
                                      handleQuickAddExercise(it.name, it.group)
                                    }
                                    style={{ padding: '8px 12px', background: '#fb923c', color: '#fff', border: 'none', borderRadius: 8 }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h3 style={{ marginTop: "1rem" }}>Add set</h3>
                      <form
                        onSubmit={handleAddSet}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <select
                          value={setExerciseId}
                          onChange={(e) => setSetExerciseId(e.target.value)}
                        >
                          <option value="" disabled>
                            Choose exercise
                          </option>
                          {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          placeholder="Reps"
                          value={setReps}
                          onChange={(e) => setSetReps(e.target.value)}
                        />

                        <input
                          type="number"
                          step="0.5"
                          placeholder="Weight"
                          value={setWeight}
                          onChange={(e) => setSetWeight(e.target.value)}
                        />

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={setIsPr}
                            onChange={(e) => setSetIsPr(e.target.checked)}
                          />
                          Personal record (PR)
                        </label>

                        <button type="submit" disabled={loading}>
                          {loading ? "Adding set..." : "Add set"}
                        </button>
                      </form>

                      <h3>Logged sets</h3>
                      {workoutSets.length === 0 ? (
                        <p>No sets logged yet.</p>
                      ) : (
                        <ul>
                          {workoutSets.map((s) => {
                            const exercise = exercises.find(
                              (ex) => ex.id === s.exercise
                            );
                            return (
                              <li key={s.id}>
                                <strong>
                                  {exercise
                                    ? exercise.name
                                    : `Exercise ${s.exercise}`}
                                </strong>{" "}
                                - Set {s.set_number}: {s.reps} reps
                                {s.weight && ` @ ${s.weight}`}
                                {s.is_pr && " (PR)"}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <div style={{ marginTop: "1rem" }}>
                        {currentWorkout.ended_at ? (
                          <p style={{ color: "green" }}>
                            Finished at{" "}
                            {new Date(currentWorkout.ended_at).toLocaleString()}
                          </p>
                        ) : (
                          <>
                            <p>
                              Timer:{" "}
                              <strong>
                                {Math.floor(elapsedSeconds / 60)}:
                                {String(elapsedSeconds % 60).padStart(2, "0")}
                              </strong>
                            </p>
                            <button onClick={finishWorkout} disabled={loading}>
                              {loading ? "Finishing..." : "Finish workout"}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p>No active workout. Go back and start one.</p>
              )}
            </>
          )}

          {view === "history" && (
            <>
              <button onClick={() => setView("home")}> ← Back</button>
              <h2>Past Workouts</h2>
              <button onClick={loadWorkouts} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
              {error && <p style={{ color: "red" }}>{error}</p>}
              <ul>
                {workoutsList.map((w) => (
                  <li key={w.id} style={{ marginBottom: "0.5rem" }}>
                    <strong>{w.name}</strong> — {w.date}{" "}
                    {w.ended_at
                      ? `(ended ${new Date(w.ended_at).toLocaleString()})`
                      : "(active)"}
                    <div
                      style={{
                        marginTop: "0.25rem",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        onClick={async () => {
                          setSelectedPastWorkout(w);
                          await loadSetsForWorkout(w.id);
                        }}
                      >
                        View details
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            !confirm(`Delete workout "${w.name}" on ${w.date}?`)
                          )
                            return;
                          await deleteWorkout(w.id);
                        }}
                        style={{ color: "red" }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {selectedPastWorkout && (
                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid #eee",
                    paddingTop: "0.5rem",
                  }}
                >
                  <h3>
                    Workout details — {selectedPastWorkout.name} (
                    {selectedPastWorkout.date})
                  </h3>
                  {pastWorkoutSets.length === 0 ? (
                    <p>No sets logged for this workout.</p>
                  ) : (
                    <ul>
                      {pastWorkoutSets.map((s) => {
                        const ex = exercises.find((e) => e.id === s.exercise);
                        return (
                          <li key={s.id}>
                            <strong>
                              {ex ? ex.name : `Exercise ${s.exercise}`}
                            </strong>{" "}
                            — Set {s.set_number}: {s.reps} reps{" "}
                            {s.weight && `@ ${s.weight}`} {s.is_pr && "(PR)"}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div style={{ marginTop: "0.5rem" }}>
                    <button
                      onClick={async () => {
                        if (!selectedPastWorkout) return;
                        if (
                          !confirm(
                            `Delete workout "${selectedPastWorkout.name}" on ${selectedPastWorkout.date}?`
                          )
                        )
                          return;
                        await deleteWorkout(selectedPastWorkout.id);
                      }}
                      style={{ color: "red" }}
                    >
                      Delete this workout
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
