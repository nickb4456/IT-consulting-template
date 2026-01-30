/* DraftBridge - Document Generation - v20260130-wired */
/* global Office, Word */

const API_BASE = 'https://6b2bpmn8f8.execute-api.us-east-1.amazonaws.com/prod';
const FIRM_ID = 'morrison'; // TODO: Make configurable per firm

const TEMPLATES = {
    letter: { name: 'Letter', hasAuthor: true, fields: [
        { id: 'author', label: 'Author', type: 'select' },
        { id: 'date', label: 'Date', type: 'date' },
        { id: 'delivery', label: 'Delivery Phrases', placeholder: 'Via Email' },
        { id: 'recipients', label: 'Recipients', type: 'textarea', placeholder: 'Name\nAddress Line 1\nCity, State ZIP' },
        { id: 'reline', label: 'Re Line' },
        { id: 'salutation', label: 'Salutation', placeholder: 'Dear Mr./Ms.' },
        { id: 'closing', label: 'Closing Phrase', placeholder: 'Sincerely,' },
        { id: 'authorName', label: 'Author Name', readonly: true },
        { id: 'initials', label: 'Initials', readonly: true },
        { id: 'enclosures', label: 'Enclosures' },
        { id: 'cc', label: 'cc' }
    ]},
    memo: { name: 'Memo', fields: [
        { id: 'to', label: 'To' },
        { id: 'from', label: 'From' },
        { id: 'date', label: 'Date', type: 'date' },
        { id: 'subject', label: 'Subject' }
    ]},
    fax: { name: 'Fax', fields: [
        { id: 'to', label: 'To' },
        { id: 'fax', label: 'Fax Number' },
        { id: 'from', label: 'From' },
        { id: 'date', label: 'Date', type: 'date' },
        { id: 'pages', label: 'Pages' },
        { id: 'subject', label: 'Subject' }
    ]}
};

let current = null, values = {}, undo = [], activeTab = 'generate';
let authors = []; // Cached authors from API

Office.onReady(info => { if (info.host === Office.HostType.Word) init(); });

async function init() {
    // Pre-fetch authors
    try {
        const res = await fetch(`${API_BASE}/firms/${FIRM_ID}/authors`);
        authors = await res.json();
        console.log('Loaded authors:', authors);
    } catch (e) {
        console.error('Failed to load authors:', e);
    }

    document.querySelectorAll('.tab').forEach(t => 
        t.addEventListener('click', () => switchTab(t.dataset.tab)));
    document.querySelectorAll('.opt[data-template]').forEach(b => 
        b.addEventListener('click', () => selectTemplate(b.dataset.template, b)));
    document.querySelectorAll('.opt[data-action]').forEach(b => 
        b.addEventListener('click', () => handleAction(b.dataset.action)));
    document.getElementById('backBtn')?.addEventListener('click', backToPanel);
    document.getElementById('fillBtn')?.addEventListener('click', fill);
    document.getElementById('undoBtn')?.addEventListener('click', doUndo);
    document.getElementById('scanBtn')?.addEventListener('click', scan);
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && current) backToPanel();
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && current) { e.preventDefault(); fill(); }
    });
}

function switchTab(tabId) {
    if (activeTab === tabId && !current) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(tabId + 'Panel')?.classList.remove('hidden');
    current = null;
    activeTab = tabId;
}

function handleAction(action) {
    toast('Coming soon', '');
}

async function selectTemplate(id, btn) {
    const t = TEMPLATES[id];
    if (!t) return;
    btn?.classList.add('loading');
    current = id; values = {}; undo = [];
    document.getElementById('templateTitle').textContent = t.name;
    try {
        await insertTemplate(id);
        renderFields(t);
        document.getElementById(activeTab + 'Panel').classList.add('hidden');
        document.getElementById('fieldsPanel').classList.remove('hidden');
        setTimeout(() => {
            const first = document.querySelector('.field select, .field input, .field textarea');
            if (first) first.focus();
        }, 50);
        updateUndo();
    } catch (e) {
        console.error('Template error:', e);
        toast('Could not insert template', 'error');
    }
    btn?.classList.remove('loading');
}

function renderFields(t) {
    const list = document.getElementById('fieldsList');
    list.innerHTML = t.fields.map(f => {
        let input;
        const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
        const ro = f.readonly ? ' readonly' : '';
        
        if (f.type === 'select' && f.id === 'author') {
            // Author dropdown populated from API
            const opts = authors.map(a => 
                `<option value="${a.id}">${a.name} — ${a.title}</option>`
            ).join('');
            input = `<select id="f-${f.id}" data-field="${f.id}">
                <option value="">Select author...</option>
                ${opts}
            </select>`;
        } else if (f.type === 'date') {
            input = `<input type="date" id="f-${f.id}" data-field="${f.id}"${ro}>`;
        } else if (f.type === 'textarea') {
            const taPh = f.placeholder || 'Line 1\nLine 2\nLine 3';
            input = `<textarea id="f-${f.id}" data-field="${f.id}" rows="3" placeholder="${esc(taPh)}"${ro}></textarea>`;
        } else {
            input = `<input type="text" id="f-${f.id}" data-field="${f.id}" autocomplete="off"${ph}${ro}>`;
        }
        return `<div class="field" data-id="${f.id}">
            <label for="f-${f.id}">${esc(f.label)}</label>
            ${input}
        </div>`;
    }).join('');
    
    // Bind author dropdown change
    const authorSelect = document.getElementById('f-author');
    if (authorSelect) {
        authorSelect.addEventListener('change', () => {
            const author = authors.find(a => a.id === authorSelect.value);
            if (author) {
                // Auto-fill author fields
                setField('authorName', author.name);
                setField('initials', author.initials);
                setField('closing', 'Sincerely,');
                values.authorName = author.name;
                values.initials = author.initials;
                values.closing = 'Sincerely,';
                values._authorData = author; // Store for later use
            }
        });
    }
    
    list.querySelectorAll('input, textarea, select').forEach(i => i.addEventListener('input', () => {
        values[i.dataset.field] = i.value;
        i.closest('.field').classList.toggle('empty', !i.value.trim());
    }));
}

function setField(id, value) {
    const el = document.getElementById('f-' + id);
    if (el) {
        el.value = value;
        el.closest('.field')?.classList.remove('empty');
    }
}

function backToPanel() {
    current = null; values = {};
    document.getElementById('fieldsPanel').classList.add('hidden');
    document.getElementById(activeTab + 'Panel').classList.remove('hidden');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function insertTemplate(id) {
    const t = TEMPLATES[id];
    if (!t) return;

    await Word.run(async ctx => {
        const body = ctx.document.body;
        
        if (id === 'letter') {
            // Professional letter format
            const letterFields = [
                { id: 'date', label: 'Date', prefix: '' },
                { id: 'delivery', label: 'Delivery Phrases', prefix: '' },
                { id: 'recipients', label: 'Recipients', prefix: '' },
                { id: 'reline', label: 'Re Line', prefix: 'Re:\t' },
                { id: 'salutation', label: 'Salutation', prefix: '' },
                { id: 'body', isBody: true },
                { id: 'closing', label: 'Closing Phrase', prefix: '' },
                { id: 'authorName', label: 'Author Name', prefix: '', extraSpace: true },
                { id: 'initials', label: 'Initials', prefix: '' },
                { id: 'enclosures', label: 'Enclosures', prefix: 'Enclosures:\t' },
                { id: 'cc', label: 'cc', prefix: 'cc:\t' }
            ];
            
            for (const f of letterFields) {
                if (f.isBody) {
                    const bodyP = body.insertParagraph('[Begin typing here]', Word.InsertLocation.end);
                    bodyP.font.italic = true;
                    bodyP.font.color = '#6B7280';
                    body.insertParagraph('', Word.InsertLocation.end);
                    continue;
                }
                
                const p = body.insertParagraph(f.prefix + '[' + f.label + ']', Word.InsertLocation.end);
                
                await ctx.sync();
                
                const range = p.getRange(Word.RangeLocation.whole);
                const cc = range.insertContentControl();
                cc.tag = 'df_' + f.id;
                cc.title = f.label;
                cc.appearance = Word.ContentControlAppearance.boundingBox;
                
                if (f.extraSpace || ['date', 'delivery', 'recipients', 'reline', 'salutation', 'closing'].includes(f.id)) {
                    body.insertParagraph('', Word.InsertLocation.end);
                }
            }
        } else {
            // Standard format for memo/fax
            const title = body.insertParagraph(t.name.toUpperCase(), Word.InsertLocation.end);
            title.styleBuiltIn = Word.BuiltInStyle.title;
            body.insertParagraph('', Word.InsertLocation.end);
            
            for (const f of t.fields) {
                const labelText = f.label + ': ';
                const p = body.insertParagraph(labelText + '[' + f.label + ']', Word.InsertLocation.end);
                
                await ctx.sync();
                
                const range = p.getRange(Word.RangeLocation.whole);
                const cc = range.insertContentControl();
                cc.tag = 'df_' + f.id;
                cc.title = f.label;
                cc.appearance = Word.ContentControlAppearance.boundingBox;
            }
        }
        
        await ctx.sync();
    });
}

async function scan() {
    const btn = document.getElementById('scanBtn');
    btn.classList.add('loading'); btn.disabled = true;
    try {
        const fields = await Word.run(async ctx => {
            const ccs = ctx.document.contentControls;
            ccs.load('items/tag,items/title,items/text');
            await ctx.sync();
            return ccs.items.filter(c => c.tag?.startsWith('df_')).map(c => ({
                id: c.tag.replace('df_', ''),
                label: c.title || c.tag.replace('df_', ''),
                value: c.text || '',
                type: c.tag === 'df_recipients' ? 'textarea' : (c.tag === 'df_date' ? 'date' : 'text')
            }));
        });
        if (!fields.length) { toast('No fields found', 'error'); btn.classList.remove('loading'); btn.disabled = false; return; }
        const scanned = { name: 'Scanned', fields };
        TEMPLATES.scanned = scanned;
        current = 'scanned'; values = {};
        fields.forEach(f => { if (f.value && !f.value.startsWith('[')) values[f.id] = f.value; });
        document.getElementById('templateTitle').textContent = 'Scanned';
        renderFields(scanned);
        fields.forEach(f => { 
            if (values[f.id]) { 
                const i = document.querySelector(`[data-field="${f.id}"]`); 
                if (i) i.value = values[f.id]; 
            }
        });
        document.getElementById(activeTab + 'Panel').classList.add('hidden');
        document.getElementById('fieldsPanel').classList.remove('hidden');
        toast('Found ' + fields.length + ' fields', 'success');
    } catch (e) { console.error(e); toast('Could not scan', 'error'); }
    finally { btn.classList.remove('loading'); btn.disabled = false; }
}

async function fill() {
    const t = TEMPLATES[current];
    if (!t) return;
    document.querySelectorAll('.field input, .field textarea, .field select').forEach(i => { 
        if (i.value && i.value.trim()) values[i.dataset.field] = i.value.trim(); 
    });
    
    // Don't require author dropdown to be counted
    const fillableValues = { ...values };
    delete fillableValues.author;
    delete fillableValues._authorData;
    
    if (!Object.keys(fillableValues).length) { 
        toast('Enter values first', 'error'); 
        const first = document.querySelector('.field input, .field textarea');
        if (first) first.focus();
        return; 
    }
    const btn = document.getElementById('fillBtn');
    btn.classList.add('loading'); btn.disabled = true;
    try {
        await Word.run(async ctx => {
            const ccs = ctx.document.contentControls;
            ccs.load('items/tag,items/text');
            await ctx.sync();
            const prev = {};
            ccs.items.forEach(c => { if (c.tag?.startsWith('df_')) prev[c.tag] = c.text; });
            let filled = 0;
            ccs.items.forEach(c => {
                if (c.tag?.startsWith('df_')) {
                    const fieldId = c.tag.replace('df_', '');
                    let val = values[fieldId];
                    if (val) {
                        if (fieldId === 'date') val = formatDate(val);
                        c.insertText(val, Word.InsertLocation.replace);
                        filled++;
                    }
                }
            });
            await ctx.sync();
            if (filled) { 
                undo.push({ snap: prev, n: filled }); 
                if (undo.length > 10) undo.shift(); 
                updateUndo(); 
            }
            toast('Filled ' + filled + ' field' + (filled === 1 ? '' : 's'), 'success');
        });
    } catch (e) { console.error(e); toast('Could not fill', 'error'); }
    finally { btn.classList.remove('loading'); btn.disabled = false; }
}

async function doUndo() {
    const state = undo.pop();
    if (!state) return;
    const btn = document.getElementById('undoBtn');
    btn.classList.add('loading'); btn.disabled = true;
    try {
        await Word.run(async ctx => {
            const ccs = ctx.document.contentControls;
            ccs.load('items/tag');
            await ctx.sync();
            ccs.items.forEach(c => { 
                const v = state.snap[c.tag]; 
                if (v !== undefined) c.insertText(v, Word.InsertLocation.replace); 
            });
            await ctx.sync();
            toast('Undone', 'success');
        });
    } catch (e) { console.error(e); undo.push(state); toast('Could not undo', 'error'); }
    finally { btn.classList.remove('loading'); updateUndo(); }
}

function updateUndo() { 
    const b = document.getElementById('undoBtn'); 
    if (b) b.disabled = !undo.length; 
}

function toast(msg, type) { 
    const el = document.getElementById('toast'); 
    if (!el) return; 
    el.textContent = msg; 
    el.className = 'toast ' + (type || ''); 
    setTimeout(() => el.classList.add('hidden'), 2500); 
}

function esc(s) { 
    return s ? s.replace(/[&<>"']/g, c => 
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) : ''; 
}
