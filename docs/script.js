let currentDocName = "Untitled Document";
let drawMode = 'off';
let isUnsaved = false;

// History System
let undoStack = [];
let redoStack = [];

function saveState() {
    const state = [];
    document.querySelectorAll('.page-wrapper').forEach(wrap => {
        state.push({
            text: wrap.querySelector('.page').innerHTML,
            draw: wrap.querySelector('canvas').toDataURL()
        });
    });
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 40) undoStack.shift();
    redoStack = []; // Clear redo on new action
}

function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    const state = JSON.parse(undoStack[undoStack.length - 1]);
    applyState(state);
}

function redo() {
    if (redoStack.length === 0) return;
    const stateStr = redoStack.pop();
    undoStack.push(stateStr);
    applyState(JSON.parse(stateStr));
}

function applyState(state) {
    document.getElementById('pages-container').innerHTML = '';
    state.forEach(item => addPage(item, true));
}

// Formatting
function focusEditor() {
    const page = document.querySelector('.page');
    if (page) setTimeout(() => page.focus(), 1);
}

function format(cmd, value = null) {
    document.execCommand(cmd, false, value);
    saveState();
    updateBtnStates();
    markUnsaved();
}

function updateBtnStates() {
    ['bold', 'italic', 'underline'].forEach(cmd => {
        const btn = document.getElementById(`btn-${cmd}`);
        if (document.queryCommandState(cmd)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

document.addEventListener('mouseup', updateBtnStates);
document.addEventListener('keyup', (e) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); return; }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); return; }
    saveState();
    updateBtnStates(); 
    markUnsaved(); 
});

function markUnsaved() {
    isUnsaved = true;
    document.getElementById('save-status').innerText = "Unsaved Changes";
    document.getElementById('save-status').style.color = "red";
}

window.onbeforeunload = () => isUnsaved ? "Make sure to save before leaving!" : null;

// Image
function triggerUpload() { document.getElementById('imageUpload').click(); }
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.execCommand('insertHTML', false, `<img src="${ev.target.result}" style="max-width:100%;">`);
            saveState();
            markUnsaved();
        };
        reader.readAsDataURL(file);
    }
});

// Drawing
function setDrawMode(mode) {
    drawMode = mode;
    document.querySelectorAll('.drawing-canvas').forEach(canvas => {
        canvas.className = 'drawing-canvas';
        if (mode === 'draw') canvas.classList.add('canvas-active');
        if (mode === 'erase') canvas.classList.add('eraser-active');
        initCanvas(canvas);
    });
    document.getElementById('drawBtn').classList.toggle('active', mode === 'draw');
    document.getElementById('eraseBtn').classList.toggle('active', mode === 'erase');
    document.getElementById('offBtn').classList.toggle('active', mode === 'off');
}

function initCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    canvas.onmousedown = (e) => {
        if (drawMode === 'off') return;
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX, e.offsetY);
    };
    canvas.onmousemove = (e) => {
        if (!drawing) return;
        ctx.lineWidth = drawMode === 'erase' ? 30 : 2;
        ctx.lineCap = 'round';
        ctx.globalCompositeOperation = drawMode === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = document.getElementById('colorPicker').value;
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    };
    canvas.onmouseup = () => { 
        if(drawing) { drawing = false; saveState(); markUnsaved(); }
    };
}

// Documents
function addPage(savedData = null, isHistoryAction = false) {
    const container = document.getElementById('pages-container');
    const id = "canv-" + Math.random().toString(36).substr(2,9);
    const wrapper = document.createElement('div');
    wrapper.className = "page-wrapper";
    wrapper.innerHTML = `
        <div class="page" contenteditable="true"></div>
        <canvas class="drawing-canvas" id="${id}" width="816" height="1056"></canvas>
        <button class="del-page-btn" onclick="deletePage(this)">Delete Page</button>
    `;
    if (container.children.length === 0) {
        const btn = wrapper.querySelector('.del-page-btn');
        if (btn) btn.remove();
    }
    container.appendChild(wrapper);
    if (savedData) {
        wrapper.querySelector('.page').innerHTML = savedData.text;
        const img = new Image();
        img.src = savedData.draw;
        img.onload = () => wrapper.querySelector('canvas').getContext('2d').drawImage(img, 0, 0);
    }
    updatePageCount();
    setDrawMode(drawMode);
    if (!isHistoryAction) saveState();
}

function deletePage(btn) {
    const wrapper = btn.parentElement;
    if (wrapper.querySelector('.page').innerText.trim() !== "" && !confirm("Delete page?")) return;
    wrapper.remove();
    saveState();
    markUnsaved();
    updatePageCount();
}

function updatePageCount() { document.getElementById('page-count-display').innerText = "Pages: " + document.querySelectorAll('.page').length; }

function saveDoc() {
    if (currentDocName === "Untitled Document") {
        const name = prompt("Name this document:");
        if (!name) return;
        currentDocName = name;
    }
    const data = [];
    document.querySelectorAll('.page-wrapper').forEach(wrap => {
        data.push({ text: wrap.querySelector('.page').innerHTML, draw: wrap.querySelector('canvas').toDataURL() });
    });
    const docs = JSON.parse(localStorage.getItem('win7_v14_final') || '{}');
    docs[currentDocName] = data;
    localStorage.setItem('win7_v14_final', JSON.stringify(docs));
    isUnsaved = false;
    document.getElementById('save-status').innerText = "Saved";
    document.getElementById('save-status').style.color = "green";
    loadSidebar();
}

function loadSidebar() {
    const list = document.getElementById('docList');
    const docs = JSON.parse(localStorage.getItem('win7_v14_final') || '{}');
    list.innerHTML = `<li class="doc-item"><strong>Untitled Document</strong><button onclick="createNewDoc()">Load Document</button></li>`;
    Object.keys(docs).forEach(name => {
        const li = document.createElement('li');
        li.className = "doc-item";
        li.innerHTML = `<strong>${name}</strong>
            <div style="display:flex;gap:5px;margin-top:5px;">
                <button onclick="openDoc('${name}')">Load Document</button>
                <button onclick="deleteDoc(event, '${name}')" style="color:red">Delete</button>
            </div>`;
        list.appendChild(li);
    });
}

function openDoc(name) {
    if (isUnsaved && !confirm("Discard unsaved changes?")) return;
    const docs = JSON.parse(localStorage.getItem('win7_v14_final') || '{}');
    document.getElementById('pages-container').innerHTML = '';
    undoStack = []; redoStack = []; // Reset history for fresh load
    docs[name].forEach(item => addPage(item, true));
    currentDocName = name;
    isUnsaved = false;
    document.getElementById('current-doc-name').innerText = "Editing: " + name;
    document.getElementById('save-status').innerText = "Saved";
    document.getElementById('save-status').style.color = "green";
    saveState(); // Prime history with the loaded content
}

function deleteDoc(e, name) {
    e.stopPropagation();
    if(confirm(`Delete ${name}?`)) {
        const docs = JSON.parse(localStorage.getItem('win7_v14_final') || '{}');
        delete docs[name];
        localStorage.setItem('win7_v14_final', JSON.stringify(docs));
        loadSidebar();
        if(currentDocName === name) createNewDoc();
    }
}

function createNewDoc() {
    if (isUnsaved && !confirm("Discard unsaved changes?")) return;
    currentDocName = "Untitled Document";
    document.getElementById('pages-container').innerHTML = '';
    undoStack = []; redoStack = [];
    addPage();
    document.getElementById('current-doc-name').innerText = "Editing: Untitled Document";
    isUnsaved = false;
}

window.onload = () => { loadSidebar(); createNewDoc(); };