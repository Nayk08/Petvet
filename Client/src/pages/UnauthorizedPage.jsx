import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-rose-500/10 border border-rose-500/20 p-4">
            <ShieldAlert className="h-10 w-10 text-rose-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">
            Access denied
          </h1>
          <p className="text-sm text-slate-400">
            You don't have permission to view this page. If you think this is a
            mistake, contact your administrator.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="neon" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
