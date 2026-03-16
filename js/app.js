const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbynd7JOqdCceaBVf_AEBaoxhSCNg-5MNZvVb2_xQHI8hJVfvR0dd8IIPgd4A4GCMWWk/exec'; 

const wStart = new Date(2026, 0, 1, 0, 0, 0);
const totalDays = 365; 

// ESTADO INICIAL DEL SISTEMA DE PESTAÑAS
let currentMainTab = 'appian';       
let currentSubTab = 'automation ia'; 
let currentTab = 'appian';           

let data = []; 
let selectedAreas = []; 

function normalizeText(text) {
    if (!text) return 'default';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '-');
}

function populateFilterDropdown() {
    const container = document.getElementById('filterOptionsContainer');
    const uniqueAreas = [...new Set(data.map(p => p['Área'] ? p['Área'].toString().trim() : 'Sin Área').filter(a => a !== 'Sin Área'))].sort();
    
    let html = '';
    uniqueAreas.forEach(area => {
        const normValue = normalizeText(area);
        const isChecked = selectedAreas.length === 0 || selectedAreas.includes(normValue) ? 'checked' : '';
        let dotColor = `var(--area-${normValue}, var(--bold-azul))`;
        if(normValue === 'default') dotColor = 'var(--area-default)';

        html += `<label class="area-item">
                    <input type="checkbox" class="area-checkbox" value="${normValue}" data-name="${area}" ${isChecked} onchange="updateSelectAllStatus()"> 
                    <span style="width: 14px; height: 14px; border-radius: 50%; display: inline-block; background: ${dotColor}; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
                    ${area}
                 </label>`;
    });
    container.innerHTML = html;
    updateSelectAllStatus();
}

function toggleFilterMenu() { document.getElementById('filterPanel').classList.toggle('show'); }

document.addEventListener('click', function(event) {
    const filterElement = document.getElementById('customFilter');
    if (filterElement && !filterElement.contains(event.target)) {
        document.getElementById('filterPanel').classList.remove('show');
    }
});

function toggleSelectAll(sourceCheckbox) {
    const checkboxes = document.querySelectorAll('.area-checkbox');
    checkboxes.forEach(cb => {
        if(cb.parentElement.style.display !== 'none') cb.checked = sourceCheckbox.checked;
    });
}

function updateSelectAllStatus() {
    const checkboxes = Array.from(document.querySelectorAll('.area-checkbox:not([style*="display: none"])'));
    const allChecked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
    document.getElementById('selectAllCheckbox').checked = allChecked;
}

function searchFilter() {
    const term = document.getElementById('filterSearch').value.toLowerCase();
    const labels = document.querySelectorAll('.area-item');
    labels.forEach(label => {
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(term) ? 'flex' : 'none';
    });
    updateSelectAllStatus();
}

function clearFilter() {
    document.getElementById('filterSearch').value = '';
    searchFilter();
    document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllCheckbox').checked = false;
}

function applyFilter() {
    const checkboxes = document.querySelectorAll('.area-checkbox');
    const checkedBoxes = Array.from(checkboxes).filter(cb => cb.checked);
    
    if (checkedBoxes.length === checkboxes.length) {
        selectedAreas = []; 
        document.getElementById('filterBtnText').innerText = 'Áreas y Filtros';
    } else if (checkedBoxes.length === 0) {
        selectedAreas = ['_none_']; 
        document.getElementById('filterBtnText').innerText = 'Ninguna área seleccionada';
    } else {
        selectedAreas = checkedBoxes.map(cb => cb.value);
        if (checkedBoxes.length === 1) {
            document.getElementById('filterBtnText').innerText = 'Área: ' + checkedBoxes[0].dataset.name;
        } else {
            document.getElementById('filterBtnText').innerText = 'Filtro activo: Varias áreas';
        }
    }
    document.getElementById('filterPanel').classList.remove('show');
    renderProjects();
    setTimeout(scrollToToday, 100);
}

function closeFilterMenu() {
    document.getElementById('filterPanel').classList.remove('show');
    populateFilterDropdown(); 
}

// =========================================================================
// RENDERIZADO DINÁMICO DE CABECERAS (S1 vs Semana 1)
// =========================================================================
function renderCalendarHeaders() {
    const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; 
    const quarters = [{ name: 'Q1', days: 90 }, { name: 'Q2', days: 91 }, { name: 'Q3', days: 92 }, { name: 'Q4', days: 92 }];
    
    let htmlQuarters = '';
    quarters.forEach(q => { htmlQuarters += `<div class="quarter" style="width: ${(q.days / totalDays) * 100}%;">${q.name}</div>`; });
    document.getElementById('quarters-header').innerHTML = htmlQuarters;

    let htmlMonths = '', htmlWeeks = '', htmlGrid = '';
    daysInMonths.forEach((days, i) => {
        const monthWidthPct = (days / totalDays) * 100;
        htmlMonths += `<div class="month" style="width: ${monthWidthPct}%;">${monthsNames[i]}</div>`;
        htmlGrid += `<div class="grid-month-container" style="width: ${monthWidthPct}%;">`;
        
        for(let w = 1; w <= 4; w++) {
            // LÓGICA INTELIGENTE: Si estamos en Appian dice "S1", si no "Semana 1"
            let weekText = currentMainTab === 'appian' ? `S${w}` : `Semana ${w}`;
            
            htmlWeeks += `<div class="week" style="width: ${monthWidthPct / 4}%;">${weekText}</div>`;
            htmlGrid += `<div class="grid-week"></div>`;
        }
        htmlGrid += `</div>`; 
    });

    document.getElementById('months-header').innerHTML = htmlMonths;
    document.getElementById('weeks-header').innerHTML = htmlWeeks;
    document.getElementById('grid-lines').innerHTML = htmlGrid;
}

function parseDateSafe(dateValue) {
    if (!dateValue) return null;
    const str = dateValue.toString().trim();
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoMatch) return new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3], 0, 0, 0); 
    const parts = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) return new Date(parts[3], parts[2] - 1, parts[1], 0, 0, 0);
    const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) return new Date(ymdMatch[1], ymdMatch[2] - 1, ymdMatch[3], 0, 0, 0);
    const temp = new Date(str);
    if (isNaN(temp.getTime())) return null;
    return new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 0, 0, 0);
}

function getTimelinePosition(dateValue) {
    const date = parseDateSafe(dateValue);
    if (!date) return null;
    return ((date.getTime() - wStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100; 
}

function renderTodayLine() {
    const today = new Date(); 
    const flatToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayPercentage = ((flatToday.getTime() - wStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100; 
    const todayMarker = document.getElementById('today-marker');
    if (todayPercentage >= 0 && todayPercentage <= 100) {
        todayMarker.style.left = `${todayPercentage}%`;
        todayMarker.style.display = 'block';
    } else {
        todayMarker.style.display = 'none';
    }
}

function scrollToToday() {
    const wrapper = document.querySelector('.timeline-wrapper');
    const scrollArea = document.querySelector('.timeline-scroll-area');
    if (!wrapper || !scrollArea) return;
    const scrollWidth = scrollArea.offsetWidth;
    const todayPosition = (((new Date() - wStart) / (1000 * 60 * 60 * 24)) / 365) * scrollWidth;
    wrapper.scrollTo({ left: Math.max(0, todayPosition - (wrapper.offsetWidth / 2)), behavior: 'smooth' });
}

// =========================================================================
// TOGGLE APPIAN (Cero animaciones que compriman el texto)
// =========================================================================
function toggleViewMode() {
    const isMonthly = document.getElementById('viewToggle').checked;
    
    document.getElementById('mainScrollArea').classList.toggle('monthly-view', isMonthly);
    document.getElementById('toggleContainer').classList.toggle('monthly-active', isMonthly);
    
    setTimeout(() => { renderProjects(); }, 50);
}

function renderProjects() {
    const container = document.getElementById('projects-container');
    const scrollArea = document.getElementById('mainScrollArea');
    container.innerHTML = ''; 

    if (!data || data.length === 0) return;

    const isAppianStyle = currentMainTab === 'appian';

    let filteredData = data.filter(p => {
        const tabCategory = p['Frente de trabajo'] || p['Frente'] || p['Plataforma'] || p['Equipo'];
        const matchesTab = tabCategory && tabCategory.toString().toLowerCase().trim() === currentTab;
        const areaValue = p['Área'] ? normalizeText(p['Área']) : 'default';
        const matchesArea = selectedAreas.length === 0 || selectedAreas.includes(areaValue);
        return matchesTab && matchesArea;
    });

    filteredData.sort((a, b) => {
        const dateA = parseDateSafe(a['Fecha de Inicio'])?.getTime() || 0;
        const dateB = parseDateSafe(b['Fecha de Inicio'])?.getTime() || 0;
        if (dateA !== dateB) return dateA - dateB;
        const areaA = normalizeText(a['Área']);
        const areaB = normalizeText(b['Área']);
        if (areaA !== areaB) return areaA.localeCompare(areaB);
        const endA = parseDateSafe(a['Fecha de Fin'])?.getTime() || 0;
        const endB = parseDateSafe(b['Fecha de Fin'])?.getTime() || 0;
        return endB - endA; 
    });

    const rowEndPositions = [];
    const containerWidth = scrollArea.offsetWidth || 3800; 
    const rowSpacing = 56; 

    filteredData.forEach(project => {
        const leftPos = getTimelinePosition(project['Fecha de Inicio']);
        const rightPos = getTimelinePosition(project['Fecha de Fin']);
        
        if (leftPos === null || rightPos === null) return;
        
        if (rightPos > 0 && leftPos < 100) {
            
            const bar = document.createElement('div');
            bar.className = 'project-bar';
            
            const areaKey = normalizeText(project['Área']);
            const rawArea = project['Área'] || 'No definida';
            bar.setAttribute('data-area', areaKey);
            
            const displayLeft = Math.max(0, leftPos);
            let dateWidthPct = rightPos - leftPos;
            const displayWidthPct = Math.min(dateWidthPct - (displayLeft - leftPos), 100 - displayLeft);

            bar.style.left = `${displayLeft}%`;
            bar.style.width = `${displayWidthPct}%`;
            
            if (areaKey === 'default') {
                bar.style.background = `var(--area-default)`;
            } else {
                bar.style.background = `var(--area-${areaKey}, var(--bold-azul))`;
            }

            const projName = project['Nombre del proyecto'] || 'Sin nombre';
            bar.setAttribute('title', `Proyecto: ${projName}\nÁrea: ${rawArea}\nEstado: ${project['Estado'] || 'No definido'}`);

            const statusKey = normalizeText(project['Estado']);
            let iconHtml = '';
            if (statusKey === 'dev') iconHtml = `<img src="assets/dev.png" class="status-icon">`;
            else if (statusKey === 'test') iconHtml = `<img src="assets/test.png" class="status-icon">`;
            else if (statusKey === 'prod') iconHtml = `<img src="assets/prod.png" class="status-icon">`;
            else if (statusKey === 'piloto') iconHtml = `<img src="assets/piloto1.png" class="status-icon piloto-icon">`;

            const devName = project['Desarrollador'] || '';

            if (isAppianStyle) {
                bar.innerHTML = `
                    <span class="project-title">${projName}</span>
                    <div class="badges">
                        ${devName && devName.toLowerCase() !== 'n/a' ? `<span class="badge">${devName}</span>` : ''}
                        ${iconHtml}
                    </div>
                `;
            } else {
                const appRaw = project['Aplicativo'] ? project['Aplicativo'].toString().toLowerCase() : '';
                let appBubbles = '';
                if (appRaw.includes('dapta')) appBubbles += `<div class="bubble app-bubble"><img src="assets/dapta-logo.png" title="Dapta"></div>`;
                if (appRaw.includes('n8n')) appBubbles += `<div class="bubble app-bubble"><img src="assets/n8n-logo.png" title="n8n"></div>`;
                if (appRaw.includes('boost')) appBubbles += `<div class="bubble app-bubble"><img src="assets/boost-logo.png" title="Boost AI"></div>`;

                let statusBubble = iconHtml ? `<div class="bubble">${iconHtml}</div>` : '';

                let devBubble = '';
                if (devName && devName.toLowerCase() !== 'n/a') {
                    const initial = devName.charAt(0).toUpperCase();
                    const shortName = devName.split(' ')[0]; 
                    devBubble = `
                        <div class="bubble dev-bubble">
                            <span class="dev-initial">${initial}</span>
                            <span class="dev-full">${shortName}</span>
                        </div>
                    `;
                }

                bar.innerHTML = `
                    <span class="project-title">${projName}</span>
                    <div class="floating-bubbles">
                        ${statusBubble}
                        ${appBubbles}
                        ${devBubble}
                    </div>
                `;
            }
            
            container.appendChild(bar);

            const actualWidthPx = bar.getBoundingClientRect().width || bar.offsetWidth;
            const visualWidthPct = (actualWidthPx / containerWidth) * 100;
            const visualRightPos = displayLeft + visualWidthPct;

            let currentRow = 0;
            while (rowEndPositions[currentRow] !== undefined && rowEndPositions[currentRow] > (displayLeft - 0.2)) {
                currentRow++;
            }
            
            rowEndPositions[currentRow] = visualRightPos;
            bar.style.top = `${currentRow * rowSpacing}px`; 
        }
    });
    
    container.style.height = `${rowEndPositions.length * rowSpacing + 80}px`;
}

// =========================================================================
// SISTEMA DE CONTROL DE PESTAÑAS
// =========================================================================
function switchMainTab(tab) {
    currentMainTab = tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    const scrollArea = document.getElementById('mainScrollArea');

    if (tab === 'automation') {
        document.getElementById('sub-tabs-automation').style.display = 'flex';
        currentTab = currentSubTab; 
        scrollArea.classList.remove('appian-view'); 
    } else {
        document.getElementById('sub-tabs-automation').style.display = 'none';
        currentTab = 'appian'; 
        scrollArea.classList.add('appian-view'); 
    }
    
    document.getElementById('viewToggle').checked = false;
    scrollArea.classList.remove('monthly-view');
    document.getElementById('toggleContainer').classList.remove('monthly-active');

    // IMPORTANTE: Redibujamos las cabeceras para que cambie de "S1" a "Semana 1"
    renderCalendarHeaders();
    renderProjects();
}

function switchSubTab(subtab) {
    currentSubTab = subtab;
    currentTab = subtab; 
    
    document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('sub-tab-' + subtab.replace(/\s+/g, '-')).classList.add('active');
    
    renderProjects();
}

async function loadDataAndRender() {
    renderCalendarHeaders(); 

    const container = document.getElementById('projects-container');
    const syncToast = document.getElementById('sync-toast');
    const cachedData = sessionStorage.getItem('boldRoadmapData');

    if (cachedData) {
        try {
            data = JSON.parse(cachedData);
            populateFilterDropdown(); 
            if (currentMainTab === 'appian') {
                document.getElementById('mainScrollArea').classList.add('appian-view');
            }
            renderProjects();
            setTimeout(scrollToToday, 100);
            renderTodayLine();
            
            syncToast.innerHTML = `<div class="spinner-small"></div> Sincronizando Sheets...`;
            syncToast.classList.add('show');
        } catch(e) { console.error("Error leyendo caché", e); }
    } else {
        container.innerHTML = `<div class="loader-container"><div class="spinner-large"></div><span>Conectando con Google Sheets...</span></div>`;
    }

    try {
        const noCacheUrl = sheetApiUrl + "?t=" + new Date().getTime();
        const response = await fetch(noCacheUrl, { cache: "no-store" });
        data = await response.json();
        sessionStorage.setItem('boldRoadmapData', JSON.stringify(data));
        
        populateFilterDropdown(); 
        
        if (currentMainTab === 'appian') {
            document.getElementById('mainScrollArea').classList.add('appian-view');
        }
        
        renderProjects();
        renderTodayLine();
        
        if (!cachedData) {
            setTimeout(scrollToToday, 100);
        } else {
            syncToast.innerHTML = `✅ ¡Actualizado!`;
            setTimeout(() => syncToast.classList.remove('show'), 2500);
        }
    } catch (error) {
        console.error("Error sincronizando", error);
        if (!cachedData) {
            container.innerHTML = `<div class="loader-container" style="color:red;"><span>Error de red. Por favor recarga (F5).</span></div>`;
        } else {
            syncToast.innerHTML = `⚠️ No se pudo sincronizar`;
            setTimeout(() => syncToast.classList.remove('show'), 3000);
        }
    }
}

loadDataAndRender();
