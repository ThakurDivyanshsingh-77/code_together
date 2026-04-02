import React, { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email address");

interface InviteCollaboratorDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export const InviteCollaboratorDialog: React.FC<InviteCollaboratorDialogProps> = ({
  projectId,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (loading) return;

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Please enter a valid email address");
      return;
    }

    const normalizedEmail = parsed.data.toLowerCase();

    setLoading(true);
    try {
      await apiRequest(`/projects/${projectId}/collaborators`, {
        method: "POST",
        body: {
          email: normalizedEmail,
          role,
        },
      });

      toast.success("Collaborator invited successfully!");
      setEmail("");
      setRole("editor");
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to invite collaborator";
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes("already")) {
        toast.error("This user is already a collaborator");
      } else if (normalizedMessage.includes("only the project owner")) {
        toast.error("Only the project owner can invite collaborators");
      } else if (normalizedMessage.includes("no user found")) {
        toast.error("No account found with this email. Ask them to sign up first.");
      } else {
        toast.error(message || "Failed to invite collaborator");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Email Address</label>
            <Input
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleInvite()}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} className="w-full gap-2" disabled={loading || !email.trim()}>
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Send Invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
