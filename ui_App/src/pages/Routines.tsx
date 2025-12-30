import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { RoutineCard } from '@/components/workout/RoutineCard';
import { mockRoutines } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Routines() {
  const [routines] = useState(mockRoutines);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newRoutine, setNewRoutine] = useState({
    name: '',
    description: '',
  });

  const handleCreateRoutine = () => {
    if (!newRoutine.name) {
      toast({
        title: 'Missing fields',
        description: 'Please enter a routine name.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Routine created!',
      description: `${newRoutine.name} has been added to your routines.`,
    });
    setNewRoutine({ name: '', description: '' });
    setIsDialogOpen(false);
  };

  const handleStartRoutine = (routineId: string) => {
    toast({
      title: 'Starting workout...',
      description: 'Your workout has been created from the routine.',
    });
    navigate('/workouts/new');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-white">Routines</h1>
            <p className="text-muted-foreground">
              {routines.length} routine{routines.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                New Routine
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Routine</DialogTitle>
                <DialogDescription>
                  Create a reusable workout template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Routine Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Push Day, Upper Body"
                    value={newRoutine.name}
                    onChange={(e) =>
                      setNewRoutine({ ...newRoutine, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this routine focus on?"
                    value={newRoutine.description}
                    onChange={(e) =>
                      setNewRoutine({ ...newRoutine, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className='text-white'>
                  Cancel
                </Button>
                <Button onClick={handleCreateRoutine}>Create Routine</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Routine Grid */}
        {routines.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onStart={() => handleStartRoutine(routine.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-heading font-semibold">No routines yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first routine to save time
            </p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Routine
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
