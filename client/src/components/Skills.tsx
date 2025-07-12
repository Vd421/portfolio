import { Code, Layers, Brain, Users } from "lucide-react";

export default function Skills() {
  const skillCategories = [
    {
      title: "Languages",
      icon: <Code className="text-blue-600 text-2xl" />,
      skills: ["C++", "Python", "Java"],
      bgColor: "bg-blue-100",
      textColor: "text-blue-800"
    },
    {
      title: "Frameworks",
      icon: <Layers className="text-emerald-600 text-2xl" />,
      skills: ["OpenCV", "TensorFlow", "PyTorch", "YOLOv3"],
      bgColor: "bg-emerald-100",
      textColor: "text-emerald-800"
    },
    {
      title: "Core Skills",
      icon: <Brain className="text-purple-600 text-2xl" />,
      skills: ["AI", "ML", "Algorithm Optimization"],
      bgColor: "bg-purple-100",
      textColor: "text-purple-800"
    },
    {
      title: "Soft Skills",
      icon: <Users className="text-orange-600 text-2xl" />,
      skills: ["Problem-Solving", "Critical Thinking", "Teamwork"],
      bgColor: "bg-orange-100",
      textColor: "text-orange-800"
    }
  ];

  return (
    <section id="skills" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Skills & Expertise</h2>
          <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {skillCategories.map((category, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center mb-4">
                {category.icon}
                <h3 className="text-xl font-semibold text-slate-800 ml-3">{category.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <span 
                    key={skillIndex}
                    className={`${category.bgColor} ${category.textColor} px-3 py-1 rounded-full text-sm font-medium`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
