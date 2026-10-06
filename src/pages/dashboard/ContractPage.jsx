import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowRight, FiPrinter } from "react-icons/fi";
import { company } from "../../config/company";
import { contractTemplate } from "../../content/contractTemplate";
import { getBooking } from "../../dashboard/features/bookings/bookingsApi";
import ContractDocument from "../../dashboard/features/contract/ContractDocument";
import {
  buildContract,
  buildContractData,
} from "../../dashboard/features/contract/contractRenderer";
import "../../dashboard/dashboard.css";
import "../../dashboard/features/contract/contract.css";

// The printable contract for one booking, at /dashboard/bookings/:id/contract.
// It sits outside DashboardLayout on purpose: no sidebar or topbar exists
// on this page, so printing only ever contains the contract (the toolbar
// is marked .no-print and hidden by contract.css).
export default function ContractPage() {
  const { id } = useParams();
  const [state, setState] = useState({ id: null, booking: null, error: "" });

  // The page is Arabic RTL; the document title becomes the suggested file
  // name when saving as PDF.
  useEffect(() => {
    const root = document.documentElement;
    const previous = { lang: root.lang, dir: root.dir, title: document.title };
    root.lang = "ar";
    root.dir = "rtl";
    return () => {
      root.lang = previous.lang;
      root.dir = previous.dir;
      document.title = previous.title;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBooking(id)
      .then((booking) => {
        if (cancelled) return;
        document.title = `عقد رقم ${booking.contract_number}`;
        setState({ id, booking, error: "" });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ id, booking: null, error: error.message ?? "تعذّر تحميل الحجز" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loaded = state.id === id;
  const contract = useMemo(
    () =>
      state.booking
        ? buildContract(contractTemplate, buildContractData({ booking: state.booking, company }))
        : null,
    [state.booking],
  );

  // Wait for the Arabic web font so the printout doesn't use a fallback.
  const handlePrint = async () => {
    try {
      await document.fonts.ready;
    } catch {
      // Printing still works with whatever font is loaded.
    }
    window.print();
  };

  return (
    <div className="contract-page">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-primary"
        >
          <FiArrowRight aria-hidden="true" />
          العودة إلى الحجوزات
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!contract}
          className="btn btn-primary disabled:opacity-60"
        >
          <FiPrinter aria-hidden="true" />
          طباعة
        </button>
      </div>

      {!loaded ? (
        <p className="no-print text-center text-sm text-ink-soft">جارٍ التحميل…</p>
      ) : state.error ? (
        <p className="no-print text-center text-sm font-semibold text-red-600">{state.error}</p>
      ) : (
        <ContractDocument contract={contract} />
      )}
    </div>
  );
}
