import { CheckoutSimulator } from "../components/CheckoutSimulator.tsx";
import { EvidenceGallery } from "../components/EvidenceGallery.tsx";
import { Footer } from "../components/Footer.tsx";
import { Header } from "../components/Header.tsx";
import { Hero } from "../components/Hero.tsx";
import { Limitations } from "../components/Limitations.tsx";
import { Workflow } from "../components/Workflow.tsx";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <CheckoutSimulator />
        <EvidenceGallery />
        <Workflow />
        <Limitations />
      </main>
      <Footer />
    </>
  );
}
