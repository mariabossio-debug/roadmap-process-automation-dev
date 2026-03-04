const sheetApiUrl = 'https://script.google.com/macros/s/AKfycbynd7JOqdCceaBVf_AEBaoxhSCNg-5MNZvVb2_xQHI8hJVfvR0dd8IIPgd4A4GCMWWk/exec'; 

const wStart = new Date(2026, 0, 1, 0, 0, 0);
const wEnd = new Date(2026, 11, 31, 23, 59, 59);
const totalDays = (wEnd - wStart) / (1000 * 60 * 60 * 24);

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
            htmlWeeks += `<div class="week" style="width: ${monthWidthPct / 4}%;">Semana ${w}</div>`;
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
    const match = dateValue.toString().match(/(\d{4})-(\d{2})-(\d{2})/);
    if(match) return new Date(match[1], match[2] - 1, match[3], 12, 0, 0);
    return new Date(dateValue);
}

function getTimelinePosition(dateValue) {
    const date = parseDateSafe(dateValue);
    if (!date) return null;
    return ((date - wStart) / (1000 * 60 * 60 * 24) / totalDays) * 100; 
}

function renderTodayLine() {
    const today = new Date(); 
    const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayPercentage = getTimelinePosition(formattedToday);
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

function toggleViewMode() {
    const isMonthly = document.getElementById('viewToggle').checked;
    document.getElementById('mainScrollArea').classList.toggle('monthly-view', isMonthly);
    document.getElementById('toggleContainer').classList.toggle('monthly-active', isMonthly);
    setTimeout(() => { renderProjects(); scrollToToday(); }, 300);
}

function renderProjects() {
    const container = document.getElementById('projects-container');
    const scrollArea = document.getElementById('mainScrollArea');
    container.innerHTML = ''; 

    if (!data || data.length === 0) return;

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

    filteredData.forEach(project => {
        const leftPos = getTimelinePosition(project['Fecha de Inicio']);
        const rightPos = getTimelinePosition(project['Fecha de Fin']);
        
        if (leftPos === null || rightPos === null) return;
        
        let width = rightPos - leftPos;
        
        if (rightPos > 0 && leftPos < 100) {
            const bar = document.createElement('div');
            bar.className = 'project-bar';
            
            const areaKey = normalizeText(project['Área']);
            const rawArea = project['Área'] || 'No definida';
            bar.setAttribute('data-area', areaKey);
            
            const displayLeft = Math.max(0, leftPos);
            const displayWidth = width - (displayLeft - leftPos);
            const finalWidth = Math.min(displayWidth, 100 - displayLeft);

            bar.style.left = `${displayLeft}%`;
            bar.style.width = `${finalWidth}%`;
            
            if (areaKey === 'default') {
                bar.style.background = `var(--area-default)`;
            } else {
                bar.style.background = `var(--area-${areaKey}, var(--bold-azul))`;
            }

            const statusKey = normalizeText(project['Estado']);
            const devName = project['Desarrollador'] || '';
            const projName = project['Nombre del proyecto'] || 'Sin nombre';

            const tooltipText = `Proyecto: ${projName}\nÁrea: ${rawArea}\nEstado: ${project['Estado'] || 'No definido'}`;
            bar.setAttribute('title', tooltipText);

            let iconHtml = '';
            if (statusKey === 'dev') iconHtml = `<img src="assets/dev.png" class="status-icon">`;
            else if (statusKey === 'test') iconHtml = `<img src="assets/test.png" class="status-icon">`;
            else if (statusKey === 'prod') iconHtml = `<img src="assets/prod.png" class="status-icon">`;
            else if (statusKey === 'piloto') iconHtml = `<img src="assets/piloto1.png" class="status-icon piloto-icon">`;

            bar.innerHTML = `
                <span class="project-title">${projName}</span>
                <div class="badges">
                    ${devName && devName.toLowerCase() !== 'n/a' ? `<span class="badge">${devName}</span>` : ''}
                    ${iconHtml}
                </div>
            `;
            
            container.appendChild(bar);

            const actualWidthPx = bar.offsetWidth;
            const visualWidthPct = (actualWidthPx / containerWidth) * 100;
            const visualRightPos = displayLeft + Math.max(finalWidth, visualWidthPct);

            let currentRow = 0;
            while (rowEndPositions[currentRow] !== undefined && rowEndPositions[currentRow] > (displayLeft - 0.2)) {
                currentRow++;
            }
            
            rowEndPositions[currentRow] = visualRightPos;
            bar.style.top = `${currentRow * 40}px`; 
        }
    });
    
    container.style.height = `${rowEndPositions.length * 40 + 70}px`;
}

function switchTab(team) {
    currentTab = team.toLowerCase().trim(); 
    document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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
