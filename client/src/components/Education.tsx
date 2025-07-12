import { GraduationCap, School, Book } from "lucide-react";

export default function Education() {
  const educationData = [
    {
      icon: <GraduationCap className="text-white" />,
      title: "Bachelor of Technology",
      subtitle: "Electrical and Electronics Engineering",
      institution: "VIT Chennai",
      period: "2021 - 2025",
      bgColor: "bg-blue-600"
    },
    {
      icon: <School className="text-white" />,
      title: "Higher Secondary Education (XII)",
      subtitle: "",
      institution: "GGPSP Ludhiana",
      period: "Completed",
      bgColor: "bg-emerald-600"
    },
    {
      icon: <Book className="text-white" />,
      title: "Secondary Education (X)",
      subtitle: "",
      institution: "KVM Ludhiana",
      period: "Completed",
      bgColor: "bg-purple-600"
    }
  ];

  return (
    <section id="education" className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Education</h2>
          <div className="w-20 h-1 bg-blue-400 mx-auto rounded-full"></div>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          {educationData.map((edu, index) => (
            <div key={index} className="glossy-card card-3d rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-4">
                  <div className={`w-12 h-12 ${edu.bgColor} rounded-full flex items-center justify-center`}>
                    {edu.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{edu.title}</h3>
                      {edu.subtitle && (
                        <p className={`${edu.bgColor === 'bg-blue-600' ? 'text-blue-400' : edu.bgColor === 'bg-emerald-600' ? 'text-emerald-400' : 'text-purple-400'} font-medium`}>
                          {edu.subtitle}
                        </p>
                      )}
                      <p className="text-white/80">{edu.institution}</p>
                    </div>
                    <div className="text-white/60 font-medium mt-2 sm:mt-0">
                      {edu.period}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
