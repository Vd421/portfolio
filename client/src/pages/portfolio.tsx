import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Experience from "@/components/Experience";
import Education from "@/components/Education";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { apiRequest } from "@/lib/queryClient";

export default function Portfolio() {
  const [someData, setSomeData] = useState(null); // state to hold API data

  useEffect(() => {
    // Track portfolio view
    const trackPortfolioView = async () => {
      try {
        await apiRequest("POST", "/api/portfolio/view", {
          body: JSON.stringify({
            userAgent: navigator.userAgent,
            pageSection: "initial_load"
          }),
        });
      } catch (error) {
        console.log("Portfolio view tracking failed:", error);
      }
    };

    // Fetch example data from backend
    const fetchData = async () => {
      try {
        const res = await apiRequest("GET", "/api/your-endpoint");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSomeData(data);
      } catch (error) {
        console.error("Fetching API data failed:", error);
      }
    };

    setTimeout(() => {
      trackPortfolioView();
      fetchData();
    }, 1000);

    // Intersection observer for animations (existing code)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement;
          target.style.opacity = '1';
          target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Experience />
      <Education />
      <Contact />

      <section>
        <h2>Backend Data:</h2>
        {someData ? (
          <pre>{JSON.stringify(someData, null, 2)}</pre>
        ) : (
          <p>Loading backend data...</p>
        )}
      </section>

      <Footer />
    </div>
  );
}
