/* DocForge - Two-Level Navigation */
/* global Office, Word */

const TEMPLATES = {
    letter: { name: 'Letter', fields: [
        { id: 'date', label: 'Date' }, { id: 'recipient', label: 'Recipient' },
        { id: 'address', label: 'Address' }, { id: 'subject', label: 'Subject' },
        { id: 'sender', label: 'Sender' }
    ]},
    memo: { name: 'Memo', fields: [
        { id: 'to', label: 'To' }, { id: 'from', label: 'From' },
        { id: 'date', label: 'Date' }, { id: 'subject', label: 'Subject' }
    ]},
    fax: { name: 'Fax', fields: [
        { id: 'to', label: 'To' }, { id: 'fax', label: 'Fax Number' },
        { id: 'from', label: 'From' }, { id: 'date', label: 'Date' },
        { id: 'pages', label: 'Pages' }, { id: 'subject', label: 'Subject' }
    ]}
};

let current = null, values = {}, undo = [], activeTab = 'generate';

Office.onReady(info => { if (info.host === Office.HostType.Word) init(); });

function init() {
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
    await insertTemplate(id);
    btn?.classList.remove('loading');
    renderFields(t);
    document.getElementById(activeTab + 'Panel').classList.add('hidden');
    document.getElementById('fieldsPanel').classList.remove('hidden');
    setTimeout(() => document.querySelector('.field input')?.focus(), 50);
    updateUndo();
}

function renderFields(t) {
    const list = document.getElementById('fieldsList');
    list.innerHTML = t.fields.map(f => 
        `<div class="field" data-id="${f.id}">
            <label for="f-${f.id}">${esc(f.label)}</label>
            <input type="text" id="f-${f.id}" data-field="${f.id}" autocomplete="off">
        </div>`).join('');
    list.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
        values[i.dataset.field] = i.value;
        i.closest('.field').classList.toggle('empty', !i.value.trim());
    }));
}

function backToPanel() {
    current = null; values = {};
    document.getElementById('fieldsPanel').classList.add('hidden');
    document.getElementById(activeTab + 'Panel').classList.remove('hidden');
}

async function insertTemplate(id) {
    const t = TEMPLATES[id];
    if (!t) return;
    try {
        await Word.run(async ctx => {
            const body = ctx.document.body;
            const title = body.insertParagraph(t.name.toUpperCase(), Word.InsertLocation.end);
            title.styleBuiltIn = Word.BuiltInStyle.title;
            body.insertParagraph('', Word.InsertLocation.end);
            for (const f of t.fields) {
                const p = body.insertParagraph('', Word.InsertLocation.end);
                p.insertText(f.label + ': ', Word.InsertLocation.end).font.bold = true;
                const cc = p.insertContentControl();
                cc.tag = 'df_' + f.id; cc.title = f.label;
                cc.placeholderText = '[' + f.label + ']';
                cc.appearance = Word.ContentControlAppearance.boundingBox;
            }
            await ctx.sync();
        });
    } catch (e) { console.error(e); toast('Could not insert template', 'error'); }
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
                value: c.text || ''
            }));
        });
        if (!fields.length) { toast('No fields found', 'error'); return; }
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
    document.querySelectorAll('.field input').forEach(i => { 
        if (i.value.trim()) values[i.dataset.field] = i.value.trim(); 
    });
    if (!Object.keys(values).length) { 
        toast('Enter values first', 'error'); 
        document.querySelector('.field input')?.focus(); 
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
                    const val = values[c.tag.replace('df_', '')];
                    if (val) { c.insertText(val, Word.InsertLocation.replace); filled++; }
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
