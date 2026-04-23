import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import HostPayments from "./HostPayments";

// ── Mock child components ────────────────────────────────────────────────────
jest.mock("../NavBar/Host_NavBar/HostNavbar", () => () => <div data-testid="host-navbar" />);
jest.mock("../NavBar/Footer/Footer",          () => () => <div data-testid="footer" />);

// ── Mock react-router-dom ────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}));

// ── Mock fetch globally ──────────────────────────────────────────────────────
global.fetch = jest.fn();

// ── Mock localStorage ────────────────────────────────────────────────────────
beforeEach(() => {
  Storage.prototype.getItem = jest.fn(() => "host_user_001");
  mockNavigate.mockClear();
  jest.clearAllMocks();
});

// ── Sample payment data ──────────────────────────────────────────────────────
const mockPayments = [
  {
    _id: "pay001",
    referenceCode: "REF-2026-001",
    status: "verified",
    listingType: "food",
    listing: "listing001",
    plan: "1m",
    amount: 299,
    daysAdded: 30,
    newExpireDate: "2026-05-23T00:00:00.000Z",
    createdAt: new Date().toISOString(),
    receiptUploadedAt: new Date().toISOString(),
    amountMatched: true,
    refMatched: true,
  },
  {
    _id: "pay002",
    referenceCode: "REF-2026-002",
    status: "pending",
    listingType: "accommodation",
    listing: "listing002",
    plan: "3m",
    amount: 799,
    daysAdded: 90,
    newExpireDate: "2026-07-23T00:00:00.000Z",
    createdAt: new Date().toISOString(),
    receiptUploadedAt: null,
  },
  {
    _id: "pay003",
    referenceCode: "REF-2026-003",
    status: "created",
    listingType: "food",
    listing: "listing003",
    plan: "6m",
    amount: 1499,
    daysAdded: 180,
    newExpireDate: "2026-10-23T00:00:00.000Z",
    createdAt: new Date().toISOString(),
    receiptUploadedAt: null,
  },
];

const mockFetchSuccess = (payments = mockPayments) => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ payments }),
    blob: async () => new Blob(),
  });
};

const renderHostPayments = async () => {
  let result;
  await act(async () => {
    result = render(
      <MemoryRouter>
        <HostPayments />
      </MemoryRouter>
    );
  });
  return result;
};

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Page Layout
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Page Layout", () => {

  test("renders Payment History title", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => expect(screen.getByText("Payment History")).toBeInTheDocument());
  });

  test("renders the Refresh button", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument());
  });

  test("renders navbar and footer", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    expect(screen.getByTestId("host-navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: Payment List
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Payment List", () => {

  test("renders all payment reference codes after loading", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => {
      expect(screen.getAllByText("REF-2026-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("REF-2026-002").length).toBeGreaterThan(0);
      expect(screen.getAllByText("REF-2026-003").length).toBeGreaterThan(0);
    });
  });

  test("shows correct payment count in title bar", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => expect(screen.getByText("3 payments")).toBeInTheDocument());
  });

  test("renders status badges correctly", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => {
      expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Verification Failed").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Awaiting Payment").length).toBeGreaterThan(0);
    });
  });

  test("shows empty state when no payments exist", async () => {
    mockFetchSuccess([]);
    await renderHostPayments();
    await waitFor(() => expect(screen.getByText("No payments yet")).toBeInTheDocument());
  });

  test("shows error message when fetch fails", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    await renderHostPayments();
    await waitFor(() => expect(screen.getByText(/failed to load payments/i)).toBeInTheDocument());
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Status Filter Tabs
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Status Filter Tabs", () => {

  test("renders all status filter tabs", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /awaiting/i })).toBeInTheDocument();
    });
  });

  test("clicking Verified tab filters to only verified payments", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-001"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^verified/i })); });
    await waitFor(() => {
      // Only REF-001 row should be in the left list panel
      const rows = document.querySelectorAll(".hp-row");
      expect(rows.length).toBe(1);
    });
  });

  test("clicking All tab shows all payments", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-001"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^verified/i })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^all/i })); });
    await waitFor(() => {
      expect(screen.getAllByText("REF-2026-001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("REF-2026-002").length).toBeGreaterThan(0);
    });
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: Search
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Search", () => {

  test("renders the search input", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => expect(screen.getByPlaceholderText(/search by reference/i)).toBeInTheDocument());
  });

  test("searching by reference code filters the list", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-001"));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/search by reference/i), { target: { value: "REF-2026-001" } });
    });
    await waitFor(() => {
      const rows = document.querySelectorAll(".hp-row");
      expect(rows.length).toBe(1);
    });
  });

  test("shows No matching payments when search finds nothing", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-001"));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/search by reference/i), { target: { value: "ZZZNOMATCH" } });
    });
    await waitFor(() => expect(screen.getByText("No matching payments")).toBeInTheDocument());
  });

  test("Clear filters button resets search", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-001"));
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText(/search by reference/i), { target: { value: "ZZZNOMATCH" } });
    });
    await waitFor(() => screen.getByText("Clear filters"));
    await act(async () => { fireEvent.click(screen.getByText("Clear filters")); });
    await waitFor(() => expect(screen.getAllByText("REF-2026-001").length).toBeGreaterThan(0));
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: Payment Detail Panel
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Payment Detail Panel", () => {

  test("shows Select a payment message when nothing is selected", async () => {
    mockFetchSuccess([]);
    await renderHostPayments();
    await waitFor(() => expect(screen.getByText("Select a payment to view details")).toBeInTheDocument());
  });

  test("clicking a payment row shows its details", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-002"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-002")[0]); });
    await waitFor(() => expect(screen.getAllByText("REF-2026-002").length).toBeGreaterThan(1));
  });

  test("Upload Receipt button is visible for pending payment", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-002"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-002")[0]); });
    await waitFor(() => expect(screen.getByRole("button", { name: /upload receipt/i })).toBeInTheDocument());
  });

  test("Cancel Payment button is visible for created payment", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-003"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-003")[0]); });
    await waitFor(() => expect(screen.getByRole("button", { name: /cancel payment/i })).toBeInTheDocument());
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: Cancel Payment Flow
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Cancel Payment", () => {

  test("clicking Cancel Payment opens confirmation modal", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-003"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-003")[0]); });
    await waitFor(() => screen.getByRole("button", { name: /cancel payment/i }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /cancel payment/i })); });
    await waitFor(() => expect(screen.getByText("Cancel Payment?")).toBeInTheDocument());
  });

  test("Keep It button closes the cancel modal", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-003"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-003")[0]); });
    await waitFor(() => screen.getByRole("button", { name: /cancel payment/i }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /cancel payment/i })); });
    await waitFor(() => screen.getByText("Keep It"));
    await act(async () => { fireEvent.click(screen.getByText("Keep It")); });
    await waitFor(() => expect(screen.queryByText("Cancel Payment?")).not.toBeInTheDocument());
  });

  test("confirming cancel removes payment from the list", async () => {
    // Provide enough mock responses for all fetch calls:
    // 1st = load payments, 2nd-4th = listing info fetches, 5th = cancel endpoint
    const paymentsResponse = { ok: true, json: async () => ({ payments: mockPayments }) };
    const listingResponse  = { ok: true, json: async () => ({ data: { kitchenName: "Test", iconImage: null } }) };
    const cancelResponse   = { ok: true, json: async () => ({}) };
    global.fetch
      .mockResolvedValueOnce(paymentsResponse)
      .mockResolvedValueOnce(listingResponse)
      .mockResolvedValueOnce(listingResponse)
      .mockResolvedValueOnce(listingResponse)
      .mockResolvedValueOnce(cancelResponse);

    await renderHostPayments();
    await waitFor(() => screen.getAllByText("REF-2026-003"));
    await act(async () => { fireEvent.click(screen.getAllByText("REF-2026-003")[0]); });
    await waitFor(() => screen.getByRole("button", { name: /cancel payment/i }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /cancel payment/i })); });
    await waitFor(() => screen.getByText("Yes, Cancel"));
    await act(async () => { fireEvent.click(screen.getByText("Yes, Cancel")); });
    await waitFor(() => {
      const rows = document.querySelectorAll(".hp-row");
      expect(rows.length).toBeLessThan(3);
    }, { timeout: 3000 });
  });

});

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITE 7: Refresh
// ────────────────────────────────────────────────────────────────────────────
describe("HostPayments - Refresh", () => {

  test("clicking Refresh triggers a new fetch", async () => {
    mockFetchSuccess();
    await renderHostPayments();
    await waitFor(() => screen.getByText("Payment History"));
    const callsBefore = global.fetch.mock.calls.length;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    });
    await waitFor(() => expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
  });

});