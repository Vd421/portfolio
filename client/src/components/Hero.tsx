import { User, Download } from "lucide-react";

export default function Hero() {
  const handleScrollTo = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const offsetTop = element.offsetTop - 64;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="hero" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="animate-fade-in">
          {/* Professional developer headshot placeholder */}
          <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl animate-float">
            <User className="text-white text-4xl sm:text-5xl" size={60} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-slide-up">
            Hi, I'm <span className="text-blue-400">Vaibhav Dhir</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/80 mb-8 max-w-3xl mx-auto animate-slide-up">
            EEE undergrad focused on AI/ML and intelligent systems
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <button 
              onClick={() => handleScrollTo('projects')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              View My Work
            </button>
            <button 
              onClick={() => handleScrollTo('contact')}
              className="border border-blue-400 text-blue-400 px-8 py-3 rounded-lg font-semibold hover:bg-blue-400 hover:text-white transition-all duration-300 hover:scale-105"
            >
              Get In Touch
            </button>
            <button 
              onClick={() => {
                // Create a downloadable resume (placeholder)
                const link = document.createElement('a');
                link.href = '/resume.pdf'; // This would be a real resume file
                link.download = 'Vaibhav_Dhir_Resume.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="border border-white/40 text-white/80 px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Download Resume
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
