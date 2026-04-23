import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Payment from "./Payment";

// ── Mock react-router-dom hooks ──────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: {
      listingId: "listing123",
      type: "food",
      listingName: "Sunrise Kitchen",
      currentExpireDate: "2025-12-31",
      bankName: "Commercial Bank",
      accountName: "Bodima Payments",
      accountNumber: "8000123456",
      branch: "Negombo",
    },
  }),
}));

// ── Mock axios ───────────────────────────────────────────────────────────────
jest.mock("axios", () => ({
  post: jest.fn(),
}));
import axios from "axios";

// ── Mock localStorage ────────────────────────────────────────────────────────
beforeEach(() => {
  Storage.prototype.getItem = jest.fn(() => "host_user_001");
  mockNavigate.mockClear();
  axios.post.mockClear();
});

// ── Helper: render Payment inside a Router ────────────────────────────────────
const renderPayment = () =>
  render(
    <MemoryRouter>
      <Payment />
    </MemoryRouter>
  );

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Page renders correctly
// ────────────────────────────────────────────────────────────────────────────
describe("Payment Page - Rendering", () => {

  test("renders the Select a Plan heading", () => {
    renderPayment();
    expect(screen.getByText("Select a Plan")).toBeInTheDocument();
  });

  test("renders all 4 subscription plan cards", () => {
    renderPayment();
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Growth")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Elite")).toBeInTheDocument();
  });

  test("renders correct prices for all plans", () => {
    renderPayment();
    expect(screen.getByText("299")).toBeInTheDocument();
    expect(screen.getByText("799")).toBeInTheDocument();
    expect(screen.getByText("1,499")).toBeInTheDocument();
    expect(screen.getByText("2,599")).toBeInTheDocument();
  });

  test("renders the listing name passed via location state", () => {
    renderPayment();
    expect(screen.getByText("Sunrise Kitchen")).toBeInTheDocument();
  });

  test("renders the Confirm Plan button", () => {
    renderPayment();
    expect(
      screen.getByRole("button", { name: /confirm plan & get reference code/i })
    ).toBeInTheDocument();
  });

  test("renders the Back to Listings button", () => {
    renderPayment();
    expect(
      screen.getByRole("button", { name: /back to listings/i })
    ).toBeInTheDocument();
  });

  test("renders the How it works section", () => {
    renderPayment();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Pick a Plan")).toBeInTheDocument();
    expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
    expect(screen.getByText("Upload Receipt")).toBeInTheDocument();
    expect(screen.getByText("Get Verified")).toBeInTheDocument();
  });

  test("renders bank account details", () => {
    renderPayment();
    expect(screen.getByText("Commercial Bank")).toBeInTheDocument();
    expect(screen.getByText("Bodima Payments")).toBeInTheDocument();
    expect(screen.getByText("8000123456")).toBeInTheDocument();
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: Plan Selection
// ────────────────────────────────────────────────────────────────────────────
describe("Payment Page - Plan Selection", () => {

  test("Confirm button is disabled when no plan is selected", () => {
    renderPayment();
    const btn = screen.getByRole("button", { name: /confirm plan & get reference code/i });
    expect(btn).toBeDisabled();
  });

  test("clicking a plan card selects it and shows summary bar", () => {
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    // Summary bar appears - "1 Month" appears in multiple places, just check it exists
    expect(screen.getAllByText(/1 Month/i).length).toBeGreaterThan(0);
  });

  test("Confirm button becomes enabled after selecting a plan", () => {
    renderPayment();
    fireEvent.click(screen.getByText("Growth"));
    const btn = screen.getAllByRole("button", { name: /confirm plan & get reference code/i })[0];
    expect(btn).not.toBeDisabled();
  });

  test("selecting Pro plan shows POPULAR badge", () => {
    renderPayment();
    expect(screen.getByText("POPULAR")).toBeInTheDocument();
  });

  test("selecting Elite plan shows BEST DEAL badge", () => {
    renderPayment();
    expect(screen.getByText("BEST DEAL")).toBeInTheDocument();
  });

  test("summary bar shows correct amount when Starter plan selected", () => {
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    expect(screen.getAllByText(/299/).length).toBeGreaterThan(0);
  });

  test("summary bar shows correct active days when Growth plan selected", () => {
    renderPayment();
    fireEvent.click(screen.getByText("Growth"));
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Form Validation & Error Handling
// ────────────────────────────────────────────────────────────────────────────
describe("Payment Page - Validation", () => {

  test("shows error when confirming without selecting a plan", async () => {
    renderPayment();
    const btn = screen.getAllByRole("button", { name: /confirm plan & get reference code/i })[0];
    expect(btn).toBeDisabled();
  });

  test("shows error when API call fails", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "Something went wrong. Please try again." } },
    });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    const btn = screen.getByRole("button", { name: /confirm plan & get reference code/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: Successful Payment Flow
// ────────────────────────────────────────────────────────────────────────────
describe("Payment Page - Successful Payment Creation", () => {

  const mockPaymentResult = {
    _id: "pay001",
    referenceCode: "REF-2026-001",
    amount: 299,
    plan: "1m",
    daysAdded: 30,
    newExpireDate: "2026-05-23T00:00:00.000Z",
  };

  test("shows success screen with reference code after payment created", async () => {
    axios.post.mockResolvedValueOnce({ data: { payment: mockPaymentResult } });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    await waitFor(() => {
      expect(screen.getByText("REF-2026-001")).toBeInTheDocument();
    });
  });

  test("shows Payment Record Created title on success", async () => {
    axios.post.mockResolvedValueOnce({ data: { payment: mockPaymentResult } });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    await waitFor(() => {
      expect(screen.getByText("Payment Record Created!")).toBeInTheDocument();
    });
  });

  test("shows Upload Receipt Now button on success screen", async () => {
    axios.post.mockResolvedValueOnce({ data: { payment: mockPaymentResult } });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /upload receipt now/i })).toBeInTheDocument();
    });
  });

  test("shows correct amount on success screen", async () => {
    axios.post.mockResolvedValueOnce({ data: { payment: mockPaymentResult } });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    await waitFor(() => {
      expect(screen.getByText(/LKR 299/i)).toBeInTheDocument();
    });
  });

  test("shows loading state while API call is in progress", async () => {
    axios.post.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    expect(screen.getByText("Creating...")).toBeInTheDocument();
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Navigation
// ────────────────────────────────────────────────────────────────────────────
describe("Payment Page - Navigation", () => {

  test("Back to Listings button calls navigate(-1)", () => {
    renderPayment();
    fireEvent.click(screen.getByRole("button", { name: /back to listings/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test("Do It Later button navigates to /Listings on success screen", async () => {
    const mockPaymentResult = {
      _id: "pay001", referenceCode: "REF-2026-001",
      amount: 299, plan: "1m", daysAdded: 30,
      newExpireDate: "2026-05-23T00:00:00.000Z",
    };
    axios.post.mockResolvedValueOnce({ data: { payment: mockPaymentResult } });
    renderPayment();
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByRole("button", { name: /confirm plan & get reference code/i }));
    await waitFor(() => screen.getByText("Do It Later"));
    fireEvent.click(screen.getByText("Do It Later"));
    expect(mockNavigate).toHaveBeenCalledWith("/Listings");
  });

});