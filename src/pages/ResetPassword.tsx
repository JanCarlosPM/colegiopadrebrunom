import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleUpdatePassword = async () => {
    if (!password) {
      toast.error("Ingrese nueva contraseña");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error("Error al actualizar contraseña");
      return;
    }

    toast.success("Contraseña actualizada correctamente");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">Nueva Contraseña</h2>
        <Input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button onClick={handleUpdatePassword} className="w-full">
          Actualizar contraseña
        </Button>
      </div>
    </div>
  );
}
