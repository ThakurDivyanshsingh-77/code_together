import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Loader2, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email address");

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  color: number;
}

interface ManageCollaboratorsDialogProps {
  projectId: string;
  projectOwnerId: string;
  trigger?: React.ReactNode;
}

export const ManageCollaboratorsDialog: React.FC<ManageCollaboratorsDialogProps> = ({
  projectId,
  projectOwnerId,
  trigger,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = user?.id === projectOwnerId;

  const fetchCollaborators = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await apiRequest<Collaborator[]>(`/projects/${projectId}/collaborators`);
      setCollaborators(data || []);
    } catch {
      toast.error("Failed to load collaborators");
    } finally {
      setLoadingList(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) fetchCollaborators();
  }, [open, fetchCollaborators]);

  const handleInvite = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setInviting(true);
    try {
      await apiRequest(`/projects/${projectId}/collaborators`, {
        method: "POST",
        body: {
          email: parsed.data,
          role,
        },
      });

      toast.success("Collaborator added!");
      setEmail("");
      setRole("editor");
      fetchCollaborators();
    } catch (error) {
      toast.error((error as Error).message || "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    try {
      await apiRequest(`/projects/${projectId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
      });

      setCollaborators((prev) => prev.filter((collaborator) => collaborator.id !== collaboratorId));
      toast.success("Collaborator removed");
    } catch {
      toast.error("Failed to remove collaborator");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="w-4 h-4" />
            Collaborators
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
        </DialogHeader>

        {isOwner && (
          <div className="space-y-3 mt-4">
            <label className="text-sm font-medium">Invite by email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="flex-1"
              />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} size="icon" disabled={inviting}>
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <div className="space-y-2">
          <label className="text-sm font-medium">Members ({collaborators.length + 1})</label>

          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                style={{ backgroundColor: "hsl(var(--primary))" }}
              >
                <Crown className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Owner</span>
            </div>
            <Badge variant="secondary">Owner</Badge>
          </div>

          {loadingList ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No collaborators yet</p>
          ) : (
            collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                    style={{
                      backgroundColor: `hsl(var(--user-${collaborator.color}))`,
                    }}
                  >
                    {collaborator.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{collaborator.display_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {collaborator.role}
                  </Badge>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(collaborator.id)}
                      disabled={removingId === collaborator.id}
                    >
                      {removingId === collaborator.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
