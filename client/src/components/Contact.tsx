import { Mail, Phone, MapPin } from "lucide-react";

export default function Contact() {
  const contactInfo = [
    {
      icon: <Mail className="text-blue-600 text-2xl" />,
      title: "Email",
      subtitle: "Let's discuss your project",
      contact: "vaibhavdhir01@gmail.com",
      href: "mailto:vaibhavdhir01@gmail.com",
      bgColor: "bg-blue-100"
    },
    {
      icon: <Phone className="text-emerald-600 text-2xl" />,
      title: "Phone",
      subtitle: "Call me directly",
      contact: "+91 98724 05876",
      href: "tel:+919872405876",
      bgColor: "bg-emerald-100"
    },
    {
      icon: <MapPin className="text-purple-600 text-2xl" />,
      title: "Location",
      subtitle: "Based in",
      contact: "Delhi, India",
      href: null,
      bgColor: "bg-purple-100"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Get In Touch</h2>
          <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
          <p className="text-slate-600 mt-4 max-w-2xl mx-auto">
            I'm always interested in new opportunities and collaborations. 
            Feel free to reach out if you'd like to discuss projects, job opportunities, or just connect!
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactInfo.map((info, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg text-center hover:shadow-xl transition-shadow duration-300">
                <div className={`w-16 h-16 ${info.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {info.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">{info.title}</h3>
                <p className="text-slate-600 mb-4">{info.subtitle}</p>
                {info.href ? (
                  <a 
                    href={info.href}
                    className={`${info.title === 'Email' ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-600 hover:text-emerald-800'} font-medium`}
                  >
                    {info.contact}
                  </a>
                ) : (
                  <p className="text-purple-600 font-medium">{info.contact}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
