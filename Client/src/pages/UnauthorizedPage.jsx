import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/api/http";
import { queryClient } from "@/api/http";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Even if the server call fails, still clear local state and redirect
      console.error("Logout failed:", err);
    } finally {
      queryClient.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-rose-500/10 border border-rose-500/20 p-4">
            <ShieldAlert className="h-10 w-10 text-rose-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-950">
            Access denied
          </h1>
          <p className="text-sm text-slate-500">
            You don't have permission to view this page. If you think this is a
            mistake, contact your administrator.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="neon" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
