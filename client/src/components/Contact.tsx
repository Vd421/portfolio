import { Mail, Phone, MapPin } from "lucide-react";
import ContactForm from "./ContactForm";

export default function Contact() {
  const contactInfo = [
    {
      icon: <Mail className="text-blue-400 text-2xl" />,
      title: "Email",
      subtitle: "Let's discuss your project",
      contact: "vaibhavdhir01@gmail.com",
      href: "mailto:vaibhavdhir01@gmail.com",
      bgColor: "bg-blue-900/30"
    },
    {
      icon: <Phone className="text-emerald-400 text-2xl" />,
      title: "Phone",
      subtitle: "Call me directly",
      contact: "+91 98724 05876",
      href: "tel:+919872405876",
      bgColor: "bg-emerald-900/30"
    },
    {
      icon: <MapPin className="text-purple-400 text-2xl" />,
      title: "Location",
      subtitle: "Based in",
      contact: "Delhi, India",
      href: null,
      bgColor: "bg-purple-900/30"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Get In Touch</h2>
          <div className="w-20 h-1 bg-blue-400 mx-auto rounded-full"></div>
          <p className="text-white/80 mt-4 max-w-2xl mx-auto">
            I'm always interested in new opportunities and collaborations. 
            Feel free to reach out if you'd like to discuss projects, job opportunities, or just connect!
          </p>
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-8">Get in Touch</h3>
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="glossy-card card-3d rounded-xl p-6 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 ${info.bgColor} rounded-full flex items-center justify-center mr-4`}>
                        {info.icon}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{info.title}</h4>
                        <p className="text-white/60 text-sm">{info.subtitle}</p>
                        {info.href ? (
                          <a 
                            href={info.href}
                            className={`${info.title === 'Email' ? 'text-blue-400 hover:text-blue-300' : 'text-emerald-400 hover:text-emerald-300'} font-medium`}
                          >
                            {info.contact}
                          </a>
                        ) : (
                          <p className="text-purple-400 font-medium">{info.contact}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
