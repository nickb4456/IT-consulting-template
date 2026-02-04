/**
 * DraftBridge Dialog Window Logic
 * ═══════════════════════════════════════════════════════════════════
 * Handles form loading, preview generation, and message passing
 * back to the taskpane for document insertion.
 * ═══════════════════════════════════════════════════════════════════
 */

// Form type constants
const FORM_TYPES = {
    'demand-letter': {
        title: 'Demand Letter',
        icon: '✉️'
    },
    'motion-to-dismiss': {
        title: 'Motion to Dismiss',
        icon: '⚖️'
    }
};

// Current form state
let currentFormType = null;
let previewDebounceTimer = null;

/**
 * Initialize when Office is ready
 */
Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        initializeDialog();
    }
});

/**
 * Initialize the dialog
 */
function initializeDialog() {
    // Get form type from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentFormType = urlParams.get('form') || 'generic';
    
    // Set up the form
    loadForm(currentFormType);
    
    // Set up live preview listeners
    setupPreviewListeners();
    
    // Initial preview
    setTimeout(refreshPreview, 300);
}

/**
 * Load the appropriate form based on type
 */
function loadForm(formType) {
    // Update title
    const formInfo = FORM_TYPES[formType];
    const titleEl = document.getElementById('formTitle');
    
    if (formInfo) {
        titleEl.textContent = formInfo.title;
        document.title = `DraftBridge - ${formInfo.title}`;
    } else {
        titleEl.textContent = 'Form';
    }
    
    // Hide all forms
    document.querySelectorAll('.form-content').forEach(form => {
        form.classList.add('hidden');
    });
    
    // Show the requested form
    const formEl = document.getElementById(`form-${formType}`);
    if (formEl) {
        formEl.classList.remove('hidden');
        
        // Set default date to today
        const dateInputs = formEl.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            if (!input.value) {
                input.value = today;
            }
        });
        
        // Set default deadline (10 days from now) for demand letter
        if (formType === 'demand-letter') {
            const deadlineInput = document.getElementById('demand-deadline');
            if (deadlineInput && !deadlineInput.value) {
                const deadline = new Date();
                deadline.setDate(deadline.getDate() + 10);
                deadlineInput.value = deadline.toISOString().split('T')[0];
            }
        }
    } else {
        document.getElementById('form-generic').classList.remove('hidden');
    }
}

/**
 * Set up live preview listeners on all form inputs
 */
function setupPreviewListeners() {
    const formSection = document.querySelector('.form-section');
    if (!formSection) return;
    
    // Listen to all input changes
    formSection.addEventListener('input', () => {
        // Debounce preview updates
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(refreshPreview, 150);
    });
    
    // Also listen to select changes
    formSection.addEventListener('change', () => {
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(refreshPreview, 150);
    });
}

/**
 * Refresh the preview pane
 */
function refreshPreview() {
    const previewEl = document.getElementById('previewContent');
    if (!previewEl) return;
    
    let previewHtml = '';
    
    switch (currentFormType) {
        case 'demand-letter':
            previewHtml = generateDemandLetterPreview();
            break;
        case 'motion-to-dismiss':
            previewHtml = generateMotionPreview();
            break;
        default:
            previewHtml = '<div class="preview-placeholder"><div class="preview-placeholder-icon">📝</div><p>Preview not available for this form type</p></div>';
    }
    
    previewEl.innerHTML = previewHtml;
}

/**
 * Generate Demand Letter preview
 */
function generateDemandLetterPreview() {
    const data = getDemandLetterData();
    const formatDate = (dateStr) => {
        if (!dateStr) return placeholder('Date');
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    
    const val = (value, label) => value ? `<span class="filled-value">${escapeHtml(value)}</span>` : placeholder(label);
    
    return `
        <div class="preview-document letter-preview">
            <div class="letter-date">${formatDate(data.date)}</div>
            
            ${data.delivery ? `<div class="letter-delivery">${escapeHtml(data.delivery)}</div>` : ''}
            
            <div class="letter-recipient">
                ${val(data.recipient, 'Recipient Name')}<br>
                ${data.recipientTitle ? escapeHtml(data.recipientTitle) + '<br>' : ''}
                ${data.company ? escapeHtml(data.company) + '<br>' : ''}
                ${val(data.address, 'Address').replace(/\n/g, '<br>')}
            </div>
            
            <div class="letter-re">
                <strong>RE:</strong> ${val(data.subject, 'Subject Matter')}
            </div>
            
            <div class="letter-salutation">Dear ${val(data.recipient, 'Recipient Name')}:</div>
            
            <div class="letter-body">
                <p>This letter constitutes a formal demand for payment in the amount of ${val(data.amount, 'Amount')}.</p>
                
                ${data.basis ? `<p>${escapeHtml(data.basis)}</p>` : `<p>${placeholder('Basis for demand will appear here...')}</p>`}
                
                <p>Please remit payment in full on or before ${formatDate(data.deadline)}. Failure to respond to this demand may result in legal action being taken against you without further notice.</p>
                
                <p>Please govern yourself accordingly.</p>
            </div>
            
            <div class="letter-closing">Very truly yours,</div>
            
            <div class="letter-signature">
                ${val(data.sender, 'Attorney Name')}<br>
                ${data.senderTitle ? escapeHtml(data.senderTitle) + '<br>' : ''}
                ${data.firm ? escapeHtml(data.firm) : ''}
            </div>
        </div>
    `;
}

/**
 * Generate Motion to Dismiss preview
 */
function generateMotionPreview() {
    const data = getMotionData();
    const val = (value, label) => value ? `<span class="filled-value">${escapeHtml(value)}</span>` : placeholder(label);
    
    // Get selected grounds
    const grounds = [];
    document.querySelectorAll('#form-motion-to-dismiss input[type="checkbox"]:checked').forEach(cb => {
        grounds.push(cb.value);
    });
    const groundsText = grounds.length > 0 ? grounds.join(', ') : placeholder('Rule 12(b) grounds');
    
    return `
        <div class="preview-document">
            <div class="doc-header">
                <div class="doc-court">${val(data.court, 'Court Name')}</div>
                <div>${val(data.district, 'District/Jurisdiction')}</div>
            </div>
            
            <div class="doc-caption">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 45%; vertical-align: top; padding: 8px;">
                            ${val(data.plaintiff, 'PLAINTIFF')},<br><br>
                            <div style="padding-left: 40px;">Plaintiff,</div><br>
                            v.<br><br>
                            ${val(data.defendant, 'DEFENDANT')},<br><br>
                            <div style="padding-left: 40px;">Defendant.</div>
                        </td>
                        <td style="width: 10%; text-align: center; vertical-align: middle;">)</td>
                        <td style="width: 45%; vertical-align: top; padding: 8px;">
                            Case No. ${val(data.caseNumber, 'Case Number')}<br><br>
                            ${data.judge ? `Judge: ${escapeHtml(data.judge)}` : ''}
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="doc-title">
                DEFENDANT'S MOTION TO DISMISS<br>
                PURSUANT TO FED. R. CIV. P. ${groundsText}
            </div>
            
            <div class="doc-body">
                <p class="doc-para">
                    Defendant ${val(data.defendant, 'Defendant')}, by and through undersigned counsel, 
                    hereby moves this Honorable Court pursuant to Federal Rule of Civil Procedure ${groundsText} 
                    to dismiss the Complaint filed by Plaintiff ${val(data.plaintiff, 'Plaintiff')}.
                </p>
                
                ${data.summary ? `
                <p class="doc-para">
                    <strong>INTRODUCTION</strong><br>
                    ${escapeHtml(data.summary)}
                </p>
                ` : `
                <p class="doc-para">
                    ${placeholder('Brief summary of arguments will appear here...')}
                </p>
                `}
                
                <p class="doc-para">
                    WHEREFORE, Defendant respectfully requests that this Court grant Defendant's 
                    Motion to Dismiss and dismiss Plaintiff's Complaint with prejudice, together 
                    with such other relief as this Court deems just and proper.
                </p>
            </div>
            
            <div class="doc-signature" style="margin-top: 40px;">
                <p>Respectfully submitted,</p>
                <br><br><br>
                <p>_______________________________</p>
                <p>${val(data.attorney, 'Attorney Name')}</p>
                ${data.bar ? `<p>Bar No. ${escapeHtml(data.bar)}</p>` : ''}
                ${data.firm ? `<p>${escapeHtml(data.firm)}</p>` : ''}
                ${data.firmAddress ? `<p>${escapeHtml(data.firmAddress).replace(/\n/g, '<br>')}</p>` : ''}
                ${data.phone ? `<p>Tel: ${escapeHtml(data.phone)}</p>` : ''}
                ${data.email ? `<p>Email: ${escapeHtml(data.email)}</p>` : ''}
                <p><em>Counsel for Defendant</em></p>
            </div>
        </div>
    `;
}

/**
 * Get demand letter form data
 */
function getDemandLetterData() {
    return {
        date: document.getElementById('demand-date')?.value || '',
        recipient: document.getElementById('demand-recipient')?.value || '',
        recipientTitle: document.getElementById('demand-recipient-title')?.value || '',
        company: document.getElementById('demand-company')?.value || '',
        address: document.getElementById('demand-address')?.value || '',
        subject: document.getElementById('demand-subject')?.value || '',
        amount: document.getElementById('demand-amount')?.value || '',
        deadline: document.getElementById('demand-deadline')?.value || '',
        basis: document.getElementById('demand-basis')?.value || '',
        tone: document.getElementById('demand-tone')?.value || 'firm',
        sender: document.getElementById('demand-sender')?.value || '',
        senderTitle: document.getElementById('demand-sender-title')?.value || '',
        firm: document.getElementById('demand-firm')?.value || '',
        delivery: document.getElementById('demand-delivery')?.value || ''
    };
}

/**
 * Get motion to dismiss form data
 */
function getMotionData() {
    const grounds = [];
    document.querySelectorAll('#form-motion-to-dismiss input[type="checkbox"]:checked').forEach(cb => {
        grounds.push(cb.value);
    });
    
    return {
        court: document.getElementById('motion-court')?.value || '',
        district: document.getElementById('motion-district')?.value || '',
        caseNumber: document.getElementById('motion-case-number')?.value || '',
        judge: document.getElementById('motion-judge')?.value || '',
        plaintiff: document.getElementById('motion-plaintiff')?.value || '',
        defendant: document.getElementById('motion-defendant')?.value || '',
        grounds: grounds,
        summary: document.getElementById('motion-summary')?.value || '',
        attorney: document.getElementById('motion-attorney')?.value || '',
        bar: document.getElementById('motion-bar')?.value || '',
        firm: document.getElementById('motion-firm')?.value || '',
        firmAddress: document.getElementById('motion-firm-address')?.value || '',
        phone: document.getElementById('motion-phone')?.value || '',
        email: document.getElementById('motion-email')?.value || ''
    };
}

/**
 * Close the dialog
 */
function closeDialog() {
    Office.context.ui.messageParent(JSON.stringify({
        action: 'cancel'
    }));
}

/**
 * Insert the document
 */
function insertDocument() {
    let formData = {};
    let isValid = true;
    
    switch (currentFormType) {
        case 'demand-letter':
            formData = getDemandLetterData();
            // Validate required fields
            if (!formData.recipient || !formData.address || !formData.subject || !formData.amount || !formData.sender) {
                alert('Please fill in all required fields (marked with *)');
                isValid = false;
            }
            break;
            
        case 'motion-to-dismiss':
            formData = getMotionData();
            // Validate required fields
            if (!formData.court || !formData.district || !formData.caseNumber || 
                !formData.plaintiff || !formData.defendant || !formData.attorney ||
                formData.grounds.length === 0) {
                alert('Please fill in all required fields (marked with *) and select at least one Rule 12(b) ground');
                isValid = false;
            }
            break;
            
        default:
            alert('Unknown form type');
            isValid = false;
    }
    
    if (isValid) {
        // Send data back to taskpane
        Office.context.ui.messageParent(JSON.stringify({
            action: 'insert',
            formType: currentFormType,
            data: formData
        }));
    }
}

/**
 * Helper: Create placeholder span
 */
function placeholder(text) {
    return `<span class="placeholder">[${text}]</span>`;
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
