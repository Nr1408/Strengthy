import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, Clock } from "lucide-react";

export default function DashboardMock() {
  const mockRoutines = [
    {
      id: "r1",
      title: "Shoulder Arms",
      items: [
        "Dumbbell Shoulder Press",
        "Machine Lateral Raise",
        "Preacher Curl Machine",
        "Dumbbell Hammer Curl",
      ],
      sets: 6,
      exercises: 6,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6 text-white">
      <div className="max-w-md mx-auto">
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <svg
                  className="h-4 w-4 text-primary-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-lg font-semibold">Strenghty</div>
            </div>
            <div className="h-8 w-8 rounded-full bg-muted/20" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Streak</div>
              <div className="text-lg font-semibold mt-1">12 days</div>
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">This Week</div>
              <div className="text-lg font-semibold mt-1">5 workouts</div>
            </div>
            <div className="rounded-md bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">PRs</div>
              <div className="text-lg font-semibold mt-1">3 new</div>
            </div>
          </div>

          <div className="space-y-3">
            {mockRoutines.map((r) => (
              <Card key={r.id} className="bg-card/80 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{r.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {r.exercises} exercises · {r.sets} sets
                      </div>
                    </div>
                    <Button variant="ghost">Start</Button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.items.slice(0, 4).map((it) => (
                      <div
                        key={it}
                        className="rounded-full bg-muted/20 px-3 py-1 text-xs"
                      >
                        {it}
                      </div>
                    ))}
                    <div className="rounded-full bg-muted/20 px-3 py-1 text-xs">
                      +2 more
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* PR toast mock */}
        <div className="fixed right-8 bottom-8 w-64">
          <div className="rounded-lg border border-border bg-neutral-900/95 p-4 shadow-lg flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center text-black">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">New PR!</div>
              <div className="text-sm text-muted-foreground">
                Barbell Press 225 lbs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
