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

// ============================================
// TECHNICAL WOW FACTOR
// ============================================

// Loading Screen
function initLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const statusText = loadingScreen?.querySelector('.loader-status');

    if (!loadingScreen) return;

    const statuses = [
        'Initializing AI Systems...',
        'Loading 3D Environment...',
        'Connecting to Cloud...',
        'Preparing Experience...',
        'Almost Ready...'
    ];

    let statusIndex = 0;
    const statusInterval = setInterval(() => {
        statusIndex = (statusIndex + 1) % statuses.length;
        if (statusText) statusText.textContent = statuses[statusIndex];
    }, 400);

    // Hide loading screen after everything loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            clearInterval(statusInterval);
            loadingScreen.classList.add('hidden');
            document.body.classList.add('loaded');

            // Trigger entrance animations
            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el, i) => {
                setTimeout(() => el.classList.add('active'), i * 100);
            });
        }, 2200); // Match the loader progress animation
    });
}

// WebGL Shader Background
function initShaderBackground() {
    const canvas = document.getElementById('shaderBg');
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    // Vertex shader
    const vertexShaderSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    // Fragment shader - flowing gradient
    const fragmentShaderSource = `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;

        void main() {
            vec2 uv = gl_FragCoord.xy / resolution.xy;

            // Create flowing waves
            float wave1 = sin(uv.x * 3.0 + time * 0.5) * 0.5 + 0.5;
            float wave2 = sin(uv.y * 2.0 + time * 0.3 + 1.5) * 0.5 + 0.5;
            float wave3 = sin((uv.x + uv.y) * 2.5 + time * 0.4) * 0.5 + 0.5;

            // Mix colors
            vec3 color1 = vec3(0.145, 0.388, 0.922); // Primary blue
            vec3 color2 = vec3(0.024, 0.714, 0.831); // Cyan
            vec3 color3 = vec3(0.545, 0.361, 0.965); // Purple

            vec3 color = mix(color1, color2, wave1);
            color = mix(color, color3, wave2 * 0.5);

            // Add noise-like variation
            float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
            color += noise * 0.03;

            // Radial fade from center
            float dist = distance(uv, vec2(0.5, 0.5));
            float alpha = smoothstep(0.8, 0.2, dist) * 0.3;

            gl_FragColor = vec4(color, alpha * (wave3 * 0.5 + 0.5));
        }
    `;

    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Create full-screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    let animating = true;
    function render(time) {
        if (!animating) return;
        gl.uniform1f(timeLocation, time * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    // Only animate when visible
    const observer = new IntersectionObserver((entries) => {
        animating = entries[0].isIntersecting;
        if (animating) requestAnimationFrame(render);
    });
    observer.observe(canvas);

    requestAnimationFrame(render);
}

// Scroll Reveal Animations
function initScrollReveal() {
    // Auto-add reveal classes to elements
    const revealSelectors = [
        '.section-header',
        '.service-card',
        '.industry-card',
        '.why-card',
        '.testimonial-card',
        '.faq-item',
        '.contact-info',
        '.contact-form-wrapper'
    ];

    revealSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, index) => {
            if (!el.classList.contains('reveal') &&
                !el.classList.contains('reveal-left') &&
                !el.classList.contains('reveal-right')) {
                el.classList.add('reveal');
                el.classList.add(`reveal-delay-${(index % 6) + 1}`);
            }
        });
    });

    // Intersection Observer for reveal animations
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-rotate').forEach(el => {
        revealObserver.observe(el);
    });
}

// Cursor Glow Effect
function initCursorGlow() {
    // Only on desktop
    if (window.innerWidth < 992) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateGlow() {
        // Smooth follow
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;

        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';

        requestAnimationFrame(animateGlow);
    }

    animateGlow();

    // Hide on scroll for performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        glow.style.opacity = '0';
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            glow.style.opacity = '1';
        }, 150);
    });
}

// Parallax Effect
function initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');

    if (parallaxElements.length === 0) return;

    function updateParallax() {
        const scrollY = window.scrollY;

        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            const rect = el.getBoundingClientRect();
            const offset = (rect.top + scrollY) * speed;
            el.style.transform = `translateY(${scrollY * speed - offset}px)`;
        });
    }

    window.addEventListener('scroll', updateParallax, { passive: true });
    updateParallax();
}

// Magnetic Buttons
function initMagneticButtons() {
    if (window.innerWidth < 992) return;

    document.querySelectorAll('.btn-primary, .btn-outline-primary, .nav-cta').forEach(btn => {
        btn.classList.add('magnetic-btn');

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
        });
    });
}

// Tilt Cards
function initTiltCards() {
    if (window.innerWidth < 992) return;

    document.querySelectorAll('.service-card, .industry-card, .why-card').forEach(card => {
        card.classList.add('tilt-card');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const tiltX = (y - centerY) / 10;
            const tiltY = (centerX - x) / 10;

            card.style.setProperty('--tilt-x', `${tiltX}deg`);
            card.style.setProperty('--tilt-y', `${tiltY}deg`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        });
    });
}

// Ripple Effect on Buttons
function initRippleEffect() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.add('ripple');

        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'ripple-effect';
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Counter Animation
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.count);
                const duration = 2000;
                const start = performance.now();
                const startValue = 0;

                function updateCounter(currentTime) {
                    const elapsed = currentTime - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.floor(startValue + (target - startValue) * eased);

                    entry.target.textContent = current.toLocaleString();

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        entry.target.textContent = target.toLocaleString();
                    }
                }

                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
}

// Page Transition Effect
function initPageTransitions() {
    const transition = document.createElement('div');
    transition.className = 'page-transition';
    document.body.appendChild(transition);

    document.querySelectorAll('a[href]:not([href^="#"]):not([href^="tel"]):not([href^="mailto"]):not([target="_blank"])').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('//')) {
                e.preventDefault();
                transition.classList.add('active');
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
}

// Live Visitor Counter
function initLiveVisitorCounter() {
    const counter = document.getElementById('visitorCount');
    if (!counter) return;

    // Simulate live visitors (in production, this would connect to analytics)
    let currentCount = 8 + Math.floor(Math.random() * 10);
    counter.textContent = currentCount;

    setInterval(() => {
        // Random fluctuation
        const change = Math.random() > 0.5 ? 1 : -1;
        currentCount = Math.max(5, Math.min(25, currentCount + change));
        counter.textContent = currentCount;
    }, 5000 + Math.random() * 5000);
}

// Scroll Progress Bar
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
    }, { passive: true });
}

// Social Proof Notifications
function initSocialProofNotifications() {
    const notifications = [
        { icon: 'fa-check-circle', title: 'New Project Started', text: 'AI integration for local restaurant', time: '2 minutes ago' },
        { icon: 'fa-star', title: '5-Star Review', text: '"Excellent service, highly recommend!"', time: '15 minutes ago' },
        { icon: 'fa-calendar-check', title: 'Consultation Booked', text: 'New client from Providence, RI', time: '32 minutes ago' },
        { icon: 'fa-rocket', title: 'Project Completed', text: 'Mobile app launched successfully', time: '1 hour ago' },
        { icon: 'fa-handshake', title: 'New Partnership', text: 'Local business automation project', time: '2 hours ago' }
    ];

    // Create toast container
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-check"></i></div>
        <div class="toast-content">
            <h5></h5>
            <p></p>
            <div class="toast-time"></div>
        </div>
    `;
    document.body.appendChild(toast);

    let notificationIndex = 0;

    function showNotification() {
        const notification = notifications[notificationIndex];
        toast.querySelector('.toast-icon i').className = 'fas ' + notification.icon;
        toast.querySelector('h5').textContent = notification.title;
        toast.querySelector('p').textContent = notification.text;
        toast.querySelector('.toast-time').textContent = notification.time;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);

        notificationIndex = (notificationIndex + 1) % notifications.length;
    }

    // Show first notification after 10 seconds, then every 30-60 seconds
    setTimeout(() => {
        showNotification();
        setInterval(showNotification, 30000 + Math.random() * 30000);
    }, 10000);
}

// Typing Testimonials
function initTypingTestimonials() {
    const testimonials = document.querySelectorAll('.testimonial-text');
    if (testimonials.length === 0) return;

    testimonials.forEach(testimonial => {
        const text = testimonial.textContent;
        testimonial.textContent = '';
        testimonial.classList.add('testimonial-typing');

        let charIndex = 0;
        let hasStarted = false;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !hasStarted) {
                hasStarted = true;

                function typeChar() {
                    if (charIndex < text.length) {
                        testimonial.textContent = text.substring(0, charIndex + 1);
                        charIndex++;
                        setTimeout(typeChar, 20 + Math.random() * 30);
                    }
                }

                typeChar();
                observer.unobserve(testimonial);
            }
        }, { threshold: 0.5 });

        observer.observe(testimonial);
    });
}

// Smooth Number Counting for Stats
function initStatCounters() {
    const stats = document.querySelectorAll('.stat-number[data-count]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.count);
                const suffix = entry.target.dataset.suffix || '';
                const duration = 2000;
                const startTime = performance.now();

                function updateCount(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 4);
                    const current = Math.floor(target * eased);

                    entry.target.textContent = current.toLocaleString() + suffix;

                    if (progress < 1) {
                        requestAnimationFrame(updateCount);
                    } else {
                        entry.target.textContent = target.toLocaleString() + suffix;
                    }
                }

                requestAnimationFrame(updateCount);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
}

// Easter Egg - Konami Code
function initEasterEgg() {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Trigger easter egg - make everything neon!
                document.body.style.filter = 'hue-rotate(180deg)';
                setTimeout(() => {
                    document.body.style.filter = '';
                }, 3000);
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
}

// Initialize all wow factor features
document.addEventListener('DOMContentLoaded', function() {
    initLoadingScreen();
    initShaderBackground();
    initScrollReveal();
    initCursorGlow();
    initParallax();
    initMagneticButtons();
    initTiltCards();
    initRippleEffect();
    initCounters();
    initPageTransitions();
    initLiveVisitorCounter();
    initScrollProgress();
    initSocialProofNotifications();
    initStatCounters();
    initEasterEgg();
});
