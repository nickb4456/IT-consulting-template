/**
 * DraftBridge Dialog B - JavaScript
 * Version B: Popup Dialog Windows
 * NO EMOJIS - Clean text labels
 * ════════════════════════════════════════════════════════════════════
 */

// Current state
let currentForm = null;
let selectedScheme = null;
let selectedClause = null;
let previewDebounceTimer = null;

// Clause Library Samples
const CLAUSE_LIBRARY = [
    {
        id: 'conf-standard',
        title: 'Standard Confidentiality',
        category: 'confidentiality',
        content: `The Receiving Party agrees to hold in confidence and not disclose to any third party any Confidential Information received from the Disclosing Party, except as expressly permitted herein. The Receiving Party shall use the same degree of care to protect the Disclosing Party's Confidential Information as it uses to protect its own confidential information of like kind, but in no event less than reasonable care.`
    },
    {
        id: 'conf-mutual',
        title: 'Mutual Confidentiality',
        category: 'confidentiality',
        content: `Each party (as "Receiving Party") agrees to hold in confidence all Confidential Information disclosed by the other party (as "Disclosing Party"). Neither party shall use the other party's Confidential Information except as necessary to perform its obligations or exercise its rights under this Agreement.`
    },
    {
        id: 'indem-standard',
        title: 'Standard Indemnification',
        category: 'indemnification',
        content: `The Indemnifying Party shall defend, indemnify, and hold harmless the Indemnified Party and its officers, directors, employees, agents, and successors from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to any breach of this Agreement by the Indemnifying Party.`
    },
    {
        id: 'indem-ip',
        title: 'IP Indemnification',
        category: 'indemnification',
        content: `Provider shall defend, indemnify, and hold harmless Client from and against any claim that the Services or Deliverables infringe any patent, copyright, trademark, or trade secret of any third party, provided that Client: (a) promptly notifies Provider in writing of such claim; (b) gives Provider sole control of the defense and settlement thereof; and (c) provides reasonable assistance at Provider's expense.`
    },
    {
        id: 'limit-liability',
        title: 'Limitation of Liability',
        category: 'liability',
        content: `IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, EVEN IF SUCH PARTY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. EACH PARTY'S TOTAL CUMULATIVE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE AMOUNTS PAID OR PAYABLE HEREUNDER DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`
    },
    {
        id: 'term-convenience',
        title: 'Termination for Convenience',
        category: 'termination',
        content: `Either party may terminate this Agreement for convenience upon thirty (30) days' prior written notice to the other party. Upon termination, all rights and licenses granted hereunder shall immediately terminate, and each party shall return or destroy all Confidential Information of the other party in its possession.`
    },
    {
        id: 'term-cause',
        title: 'Termination for Cause',
        category: 'termination',
        content: `Either party may terminate this Agreement immediately upon written notice if the other party: (a) materially breaches this Agreement and fails to cure such breach within thirty (30) days after receiving written notice thereof; (b) becomes insolvent or makes an assignment for the benefit of creditors; or (c) becomes subject to any bankruptcy or similar proceeding.`
    },
    {
        id: 'force-majeure',
        title: 'Force Majeure',
        category: 'general',
        content: `Neither party shall be liable for any failure or delay in performing its obligations under this Agreement if such failure or delay results from circumstances beyond the reasonable control of that party, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.`
    },
    {
        id: 'entire-agreement',
        title: 'Entire Agreement',
        category: 'general',
        content: `This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, and discussions, whether oral or written, between the parties. No amendment or modification of this Agreement shall be binding unless in writing and signed by both parties.`
    },
    {
        id: 'governing-law',
        title: 'Governing Law',
        category: 'general',
        content: `This Agreement shall be governed by and construed in accordance with the laws of the State of [STATE], without regard to its conflict of laws principles. Any dispute arising out of or relating to this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in [COUNTY], [STATE].`
    }
];

// Numbering Schemes
const NUMBERING_SCHEMES = [
    {
        id: 'legal-outline',
        name: 'Legal Outline',
        example: 'I.\n   A.\n      1.\n         a.\n            (1)',
        description: 'Traditional legal document numbering'
    },
    {
        id: 'decimal',
        name: 'Decimal (1.1.1)',
        example: '1.\n   1.1.\n      1.1.1.',
        description: 'Technical document style'
    },
    {
        id: 'alpha-numeric',
        name: 'Alpha-Numeric',
        example: 'A.\n   1.\n      a.',
        description: 'Simple letter-number alternating'
    },
    {
        id: 'roman',
        name: 'Roman Numerals',
        example: 'I.\n   A.\n      1.',
        description: 'Roman numerals at top level'
    }
];

/**
 * Initialize when Office is ready
 */
Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        initializeDialog();
    }
});

/**
 * Initialize the dialog based on URL param
 */
function initializeDialog() {
    const urlParams = new URLSearchParams(window.location.search);
    currentForm = urlParams.get('form') || 'generate';
    
    loadForm(currentForm);
    setupPreviewListeners();
    setTimeout(refreshPreview, 300);
}

/**
 * Load the appropriate form
 */
function loadForm(formType) {
    const titleEl = document.getElementById('formTitle');
    
    // Hide all forms
    document.querySelectorAll('.form-content').forEach(f => f.classList.add('hidden'));
    
    // Set title and show form
    switch (formType) {
        case 'generate':
            titleEl.textContent = 'Generate Document';
            document.getElementById('form-generate').classList.remove('hidden');
            break;
        case 'numbering':
            titleEl.textContent = 'Numbering';
            document.getElementById('form-numbering').classList.remove('hidden');
            renderNumberingSchemes();
            break;
        case 'clauses':
            titleEl.textContent = 'Clause Library';
            document.getElementById('form-clauses').classList.remove('hidden');
            renderClauseLibrary();
            break;
        case 'settings':
            titleEl.textContent = 'Settings';
            document.getElementById('form-settings').classList.remove('hidden');
            loadSettings();
            break;
        default:
            titleEl.textContent = 'Generate Document';
            document.getElementById('form-generate').classList.remove('hidden');
    }
    
    document.title = `DraftBridge - ${titleEl.textContent}`;
}

/**
 * Set up live preview
 */
function setupPreviewListeners() {
    const formSection = document.querySelector('.form-section');
    if (!formSection) return;
    
    formSection.addEventListener('input', () => {
        clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(refreshPreview, 150);
    });
    
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
    
    let html = '';
    
    switch (currentForm) {
        case 'generate':
            html = generateDocumentPreview();
            break;
        case 'numbering':
            html = generateNumberingPreview();
            break;
        case 'clauses':
            html = generateClausePreview();
            break;
        case 'settings':
            html = generateSettingsPreview();
            break;
        default:
            html = '<div class="preview-placeholder"><div class="preview-placeholder-icon">?</div><p>Preview not available</p></div>';
    }
    
    previewEl.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════
// GENERATE DOCUMENT
// ════════════════════════════════════════════════════════════════════

function switchDocType(type) {
    document.querySelectorAll('.doc-type-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(`form-${type}`).classList.remove('hidden');
    
    document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    setTimeout(refreshPreview, 100);
}

function generateDocumentPreview() {
    const activeForm = document.querySelector('.doc-type-form:not(.hidden)');
    if (!activeForm) return getPlaceholderPreview();
    
    const formId = activeForm.id;
    
    if (formId === 'form-demand-letter') {
        return generateDemandLetterPreview();
    } else if (formId === 'form-motion') {
        return generateMotionPreview();
    } else if (formId === 'form-memo') {
        return generateMemoPreview();
    }
    
    return getPlaceholderPreview();
}

function generateDemandLetterPreview() {
    const d = getDemandLetterData();
    const formatDate = (str) => {
        if (!str) return placeholder('Date');
        const date = new Date(str + 'T00:00:00');
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };
    const val = (v, label) => v ? `<span class="filled-value">${escapeHtml(v)}</span>` : placeholder(label);
    
    return `
        <div class="preview-document letter-preview">
            <div class="letter-date">${formatDate(d.date)}</div>
            ${d.delivery ? `<div class="letter-delivery">${escapeHtml(d.delivery)}</div>` : ''}
            <div class="letter-recipient">
                ${val(d.recipient, 'Recipient Name')}<br>
                ${d.recipientTitle ? escapeHtml(d.recipientTitle) + '<br>' : ''}
                ${d.company ? escapeHtml(d.company) + '<br>' : ''}
                ${val(d.address, 'Address').replace(/\n/g, '<br>')}
            </div>
            <div class="letter-re"><strong>RE:</strong> ${val(d.subject, 'Subject Matter')}</div>
            <div class="letter-salutation">Dear ${val(d.recipient, 'Recipient')}:</div>
            <div class="letter-body">
                <p>This letter constitutes a formal demand for payment in the amount of ${val(d.amount, 'Amount')}.</p>
                ${d.basis ? `<p>${escapeHtml(d.basis)}</p>` : `<p>${placeholder('Basis for demand...')}</p>`}
                <p>Please remit payment in full on or before ${formatDate(d.deadline)}. Failure to respond may result in legal action.</p>
                <p>Please govern yourself accordingly.</p>
            </div>
            <div class="letter-closing">Very truly yours,</div>
            <div class="letter-signature">
                ${val(d.sender, 'Attorney Name')}<br>
                ${d.senderTitle ? escapeHtml(d.senderTitle) + '<br>' : ''}
                ${d.firm ? escapeHtml(d.firm) : ''}
            </div>
        </div>
    `;
}

function generateMotionPreview() {
    const d = getMotionData();
    const val = (v, label) => v ? `<span class="filled-value">${escapeHtml(v)}</span>` : placeholder(label);
    const groundsText = d.grounds.length > 0 ? d.grounds.join(', ') : placeholder('Rule 12(b) grounds');
    
    return `
        <div class="preview-document">
            <div class="doc-header">
                <div class="doc-court">${val(d.court, 'Court Name')}</div>
                <div>${val(d.district, 'District/Jurisdiction')}</div>
            </div>
            <div class="doc-caption">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="width:45%;vertical-align:top;padding:8px;">
                            ${val(d.plaintiff, 'PLAINTIFF')},<br><br>
                            <div style="padding-left:40px;">Plaintiff,</div><br>
                            v.<br><br>
                            ${val(d.defendant, 'DEFENDANT')},<br><br>
                            <div style="padding-left:40px;">Defendant.</div>
                        </td>
                        <td style="width:10%;text-align:center;vertical-align:middle;">)</td>
                        <td style="width:45%;vertical-align:top;padding:8px;">
                            Case No. ${val(d.caseNumber, 'Case Number')}<br><br>
                            ${d.judge ? `Judge: ${escapeHtml(d.judge)}` : ''}
                        </td>
                    </tr>
                </table>
            </div>
            <div class="doc-title">DEFENDANT'S MOTION TO DISMISS<br>PURSUANT TO FED. R. CIV. P. ${groundsText}</div>
            <div class="doc-body">
                <p class="doc-para">Defendant ${val(d.defendant, 'Defendant')}, by and through undersigned counsel, hereby moves this Honorable Court pursuant to Federal Rule of Civil Procedure ${groundsText} to dismiss the Complaint filed by Plaintiff ${val(d.plaintiff, 'Plaintiff')}.</p>
                ${d.summary ? `<p class="doc-para"><strong>INTRODUCTION</strong><br>${escapeHtml(d.summary)}</p>` : `<p class="doc-para">${placeholder('Brief summary of arguments...')}</p>`}
                <p class="doc-para">WHEREFORE, Defendant respectfully requests that this Court grant Defendant's Motion to Dismiss and dismiss Plaintiff's Complaint with prejudice.</p>
            </div>
            <div class="doc-signature" style="margin-top:40px;">
                <p>Respectfully submitted,</p><br><br><br>
                <p>_______________________________</p>
                <p>${val(d.attorney, 'Attorney Name')}</p>
                ${d.bar ? `<p>Bar No. ${escapeHtml(d.bar)}</p>` : ''}
                ${d.firm ? `<p>${escapeHtml(d.firm)}</p>` : ''}
                <p><em>Counsel for Defendant</em></p>
            </div>
        </div>
    `;
}

function generateMemoPreview() {
    const d = getMemoData();
    const val = (v, label) => v ? `<span class="filled-value">${escapeHtml(v)}</span>` : placeholder(label);
    
    return `
        <div class="preview-document">
            <div style="font-weight:bold;font-size:16px;margin-bottom:20px;text-align:center;">MEMORANDUM</div>
            <table style="width:100%;margin-bottom:20px;">
                <tr><td style="width:60px;"><strong>TO:</strong></td><td>${val(d.to, 'Recipient')}</td></tr>
                <tr><td><strong>FROM:</strong></td><td>${val(d.from, 'Sender')}</td></tr>
                <tr><td><strong>DATE:</strong></td><td>${val(d.date || new Date().toLocaleDateString(), 'Date')}</td></tr>
                <tr><td><strong>RE:</strong></td><td>${val(d.subject, 'Subject')}</td></tr>
                ${d.cc ? `<tr><td><strong>CC:</strong></td><td>${escapeHtml(d.cc)}</td></tr>` : ''}
            </table>
            <hr style="border:none;border-top:2px solid #333;margin:16px 0;">
            <div class="doc-body">
                ${d.body ? `<p>${escapeHtml(d.body)}</p>` : `<p>${placeholder('Memo body...')}</p>`}
            </div>
        </div>
    `;
}

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

function getMotionData() {
    const grounds = [];
    document.querySelectorAll('#form-motion input[type="checkbox"]:checked').forEach(cb => {
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

function getMemoData() {
    return {
        to: document.getElementById('memo-to')?.value || '',
        from: document.getElementById('memo-from')?.value || '',
        date: document.getElementById('memo-date')?.value || '',
        subject: document.getElementById('memo-subject')?.value || '',
        cc: document.getElementById('memo-cc')?.value || '',
        body: document.getElementById('memo-body')?.value || ''
    };
}

// ════════════════════════════════════════════════════════════════════
// NUMBERING
// ════════════════════════════════════════════════════════════════════

function renderNumberingSchemes() {
    const container = document.getElementById('scheme-list');
    if (!container) return;
    
    container.innerHTML = NUMBERING_SCHEMES.map(s => `
        <div class="scheme-item ${selectedScheme === s.id ? 'selected' : ''}" onclick="selectScheme('${s.id}')">
            <div class="scheme-name">${s.name}</div>
            <div class="scheme-example">${s.example}</div>
        </div>
    `).join('');
}

function selectScheme(id) {
    selectedScheme = id;
    renderNumberingSchemes();
    refreshPreview();
}

function generateNumberingPreview() {
    if (!selectedScheme) {
        return `<div class="preview-placeholder"><div class="preview-placeholder-icon">#</div><p>Select a numbering scheme</p></div>`;
    }
    
    const scheme = NUMBERING_SCHEMES.find(s => s.id === selectedScheme);
    if (!scheme) return getPlaceholderPreview();
    
    const levels = parseInt(document.getElementById('num-levels')?.value) || 3;
    
    let preview = `<div class="preview-document" style="font-family: -apple-system, sans-serif; padding: 24px;">
        <h3 style="margin-bottom: 16px; color: #5C4A32;">${scheme.name}</h3>
        <p style="color: #666; margin-bottom: 16px;">${scheme.description}</p>
        <div style="background: #f8f8f8; padding: 16px; border-radius: 6px; font-family: 'Courier New', monospace;">`;
    
    // Generate sample based on scheme
    const samples = {
        'legal-outline': ['I. First Section', '   A. Subsection', '      1. Item', '         a. Sub-item', '            (1) Detail'],
        'decimal': ['1. First Section', '   1.1. Subsection', '      1.1.1. Item'],
        'alpha-numeric': ['A. First Section', '   1. Subsection', '      a. Item'],
        'roman': ['I. First Section', '   A. Subsection', '      1. Item']
    };
    
    const lines = samples[selectedScheme] || samples['legal-outline'];
    for (let i = 0; i < Math.min(levels + 2, lines.length); i++) {
        preview += `<div style="margin: 4px 0;">${escapeHtml(lines[i])}</div>`;
    }
    
    preview += '</div></div>';
    return preview;
}

// ════════════════════════════════════════════════════════════════════
// CLAUSE LIBRARY
// ════════════════════════════════════════════════════════════════════

let clauseFilter = 'all';

function renderClauseLibrary(filter = clauseFilter) {
    clauseFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === filter);
    });
    
    // Filter clauses
    const filtered = filter === 'all' 
        ? CLAUSE_LIBRARY 
        : CLAUSE_LIBRARY.filter(c => c.category === filter);
    
    // Search filter
    const searchTerm = document.getElementById('clause-search')?.value?.toLowerCase() || '';
    const results = searchTerm 
        ? filtered.filter(c => c.title.toLowerCase().includes(searchTerm) || c.content.toLowerCase().includes(searchTerm))
        : filtered;
    
    const container = document.getElementById('clause-list');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">?</div><h3>No clauses found</h3><p>Try a different search or category</p></div>`;
        return;
    }
    
    container.innerHTML = results.map(c => `
        <div class="clause-item ${selectedClause === c.id ? 'selected' : ''}" onclick="selectClause('${c.id}')">
            <div class="clause-header">
                <span class="clause-title">${c.title}</span>
                <span class="clause-category">${c.category}</span>
            </div>
            <div class="clause-preview">${c.content.substring(0, 100)}...</div>
        </div>
    `).join('');
}

function filterClauses(category) {
    renderClauseLibrary(category);
    refreshPreview();
}

function searchClauses() {
    renderClauseLibrary(clauseFilter);
    refreshPreview();
}

function selectClause(id) {
    selectedClause = id;
    renderClauseLibrary(clauseFilter);
    refreshPreview();
}

function generateClausePreview() {
    if (!selectedClause) {
        return `<div class="preview-placeholder"><div class="preview-placeholder-icon">CL</div><p>Select a clause to preview</p></div>`;
    }
    
    const clause = CLAUSE_LIBRARY.find(c => c.id === selectedClause);
    if (!clause) return getPlaceholderPreview();
    
    return `
        <div class="preview-document" style="font-family: -apple-system, sans-serif;">
            <h3 style="margin-bottom: 8px; color: #5C4A32;">${clause.title}</h3>
            <div style="font-size: 11px; color: #8B7355; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">${clause.category}</div>
            <div style="font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.7; text-align: justify;">
                ${clause.content}
            </div>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════════════════════

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('draftbridge_settings') || '{}');
    
    if (settings.firmName) document.getElementById('setting-firm-name').value = settings.firmName;
    if (settings.attorneyName) document.getElementById('setting-attorney-name').value = settings.attorneyName;
    if (settings.defaultScheme) document.getElementById('setting-default-scheme').value = settings.defaultScheme;
    if (settings.autoPreview !== undefined) document.getElementById('setting-auto-preview').checked = settings.autoPreview;
    if (settings.darkMode !== undefined) document.getElementById('setting-dark-mode').checked = settings.darkMode;
}

function getSettingsData() {
    return {
        firmName: document.getElementById('setting-firm-name')?.value || '',
        attorneyName: document.getElementById('setting-attorney-name')?.value || '',
        defaultScheme: document.getElementById('setting-default-scheme')?.value || 'legal-outline',
        autoPreview: document.getElementById('setting-auto-preview')?.checked ?? true,
        darkMode: document.getElementById('setting-dark-mode')?.checked ?? false
    };
}

function generateSettingsPreview() {
    const s = getSettingsData();
    
    return `
        <div class="preview-document" style="font-family: -apple-system, sans-serif; padding: 24px;">
            <h3 style="margin-bottom: 20px; color: #5C4A32;">Current Settings</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #666;">Firm Name</td>
                    <td style="padding: 12px 0; font-weight: 500;">${s.firmName || '(not set)'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #666;">Attorney Name</td>
                    <td style="padding: 12px 0; font-weight: 500;">${s.attorneyName || '(not set)'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #666;">Default Scheme</td>
                    <td style="padding: 12px 0; font-weight: 500;">${s.defaultScheme}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px 0; color: #666;">Auto Preview</td>
                    <td style="padding: 12px 0; font-weight: 500;">${s.autoPreview ? 'Enabled' : 'Disabled'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #666;">Dark Mode</td>
                    <td style="padding: 12px 0; font-weight: 500;">${s.darkMode ? 'Enabled' : 'Disabled'}</td>
                </tr>
            </table>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════════════
// ACTIONS
// ════════════════════════════════════════════════════════════════════

function closeDialog() {
    Office.context.ui.messageParent(JSON.stringify({ action: 'cancel' }));
}

function insertDocument() {
    let formType = '';
    let data = {};
    let isValid = true;
    
    const activeForm = document.querySelector('.doc-type-form:not(.hidden)');
    if (activeForm) {
        if (activeForm.id === 'form-demand-letter') {
            formType = 'demand-letter';
            data = getDemandLetterData();
            if (!data.recipient || !data.address || !data.subject || !data.amount || !data.sender) {
                alert('Please fill in all required fields');
                isValid = false;
            }
        } else if (activeForm.id === 'form-motion') {
            formType = 'motion';
            data = getMotionData();
            if (!data.court || !data.plaintiff || !data.defendant || !data.attorney || data.grounds.length === 0) {
                alert('Please fill in all required fields and select at least one ground');
                isValid = false;
            }
        } else if (activeForm.id === 'form-memo') {
            formType = 'memo';
            data = getMemoData();
            if (!data.to || !data.subject) {
                alert('Please fill in TO and Subject fields');
                isValid = false;
            }
        }
    }
    
    if (isValid && formType) {
        Office.context.ui.messageParent(JSON.stringify({
            action: 'insert',
            formType: formType,
            data: data
        }));
    }
}

function insertNumbering() {
    if (!selectedScheme) {
        alert('Please select a numbering scheme');
        return;
    }
    
    const levels = parseInt(document.getElementById('num-levels')?.value) || 3;
    
    Office.context.ui.messageParent(JSON.stringify({
        action: 'insert-numbering',
        data: {
            scheme: selectedScheme,
            levels: levels
        }
    }));
}

function insertClause() {
    if (!selectedClause) {
        alert('Please select a clause');
        return;
    }
    
    const clause = CLAUSE_LIBRARY.find(c => c.id === selectedClause);
    if (!clause) return;
    
    Office.context.ui.messageParent(JSON.stringify({
        action: 'insert-clause',
        data: {
            id: clause.id,
            title: clause.title,
            content: clause.content
        }
    }));
}

function saveSettings() {
    const data = getSettingsData();
    
    Office.context.ui.messageParent(JSON.stringify({
        action: 'save-settings',
        data: data
    }));
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function placeholder(text) {
    return `<span class="placeholder">[${text}]</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPlaceholderPreview() {
    return `<div class="preview-placeholder"><div class="preview-placeholder-icon">?</div><p>Fill in the form to see preview</p></div>`;
}

// Set defaults on load
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = today;
    });
    
    // Set deadline 10 days out for demand letter
    const deadlineInput = document.getElementById('demand-deadline');
    if (deadlineInput && !deadlineInput.value) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 10);
        deadlineInput.value = deadline.toISOString().split('T')[0];
    }
});
