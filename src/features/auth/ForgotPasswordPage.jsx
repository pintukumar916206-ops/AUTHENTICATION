import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "../../ui";
import { api } from "../../services/api";
import { forgotPasswordSchema } from "../../schemas/auth";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    setApiError("");
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: data.email });
      setSent(true);
    } catch (err) {
      setApiError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-success-state">
        <CheckCircle size={48} className="auth-success-icon" />
        <h2 className="auth-title">Check your inbox</h2>
        <p className="auth-subtitle">If that email is registered, you&apos;ll receive a reset link shortly.</p>
        <Link to="/auth/login" className="auth-link">Back to login</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-subtitle">Enter your email and we&apos;ll send a reset link</p>

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Email"
          id="forgot-email"
          type="email"
          placeholder="you@example.com"
          icon={Mail}
          error={errors.email?.message || apiError}
          {...register("email")}
        />

        <Button type="submit" variant="primary" size="lg" loading={loading} className="auth-submit">
          Send Reset Link
        </Button>
      </form>

      <p className="auth-switch">
        <Link to="/auth/login" className="auth-link" style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: 'center' }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
      </p>
    </>
  );
}
