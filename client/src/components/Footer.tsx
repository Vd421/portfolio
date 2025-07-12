import { Mail, Phone, Github, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h3 className="text-2xl font-bold">
              <span className="text-blue-400">Vaibhav</span> Dhir
            </h3>
            <p className="text-white/60 mt-1">AI/ML Developer & EEE Student</p>
          </div>
          <div className="flex space-x-6">
            <a 
              href="mailto:vaibhavdhir01@gmail.com" 
              className="text-white/60 hover:text-white transition-colors duration-300"
            >
              <Mail className="text-xl" />
            </a>
            <a 
              href="tel:+919872405876" 
              className="text-white/60 hover:text-white transition-colors duration-300"
            >
              <Phone className="text-xl" />
            </a>
            <a 
              href="https://github.com/vaibhavdhir" 
              className="text-white/60 hover:text-white transition-colors duration-300"
            >
              <Github className="text-xl" />
            </a>
            <a 
              href="https://linkedin.com/in/vaibhav-dhir" 
              className="text-white/60 hover:text-white transition-colors duration-300"
            >
              <Linkedin className="text-xl" />
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-8 text-center">
          <p className="text-white/60">
            &copy; 2025 Vaibhav Dhir. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
