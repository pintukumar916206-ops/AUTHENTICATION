import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import LoginPage from "../features/auth/LoginPage";
import Badge from "../shared/Badge";
import Button from "../shared/Button";

vi.mock("../store/authStore", () => ({
  default: vi.fn(() => ({
    user: null, token: null, isLoading: false, isInitialized: true,
    login: vi.fn(), register: vi.fn(), logout: vi.fn(), fetchMe: vi.fn(),
  })),
}));

vi.mock("../store/uiStore", () => ({
  default: vi.fn(() => ({ addToast: vi.fn() })),
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const Wrapper = ({ children }) => (
  <QueryClientProvider client={qc}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("Badge component", () => {
  it("renders GENUINE badge", () => {
    render(<Badge verdict="GENUINE" />);
    expect(screen.getByText("GENUINE")).toBeInTheDocument();
  });

  it("renders FAKE badge", () => {
    render(<Badge verdict="FAKE" />);
    expect(screen.getByText("FAKE")).toBeInTheDocument();
  });

  it("renders SUSPICIOUS badge", () => {
    render(<Badge verdict="SUSPICIOUS" />);
    expect(screen.getByText("SUSPICIOUS")).toBeInTheDocument();
  });
});

describe("Button component", () => {
  it("renders primary button", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("shows spinner when loading", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("LoginPage", () => {
  it("renders login form fields", () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", async () => {
    render(<LoginPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it("fills demo credentials", () => {
    render(<LoginPage />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText(/use demo credentials/i));
    expect(screen.getByLabelText(/email/i).value).toBe("demo@authentiscan.io");
  });
});
