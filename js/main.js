(function () {
    "use strict";

    // DOM Ready
    document.addEventListener('DOMContentLoaded', function() {

        // Navbar scroll effect
        const navbar = document.querySelector('.navbar');

        function handleNavbarScroll() {
            if (window.scrollY > 50) {
                navbar?.classList.add('scrolled');
            } else {
                navbar?.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', handleNavbarScroll);
        handleNavbarScroll(); // Initial check

        // Back to top button
        const backToTop = document.querySelector('.back-to-top');

        function handleBackToTopVisibility() {
            if (window.scrollY > 300) {
                backToTop?.classList.add('visible');
            } else {
                backToTop?.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', handleBackToTopVisibility);
        handleBackToTopVisibility(); // Initial check

        backToTop?.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navbarHeight = navbar?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse?.classList.contains('show')) {
                        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                        if (bsCollapse) {
                            bsCollapse.hide();
                        }
                    }
                }
            });
        });

        // Dropdown hover on desktop
        if (window.innerWidth > 992) {
            const dropdowns = document.querySelectorAll('.navbar .dropdown');

            dropdowns.forEach(dropdown => {
                dropdown.addEventListener('mouseenter', function() {
                    const dropdownMenu = this.querySelector('.dropdown-menu');
                    dropdownMenu?.classList.add('show');
                });

                dropdown.addEventListener('mouseleave', function() {
                    const dropdownMenu = this.querySelector('.dropdown-menu');
                    dropdownMenu?.classList.remove('show');
                });
            });
        }

        // Form validation and submission
        const contactForm = document.getElementById('contactForm');

        contactForm?.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Basic validation
            const name = this.querySelector('#name');
            const email = this.querySelector('#email');
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn?.innerHTML;
            let isValid = true;

            if (!name?.value.trim()) {
                name?.classList.add('is-invalid');
                isValid = false;
            } else {
                name?.classList.remove('is-invalid');
            }

            if (!email?.value.trim() || !isValidEmail(email.value)) {
                email?.classList.add('is-invalid');
                isValid = false;
            } else {
                email?.classList.remove('is-invalid');
            }

            if (isValid) {
                // Show loading state
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
                    submitBtn.disabled = true;
                }

                try {
                    const formData = new FormData(contactForm);
                    const response = await fetch('https://api.web3forms.com/submit', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Success
                        if (submitBtn) {
                            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>Message Sent!';
                            submitBtn.classList.remove('btn-primary');
                            submitBtn.classList.add('btn-success');
                        }
                        contactForm.reset();

                        setTimeout(() => {
                            if (submitBtn) {
                                submitBtn.innerHTML = originalText || 'Submit';
                                submitBtn.disabled = false;
                                submitBtn.classList.remove('btn-success');
                                submitBtn.classList.add('btn-primary');
                            }
                        }, 4000);
                    } else {
                        throw new Error(result.message || 'Something went wrong');
                    }
                } catch (error) {
                    // Error
                    console.error('Form submission error:', error);
                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Error - Try Again';
                        submitBtn.classList.remove('btn-primary');
                        submitBtn.classList.add('btn-danger');

                        setTimeout(() => {
                            submitBtn.innerHTML = originalText || 'Submit';
                            submitBtn.disabled = false;
                            submitBtn.classList.remove('btn-danger');
                            submitBtn.classList.add('btn-primary');
                        }, 3000);
                    }
                }
            }
        });

        function isValidEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        // Remove invalid class on input
        document.querySelectorAll('.form-control').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('is-invalid');
            });
        });

        // Animate elements on scroll (Intersection Observer)
        const animateOnScroll = document.querySelectorAll('.service-card, .industry-card, .testimonial-card, .use-case-card');

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            animateOnScroll.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                observer.observe(el);
            });
        }

        // Active nav link based on scroll position
        const sections = document.querySelectorAll('section[id]');

        function highlightNavLink() {
            const scrollY = window.scrollY;

            sections.forEach(section => {
                const sectionHeight = section.offsetHeight;
                const sectionTop = section.offsetTop - 100;
                const sectionId = section.getAttribute('id');
                const navLink = document.querySelector(`.navbar-nav a[href="#${sectionId}"]`);

                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLink?.classList.add('active');
                } else {
                    navLink?.classList.remove('active');
                }
            });
        }

        window.addEventListener('scroll', highlightNavLink);

    });

})();

// ============================================
// AI ENHANCEMENT FEATURES
// ============================================

// AI Chatbot Functions
let chatbotOpen = false;

function toggleChatbot() {
    const chatWindow = document.querySelector('.chatbot-window');
    chatbotOpen = !chatbotOpen;
    if (chatbotOpen) {
        chatWindow?.classList.add('active');
    } else {
        chatWindow?.classList.remove('active');
    }
}

function sendQuickMessage(message) {
    addUserMessage(message);
    simulateAIResponse(message);
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value.trim();
    if (message) {
        addUserMessage(message);
        input.value = '';
        simulateAIResponse(message);
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function addUserMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user';
    messageDiv.innerHTML = `<div class="message-content"><p>${escapeHtml(message)}</p></div>`;
    messagesContainer?.appendChild(messageDiv);
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

function addBotMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot';
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    messagesContainer?.appendChild(messageDiv);
    messagesContainer?.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

function simulateAIResponse(userMessage) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message bot typing';
    typingIndicator.innerHTML = '<div class="message-content"><p><i class="fas fa-circle-notch fa-spin"></i> Thinking...</p></div>';
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer?.appendChild(typingIndicator);

    setTimeout(() => {
        typingIndicator.remove();
        const response = generateAIResponse(userMessage.toLowerCase());
        addBotMessage(response);
    }, 1000 + Math.random() * 1000);
}

function generateAIResponse(message) {
    if (message.includes('ai') || message.includes('artificial intelligence')) {
        return `<p>Our AI services help businesses automate tasks and make smarter decisions:</p>
        <ul>
            <li><strong>ChatGPT Integration</strong> - Custom AI assistants for your business</li>
            <li><strong>Document Processing</strong> - Automated data extraction</li>
            <li><strong>Predictive Analytics</strong> - Forecast trends and behavior</li>
        </ul>
        <p>Would you like to <a href="#contact" onclick="toggleChatbot()">schedule a free consultation</a>?</p>`;
    }
    if (message.includes('price') || message.includes('cost') || message.includes('estimate')) {
        return `<p>Our pricing is 50% below typical agency rates:</p>
        <ul>
            <li><strong>AI Integration:</strong> Starting at $2,500</li>
            <li><strong>Web Apps:</strong> Starting at $3,000</li>
            <li><strong>Mobile Apps:</strong> Starting at $5,000</li>
            <li><strong>IT Support:</strong> From $500/month</li>
        </ul>
        <p>Try our <button onclick="openPricingCalculator()" class="btn btn-sm btn-primary">Instant Quote Calculator</button></p>`;
    }
    if (message.includes('support') || message.includes('help') || message.includes('it')) {
        return `<p>Our IT support includes:</p>
        <ul>
            <li>Same-day on-site support in Cranston, RI</li>
            <li>24/7 remote monitoring</li>
            <li>Helpdesk with quick response times</li>
            <li>Proactive maintenance</li>
        </ul>
        <p>Call us at <a href="tel:+14013272971">(401) 327-2971</a> for immediate assistance!</p>`;
    }
    if (message.includes('consultation') || message.includes('book') || message.includes('schedule') || message.includes('call')) {
        return `<p>I'd love to connect you with our team!</p>
        <p>You can:</p>
        <ul>
            <li>Call us: <a href="tel:+14013272971">(401) 327-2971</a></li>
            <li>Fill out our <a href="#contact" onclick="toggleChatbot()">contact form</a></li>
        </ul>
        <p>We typically respond within 24 hours and offer free 30-minute consultations.</p>`;
    }
    return `<p>Thanks for your message! I can help you with:</p>
    <ul>
        <li>AI services and automation</li>
        <li>Pricing and project estimates</li>
        <li>IT support questions</li>
        <li>Scheduling consultations</li>
    </ul>
    <p>What would you like to know more about?</p>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Pricing Calculator Functions
let projectType = '';
let projectComplexity = '';

function openPricingCalculator() {
    const modal = new bootstrap.Modal(document.getElementById('pricingCalculatorModal'));
    modal.show();
    resetPricingCalculator();
}

function resetPricingCalculator() {
    projectType = '';
    projectComplexity = '';
    document.querySelectorAll('.pricing-step').forEach(step => step.classList.remove('active'));
    document.getElementById('pricingStep1')?.classList.add('active');
    document.getElementById('pricingFooter').style.display = 'none';
    document.querySelectorAll('.pricing-option').forEach(opt => opt.classList.remove('selected'));
}

function selectProjectType(type) {
    projectType = type;
    document.querySelectorAll('#pricingStep1 .pricing-option').forEach(opt => opt.classList.remove('selected'));
    event.target.closest('.pricing-option')?.classList.add('selected');

    setTimeout(() => {
        document.getElementById('pricingStep1')?.classList.remove('active');
        document.getElementById('pricingStep2')?.classList.add('active');
    }, 300);
}

function selectComplexity(complexity) {
    projectComplexity = complexity;
    document.querySelectorAll('#pricingStep2 .pricing-option').forEach(opt => opt.classList.remove('selected'));
    event.target.closest('.pricing-option')?.classList.add('selected');

    setTimeout(() => {
        calculatePricing();
        document.getElementById('pricingStep2')?.classList.remove('active');
        document.getElementById('pricingStep3')?.classList.add('active');
        document.getElementById('pricingFooter').style.display = 'flex';
    }, 300);
}

function calculatePricing() {
    const basePrices = {
        ai: { basic: [2500, 5000], standard: [5000, 12000], enterprise: [12000, 30000] },
        web: { basic: [3000, 6000], standard: [6000, 15000], enterprise: [15000, 40000] },
        mobile: { basic: [5000, 10000], standard: [10000, 25000], enterprise: [25000, 60000] },
        automation: { basic: [1500, 3500], standard: [3500, 8000], enterprise: [8000, 20000] }
    };

    const includes = {
        ai: {
            basic: ['ChatGPT integration', 'Basic automation', '1 month support'],
            standard: ['Custom AI model training', 'Multiple integrations', 'Dashboard', '3 months support'],
            enterprise: ['Full AI solution', 'Custom development', 'Training', '12 months support']
        },
        web: {
            basic: ['Responsive design', 'Up to 5 pages', 'Contact form', 'Basic SEO'],
            standard: ['Custom functionality', 'CMS integration', 'User accounts', 'Analytics'],
            enterprise: ['Full web application', 'API development', 'Third-party integrations', 'Scalable architecture']
        },
        mobile: {
            basic: ['Single platform (iOS or Android)', 'Basic features', 'App store submission'],
            standard: ['Both platforms', 'Backend integration', 'Push notifications', 'Analytics'],
            enterprise: ['Full mobile solution', 'Custom backend', 'Advanced features', 'Ongoing maintenance']
        },
        automation: {
            basic: ['Basic workflow automation', 'Email automation', 'Simple integrations'],
            standard: ['Multi-step workflows', 'CRM integration', 'Reporting dashboard'],
            enterprise: ['Enterprise automation', 'Custom integrations', 'AI-powered workflows', 'Full support']
        }
    };

    const prices = basePrices[projectType]?.[projectComplexity] || [0, 0];
    const includesList = includes[projectType]?.[projectComplexity] || [];

    document.getElementById('priceFrom').textContent = '$' + prices[0].toLocaleString();
    document.getElementById('priceTo').textContent = '$' + prices[1].toLocaleString();

    const includesContainer = document.getElementById('pricingIncludes');
    if (includesContainer) {
        includesContainer.innerHTML = includesList.map(item => `<li>${item}</li>`).join('');
    }
}

// ROI Calculator Functions
function calculateROI() {
    const employees = parseInt(document.getElementById('roiEmployees')?.value) || 10;
    const hours = parseInt(document.getElementById('roiHours')?.value) || 5;
    const hourlyCost = parseInt(document.getElementById('roiHourlyCost')?.value) || 25;

    // Assume 50% of repetitive tasks can be automated
    const automationRate = 0.5;
    const weeklySavings = employees * hours * hourlyCost * automationRate;
    const monthlySavings = weeklySavings * 4;
    const yearlySavings = monthlySavings * 12;

    document.getElementById('roiWeekly').textContent = '$' + Math.round(weeklySavings).toLocaleString();
    document.getElementById('roiMonthly').textContent = '$' + Math.round(monthlySavings).toLocaleString();
    document.getElementById('roiYearly').textContent = '$' + Math.round(yearlySavings).toLocaleString();

    // Update chart if exists
    updateROIChart(monthlySavings);
}

function updateROIChart(monthlySavings) {
    const canvas = document.getElementById('roiChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.offsetWidth;
    const height = 150;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Draw simple bar chart showing 12 months of savings
    const barWidth = (width - 60) / 12;
    const maxHeight = height - 40;

    for (let i = 0; i < 12; i++) {
        const cumulativeSavings = monthlySavings * (i + 1);
        const maxSavings = monthlySavings * 12;
        const barHeight = (cumulativeSavings / maxSavings) * maxHeight;

        // Create gradient
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#2563eb');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.fillRect(30 + i * barWidth, height - 20 - barHeight, barWidth - 4, barHeight);
    }

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((month, i) => {
        ctx.fillText(month, 30 + i * barWidth + barWidth/2, height - 5);
    });
}

// Service Recommender Functions
let currentQuestion = 0;
let answers = [];

const recommenderQuestions = [
    {
        question: "What's your primary business goal?",
        options: [
            { icon: 'fa-chart-line', text: 'Increase efficiency', value: 'efficiency' },
            { icon: 'fa-users', text: 'Better customer experience', value: 'customer' },
            { icon: 'fa-dollar-sign', text: 'Reduce costs', value: 'costs' },
            { icon: 'fa-rocket', text: 'Scale operations', value: 'scale' }
        ]
    },
    {
        question: "What's your biggest technology challenge?",
        options: [
            { icon: 'fa-clock', text: 'Too much manual work', value: 'manual' },
            { icon: 'fa-puzzle-piece', text: 'Systems don\'t integrate', value: 'integration' },
            { icon: 'fa-shield-alt', text: 'Security concerns', value: 'security' },
            { icon: 'fa-mobile-alt', text: 'Need mobile presence', value: 'mobile' }
        ]
    },
    {
        question: "How many employees does your business have?",
        options: [
            { icon: 'fa-user', text: '1-5 employees', value: 'small' },
            { icon: 'fa-user-friends', text: '6-20 employees', value: 'medium' },
            { icon: 'fa-users', text: '21-50 employees', value: 'large' },
            { icon: 'fa-building', text: '50+ employees', value: 'enterprise' }
        ]
    },
    {
        question: "What's your timeline?",
        options: [
            { icon: 'fa-bolt', text: 'ASAP (1-2 weeks)', value: 'urgent' },
            { icon: 'fa-calendar', text: '1-2 months', value: 'normal' },
            { icon: 'fa-calendar-alt', text: '3-6 months', value: 'planned' },
            { icon: 'fa-question', text: 'Just exploring', value: 'exploring' }
        ]
    },
    {
        question: "What's your budget range?",
        options: [
            { icon: 'fa-seedling', text: 'Under $5,000', value: 'starter' },
            { icon: 'fa-tree', text: '$5,000 - $15,000', value: 'growth' },
            { icon: 'fa-building', text: '$15,000 - $50,000', value: 'professional' },
            { icon: 'fa-city', text: '$50,000+', value: 'enterprise' }
        ]
    }
];

function openServiceRecommender() {
    currentQuestion = 0;
    answers = [];
    const modal = new bootstrap.Modal(document.getElementById('serviceRecommenderModal'));
    modal.show();
    showQuestion(0);
}

function showQuestion(index) {
    const container = document.getElementById('recommenderQuestions');
    const resultsContainer = document.getElementById('recommenderResults');
    const progressBar = document.getElementById('recommenderProgress');
    const questionCount = document.getElementById('questionCount');

    if (index >= recommenderQuestions.length) {
        container.style.display = 'none';
        resultsContainer.style.display = 'block';
        showRecommendation();
        return;
    }

    container.style.display = 'block';
    resultsContainer.style.display = 'none';

    const q = recommenderQuestions[index];
    progressBar.style.width = ((index + 1) / recommenderQuestions.length * 100) + '%';
    questionCount.textContent = `Question ${index + 1} of ${recommenderQuestions.length}`;

    container.innerHTML = `
        <div class="recommender-question">
            <h4>${q.question}</h4>
            <div class="recommender-options">
                ${q.options.map((opt, i) => `
                    <div class="recommender-option" onclick="selectRecommenderOption('${opt.value}')">
                        <i class="fas ${opt.icon}"></i>
                        <span>${opt.text}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function selectRecommenderOption(value) {
    answers.push(value);
    currentQuestion++;

    document.querySelectorAll('.recommender-option').forEach(opt => {
        if (opt.querySelector('span')?.textContent.toLowerCase().includes(value)) {
            opt.classList.add('selected');
        }
    });

    setTimeout(() => showQuestion(currentQuestion), 300);
}

function showRecommendation() {
    const container = document.getElementById('recommenderResults');

    // Simple recommendation logic
    let recommendation = {
        service: 'AI Services',
        description: 'Based on your answers, AI integration could help automate tasks and improve efficiency.',
        features: ['ChatGPT Integration', 'Process Automation', 'Data Analytics'],
        cta: 'Learn more about AI Services'
    };

    if (answers.includes('mobile')) {
        recommendation = {
            service: 'Mobile App Development',
            description: 'A custom mobile app would help you reach customers on their phones and tablets.',
            features: ['iOS & Android Apps', 'Push Notifications', 'Offline Support'],
            cta: 'Explore Mobile Development'
        };
    } else if (answers.includes('integration') || answers.includes('manual')) {
        recommendation = {
            service: 'Business Automation',
            description: 'Connecting your systems and automating workflows will save time and reduce errors.',
            features: ['System Integration', 'Workflow Automation', 'Custom Dashboards'],
            cta: 'See Automation Solutions'
        };
    } else if (answers.includes('security')) {
        recommendation = {
            service: 'IT Support & Infrastructure',
            description: 'Professional IT support will secure your systems and keep your business running.',
            features: ['24/7 Monitoring', 'Security Audits', 'Data Backup'],
            cta: 'Get IT Support'
        };
    }

    container.innerHTML = `
        <div class="recommendation-result text-center">
            <div class="recommendation-icon mb-3">
                <i class="fas fa-lightbulb fa-3x" style="color: var(--accent);"></i>
            </div>
            <h3 class="mb-3">We Recommend: ${recommendation.service}</h3>
            <p class="text-muted mb-4">${recommendation.description}</p>
            <div class="recommendation-features mb-4">
                ${recommendation.features.map(f => `
                    <span class="badge bg-primary me-2 mb-2 p-2">${f}</span>
                `).join('')}
            </div>
            <a href="#contact" class="btn btn-primary btn-lg" data-bs-dismiss="modal">
                <i class="fas fa-calendar me-2"></i>Schedule Free Consultation
            </a>
        </div>
    `;
}

// Personalized Content based on referrer/industry detection
function detectVisitorIndustry() {
    const urlParams = new URLSearchParams(window.location.search);
    const industry = urlParams.get('industry');

    const industryMessages = {
        'healthcare': 'Welcome! We specialize in HIPAA-compliant IT solutions for healthcare providers.',
        'restaurant': 'Hi! Looking to modernize your restaurant with POS integration and online ordering?',
        'retail': 'Welcome! We help retail businesses with inventory management and e-commerce solutions.',
        'legal': 'Hello! We provide secure document management and AI-powered legal research tools.',
        'manufacturing': 'Welcome! Discover how automation can optimize your manufacturing operations.'
    };

    if (industry && industryMessages[industry]) {
        showPersonalizedBanner(industryMessages[industry]);
    }
}

function showPersonalizedBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'personalized-banner show';
    banner.innerHTML = `<strong><i class="fas fa-hand-wave me-2"></i>${message}</strong>`;
    document.body.insertBefore(banner, document.body.firstChild);
}

// Initialize AI features on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize ROI calculator defaults
    calculateROI();

    // Detect visitor industry for personalization
    detectVisitorIndustry();

    // Initialize smart form suggestions
    initSmartForm();

    // Initialize infographic animations
    initInfographicAnimations();

    // Loop terminal demo
    initTerminalDemo();

    // Auto-show chatbot after 30 seconds
    setTimeout(() => {
        const chatWindow = document.querySelector('.chatbot-window');
        if (!chatbotOpen && chatWindow) {
            // Just pulse the button, don't auto-open
            document.querySelector('.chatbot-toggle')?.classList.add('attention');
        }
    }, 30000);
});

// Smart Contact Form AI Suggestions
function initSmartForm() {
    const messageField = document.getElementById('message');
    const suggestionsDiv = document.getElementById('aiFormSuggestions');
    const suggestionText = document.getElementById('aiSuggestionText');

    if (!messageField || !suggestionsDiv) return;

    const suggestions = {
        'invoice': 'We can automate invoice processing with AI, saving you hours of manual data entry.',
        'email': 'Our AI email automation can categorize and draft responses automatically.',
        'customer': 'AI chatbots and customer analytics can transform your customer experience.',
        'data': 'We specialize in data extraction and analysis using advanced AI models.',
        'website': 'Our DevScope tool provides free AI-powered website audits. Check it out!',
        'app': 'We build custom web and mobile apps at 50% below market rates.',
        'security': 'We offer comprehensive IT security assessments and monitoring.',
        'slow': 'Performance optimization is one of our specialties. Let\'s speed things up!',
        'automat': 'Business automation is our passion! We can connect all your tools.',
        'integrat': 'We love making systems talk to each other. Integration is what we do.',
        'support': 'Our IT support includes same-day on-site visits in the Cranston area.',
        'mobile': 'We develop both iOS and Android apps with React Native.',
        'ai': 'AI is transforming businesses daily. Let\'s explore what it can do for you!',
        'chatgpt': 'We integrate ChatGPT and other AI models into business workflows.',
        'cost': 'Our rates are 50% below typical agencies. Quality without the markup.'
    };

    let debounceTimer;

    messageField.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const text = this.value.toLowerCase();
            let matched = false;

            for (const [keyword, suggestion] of Object.entries(suggestions)) {
                if (text.includes(keyword)) {
                    suggestionText.textContent = suggestion;
                    suggestionsDiv.style.display = 'block';
                    suggestionsDiv.style.animation = 'fadeIn 0.3s ease';
                    matched = true;
                    break;
                }
            }

            if (!matched && text.length > 20) {
                suggestionText.textContent = 'Great details! We\'ll analyze your needs and get back with a custom solution.';
                suggestionsDiv.style.display = 'block';
            } else if (!matched) {
                suggestionsDiv.style.display = 'none';
            }
        }, 500);
    });
}

// Infographic Circle Animation
function initInfographicAnimations() {
    const infographicItems = document.querySelectorAll('.infographic-item');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const percent = parseInt(entry.target.dataset.percent) || 0;
                    const circle = entry.target.querySelector('.progress');
                    if (circle) {
                        // Circle circumference = 2 * PI * r = 2 * 3.14159 * 54 ≈ 339.3
                        const circumference = 339.3;
                        const offset = circumference - (percent / 100) * circumference;
                        circle.style.strokeDashoffset = offset;
                    }
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        infographicItems.forEach(item => observer.observe(item));
    }
}

// Terminal Demo Animation Loop
function initTerminalDemo() {
    const terminal = document.getElementById('aiDemoTerminal');
    if (!terminal) return;

    const demos = [
        {
            command: 'process_invoice --ai',
            lines: [
                { text: 'Loading AI model... <span class="success">Done ✓</span>', delay: 500 },
                { text: 'Analyzing document structure...', delay: 1000 },
                { text: 'Extracting data fields...', delay: 1500 },
                { text: '<span class="success">✓ Vendor: ABC Supply Co.</span>', delay: 2000 },
                { text: '<span class="success">✓ Amount: $1,234.56</span>', delay: 2300 },
                { text: '<span class="success">✓ Due Date: 2026-02-15</span>', delay: 2600 },
                { text: '<span class="highlight">→ Auto-matched to PO #12345</span>', delay: 3000 },
                { text: '<span class="highlight">→ Synced to QuickBooks</span>', delay: 3500 },
                { text: '<span class="success">Processing complete! Time saved: 15 minutes</span>', delay: 4000 }
            ]
        },
        {
            command: 'analyze_customer_feedback --sentiment',
            lines: [
                { text: 'Connecting to review platforms... <span class="success">Done ✓</span>', delay: 500 },
                { text: 'Fetching 1,247 reviews...', delay: 1000 },
                { text: 'Running sentiment analysis...', delay: 2000 },
                { text: '<span class="success">✓ Positive: 84%</span>', delay: 2500 },
                { text: '<span class="output">✓ Neutral: 11%</span>', delay: 2800 },
                { text: '<span style="color:#ef4444;">✓ Negative: 5%</span>', delay: 3100 },
                { text: '<span class="highlight">Top themes: "fast service", "helpful staff"</span>', delay: 3500 },
                { text: '<span class="highlight">→ Report generated and emailed</span>', delay: 4000 },
                { text: '<span class="success">Analysis complete! Insights ready.</span>', delay: 4500 }
            ]
        },
        {
            command: 'automate_email_response --ai',
            lines: [
                { text: 'Scanning inbox... <span class="success">Found 23 new messages</span>', delay: 500 },
                { text: 'Categorizing emails with AI...', delay: 1000 },
                { text: '<span class="success">✓ 12 support requests classified</span>', delay: 1500 },
                { text: '<span class="success">✓ 8 sales inquiries detected</span>', delay: 1800 },
                { text: '<span class="success">✓ 3 urgent flagged</span>', delay: 2100 },
                { text: 'Generating draft responses...', delay: 2500 },
                { text: '<span class="highlight">→ 15 auto-replies ready for review</span>', delay: 3000 },
                { text: '<span class="highlight">→ 3 escalated to manager</span>', delay: 3500 },
                { text: '<span class="success">Email automation complete! 2 hours saved.</span>', delay: 4000 }
            ]
        }
    ];

    let currentDemo = 0;

    function runDemo() {
        const terminalBody = document.getElementById('terminalBody');
        if (!terminalBody) return;

        const demo = demos[currentDemo];
        terminalBody.innerHTML = '';

        // Add command line
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="prompt">techflow@ai:~$</span> <span class="command">${demo.command}</span>`;
        commandLine.style.animation = 'typeLine 0.3s ease forwards';
        terminalBody.appendChild(commandLine);

        // Add output lines with delays
        demo.lines.forEach((line, index) => {
            setTimeout(() => {
                const outputLine = document.createElement('div');
                outputLine.className = 'terminal-line';
                outputLine.innerHTML = `<span class="output">${line.text}</span>`;
                outputLine.style.animation = 'typeLine 0.3s ease forwards';
                terminalBody.appendChild(outputLine);
            }, line.delay);
        });

        // Schedule next demo
        currentDemo = (currentDemo + 1) % demos.length;
        setTimeout(runDemo, 8000);
    }

    // Start demo loop with intersection observer
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(runDemo, 1000);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(terminal);
    } else {
        setTimeout(runDemo, 1000);
    }
}
