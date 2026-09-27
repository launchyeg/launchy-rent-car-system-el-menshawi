import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiMenu, FiPhone, FiX } from "react-icons/fi";
import { LuUserRound } from "react-icons/lu";
import Brand from "./Brand";
export default function Navbar({ brand, links, contactCta }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <motion.header
      className="sticky top-0 z-[100] border-b border-border-soft bg-white"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="wrap flex h-[76px] items-center justify-between gap-6">
        <Brand {...brand} />

        <nav
          className="hidden items-center gap-8 min-[900px]:flex"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-normal text-ink transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={contactCta.href}
            className="btn btn-primary hidden min-[900px]:inline-flex"
          >
            {contactCta.label}
            <FiPhone aria-hidden="true" />
          </a>
          <Link
            to="/login"
            className="hidden h-10.5 w-10.5 items-center justify-center rounded-full border border-border hover:border-ink transition-colors text-ink min-[900px]:inline-flex"
            aria-label="Admin login"
          >
            <LuUserRound aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={`inline-flex h-10.5 w-10.5 items-center justify-center rounded-full border text-lg transition-colors min-[900px]:hidden ${
              isOpen ? "border-ink text-ink" : "border-border-soft text-ink"
            }`}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? (
              <FiX aria-hidden="true" />
            ) : (
              <FiMenu aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-110 bg-ink/50 min-[900px]:hidden"
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.nav
              className="fixed inset-y-0 right-0 z-120 flex w-4/5 max-w-xs flex-col overflow-y-auto border-l border-border-soft bg-white min-[900px]:hidden"
              aria-label="Mobile"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-19 items-center justify-between border-b border-border-soft px-5">
                <Brand {...brand} />
                <button
                  type="button"
                  className="inline-flex h-10.5 w-10.5 items-center justify-center rounded-full border border-border-soft text-lg text-ink transition-colors hover:border-ink"
                  aria-label="Close menu"
                  onClick={() => setIsOpen(false)}
                >
                  <FiX aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-1 px-5 pt-4 pb-6">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="border-b border-border-soft py-3 text-base font-semibold text-ink"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href={contactCta.href}
                  className="btn btn-primary mt-4 w-full"
                  onClick={() => setIsOpen(false)}
                >
                  {contactCta.label}
                  <FiPhone aria-hidden="true" />
                </a>
                <Link
                  to="/login"
                  className="btn btn-outline mt-2 w-full"
                  onClick={() => setIsOpen(false)}
                >
                  Admin
                  <LuUserRound aria-hidden="true" />
                </Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
