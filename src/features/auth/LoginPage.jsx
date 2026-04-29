import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import useUIStore from "../../store/uiStore";
import { Button, Input } from "../../ui";
import { loginSchema } from "../../schemas/auth";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const { login, isLoading } = useAuth();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      addToast(err.message || "Login failed", "error");
    }
  };

  const fillDemoCredentials = () => {
    setValue("email", "demo@authentiscan.io", { shouldValidate: true });
    setValue("password", "Demo1234!", { shouldValidate: true });
  };

  return (
    <>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your forensic workspace</p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Email"
          id="login-email"
          type="email"
          placeholder=""
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          id="login-password"
          type={showPwd ? "text" : "password"}
          placeholder=""
          icon={Lock}
          error={errors.password?.message}
          {...register("password")}
          rightElement={
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPwd((v) => !v)}
              aria-label="Toggle password visibility"
              style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--accent-muted)', cursor: 'pointer' }}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />

        <div className="auth-form-actions">
          <Link to="/auth/forgot-password" className="auth-link-sm">Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isLoading} className="auth-submit">
          Sign In
        </Button>

        <div className="auth-divider"><span>or</span></div>

        <button
          type="button"
          className="auth-demo-btn"
          onClick={fillDemoCredentials}
        >
          Use Demo Credentials
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account?{" "}
        <Link to="/auth/signup" className="auth-link">Create one</Link>
      </p>
    </>
  );
}
