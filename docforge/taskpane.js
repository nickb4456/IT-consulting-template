/* Legal Toolbar - Office.js Add-in */

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        initializeClauses();
        document.getElementById('clauseCategory').addEventListener('change', filterClauses);
    }
});

// Legal Clause Library
const clauseLibrary = {
    contracts: [
        { id: 'entire-agreement', title: 'Entire Agreement', desc: 'Supersedes all prior agreements', 
          text: 'This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, warranties, and agreements between the parties with respect to such subject matter.' },
        { id: 'amendment', title: 'Amendment', desc: 'Modification requirements',
          text: 'This Agreement may not be amended, modified, or supplemented except by a written instrument signed by both parties.' },
        { id: 'assignment', title: 'Assignment', desc: 'Transfer restrictions',
          text: 'Neither party may assign or transfer this Agreement or any rights or obligations hereunder without the prior written consent of the other party, except that either party may assign this Agreement to an affiliate or in connection with a merger, acquisition, or sale of all or substantially all of its assets.' },
        { id: 'governing-law', title: 'Governing Law', desc: 'Jurisdiction clause',
          text: 'This Agreement shall be governed by and construed in accordance with the laws of the State of [STATE], without regard to its conflict of laws principles.' },
        { id: 'severability', title: 'Severability', desc: 'Invalid provisions',
          text: 'If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the validity, legality, and enforceability of the remaining provisions shall not in any way be affected or impaired thereby.' }
    ],
    liability: [
        { id: 'limitation', title: 'Limitation of Liability', desc: 'Damage caps',
          text: 'IN NO EVENT SHALL EITHER PARTY BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, REGARDLESS OF WHETHER SUCH DAMAGES WERE FORESEEABLE OR WHETHER EITHER PARTY WAS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.' },
        { id: 'indemnification', title: 'Indemnification', desc: 'Hold harmless provision',
          text: 'Each party (the "Indemnifying Party") agrees to indemnify, defend, and hold harmless the other party and its officers, directors, employees, and agents (collectively, the "Indemnified Parties") from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys\' fees) arising out of or relating to the Indemnifying Party\'s breach of this Agreement or negligent or wrongful acts or omissions.' },
        { id: 'disclaimer', title: 'Disclaimer of Warranties', desc: 'As-is provision',
          text: 'EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, NEITHER PARTY MAKES ANY WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.' }
    ],
    ip: [
        { id: 'ip-ownership', title: 'IP Ownership', desc: 'Intellectual property rights',
          text: 'All intellectual property rights in and to the Work Product shall be owned exclusively by [PARTY]. [OTHER PARTY] hereby assigns to [PARTY] all right, title, and interest in and to the Work Product, including all intellectual property rights therein.' },
        { id: 'license-grant', title: 'License Grant', desc: 'Permission to use',
          text: '[LICENSOR] hereby grants to [LICENSEE] a non-exclusive, non-transferable, revocable license to use the Licensed Materials solely for [PURPOSE] during the Term, subject to the terms and conditions of this Agreement.' },
        { id: 'ip-warranty', title: 'IP Warranty', desc: 'Non-infringement warranty',
          text: 'Each party represents and warrants that it owns or has the right to use all intellectual property necessary to perform its obligations under this Agreement, and that such use will not infringe upon the intellectual property rights of any third party.' }
    ],
    confidentiality: [
        { id: 'nda-standard', title: 'Confidentiality Obligation', desc: 'Standard NDA clause',
          text: 'The Receiving Party agrees to: (a) hold the Confidential Information in strict confidence; (b) not disclose the Confidential Information to any third parties without the prior written consent of the Disclosing Party; (c) use the Confidential Information solely for the Purpose; and (d) protect the Confidential Information using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care.' },
        { id: 'exceptions', title: 'Confidentiality Exceptions', desc: 'Standard exclusions',
          text: 'Confidential Information shall not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was in the Receiving Party\'s possession prior to receipt from the Disclosing Party; (c) is independently developed by the Receiving Party without use of the Confidential Information; or (d) is rightfully obtained by the Receiving Party from a third party without restriction on disclosure.' },
        { id: 'return', title: 'Return of Materials', desc: 'Upon termination',
          text: 'Upon termination or expiration of this Agreement, or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information and any copies thereof, and shall certify in writing that it has done so.' }
    ],
    termination: [
        { id: 'term', title: 'Term', desc: 'Duration of agreement',
          text: 'This Agreement shall commence on the Effective Date and shall continue for an initial term of [TERM] (the "Initial Term"), unless earlier terminated in accordance with this Agreement. Thereafter, this Agreement shall automatically renew for successive [RENEWAL PERIOD] periods (each, a "Renewal Term") unless either party provides written notice of non-renewal at least [NOTICE PERIOD] prior to the end of the then-current term.' },
        { id: 'termination-convenience', title: 'Termination for Convenience', desc: 'Without cause',
          text: 'Either party may terminate this Agreement for any reason or no reason upon [NOTICE PERIOD] prior written notice to the other party.' },
        { id: 'termination-cause', title: 'Termination for Cause', desc: 'Material breach',
          text: 'Either party may terminate this Agreement immediately upon written notice if the other party: (a) materially breaches this Agreement and fails to cure such breach within [CURE PERIOD] after receiving written notice thereof; or (b) becomes insolvent, files for bankruptcy, or makes an assignment for the benefit of creditors.' },
        { id: 'survival', title: 'Survival', desc: 'Post-termination obligations',
          text: 'The provisions of Sections [SECTIONS] shall survive any termination or expiration of this Agreement.' }
    ]
};

let allClauses = [];

function initializeClauses() {
    allClauses = [];
    for (const category in clauseLibrary) {
        clauseLibrary[category].forEach(clause => {
            allClauses.push({ ...clause, category });
        });
    }
    renderClauses(allClauses);
}

function filterClauses() {
    const category = document.getElementById('clauseCategory').value;
    const filtered = category === 'all' ? allClauses : allClauses.filter(c => c.category === category);
    renderClauses(filtered);
}

function renderClauses(clauses) {
    const list = document.getElementById('clauseList');
    list.innerHTML = clauses.map(c => `
        <div class="clause-item" onclick="insertClause('${c.id}')">
            <div class="title">${c.title}</div>
            <div class="desc">${c.desc}</div>
        </div>
    `).join('');
}

async function insertClause(clauseId) {
    const clause = allClauses.find(c => c.id === clauseId);
    if (!clause) return;

    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.insertParagraph(clause.text, Word.InsertLocation.after);
            await context.sync();
            showStatus('success', `Inserted: ${clause.title}`);
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function highlightDefinedTerms() {
    try {
        await Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            // Find defined terms (words in quotes followed by definitions)
            const definedPattern = /"([^"]+)"\s*(means|shall mean|refers to|is defined as)/gi;
            const matches = [...body.text.matchAll(definedPattern)];
            const definedTerms = matches.map(m => m[1]);

            // Search and highlight each term
            for (const term of definedTerms) {
                const results = body.search(term, { matchCase: false, matchWholeWord: true });
                results.load('items');
                await context.sync();
                
                results.items.forEach(item => {
                    item.font.highlightColor = '#fff3cd';
                });
            }
            await context.sync();
            showStatus('success', `Highlighted ${definedTerms.length} defined terms`);
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function listDefinedTerms() {
    try {
        await Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            const definedPattern = /"([^"]+)"\s*(means|shall mean|refers to|is defined as)/gi;
            const matches = [...body.text.matchAll(definedPattern)];
            const terms = [...new Set(matches.map(m => m[1]))].sort();

            const resultsDiv = document.getElementById('termsResults');
            if (terms.length > 0) {
                resultsDiv.innerHTML = `<strong>Found ${terms.length} defined terms:</strong><br>` +
                    terms.map(t => `<div class="result-item">"${t}"</div>`).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.innerHTML = 'No defined terms found.';
                resultsDiv.style.display = 'block';
            }
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function checkCrossReferences() {
    try {
        await Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            // Find section references
            const refPattern = /Section\s+(\d+(\.\d+)*)/gi;
            const sectionPattern = /^(\d+(\.\d+)*)\./gm;
            
            const references = [...body.text.matchAll(refPattern)].map(m => m[1]);
            const sections = [...body.text.matchAll(sectionPattern)].map(m => m[1]);
            
            const missing = references.filter(ref => !sections.includes(ref));
            const uniqueMissing = [...new Set(missing)];

            const resultsDiv = document.getElementById('xrefResults');
            if (uniqueMissing.length > 0) {
                resultsDiv.innerHTML = `<strong>⚠️ ${uniqueMissing.length} broken references:</strong><br>` +
                    uniqueMissing.map(r => `<div class="result-item">Section ${r}</div>`).join('');
            } else {
                resultsDiv.innerHTML = `<strong>✅ All cross-references valid</strong><br>Found ${references.length} references to ${sections.length} sections.`;
            }
            resultsDiv.style.display = 'block';
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function listSections() {
    try {
        await Word.run(async (context) => {
            const body = context.document.body;
            body.load('text');
            await context.sync();

            const sectionPattern = /^(\d+(\.\d+)*)\.\s*(.+)$/gm;
            const sections = [...body.text.matchAll(sectionPattern)];

            const resultsDiv = document.getElementById('xrefResults');
            if (sections.length > 0) {
                resultsDiv.innerHTML = `<strong>Found ${sections.length} sections:</strong><br>` +
                    sections.slice(0, 20).map(s => `<div class="result-item">${s[1]}. ${s[3].substring(0, 40)}...</div>`).join('');
                if (sections.length > 20) {
                    resultsDiv.innerHTML += `<div class="result-item"><em>...and ${sections.length - 20} more</em></div>`;
                }
            } else {
                resultsDiv.innerHTML = 'No numbered sections found.';
            }
            resultsDiv.style.display = 'block';
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function showChanges() {
    try {
        await Word.run(async (context) => {
            // Note: Full track changes API requires Word 1.4+
            const body = context.document.body;
            body.load('text');
            await context.sync();
            showStatus('info', 'Track changes summary requires Word 2019+ API. Use Review tab for full functionality.');
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

async function acceptAllChanges() {
    try {
        await Word.run(async (context) => {
            context.document.body.getRange().track = false;
            await context.sync();
            showStatus('success', 'Accepted all tracked changes');
        });
    } catch (error) {
        showStatus('info', 'Use Review > Accept All Changes for full track changes support.');
    }
}

async function rejectAllChanges() {
    try {
        showStatus('info', 'Use Review > Reject All Changes for full track changes support.');
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

const signatureBlocks = {
    single: `
___________________________________
Name: _____________________________
Title: ____________________________
Date: _____________________________`,

    dual: `
PARTY A:                           PARTY B:

___________________________________    ___________________________________
Name: _____________________________    Name: _____________________________
Title: ____________________________    Title: ____________________________
Date: _____________________________    Date: _____________________________`,

    corporate: `
[COMPANY NAME]


By: ___________________________________
Name: _________________________________
Title: ________________________________
Date: _________________________________


ATTEST:

___________________________________
Corporate Secretary`,

    witness: `
___________________________________
Name: _____________________________
Title: ____________________________
Date: _____________________________


WITNESS:

___________________________________
Name: _____________________________
Date: _____________________________`,

    notary: `
___________________________________
Name: _____________________________
Title: ____________________________
Date: _____________________________


STATE OF _______________  )
                          ) ss.
COUNTY OF _______________ )

On this _____ day of _____________, 20___, before me personally appeared
_________________________, known to me (or proved to me on the basis of
satisfactory evidence) to be the person whose name is subscribed to the
within instrument and acknowledged to me that he/she executed the same in
his/her authorized capacity.

WITNESS my hand and official seal.


___________________________________
Notary Public
My Commission Expires: _____________

[NOTARY SEAL]`
};

async function insertSignatureBlock() {
    const type = document.getElementById('sigType').value;
    const block = signatureBlocks[type];

    try {
        await Word.run(async (context) => {
            const selection = context.document.getSelection();
            selection.insertParagraph('', Word.InsertLocation.after);
            const para = selection.insertParagraph(block, Word.InsertLocation.after);
            para.font.name = 'Courier New';
            para.font.size = 11;
            await context.sync();
            showStatus('success', 'Signature block inserted');
        });
    } catch (error) {
        showStatus('error', `Error: ${error.message}`);
    }
}

function showStatus(type, message) {
    const status = document.getElementById('status');
    status.className = `status ${type}`;
    status.textContent = message;
    setTimeout(() => { status.className = 'status'; }, 4000);
}
