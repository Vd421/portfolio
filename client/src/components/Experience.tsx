import { Calendar, TrendingUp, Bug, Settings } from "lucide-react";

export default function Experience() {
  const achievements = [
    {
      icon: <TrendingUp className="text-blue-400" />,
      title: "Performance Enhancement",
      description: "Improved module performance by 30% through code optimization and efficient algorithms",
      bgColor: "bg-blue-900/30"
    },
    {
      icon: <Bug className="text-emerald-400" />,
      title: "Bug Reduction",
      description: "Reduced system bugs by 40% through comprehensive testing and debugging methodologies",
      bgColor: "bg-emerald-900/30"
    },
    {
      icon: <Settings className="text-purple-400" />,
      title: "System Development",
      description: "Developed agile, scalable systems using modern software development practices",
      bgColor: "bg-purple-900/30"
    }
  ];

  return (
    <section id="experience" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Professional Experience</h2>
          <div className="w-20 h-1 bg-blue-400 mx-auto rounded-full"></div>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="glossy-card card-3d rounded-xl p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Software Developer Intern</h3>
                <p className="text-blue-400 font-medium text-lg">Vertex Info Soft</p>
              </div>
              <div className="text-white/60 font-medium flex items-center">
                <Calendar className="mr-2" size={16} />
                October 2023 - November 2023
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((achievement, index) => (
                <div key={index} className={`${achievement.bgColor} rounded-lg p-4`}>
                  <div className="flex items-center mb-2">
                    {achievement.icon}
                    <span className="font-semibold text-white ml-2">{achievement.title}</span>
                  </div>
                  <p className="text-white/80 text-sm">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
