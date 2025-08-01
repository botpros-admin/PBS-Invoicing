import React, { useState } from 'react';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, CheckCircle } from 'lucide-react';

// Contact form interface
interface ContactForm {
  name: string;
  email: string;
  phone: string;
  laboratory: string;
  service: string;
  message: string;
  terms: boolean;
}

// Contact form errors interface
interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}

const ContactSection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  // Contact form state
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    laboratory: '',
    service: '',
    message: '',
    terms: false
  });
  
  // Contact form validation errors
  const [contactFormErrors, setContactFormErrors] = useState<ContactFormErrors>({});

  // Handle contact form input changes
  const handleContactInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkbox separately
    if (type === 'checkbox') {
      setContactForm(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setContactForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is edited
    if (contactFormErrors[name as keyof ContactFormErrors]) {
      setContactFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };
  
  // Validate form
  const validateContactForm = (): boolean => {
    const errors: ContactFormErrors = {};
    let isValid = true;
    
    if (!contactForm.name.trim()) {
      errors.name = 'Name is required';
      isValid = false;
    }
    
    if (!contactForm.email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(contactForm.email)) {
      errors.email = 'Email address is invalid';
      isValid = false;
    }
    
    if (!contactForm.message.trim()) {
      errors.message = 'Message is required';
      isValid = false;
    }
    
    setContactFormErrors(errors);
    return isValid;
  };
  
  // Handle form submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateContactForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
      setContactForm({
        name: '',
        email: '',
        phone: '',
        laboratory: '',
        service: '',
        message: '',
        terms: false
      });
      
      // Auto scroll to form response
      const responseElement = document.getElementById('form-response');
      if (responseElement) {
        responseElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1500);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Get In Touch</h2>
        <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
        <p className="text-white/90 text-lg mt-6 max-w-2xl mx-auto">
          Ready to optimize your laboratory's revenue? Contact us today to discuss your needs and discover how our specialized billing solutions can help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Contact Info */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20 h-full">
          <h3 className="text-2xl font-bold mb-8 text-white">Contact Information</h3>
          
          <div className="space-y-8 mb-8">
            <div className="flex items-start">
              <div className="rounded-full bg-white/10 w-12 h-12 flex items-center justify-center mr-4 flex-shrink-0">
                <Phone className="text-secondary h-5 w-5" />
              </div>
              <div>
                <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">Phone</div>
                <div className="text-white font-medium">(800) 555-0123</div>
                <div className="text-white/80 text-sm mt-1">Mon-Fri: 8am - 6pm EST</div>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/10 w-12 h-12 flex items-center justify-center mr-4 flex-shrink-0">
                <Mail className="text-secondary h-5 w-5" />
              </div>
              <div>
                <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">Email</div>
                <div className="text-white font-medium">contact@precisionbillingsolution.com</div>
                <div className="text-white/80 text-sm mt-1">We respond within 24 hours</div>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-white/10 w-12 h-12 flex items-center justify-center mr-4 flex-shrink-0">
                <MapPin className="text-secondary h-5 w-5" />
              </div>
              <div>
                <div className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">Office</div>
                <div className="text-white font-medium">123 Billing Lane, Suite 400</div>
                <div className="text-white/80 text-sm">Atlanta, GA 30308</div>
              </div>
            </div>
          </div>
          
          <div className="mt-12">
            <h4 className="text-white font-medium mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="#" className="rounded-full bg-white/10 w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Linkedin className="text-white h-5 w-5" />
              </a>
              <a href="#" className="rounded-full bg-white/10 w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Twitter className="text-white h-5 w-5" />
              </a>
              <a href="#" className="rounded-full bg-white/10 w-10 h-10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <Facebook className="text-white h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Contact Form */}
        <div className="lg:col-span-3 bg-white p-8 rounded-lg shadow-xl">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Send Us a Message</h3>
          
          <form className="space-y-6" onSubmit={handleContactSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 mb-2 text-sm font-medium">
                  Full Name <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactInputChange}
                  required
                  className={`w-full px-4 py-3 bg-gray-50 border ${contactFormErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent`}
                  placeholder="John Smith"
                />
                {contactFormErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{contactFormErrors.name}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2 text-sm font-medium">
                  Email Address <span className="text-secondary">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={contactForm.email}
                  onChange={handleContactInputChange}
                  required
                  className={`w-full px-4 py-3 bg-gray-50 border ${contactFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent`}
                  placeholder="john@yourlaboratory.com"
                />
                {contactFormErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{contactFormErrors.email}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-gray-700 mb-2 text-sm font-medium">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={contactForm.phone}
                  onChange={handleContactInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div>
                <label htmlFor="laboratory" className="block text-gray-700 mb-2 text-sm font-medium">
                  Laboratory Name
                </label>
                <input
                  type="text"
                  id="laboratory"
                  name="laboratory"
                  value={contactForm.laboratory}
                  onChange={handleContactInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                  placeholder="Your Laboratory Name"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="service" className="block text-gray-700 mb-2 text-sm font-medium">
                Service Interested In
              </label>
              <select
                id="service"
                name="service"
                value={contactForm.service}
                onChange={handleContactInputChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              >
                <option value="">Select a service</option>
                <option value="Molecular Testing">Molecular Testing</option>
                <option value="Genetic Analysis">Genetic Analysis</option>
                <option value="Toxicology Services">Toxicology Services</option>
                <option value="Travel Allowance">Travel Allowance</option>
                <option value="Blood Samples">Blood Samples</option>
                <option value="Audit & Education">Audit & Education</option>
                <option value="Other">Other - Please specify</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-gray-700 mb-2 text-sm font-medium">
                Your Message <span className="text-secondary">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={contactForm.message}
                onChange={handleContactInputChange}
                required
                rows={4}
                className={`w-full px-4 py-3 bg-gray-50 border ${contactFormErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent`}
                placeholder="Tell us about your laboratory and what services you're interested in..."
              ></textarea>
              {contactFormErrors.message && (
                <p className="mt-1 text-sm text-red-500">{contactFormErrors.message}</p>
              )}
            </div>
            
            <div className="flex items-start">
              <input
                type="checkbox"
                id="terms"
                name="terms"
                checked={contactForm.terms}
                onChange={handleContactInputChange}
                required
                className="mt-1 h-4 w-4 text-secondary border-gray-300 rounded focus:ring-secondary"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I agree to the <a href="#" className="text-secondary hover:underline">Privacy Policy</a> and <a href="#" className="text-secondary hover:underline">Terms of Service</a> <span className="text-secondary">*</span>
              </label>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 bg-secondary text-white font-semibold rounded-md hover:bg-secondary/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>Sending...</span>
                  </div>
                ) : 'Send Message'}
              </button>
            </div>
          </form>
          
          {formSubmitted && (
            <div id="form-response" className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700">
                  Thanks for reaching out! We've received your message and will get back to you within 1-2 business days.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
