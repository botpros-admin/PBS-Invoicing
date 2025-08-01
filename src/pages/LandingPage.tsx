import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ParallaxSection from '../components/landing/ParallaxSection';
import ServiceCarousel from '../components/landing/ServiceCarousel';
import ContactSection from '../components/landing/ContactSection';
import FlipCard from '../components/landing/FlipCard';
import services from '../data/services';
import useParallax from '../hooks/useParallax';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  LogIn,
  Beaker,
  Dna,
  Pill,
  Map,
  Droplets,
  Building2,
  Users,
  BarChart3,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Parallax effects
  const heroParallax = useParallax(0.3);
  const statsParallax = useParallax(0.1);
  const servicesParallax = useParallax(0.05);
  const featuresParallax = useParallax(0.2);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Add scroll event listener
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="font-['Montserrat',sans-serif] text-gray-800 overflow-x-hidden">
      {/* Scroll indicator */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-40 hidden lg:block">
        <div className="flex flex-col items-center">
          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-full shadow-lg">
            {['hero', 'services', 'features', 'expertise', 'contact'].map((section, index) => (
              <a
                key={section}
                href={`#${section}`}
                className={`block w-3 h-3 mb-3 rounded-full border border-secondary transition-all duration-300 ${
                  scrollY > index * 500 ? 'bg-secondary' : 'bg-transparent'
                }`}
                aria-label={`Navigate to ${section} section`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-sm shadow-sm z-50 py-3">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="https://storage.googleapis.com/prec_bill_sol/precision_billing_solution_tree.png"
              alt="PBS Logo" 
              className="h-10" 
            />
            <div className="text-center uppercase tracking-wider hidden md:block">
              <div className="text-xl font-bold text-gray-900">Precision</div>
              <div className="text-xs text-gray-600 -mt-1">Billing Solution</div>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-8 text-sm font-medium">
            <a href="#services" className="hover:text-secondary transition-colors">Services</a>
            <a href="#expertise" className="hover:text-secondary transition-colors">Expertise</a>
            <a href="#contact" className="hover:text-secondary transition-colors">Contact</a>
          </nav>
          
    <Link to={isAuthenticated ? "/dashboard" : "/login"} className="hidden md:flex items-center space-x-1 text-sm font-medium px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/90 transition">
      <LogIn size={16} />
      <span>Log In</span>
    </Link>
        </div>
      </header>

      {/* Hero Section */}
      <ParallaxSection 
        id="hero"
        bgImage="https://images.unsplash.com/photo-1579154204601-01588f351e67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
        speed={0.3}
        overlay={true}
        overlayColor="bg-gradient-to-r from-black/70 to-secondary/50"
        minHeight="min-h-screen"
        className="flex items-center pt-16"
        fixedBackground={true}
      >
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div 
            className="max-w-3xl"
            style={{
              transform: `translateY(${heroParallax.y * 0.2}px)`,
              opacity: 1 - (heroParallax.y * 0.001),
              transition: 'transform 0.1s ease-out'
            }}
          >
            <div className="flex items-center mb-6">
              <img 
                src="https://storage.googleapis.com/prec_bill_sol/precision_billing_solution_tree.png"
                alt="Precision Billing Solution" 
                className="h-24 md:h-32"
              />
              <div className="ml-4 text-white uppercase tracking-wider">
                <h1 className="text-4xl md:text-6xl font-bold">Precision</h1>
                <div className="text-xl md:text-2xl mt-1">Billing Solution</div>
              </div>
            </div>

            <h2 className="text-white text-2xl md:text-4xl font-light mb-6 leading-tight">
              Complete, All-in-One Revenue Services 
              <span className="font-semibold block">
                for Diagnostic Laboratories
              </span>
            </h2>
            
            <p className="text-white/90 text-lg mb-10 max-w-2xl">
              We focus on Molecular, Genetic, Toxicology, Travel Allowance, and Blood Samples, 
              delivering unmatched billing expertise that maximizes your laboratory's revenue potential.
            </p>
            
            <div className="flex justify-center items-center">
              <a 
                href="#contact" 
                className="flex items-center justify-center space-x-2 px-8 py-4 bg-secondary text-white font-semibold rounded-md hover:bg-secondary/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
              >
                <span>Get Started Today</span>
                <ArrowRight size={18} />
              </a>
              
              <a 
                href="#services" 
                className="flex items-center text-white/80 hover:text-white transition-colors ml-6"
                aria-label="Scroll down"
              >
                <span className="text-sm mr-2">Discover More</span>
                <ChevronDown size={24} />
              </a>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* Stats Bar */}
      <div 
        className="bg-white py-12 shadow-md relative z-10"
        style={{
          transform: `translateY(${statsParallax.y * 0.1}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-secondary mb-2">99%</div>
              <div className="text-gray-600">Clean Claim Rate</div>
            </div>
            <div className="p-4 transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-secondary mb-2">30%</div>
              <div className="text-gray-600">Average Revenue Increase</div>
            </div>
            <div className="p-4 transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl font-bold text-secondary mb-2">15+</div>
              <div className="text-gray-600">Years of Experience</div>
            </div>
          </div>
        </div>
      </div>

      {/* Services Overview Section */}
      <ParallaxSection 
        id="services"
        bgColor="bg-gray-100"
        minHeight="min-h-0"
        className="py-20"
      >
        <div 
          className="container mx-auto px-4"
          style={{
            transform: `translateY(${servicesParallax.y * 0.05}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Billing Services</h2>
            <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg text-gray-600">
              Precision Billing Solution offers a comprehensive suite of services designed specifically 
              for diagnostic laboratories, ensuring maximum reimbursement and operational efficiency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.slice(0, 6).map((service, index) => (
              <div 
                key={service.id} 
                style={{
                  transform: `translateY(${index % 2 === 0 ? servicesParallax.y * 0.03 : servicesParallax.y * -0.03}px)`,
                  transition: 'transform 0.1s ease-out'
                }}
              >
                <FlipCard
                  frontTitle={service.title}
                  description={service.description}
                  ctaText={service.ctaText}
                  serviceId={service.id}
                />
              </div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* Features Section with Parallax Background */}
      <ParallaxSection 
        id="features"
        bgImage="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        overlay={true}
        overlayColor="bg-gradient-to-r from-secondary/70 to-black/50"
        minHeight="min-h-0"
        className="py-20"
        fixedBackground={true}
      >
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
              Transforming Laboratory Billing
            </h2>
            <p className="text-white/90 text-lg">
              Partner with Precision Billing Solution to optimize your revenue cycle and reduce claim denials.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-md transform hover:-translate-y-2 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Internal Audit</h3>
              <p className="text-gray-600 mb-6">
                Our comprehensive audit process identifies missed revenue opportunities and compliance risks.
              </p>
              <div className="flex justify-end">
                <a href="#contact" className="text-secondary hover:text-secondary/80 transition-colors font-medium">
                  Learn more →
                </a>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md transform hover:-translate-y-2 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Provider Education</h3>
              <p className="text-gray-600 mb-6">
                Equip your team with knowledge to optimize documentation and increase clean claim rates.
              </p>
              <div className="flex justify-end">
                <a href="#contact" className="text-secondary hover:text-secondary/80 transition-colors font-medium">
                  Learn more →
                </a>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-8 shadow-md transform hover:-translate-y-2 transition-all duration-300 hover:shadow-lg">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Training</h3>
              <p className="text-gray-600 mb-6">
                Comprehensive training programs to keep your staff up-to-date with the latest billing practices and regulations.
              </p>
              <div className="flex justify-end">
                <a href="#contact" className="text-secondary hover:text-secondary/80 transition-colors font-medium">
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* Expertise Section */}
      <ParallaxSection 
        id="expertise"
        bgColor="bg-gray-50"
        minHeight="min-h-0"
        className="py-20"
      >
        <div 
          className="container mx-auto px-4"
          style={{
            transform: `translateY(${featuresParallax.y * 0.05}px)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Precision Billing Solution</h2>
            <div className="h-1 w-20 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg text-gray-600">
              With over 15 years of specialized experience in laboratory billing, our team delivers 
              expertise that translates to measurable revenue improvements.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div 
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300 mb-8 md:mb-0"
              style={{
                transform: `translateY(${featuresParallax.y * 0.08}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <div className="rounded-full bg-secondary/10 w-16 h-16 flex items-center justify-center mb-6">
                <Users className="text-secondary h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Specialized Expertise</h3>
              <p className="text-gray-600">
                Our team consists of certified billing specialists with deep knowledge of laboratory 
                reimbursement and complex testing protocols.
              </p>
            </div>
            
            <div 
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300"
              style={{
                transform: `translateY(${featuresParallax.y * 0.04}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <div className="rounded-full bg-secondary/10 w-16 h-16 flex items-center justify-center mb-6">
                <BarChart3 className="text-secondary h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Proven Results</h3>
              <p className="text-gray-600">
                Our clients experience an average 30% increase in revenue through our comprehensive 
                approach to clean claims, appeals management, and documentation optimization.
              </p>
            </div>
            
            <div 
              className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1 duration-300"
              style={{
                transform: `translateY(${featuresParallax.y * 0.06}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <div className="rounded-full bg-secondary/10 w-16 h-16 flex items-center justify-center mb-6">
                <Building2 className="text-secondary h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Industry Partnerships</h3>
              <p className="text-gray-600">
                We maintain strong relationships with major payers and laboratory organizations
                to stay current with changing requirements and industry best practices.
              </p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <a 
              href="#contact" 
              className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-secondary text-white font-semibold rounded-md hover:bg-secondary/90 transition-colors transform hover:-translate-y-1 hover:shadow-lg duration-300"
            >
              <span>Learn How We Can Help Your Laboratory</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </ParallaxSection>
      
      {/* Mobile Menu */}
      <div className="md:hidden fixed right-4 top-4 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white p-2 rounded-md shadow-md focus:outline-none"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-900" />
          ) : (
            <Menu className="h-6 w-6 text-gray-900" />
          )}
        </button>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col h-full justify-center items-center space-y-8 p-4">
            <a 
              href="#services" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white text-xl font-medium hover:text-secondary transition-colors"
            >
              Services
            </a>
            <a 
              href="#expertise" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white text-xl font-medium hover:text-secondary transition-colors"
            >
              Expertise
            </a>
            <a 
              href="#contact" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white text-xl font-medium hover:text-secondary transition-colors"
            >
              Contact
            </a>
            <Link 
              to={isAuthenticated ? "/dashboard" : "/login"} 
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-1 text-white text-xl font-medium px-8 py-3 bg-secondary rounded-md hover:bg-secondary/90 transition mt-6"
            >
              <LogIn size={18} />
              <span>Log In</span>
            </Link>
          </div>
        </div>
      )}

      {/* Contact Section */}
      <ParallaxSection 
        id="contact"
        bgImage="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
        overlay={true}
        overlayColor="bg-gradient-to-br from-black/70 to-secondary/50"
        minHeight="min-h-[80vh]"
        className="flex items-center"
        fixedBackground={true}
      >
        <ContactSection />
      </ParallaxSection>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <img 
                src="https://storage.googleapis.com/prec_bill_sol/precision_billing_solution_tree.png"
                alt="PBS Logo" 
                className="h-10" 
              />
              <div className="text-center uppercase tracking-wider">
                <div className="text-xl font-bold text-white">Precision</div>
                <div className="text-xs text-gray-400 -mt-1">Billing Solution</div>
              </div>
            </div>
            
            <div className="flex space-x-8">
              <a href="#services" className="hover:text-secondary transition-colors">Services</a>
              <a href="#expertise" className="hover:text-secondary transition-colors">Expertise</a>
              <a href="#contact" className="hover:text-secondary transition-colors">Contact</a>
              <Link to="/login" className="hover:text-secondary transition-colors">Log In</Link>
            </div>
          </div>
          
          <hr className="border-gray-700 my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Precision Billing Solution. All rights reserved.
            </div>
            
            <div className="text-gray-400 text-sm">
              <a href="#" className="hover:text-white mr-6">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
