import Layout from "../components/layout/Layout";
import LandingPage from "./LandingPage";
import {
  brand,
  navbar,
  footer,
  contact,
  social,
  termsAndPrivacy,
} from "../content/content";

// The public marketing site — everything that existed before the admin
// dashboard was added, moved out of App.jsx unchanged so the router can
// mount it at "/" alongside the new /login and /dashboard routes.
export default function PublicSite() {
  return (
    <Layout
      brand={brand}
      navbar={navbar}
      footer={footer}
      contact={contact}
      social={social}
      termsAndPrivacy={termsAndPrivacy}
    >
      <LandingPage />
    </Layout>
  );
}
