import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import useUIStore from "../../store/uiStore";
import { Button, Input } from "../../ui";
import { registerSchema } from "../../schemas/auth";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const [showPwd, setShowPwd] = useState(false);
  const { register: registerAuth, isLoading } = useAuth();
  const { addToast } = useUIStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data) => {
    try {
      await registerAuth(data.name.trim(), data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      addToast(err.message || "Registration failed", "error");
    }
  };

  const password = useWatch({ control, name: "password", defaultValue: "" });
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthClass = ["", "strength-weak", "strength-good", "strength-strong"][strength];

  return (
    <>
      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Start your forensic intelligence workspace</p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Full Name"
          id="signup-name"
          type="text"
          placeholder="John Doe"
          icon={User}
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email"
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />

        <div style={{ position: "relative" }}>
          <Input
            label="Password"
            id="signup-password"
            type={showPwd ? "text" : "password"}
            placeholder="Min. 8 characters"
            icon={Lock}
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            className="input-icon-right"
            style={{ position: 'absolute', right: 10, top: 32 }}
            onClick={() => setShowPwd((v) => !v)}
            aria-label="Toggle password visibility"
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {password && (
          <div className="strength-bar-wrap">
            <div className={`strength-bar ${strengthClass}`} style={{ width: `${(strength / 3) * 100}%` }} />
            <span className={`strength-label ${strengthClass}`}>{strengthLabel}</span>
          </div>
        )}

        <Input
          label="Confirm Password"
          id="signup-confirm"
          type={showPwd ? "text" : "password"}
          placeholder="Repeat password"
          icon={Lock}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" variant="primary" size="lg" loading={isLoading} className="auth-submit">
          Create Account
        </Button>
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <Link to="/auth/login" className="auth-link">Sign in</Link>
      </p>
    </>
  );
}
