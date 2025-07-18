import { useState } from "react";
import { Send, Mail, User, MessageSquare } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData)
      });

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glossy-card card-3d rounded-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-white mb-2">Send Me a Message</h3>
        <p className="text-white/80">Let's discuss your project ideas or opportunities</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              <User size={16} className="inline mr-2" />
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              <Mail size={16} className="inline mr-2" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            <MessageSquare size={16} className="inline mr-2" />
            Subject
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-blue-400 focus:outline-none transition-colors"
            placeholder="Project collaboration, job opportunity, etc."
          />
        </div>

        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">
            Message
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={5}
            className="w-full px-4 py-3 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-blue-400 focus:outline-none transition-colors resize-none"
            placeholder="Tell me about your project or opportunity..."
          />
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
          >
            <Send size={20} className="mr-2" />
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>

        {submitStatus === 'success' && (
          <div className="text-center p-4 bg-green-900/30 border border-green-400/30 rounded-lg">
            <p className="text-green-400">Message sent successfully! I'll get back to you soon.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="text-center p-4 bg-red-900/30 border border-red-400/30 rounded-lg">
            <p className="text-red-400">Failed to send message. Please try again or contact me directly.</p>
          </div>
        )}
      </form>
    </div>
  );
}
