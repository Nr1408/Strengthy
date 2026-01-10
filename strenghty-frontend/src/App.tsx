import React, { useState, useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics";

type Exercise = {
  import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter, Routes, Route } from "react-router-dom";
  import Index from "./pages/Index";
  import Auth from "./pages/Auth";
  import Dashboard from "./pages/Dashboard";
  import Exercises from "./pages/Exercises";
  import Workouts from "./pages/Workouts";
  import Routines from "./pages/Routines";
  import NewWorkout from "./pages/NewWorkout";
  import NotFound from "./pages/NotFound";

  const queryClient = new QueryClient();

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/workouts/new" element={<NewWorkout />} />
              <Route path="/routines" element={<Routines />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );

  export default App;
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
      try {
        triggerHaptic();
      } catch (e) {}
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
      try {
        triggerHaptic();
      } catch (e) {}
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
        import { Toaster } from "@/components/ui/toaster";
        import { Toaster as Sonner } from "@/components/ui/sonner";
        import { TooltipProvider } from "@/components/ui/tooltip";
        import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
        import { BrowserRouter, Routes, Route } from "react-router-dom";
        import Index from "./pages/Index";
        import Auth from "./pages/Auth";
        import Dashboard from "./pages/Dashboard";
        import Exercises from "./pages/Exercises";
        import Workouts from "./pages/Workouts";
        import Routines from "./pages/Routines";
        import NewWorkout from "./pages/NewWorkout";
        import NotFound from "./pages/NotFound";

        const queryClient = new QueryClient();

        const App = () => (
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <div className="dark">
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/exercises" element={<Exercises />} />
                    <Route path="/workouts" element={<Workouts />} />
                    <Route path="/workouts/new" element={<NewWorkout />} />
                    <Route path="/routines" element={<Routines />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </div>
            </TooltipProvider>
          </QueryClientProvider>
        );

        export default App;
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
                                <div style={{ fontSize: "0.9rem" }}>
                                  {it.name}
                                </div>
                                <div>
                                  <button
                                    onClick={() =>
                                      handleQuickAddExercise(it.name, it.group)
                                    }
                                    style={{ padding: "0.25rem 0.5rem" }}
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
