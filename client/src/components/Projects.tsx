import { Bot, Zap, Eye, Leaf, Flame, Plus, ArrowRight, Github } from "lucide-react";

export default function Projects() {
  const projects = [
    {
      title: "Replika-Style AI Chatbot",
      icon: <Bot className="text-blue-400 text-2xl" />,
      technologies: ["GPT", "Flask", "DALL·E"],
      description: "Advanced conversational AI chatbot with persistent memory capabilities and integrated image generation features, providing personalized user interactions through natural language processing.",
      techBg: "bg-blue-900/30",
      techText: "text-blue-300",
      githubLink: "https://github.com/vaibhavdhir/replika-chatbot"
    },
    {
      title: "Soccer Player Tracker",
      icon: <Zap className="text-emerald-400 text-2xl" />,
      technologies: ["YOLOv8", "Re-ID"],
      description: "Real-time player tracking system for soccer match analysis using advanced computer vision techniques and re-identification algorithms to maintain player identity across frames.",
      techBg: "bg-emerald-900/30",
      techText: "text-emerald-300",
      githubLink: "https://github.com/vaibhavdhir/soccer-player-tracker"
    },
    {
      title: "AI Blind Stick",
      icon: <Eye className="text-purple-400 text-2xl" />,
      technologies: ["Ultrasonic", "Pathfinding"],
      description: "Intelligent navigation aid for visually impaired individuals using ultrasonic sensors and AI-powered pathfinding algorithms, achieving 90% accuracy in obstacle detection and route optimization.",
      techBg: "bg-purple-900/30",
      techText: "text-purple-300",
      githubLink: "https://github.com/vaibhavdhir/ai-blind-stick"
    },
    {
      title: "Crop/Weed Detector",
      icon: <Leaf className="text-yellow-400 text-2xl" />,
      technologies: ["YOLOv3", "OpenCV", "Tkinter"],
      description: "Precision agriculture solution for automated crop and weed identification using deep learning models, featuring an intuitive GUI interface and achieving 98% detection accuracy.",
      techBg: "bg-yellow-900/30",
      techText: "text-yellow-300",
      githubLink: "https://github.com/vaibhavdhir/crop-weed-detector"
    },
    {
      title: "Arduino Fire Fighter Bot",
      icon: <Flame className="text-red-400 text-2xl" />,
      technologies: ["AI", "Sensors", "Arduino"],
      description: "Autonomous fire detection and suppression robot integrating AI algorithms with sensor fusion technology, capable of 95% accurate fire detection and automated response mechanisms.",
      techBg: "bg-red-900/30",
      techText: "text-red-300",
      githubLink: "https://github.com/vaibhavdhir/arduino-fire-fighter"
    }
  ];

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

  const trackProjectInteraction = async (projectName: string, interactionType: string) => {
    try {
      await fetch("/api/projects/interaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectName,
          interactionType,
          ipAddress: null, // This would be set by the server
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.log("Analytics tracking failed:", error);
    }
  };

  const handleGithubClick = async (projectName: string, githubLink: string) => {
    await trackProjectInteraction(projectName, 'github_click');
    window.open(githubLink, '_blank');
  };

  return (
    <section id="projects" className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Featured Projects</h2>
          <div className="w-20 h-1 bg-blue-400 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="glossy-card card-3d rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  {project.icon}
                  <h3 className="text-xl font-semibold text-white ml-3">{project.title}</h3>
                </div>
                <button 
                  onClick={() => handleGithubClick(project.title, project.githubLink)}
                  className="text-white/60 hover:text-white transition-colors duration-300"
                >
                  <Github size={20} />
                </button>
              </div>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, techIndex) => (
                    <span 
                      key={techIndex}
                      className={`${project.techBg} ${project.techText} px-2 py-1 rounded text-xs font-medium`}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                {project.description}
              </p>
            </div>
          ))}
          
          {/* Additional Project Card for Better Layout */}
          <div className="glossy-card card-3d rounded-xl p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center mb-4">
              <Plus className="text-indigo-400 text-2xl" />
              <h3 className="text-xl font-semibold text-white ml-3">More Projects</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">
              Explore additional projects and contributions on my GitHub profile, including open-source contributions 
              and experimental AI/ML implementations.
            </p>
            <div className="mt-4">
              <button 
                onClick={() => handleScrollTo('contact')}
                className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-medium transition-colors duration-300"
              >
                View More <ArrowRight className="ml-2" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
