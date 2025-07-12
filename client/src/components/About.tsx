export default function About() {
  return (
    <section id="about" className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">About Me</h2>
          <div className="w-20 h-1 bg-blue-400 mx-auto rounded-full"></div>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="glossy-card card-3d rounded-2xl p-8 sm:p-12">
            <p className="text-lg text-white/90 leading-relaxed">
              Electrical and Electronics Engineering student at VIT Chennai with a passion for artificial intelligence and machine learning. 
              I specialize in developing intelligent systems that solve real-world problems through innovative algorithms and cutting-edge technology. 
              My journey involves continuous learning and applying theoretical concepts to practical applications, always striving to create 
              performance-driven systems that make a meaningful impact. I believe in the power of technology to transform lives and am 
              committed to contributing to this transformation through my work in AI and ML.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
