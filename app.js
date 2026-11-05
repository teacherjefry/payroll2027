        // Database & System Config
        const DB_NAME = 'NeeradaCombinedDB_v1'; const DB_VERSION = 1;
        const STORE_EMPLOYEES = 'employees'; const STORE_HISTORY = 'history_logs'; const STORE_CONFIG = 'department_configs';
        
        const ACADEMIC_DEPTS = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Academic Head - Kinder', 'Academic Head - Primary', 'Academic Head - HS', 'Vice Principal'];
        const GS_DEPTS = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers (ຄູຮັບເຊີນ)', 'Cooks (ແມ່ຄົວ)', 'Cleaners (ພະນັກງານອະນາໄມ)', 'Drivers (ພະນັກງານຂັບລົດ)', 'Repair (ສ້ອມແປງ)'];
        const DEFAULT_DEPTS = [...ACADEMIC_DEPTS, ...GS_DEPTS];
        const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const CAMPUSES = ['Sibounheuang', 'Chommany', 'General Services'];
        
        const LAO_FIELDS = {
            research: 'ດຸໝັ່ນຄົ້ນຄວ້າ&ພັດທະນາການສອນການສອນ (ຮູ້ນໍາໃຊ້ເຕັກນິກເພື່ອເຮັດໃຫ້ ນຮ ມັກຮຽນ)',
            media: 'ນຳໃຊ້ສື່ການສອນ/ແຕ່ງບົດສອນ/ຕິດຕາມພັດທະນາການ ນຮ.ຫ້າວຫັນໃນການປະກອບສ່ວນໃນວຽກອື່ນໆຂອງໂຮງຮຽນ',
            behaviorBasic: 'ຄຸ້ມຄອງລະບຽບແລະຄວາມປະພຶດ ໃສ່ໃຈນຳ ນັກຮຽນ', 
            classResp: 'ຄວາມຮັບຜິດຊອບໃນຫ້ອງຮຽນ : ທຸກໆຢ່າງ',
            policy: 'ນະໂຍບາຍອື່ນໆ', basic: 'ເງີນເດືອນພື້ນຖານ', 
            cert: 'ໃບປະກາດ: ປຕີ (ສອງແສນຫ້າສິບ) ຊັ້ນສູງ (ສອງແສນ) ຊັ້ນກາງ (ໜຶ່ງແສນຫ້າສິບ)',
            homeroom: 'ຄູປະຈຳຫ້ອງ/ຄູປະຈຳຫ້ອງສະໝຸດ/ຄູປະຈຳເດີ່ນກິລາ',
            behaviorStart: 'ຄຸ້ມຄອງລະບຽບແລະຄວາມປະພຶດ ນຮ/ໃສ່ໃຈນຳນັກຮຽນ', 
            start: 'ເລີ້ມຕົ້ນ', accumulated: 'ເງີນສະສົມປີຜ່ານມາ', increase: 'ເພີ້ມປະຈຳປີ 2025-2026'
        };
        
        const laoEarningsStruct = [ LAO_FIELDS.research, LAO_FIELDS.media, LAO_FIELDS.behaviorBasic, LAO_FIELDS.classResp, LAO_FIELDS.policy, LAO_FIELDS.basic, LAO_FIELDS.cert, LAO_FIELDS.homeroom, LAO_FIELDS.behaviorStart, LAO_FIELDS.start, LAO_FIELDS.accumulated, LAO_FIELDS.increase ];
        const defaultDeductions = ['ຫັກເງີນອາກອນ 5% (ຕາມເງີນເດືອນຕົວຈິງ)', 'ຫັກປະກັນສັງຄົມ 5.5%', 'ມາຊ້າ', 'Others ອື່ນໆ'];

        let db = null; let employees = []; let history = []; let departmentConfigs = {}; let selectedEmployee = null; let selectedOTLStaff = null; let currentPayrollState = {}; let currentFilter = { campus: 'All', department: 'All' }; let editorMonth = ""; let editorYear = new Date().getFullYear(); let tempProfilePic = null; let editingLoanIndex = -1; let currentHistoryId = null;

        // DB Helpers
        async function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if(!db.objectStoreNames.contains(STORE_EMPLOYEES)) db.createObjectStore(STORE_EMPLOYEES, { keyPath: 'id' });
                    if(!db.objectStoreNames.contains(STORE_HISTORY)) db.createObjectStore(STORE_HISTORY, { keyPath: 'dateId' });
                    if(!db.objectStoreNames.contains(STORE_CONFIG)) db.createObjectStore(STORE_CONFIG, { keyPath: 'name' });
                };
                request.onsuccess = (e) => { db = e.target.result; resolve(db); };
                request.onerror = (e) => reject(e.target.error);
            });
        }
        async function transact(storeName, mode, op) {
            if(!db) await openDB();
            const tx = db.transaction(storeName, mode); const store = tx.objectStore(storeName); const req = op(store);
            return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
        }

        // Boot and Navigation
        window.onload = function() { 
            lucide.createIcons();
            const savedLogo = localStorage.getItem('neerada_school_logo');
            if(savedLogo) {
                 const els = ['landing-custom-logo', 'header-custom-logo', 'prev-school-logo'];
                 els.forEach(id => { const el = document.getElementById(id); if(el) { el.src = savedLogo; el.classList.remove('hidden'); } });
                 const icon = document.getElementById('landing-logo-container'); if(icon) icon.classList.add('hidden');
                 const favEl = document.getElementById('app-favicon'); if (favEl) favEl.href = savedLogo;
                 const appleEl = document.getElementById('app-apple-touch-icon'); if (appleEl) appleEl.href = savedLogo;
            }
            if (localStorage.getItem('neerada_locked') === 'true') { window.showLockScreen(); return; }
            if (localStorage.getItem('neerada_current_view') === 'app') { setTimeout(() => window.launchApp(), 0); }
        };

        window.launchApp = function(skipAnim = false) {
            if (localStorage.getItem('neerada_locked') === 'true') { window.showLockScreen(); return; }
            document.getElementById('landing-view').classList.add('hidden'); document.body.classList.remove('view-landing'); document.getElementById('app-view').classList.remove('hidden'); document.body.classList.add('view-app'); localStorage.setItem('neerada_current_view', 'app');
            const savedTab = localStorage.getItem('neerada_active_tab') || 'dashboard'; window.switchView(savedTab);
            if (!window.appInitialized) { initApp(); window.appInitialized = true; }
        };
        window.goToLanding = function() { document.getElementById('app-view').classList.add('hidden'); document.body.classList.remove('view-app'); document.getElementById('landing-view').classList.remove('hidden'); document.body.classList.add('view-landing'); localStorage.setItem('neerada_current_view', 'landing'); localStorage.removeItem('neerada_active_tab'); };
        
        async function initApp() {
            try {
                await openDB();
                const configs = await transact(STORE_CONFIG, 'readonly', (s) => s.getAll());
                if (configs.length === 0) {
                    for (const d of DEFAULT_DEPTS) {
                        let earnings = []; let deductions = [...defaultDeductions];
                        if (ACADEMIC_DEPTS.includes(d) && d !== 'English') { earnings = [...laoEarningsStruct]; } else if (d === 'English') { earnings = []; deductions = []; } else {
                            if (d.includes('Accounts')) { earnings = ['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ເງີນເດືອນພື້ນຖານ', 'ສະສົມປີຜ່ານມາ', 'ເພີ້ມປະຈຳປີ 2025-2026', 'ບໍລິຫານຫ້ອງການ/ບັນຊີ', 'ດຸໝັ່ນມາການ (ບໍ່ຂາດການ)', 'ພົວພັນວຽກທາງນອກ-ພາຍໃນ', 'ບັນຊີ ການເງີນວຽກອື່ນໆຂອງໂຮງຮຽນ']; } else if (d.includes('Invitational Teachers')) { earnings = ['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)', 'ເງີນເດືອນ']; } else { earnings = ['ເງີນເດືອນ (Salary)', 'ເງີນເພີ່ມ (Allowance)', 'OT']; }
                        }
                        const cfg = { name: d, earnings, deductions }; await transact(STORE_CONFIG, 'readwrite', (s) => s.put(cfg)); departmentConfigs[d] = cfg;
                    }
                } else { configs.forEach(c => departmentConfigs[c.name] = c); }
                employees = await transact(STORE_EMPLOYEES, 'readonly', (s) => s.getAll()); history = await transact(STORE_HISTORY, 'readonly', (s) => s.getAll());
                const savedTheme = localStorage.getItem('neerada_theme') || 'default'; if(document.body.classList.contains('view-app')) document.body.classList.add(`theme-${savedTheme}`);
                setupYearSelectors(); setupMonthSelectors(); setupBulkDepartmentSelector(); window.updateDashboardStats(); renderDeptSidebar(); renderEmployeeList();
                const savedStaffId = localStorage.getItem('neerada_selected_staff');
                if (localStorage.getItem('neerada_active_tab') === 'payroll' && savedStaffId && employees.some(e => String(e.id) === String(savedStaffId))) {
                    window.selectEmployee(savedStaffId);
                }
                document.getElementById('loading-screen').style.display = 'none'; document.getElementById('app-content').classList.remove('hidden'); if (window.lucide) lucide.createIcons(); updateDateWidget();
            } catch(e) { console.error("Init fail:", e); }
        }

        function getOrderedDepartments() {
            const allDepts = Object.keys(departmentConfigs);
            return allDepts.sort((a, b) => { const indexA = DEFAULT_DEPTS.indexOf(a); const indexB = DEFAULT_DEPTS.indexOf(b); if (indexA !== -1 && indexB !== -1) return indexA - indexB; if (indexA !== -1) return -1; if (indexB !== -1) return 1; return a.localeCompare(b); });
        }
        function setupBulkDepartmentSelector() {
            const el = document.getElementById('bulk-department');
            if (!el) return;
            const current = el.value || 'All';
            const departments = getOrderedDepartments();
            el.innerHTML = '<option value="All">All Departments</option>' + departments.map(dept => {
                const safe = String(dept).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                return `<option value="${safe}">${safe}</option>`;
            }).join('');
            el.value = departments.includes(current) || current === 'All' ? current : 'All';
        }
        function setupYearSelectors() {
            const yr = new Date().getFullYear(); const endYear = Math.max(2030, yr + 1); let opts = ""; for (let i = yr - 2; i <= endYear; i++) opts += `<option value="${i}">${i}</option>`;
            ['filter-year', 'editor-year', 'save-year', 'otl-year', 'bulk-year', 'bulk-import-year'].forEach(id => { const el = document.getElementById(id); if (el) { const defaultOpt = (id === 'filter-year') ? `<option value="All">All Years</option>` : ''; el.innerHTML = defaultOpt + opts; if (id !== 'filter-year') el.value = yr; } });
            editorYear = yr;
        }
        function setupMonthSelectors() {
            const m = MONTHS[new Date().getMonth()]; const opts = MONTHS.map(mn => `<option value="${mn}">${mn}</option>`).join('');
            ['filter-month', 'editor-month', 'save-month', 'otl-month', 'bulk-month', 'bulk-import-month'].forEach(id => { const el = document.getElementById(id); if (el) { const defaultOpt = (id === 'filter-month') ? `<option value="All">All Months</option>` : ''; el.innerHTML = defaultOpt + opts; if (id !== 'filter-month') el.value = m; } });
            editorMonth = m;
        }
        function updateDateWidget() { const el = document.getElementById('date-display'); if(el) el.innerText = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
        
        // Utilities for Currency formatting
        window.formatCurrencyInput = function(input) {
             let val = input.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
             if (val) {
                 const parts = val.split('.');
                 parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                 input.value = parts.join('.');
             } else { input.value = ''; }
        };
        function formatMoney(n) { return '₭ ' + parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
        function formatUSD(n) { return '$' + parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2}); }
        function generateEmployeeID(emp, month, year) {
            let campusCode = "GENSERV"; if (emp.campus === "Sibounheuang") campusCode = "SBH"; else if (emp.campus === "Chommany") campusCode = "CHM";
            const deptCode = (emp.department || "U").charAt(0).toUpperCase(); const nameCode = (emp.name || "STAFF").split(' ')[0].toUpperCase();
            const monthCode = month.substring(0, 3).toUpperCase(); const yearCode = year.toString().slice(-2);
            return `${campusCode}-${deptCode}-${nameCode}-${monthCode}-${yearCode}`;
        }

        function renderDeptSidebar() {
            const tree = document.getElementById('dept-tree'); if(!tree) return; const currentDepts = getOrderedDepartments();
            let html = `<div onclick="window.setFilter('All', 'All')" class="cursor-pointer px-3 py-2 rounded mb-2 text-sm flex justify-between items-center gap-2 ${currentFilter.campus === 'All' && currentFilter.department === 'All' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-200'}"><div class="flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> All Staff</div><span class="text-xs bg-black/10 px-1.5 py-0.5 rounded-full font-mono">${employees.length}</span></div>`; 
            CAMPUSES.forEach(campus => { 
                html += `<div class="mt-4 mb-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex justify-between items-center cursor-pointer text-blue-800 bg-blue-100 hover:bg-blue-200 transition-colors shadow-sm" onclick="window.setFilter('${campus}', 'All')">${campus}<i data-lucide="chevron-down" class="w-3 h-3 text-blue-500"></i></div>`; 
                let targetDepts = (campus === 'General Services') ? GS_DEPTS : ACADEMIC_DEPTS;
                const deptsToShow = currentDepts.filter(d => targetDepts.includes(d));
                deptsToShow.forEach(dept => { 
                    const count = employees.filter(e => e.campus === campus && e.department === dept).length; 
                    const isActive = currentFilter.campus === campus && currentFilter.department === dept;
                    html += `<div onclick="window.setFilter('${campus}', '${dept}')" class="cursor-pointer px-3 py-1.5 rounded ml-2 text-sm transition-colors flex justify-between items-center ${isActive ? 'bg-white shadow-sm text-blue-700 font-medium border-l-2 border-blue-500' : 'text-gray-500 hover:bg-gray-200 border-l-2 border-transparent'}"><span>${dept}</span><span class="text-[10px] ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'} px-1.5 py-0.5 rounded-full font-mono">${count}</span></div>`; 
                }); 
            }); 
            tree.innerHTML = html;
            const bl = document.getElementById('current-filter-label'); if(bl) bl.innerText = currentFilter.department !== 'All' ? `${currentFilter.department} (${currentFilter.campus})` : 'All Staff';
            const delBtn = document.getElementById('delete-dept-button'); if (delBtn) { if (currentFilter.department !== 'All') { delBtn.disabled = false; delBtn.classList.remove('opacity-50'); } else { delBtn.disabled = true; delBtn.classList.add('opacity-50'); } }
            if (window.lucide) lucide.createIcons();
        }
        window.setFilter = (c, d) => { currentFilter = { campus: c, department: d }; renderDeptSidebar(); renderEmployeeList(); }; window.clearFilter = () => window.setFilter('All', 'All');

        function renderEmployeeList() {
            const list = document.getElementById('employee-list'); if(!list) return; let filtered = employees;
            if (currentFilter.campus !== 'All') filtered = filtered.filter(e => e.campus === currentFilter.campus);
            if (currentFilter.department !== 'All') filtered = filtered.filter(e => e.department === currentFilter.department);
            list.innerHTML = filtered.map(emp => {
                const hasBankName = emp.bankAccountName && emp.bankAccountName.trim() !== '';
                const resignedBadge = emp.status === 'Resigned' ? `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-bold ml-2">Resigned</span>` : '';
                const movementNotes = Array.isArray(emp.movementHistory) && emp.movementHistory.length ? emp.movementHistory.map(m => `<div class="text-[9px] text-gray-400 mt-0.5 whitespace-pre-wrap">Movement: ${escapePayslipHTML(m.from || '-')} → ${escapePayslipHTML(m.to || '-')} · ${m.date ? new Date(m.date).toLocaleString() : '-'}${m.note ? ` — ${escapePayslipHTML(m.note)}` : ''}</div>`).join('') : '';
                return `<div onclick="window.selectEmployee('${emp.id}')" class="p-3 rounded-lg cursor-pointer transition-all border mb-2 ${selectedEmployee?.id === emp.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'} ${emp.status === 'Resigned' ? 'opacity-70' : ''}"><div class="flex justify-between items-start"><div class="flex items-center gap-3"><div class="relative">${emp.profilePic ? `<img src="${emp.profilePic}" class="w-8 h-8 rounded-full object-cover">` : `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><i data-lucide="user" class="w-4 h-4 text-gray-400"></i></div>`}${hasBankName ? `<div class="absolute -top-1 -right-1 bg-green-500 rounded-full border border-white flex items-center justify-center" style="width:14px; height:14px;" title="Bank Account Name Set"><i data-lucide="check" class="w-2.5 h-2.5 text-white"></i></div>` : ''}</div><div><p class="font-bold text-gray-800 text-sm flex items-center gap-2"><span>${emp.name}</span>${resignedBadge}</p><p class="text-xs text-blue-600 font-medium">${emp.department}</p><p class="text-[10px] text-gray-400 mt-1">Modified: ${emp.lastModified ? new Date(emp.lastModified).toLocaleString() : 'N/A'}</p>${movementNotes}</div></div><button onclick="event.stopPropagation(); window.deleteEmployee('${emp.id}')" class="text-gray-300 hover:text-red-500 p-1" title="Delete Staff"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></div></div>`
            }).join('');
            if (window.lucide) lucide.createIcons();
        }
        window.selectEmployee = (id) => { selectedEmployee = employees.find(e => String(e.id) === String(id)); loadPeriodData(); document.getElementById('empty-state').classList.add('hidden'); document.getElementById('editor-area').classList.remove('hidden'); renderEmployeeList(); };

        function recalculatePayrollState(dept, state) {
            if (dept.includes('Accounts')) { const usd = parseFloat(state['Basic Pay (USD)'] || 0); const rate = parseFloat(state['Exchange Rate (LAK)'] || 0); if (usd > 0 && rate > 0) state['ເງີນເດືອນພື້ນຖານ'] = usd * rate; }
            else if (dept.includes('Invitational Teachers')) { const hrs = parseFloat(state['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'] || 0); const rate = parseFloat(state['ອັດຕາຊົ່ວໂມງ (Rate per Hour)'] || 0); if (hrs > 0 && rate > 0) state['ເງີນເດືອນ'] = hrs * rate; }
            else if (dept !== 'English' && !GS_DEPTS.includes(dept)) {
                const cfg = departmentConfigs[dept];
                // Positional addition for custom labels mapping
                if (cfg && cfg.earnings.length >= 10) {
                    const earnList = cfg.earnings; const basicField = earnList[5]; const startField = earnList[9]; 
                    let bSum = 0; for(let i=0; i<=4; i++) { if(earnList[i]) bSum += parseFloat(state[earnList[i]]) || 0; }
                    state[basicField] = bSum;
                    let startSum = bSum; for(let i=6; i<=8; i++) { if(earnList[i]) startSum += parseFloat(state[earnList[i]]) || 0; }
                    state[startField] = startSum;
                }
            }
            return state;
        }

        function calculatePayrollFromState(emp, state) {
            const d = JSON.parse(JSON.stringify(state)); if (emp.department === 'English') { const adjusted = getArounyEnglishPayrollState(emp, `${editorYear}-${editorMonth}`, d); Object.assign(d, adjusted); } recalculatePayrollState(emp.department, d);
            if (emp.department === 'English') {
                const ot = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const gross = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0) + ot; const dedUSD = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = gross - dedUSD; const convert = netUSD - (parseFloat(d.cashOut)||0); const convLAK = convert * (parseFloat(d.exchangeRate)||0); const extra = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + (parseFloat(d.loanDeduction)||0); 
                return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut)||0 };
            }
            const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] }; let te = 0, td = 0;
            const isStandardLaoDept = !emp.department.includes('Accounts') && !emp.department.includes('Invitational Teachers') && !['English'].includes(emp.department) && !GS_DEPTS.includes(emp.department);
            cfg.earnings.forEach((f, currIndex) => {
                const v = parseFloat(d[f] || 0);
                if (isStandardLaoDept) {
                     if (cfg.earnings.length > 9) { if (currIndex >= 9 && f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') te += v; } 
                     else if (cfg.earnings.length > 5) { if (currIndex >= 5 && f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') te += v; } 
                     else { if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') te += v; }
                } else { if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) te += v; }
            });
            if (d.overtimeAmount) te += parseFloat(d.overtimeAmount); cfg.deductions.forEach(f => td += parseFloat(d[f] || 0)); if (d.loanDeduction) td += parseFloat(d.loanDeduction);
            return { lak: Math.max(0, te - td), usd: 0 };
        }

        window.syncLoanBalances = (emp) => {
            if(!emp || !Array.isArray(emp.activeLoans) || emp.activeLoans.length === 0) return;
            const loansByDesc = new Map();
            emp.activeLoans.forEach(loan => {
                const desc = String(loan.description || '').trim();
                if (desc && !loansByDesc.has(desc)) loansByDesc.set(desc, loan);
            });
            const paidTotals = new Map();
            const paymentCounts = new Map();
            if (emp.payrollHistory) {
                Object.values(emp.payrollHistory).forEach(ph => {
                    const ded = parseFloat(ph.loanDeduction || 0) || 0;
                    if (ded <= 0) return;
                    const desc = String(ph.loanDesc || '').trim();
                    const loan = desc && loansByDesc.has(desc) ? loansByDesc.get(desc) : emp.activeLoans[0];
                    if (!loan) return;
                    paidTotals.set(loan, (paidTotals.get(loan) || 0) + ded);
                    paymentCounts.set(loan, (paymentCounts.get(loan) || 0) + 1);
                });
            }
            const completedLoans = [];
            emp.activeLoans.forEach(loan => {
                const total = parseFloat(loan.total || 0) || 0;
                const paid = paidTotals.get(loan) || 0;
                loan.paid = Math.min(paid, total);
                loan.paymentCount = paymentCounts.get(loan) || 0;
                if (total > 0 && paid >= total) completedLoans.push(loan);
            });
            if (completedLoans.length > 0) {
                if(!emp.archivedLoans) emp.archivedLoans = [];
                completedLoans.forEach(loan => emp.archivedLoans.push(loan));
                emp.activeLoans = emp.activeLoans.filter(loan => !completedLoans.includes(loan));
            }
        };

        function loadPeriodData() {
            if (!selectedEmployee) return; const m = document.getElementById('editor-month').value; const y = document.getElementById('editor-year').value; editorMonth = m; editorYear = y; const key = `${y}-${m}`;
            currentPayrollState = (selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[key]) ? JSON.parse(JSON.stringify(selectedEmployee.payrollHistory[key])) : createInitialState(selectedEmployee.department);
            recalculatePayrollState(selectedEmployee.department, currentPayrollState); renderEditor();
        }

        function createInitialState(dept) {
            if (dept === 'English') return { basicPay: 0, accumulated: 0, increase: 0, earningsOthersUSD: 0, otHours: 0, otRate: 0, itLAK: 0, extraWorkOthersLAK: 0, stipendLAK: 0, profTax: 0, absences: 0, visa: 0, deductionsOthersUSD: 0, insuranceLAK: 0, deductionsOthersLAK: 0, cashOut: 0, exchangeRate: 0, notes: "" };
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; const state = {}; cfg.earnings.forEach(f => state[f] = 0); cfg.deductions.forEach(f => state[f] = 0); return state;
        }

        function renderEditor() {
            const container = document.getElementById('editor-content'); const dept = selectedEmployee.department;
            if (dept === 'English') { renderEnglishEditor(container); renderPreview(); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; const fNum = (n) => (n && parseFloat(n) !== 0) ? parseFloat(n).toLocaleString('en-US') : '';
            const earns = cfg.earnings.map((f, idx) => {
                let isCalc = false;
                if (dept.includes('Accounts') || dept.includes('Invitational Teachers') || GS_DEPTS.includes(dept)) { isCalc = (f === LAO_FIELDS.basic || f === LAO_FIELDS.start || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'); } else { isCalc = (idx === 5 || idx === 9); }
                const highlight = isCalc ? (idx === 5 || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ' ? 'field-highlight-1' : 'field-highlight-2') : '';
                const displayLabel = f === 'ເພີ້ມປະຈຳປີ 2025-2026' ? getAnnualIncreaseDisplayLabel() : f;
                return `<div class="${highlight}"><label class="block text-[10px] font-bold text-gray-500 mb-1 truncate" title="${displayLabel}">${displayLabel}</label><input type="text" ${isCalc ? 'readonly' : ''} data-field="${f}" oninput="window.formatCurrencyInput(this); window.updatePayrollField('${f}', this.value)" class="w-full text-sm border rounded p-1.5" value="${fNum(currentPayrollState[f])}"></div>`;
            }).join('');
            const deds = cfg.deductions.map(f => `<div><label class="block text-[10px] font-bold text-gray-500 mb-1 truncate">${f}</label><input type="text" data-field="${f}" oninput="window.formatCurrencyInput(this); window.updatePayrollField('${f}', this.value)" class="w-full text-sm border rounded p-1.5 text-red-600" value="${fNum(currentPayrollState[f])}"></div>`).join('');
            const notesField = `<div class="mt-4"><label class="block text-xs font-bold text-gray-500 mb-1">Notes</label><textarea class="w-full border rounded p-2 text-xs" rows="2" oninput="window.updatePayrollField('notes', this.value)">${currentPayrollState.notes || ''}</textarea></div>`;
            container.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4"><h3 class="font-bold text-gray-700 border-b pb-2 mb-3 text-xs uppercase">Earnings (LAK)</h3><div class="grid grid-cols-2 gap-3">${earns}</div></div><div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200"><h3 class="font-bold text-red-700 border-b pb-2 mb-3 text-xs uppercase">Deductions (LAK)</h3><div class="grid grid-cols-2 gap-3">${deds}</div></div>${notesField}`; renderPreview();
        }

        function renderEnglishEditor(container) {
            const d = currentPayrollState; const fNum = (n) => (n && parseFloat(n) !== 0) ? parseFloat(n).toLocaleString('en-US') : '';
            const renderInput = (label, field) => `<div><label class="block font-bold mb-1">${label}</label><input type="text" class="w-full border rounded p-1" value="${fNum(d[field])}" oninput="window.formatCurrencyInput(this); window.updatePayrollField('${field}', this.value)"></div>`;
            container.innerHTML = `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-2 text-xs"><div class="flex justify-between items-center border-b pb-2"><h3 class="font-bold text-blue-700">Settings</h3><div class="flex gap-2"><div><label class="block text-[9px] font-bold mb-1 flex items-center gap-1">Rate <button onclick="window.openRateCalculator()" class="text-blue-600 hover:bg-blue-100 p-0.5 rounded" title="Calculator & History"><i data-lucide="calculator" class="w-3 h-3"></i></button></label><input type="text" id="eng-exchange-rate" value="${fNum(d.exchangeRate)}" oninput="window.formatCurrencyInput(this); window.updatePayrollField('exchangeRate', this.value)" class="w-20 border rounded text-right p-1 bg-yellow-50 font-bold text-blue-800"></div><div><label class="block text-[9px] font-bold mb-1">CashOut</label><input type="text" value="${fNum(d.cashOut)}" oninput="window.formatCurrencyInput(this); window.updatePayrollField('cashOut', this.value)" class="w-12 border rounded text-right p-1"></div></div></div><h3 class="font-bold text-gray-600 mt-2 mb-2">EARNINGS (USD)</h3><div class="grid grid-cols-2 gap-x-4 gap-y-2">${renderInput('Basic Pay', 'basicPay')}${renderInput('Accumulated', 'accumulated')}${renderInput('Increase', 'increase')}${renderInput('Others', 'earningsOthersUSD')}</div><h3 class="font-bold text-gray-600 mt-4 mb-2">OVERTIME (USD)</h3><div class="grid grid-cols-2 gap-x-4 gap-y-2">${renderInput('Total Hours', 'otHours')}${renderInput('Rate/Hr', 'otRate')}</div><h3 class="font-bold text-purple-700 mt-4 mb-2">EXTRA WORK (LAK)</h3><div class="grid grid-cols-3 gap-x-4 gap-y-2">${renderInput('IT', 'itLAK')}${renderInput('Others', 'extraWorkOthersLAK')}${renderInput('Stipend', 'stipendLAK')}</div></div><div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mt-4 space-y-2 text-xs"><h3 class="font-bold text-red-700 border-b pb-2 mb-2">DEDUCTIONS</h3><div class="grid grid-cols-2 gap-x-4 gap-y-2">${renderInput('Prof. Tax', 'profTax')}${renderInput('Absences', 'absences')}${renderInput('Visa', 'visa')}${renderInput('Others', 'deductionsOthersUSD')}</div><h4 class="font-bold text-red-500 mt-4 mb-2 text-[10px]">LAK DEDUCTIONS</h4><div class="grid grid-cols-2 gap-x-4 gap-y-2">${renderInput('Insurance', 'insuranceLAK')}${renderInput('Others', 'deductionsOthersLAK')}</div></div>${renderEnglishVisaEditorSection(selectedEmployee, currentPayrollState)}<div class="mt-4"><label class="block text-xs font-bold text-gray-500 mb-1">Notes</label><textarea class="w-full border rounded p-2 text-xs" rows="2" oninput="window.updatePayrollField('notes', this.value)">${d.notes || ''}</textarea></div>`;
            if (window.lucide) lucide.createIcons();
        }

        window.updatePayrollField = async (f, v) => {
            if(f === 'notes') { currentPayrollState[f] = v; } else { currentPayrollState[f] = parseFloat(String(v).replace(/,/g, '')) || 0; }
            recalculatePayrollState(selectedEmployee.department, currentPayrollState);
            const updateUIField = (fieldName) => { const input = document.querySelector(`input[data-field="${fieldName}"]`); if(input) { const val = currentPayrollState[fieldName]; input.value = (val && parseFloat(val) !== 0) ? parseFloat(val).toLocaleString('en-US') : ''; } };
            if (selectedEmployee.department.includes('Accounts')) { updateUIField('ເງີນເດືອນພື້ນຖານ'); } else if (selectedEmployee.department.includes('Invitational Teachers')) { updateUIField('ເງີນເດືອນ'); } else if (selectedEmployee.department !== 'English' && !GS_DEPTS.includes(selectedEmployee.department)) { const c = departmentConfigs[selectedEmployee.department]; if(c && c.earnings.length > 9) { updateUIField(c.earnings[5]); updateUIField(c.earnings[9]); } }
            renderPreview();
        };

        function getPayslipLoanRecords(emp) {
            const sourceEmp = (selectedOTLStaff && selectedOTLStaff.id === emp?.id) ? selectedOTLStaff : (employees.find(e => e.id === emp?.id) || emp);
            if (!sourceEmp || !Array.isArray(sourceEmp.activeLoans) || sourceEmp.activeLoans.length === 0) return [];
            if (typeof window.syncLoanBalances === 'function') window.syncLoanBalances(sourceEmp);
            return sourceEmp.activeLoans.map(loan => {
                const total = parseFloat(loan.total || 0) || 0;
                const paid = Math.min(Math.max(parseFloat(loan.paid || 0) || 0, 0), total);
                const remaining = Math.max(0, total - paid);
                return {
                    description: loan.description && String(loan.description).trim() ? String(loan.description).trim() : 'Loan',
                    dateAdded: loan.dateAdded || '-',
                    total,
                    paid,
                    remaining
                };
            }).filter(loan => loan.total > 0 && loan.remaining > 0);
        }

        function renderPayslipLoanSection(emp) {
            const loans = getPayslipLoanRecords(emp);
            if (!loans.length) return '';
            const rows = loans.map(loan => `<div class="border-b border-orange-100 last:border-0 py-2"><div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold text-orange-900"><span>Loan / ເງິນກູ້: ${loan.description}</span><span>Loan Date / ວັນທີກູ້: ${loan.dateAdded}</span></div><div class="grid grid-cols-3 gap-3 mt-2 text-[10px]"><div><span class="block text-gray-500">Total Loan / ເງິນກູ້ທັງໝົດ</span><span class="font-mono font-bold text-gray-800">${formatMoney(loan.total)}</span></div><div><span class="block text-gray-500">Paid Already / ຈ່າຍແລ້ວ</span><span class="font-mono font-bold text-green-700">${formatMoney(loan.paid)}</span></div><div><span class="block text-gray-500">Remaining / ຍັງເຫຼືອ</span><span class="font-mono font-bold text-red-700">${formatMoney(loan.remaining)}</span></div></div></div>`).join('');
            return `<div class="mt-4 border border-orange-200 bg-orange-50 rounded-lg p-3 text-xs"><h4 class="font-bold text-orange-900 border-b border-orange-200 pb-1 mb-1 uppercase tracking-tight">Loan Details / ລາຍລະອຽດເງິນກູ້</h4>${rows}</div>`;
        }

        function getPayslipLoanMessage(emp) {
            const loans = getPayslipLoanRecords(emp);
            if (!loans.length) return '';
            return loans.map(loan => `\n💳 *LOAN / ເງິນກູ້*\nLoan: ${loan.description}\nLoan Date / ວັນທີກູ້: ${loan.dateAdded}\nTotal Loan / ເງິນກູ້ທັງໝົດ: ${formatMoney(loan.total)}\nPaid Already / ຈ່າຍແລ້ວ: ${formatMoney(loan.paid)}\nRemaining / ຍັງເຫຼືອ: ${formatMoney(loan.remaining)}\n`).join('');
        }

        function getGlobalPayslipNote(year = editorYear, month = editorMonth) {
            const key = `${year}-${month}`;
            try {
                const notes = JSON.parse(localStorage.getItem('neerada_global_payslip_notes') || '{}');
                return typeof notes[key] === 'string' ? notes[key] : '';
            } catch (e) {
                return '';
            }
        }

        function escapePayslipHTML(value) {
            return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function getGlobalPayslipNoteHTML() {
            const note = getGlobalPayslipNote();
            return note ? `<div class="mt-4 pt-2 border-t border-gray-300 text-[10px]"><p class="font-bold text-blue-900">Global Note:</p><p class="whitespace-pre-wrap text-gray-700">${escapePayslipHTML(note)}</p></div>` : '';
        }

        function getGlobalPayslipNoteMessage() {
            const note = getGlobalPayslipNote();
            return note ? `\n📝 *GLOBAL NOTE*\n${note}\n` : '';
        }

        window.openGlobalNoteEditor = () => {
            const month = document.getElementById('editor-month')?.value || editorMonth;
            const year = document.getElementById('editor-year')?.value || String(editorYear);
            const key = `${year}-${month}`;
            let notes = {};
            try { notes = JSON.parse(localStorage.getItem('neerada_global_payslip_notes') || '{}'); } catch (e) { notes = {}; }
            const existing = typeof notes[key] === 'string' ? notes[key] : '';

            const overlay = document.createElement('div');
            overlay.id = 'global-note-editor-overlay';
            overlay.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4';
            overlay.innerHTML = `<div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-5">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-blue-800">Global Note — ${escapePayslipHTML(month)} ${escapePayslipHTML(year)}</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-700 p-1" title="Close" onclick="document.getElementById('global-note-editor-overlay')?.remove()"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <textarea id="global-note-editor-text" class="w-full min-h-[320px] border border-gray-300 rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="Type the note for all staff payslips...">${escapePayslipHTML(existing)}</textarea>
                <p class="text-[11px] text-gray-500 mt-2">Press Enter to start a new line. Click OK to show this note on all staff payslips for this month.</p>
                <div class="flex justify-between gap-2 mt-4">
                    <button type="button" class="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium ${existing ? '' : 'invisible'}" onclick="if(confirm('Delete the global note for ${escapePayslipHTML(month)} ${escapePayslipHTML(year)}? Previous months will not be affected.')) { const n = JSON.parse(localStorage.getItem('neerada_global_payslip_notes') || '{}'); delete n['${escapePayslipHTML(key)}']; localStorage.setItem('neerada_global_payslip_notes', JSON.stringify(n)); document.getElementById('global-note-editor-overlay')?.remove(); if (typeof window.renderPreview === 'function') window.renderPreview(); }">Delete Note</button>
                    <div class="flex gap-2">
                        <button type="button" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm" onclick="document.getElementById('global-note-editor-overlay')?.remove()">Cancel</button>
                        <button type="button" class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700" onclick="const v = document.getElementById('global-note-editor-text')?.value || ''; const n = JSON.parse(localStorage.getItem('neerada_global_payslip_notes') || '{}'); const t = v.trim(); if (t) n['${escapePayslipHTML(key)}'] = t; else delete n['${escapePayslipHTML(key)}']; localStorage.setItem('neerada_global_payslip_notes', JSON.stringify(n)); document.getElementById('global-note-editor-overlay')?.remove(); if (typeof window.renderPreview === 'function') window.renderPreview();">OK</button>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(overlay);
            if (window.lucide) lucide.createIcons();
            setTimeout(() => document.getElementById('global-note-editor-text')?.focus(), 0);
        };

        function getEnglishVisaMonthNumber(key) {
            const parts = String(key || '').split('-');
            if (parts.length !== 2) return null;
            const year = parseInt(parts[0], 10);
            const monthIndex = MONTHS.indexOf(parts[1]);
            if (!Number.isFinite(year) || monthIndex < 0) return null;
            return year * 12 + monthIndex;
        }

        function getEnglishVisaStartKey(emp) {
            if (!emp || !emp.visaDate) return null;
            const d = new Date(`${emp.visaDate}T00:00:00`);
            if (Number.isNaN(d.getTime())) return null;
            return `${d.getFullYear()}-${MONTHS[d.getMonth()]}`;
        }

        function getEnglishVisaPaymentRecords(emp) {
            if (!emp || emp.department !== 'English') return [];
            const total = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
            if (total <= 0) return [];
            const startKey = getEnglishVisaStartKey(emp);
            const startNum = getEnglishVisaMonthNumber(startKey);
            let cumulative = 0;
            const records = Object.keys(emp.payrollHistory || {}).map(key => ({ key, amount: Math.max(0, parseFloat(emp.payrollHistory[key]?.visa || 0) || 0) }))
                .filter(r => r.amount > 0 && (startNum === null || (getEnglishVisaMonthNumber(r.key) ?? -1) >= startNum))
                .sort((a, b) => (getEnglishVisaMonthNumber(a.key) ?? -1) - (getEnglishVisaMonthNumber(b.key) ?? -1));
            const completed = [];
            for (const record of records) {
                if (cumulative >= total) break;
                const payment = Math.min(record.amount, total - cumulative);
                if (payment > 0) {
                    cumulative += payment;
                    completed.push({ key: record.key, amount: payment });
                }
            }
            return completed.sort((a, b) => (getEnglishVisaMonthNumber(b.key) ?? -1) - (getEnglishVisaMonthNumber(a.key) ?? -1));
        }

        function formatEnglishVisaPaymentMonth(key) {
            const parts = String(key || '').split('-');
            return parts.length === 2 ? `${parts[1]} ${parts[0]}` : String(key || '');
        }

        function getEnglishVisaPaymentBreakdown(emp, state = null, currentKey = null) {
            if (!emp || emp.department !== 'English') return { records: [], totalPaid: 0, remaining: 0, finishKey: null };
            const total = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
            if (total <= 0) return { records: [], totalPaid: 0, remaining: 0, finishKey: null };
            const startKey = getEnglishVisaStartKey(emp);
            const startNum = getEnglishVisaMonthNumber(startKey);
            const targetKey = currentKey || (state ? `${editorYear}-${editorMonth}` : null);
            const targetNum = getEnglishVisaMonthNumber(targetKey);
            const history = emp.payrollHistory || {};
            const rows = Object.keys(history).map(key => ({
                key,
                amount: Math.max(0, parseFloat(history[key]?.visa || 0) || 0)
            })).filter(r => {
                const keyNum = getEnglishVisaMonthNumber(r.key);
                if (r.amount <= 0) return false;
                if (startNum !== null && (keyNum === null || keyNum < startNum)) return false;
                if (targetNum !== null && (keyNum === null || keyNum > targetNum)) return false;
                if (state && targetKey && r.key === targetKey) return false;
                return true;
            }).sort((a, b) => (getEnglishVisaMonthNumber(a.key) ?? -1) - (getEnglishVisaMonthNumber(b.key) ?? -1));
            if (state && targetKey && (!targetNum || startNum === null || targetNum >= startNum)) {
                const currentAmount = Math.max(0, parseFloat(state.visa || 0) || 0);
                if (currentAmount > 0) rows.push({ key: targetKey, amount: currentAmount });
            }
            rows.sort((a, b) => (getEnglishVisaMonthNumber(a.key) ?? -1) - (getEnglishVisaMonthNumber(b.key) ?? -1));
            let cumulative = 0;
            const records = [];
            for (const row of rows) {
                if (cumulative >= total) break;
                const payment = Math.min(row.amount, total - cumulative);
                if (payment > 0) {
                    cumulative += payment;
                    records.push({ key: row.key, amount: payment });
                }
            }
            const finishKey = cumulative >= total && records.length ? records[records.length - 1].key : null;
            return { records, totalPaid: cumulative, remaining: Math.max(0, total - cumulative), finishKey };
        }

        function getEnglishVisaDisplayDate(emp, state = null) {
            if (!emp || !emp.visaDate) return '';
            const startKey = getEnglishVisaStartKey(emp);
            const currentKey = state ? `${editorYear}-${editorMonth}` : null;
            const currentNum = getEnglishVisaMonthNumber(currentKey);
            const startNum = getEnglishVisaMonthNumber(startKey);
            if (currentNum !== null && startNum !== null && currentNum < startNum) return '';
            const breakdown = getEnglishVisaPaymentBreakdown(emp, state, currentKey);
            const finishNum = getEnglishVisaMonthNumber(breakdown.finishKey);
            if (currentNum !== null && finishNum !== null && currentNum > finishNum) return '';
            return emp.visaDate;
        }

        function renderEnglishVisaEditorSection(emp, state) {
            if (!emp || emp.department !== 'English') return '';
            const visa = getEnglishVisaDetails(emp, state);
            const fNum = (n) => (n && parseFloat(n) !== 0) ? parseFloat(n).toLocaleString('en-US') : '';
            const visaDate = getEnglishVisaDisplayDate(emp, state);
            const visaCost = visa ? fNum(visa.total) : '';
            const totalPayment = visa ? fNum(visa.paid) : '';
            const remaining = visa ? fNum(visa.remaining) : '';
            return `<div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4 text-xs"><div class="flex items-center justify-between border-b border-blue-200 pb-2 mb-3"><h3 class="font-bold text-blue-800">Visa Details</h3><button type="button" onclick="window.resetEnglishVisaData()" class="text-red-500 hover:bg-red-100 p-1.5 rounded" title="Reset Visa Details"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button></div><div class="grid grid-cols-2 gap-3"><div><label class="block font-bold mb-1">Visa Cost</label><input type="text" class="w-full border rounded p-1" value="${visaCost}" onchange="window.updateEnglishVisaDetails('visaTotalCost', this.value)"></div><div><label class="block font-bold mb-1">Visa Date</label><input type="date" class="w-full border rounded p-1" value="${visaDate}" onchange="window.updateEnglishVisaDetails('visaDate', this.value)"></div><div><label class="block font-bold mb-1">Total Payment</label><input type="text" readonly class="w-full border rounded p-1 bg-white text-green-700 font-bold" value="${totalPayment}"></div><div><label class="block font-bold mb-1">Remaining</label><input type="text" readonly class="w-full border rounded p-1 bg-white text-red-700 font-bold" value="${remaining}"></div></div></div>`;
        }

        function getEnglishVisaTotalPayment(emp, currentState = null, currentKey = null) {
            if (!emp || emp.department !== 'English') return 0;
            const total = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
            if (total <= 0) return 0;
            const startKey = getEnglishVisaStartKey(emp);
            const startNum = getEnglishVisaMonthNumber(startKey);
            const targetKey = currentKey || null;
            const targetNum = getEnglishVisaMonthNumber(targetKey);
            let paid = 0;
            const history = emp.payrollHistory || {};
            Object.keys(history).forEach(key => {
                const keyNum = getEnglishVisaMonthNumber(key);
                if (startNum !== null && (keyNum === null || keyNum < startNum)) return;
                if (targetNum !== null && (keyNum === null || keyNum > targetNum)) return;
                if (currentKey && key === currentKey) return;
                paid += Math.max(0, parseFloat(history[key]?.visa || 0) || 0);
            });
            if (currentState && (!targetNum || startNum === null || targetNum >= startNum)) paid += Math.max(0, parseFloat(currentState.visa || 0) || 0);
            return Math.min(total, paid);
        }

        function getEnglishVisaDetails(emp, state = null) {
            if (!emp || emp.department !== 'English') return null;
            const total = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
            if (total <= 0) return null;
            const currentKey = state ? `${editorYear}-${editorMonth}` : null;
            const startKey = getEnglishVisaStartKey(emp);
            const currentNum = getEnglishVisaMonthNumber(currentKey);
            const startNum = getEnglishVisaMonthNumber(startKey);
            if (currentNum !== null && startNum !== null && currentNum < startNum) return null;
            const paidBefore = getEnglishVisaTotalPayment(emp, null, currentKey);
            const currentPayment = Math.max(0, parseFloat(state && state.visa || 0) || 0);
            const paid = Math.min(total, paidBefore + currentPayment);
            const remaining = Math.max(0, total - paid);
            if (currentNum !== null && paidBefore >= total) return null;
            return { total, paidBefore, currentPayment: Math.min(currentPayment, Math.max(0, total - paidBefore)), paid, remaining, date: emp.visaDate || '', startKey };
        }

        function renderEnglishVisaSection(emp, state = null) {
            const visa = getEnglishVisaDetails(emp, state);
            if (!visa || visa.total <= 0) return '';
            const breakdown = getEnglishVisaPaymentBreakdown(emp, state, state ? `${editorYear}-${editorMonth}` : null);
            const visaDate = getEnglishVisaDisplayDate(emp, state);
            const breakdownHTML = breakdown.records.length ? `<div class="mt-2 pt-2 border-t border-blue-200"><span class="block text-gray-500 mb-1">Payment Breakdown</span>${breakdown.records.map(r => `<div class="flex justify-between gap-3 py-0.5"><span class="font-mono font-bold text-gray-700">${escapePayslipHTML(formatEnglishVisaPaymentMonth(r.key))}</span><span class="font-mono font-bold text-green-700">${formatUSD(r.amount)}</span></div>`).join('')}</div>` : '';
            return `<div class="mt-4 border border-blue-200 bg-blue-50 rounded-lg p-3 text-xs"><h4 class="font-bold text-blue-900 border-b border-blue-200 pb-1 mb-1 uppercase tracking-tight">Visa Details</h4><div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-[10px]"><div><span class="block text-gray-500">Visa Total</span><span class="font-mono font-bold text-gray-800">${formatUSD(visa.total)}</span></div><div><span class="block text-gray-500">Visa Date</span><span class="font-mono font-bold text-gray-800">${escapePayslipHTML(visaDate || '-')}</span></div><div><span class="block text-gray-500">Total Payment</span><span class="font-mono font-bold text-green-700">${formatUSD(visa.paid)}</span></div><div><span class="block text-gray-500">Remaining</span><span class="font-mono font-bold text-red-700">${formatUSD(visa.remaining)}</span></div></div>${breakdownHTML}</div>`;
        }

        function getEnglishVisaMessage(emp, state = null) {
            const visa = getEnglishVisaDetails(emp, state);
            if (!visa || visa.total <= 0) return '';
            const breakdown = getEnglishVisaPaymentBreakdown(emp, state, state ? `${editorYear}-${editorMonth}` : null);
            const visaDate = getEnglishVisaDisplayDate(emp, state);
            const breakdownText = breakdown.records.length ? `\nPayment Breakdown:\n${breakdown.records.map(r => `- ${formatEnglishVisaPaymentMonth(r.key)}: ${formatUSD(r.amount)}`).join('\n')}\n` : '';
            return `\n🛂 *VISA DETAILS*\nVisa Total: ${formatUSD(visa.total)}\nVisa Date: ${visaDate || '-'}\nTotal Payment: ${formatUSD(visa.paid)}\nRemaining: ${formatUSD(visa.remaining)}${breakdownText}`;
        }

        function renderPreview() {
            if (!selectedEmployee) return; const dept = selectedEmployee.department;
            document.getElementById('prev-name').innerText = selectedEmployee.name; document.getElementById('prev-pos').innerText = selectedEmployee.position; document.getElementById('prev-dept').innerText = selectedEmployee.department; document.getElementById('prev-date').innerText = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); document.getElementById('prev-id').innerText = generateEmployeeID(selectedEmployee, editorMonth, editorYear); document.getElementById('prev-campus').innerText = selectedEmployee.campus;
            const pe = document.getElementById('prev-profile-pic'); if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
            const container = document.getElementById('preview-content'); if (dept === 'English') { renderEnglishPreview(container); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; let te = 0, td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

            const er = cfg.earnings.map((f, currIndex) => {
                const v = currentPayrollState[f] || 0; const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); const isStart = (isStandardLaoDept && currIndex === 9) || (!isStandardLaoDept && f === LAO_FIELDS.start); const isUSD = (f === 'Basic Pay (USD)'); const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                if (isStandardLaoDept) { if (cfg.earnings.length > 9) { if (currIndex >= 9 && !isUSD && !isRate) te += parseFloat(v); } else if (cfg.earnings.length > 5) { if (currIndex >= 5 && !isUSD && !isRate) te += parseFloat(v); } else { if (!isUSD && !isRate) te += parseFloat(v); } } else { if (!isRate && !isUSD) { te += parseFloat(v); } }
                if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                    let hClass = 'py-1 border-b border-gray-100'; let tClass = 'text-gray-800';
                    if (isBasicResult) { hClass = 'lao-indent bg-green-100 border-green-200'; tClass = 'text-green-900 font-bold'; } else if (isStart) { hClass = 'lao-indent bg-orange-100 border-orange-200'; tClass = 'text-orange-900 font-bold'; } else if ((isStandardLaoDept && (currIndex === 10 || currIndex === 11)) || (!isStandardLaoDept && (f === 'ເງີນສະສົມປີຜ່ານມາ' || f === 'ເພີ້ມປະຈຳປີ 2025-2026'))) { hClass = 'bg-purple-100 border-purple-200'; tClass = 'text-purple-900 font-bold'; }
                    const valStr = isUSD ? formatUSD(v) : (isRate ? parseFloat(v).toLocaleString() : formatMoney(v)); const displayLabel = f === 'ເພີ້ມປະຈຳປີ 2025-2026' ? getAnnualIncreaseDisplayLabel() : f; return `<div class="flex justify-between text-xs transition-all ${hClass}"><span class="${tClass}">${displayLabel}</span><span class="font-mono ${tClass}">${valStr}</span></div>`;
                } return '';
            }).join('');
            
            let extraEarningsHTML = ''; if (currentPayrollState.overtimeAmount > 0) { te += parseFloat(currentPayrollState.overtimeAmount); extraEarningsHTML = `<div class="flex justify-between text-xs transition-all py-1 border-b border-gray-100 bg-yellow-50"><span class="text-gray-800 font-bold">Overtime (OT)</span><span class="font-mono text-gray-800 font-bold">${formatMoney(currentPayrollState.overtimeAmount)}</span></div>`; }
            const dr = cfg.deductions.map(f => { const v = currentPayrollState[f] || 0; td += parseFloat(v); return v > 0 ? `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-medium"><span>${f}</span><span class="font-mono">(${formatMoney(v)})</span></div>` : ''; }).join('');
            let extraDeductionsHTML = ''; if (currentPayrollState.loanDeduction > 0) { td += parseFloat(currentPayrollState.loanDeduction); const desc = currentPayrollState.loanDesc && currentPayrollState.loanDesc.trim() !== "" ? currentPayrollState.loanDesc : "Loan Repayment"; extraDeductionsHTML = `<div class="flex justify-between py-1 border-b text-xs text-red-700 font-bold bg-red-50"><span>${desc}</span><span class="font-mono">(${formatMoney(currentPayrollState.loanDeduction)})</span></div>`; }
            const totalDedRow = `<div class="flex justify-between mt-2 pt-2 bg-red-50 px-2 font-bold text-red-900 border-t border-red-200"><span>TOTAL DEDUCTIONS</span><span>(${formatMoney(td)})</span></div>`;
            const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
            let notesHTML = ''; if (!isGS && dept !== 'English') { notesHTML += `<div class="mt-6 pt-4 border-t-2 border-gray-200"><h4 class="font-bold text-xs text-gray-700 underline mb-2">ໝາຍເຫດ:</h4><ol class="list-decimal list-inside text-[10px] text-gray-600 space-y-1"><li>ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ</li><li>ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ</li><li>ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.</li></ol></div>`; }
            if (currentPayrollState.notes) { const borderClass = notesHTML ? 'mt-2 pt-2 border-t border-gray-100' : 'mt-4 pt-2 border-t-2 border-gray-200'; notesHTML += `<div class="${borderClass} text-[10px]"><p class="font-bold text-gray-700">Additional Notes:</p><p class="whitespace-pre-wrap text-gray-600">${currentPayrollState.notes}</p></div>`; }

            const loanDetailsHTML = renderPayslipLoanSection(selectedEmployee);
            container.innerHTML = `<div class="space-y-4"><div><h3 class="font-bold border-b-2 border-blue-200 text-blue-800 text-xs uppercase tracking-tight">Earnings</h3>${er}${extraEarningsHTML}<div class="flex justify-between mt-2 pt-2 bg-yellow-50 px-2 font-bold text-yellow-900 border-t border-yellow-200"><span>Total Earnings</span><span>${formatMoney(te)}</span></div></div><div><h3 class="font-bold border-b-2 border-red-200 text-red-800 text-xs uppercase tracking-tight">Deductions</h3>${dr}${extraDeductionsHTML}${totalDedRow}</div>${loanDetailsHTML}<div id="net-pay-block" class="bg-blue-900 text-white p-3 rounded flex justify-between items-center font-bold"><span class="text-white">NET PAY (LAK)</span><span class="text-xl font-mono text-white font-bold">${formatMoney(te - td)}</span></div>${notesHTML}</div>`;
        }

        function renderEnglishPreview(container) { 
            const d = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState); const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK; const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; const fLAK = (n) => formatMoney(n); const renderRow = (l, v, isDed, c) => `<div class="flex justify-between py-1 border-b border-gray-100 last:border-0"><span class="${isDed ? 'text-red-700' : 'text-gray-600'}">${l}</span><span class="font-mono ${isDed ? 'text-red-600' : ''}">${c==='USD'?fUSD(v):fLAK(v)}</span></div>`; 
            const loanDesc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment (LAK)"; const loanRow = loanDed > 0 ? renderRow(loanDesc, loanDed, true, 'LAK') : '';

            const loanDetailsHTML = renderPayslipLoanSection(selectedEmployee);
            const visaDetailsHTML = renderEnglishVisaSection(selectedEmployee, d);
            container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs"><div><h4 class="font-bold text-blue-900 border-b-2 border-blue-100 mb-2 pb-1">EARNINGS</h4>${renderRow('Basic Pay ($)', d.basicPay, false, 'USD')}${renderRow('Accumulated ($)', d.accumulated, false, 'USD')}${renderRow(`${getEnglishIncreaseLabel()} Increased ($)`, d.increase, false, 'USD')}${renderRow('Others ($)', d.earningsOthersUSD, false, 'USD')}<h4 class="font-bold text-blue-900 border-b-2 border-blue-100 mt-4 mb-2 pb-1">OVERTIME (USD)</h4><div class="flex justify-between py-1 text-gray-500 italic"><span>Total no. of hours</span><span>${d.otHours}</span></div><div class="flex justify-between py-1 text-gray-500 italic"><span>Rate per hour</span><span>$${d.otRate}</span></div>${renderRow('Payment', otPayment, false, 'USD')}<h4 class="font-bold text-purple-900 border-b-2 border-purple-100 mt-4 mb-2 pb-1">EXTRA WORK (LAK)</h4>${renderRow('IT (LAK)', d.itLAK, false, 'LAK')}${renderRow('Others (LAK)', d.extraWorkOthersLAK, false, 'LAK')}${renderRow('STIPEND (4 levels)', d.stipendLAK, false, 'LAK')}<div class="bg-blue-50 p-2 rounded mt-4"><div class="flex justify-between font-bold text-blue-800"><span>Gross Pay ($)</span><span>${fUSD(grossUSD)}</span></div><div class="flex justify-between text-[10px] text-gray-500 mt-1"><span>Rate USD to LAK</span><span>${formatMoney(d.exchangeRate)}</span></div></div></div><div><h4 class="font-bold text-red-900 border-b-2 border-red-100 mb-2 pb-1">DEDUCTIONS</h4>${renderRow('Professional Tax ($)', d.profTax, true, 'USD')}${renderRow('Absences ($)', d.absences, true, 'USD')}${renderRow('Visa ($)', d.visa, true, 'USD')}${renderRow('Others ($)', d.deductionsOthersUSD, true, 'USD')}<div class="flex justify-between font-bold text-red-700 border-t border-red-200 mt-1 pt-1 mb-4"><span>TOTAL DEDUCTIONS ($)</span><span>(${fUSD(dedUSDSum)})</span></div>${renderRow('Insurance (LAK)', d.insuranceLAK, true, 'LAK')}${renderRow('Others (LAK)', d.deductionsOthersLAK, true, 'LAK')}${loanRow}<div class="flex justify-between font-bold text-red-700 border-t border-red-200 mt-1 pt-1"><span>Deductions (LAK)</span><span>(${fLAK(dedLAK)})</span></div></div></div>${loanDetailsHTML}${visaDetailsHTML}<div class="mt-6 border-t-2 border-gray-800 pt-4 text-xs"><div class="flex justify-between items-center mb-1"><span class="font-bold text-gray-700">Net Pay ($)</span><span class="font-mono font-bold">${fUSD(netUSD)}</span></div><div class="flex justify-between items-center mb-1 text-gray-500"><span>Cash out ${fUSD(d.cashOut)}</span><span>(${fUSD(d.cashOut)})</span></div><div class="flex justify-between items-center mb-1 text-gray-500"><span>$ convertible to LAK</span><span>${fUSD(convertible)}</span></div><div class="payslip-salary-box bg-blue-900 text-white p-4 rounded flex justify-between items-center mt-3 shadow-lg"><span class="font-bold uppercase tracking-wider text-lg text-white">Salary Pay (LAK)</span><span class="font-bold text-2xl font-mono text-white">${fLAK(finalLAK)}</span></div></div>${d.notes ? `<div class="mt-4 pt-2 border-t border-gray-300 text-[10px]"><p class="font-bold">Notes:</p><p class="whitespace-pre-wrap">${d.notes}</p></div>` : ''}${getGlobalPayslipNoteHTML()}`; 
        }

        window.openEnglishVisaHistory = (employeeId) => {
            const emp = employees.find(e => String(e.id) === String(employeeId));
            if (!emp || emp.department !== 'English') return;
            const modal = document.getElementById('english-visa-history-modal');
            const nameEl = document.getElementById('visa-hist-emp-name');
            const dateEl = document.getElementById('visa-hist-visa-date');
            const costEl = document.getElementById('visa-hist-cost');
            const totalEl = document.getElementById('visa-hist-total');
            const remainingEl = document.getElementById('visa-hist-remaining');
            const rows = document.getElementById('visa-hist-rows');
            const total = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
            const records = getEnglishVisaPaymentRecords(emp);
            const paid = Math.min(total, records.reduce((sum, r) => sum + r.amount, 0));
            if (nameEl) nameEl.innerText = emp.name || 'English Staff';
            if (dateEl) dateEl.innerText = emp.visaDate || '-';
            if (costEl) costEl.innerText = formatUSD(total);
            if (totalEl) totalEl.innerText = formatUSD(paid);
            if (remainingEl) remainingEl.innerText = formatUSD(Math.max(0, total - paid));
            if (rows) rows.innerHTML = records.length ? records.map(r => `<div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"><div><p class="font-bold text-blue-900">${escapePayslipHTML(r.key)}</p><p class="text-[10px] text-gray-500">Payment Record</p></div><span class="font-mono font-bold text-green-700">${formatUSD(r.amount)}</span></div>`).join('') : '<p class="text-center text-gray-400 py-8">No Visa payment records.</p>';
            if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
            if (window.lucide) lucide.createIcons();
        };

        window.closeEnglishVisaHistory = () => {
            const modal = document.getElementById('english-visa-history-modal');
            if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        };

        window.viewEmployeeHistory = () => { 
            if (!selectedEmployee) return; document.getElementById('hist-emp-name').innerText = selectedEmployee.name; document.getElementById('hist-emp-dept').innerText = selectedEmployee.department; const rows = document.getElementById('hist-rows'); const historyData = selectedEmployee.payrollHistory || {}; 
            const sortedKeys = Object.keys(historyData).sort((a,b) => { const [yA, mA] = a.split('-'); const [yB, mB] = b.split('-'); if (parseInt(yA) !== parseInt(yB)) return parseInt(yB) - parseInt(yA); return MONTHS.indexOf(mB) - MONTHS.indexOf(mA); });
            let totalHistoryLAK = 0; let totalHistoryUSD = 0; 
            if (sortedKeys.length === 0) { rows.innerHTML = '<p class="text-center text-gray-400 py-8">No history recorded for this staff member.</p>'; } else { rows.innerHTML = sortedKeys.map(key => { const total = calculatePayrollFromState(selectedEmployee, historyData[key]); totalHistoryLAK += total.lak; totalHistoryUSD += total.usd; return `<div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100"><div><p class="font-bold text-blue-900">${key}</p><p class="text-xs text-gray-500">Recorded Period</p></div><div class="text-right"><div class="flex flex-col items-end gap-0.5"><span class="font-mono font-bold text-green-700 text-sm">${formatMoney(total.lak)}</span><span class="font-mono font-bold text-blue-600 text-xs">${formatUSD(total.usd)}</span></div><button onclick="window.applyHistoryEntry('${key}')" class="text-[10px] text-gray-400 underline hover:text-blue-600 mt-1">Load to Editor</button></div></div>`; }).join(''); } 
            document.getElementById('hist-total-lak').innerText = formatMoney(totalHistoryLAK); document.getElementById('hist-total-usd').innerText = formatUSD(totalHistoryUSD);
            const visaHistoryButton = document.getElementById('hist-visa-history-button');
            if (visaHistoryButton) {
                const isEnglish = selectedEmployee.department === 'English';
                visaHistoryButton.classList.toggle('hidden', !isEnglish);
                if (isEnglish) visaHistoryButton.onclick = () => window.openEnglishVisaHistory(selectedEmployee.id);
            }
            const movementEl = document.getElementById('hist-movement-notes');
            if (movementEl) {
                const moves = Array.isArray(selectedEmployee.movementHistory) ? selectedEmployee.movementHistory : [];
                movementEl.innerHTML = moves.length ? moves.map(m => `<div class="p-2 bg-blue-50 border border-blue-100 rounded text-xs"><div class="font-bold text-blue-800">${escapePayslipHTML(m.from || '-')} → ${escapePayslipHTML(m.to || '-')}</div><div class="text-gray-500">${m.date ? new Date(m.date).toLocaleString() : '-'}</div>${m.note ? `<div class="mt-1 text-gray-700 whitespace-pre-wrap">${escapePayslipHTML(m.note)}</div>` : ''}</div>`).join('') : '<p class="text-xs text-gray-400">No movement notes.</p>';
            }
            document.getElementById('employee-history-modal').classList.remove('hidden'); if (window.lucide) lucide.createIcons(); 
        };
        window.applyHistoryEntry = (key) => { if (!selectedEmployee?.payrollHistory?.[key]) return; currentPayrollState = JSON.parse(JSON.stringify(selectedEmployee.payrollHistory[key])); renderEditor(); document.getElementById('employee-history-modal').classList.add('hidden'); };
        window.loadPreviousMonthData = () => { if (!selectedEmployee) return; const currMIdx = MONTHS.indexOf(editorMonth); let prevMIdx = currMIdx - 1; let prevYr = parseInt(editorYear); if (prevMIdx < 0) { prevMIdx = 11; prevYr--; } const prevKey = `${prevYr}-${MONTHS[prevMIdx]}`; if (selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[prevKey]) { if (confirm(`Copy data from ${MONTHS[prevMIdx]} ${prevYr}?`)) { currentPayrollState = JSON.parse(JSON.stringify(selectedEmployee.payrollHistory[prevKey])); window.syncLoanBalances(selectedEmployee); if (currentPayrollState.loanDeduction > 0 && selectedEmployee.activeLoans && selectedEmployee.activeLoans.length > 0) { const loan = selectedEmployee.activeLoans[0]; const balance = parseFloat(loan.total) - parseFloat(loan.paid || 0); if (balance <= 0) { currentPayrollState.loanDeduction = 0; currentPayrollState.loanDesc = ""; } else if (currentPayrollState.loanDeduction > balance) { currentPayrollState.loanDeduction = balance; } if (currentPayrollState.loanDeduction > 0) currentPayrollState.loanDesc = loan.description; } else { currentPayrollState.loanDeduction = 0; currentPayrollState.loanDesc = ""; } renderEditor(); } } else { alert(`No data found for ${MONTHS[prevMIdx]} ${prevYr}`); } };
        window.resetCurrentPayroll = () => { if (!selectedEmployee) return; if (confirm("Reset current editor data to zero?")) { currentPayrollState = createInitialState(selectedEmployee.department); renderEditor(); } };

        // Communication outputs
        window.constructPayslipMessage = () => {
            if (!selectedEmployee) return ""; const dept = selectedEmployee.department; const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; const state = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState); const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear); const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`; const fLAK = (n) => formatMoney(n);
            let msg = `🏫 *NEERADA SCHOOL*\nExcellence in Education\nCampus: ${selectedEmployee.campus || 'N/A'}\n========================\n📄 *PAYSLIP*\nDate: ${dateStr}\n------------------------\n👤 *EMPLOYEE INFO*\nName: ${selectedEmployee.name}\nPosition: ${selectedEmployee.position}\nDepartment: ${selectedEmployee.department}\nEmployee ID: ${empID}\n========================\n\n`;
            if (dept === 'English') {
                const d = state; const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK;
                msg += `💵 *EARNINGS (USD)*\nBasic Pay: ${fUSD(d.basicPay)}\nAccumulated: ${fUSD(d.accumulated)}\nIncreased: ${fUSD(d.increase)}\nOthers: ${fUSD(d.earningsOthersUSD)}\n\n⏱️ *OVERTIME (USD)*\nHours: ${d.otHours} | Rate: $${d.otRate}/hr\nPayment: ${fUSD(otPayment)}\n\n🌟 *EXTRA WORK (LAK)*\nIT: ${fLAK(d.itLAK)}\nOthers: ${fLAK(d.extraWorkOthersLAK)}\nStipend: ${fLAK(d.stipendLAK)}\n\nGross Pay: ${fUSD(grossUSD)}\nRate USD to LAK: ${fLAK(d.exchangeRate)}\n\n📉 *DEDUCTIONS*\nProf. Tax: (${fUSD(d.profTax)})\nAbsences: (${fUSD(d.absences)})\nVisa: (${fUSD(d.visa)})\nOthers: (${fUSD(d.deductionsOthersUSD)})\nTOTAL DEDUCTIONS (USD): (${fUSD(dedUSDSum)})\n\nInsurance (LAK): (${fLAK(d.insuranceLAK)})\nOthers (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(loanDed > 0) { const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment"; msg += `${desc} (LAK): (${fLAK(loanDed)})\n`; }
                msg += `Total Deductions (LAK): (${fLAK(dedLAK)})\n\n========================\nNet Pay (USD): ${fUSD(netUSD)}\nCash out: ${fUSD(d.cashOut)}\nConvertible to LAK: ${fUSD(convertible)}\n💰 *SALARY PAY (LAK): ${fLAK(finalLAK)}*\n========================\n`;
                msg += getPayslipLoanMessage(selectedEmployee);
                if (d.notes) msg += `\n📝 Notes: ${d.notes}\n`;
            } else {
                let te = 0; let td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);
                msg += `💵 *EARNINGS*\n`;
                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0; let shouldInclude = false;
                    if (isStandardLaoDept) { const earnList = cfg.earnings; const startIndex = earnList.indexOf(LAO_FIELDS.start); if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') { if (startIndex !== -1) { if (currIndex >= startIndex) shouldInclude = true; } else { if (f !== LAO_FIELDS.basic) shouldInclude = true; } } } else { if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) shouldInclude = true; }
                    if (shouldInclude) te += parseFloat(v);
                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); const isStart = (isStandardLaoDept && currIndex === 9) || (!isStandardLaoDept && f === LAO_FIELDS.start); const isUSD = (f === 'Basic Pay (USD)'); const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) { const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v)); msg += `- ${f}: ${valStr}\n`; }
                });
                if (state.overtimeAmount > 0) { te += parseFloat(state.overtimeAmount); msg += `- Overtime (OT): ${fLAK(state.overtimeAmount)}\n`; }
                msg += `*Total Earnings: ${fLAK(te)}*\n\n📉 *DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => { const v = state[f] || 0; if (v > 0) { td += parseFloat(v); msg += `- ${f}: (${fLAK(v)})\n`; } });
                if (state.loanDeduction > 0) { td += parseFloat(state.loanDeduction); const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment"; msg += `- ${desc}: (${fLAK(state.loanDeduction)})\n`; }
                msg += `*Total Deductions: (${fLAK(td)})*\n\n========================\n💰 *NET PAY (LAK): ${fLAK(te - td)}*\n========================\n`;
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) { msg += `\nໝາຍເຫດ:\n1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`; }
                if (state.notes) { msg += `\n📝 Additional Notes: ${state.notes}\n`; }
            }
            msg += `\n_Computer-generated. No signature required._\n© ${new Date().getFullYear()} Neerada School Payroll System`;
            return msg;
        };

        window.sendEmail = () => { if (!selectedEmployee) return; const email = selectedEmployee.email || ""; const subject = encodeURIComponent(`Payslip - ${editorMonth} ${editorYear} - ${selectedEmployee.name}`); let plainTextBody = window.constructPayslipMessage().replace(/\*/g, '').replace(/_/g, ''); const body = encodeURIComponent(plainTextBody); window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self'); };
        window.sendWhatsApp = () => { if (!selectedEmployee) return; const phone = selectedEmployee.whatsapp || ""; const text = encodeURIComponent(window.constructPayslipMessage()); window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`, '_blank'); };

        // Core Button Action Overrides ensuring 100% functionality
        window.editCurrentStaff = () => {
            try {
                if(selectedEmployee && selectedEmployee.id) { 
                    window.openStaffModal(selectedEmployee.id); 
                } else { 
                    alert("Please select an employee first from the left panel."); 
                }
            } catch(e) {
                console.error("Error opening edit modal:", e);
                alert("Could not open editor. Error: " + e.message);
            }
        };

        window.saveEmployeePayrollData = async () => {
            if(!selectedEmployee) return;
            const key = `${editorYear}-${editorMonth}`;
            if (!selectedEmployee.payrollHistory) selectedEmployee.payrollHistory = {};
            selectedEmployee.payrollHistory[key] = JSON.parse(JSON.stringify(currentPayrollState));
            window.syncLoanBalances(selectedEmployee); 
            selectedEmployee.lastModified = new Date().toISOString();
            await transact(STORE_EMPLOYEES, 'readwrite', (s) => s.put(selectedEmployee));
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); 
            window.updateDashboardStats(); renderEmployeeList();
            alert(`Saved ${editorMonth} ${editorYear} Data Successfully!`);
        };

        window.openPrintSettings = () => {
            if(!selectedEmployee) return;
            document.getElementById('print-modal').classList.remove('hidden');
            document.getElementById('print-modal').classList.add('flex');
        };

        window.closePrintSettings = () => {
            document.getElementById('print-modal').classList.add('hidden');
            document.getElementById('print-modal').classList.remove('flex');
        };

        window.executePrint = () => {
            const o = document.querySelector('input[name="print-orient"]:checked').value;
            const s = parseFloat(document.getElementById('print-scale').value) / 100;
            let st = document.getElementById('print-dynamic-style');
            if (!st) { st = document.createElement('style'); st.id = 'print-dynamic-style'; document.head.appendChild(st); }
            st.innerHTML = `@media print { @page { size: A4 ${o}; margin: 5mm; } #preview-pane { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; transform: scale(${s}) !important; width: calc(100% / ${s}) !important; transform-origin: top left !important; } }`;
            window.closePrintSettings();
            setTimeout(() => window.print(), 100);
        };

        window.bulkCopyPrevious = async () => {
            const m = document.getElementById('bulk-month').value; const y = document.getElementById('bulk-year').value; if(!m || !y) return;
            const currMIdx = MONTHS.indexOf(m); let prevMIdx = currMIdx - 1; let prevYr = parseInt(y); if (prevMIdx < 0) { prevMIdx = 11; prevYr--; }
            const prevM = MONTHS[prevMIdx];
            if(!confirm(`Copy data from ${prevM} ${prevYr} to ${m} ${y} for ALL employees?\n\nWarning: This will overwrite existing data for ${m} ${y}.`)) return;
            const prevKey = `${prevYr}-${prevM}`; const currKey = `${y}-${m}`; let count = 0; let finishedLoanStaff = []; let cappedLoanStaff = []; let finishedVisaStaff = []; let cappedVisaStaff = [];
            for (const emp of employees) {
                if (emp.payrollHistory && emp.payrollHistory[prevKey]) {
                    if (!emp.payrollHistory) emp.payrollHistory = {};
                    window.syncLoanBalances(emp);
                    const previousState = JSON.parse(JSON.stringify(emp.payrollHistory[prevKey]));
                    const previousLoanDeduction = parseFloat(previousState.loanDeduction || 0) || 0;
                    const previousLoanDesc = String(previousState.loanDesc || '').trim();
                    const copiedState = JSON.parse(JSON.stringify(previousState));
                    let visaCopied = false;
                    if (emp.department === 'English' && previousState.visa > 0) {
                        const visaTotal = Math.max(0, parseFloat(emp.visaTotalCost || 0) || 0);
                        const existingCurrentVisa = emp.payrollHistory && emp.payrollHistory[currKey] ? Math.max(0, parseFloat(emp.payrollHistory[currKey].visa || 0) || 0) : 0;
                        const visaPaidBefore = getEnglishVisaTotalPayment(emp, null, currKey);
                        const visaBalance = Math.max(0, visaTotal - visaPaidBefore);
                        if (visaTotal > 0 && visaBalance <= 0) {
                            copiedState.visa = 0;
                            finishedVisaStaff.push(emp.name);
                        } else if (visaTotal > 0 && previousState.visa > visaBalance) {
                            copiedState.visa = visaBalance;
                            cappedVisaStaff.push(emp.name);
                            visaCopied = visaBalance > 0;
                        } else if (visaTotal > 0) {
                            visaCopied = copiedState.visa > 0;
                        }
                        if (visaCopied) {
                            emp.visaPaidAlready = Math.min(visaTotal, visaPaidBefore + (parseFloat(copiedState.visa || 0) || 0));
                        }
                    }

                    if (previousLoanDeduction > 0) {
                        const activeLoan = (emp.activeLoans || []).find(l => previousLoanDesc && String(l.description || '').trim() === previousLoanDesc) || (emp.activeLoans || [])[0];
                        if (!activeLoan) {
                            copiedState.loanDeduction = 0;
                            copiedState.loanDesc = '';
                            finishedLoanStaff.push(emp.name);
                        } else {
                            const balance = Math.max(0, (parseFloat(activeLoan.total || 0) || 0) - (parseFloat(activeLoan.paid || 0) || 0));
                            if (balance <= 0) {
                                copiedState.loanDeduction = 0;
                                copiedState.loanDesc = '';
                                finishedLoanStaff.push(emp.name);
                            } else if (previousLoanDeduction > balance) {
                                copiedState.loanDeduction = balance;
                                copiedState.loanDesc = activeLoan.description;
                                cappedLoanStaff.push(emp.name);
                            } else {
                                copiedState.loanDesc = activeLoan.description;
                            }
                        }
                    }
                    emp.payrollHistory[currKey] = copiedState;
                    window.syncLoanBalances(emp);
                    emp.lastModified = new Date().toISOString();
                    await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
                    count++;
                }
            }
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
            if (selectedEmployee) {
                const refreshed = employees.find(e => String(e.id) === String(selectedEmployee.id));
                if (refreshed) selectedEmployee = refreshed;
                const bulkMonthEl = document.getElementById('bulk-month');
                const bulkYearEl = document.getElementById('bulk-year');
                if (bulkMonthEl && bulkYearEl) {
                    const selectedKey = `${bulkYearEl.value}-${bulkMonthEl.value}`;
                    editorMonth = bulkMonthEl.value;
                    editorYear = bulkYearEl.value;
                    const selectedPeriod = selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[selectedKey];
                    currentPayrollState = selectedPeriod ? JSON.parse(JSON.stringify(selectedPeriod)) : createInitialState(selectedEmployee.department);
                    recalculatePayrollState(selectedEmployee.department, currentPayrollState);
                    renderEditor();
                    renderPreview();
                } else {
                    loadPeriodData();
                }
            }
            window.updateDashboardStats();
            let resultMessage = `Success! Copied data for ${count} employees.`;
            if (finishedLoanStaff.length > 0) resultMessage += `\n\nLoan finished — deduction NOT carried over for: ${finishedLoanStaff.join(', ')}.`;
            if (cappedLoanStaff.length > 0) resultMessage += `\n\nLoan deduction capped to remaining balance for: ${cappedLoanStaff.join(', ')}.`;
            if (finishedVisaStaff.length > 0) resultMessage += `\n\nVisa already paid in full — visa deduction NOT carried over for: ${finishedVisaStaff.join(', ')}.`;
            if (cappedVisaStaff.length > 0) resultMessage += `\n\nVisa deduction capped to remaining balance for: ${cappedVisaStaff.join(', ')}.`;
            alert(resultMessage);
        };

        window.bulkSaveMonthData = async () => {
            const m = document.getElementById('bulk-month').value; const y = document.getElementById('bulk-year').value; if(!m || !y) return;
            const currKey = `${y}-${m}`;
            if(!confirm(`Save/Generate payroll data for ${m} ${y} for ALL employees?\n\nThis will create records using Department Defaults for any staff who don't have data yet.`)) return;
            let count = 0;
            for (const emp of employees) {
                if (!emp.payrollHistory) emp.payrollHistory = {};
                if (!emp.payrollHistory[currKey]) {
                    emp.payrollHistory[currKey] = createInitialState(emp.department);
                    emp.lastModified = new Date().toISOString();
                    await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
                    count++;
                }
            }
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
            window.updateDashboardStats(); if (selectedEmployee) loadPeriodData();
            alert(`Success! Generated default records for ${count} employees.\n(Employees with existing data were not changed)`);
        };

        window.bulkCopyLoanPayments = async () => {
            const m = document.getElementById('otl-month').value; const y = document.getElementById('otl-year').value; const currKey = `${y}-${m}`;
            const currMIdx = MONTHS.indexOf(m); let prevMIdx = currMIdx - 1; let prevYr = parseInt(y); if (prevMIdx < 0) { prevMIdx = 11; prevYr--; }
            const prevM = MONTHS[prevMIdx]; const prevKey = `${prevYr}-${prevM}`;
            if (!confirm(`Copy loan payments from ${prevM} ${prevYr} to ${m} ${y}?\n\nPayments exceeding remaining balance will be automatically capped.`)) return;
            let updatedCount = 0, skippedCount = 0, cappedCount = 0;
            for (const emp of employees) {
                window.syncLoanBalances(emp);
                if (emp.activeLoans && emp.activeLoans.length > 0) {
                    const loan = emp.activeLoans[0]; 
                    if (emp.payrollHistory && emp.payrollHistory[prevKey]) {
                        const prevPayment = parseFloat(emp.payrollHistory[prevKey].loanDeduction || 0);
                        if (prevPayment > 0) {
                            if (!emp.payrollHistory) emp.payrollHistory = {};
                            if (!emp.payrollHistory[currKey]) emp.payrollHistory[currKey] = createInitialState(emp.department);
                            const currHist = emp.payrollHistory[currKey];
                            if (parseFloat(currHist.loanDeduction || 0) > 0) { skippedCount++; continue; }
                            const balance = parseFloat(loan.total) - parseFloat(loan.paid || 0);
                            if (balance <= 0) continue; // paid off
                            let paymentToApply = prevPayment; if (paymentToApply > balance) { paymentToApply = balance; cappedCount++; }
                            currHist.loanDeduction = paymentToApply; currHist.loanDesc = loan.description;
                            window.syncLoanBalances(emp); emp.lastModified = new Date().toISOString();
                            await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); updatedCount++;
                        }
                    }
                }
            }
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.renderOTLOverview();
            if (selectedOTLStaff) window.selectOTLStaff(selectedOTLStaff.id);
            alert(`Bulk Copy Complete!\n\n- Updated: ${updatedCount} staff\n- Auto-Capped to Balance: ${cappedCount} staff\n- Skipped (Already Paid): ${skippedCount} staff`);
        };

        // Complete remaining boilerplate logic required by the system
        window.openStaffModal = (id) => { 
            document.getElementById('add-form').reset(); document.getElementById('form-id').value = ""; window.clearModalPhoto(); document.getElementById('bank-name-warning').classList.add('hidden'); document.getElementById('form-bank-name').classList.remove('border-red-500');
            if(id) { 
                const emp = employees.find(e => String(e.id) === String(id)); 
                if (emp) { 
                    document.getElementById('modal-title').innerText = "Edit Staff Details"; document.getElementById('form-id').value = emp.id; document.getElementById('form-name').value = emp.name; document.getElementById('form-position').value = emp.position; document.getElementById('form-bank-name').value = emp.bankAccountName || ""; 
                    const targetCampus = emp.campus || (ACADEMIC_DEPTS.includes(emp.department) ? "Sibounheuang" : "General Services"); document.getElementById('form-campus').value = targetCampus; window.filterModalDepts(emp.department); document.getElementById('form-department').value = emp.department; document.getElementById('form-bank-lak').value = emp.bankLak || ""; document.getElementById('form-bank-usd').value = emp.bankUsd || ""; document.getElementById('form-email').value = emp.email || ""; document.getElementById('form-whatsapp').value = emp.whatsapp || ""; document.getElementById('form-status').value = emp.status || "Active"; 
                    if(emp.profilePic) { tempProfilePic = emp.profilePic; const prev = document.getElementById('form-preview-pic'); prev.src = emp.profilePic; prev.classList.remove('hidden'); document.getElementById('form-default-icon').classList.add('hidden'); document.getElementById('delete-modal-photo-btn').classList.remove('hidden'); } 
                } 
            } else { document.getElementById('modal-title').innerText = "Add Staff"; document.getElementById('form-campus').value = "Sibounheuang"; document.getElementById('form-status').value = "Active"; window.filterModalDepts(); } 
            document.getElementById('add-modal').classList.remove('hidden'); document.getElementById('add-modal').classList.add('flex'); window.toggleBankFields(); window.checkBankName(document.getElementById('form-bank-name')); if (window.lucide) lucide.createIcons(); 
        };
        window.checkBankName = (input) => { const warning = document.getElementById('bank-name-warning'); if (input.value.trim() === "") { warning.classList.remove('hidden'); input.classList.add('border-red-500'); } else { warning.classList.add('hidden'); input.classList.remove('border-red-500'); } };
        window.saveEmployee = async (e) => { e.preventDefault(); const fd = new FormData(e.target); const data = Object.fromEntries(fd.entries()); const ex = employees.find(x => x.id === data.id); data.id = data.id || 'EMP_' + Date.now(); data.payrollHistory = ex ? (ex.payrollHistory || {}) : {}; data.profilePic = tempProfilePic; data.lastModified = new Date().toISOString(); if (ex && ex.activeLoans) data.activeLoans = ex.activeLoans; if(ex && ex.archivedLoans) data.archivedLoans = ex.archivedLoans; await transact(STORE_EMPLOYEES, 'readwrite', (s) => s.put(data)); employees = await transact(STORE_EMPLOYEES, 'readonly', (s) => s.getAll()); renderEmployeeList(); renderDeptSidebar(); window.closeModal(); window.updateDashboardStats(); if(selectedEmployee?.id === data.id) { selectedEmployee = data; renderPreview(); } };
        window.closeModal = () => document.getElementById('add-modal').classList.add('hidden');
        window.saveLoanPayment = async () => { 
            const m = document.getElementById('otl-month').value; const y = document.getElementById('otl-year').value; const key = `${y}-${m}`; const rawVal = document.getElementById('loan-repay-amount').value.replace(/,/g, ''); const newPayment = parseFloat(rawVal) || 0; 
            const freshStaff = await transact(STORE_EMPLOYEES, 'readonly', s => s.get(selectedOTLStaff.id));
            if(freshStaff) { selectedOTLStaff = freshStaff; if (!selectedOTLStaff.payrollHistory) selectedOTLStaff.payrollHistory = {}; if (!selectedOTLStaff.payrollHistory[key]) selectedOTLStaff.payrollHistory[key] = createInitialState(selectedOTLStaff.department); if (!selectedOTLStaff.activeLoans) selectedOTLStaff.activeLoans = []; }
            const ph = selectedOTLStaff.payrollHistory[key]; ph.loanDeduction = newPayment; if (selectedOTLStaff.activeLoans.length > 0) ph.loanDesc = selectedOTLStaff.activeLoans[0].description;
            window.syncLoanBalances(selectedOTLStaff); selectedOTLStaff.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff)); 
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); alert("Loan Deduction applied. Payslip updated. Balances adjusted."); renderLoanTable(); if (selectedEmployee && selectedEmployee.id === selectedOTLStaff.id) loadPeriodData(); window.renderOTLOverview(); 
        };
        window.toggleBankFields = () => { const dept = document.getElementById('form-department').value; const usdField = document.getElementById('bank-usd-container'); const visaDetails = document.getElementById('english-visa-details'); if (dept === 'English' || dept.includes('Accounts')) { usdField.classList.remove('hidden'); } else { usdField.classList.add('hidden'); } if (visaDetails) { visaDetails.classList.toggle('hidden', dept !== 'English'); if (dept === 'English') window.updateVisaRemainingDisplay(); } };
        window.updateVisaRemainingDisplay = () => { const total = Math.max(0, parseFloat(document.getElementById('form-visa-total')?.value || 0) || 0); const paid = Math.max(0, parseFloat(document.getElementById('form-visa-paid')?.value || 0) || 0); const remaining = Math.max(0, total - Math.min(total, paid)); const el = document.getElementById('form-visa-remaining'); if (el) el.innerText = formatUSD(remaining); };
        window.updateEnglishVisaDetails = async (field, value) => {
            if (!selectedEmployee || selectedEmployee.department !== 'English') return;
            const emp = employees.find(x => String(x.id) === String(selectedEmployee.id));
            if (!emp) return;
            if (field === 'visaDate') emp.visaDate = value || '';
            else if (field === 'visaTotalCost') emp.visaTotalCost = Math.max(0, parseFloat(String(value).replace(/,/g, '')) || 0);
            emp.lastModified = new Date().toISOString();
            await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
            selectedEmployee = employees.find(x => String(x.id) === String(selectedEmployee.id)) || emp;
            renderEditor();
        };

        window.resetEnglishVisaData = async () => {
            if (!selectedEmployee || selectedEmployee.department !== 'English') return;
            if (!confirm(`Reset Visa Details for ${selectedEmployee.name}? This will clear Visa Cost and Visa Date. Visa payments already recorded in payroll deductions will not be deleted.`)) return;
            const emp = employees.find(x => String(x.id) === String(selectedEmployee.id));
            if (!emp) return;
            emp.visaTotalCost = 0;
            emp.visaDate = '';
            emp.visaPaidAlready = 0;
            emp.lastModified = new Date().toISOString();
            await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp));
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
            selectedEmployee = employees.find(x => String(x.id) === String(selectedEmployee.id)) || emp;
            renderEditor();
        };
        window.bulkSavePayroll = () => window.openSaveHistoryModal();
        window.goBack = () => { selectedEmployee = null; localStorage.removeItem('neerada_selected_staff'); document.getElementById('editor-area').classList.add('hidden'); document.getElementById('empty-state').classList.remove('hidden'); };
        window.openSettings = () => { document.getElementById('settings-modal').classList.remove('hidden'); document.getElementById('settings-modal').classList.add('flex'); const savedTheme = localStorage.getItem('neerada_theme') || 'default'; const themeSelect = document.getElementById('theme-select'); if (themeSelect) themeSelect.value = savedTheme; if (window.lucide) lucide.createIcons(); };
        window.closeSettings = () => { document.getElementById('settings-modal').classList.add('hidden'); document.getElementById('settings-modal').classList.remove('flex'); };
        
        window.switchView = (v) => { localStorage.setItem('neerada_active_tab', v); ['dashboard', 'payroll', 'config', 'ot-loans'].forEach(i => { const el = document.getElementById('view-'+i); const tab = document.getElementById('tab-'+i); if(el) el.classList.add('hidden'); if(tab) tab.className = "px-4 py-1.5 text-sm font-medium rounded-md text-blue-100 hover:bg-blue-800 transition-colors"; }); const av = document.getElementById('view-'+v); const at = document.getElementById('tab-'+v); if(av) av.classList.remove('hidden'); if(at) at.className = "px-4 py-1.5 text-sm font-medium rounded-md bg-blue-800 text-white transition-colors"; if (v === 'config') window.loadDeptConfig(); if (v === 'dashboard') window.updateDashboardStats(); if (v === 'ot-loans') window.refreshOTLoansView(); };
        window.refreshOTLoansView = () => { const list = document.getElementById('otl-staff-list'); list.innerHTML = employees.map(emp => `<div onclick="window.selectOTLStaff('${emp.id}')" class="p-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 text-xs flex justify-between items-center ${selectedOTLStaff?.id === emp.id ? 'bg-blue-100' : ''}"><span class="font-bold text-gray-700">${emp.name}</span><span class="text-gray-400 text-[10px]">${emp.department}</span></div>`).join(''); window.renderOTLOverview(); if (selectedOTLStaff) window.selectOTLStaff(selectedOTLStaff.id); };
        window.renderOTLOverview = () => { const m = document.getElementById('otl-month').value; const y = document.getElementById('otl-year').value; const key = `${y}-${m}`; document.getElementById('otl-report-period').innerText = `${m} ${y}`; const loanTable = document.getElementById('otl-report-loans'); let loanRows = ''; let hasLoans = false; let activeLoanCount = 0; const sortedEmployees = [...employees].sort((a, b) => a.name.trim().localeCompare(b.name.trim())); sortedEmployees.forEach(emp => { window.syncLoanBalances(emp); if (emp.activeLoans && emp.activeLoans.length > 0) { let staffHasActive = false; let totalLoan = 0; let totalPaid = 0; let paymentThisMonth = (emp.payrollHistory && emp.payrollHistory[key]) ? (emp.payrollHistory[key].loanDeduction || 0) : 0; let payCount = 0; const descriptions = emp.activeLoans.map(l => { const bal = parseFloat(l.total) - parseFloat(l.paid || 0); if(bal > 0) { staffHasActive = true; totalLoan += parseFloat(l.total); totalPaid += parseFloat(l.paid || 0); payCount += (l.paymentCount || 0); return l.description; } return null; }).filter(Boolean).join(', '); const dates = emp.activeLoans.map(l => (parseFloat(l.total)-parseFloat(l.paid||0))>0 ? (l.dateAdded || '-') : null).filter(Boolean).join(', '); const starts = emp.activeLoans.map(l => (parseFloat(l.total)-parseFloat(l.paid||0))>0 ? (l.startDate || '-') : null).filter(Boolean).join(', '); let balance = totalLoan - totalPaid; if(staffHasActive) { hasLoans = true; activeLoanCount++; loanRows += `<tr class="hover:bg-gray-50 border-b border-gray-50"><td class="px-4 py-3 font-medium text-gray-800"><button onclick="window.showOTLHistory('${emp.id}')" class="hover:text-blue-600 hover:underline flex items-center gap-1">${emp.name} <i data-lucide="external-link" class="w-3 h-3 text-gray-400"></i></button></td><td class="px-4 py-3 text-gray-600 text-xs">${descriptions}</td><td class="px-4 py-3 text-center text-xs text-gray-500">${dates}</td><td class="px-4 py-3 text-center text-xs text-gray-500">${starts}</td><td class="px-4 py-3 text-right font-mono">${formatMoney(totalLoan)}</td><td class="px-4 py-3 text-right font-mono text-green-600">${formatMoney(totalPaid)}</td><td class="px-4 py-3 text-center font-bold text-gray-700">${payCount}</td><td class="px-4 py-3 text-right font-mono text-blue-600">${formatMoney(paymentThisMonth)}</td><td class="px-4 py-3 text-right font-mono font-bold text-red-600">${formatMoney(balance)}</td></tr>`; } } }); loanTable.innerHTML = hasLoans ? loanRows : `<tr><td colspan="9" class="p-4 text-center text-gray-400">No active loans found.</td></tr>`; document.getElementById('active-loans-header').innerHTML = `<i data-lucide="credit-card" class="w-4 h-4"></i> Active Loan Records (${activeLoanCount} Staff)`; const otTable = document.getElementById('otl-report-ot'); let otRows = ''; let hasOT = false; sortedEmployees.forEach(emp => { if (emp.payrollHistory && emp.payrollHistory[key]) { const pd = emp.payrollHistory[key]; const isEnglish = emp.department === 'English'; let otAmt = isEnglish ? ((parseFloat(pd.otHours)||0) * (parseFloat(pd.otRate)||0)) : (parseFloat(pd.overtimeAmount)||0); if (otAmt > 0) { hasOT = true; otRows += `<tr class="hover:bg-gray-50 border-b border-gray-50"><td class="px-4 py-3 font-medium text-gray-800"><button onclick="window.showOTLHistory('${emp.id}')" class="hover:text-blue-600 hover:underline flex items-center gap-1">${emp.name} <i data-lucide="external-link" class="w-3 h-3 text-gray-400"></i></button></td><td class="px-4 py-3 text-gray-500 text-xs">${emp.department}</td><td class="px-4 py-3 text-right font-mono">${isEnglish ? pd.otHours + ' hrs' : '-'}</td><td class="px-4 py-3 text-right font-mono">${isEnglish ? '$'+pd.otRate : '-'}</td><td class="px-4 py-3 text-right font-mono font-bold text-blue-700">${isEnglish ? formatUSD(otAmt) : formatMoney(otAmt)}</td></tr>`; } } }); otTable.innerHTML = hasOT ? otRows : `<tr><td colspan="5" class="p-4 text-center text-gray-400">No overtime records for ${m} ${y}.</td></tr>`; if (window.lucide) lucide.createIcons(); };
        window.showOTLHistory = (id) => { const emp = employees.find(e => e.id === id); if (!emp) return; currentHistoryId = id; document.getElementById('otl-hist-name').innerText = emp.name; const activeBody = document.getElementById('otl-hist-active-loans'); if (emp.activeLoans && emp.activeLoans.length > 0) { activeBody.innerHTML = emp.activeLoans.map((l, idx) => `<tr><td class="px-3 py-2 text-gray-800 font-medium text-xs">${l.description}</td><td class="px-3 py-2 text-center text-xs text-gray-500">${l.dateAdded || '-'}</td><td class="px-3 py-2 text-right font-mono text-xs">${formatMoney(l.total)}</td><td class="px-3 py-2 text-right font-mono text-xs text-green-600">${formatMoney(l.paid || 0)}</td><td class="px-3 py-2 text-right font-mono text-xs font-bold text-red-600">${formatMoney(l.total - (l.paid || 0))}</td><td class="px-3 py-2 text-center flex justify-center gap-1"><button onclick="window.deleteLoanFromHistory(${idx}, 'active')" class="text-red-400 hover:text-red-600 p-1" title="Delete Loan"><i data-lucide="trash-2" class="w-3 h-3"></i></button></td></tr>`).join(''); } else { activeBody.innerHTML = `<tr><td colspan="6" class="p-3 text-center text-gray-400 text-xs">No active loans.</td></tr>`; } const archivedBody = document.getElementById('otl-hist-archived-loans'); if (emp.archivedLoans && emp.archivedLoans.length > 0) { archivedBody.innerHTML = emp.archivedLoans.map((l, idx) => `<tr><td class="px-3 py-2 font-medium text-xs">${l.description}</td><td class="px-3 py-2 text-center text-xs text-gray-500">${l.dateAdded || '-'}</td><td class="px-3 py-2 text-right font-mono text-xs">${formatMoney(l.total)}</td><td class="px-3 py-2 text-center flex justify-center gap-1"><button onclick="window.restoreArchivedLoan(${idx})" class="text-green-500 hover:text-green-700 p-1" title="Restore to Active"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button><button onclick="window.deleteLoanFromHistory(${idx}, 'archived')" class="text-red-400 hover:text-red-600 p-1" title="Delete Permanently"><i data-lucide="trash-2" class="w-3 h-3"></i></button></td></tr>`).join(''); } else { archivedBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-gray-400 text-xs">No archived loans.</td></tr>`; } const histData = emp.payrollHistory || {}; const periods = Object.keys(histData).sort((a,b) => { const [yA, mA] = a.split('-'); const [yB, mB] = b.split('-'); if (yA !== yB) return parseInt(yB) - parseInt(yA); return MONTHS.indexOf(mB) - MONTHS.indexOf(mA); }); const loanHistBody = document.getElementById('otl-hist-payments'); let loanHistRows = ''; let hasLoanHist = false; let totalLoanPayments = 0; const otHistBody = document.getElementById('otl-hist-ot'); let otHistRows = ''; let hasOtHist = false; periods.forEach(key => { const data = histData[key]; const paid = parseFloat(data.loanDeduction || 0); if (paid > 0) { hasLoanHist = true; totalLoanPayments += paid; loanHistRows += `<tr class="border-b border-gray-50 last:border-0"><td class="px-3 py-2 font-medium text-gray-700 text-xs">${key}</td><td class="px-3 py-2 text-right font-mono font-bold text-green-700 text-xs">${formatMoney(paid)}</td><td class="px-3 py-2 text-center flex justify-center gap-1"><button onclick="window.editHistoryPayment('${key}', ${paid})" class="text-blue-500 hover:text-blue-700 p-1" title="Edit Payment"><i data-lucide="edit-2" class="w-3 h-3"></i></button><button onclick="window.deleteHistoryPayment('${key}', ${paid})" class="text-red-400 hover:text-red-600 p-1" title="Delete Payment"><i data-lucide="trash-2" class="w-3 h-3"></i></button></td></tr>`; } const isEnglish = emp.department === 'English'; let otVal = 0; let details = ''; if (isEnglish) { const hrs = parseFloat(data.otHours || 0); const rate = parseFloat(data.otRate || 0); if (hrs > 0) { otVal = hrs * rate; details = `${hrs} hrs @ $${rate}`; } } else { otVal = parseFloat(data.overtimeAmount || 0); details = 'Flat Amount'; } if (otVal > 0) { hasOtHist = true; otHistRows += `<tr class="border-b border-gray-50 last:border-0"><td class="px-3 py-2 font-medium text-gray-700 text-xs">${key}</td><td class="px-3 py-2 text-right text-xs text-gray-500">${details}</td><td class="px-3 py-2 text-right font-mono font-bold text-blue-700 text-xs">${isEnglish ? formatUSD(otVal) : formatMoney(otVal)}</td></tr>`; } }); if (hasLoanHist) { loanHistRows += `<tr class="border-t border-gray-200 bg-green-50"><td class="px-3 py-2 font-bold text-gray-800 text-xs text-right">TOTAL PAID</td><td class="px-3 py-2 text-right font-mono font-bold text-green-800 text-xs">${formatMoney(totalLoanPayments)}</td><td class="px-3 py-2"></td></tr>`; } loanHistBody.innerHTML = hasLoanHist ? loanHistRows : `<tr><td colspan="3" class="p-3 text-center text-gray-400 text-xs">No payment records found.</td></tr>`; otHistBody.innerHTML = hasOtHist ? otHistRows : `<tr><td colspan="3" class="p-3 text-center text-gray-400 text-xs">No overtime records found.</td></tr>`; document.getElementById('otl-history-modal').classList.remove('hidden'); if (window.lucide) lucide.createIcons(); };
        window.deleteLoanFromHistory = async (idx, type) => { const emp = employees.find(e => e.id === currentHistoryId); if (!emp) return; if (!confirm(`Are you sure you want to delete this ${type} loan permanently?`)) return; if (type === 'active') { emp.activeLoans.splice(idx, 1); } else { emp.archivedLoans.splice(idx, 1); } emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.showOTLHistory(currentHistoryId); if(selectedOTLStaff && selectedOTLStaff.id === currentHistoryId) { selectedOTLStaff = emp; renderLoanTable(); window.renderOTLOverview(); } };
        window.restoreArchivedLoan = async (idx) => { const emp = employees.find(e => e.id === currentHistoryId); if (!emp) return; if(!confirm("Restore this loan to Active status?")) return; const loan = emp.archivedLoans[idx]; if(!emp.activeLoans) emp.activeLoans = []; emp.activeLoans.push(loan); emp.archivedLoans.splice(idx, 1); emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.showOTLHistory(currentHistoryId); };
        window.editHistoryPayment = async (key, oldVal) => { const emp = employees.find(e => e.id === currentHistoryId); if (!emp || !emp.payrollHistory[key]) return; const newValStr = prompt(`Edit Loan Payment for ${key}.\nCurrent Amount: ${oldVal}\nEnter new amount (LAK):`, oldVal); if(newValStr === null) return; const newVal = parseFloat(newValStr.replace(/,/g, '')) || 0; if(isNaN(newVal)) return alert("Invalid amount."); emp.payrollHistory[key].loanDeduction = newVal; window.syncLoanBalances(emp); emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.showOTLHistory(currentHistoryId); if(selectedOTLStaff && selectedOTLStaff.id === currentHistoryId) { selectedOTLStaff = emp; renderLoanTable(); window.renderOTLOverview(); } };
        window.deleteHistoryPayment = async (key, oldVal) => { const emp = employees.find(e => e.id === currentHistoryId); if (!emp || !emp.payrollHistory[key]) return; if(!confirm(`Delete payment record for ${key} of amount ${formatMoney(oldVal)}?`)) return; emp.payrollHistory[key].loanDeduction = 0; window.syncLoanBalances(emp); emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.showOTLHistory(currentHistoryId); if(selectedOTLStaff && selectedOTLStaff.id === currentHistoryId) { selectedOTLStaff = emp; renderLoanTable(); window.renderOTLOverview(); } };
        window.goToManageFromHistory = () => { if(currentHistoryId) { window.selectOTLStaff(currentHistoryId); document.getElementById('otl-history-modal').classList.add('hidden'); } };
        window.filterOTLStaff = () => { const q = document.getElementById('otl-search').value.toLowerCase(); const list = document.getElementById('otl-staff-list'); list.innerHTML = employees.filter(e => e.name.toLowerCase().includes(q)).map(emp => `<div onclick="window.selectOTLStaff('${emp.id}')" class="p-2 cursor-pointer hover:bg-blue-50 border-b border-gray-100 text-xs flex justify-between items-center ${selectedOTLStaff?.id === emp.id ? 'bg-blue-100' : ''}"><span class="font-bold text-gray-700">${emp.name}</span><span class="text-gray-400 text-[10px]">${emp.department}</span></div>`).join(''); };
        window.selectOTLStaff = (id) => { editingLoanIndex = -1; document.getElementById('btn-cancel-loan').classList.add('hidden'); document.getElementById('loan-form-title').innerText = "Add New Loan"; document.getElementById('btn-save-loan').innerText = "Add Loan"; document.getElementById('new-loan-desc').value = ""; document.getElementById('new-loan-amount').value = ""; document.getElementById('new-loan-date').value = ""; document.getElementById('new-loan-start').value = ""; selectedOTLStaff = employees.find(e => e.id === id); document.getElementById('otl-overview').classList.add('hidden'); document.getElementById('otl-empty-state').classList.add('hidden'); document.getElementById('ot-management-card').classList.remove('hidden'); document.getElementById('loan-management-card').classList.remove('hidden'); document.getElementById('otl-selected-name').innerText = selectedOTLStaff.name; if (!selectedOTLStaff.activeLoans) selectedOTLStaff.activeLoans = []; if (selectedOTLStaff.activeLoans.length > 0) window.showOTLHistory(id); const m = document.getElementById('otl-month').value; const y = document.getElementById('otl-year').value; const key = `${y}-${m}`; if (!selectedOTLStaff.payrollHistory) selectedOTLStaff.payrollHistory = {}; if (!selectedOTLStaff.payrollHistory[key]) selectedOTLStaff.payrollHistory[key] = createInitialState(selectedOTLStaff.department); const payData = selectedOTLStaff.payrollHistory[key]; const otContainer = document.getElementById('ot-inputs-container'); if (selectedOTLStaff.department === 'English') { otContainer.innerHTML = `<div><label class="block text-xs font-bold text-gray-500 mb-1">OT Hours</label><input type="number" id="otl-hours" class="w-full border rounded p-2 text-sm" value="${payData.otHours || 0}"></div><div><label class="block text-xs font-bold text-gray-500 mb-1">OT Rate ($)</label><input type="number" id="otl-rate" class="w-full border rounded p-2 text-sm" value="${payData.otRate || 0}"></div>`; } else { otContainer.innerHTML = `<div class="md:col-span-2"><label class="block text-xs font-bold text-gray-500 mb-1">Total Overtime Amount (LAK)</label><input type="number" id="otl-amount" class="w-full border rounded p-2 text-sm font-bold text-blue-700 bg-blue-50" value="${payData.overtimeAmount || 0}"></div>`; } renderLoanTable(); document.getElementById('otl-repay-month').innerText = `${m} ${y}`; let currentDed = payData.loanDeduction || 0; let currentDedStr = currentDed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); document.getElementById('loan-repay-amount').value = currentDed > 0 ? currentDedStr : ""; };
        window.closeOTLEditor = () => { selectedOTLStaff = null; document.getElementById('otl-overview').classList.remove('hidden'); document.getElementById('ot-management-card').classList.add('hidden'); document.getElementById('loan-management-card').classList.add('hidden'); document.getElementById('otl-empty-state').classList.add('hidden'); window.refreshOTLoansView(); };
        function renderLoanTable() { const list = document.getElementById('otl-loans-list'); window.syncLoanBalances(selectedOTLStaff); if (selectedOTLStaff.activeLoans.length === 0) { list.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 text-xs">No active loans</td></tr>`; return; } list.innerHTML = selectedOTLStaff.activeLoans.map((l, idx) => { const bal = parseFloat(l.total) - parseFloat(l.paid || 0); const isPaidOff = bal <= 0; return `<tr class="hover:bg-gray-50 ${isPaidOff ? 'bg-green-50 opacity-75' : ''}"><td class="px-3 py-2 font-medium">${l.description}</td><td class="px-3 py-2 text-center text-xs text-gray-500">${l.dateAdded || '-'}</td><td class="px-3 py-2 text-center text-xs text-gray-500">${l.startDate || '-'}</td><td class="px-3 py-2 text-right font-mono">${formatMoney(l.total)}</td><td class="px-3 py-2 text-right font-mono text-green-600">${formatMoney(l.paid || 0)}</td><td class="px-3 py-2 text-center font-bold text-gray-700">${l.paymentCount || 0}</td><td class="px-3 py-2 text-right font-mono font-bold ${isPaidOff ? 'text-green-600' : 'text-red-600'}">${formatMoney(bal)}</td><td class="px-3 py-2 text-center flex gap-1 justify-center">${isPaidOff ? `<button onclick="window.archiveLoan(${idx})" class="text-gray-500 hover:text-gray-800" title="Archive (Remove from Active)"><i data-lucide="folder-check" class="w-3.5 h-3.5"></i></button>` : `<button onclick="window.editLoan(${idx})" class="text-blue-400 hover:text-blue-600"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>`}<button onclick="window.removeLoan(${idx})" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td></tr>`; }).join(''); if(window.lucide) lucide.createIcons(); }
        window.editLoan = (idx) => { const loan = selectedOTLStaff.activeLoans[idx]; document.getElementById('new-loan-desc').value = loan.description; document.getElementById('new-loan-amount').value = loan.total; document.getElementById('new-loan-date').value = loan.dateAdded; document.getElementById('new-loan-start').value = loan.startDate; editingLoanIndex = idx; document.getElementById('loan-form-title').innerText = "Edit Loan Details"; document.getElementById('btn-save-loan').innerText = "Update Loan"; document.getElementById('btn-cancel-loan').classList.remove('hidden'); };
        window.cancelLoanEdit = () => { editingLoanIndex = -1; document.getElementById('new-loan-desc').value = ""; document.getElementById('new-loan-amount').value = ""; document.getElementById('new-loan-date').value = ""; document.getElementById('new-loan-start').value = ""; document.getElementById('loan-form-title').innerText = "Add New Loan"; document.getElementById('btn-save-loan').innerText = "Add Loan"; document.getElementById('btn-cancel-loan').classList.add('hidden'); }
        window.saveLoanRecord = async () => { const desc = document.getElementById('new-loan-desc').value; const amt = parseFloat(document.getElementById('new-loan-amount').value); const dateAdded = document.getElementById('new-loan-date').value; const startDate = document.getElementById('new-loan-start').value; if (!desc || !amt || !dateAdded || !startDate) return alert("Please fill all loan fields."); const loanData = { description: desc, total: amt, dateAdded: dateAdded, startDate: startDate, paid: (editingLoanIndex > -1) ? selectedOTLStaff.activeLoans[editingLoanIndex].paid : 0, paymentCount: (editingLoanIndex > -1) ? selectedOTLStaff.activeLoans[editingLoanIndex].paymentCount : 0 }; if(editingLoanIndex > -1) { selectedOTLStaff.activeLoans[editingLoanIndex] = loanData; } else { selectedOTLStaff.activeLoans.push(loanData); } selectedOTLStaff.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff)); renderLoanTable(); window.cancelLoanEdit(); window.renderOTLOverview(); };
        window.addLoan = () => window.saveLoanRecord();
        window.printLoanStatement = () => { if(!selectedOTLStaff) return; const loans = selectedOTLStaff.activeLoans || []; const printW = window.open('', '', 'height=600,width=800'); printW.document.write('<html><head><title>Loan Statement</title><link href="https://cdn.tailwindcss.com" rel="stylesheet"></head><body class="bg-white p-8 font-sans">'); printW.document.write(`<div class="max-w-3xl mx-auto border p-8"><div class="text-center border-b pb-4 mb-6"><h1 class="text-2xl font-bold uppercase text-gray-800">Neerada School</h1><p class="text-sm text-gray-500">Loan Statement</p></div><div class="flex justify-between mb-6"><div><p class="text-xs text-gray-500 uppercase">Employee Name</p><p class="font-bold text-lg">${selectedOTLStaff.name}</p></div><div class="text-right"><p class="text-xs text-gray-500 uppercase">Date</p><p class="font-bold">${new Date().toLocaleDateString()}</p></div></div><h3 class="font-bold text-gray-700 mb-2 border-b pb-1">Active Loans</h3><table class="w-full text-sm mb-8 border-collapse border border-gray-200"><thead class="bg-gray-50"><tr><th class="border p-2 text-left">Description</th><th class="border p-2 text-center">Date Added</th><th class="border p-2 text-right">Total Amount</th><th class="border p-2 text-right">Paid</th><th class="border p-2 text-right">Balance</th></tr></thead><tbody>${loans.map(l => `<tr><td class="border p-2">${l.description}</td><td class="border p-2 text-center">${l.dateAdded}</td><td class="border p-2 text-right">${formatMoney(l.total)}</td><td class="border p-2 text-right">${formatMoney(l.paid||0)}</td><td class="border p-2 text-right font-bold">${formatMoney(l.total - (l.paid||0))}</td></tr>`).join('') || '<tr><td colspan="5" class="border p-4 text-center">No active loans</td></tr>'}</tbody></table><div class="mt-8 text-xs text-gray-400 text-center">Generated by Neerada Payroll System</div></div>`); printW.document.write('</body></html>'); printW.document.close(); setTimeout(() => { printW.focus(); printW.print(); }, 500); };
        window.removeLoan = async (idx) => { if (!confirm("Delete this loan record?")) return; selectedOTLStaff.activeLoans.splice(idx, 1); selectedOTLStaff.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff)); renderLoanTable(); };
        window.archiveLoan = async (idx) => { if (!confirm("Archive this completed loan? It will be removed from the active list.")) return; const loan = selectedOTLStaff.activeLoans[idx]; selectedOTLStaff.archivedLoans = selectedOTLStaff.archivedLoans || []; selectedOTLStaff.archivedLoans.push(loan); selectedOTLStaff.activeLoans.splice(idx, 1); selectedOTLStaff.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff)); renderLoanTable(); window.renderOTLOverview(); };
        window.saveOTDetails = async () => { const m = document.getElementById('otl-month').value; const y = document.getElementById('otl-year').value; const key = `${y}-${m}`; if (!selectedOTLStaff.payrollHistory) selectedOTLStaff.payrollHistory = {}; if (!selectedOTLStaff.payrollHistory[key]) selectedOTLStaff.payrollHistory[key] = createInitialState(selectedOTLStaff.department); const pd = selectedOTLStaff.payrollHistory[key]; if (selectedOTLStaff.department === 'English') { pd.otHours = parseFloat(document.getElementById('otl-hours').value) || 0; pd.otRate = parseFloat(document.getElementById('otl-rate').value) || 0; } else { pd.overtimeAmount = parseFloat(document.getElementById('otl-amount').value) || 0; } selectedOTLStaff.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(selectedOTLStaff)); alert("Overtime updated for " + m + " " + y); if (selectedEmployee && selectedEmployee.id === selectedOTLStaff.id) loadPeriodData(); window.renderOTLOverview(); };
        
        // Settings and Config logic
        window.loadDeptConfig = () => { const select = document.getElementById('config-dept-select'); const currentDepts = getOrderedDepartments(); if (select && select.options.length === 0) select.innerHTML = currentDepts.map(d => `<option value="${d}">${d}</option>`).join(''); const dept = select.value; const cfg = departmentConfigs[dept]; if(!cfg) return; const ri = (type, list) => list.map((f, i) => `<div class="flex gap-2 mb-2 items-center"><input type="text" value="${f}" onchange="window.updateConfigFieldName('${dept}', '${type}', ${i}, this.value, this.getAttribute('data-old'))" data-old="${f}" class="flex-1 p-2 border rounded text-sm"><button onclick="window.removeConfigField('${dept}', '${type}', ${i})" class="text-red-400 p-1 hover:bg-red-50 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>`).join(''); document.getElementById('config-editor-area').innerHTML = `<div class="p-6 bg-blue-50 rounded-xl border border-blue-100"><div class="flex justify-between items-center mb-4"><h4 class="font-bold text-blue-800 uppercase text-xs">Earnings</h4><button onclick="window.addConfigField('${dept}', 'earnings')" class="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold hover:bg-blue-700">+ Add</button></div><div id="cfg-earn-list">${ri('earnings', cfg.earnings)}</div></div><div class="p-6 bg-red-50 rounded-xl border border-red-100"><div class="flex justify-between items-center mb-4"><h4 class="font-bold text-red-800 uppercase text-xs">Deductions</h4><button onclick="window.addConfigField('${dept}', 'deductions')" class="text-[10px] bg-green-600 text-white px-2 py-1 rounded font-bold">+ Add</button></div><div id="cfg-ded-list">${ri('deductions', cfg.deductions)}</div></div>`; const bulkSelect = document.getElementById('download-other-dept'); if (bulkSelect) { const bulkOptions = currentDepts.filter(d => d !== 'English' && d !== 'Kindergarten' && d !== 'Primary' && d !== 'Secondary'); bulkSelect.innerHTML = '<option value="">Download Other Dept...</option>' + bulkOptions.map(d => `<option value="${d}">${d}</option>`).join(''); } if (window.lucide) lucide.createIcons(); };
        window.updateConfigFieldName = async (dept, type, idx, newVal, oldVal) => { if (newVal === oldVal) return; departmentConfigs[dept][type][idx] = newVal; await transact(STORE_CONFIG, 'readwrite', s => s.put(departmentConfigs[dept])); let updatedCount = 0; for (let emp of employees) { if (emp.department === dept && emp.payrollHistory) { let changed = false; for (let key in emp.payrollHistory) { if (emp.payrollHistory[key][oldVal] !== undefined) { emp.payrollHistory[key][newVal] = emp.payrollHistory[key][oldVal]; delete emp.payrollHistory[key][oldVal]; changed = true; } } if (changed) { emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); updatedCount++; } } } if (updatedCount > 0) { employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); if (selectedEmployee && selectedEmployee.department === dept) loadPeriodData(); } window.loadDeptConfig(); }; 
        window.addConfigField = (dept, type) => { departmentConfigs[dept][type].push("New Field"); window.loadDeptConfig(); }; window.removeConfigField = (dept, type, idx) => { departmentConfigs[dept][type].splice(idx, 1); window.loadDeptConfig(); }; window.saveDeptConfig = async () => { for (const d in departmentConfigs) await transact(STORE_CONFIG, 'readwrite', s => s.put(departmentConfigs[d])); alert("Saved!"); if (selectedEmployee) loadPeriodData(); renderDeptSidebar(); };
        window.addNewDept = async () => window.addDepartment();
        window.addDepartment = async () => { const name = prompt("Enter new Department name:"); if (!name || name.trim() === "") return; if (departmentConfigs[name]) return alert("Exists."); const cfg = { name, earnings: [...laoEarningsStruct], deductions: [...defaultDeductions] }; await transact(STORE_CONFIG, 'readwrite', s => s.put(cfg)); departmentConfigs[name] = cfg; window.loadDeptConfig(); renderDeptSidebar(); };
        window.renameDept = async () => { const select = document.getElementById('config-dept-select'); const oldName = select.value; if (!oldName) return; const newName = prompt("Enter new name:", oldName); if (!newName || newName.trim() === "" || newName === oldName) return; if (departmentConfigs[newName]) return alert("Exists."); const cfg = JSON.parse(JSON.stringify(departmentConfigs[oldName])); cfg.name = newName; await transact(STORE_CONFIG, 'readwrite', s => { s.put(cfg); s.delete(oldName); }); for (const emp of employees.filter(e => e.department === oldName)) { emp.department = newName; await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); departmentConfigs[newName] = cfg; delete departmentConfigs[oldName]; renderDeptSidebar(); renderEmployeeList(); window.loadDeptConfig(); document.getElementById('config-dept-select').value = newName; alert(`Renamed.`); };
        window.deleteDept = async () => { const dept = document.getElementById('config-dept-select').value; if (employees.some(e => e.department === dept)) return alert("Cannot delete. Staff are assigned."); if (!confirm(`Delete "${dept}"?`)) return; await transact(STORE_CONFIG, 'readwrite', s => s.delete(dept)); delete departmentConfigs[dept]; window.loadDeptConfig(); renderDeptSidebar(); };
        window.updateDashboardStats = async () => { const vy = document.getElementById('filter-year'); const vm = document.getElementById('filter-month'); if(!vy || !vm) return; const yr = vy.value; const mn = vm.value; let liveTotalLAK = 0; let liveTotalUSD = 0; let liveStaffCount = 0; let breakdown = {}; employees.forEach(emp => { let empHasEntryInPeriod = false; if (emp.payrollHistory) { Object.keys(emp.payrollHistory).forEach(key => { const [kYr, kMn] = key.split('-'); const matchYr = (yr === 'All' || String(kYr) === String(yr)); const matchMn = (mn === 'All' || String(kMn) === String(mn)); if (matchYr && matchMn) { const result = calculatePayrollFromState(emp, emp.payrollHistory[key]); liveTotalLAK += result.lak; liveTotalUSD += result.usd; empHasEntryInPeriod = true; const c = emp.campus || "Unassigned"; const d = emp.department || "Unassigned"; if (!breakdown[c]) breakdown[c] = {}; if (!breakdown[c][d]) breakdown[c][d] = { lak: 0, usd: 0, staffIds: new Set() }; breakdown[c][d].lak += result.lak; breakdown[c][d].usd += result.usd; if(emp.status !== 'Resigned') breakdown[c][d].staffIds.add(emp.id); } }); } if (empHasEntryInPeriod && emp.status !== 'Resigned') liveStaffCount++; }); const lakEl = document.getElementById('stat-total-paid-lak'); if(lakEl) lakEl.innerText = formatMoney(liveTotalLAK); const usdEl = document.getElementById('stat-total-paid-usd'); if(usdEl) usdEl.innerText = formatUSD(liveTotalUSD); const empEl = document.getElementById('stat-employees'); if(empEl) empEl.innerText = liveStaffCount; const dbEl = document.getElementById('dept-breakdown'); if (dbEl) { let tableHtml = `<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><div class="p-4 border-b border-gray-100 bg-gray-50"><h3 class="font-bold text-gray-700 text-xs uppercase">Department Breakdown</h3></div><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-500 text-xs uppercase font-medium"><tr><th class="px-4 py-3">Campus</th><th class="px-4 py-3">Department</th><th class="px-4 py-3 text-center">Active Staff</th><th class="px-4 py-3 text-right">Total Pay (LAK)</th><th class="px-4 py-3 text-right">Total Pay (USD)</th></tr></thead><tbody class="divide-y divide-gray-100">`; let hasRows = false; Object.keys(breakdown).sort().forEach(campus => { Object.keys(breakdown[campus]).sort().forEach(dept => { const data = breakdown[campus][dept]; hasRows = true; tableHtml += `<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-medium text-blue-900">${campus}</td><td class="px-4 py-3">${dept}</td><td class="px-4 py-3 text-center">${data.staffIds.size}</td><td class="px-4 py-3 text-right font-mono text-blue-700">${formatMoney(data.lak)}</td><td class="px-4 py-3 text-right font-mono text-green-700">${formatUSD(data.usd)}</td></tr>`; }); }); if (!hasRows) { tableHtml += `<tr><td colspan="5" class="px-4 py-6 text-center text-gray-400">No data available.</td></tr>`; } tableHtml += `</tbody></table></div>`; dbEl.innerHTML = tableHtml; } const logs = await transact(STORE_HISTORY, 'readonly', s => s.getAll()); let fl = logs.filter(l => { const matchYear = (yr === 'All' || String(l.year) === String(yr)); const matchMonth = (mn === 'All' || String(l.month) === String(mn)); return matchYear && matchMonth; }); const latestLog = fl.sort((a,b) => b.dateId.localeCompare(a.dateId))[0]; const lastMonthEl = document.getElementById('stat-last-month'); const lastAmountEl = document.getElementById('stat-last-amount'); if (latestLog) { lastMonthEl.innerText = `${latestLog.month} ${latestLog.year}`; lastAmountEl.innerText = formatMoney(latestLog.totalLAK); } else { lastMonthEl.innerText = "No Finalized Runs"; lastAmountEl.innerText = "---"; } const hlist = document.getElementById('history-list'); if(hlist) { hlist.innerHTML = fl.sort((a,b) => b.dateId.localeCompare(a.dateId)).map(h => `<tr><td class="p-4 text-sm font-bold text-blue-900">${h.month} ${h.year}</td><td class="p-4 text-sm">${h.employeeCount} Staff</td><td class="p-4 text-sm text-right font-mono font-bold text-green-700">${formatMoney(h.totalLAK)}</td><td class="p-4 text-sm text-right font-mono font-bold text-green-700">$${(h.totalUSD || 0).toFixed(2)}</td><td class="p-4 text-right"><button onclick="window.deleteHistory('${h.dateId}')" class="text-red-500 text-xs underline font-bold">Delete Log</button></td></tr>`).join(''); } };
        window.deleteHistory = async (id) => { if (confirm("Delete this log?")) { await transact(STORE_HISTORY, 'readwrite', s => s.delete(id)); window.updateDashboardStats(); } };
        window.openSaveHistoryModal = () => document.getElementById('save-modal').classList.remove('hidden');
        window.savePayrollHistory = async (e) => { e.preventDefault(); const mn = document.getElementById('save-month').value; const yr = document.getElementById('save-year').value; const key = `${yr}-${mn}`; let totalLAK = 0; let totalUSD = 0; let count = 0; employees.forEach(emp => { if (emp.payrollHistory && emp.payrollHistory[key]) { const result = calculatePayrollFromState(emp, emp.payrollHistory[key]); totalLAK += result.lak; totalUSD += result.usd; count++; } }); await transact(STORE_HISTORY, 'readwrite', (s) => s.put({ dateId: key, month: mn, year: yr, totalLAK, totalUSD, employeeCount: count, timestamp: new Date().toISOString() })); window.updateDashboardStats(); document.getElementById('save-modal').classList.add('hidden'); };
        window.handleStaffCSV = (input) => { const file = input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { const text = e.target.result; const rows = text.split('\n').filter(r => r.trim()); if (rows.length < 2) return alert("Invalid CSV"); for (let i = 1; i < rows.length; i++) { const cols = rows[i].split(',').map(c => c.replace(/^"|"$/g, '').trim()); if (cols.length < 3) continue; const id = 'EMP_' + Date.now() + i; const name = cols[2]; const dept = cols[4]; const pos = cols[5]; await transact(STORE_EMPLOYEES, 'readwrite', s => s.put({ id, name, department: dept, position: pos, payrollHistory: {}, campus: "General Services" })); } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); renderEmployeeList(); renderDeptSidebar(); }; reader.readAsText(file); };
        window.triggerImport = () => document.getElementById('staff-csv-input').click();
        window.deleteAllPhotos = async () => { if (!confirm("Remove all employee photos?")) return; for (const emp of employees) { emp.profilePic = null; await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); renderEmployeeList(); };
        window.setTheme = (theme) => { localStorage.setItem('neerada_theme', theme); document.body.classList.remove('theme-default','theme-emerald','theme-rose','theme-slate','theme-violet'); document.body.classList.add(`theme-${theme}`); if (document.getElementById('theme-select')) document.getElementById('theme-select').value = theme; };
        window.downloadCSVReport = () => { const yrFilter = document.getElementById('filter-year').value; const mnFilter = document.getElementById('filter-month').value; let rows = [["PERIOD(mmm-YY)", "EMPLOYEE id", "NAME", "campus", "department", "phone/wa number", "position", "LAK ACCOUNT", "USD ACCOUNT", "TOTAL LAK", "TOTAL USD", "Loan PAYMENT"]]; let grandTotalLAK = 0; let grandTotalUSD = 0; let normalRows = []; let cashRows = []; employees.forEach(emp => { if(!emp.payrollHistory) return; Object.keys(emp.payrollHistory).forEach(key => { const [y, m] = key.split('-'); if((yrFilter === 'All' || y === yrFilter) && (mnFilter === 'All' || m === mnFilter)) { const result = calculatePayrollFromState(emp, emp.payrollHistory[key]); const loanDed = getArounyLoanPayment(emp, key) || parseFloat(emp.payrollHistory[key].loanDeduction || 0); grandTotalLAK += result.lak; grandTotalUSD += result.usd; const csvEmpId = generateEmployeeID(emp, m, y); const periodStr = `${m.substring(0,3)}-${y.substring(2)}`; const isCash = (emp.bankLak && (emp.bankLak.toLowerCase().includes('cash') || emp.bankLak.includes('ເງີນສົດ'))) || !emp.bankLak; const rowData = [periodStr, csvEmpId, emp.name, emp.campus || "General Services", emp.department, (emp.whatsapp || emp.email || "N/A"), emp.position, (emp.bankLak || "N/A"), (emp.bankUsd || "N/A"), result.lak, result.usd, loanDed]; if(isCash) cashRows.push(rowData); else normalRows.push(rowData); } }); }); rows = [...rows, ...normalRows, ...cashRows]; rows.push(["", "", "", "", "", "", "", "", "Grand Total", grandTotalLAK, grandTotalUSD, ""]); const yrLabel = yrFilter === 'All' ? 'AllYears' : yrFilter; const mnLabel = mnFilter === 'All' ? 'AllMonths' : mnFilter; const filename = `Neerada_Payroll_Report_${yrLabel}_${mnLabel}_unified.csv`; const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
        window.calculateBankSortIndex = (emp) => { const name = emp.name.toUpperCase(); if (name.includes('NIRAPHONE KEOBOUNLOME')) return -10; if (name.includes('PHOUMANIPHONE KEOBOUNLOME')) return -9; if (name.includes('PHOUMANITHIP KEOBOUNLOME')) return -8; const isCash = (emp.bankLak && (emp.bankLak.toLowerCase().includes('cash') || emp.bankLak.includes('ເງີນສົດ'))) || !emp.bankLak; if(isCash) return 999; const c = emp.campus || ""; const d = emp.department || ""; if (d.includes('Admin') || d.includes('ບໍລິຫານ')) return 1; if (d.includes('Secretary') || d.includes('ເລຂານຸການ')) return 2; if (c === 'Sibounheuang' && (d === 'Primary' || d === 'Academic Head - Primary')) return 3; if (c === 'Sibounheuang' && (d === 'Secondary' || d === 'Academic Head - HS' || d === 'Vice Principal')) return 4; if (c === 'Chommany' && (d === 'Secondary' || d === 'Academic Head - HS' || d === 'Vice Principal')) return 5; if (c === 'Sibounheuang' && (d === 'Kindergarten' || d === 'Academic Head - Kinder')) return 6; if (c === 'Chommany' && (d === 'Kindergarten' || d === 'Academic Head - Kinder')) return 7; if (c === 'Chommany' && (d === 'Primary' || d === 'Academic Head - Primary')) return 8; if (d === 'English') return 9; if (d.includes('Invitational')) return 10; return 11; };
        window.downloadBankReport = () => { const yr = document.getElementById('filter-year').value; const mn = document.getElementById('filter-month').value; if (yr === 'All' || mn === 'All') return alert("Please select a specific Month and Year for the Bank Report."); const key = `${yr}-${mn}`; const periodStr = `${mn.substring(0,3).toUpperCase()}-${yr.substring(2)}`; let data = []; employees.forEach(emp => { if (emp.payrollHistory && emp.payrollHistory[key]) { const result = calculatePayrollFromState(emp, emp.payrollHistory[key]); if (result.lak > 0) { data.push({ emp: emp, netPay: result.lak, sortIndex: calculateBankSortIndex(emp) }); } } }); data.sort((a, b) => a.sortIndex - b.sortIndex); let rows = [["Account Number", "Net Pay (LAK)", "Bank Account Name", "Period (MM-YY)"]]; data.forEach(item => { rows.push([ item.emp.bankLak || "", item.netPay, item.emp.bankAccountName || item.emp.name, periodStr ]); }); const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `Neerada_Bank_Transfer_${mn}_${yr}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
        window.exportDepartmentPayslipData = () => { const dept = currentFilter.department; if (dept === 'All') { alert("Select a specific Department first."); return; } const yr = document.getElementById('editor-year').value; const mn = document.getElementById('editor-month').value; const key = `${yr}-${mn}`; const cfg = departmentConfigs[dept]; if (!cfg) return; let headers = ["NAME", ...cfg.earnings, ...cfg.deductions, "NET PAY (LAK)"]; let rows = [headers]; const deptEmployees = employees.filter(e => e.department === dept); const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && dept !== 'English' && !GS_DEPTS.includes(dept); deptEmployees.forEach(emp => { const payData = (emp.payrollHistory && emp.payrollHistory[key]) ? emp.payrollHistory[key] : {}; let row = [emp.name]; let totalEarnings = 0; let totalDeductions = 0; cfg.earnings.forEach((f, i) => { let val = payData[f] || 0; if (isStandardLaoDept) { if (cfg.earnings.length >= 10) { if (i === 5) { val = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); } if (i === 9) { const basic = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); val = basic + (parseFloat(payData[cfg.earnings[6]])||0) + (parseFloat(payData[cfg.earnings[7]])||0) + (parseFloat(payData[cfg.earnings[8]])||0); } } } row.push(val); const isBasicResult = (isStandardLaoDept && i === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'); const isStart = (isStandardLaoDept && i === 9) || (!isStandardLaoDept && f === LAO_FIELDS.start); if (!isRate && !isStart && f !== 'Basic Pay (USD)') { if (isBasicResult) { if (dept.includes('Accounts') || dept.includes('Invitational Teachers') || i === 5) { totalEarnings += parseFloat(val); } } else { totalEarnings += parseFloat(val); } } }); if (payData.overtimeAmount) totalEarnings += parseFloat(payData.overtimeAmount); cfg.deductions.forEach(f => { const val = payData[f] || 0; row.push(val); totalDeductions += parseFloat(val); }); if (payData.loanDeduction) totalDeductions += parseFloat(payData.loanDeduction); const netPay = Math.max(0, totalEarnings - totalDeductions); row.push(netPay); rows.push(row); }); const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `PayslipData_${dept}_${mn}_${yr}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
        window.downloadTemplate = (dept) => { const m = document.getElementById('bulk-import-month').value; const y = document.getElementById('bulk-import-year').value; if(!dept) return alert("Select a department."); const cfg = departmentConfigs[dept]; if (!cfg) return; let headers = ["Employee Name", ...cfg.earnings, ...cfg.deductions, "Total Earnings", "Total Deductions", "Net Pay", "Notes"]; const deptEmps = employees.filter(e => e.department === dept).sort((a,b) => a.name.localeCompare(b.name)); let csvContent = "data:text/csv;charset=utf-8,\ufeff" + headers.join(",") + "\n"; deptEmps.forEach(emp => { const emptyVals = new Array(cfg.earnings.length + cfg.deductions.length).fill(0); const row = [`"${emp.name}"`, ...emptyVals, 0, 0, 0, ""]; csvContent += row.join(",") + "\n"; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Payroll_Template_${dept}_${m}_${y}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
        window.handleBulkCSVPayslipUpload = (input) => { const file = input.files[0]; if (!file) return; const m = document.getElementById('bulk-import-month').value; const y = document.getElementById('bulk-import-year').value; const key = `${y}-${m}`; const reader = new FileReader(); reader.onload = async (e) => { const text = e.target.result; const rows = text.split('\n').filter(r => r.trim()); if (rows.length < 2) return alert("Invalid CSV"); const headers = rows[0].split(',').map(h => h.replace(/^"|"$/g, '').trim()); const nameIdx = headers.indexOf("Employee Name"); const notesIdx = headers.indexOf("Notes"); if (nameIdx === -1) return; let updatedCount = 0; for (let i = 1; i < rows.length; i++) { const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim()); if (cols.length < headers.length) continue; const empName = cols[nameIdx]; const emp = employees.find(e => e.name === empName); if (emp) { if (!emp.payrollHistory) emp.payrollHistory = {}; if (!emp.payrollHistory[key]) emp.payrollHistory[key] = createInitialState(emp.department); const state = emp.payrollHistory[key]; headers.forEach((h, index) => { if (index !== nameIdx && index !== notesIdx) { if (state.hasOwnProperty(h)) state[h] = parseFloat(cols[index]) || 0; } }); if (notesIdx !== -1 && cols[notesIdx]) state.notes = cols[notesIdx]; window.syncLoanBalances(emp); emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); updatedCount++; } } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.updateDashboardStats(); if (selectedEmployee) loadPeriodData(); alert(`Bulk Upload Complete. Updated ${updatedCount} records.`); input.value = ''; }; reader.readAsText(file); };
        window.openGlobalArchives = () => { const list = document.getElementById('global-archive-list'); let rows = ""; let hasData = false; employees.forEach(emp => { if(emp.archivedLoans && emp.archivedLoans.length > 0) { hasData = true; emp.archivedLoans.forEach(l => { rows += `<tr class="border-b border-gray-50"><td class="px-4 py-3 font-medium text-gray-800">${emp.name}</td><td class="px-4 py-3 text-gray-500 text-xs">${emp.department}</td><td class="px-4 py-3 text-gray-700">${l.description}</td><td class="px-4 py-3 text-center text-xs text-gray-500">${l.dateAdded}</td><td class="px-4 py-3 text-right font-mono">${formatMoney(l.total)}</td><td class="px-4 py-3 text-center"><span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">Paid Off</span></td></tr>`; }); } }); list.innerHTML = hasData ? rows : `<tr><td colspan="6" class="p-6 text-center text-gray-400">No archived loans found.</td></tr>`; document.getElementById('global-archive-modal').classList.remove('hidden'); if(window.lucide) lucide.createIcons(); };
        window.bulkResetPayroll = async () => { const yr = document.getElementById('editor-year').value; const mn = document.getElementById('editor-month').value; const targetStr = currentFilter.department === 'All' ? 'ALL Staff' : currentFilter.department; if(!confirm(`RESET payroll data for ${targetStr} for ${mn} ${yr}? This cannot be undone.`)) return; const key = `${yr}-${mn}`; let count = 0; const targetEmployees = currentFilter.department === 'All' ? employees : employees.filter(e => e.department === currentFilter.department); for(const emp of targetEmployees) { if(emp.payrollHistory && emp.payrollHistory[key]) { delete emp.payrollHistory[key]; await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); count++; } } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); window.updateDashboardStats(); if(selectedEmployee) loadPeriodData(); alert(`Reset data for ${count} employees.`); };
        window.deleteAllEmployeesInFilter = async () => { const targetStr = currentFilter.department === 'All' ? 'ALL Staff' : currentFilter.department; if(!confirm(`DELETE ${targetStr}? This will remove employees and all their history permanently.`)) return; if(!confirm(`Are you absolutely sure you want to delete ${targetStr}?`)) return; const targetEmployees = currentFilter.department === 'All' ? employees : employees.filter(e => e.department === currentFilter.department); for(const emp of targetEmployees) { await transact(STORE_EMPLOYEES, 'readwrite', s => s.delete(emp.id)); } employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); selectedEmployee = null; document.getElementById('editor-area').classList.add('hidden'); document.getElementById('empty-state').classList.remove('hidden'); renderEmployeeList(); renderDeptSidebar(); window.updateDashboardStats(); alert("Deletion complete."); };
        window.exportData = async () => { const emp = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); const hist = await transact(STORE_HISTORY, 'readonly', s => s.getAll()); const cfg = await transact(STORE_CONFIG, 'readonly', s => s.getAll()); const data = { employees: emp, history: hist, config: cfg, timestamp: Date.now() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `neerada_backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
        window.importData = (input) => { const file = input.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { try { const data = JSON.parse(e.target.result); let importedConfig = data.config || data.departmentConfigs; let importedEmployees = data.employees; let importedHistory = data.history || data.history_logs; if (!importedEmployees) throw new Error("Invalid backup: Missing employees data."); if (importedConfig && !Array.isArray(importedConfig)) { importedConfig = Object.entries(importedConfig).map(([name, cfg]) => ({ name, ...cfg })); } if (!importedConfig) { if(!confirm("Backup is missing configuration data. Import employees only?")) return; importedConfig = []; } else { if (!confirm(`Restore backup from ${new Date(data.timestamp || Date.now()).toLocaleDateString()}? This will overwrite current data.`)) return; } if (importedConfig.length > 0) { await transact(STORE_CONFIG, 'readwrite', s => s.clear()); for (const c of importedConfig) await transact(STORE_CONFIG, 'readwrite', s => s.put(c)); departmentConfigs = {}; importedConfig.forEach(c => departmentConfigs[c.name] = { earnings: c.earnings, deductions: c.deductions }); } await transact(STORE_EMPLOYEES, 'readwrite', s => s.clear()); for (const em of importedEmployees) { if(!em.payrollHistory) em.payrollHistory = {}; if(!em.savedPayroll) em.savedPayroll = {}; await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(em)); } employees = importedEmployees; await transact(STORE_HISTORY, 'readwrite', s => s.clear()); if (importedHistory) { for (const h of importedHistory) await transact(STORE_HISTORY, 'readwrite', s => s.put(h)); history = importedHistory; } alert("Restore successful! Reloading..."); localStorage.setItem('neerada_current_view', 'app'); window.location.reload(); } catch (err) { alert("Error importing data: " + err.message); console.error("Import Error Details:", err); } }; reader.readAsText(file); input.value = ''; };

        // Rate Calculator Additions
        window.openRateCalculator = () => {
            const list = document.getElementById('calc-history-list'); const englishStaff = employees.filter(e => e.department === 'English'); const historyMap = {};
            englishStaff.forEach(emp => { if(emp.payrollHistory) { Object.keys(emp.payrollHistory).forEach(key => { const rate = emp.payrollHistory[key].exchangeRate; if(rate > 0) historyMap[key] = rate; }); } });
            const sortedKeys = Object.keys(historyMap).sort((a, b) => b.localeCompare(a)); 
            if (sortedKeys.length === 0) list.innerHTML = `<p class="text-gray-400 text-center py-2">No history recorded.</p>`; else list.innerHTML = sortedKeys.map(key => `<div class="flex justify-between border-b border-gray-200 last:border-0 py-1"><span>${key}</span><span class="font-mono font-bold text-blue-800">${formatMoney(historyMap[key])}</span></div>`).join('');
            document.getElementById('calc-buy').value = ''; document.getElementById('calc-sell').value = ''; document.getElementById('calc-result').innerText = '0';
            document.getElementById('rate-calc-modal').classList.remove('hidden'); document.getElementById('rate-calc-modal').classList.add('flex');
        };
        window.calculateRateAvg = () => { const buy = parseFloat(document.getElementById('calc-buy').value) || 0; const sell = parseFloat(document.getElementById('calc-sell').value) || 0; const avg = (buy + sell) / 2; document.getElementById('calc-result').innerText = avg > 0 ? formatMoney(avg) : '0'; };
        window.applyCalculatedRate = () => {
            const rate = parseFloat(document.getElementById('calc-result').innerText.replace(/[^\d.]/g, ''));
            if (rate > 0) {
                const input = document.getElementById('eng-exchange-rate');
                if(input) { input.value = rate; window.updatePayrollField('exchangeRate', rate); window.propagateEnglishRate(rate); }
                document.getElementById('rate-calc-modal').classList.add('hidden'); document.getElementById('rate-calc-modal').classList.remove('flex');
            } else { alert("Please calculate a valid rate first."); }
        };
        window.propagateEnglishRate = async (val) => {
            const rate = parseFloat(val) || 0; const key = `${editorYear}-${editorMonth}`; const englishStaff = employees.filter(e => e.department === 'English');
            for (const emp of englishStaff) { if (!emp.payrollHistory) emp.payrollHistory = {}; if (!emp.payrollHistory[key]) emp.payrollHistory[key] = createInitialState('English'); emp.payrollHistory[key].exchangeRate = rate; emp.lastModified = new Date().toISOString(); await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); }
            employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); if(selectedEmployee && selectedEmployee.department === 'English') { selectedEmployee = employees.find(e => e.id === selectedEmployee.id); }
        };
        window.handleDevSecret = function() { const code = prompt("Enter Admin Code:"); if (code === "0000") { const msg = prompt("SYSTEM LOCK: Enter a maintenance message."); if (msg !== null && msg.trim() !== "") { localStorage.setItem('neerada_locked', 'true'); localStorage.setItem('neerada_lock_msg', msg); window.showLockScreen(); } } else { alert("Access Denied"); } };
        window.showLockScreen = function() { document.getElementById('lock-message').innerText = localStorage.getItem('neerada_lock_msg') || "System Unavailable"; document.getElementById('system-lock-overlay').classList.remove('hidden'); document.getElementById('system-lock-overlay').classList.add('flex'); document.getElementById('landing-view').classList.add('hidden'); document.getElementById('app-view').classList.add('hidden'); };
        window.tryUnlock = function() { const code = prompt("Enter Unlock Code:"); if (code === "0000") { localStorage.removeItem('neerada_locked'); localStorage.removeItem('neerada_lock_msg'); document.getElementById('system-lock-overlay').classList.add('hidden'); document.getElementById('system-lock-overlay').classList.remove('flex'); window.goToLanding(); } else { alert("Incorrect Code"); } };

        window.editCurrentStaff = () => {
            try {
                if (!selectedEmployee || !selectedEmployee.id) {
                    alert("Please select an employee first from the left panel.");
                    return;
                }
                window.openStaffModal(selectedEmployee.id);
            } catch (e) {
                console.error("Critical error in editCurrentStaff:", e);
                alert("Error launching editor: " + e.message);
            }
        };

        window.openStaffModal = (id) => {
            try {
                // Safely get and reset the form
                const form = document.getElementById('add-form');
                if (form) form.reset();
                
                const formId = document.getElementById('form-id');
                if (formId) formId.value = "";
                
                if (typeof window.clearModalPhoto === 'function') window.clearModalPhoto();
                
                // Clear bank warnings safely
                const warn = document.getElementById('bank-name-warning');
                if (warn) warn.classList.add('hidden');
                
                const bankNameInput = document.getElementById('form-bank-name');
                if (bankNameInput) bankNameInput.classList.remove('border-red-500');

                // If editing existing staff, populate fields safely
                if (id) {
                    const emp = employees.find(e => String(e.id) === String(id));
                    if (!emp) throw new Error("Employee data not found.");
                    
                    document.getElementById('modal-title').innerText = "Edit Staff Details";
                    if(formId) formId.value = emp.id;
                    if(document.getElementById('form-name')) document.getElementById('form-name').value = emp.name || "";
                    if(document.getElementById('form-position')) document.getElementById('form-position').value = emp.position || "";
                    if(bankNameInput) bankNameInput.value = emp.bankAccountName || "";
                    
                    const targetCampus = emp.campus || (typeof ACADEMIC_DEPTS !== 'undefined' && ACADEMIC_DEPTS.includes(emp.department) ? "Sibounheuang" : "General Services");
                    if(document.getElementById('form-campus')) document.getElementById('form-campus').value = targetCampus;
                    
                    if (typeof window.filterModalDepts === 'function') window.filterModalDepts(emp.department);
                    
                    if(document.getElementById('form-department')) document.getElementById('form-department').value = emp.department || "";
                    if(document.getElementById('form-bank-lak')) document.getElementById('form-bank-lak').value = emp.bankLak || "";
                    if(document.getElementById('form-bank-usd')) document.getElementById('form-bank-usd').value = emp.bankUsd || "";
                    if(document.getElementById('form-email')) document.getElementById('form-email').value = emp.email || "";
                    if(document.getElementById('form-whatsapp')) document.getElementById('form-whatsapp').value = emp.whatsapp || "";
                    if(document.getElementById('form-status')) document.getElementById('form-status').value = emp.status || "Active";
                    
                    if (emp.profilePic) {
                        tempProfilePic = emp.profilePic;
                        const prev = document.getElementById('form-preview-pic');
                        if (prev) { prev.src = emp.profilePic; prev.classList.remove('hidden'); }
                        const defIcon = document.getElementById('form-default-icon');
                        if (defIcon) defIcon.classList.add('hidden');
                        const delBtn = document.getElementById('delete-modal-photo-btn');
                        if (delBtn) delBtn.classList.remove('hidden');
                    }
                } else {
                    // Adding new staff
                    document.getElementById('modal-title').innerText = "Add Staff";
                    if(document.getElementById('form-campus')) document.getElementById('form-campus').value = "Sibounheuang";
                    if(document.getElementById('form-status')) document.getElementById('form-status').value = "Active";
                    if (typeof window.filterModalDepts === 'function') window.filterModalDepts();
                }

                // Show the modal safely
                const modal = document.getElementById('add-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                } else {
                    throw new Error("Modal element #add-modal is missing from the document.");
                }

                if (typeof window.toggleBankFields === 'function') window.toggleBankFields();
                if (typeof window.checkBankName === 'function' && bankNameInput) window.checkBankName(bankNameInput);
                if (window.lucide && typeof lucide.createIcons === 'function') lucide.createIcons();

            } catch (err) {
                console.error("Error launching modal:", err);
                alert("An error occurred while opening the editor: " + err.message);
            }
        };

        // --- NEW UPDATES FOR LABEL RENAMING AND AUTO-COMPUTATION ---
        
        // 1. Properly migrate the active editing state so digits aren't lost from view
        window.updateConfigFieldName = async (dept, type, idx, newVal, oldVal) => { 
            if (newVal === oldVal) return; 
            departmentConfigs[dept][type][idx] = newVal; 
            await transact(STORE_CONFIG, 'readwrite', s => s.put(departmentConfigs[dept])); 
            
            let updatedCount = 0; 
            for (let emp of employees) { 
                if (emp.department === dept && emp.payrollHistory) { 
                    let changed = false; 
                    for (let key in emp.payrollHistory) { 
                        if (emp.payrollHistory[key][oldVal] !== undefined) { 
                            emp.payrollHistory[key][newVal] = emp.payrollHistory[key][oldVal]; 
                            delete emp.payrollHistory[key][oldVal]; 
                            changed = true; 
                        } 
                    } 
                    if (changed) { 
                        emp.lastModified = new Date().toISOString(); 
                        await transact(STORE_EMPLOYEES, 'readwrite', s => s.put(emp)); 
                        updatedCount++; 
                    } 
                } 
            } 
            if (updatedCount > 0) { 
                employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll()); 
            } 
            
            // Crucial fix: Migrate the active payroll state to keep digits on the screen
            if (selectedEmployee && selectedEmployee.department === dept) {
                if (currentPayrollState[oldVal] !== undefined) {
                    currentPayrollState[newVal] = currentPayrollState[oldVal];
                    delete currentPayrollState[oldVal];
                }
                window.loadPeriodData(); // Instantly refresh UI
            }
            
            window.loadDeptConfig(); 
        }; 

        // 2. Ensure switching to the Staff tab refreshes the state with new label names
        const originalSwitchView = window.switchView;
        window.switchView = (v) => {
            originalSwitchView(v);
            if (v === 'payroll' && selectedEmployee) {
                window.loadPeriodData();
            }
        };

        // 3. Fix Email/WhatsApp output to prevent Double Calculating when labels are renamed
        window.constructPayslipMessage = () => {
            if (!selectedEmployee) return "";
            const dept = selectedEmployee.department;
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
            const state = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState);
            const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString();
            const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear);
            const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const fLAK = (n) => formatMoney(n);

            let msg = `*PAYSLIP - Neerada School*\n`;
            msg += `----------------------------\n`;
            msg += `Date: ${dateStr}\n`;
            msg += `Employee: ${selectedEmployee.name}\n`;
            msg += `ID: ${empID}\n`;
            msg += `Position: ${selectedEmployee.position}\n`;
            msg += `Department: ${selectedEmployee.department}\n`;
            msg += `Campus: ${selectedEmployee.campus}\n`;
            msg += `----------------------------\n\n`;

            if(dept === 'English') {
                const d = state;
                const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0);
                const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0);
                const grossUSD = earnSum + otPayment;
                const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0);
                const netUSD = grossUSD - dedUSDSum;
                const convertible = netUSD - (parseFloat(d.cashOut)||0);
                const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0);
                const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0);
                const loanDed = parseFloat(d.loanDeduction)||0;
                const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed;
                const finalLAK = convertedLAK + extraLAK - dedLAK;

                msg += `*EARNINGS*\n`;
                msg += `Basic Pay ($): ${fUSD(d.basicPay)}\n`;
                msg += `Accumulated ($): ${fUSD(d.accumulated)}\n`;
                msg += `${getEnglishIncreaseLabel()} Increased ($): ${fUSD(d.increase)}\n`;
                msg += `Others ($): ${fUSD(d.earningsOthersUSD)}\n\n`;

                msg += `*OVERTIME (USD)*\n`;
                msg += `Total hours: ${d.otHours}\n`;
                msg += `Rate per hour: $${d.otRate}\n`;
                msg += `Payment: ${fUSD(otPayment)}\n\n`;

                msg += `*EXTRA WORK (LAK)*\n`;
                msg += `IT (LAK): ${fLAK(d.itLAK)}\n`;
                msg += `Others (LAK): ${fLAK(d.extraWorkOthersLAK)}\n`;
                msg += `STIPEND (4 levels): ${fLAK(d.stipendLAK)}\n\n`;

                msg += `Gross Pay ($): ${fUSD(grossUSD)}\n`;
                msg += `Rate USD to LAK: ${formatMoney(d.exchangeRate)}\n\n`;

                msg += `*DEDUCTIONS*\n`;
                msg += `Professional Tax ($): (${fUSD(d.profTax)})\n`;
                msg += `Absences ($): (${fUSD(d.absences)})\n`;
                msg += `Visa ($): (${fUSD(d.visa)})\n`;
                msg += `Others ($): (${fUSD(d.deductionsOthersUSD)})\n`;
                msg += `TOTAL DEDUCTIONS ($): (${fUSD(dedUSDSum)})\n\n`;

                msg += `Insurance (LAK): (${fLAK(d.insuranceLAK)})\n`;
                msg += `Others (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(d.loanDeduction > 0) {
                     const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment";
                     msg += `${desc} (LAK): (${fLAK(d.loanDeduction)})\n`;
                }
                msg += `Deductions (LAK): (${fLAK(dedLAK)})\n\n`;

                msg += `----------------------------\n`;
                msg += `Net Pay ($): ${fUSD(netUSD)}\n`;
                msg += `Cash out: ${fUSD(d.cashOut)}\n`;
                msg += `$ convertible: ${fUSD(convertible)}\n`;
                msg += `*SALARY PAY (LAK): ${fLAK(finalLAK)}*\n`;
                
                if (d.notes) msg += `\nNotes: ${d.notes}\n`;

            } else {
                let te = 0;
                let td = 0;
                msg += `*EARNINGS*\n`;

                const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0;
                    
                    // --- FIXED DOUBLE COUNTING LOGIC (Position based) ---
                    let shouldInclude = false;
                    if (isStandardLaoDept) {
                         if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                             if (cfg.earnings.length > 9) {
                                 if (currIndex >= 9) shouldInclude = true; // Include 9 and above (prevents 0-8 from double counting)
                             } else if (cfg.earnings.length > 5) {
                                 if (currIndex >= 5) shouldInclude = true;
                             } else {
                                 shouldInclude = true; 
                             }
                         }
                    } else {
                         if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) {
                            shouldInclude = true;
                         }
                    }

                    if (shouldInclude) te += parseFloat(v);

                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'));
                    const isStart = (isStandardLaoDept && currIndex === 9);
                    const isUSD = (f === 'Basic Pay (USD)');
                    const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');

                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                        const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v));
                        msg += `${f}: ${valStr}\n`;
                    }
                });
                
                if (state.overtimeAmount > 0) {
                    te += parseFloat(state.overtimeAmount);
                    msg += `Overtime (OT): ${formatMoney(state.overtimeAmount)}\n`;
                }

                msg += `*Total Earnings: ${formatMoney(te)}*\n`;
                
                msg += `\n*DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => {
                    const v = state[f] || 0;
                    if (v > 0) {
                        td += parseFloat(v);
                        msg += `${f}: (${formatMoney(v)})\n`;
                    }
                });
                
                if (state.loanDeduction > 0) {
                    td += parseFloat(state.loanDeduction);
                    const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment";
                    msg += `${desc}: (${formatMoney(state.loanDeduction)})\n`;
                }

                msg += `*TOTAL DEDUCTIONS: (${formatMoney(td)})*\n`;
                msg += `\n*NET PAY (LAK): ${formatMoney(te - td)}*\n`;
                
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) {
                    msg += `\n----------------------------\n`;
                    msg += `ໝາຍເຫດ:\n`;
                    msg += `1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n`;
                    msg += `2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n`;
                    msg += `3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`;
                }
                
                if (state.notes) {
                    msg += `\nAdditional Notes: ${state.notes}\n`;
                }
            }
            
            msg += `\n_Computer Generated message._\n`;
            msg += `© 2026 Neerada School Payroll System`;
            return msg;
        };

<!-- ... existing code ... -->
        // ==========================================
        // PASTE ALL THE BUG FIXES & OVERRIDES HERE
        // ==========================================

        // 1. Fully Positional Recalculation (Immune to label renaming)
        window.recalculatePayrollState = function(dept, state) {
            if (dept.includes('Accounts')) { const usd = parseFloat(state['Basic Pay (USD)'] || 0); const rate = parseFloat(state['Exchange Rate (LAK)'] || 0); if (usd > 0 && rate > 0) state['ເງີນເດືອນພື້ນຖານ'] = usd * rate; }
            else if (dept.includes('Invitational Teachers')) { const hrs = parseFloat(state['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'] || 0); const rate = parseFloat(state['ອັດຕາຊົ່ວໂມງ (Rate per Hour)'] || 0); if (hrs > 0 && rate > 0) state['ເງີນເດືອນ'] = hrs * rate; }
            else if (dept !== 'English' && !GS_DEPTS.includes(dept)) {
                const cfg = departmentConfigs[dept];
                if (cfg && cfg.earnings.length >= 10) {
                    const earnList = cfg.earnings; 
                    const basicField = earnList[5]; 
                    const startField = earnList[9]; 
                    let bSum = 0; 
                    for(let i=0; i<=4; i++) { if(earnList[i]) bSum += parseFloat(state[earnList[i]]) || 0; }
                    state[basicField] = bSum;
                    let startSum = bSum; 
                    for(let i=6; i<=8; i++) { if(earnList[i]) startSum += parseFloat(state[earnList[i]]) || 0; }
                    state[startField] = startSum;
                }
            }
            return state;
        };

        // 2. Global Total Calculation (Immune to label renaming, avoids double counting)
        window.calculatePayrollFromState = function(emp, state) {
            const d = JSON.parse(JSON.stringify(state)); 
            window.recalculatePayrollState(emp.department, d);
            if (emp.department === 'English') {
                const ot = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const gross = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0) + ot; const dedUSD = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = gross - dedUSD; const convert = netUSD - (parseFloat(d.cashOut)||0); const convLAK = convert * (parseFloat(d.exchangeRate)||0); const extra = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + (parseFloat(d.loanDeduction)||0); 
                return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut)||0 };
            }
            const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] }; let te = 0, td = 0;
            const isStandardLaoDept = !emp.department.includes('Accounts') && !emp.department.includes('Invitational Teachers') && !['English'].includes(emp.department) && !GS_DEPTS.includes(emp.department);
            cfg.earnings.forEach((f, currIndex) => {
                const v = parseFloat(d[f] || 0);
                if (isStandardLaoDept) {
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += v; } // Sum Index 9+ (Start Pay + after)
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += v; } 
                        else { te += v; }
                    }
                } else { 
                    if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) te += v; 
                }
            });
            if (d.overtimeAmount) te += parseFloat(d.overtimeAmount); cfg.deductions.forEach(f => td += parseFloat(d[f] || 0)); if (d.loanDeduction) td += parseFloat(d.loanDeduction);
            return { lak: Math.max(0, te - td), usd: 0 };
        };

        // 3. UI Updater Field (Ensures UI values refresh properly after auto-computation)
        window.updatePayrollField = async (f, v) => {
            if(f === 'notes') { currentPayrollState[f] = v; } else { currentPayrollState[f] = parseFloat(String(v).replace(/,/g, '')) || 0; }
            window.recalculatePayrollState(selectedEmployee.department, currentPayrollState);
            const updateUIField = (fieldName) => { const input = document.querySelector(`input[data-field="${fieldName}"]`); if(input) { const val = currentPayrollState[fieldName]; input.value = (val && parseFloat(val) !== 0) ? parseFloat(val).toLocaleString('en-US') : ''; } };
            if (selectedEmployee.department.includes('Accounts')) { updateUIField('ເງີນເດືອນພື້ນຖານ'); } else if (selectedEmployee.department.includes('Invitational Teachers')) { updateUIField('ເງີນເດືອນ'); } else if (selectedEmployee.department !== 'English' && !GS_DEPTS.includes(selectedEmployee.department)) { 
                const c = departmentConfigs[selectedEmployee.department]; 
                if(c && c.earnings.length > 9) { 
                    updateUIField(c.earnings[5]); // Basic
                    updateUIField(c.earnings[9]); // Start Pay
                } 
            }
            window.renderPreview();
        };

        // 4. Preview Window Render (Immune to label renaming)
        window.renderPreview = function() {
            if (!selectedEmployee) return; const dept = selectedEmployee.department;
            document.getElementById('prev-name').innerText = selectedEmployee.name; document.getElementById('prev-pos').innerText = selectedEmployee.position; document.getElementById('prev-dept').innerText = selectedEmployee.department; document.getElementById('prev-date').innerText = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); document.getElementById('prev-id').innerText = generateEmployeeID(selectedEmployee, editorMonth, editorYear); document.getElementById('prev-campus').innerText = selectedEmployee.campus;
            const pe = document.getElementById('prev-profile-pic'); if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
            const container = document.getElementById('preview-content'); if (dept === 'English') { renderEnglishPreview(container); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; let te = 0, td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

            const er = cfg.earnings.map((f, currIndex) => {
                const v = currentPayrollState[f] || 0; 
                const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); 
                const isStart = (isStandardLaoDept && currIndex === 9); 
                const isUSD = (f === 'Basic Pay (USD)'); 
                const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                
                if (isStandardLaoDept) { 
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += parseFloat(v); } 
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += parseFloat(v); } 
                        else { te += parseFloat(v); }
                    }
                } else { 
                    if (!isRate && !isUSD) te += parseFloat(v); 
                }
                
                if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                    let hClass = 'py-1 border-b border-gray-100'; let tClass = 'text-gray-800';
                    if (isBasicResult) { hClass = 'lao-indent bg-green-100 border-green-200'; tClass = 'text-green-900 font-bold'; } 
                    else if (isStart) { hClass = 'lao-indent bg-orange-100 border-orange-200'; tClass = 'text-orange-900 font-bold'; } 
                    else if ((isStandardLaoDept && (currIndex === 10 || currIndex === 11))) { hClass = 'bg-purple-100 border-purple-200'; tClass = 'text-purple-900 font-bold'; }
                    const valStr = isUSD ? formatUSD(v) : (isRate ? parseFloat(v).toLocaleString() : formatMoney(v)); return `<div class="flex justify-between text-xs transition-all ${hClass}"><span class="${tClass}">${f}</span><span class="font-mono ${tClass}">${valStr}</span></div>`;
                } return '';
            }).join('');
            
            let extraEarningsHTML = ''; if (currentPayrollState.overtimeAmount > 0) { te += parseFloat(currentPayrollState.overtimeAmount); extraEarningsHTML = `<div class="flex justify-between text-xs transition-all py-1 border-b border-gray-100 bg-yellow-50"><span class="text-gray-800 font-bold">Overtime (OT)</span><span class="font-mono text-gray-800 font-bold">${formatMoney(currentPayrollState.overtimeAmount)}</span></div>`; }
            const dr = cfg.deductions.map(f => { const v = currentPayrollState[f] || 0; td += parseFloat(v); return v > 0 ? `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-medium"><span>${f}</span><span class="font-mono">(${formatMoney(v)})</span></div>` : ''; }).join('');
            let extraDeductionsHTML = ''; if (currentPayrollState.loanDeduction > 0) { td += parseFloat(currentPayrollState.loanDeduction); const desc = currentPayrollState.loanDesc && currentPayrollState.loanDesc.trim() !== "" ? currentPayrollState.loanDesc : "Loan Repayment"; extraDeductionsHTML = `<div class="flex justify-between py-1 border-b text-xs text-red-700 font-bold bg-red-50"><span>${desc}</span><span class="font-mono">(${formatMoney(currentPayrollState.loanDeduction)})</span></div>`; }
            const totalDedRow = `<div class="flex justify-between mt-2 pt-2 bg-red-50 px-2 font-bold text-red-900 border-t border-red-200"><span>TOTAL DEDUCTIONS</span><span>(${formatMoney(td)})</span></div>`;
            const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
            let notesHTML = ''; if (!isGS && dept !== 'English') { notesHTML += `<div class="mt-6 pt-4 border-t-2 border-gray-200"><h4 class="font-bold text-xs text-gray-700 underline mb-2">ໝາຍເຫດ:</h4><ol class="list-decimal list-inside text-[10px] text-gray-600 space-y-1"><li>ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ</li><li>ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ</li><li>ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.</li></ol></div>`; }
            if (currentPayrollState.notes) { const borderClass = notesHTML ? 'mt-2 pt-2 border-t border-gray-100' : 'mt-4 pt-2 border-t-2 border-gray-200'; notesHTML += `<div class="${borderClass} text-[10px]"><p class="font-bold text-gray-700">Additional Notes:</p><p class="whitespace-pre-wrap text-gray-600">${currentPayrollState.notes}</p></div>`; }

            const loanDetailsHTML = renderPayslipLoanSection(selectedEmployee);
            container.innerHTML = `<div class="space-y-4"><div><h3 class="font-bold border-b-2 border-blue-200 text-blue-800 text-xs uppercase tracking-tight">Earnings</h3>${er}${extraEarningsHTML}<div class="flex justify-between mt-2 pt-2 bg-yellow-50 px-2 font-bold text-yellow-900 border-t border-yellow-200"><span>Total Earnings</span><span>${formatMoney(te)}</span></div></div><div><h3 class="font-bold border-b-2 border-red-200 text-red-800 text-xs uppercase tracking-tight">Deductions</h3>${dr}${extraDeductionsHTML}${totalDedRow}</div>${loanDetailsHTML}<div id="net-pay-block" class="bg-blue-900 text-white p-3 rounded flex justify-between items-center font-bold"><span class="text-white">NET PAY (LAK)</span><span class="text-xl font-mono text-white font-bold">${formatMoney(te - td)}</span></div>${notesHTML}</div>`;
        };

        // 5. WhatsApp & Email Generator (Immune to label renaming)
        window.constructPayslipMessage = function() {
            if (!selectedEmployee) return "";
            const dept = selectedEmployee.department;
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
            const state = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState);
            const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString();
            const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear);
            const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const fLAK = (n) => formatMoney(n);

            let msg = `🏫 *NEERADA SCHOOL*\nExcellence in Education\nCampus: ${selectedEmployee.campus || 'N/A'}\n========================\n📄 *PAYSLIP*\nDate: ${dateStr}\n------------------------\n👤 *EMPLOYEE INFO*\nName: ${selectedEmployee.name}\nPosition: ${selectedEmployee.position}\nDepartment: ${selectedEmployee.department}\nEmployee ID: ${empID}\n========================\n\n`;

            if(dept === 'English') {
                const d = state; const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK;
                msg += `💵 *EARNINGS (USD)*\nBasic Pay: ${fUSD(d.basicPay)}\nAccumulated: ${fUSD(d.accumulated)}\nIncreased: ${fUSD(d.increase)}\nOthers: ${fUSD(d.earningsOthersUSD)}\n\n⏱️ *OVERTIME (USD)*\nHours: ${d.otHours} | Rate: $${d.otRate}/hr\nPayment: ${fUSD(otPayment)}\n\n🌟 *EXTRA WORK (LAK)*\nIT: ${fLAK(d.itLAK)}\nOthers: ${fLAK(d.extraWorkOthersLAK)}\nStipend: ${fLAK(d.stipendLAK)}\n\nGross Pay: ${fUSD(grossUSD)}\nRate USD to LAK: ${fLAK(d.exchangeRate)}\n\n📉 *DEDUCTIONS*\nProf. Tax: (${fUSD(d.profTax)})\nAbsences: (${fUSD(d.absences)})\nVisa: (${fUSD(d.visa)})\nOthers: (${fUSD(d.deductionsOthersUSD)})\nTOTAL DEDUCTIONS (USD): (${fUSD(dedUSDSum)})\n\nInsurance (LAK): (${fLAK(d.insuranceLAK)})\nOthers (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(loanDed > 0) { const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment"; msg += `${desc} (LAK): (${fLAK(loanDed)})\n`; }
                msg += `Total Deductions (LAK): (${fLAK(dedLAK)})\n\n========================\nNet Pay (USD): ${fUSD(netUSD)}\nCash out: ${fUSD(d.cashOut)}\nConvertible to LAK: ${fUSD(convertible)}\n💰 *SALARY PAY (LAK): ${fLAK(finalLAK)}*\n========================\n`;
                if (d.notes) msg += `\n📝 Notes: ${d.notes}\n`;
            } else {
                let te = 0; let td = 0; msg += `💵 *EARNINGS*\n`;
                const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0;
                    let shouldInclude = false;
                    if (isStandardLaoDept) {
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (currIndex >= 9) shouldInclude = true; } 
                            else if (cfg.earnings.length > 5) { if (currIndex >= 5) shouldInclude = true; } 
                            else { shouldInclude = true; }
                        }
                    } else {
                         if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) { shouldInclude = true; }
                    }

                    if (shouldInclude) te += parseFloat(v);

                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'));
                    const isStart = (isStandardLaoDept && currIndex === 9);
                    const isUSD = (f === 'Basic Pay (USD)');
                    const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');

                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                        const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v));
                        msg += `- ${f}: ${valStr}\n`;
                    }
                });
                
                if (state.overtimeAmount > 0) { te += parseFloat(state.overtimeAmount); msg += `- Overtime (OT): ${formatMoney(state.overtimeAmount)}\n`; }
                msg += `\n*Total Earnings: ${formatMoney(te)}*\n\n📉 *DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => { const v = state[f] || 0; if (v > 0) { td += parseFloat(v); msg += `- ${f}: (${formatMoney(v)})\n`; } });
                
                if (state.loanDeduction > 0) { td += parseFloat(state.loanDeduction); const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment"; msg += `- ${desc}: (${formatMoney(state.loanDeduction)})\n`; }

                msg += `\n*Total Deductions: (${formatMoney(td)})*\n\n========================\n💰 *NET PAY (LAK): ${formatMoney(te - td)}*\n========================\n`;
                msg += getPayslipLoanMessage(selectedEmployee);
                
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) { msg += `\nໝາຍເຫດ:\n1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`; }
                if (state.notes) { msg += `\n📝 Additional Notes: ${state.notes}\n`; }
            }
            msg += getPayslipLoanMessage(selectedEmployee);
            msg += `\n_Computer Generated message._\n© ${new Date().getFullYear()} Neerada School Payroll System`;
            return msg;
        };

        // 6. CSV Exporter (Immune to label renaming)
        window.exportDepartmentPayslipData = () => { 
            const dept = currentFilter.department; 
            if (dept === 'All') { alert("Please select a specific Department from the sidebar first to export its specific Payslip Data format."); return; } 
            const yr = document.getElementById('editor-year').value; 
            const mn = document.getElementById('editor-month').value; 
            const key = `${yr}-${mn}`; 
            const cfg = departmentConfigs[dept]; 
            if (!cfg) return alert("Configuration not found for this department."); 
            let headers = ["NAME", ...cfg.earnings, ...cfg.deductions, "NET PAY (LAK)"]; 
            let rows = [headers]; 
            const deptEmployees = employees.filter(e => e.department === dept); 
            const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && dept !== 'English' && !GS_DEPTS.includes(dept); 
            
            deptEmployees.forEach(emp => { 
                const payData = (emp.payrollHistory && emp.payrollHistory[key]) ? emp.payrollHistory[key] : {}; 
                let row = [emp.name]; 
                let totalEarnings = 0; 
                let totalDeductions = 0; 
                
                cfg.earnings.forEach((f, i) => { 
                    let val = payData[f] || 0; 
                    if (isStandardLaoDept) { 
                        if (cfg.earnings.length >= 10) { 
                            if (i === 5) { val = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); } 
                            if (i === 9) { const basic = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); val = basic + (parseFloat(payData[cfg.earnings[6]])||0) + (parseFloat(payData[cfg.earnings[7]])||0) + (parseFloat(payData[cfg.earnings[8]])||0); } 
                        } 
                    } 
                    row.push(val); 
                    
                    if (isStandardLaoDept) { 
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (i >= 9) totalEarnings += parseFloat(val); } 
                            else if (cfg.earnings.length > 5) { if (i >= 5) totalEarnings += parseFloat(val); } 
                            else { totalEarnings += parseFloat(val); }
                        }
                    } else { 
                        if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) {
                            totalEarnings += parseFloat(val);
                        }
                    }
                }); 
                
                if (payData.overtimeAmount) totalEarnings += parseFloat(payData.overtimeAmount); 
                cfg.deductions.forEach(f => { const val = payData[f] || 0; row.push(val); totalDeductions += parseFloat(val); }); 
                if (payData.loanDeduction) totalDeductions += parseFloat(payData.loanDeduction); 
                
                const netPay = Math.max(0, totalEarnings - totalDeductions); 
                row.push(netPay); 
                rows.push(row); 
            }); 
            
            const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); 
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement("a"); 
            a.href = url; a.download = `PayslipData_${dept}_${mn}_${yr}.csv`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); 
        };

        // 7. Ensure Edit Staff Modal Opens Safely
        window.editCurrentStaff = () => {
            try {
                if (!selectedEmployee || !selectedEmployee.id) {
                    alert("Please select an employee first from the left panel.");
                    return;
                }
                window.openStaffModal(selectedEmployee.id);
            } catch (e) {
                console.error("Error opening editor:", e);
                alert("Error launching editor: " + e.message);
            }
        };

    // ==========================================
        // PASTE ALL THE BUG FIXES & OVERRIDES HERE
        // ==========================================

        // 1. Fully Positional Recalculation (Immune to label renaming)
        window.recalculatePayrollState = function(dept, state) {
            if (dept.includes('Accounts')) { const usd = parseFloat(state['Basic Pay (USD)'] || 0); const rate = parseFloat(state['Exchange Rate (LAK)'] || 0); if (usd > 0 && rate > 0) state['ເງີນເດືອນພື້ນຖານ'] = usd * rate; }
            else if (dept.includes('Invitational Teachers')) { const hrs = parseFloat(state['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'] || 0); const rate = parseFloat(state['ອັດຕາຊົ່ວໂມງ (Rate per Hour)'] || 0); if (hrs > 0 && rate > 0) state['ເງີນເດືອນ'] = hrs * rate; }
            else if (dept !== 'English' && !GS_DEPTS.includes(dept)) {
                const cfg = departmentConfigs[dept];
                if (cfg && cfg.earnings.length >= 10) {
                    const earnList = cfg.earnings; 
                    const basicField = earnList[5]; 
                    const startField = earnList[9]; 
                    let bSum = 0; 
                    for(let i=0; i<=4; i++) { if(earnList[i]) bSum += parseFloat(state[earnList[i]]) || 0; }
                    state[basicField] = bSum;
                    let startSum = bSum; 
                    for(let i=6; i<=8; i++) { if(earnList[i]) startSum += parseFloat(state[earnList[i]]) || 0; }
                    state[startField] = startSum;
                }
            }
            return state;
        };

        // 2. Global Total Calculation (Immune to label renaming, avoids double counting)
        window.calculatePayrollFromState = function(emp, state) {
            const d = JSON.parse(JSON.stringify(state)); 
            window.recalculatePayrollState(emp.department, d);
            if (emp.department === 'English') {
                const ot = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const gross = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0) + ot; const dedUSD = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = gross - dedUSD; const convert = netUSD - (parseFloat(d.cashOut)||0); const convLAK = convert * (parseFloat(d.exchangeRate)||0); const extra = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + (parseFloat(d.loanDeduction)||0); 
                return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut)||0 };
            }
            const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] }; let te = 0, td = 0;
            const isStandardLaoDept = !emp.department.includes('Accounts') && !emp.department.includes('Invitational Teachers') && !['English'].includes(emp.department) && !GS_DEPTS.includes(emp.department);
            cfg.earnings.forEach((f, currIndex) => {
                const v = parseFloat(d[f] || 0);
                if (isStandardLaoDept) {
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += v; } // Sum Index 9+ (Start Pay + after)
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += v; } 
                        else { te += v; }
                    }
                } else { 
                    if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) te += v; 
                }
            });
            if (d.overtimeAmount) te += parseFloat(d.overtimeAmount); cfg.deductions.forEach(f => td += parseFloat(d[f] || 0)); if (d.loanDeduction) td += parseFloat(d.loanDeduction);
            return { lak: Math.max(0, te - td), usd: 0 };
        };

        // 3. UI Updater Field (Ensures UI values refresh properly after auto-computation)
        window.updatePayrollField = async (f, v) => {
            if(f === 'notes') { currentPayrollState[f] = v; } else { currentPayrollState[f] = parseFloat(String(v).replace(/,/g, '')) || 0; }
            window.recalculatePayrollState(selectedEmployee.department, currentPayrollState);
            const updateUIField = (fieldName) => { const input = document.querySelector(`input[data-field="${fieldName}"]`); if(input) { const val = currentPayrollState[fieldName]; input.value = (val && parseFloat(val) !== 0) ? parseFloat(val).toLocaleString('en-US') : ''; } };
            if (selectedEmployee.department.includes('Accounts')) { updateUIField('ເງີນເດືອນພື້ນຖານ'); } else if (selectedEmployee.department.includes('Invitational Teachers')) { updateUIField('ເງີນເດືອນ'); } else if (selectedEmployee.department !== 'English' && !GS_DEPTS.includes(selectedEmployee.department)) { 
                const c = departmentConfigs[selectedEmployee.department]; 
                if(c && c.earnings.length > 9) { 
                    updateUIField(c.earnings[5]); // Basic
                    updateUIField(c.earnings[9]); // Start Pay
                } 
            }
            window.renderPreview();
        };

        // 4. Preview Window Render (Immune to label renaming)
        window.renderPreview = function() {
            if (!selectedEmployee) return; const dept = selectedEmployee.department;
            document.getElementById('prev-name').innerText = selectedEmployee.name; document.getElementById('prev-pos').innerText = selectedEmployee.position; document.getElementById('prev-dept').innerText = selectedEmployee.department; document.getElementById('prev-date').innerText = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); document.getElementById('prev-id').innerText = generateEmployeeID(selectedEmployee, editorMonth, editorYear); document.getElementById('prev-campus').innerText = selectedEmployee.campus;
            const pe = document.getElementById('prev-profile-pic'); if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
            const container = document.getElementById('preview-content'); if (dept === 'English') { renderEnglishPreview(container); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; let te = 0, td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

            const er = cfg.earnings.map((f, currIndex) => {
                const v = currentPayrollState[f] || 0; 
                const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); 
                const isStart = (isStandardLaoDept && currIndex === 9); 
                const isUSD = (f === 'Basic Pay (USD)'); 
                const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                
                if (isStandardLaoDept) { 
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += parseFloat(v); } 
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += parseFloat(v); } 
                        else { te += parseFloat(v); }
                    }
                } else { 
                    if (!isRate && !isUSD) te += parseFloat(v); 
                }
                
                if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                    let hClass = 'py-1 border-b border-gray-100'; let tClass = 'text-gray-800';
                    if (isBasicResult) { hClass = 'lao-indent bg-green-100 border-green-200'; tClass = 'text-green-900 font-bold'; } 
                    else if (isStart) { hClass = 'lao-indent bg-orange-100 border-orange-200'; tClass = 'text-orange-900 font-bold'; } 
                    else if ((isStandardLaoDept && (currIndex === 10 || currIndex === 11))) { hClass = 'bg-purple-100 border-purple-200'; tClass = 'text-purple-900 font-bold'; }
                    const valStr = isUSD ? formatUSD(v) : (isRate ? parseFloat(v).toLocaleString() : formatMoney(v)); return `<div class="flex justify-between text-xs transition-all ${hClass}"><span class="${tClass}">${f}</span><span class="font-mono ${tClass}">${valStr}</span></div>`;
                } return '';
            }).join('');
            
            let extraEarningsHTML = ''; if (currentPayrollState.overtimeAmount > 0) { te += parseFloat(currentPayrollState.overtimeAmount); extraEarningsHTML = `<div class="flex justify-between text-xs transition-all py-1 border-b border-gray-100 bg-yellow-50"><span class="text-gray-800 font-bold">Overtime (OT)</span><span class="font-mono text-gray-800 font-bold">${formatMoney(currentPayrollState.overtimeAmount)}</span></div>`; }
            const dr = cfg.deductions.map(f => { const v = currentPayrollState[f] || 0; td += parseFloat(v); return v > 0 ? `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-medium"><span>${f}</span><span class="font-mono">(${formatMoney(v)})</span></div>` : ''; }).join('');
            let extraDeductionsHTML = ''; if (currentPayrollState.loanDeduction > 0) { td += parseFloat(currentPayrollState.loanDeduction); const desc = currentPayrollState.loanDesc && currentPayrollState.loanDesc.trim() !== "" ? currentPayrollState.loanDesc : "Loan Repayment"; extraDeductionsHTML = `<div class="flex justify-between py-1 border-b text-xs text-red-700 font-bold bg-red-50"><span>${desc}</span><span class="font-mono">(${formatMoney(currentPayrollState.loanDeduction)})</span></div>`; }
            const totalDedRow = `<div class="flex justify-between mt-2 pt-2 bg-red-50 px-2 font-bold text-red-900 border-t border-red-200"><span>TOTAL DEDUCTIONS</span><span>(${formatMoney(td)})</span></div>`;
            const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
            let notesHTML = ''; if (!isGS && dept !== 'English') { notesHTML += `<div class="mt-6 pt-4 border-t-2 border-gray-200"><h4 class="font-bold text-xs text-gray-700 underline mb-2">ໝາຍເຫດ:</h4><ol class="list-decimal list-inside text-[10px] text-gray-600 space-y-1"><li>ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ</li><li>ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ</li><li>ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.</li></ol></div>`; }
            if (currentPayrollState.notes) { const borderClass = notesHTML ? 'mt-2 pt-2 border-t border-gray-100' : 'mt-4 pt-2 border-t-2 border-gray-200'; notesHTML += `<div class="${borderClass} text-[10px]"><p class="font-bold text-gray-700">Additional Notes:</p><p class="whitespace-pre-wrap text-gray-600">${currentPayrollState.notes}</p></div>`; }

            const loanDetailsHTML = renderPayslipLoanSection(selectedEmployee);
            container.innerHTML = `<div class="space-y-4"><div><h3 class="font-bold border-b-2 border-blue-200 text-blue-800 text-xs uppercase tracking-tight">Earnings</h3>${er}${extraEarningsHTML}<div class="flex justify-between mt-2 pt-2 bg-yellow-50 px-2 font-bold text-yellow-900 border-t border-yellow-200"><span>Total Earnings</span><span>${formatMoney(te)}</span></div></div><div><h3 class="font-bold border-b-2 border-red-200 text-red-800 text-xs uppercase tracking-tight">Deductions</h3>${dr}${extraDeductionsHTML}${totalDedRow}</div>${loanDetailsHTML}<div id="net-pay-block" class="bg-blue-900 text-white p-3 rounded flex justify-between items-center font-bold"><span class="text-white">NET PAY (LAK)</span><span class="text-xl font-mono text-white font-bold">${formatMoney(te - td)}</span></div>${notesHTML}</div>`;
        };

        // 5. WhatsApp & Email Generator (Immune to label renaming)
        window.constructPayslipMessage = function() {
            if (!selectedEmployee) return "";
            const dept = selectedEmployee.department;
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
            const state = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState);
            const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString();
            const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear);
            const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const fLAK = (n) => formatMoney(n);

            let msg = `🏫 *NEERADA SCHOOL*\nExcellence in Education\nCampus: ${selectedEmployee.campus || 'N/A'}\n========================\n📄 *PAYSLIP*\nDate: ${dateStr}\n------------------------\n👤 *EMPLOYEE INFO*\nName: ${selectedEmployee.name}\nPosition: ${selectedEmployee.position}\nDepartment: ${selectedEmployee.department}\nEmployee ID: ${empID}\n========================\n\n`;

            if(dept === 'English') {
                const d = state; const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK;
                msg += `💵 *EARNINGS (USD)*\nBasic Pay: ${fUSD(d.basicPay)}\nAccumulated: ${fUSD(d.accumulated)}\nIncreased: ${fUSD(d.increase)}\nOthers: ${fUSD(d.earningsOthersUSD)}\n\n⏱️ *OVERTIME (USD)*\nHours: ${d.otHours} | Rate: $${d.otRate}/hr\nPayment: ${fUSD(otPayment)}\n\n🌟 *EXTRA WORK (LAK)*\nIT: ${fLAK(d.itLAK)}\nOthers: ${fLAK(d.extraWorkOthersLAK)}\nStipend: ${fLAK(d.stipendLAK)}\n\nGross Pay: ${fUSD(grossUSD)}\nRate USD to LAK: ${fLAK(d.exchangeRate)}\n\n📉 *DEDUCTIONS*\nProf. Tax: (${fUSD(d.profTax)})\nAbsences: (${fUSD(d.absences)})\nVisa: (${fUSD(d.visa)})\nOthers: (${fUSD(d.deductionsOthersUSD)})\nTOTAL DEDUCTIONS (USD): (${fUSD(dedUSDSum)})\n\nInsurance (LAK): (${fLAK(d.insuranceLAK)})\nOthers (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(loanDed > 0) { const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment"; msg += `${desc} (LAK): (${fLAK(loanDed)})\n`; }
                msg += `Total Deductions (LAK): (${fLAK(dedLAK)})\n\n========================\nNet Pay (USD): ${fUSD(netUSD)}\nCash out: ${fUSD(d.cashOut)}\nConvertible to LAK: ${fUSD(convertible)}\n💰 *SALARY PAY (LAK): ${fLAK(finalLAK)}*\n========================\n`;
                if (d.notes) msg += `\n📝 Notes: ${d.notes}\n`;
            } else {
                let te = 0; let td = 0; msg += `💵 *EARNINGS*\n`;
                const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0;
                    let shouldInclude = false;
                    if (isStandardLaoDept) {
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (currIndex >= 9) shouldInclude = true; } 
                            else if (cfg.earnings.length > 5) { if (currIndex >= 5) shouldInclude = true; } 
                            else { shouldInclude = true; }
                        }
                    } else {
                         if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) { shouldInclude = true; }
                    }

                    if (shouldInclude) te += parseFloat(v);

                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'));
                    const isStart = (isStandardLaoDept && currIndex === 9);
                    const isUSD = (f === 'Basic Pay (USD)');
                    const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');

                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                        const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v));
                        msg += `- ${f}: ${valStr}\n`;
                    }
                });
                
                if (state.overtimeAmount > 0) { te += parseFloat(state.overtimeAmount); msg += `- Overtime (OT): ${formatMoney(state.overtimeAmount)}\n`; }
                msg += `\n*Total Earnings: ${formatMoney(te)}*\n\n📉 *DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => { const v = state[f] || 0; if (v > 0) { td += parseFloat(v); msg += `- ${f}: (${formatMoney(v)})\n`; } });
                
                if (state.loanDeduction > 0) { td += parseFloat(state.loanDeduction); const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment"; msg += `- ${desc}: (${formatMoney(state.loanDeduction)})\n`; }

                msg += `\n*Total Deductions: (${formatMoney(td)})*\n\n========================\n💰 *NET PAY (LAK): ${formatMoney(te - td)}*\n========================\n`;
                
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) { msg += `\nໝາຍເຫດ:\n1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`; }
                if (state.notes) { msg += `\n📝 Additional Notes: ${state.notes}\n`; }
            }
            msg += `\n_Computer Generated message._\n© ${new Date().getFullYear()} Neerada School Payroll System`;
            return msg;
        };

        // 6. CSV Exporter (Immune to label renaming)
        window.exportDepartmentPayslipData = () => { 
            const dept = currentFilter.department; 
            if (dept === 'All') { alert("Please select a specific Department from the sidebar first to export its specific Payslip Data format."); return; } 
            const yr = document.getElementById('editor-year').value; 
            const mn = document.getElementById('editor-month').value; 
            const key = `${yr}-${mn}`; 
            const cfg = departmentConfigs[dept]; 
            if (!cfg) return alert("Configuration not found for this department."); 
            let headers = ["NAME", ...cfg.earnings, ...cfg.deductions, "NET PAY (LAK)"]; 
            let rows = [headers]; 
            const deptEmployees = employees.filter(e => e.department === dept); 
            const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && dept !== 'English' && !GS_DEPTS.includes(dept); 
            
            deptEmployees.forEach(emp => { 
                const payData = (emp.payrollHistory && emp.payrollHistory[key]) ? emp.payrollHistory[key] : {}; 
                let row = [emp.name]; 
                let totalEarnings = 0; 
                let totalDeductions = 0; 
                
                cfg.earnings.forEach((f, i) => { 
                    let val = payData[f] || 0; 
                    if (isStandardLaoDept) { 
                        if (cfg.earnings.length >= 10) { 
                            if (i === 5) { val = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); } 
                            if (i === 9) { const basic = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); val = basic + (parseFloat(payData[cfg.earnings[6]])||0) + (parseFloat(payData[cfg.earnings[7]])||0) + (parseFloat(payData[cfg.earnings[8]])||0); } 
                        } 
                    } 
                    row.push(val); 
                    
                    if (isStandardLaoDept) { 
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (i >= 9) totalEarnings += parseFloat(val); } 
                            else if (cfg.earnings.length > 5) { if (i >= 5) totalEarnings += parseFloat(val); } 
                            else { totalEarnings += parseFloat(val); }
                        }
                    } else { 
                        if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) {
                            totalEarnings += parseFloat(val);
                        }
                    }
                }); 
                
                if (payData.overtimeAmount) totalEarnings += parseFloat(payData.overtimeAmount); 
                cfg.deductions.forEach(f => { const val = payData[f] || 0; row.push(val); totalDeductions += parseFloat(val); }); 
                if (payData.loanDeduction) totalDeductions += parseFloat(payData.loanDeduction); 
                
                const netPay = Math.max(0, totalEarnings - totalDeductions); 
                row.push(netPay); 
                rows.push(row); 
            }); 
            
            const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); 
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement("a"); 
            a.href = url; a.download = `PayslipData_${dept}_${mn}_${yr}.csv`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); 
        };

        // 7. Ensure Edit Staff Modal Opens Safely
        window.editCurrentStaff = () => {
            try {
                if (!selectedEmployee || !selectedEmployee.id) {
                    alert("Please select an employee first from the left panel.");
                    return;
                }
                window.openStaffModal(selectedEmployee.id);
            } catch (e) {
                console.error("Error opening editor:", e);
                alert("Error launching editor: " + e.message);
            }
        };

        // 8. Fix Add Staff & Department Dropdown in Modal
        window.filterModalDepts = (preselectValue = null) => {
            try {
                const campus = document.getElementById('form-campus').value || 'Sibounheuang';
                const deptSelect = document.getElementById('form-department');
                if(!deptSelect) return;

                const currentVal = preselectValue || deptSelect.value;
                
                // Fallbacks in case global arrays are empty or not ready
                const aca = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Academic Head - Kinder', 'Academic Head - Primary', 'Academic Head - HS', 'Vice Principal'];
                const gs = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers (ຄູຮັບເຊີນ)', 'Cooks (ແມ່ຄົວ)', 'Cleaners (ພະນັກງານອະນາໄມ)', 'Drivers (ພະນັກງານຂັບລົດ)', 'Repair (ສ້ອມແປງ)'];
                
                // Get all departments currently configured in the system
                let allDepts = typeof departmentConfigs !== 'undefined' ? Object.keys(departmentConfigs) : [];
                if(allDepts.length === 0) allDepts = [...aca, ...gs];

                const isGS = (campus === 'General Services');

                // Filter options based on Campus
                const filteredOptions = allDepts.filter(d => {
                    const isAcaDef = aca.includes(d);
                    const isGSDef = gs.includes(d);
                    if (isGS) return isGSDef || (!isAcaDef && !isGSDef); // Show GS + custom ones
                    else return isAcaDef || (!isAcaDef && !isGSDef); // Show Aca + custom ones
                });

                deptSelect.innerHTML = filteredOptions.map(d => `<option value="${d}">${d}</option>`).join('');

                // Apply correct selection
                if (preselectValue && filteredOptions.includes(preselectValue)) {
                    deptSelect.value = preselectValue;
                } else if (filteredOptions.includes(currentVal)) {
                    deptSelect.value = currentVal;
                } else if (filteredOptions.length > 0) {
                    deptSelect.value = filteredOptions[0];
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
            } catch (e) {
                console.error("Error filtering depts:", e);
            }
        };

        window.openStaffModal = (id) => {
            try {
                const form = document.getElementById('add-form');
                if(form) form.reset();
                document.getElementById('form-id').value = "";
                if(typeof window.clearModalPhoto === 'function') window.clearModalPhoto();
                
                const warn = document.getElementById('bank-name-warning');
                if(warn) warn.classList.add('hidden');
                const bName = document.getElementById('form-bank-name');
                if(bName) bName.classList.remove('border-red-500');

                if(id && typeof employees !== 'undefined') {
                    // EDIT EXISTING STAFF
                    const emp = employees.find(e => String(e.id) === String(id));
                    if (emp) {
                        document.getElementById('modal-title').innerText = "Edit Staff Details";
                        document.getElementById('form-id').value = emp.id;
                        document.getElementById('form-name').value = emp.name;
                        document.getElementById('form-position').value = emp.position;
                        if(bName) bName.value = emp.bankAccountName || "";

                        const targetCampus = emp.campus || "Sibounheuang";
                        document.getElementById('form-campus').value = targetCampus;

                        window.filterModalDepts(emp.department);
                        
                        document.getElementById('form-bank-lak').value = emp.bankLak || "";
                        const bUsd = document.getElementById('form-bank-usd');
                        if(bUsd) bUsd.value = emp.bankUsd || "";
                        const em = document.getElementById('form-email');
                        if(em) em.value = emp.email || "";
                        const wa = document.getElementById('form-whatsapp');
                        if(wa) wa.value = emp.whatsapp || "";
                        const stat = document.getElementById('form-status');
                        if(stat) stat.value = emp.status || "Active";
                        const visaTotal = document.getElementById('form-visa-total');
                        const visaPaid = document.getElementById('form-visa-paid');
                        if (visaTotal) visaTotal.value = emp.visaTotalCost || '';
                        if (visaPaid) visaPaid.value = emp.visaPaidAlready || '';

                        if(emp.profilePic) {
                            if(typeof tempProfilePic !== 'undefined') tempProfilePic = emp.profilePic;
                            const prev = document.getElementById('form-preview-pic');
                            if(prev) { prev.src = emp.profilePic; prev.classList.remove('hidden'); }
                            const dIcon = document.getElementById('form-default-icon');
                            if(dIcon) dIcon.classList.add('hidden');
                            const dBtn = document.getElementById('delete-modal-photo-btn');
                            if(dBtn) dBtn.classList.remove('hidden');
                        }
                    }
                } else {
                    // ADD NEW STAFF
                    document.getElementById('modal-title').innerText = "Add Staff";
                    document.getElementById('form-campus').value = "Sibounheuang";
                    const stat = document.getElementById('form-status');
                    if(stat) stat.value = "Active";
                    window.filterModalDepts(); // Populate empty dropdowns
                }

                const modal = document.getElementById('add-modal');
                if(modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
                if(typeof window.checkBankName === 'function' && bName) window.checkBankName(bName);

                if (window.lucide && typeof lucide.createIcons === 'function') {
                    lucide.createIcons();
                }
            } catch (e) {
                console.error("Error opening staff modal:", e);
                alert("Error launching modal: " + e.message);
            }
        };
       // ==========================================
        // PASTE ALL THE BUG FIXES & OVERRIDES HERE
        // ==========================================

        // 1. Fully Positional Recalculation (Immune to label renaming)
        window.recalculatePayrollState = function(dept, state) {
            if (dept.includes('Accounts')) { const usd = parseFloat(state['Basic Pay (USD)'] || 0); const rate = parseFloat(state['Exchange Rate (LAK)'] || 0); if (usd > 0 && rate > 0) state['ເງີນເດືອນພື້ນຖານ'] = usd * rate; }
            else if (dept.includes('Invitational Teachers')) { const hrs = parseFloat(state['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'] || 0); const rate = parseFloat(state['ອັດຕາຊົ່ວໂມງ (Rate per Hour)'] || 0); if (hrs > 0 && rate > 0) state['ເງີນເດືອນ'] = hrs * rate; }
            else if (dept !== 'English' && !GS_DEPTS.includes(dept)) {
                const cfg = departmentConfigs[dept];
                if (cfg && cfg.earnings.length >= 10) {
                    const earnList = cfg.earnings; 
                    const basicField = earnList[5]; 
                    const startField = earnList[9]; 
                    let bSum = 0; 
                    for(let i=0; i<=4; i++) { if(earnList[i]) bSum += parseFloat(state[earnList[i]]) || 0; }
                    state[basicField] = bSum;
                    let startSum = bSum; 
                    for(let i=6; i<=8; i++) { if(earnList[i]) startSum += parseFloat(state[earnList[i]]) || 0; }
                    state[startField] = startSum;
                }
            }
            return state;
        };

        // 2. Global Total Calculation (Immune to label renaming, avoids double counting)
        window.calculatePayrollFromState = function(emp, state) {
            const d = JSON.parse(JSON.stringify(state)); 
            window.recalculatePayrollState(emp.department, d);
            if (emp.department === 'English') {
                const ot = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const gross = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0) + ot; const dedUSD = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = gross - dedUSD; const convert = netUSD - (parseFloat(d.cashOut)||0); const convLAK = convert * (parseFloat(d.exchangeRate)||0); const extra = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + (parseFloat(d.loanDeduction)||0); 
                return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut)||0 };
            }
            const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] }; let te = 0, td = 0;
            const isStandardLaoDept = !emp.department.includes('Accounts') && !emp.department.includes('Invitational Teachers') && !['English'].includes(emp.department) && !GS_DEPTS.includes(emp.department);
            cfg.earnings.forEach((f, currIndex) => {
                const v = parseFloat(d[f] || 0);
                if (isStandardLaoDept) {
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += v; } // Sum Index 9+ (Start Pay + after)
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += v; } 
                        else { te += v; }
                    }
                } else { 
                    if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) te += v; 
                }
            });
            if (d.overtimeAmount) te += parseFloat(d.overtimeAmount); cfg.deductions.forEach(f => td += parseFloat(d[f] || 0)); if (d.loanDeduction) td += parseFloat(d.loanDeduction);
            return { lak: Math.max(0, te - td), usd: 0 };
        };

        // 3. UI Updater Field (Ensures UI values refresh properly after auto-computation)
        window.updatePayrollField = async (f, v) => {
            if(f === 'notes') { currentPayrollState[f] = v; } else { currentPayrollState[f] = parseFloat(String(v).replace(/,/g, '')) || 0; }
            window.recalculatePayrollState(selectedEmployee.department, currentPayrollState);
            const updateUIField = (fieldName) => { const input = document.querySelector(`input[data-field="${fieldName}"]`); if(input) { const val = currentPayrollState[fieldName]; input.value = (val && parseFloat(val) !== 0) ? parseFloat(val).toLocaleString('en-US') : ''; } };
            if (selectedEmployee.department.includes('Accounts')) { updateUIField('ເງີນເດືອນພື້ນຖານ'); } else if (selectedEmployee.department.includes('Invitational Teachers')) { updateUIField('ເງີນເດືອນ'); } else if (selectedEmployee.department !== 'English' && !GS_DEPTS.includes(selectedEmployee.department)) { 
                const c = departmentConfigs[selectedEmployee.department]; 
                if(c && c.earnings.length > 9) { 
                    updateUIField(c.earnings[5]); // Basic
                    updateUIField(c.earnings[9]); // Start Pay
                } 
            }
            window.renderPreview();
        };

        // 4. Preview Window Render (Immune to label renaming)
        window.renderPreview = function() {
            if (!selectedEmployee) return; const dept = selectedEmployee.department;
            document.getElementById('prev-name').innerText = selectedEmployee.name; document.getElementById('prev-pos').innerText = selectedEmployee.position; document.getElementById('prev-dept').innerText = selectedEmployee.department; document.getElementById('prev-date').innerText = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); document.getElementById('prev-id').innerText = generateEmployeeID(selectedEmployee, editorMonth, editorYear); document.getElementById('prev-campus').innerText = selectedEmployee.campus;
            const pe = document.getElementById('prev-profile-pic'); if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
            const container = document.getElementById('preview-content'); if (dept === 'English') { renderEnglishPreview(container); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; let te = 0, td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

            const er = cfg.earnings.map((f, currIndex) => {
                const v = currentPayrollState[f] || 0; 
                const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); 
                const isStart = (isStandardLaoDept && currIndex === 9); 
                const isUSD = (f === 'Basic Pay (USD)'); 
                const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                
                if (isStandardLaoDept) { 
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += parseFloat(v); } 
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += parseFloat(v); } 
                        else { te += parseFloat(v); }
                    }
                } else { 
                    if (!isRate && !isUSD) te += parseFloat(v); 
                }
                
                if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                    let hClass = 'py-1 border-b border-gray-100'; let tClass = 'text-gray-800';
                    if (isBasicResult) { hClass = 'lao-indent bg-green-100 border-green-200'; tClass = 'text-green-900 font-bold'; } 
                    else if (isStart) { hClass = 'lao-indent bg-orange-100 border-orange-200'; tClass = 'text-orange-900 font-bold'; } 
                    else if ((isStandardLaoDept && (currIndex === 10 || currIndex === 11))) { hClass = 'bg-purple-100 border-purple-200'; tClass = 'text-purple-900 font-bold'; }
                    const valStr = isUSD ? formatUSD(v) : (isRate ? parseFloat(v).toLocaleString() : formatMoney(v)); return `<div class="flex justify-between text-xs transition-all ${hClass}"><span class="${tClass}">${f}</span><span class="font-mono ${tClass}">${valStr}</span></div>`;
                } return '';
            }).join('');
            
            let extraEarningsHTML = ''; if (currentPayrollState.overtimeAmount > 0) { te += parseFloat(currentPayrollState.overtimeAmount); extraEarningsHTML = `<div class="flex justify-between text-xs transition-all py-1 border-b border-gray-100 bg-yellow-50"><span class="text-gray-800 font-bold">Overtime (OT)</span><span class="font-mono text-gray-800 font-bold">${formatMoney(currentPayrollState.overtimeAmount)}</span></div>`; }
            const dr = cfg.deductions.map(f => { const v = currentPayrollState[f] || 0; td += parseFloat(v); return v > 0 ? `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-medium"><span>${f}</span><span class="font-mono">(${formatMoney(v)})</span></div>` : ''; }).join('');
            let extraDeductionsHTML = ''; if (currentPayrollState.loanDeduction > 0) { td += parseFloat(currentPayrollState.loanDeduction); const desc = currentPayrollState.loanDesc && currentPayrollState.loanDesc.trim() !== "" ? currentPayrollState.loanDesc : "Loan Repayment"; extraDeductionsHTML = `<div class="flex justify-between py-1 border-b text-xs text-red-700 font-bold bg-red-50"><span>${desc}</span><span class="font-mono">(${formatMoney(currentPayrollState.loanDeduction)})</span></div>`; }
            const totalDedRow = `<div class="flex justify-between mt-2 pt-2 bg-red-50 px-2 font-bold text-red-900 border-t border-red-200"><span>TOTAL DEDUCTIONS</span><span>(${formatMoney(td)})</span></div>`;
            const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
            let notesHTML = ''; if (!isGS && dept !== 'English') { notesHTML += `<div class="mt-6 pt-4 border-t-2 border-gray-200"><h4 class="font-bold text-xs text-gray-700 underline mb-2">ໝາຍເຫດ:</h4><ol class="list-decimal list-inside text-[10px] text-gray-600 space-y-1"><li>ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ</li><li>ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ</li><li>ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.</li></ol></div>`; }
            if (currentPayrollState.notes) { const borderClass = notesHTML ? 'mt-2 pt-2 border-t border-gray-100' : 'mt-4 pt-2 border-t-2 border-gray-200'; notesHTML += `<div class="${borderClass} text-[10px]"><p class="font-bold text-gray-700">Additional Notes:</p><p class="whitespace-pre-wrap text-gray-600">${currentPayrollState.notes}</p></div>`; }

            container.innerHTML = `<div class="space-y-4"><div><h3 class="font-bold border-b-2 border-blue-200 text-blue-800 text-xs uppercase tracking-tight">Earnings</h3>${er}${extraEarningsHTML}<div class="flex justify-between mt-2 pt-2 bg-yellow-50 px-2 font-bold text-yellow-900 border-t border-yellow-200"><span>Total Earnings</span><span>${formatMoney(te)}</span></div></div><div><h3 class="font-bold border-b-2 border-red-200 text-red-800 text-xs uppercase tracking-tight">Deductions</h3>${dr}${extraDeductionsHTML}${totalDedRow}</div><div id="net-pay-block" class="bg-blue-900 text-white p-3 rounded flex justify-between items-center font-bold"><span class="text-white">NET PAY (LAK)</span><span class="text-xl font-mono text-white font-bold">${formatMoney(te - td)}</span></div>${notesHTML}</div>`;
        };

        // 5. WhatsApp & Email Generator (Immune to label renaming)
        window.constructPayslipMessage = function() {
            if (!selectedEmployee) return "";
            const dept = selectedEmployee.department;
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
            const state = getArounyEnglishPayrollState(selectedEmployee, `${editorYear}-${editorMonth}`, currentPayrollState);
            const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString();
            const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear);
            const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const fLAK = (n) => formatMoney(n);

            let msg = `🏫 *NEERADA SCHOOL*\nExcellence in Education\nCampus: ${selectedEmployee.campus || 'N/A'}\n========================\n📄 *PAYSLIP*\nDate: ${dateStr}\n------------------------\n👤 *EMPLOYEE INFO*\nName: ${selectedEmployee.name}\nPosition: ${selectedEmployee.position}\nDepartment: ${selectedEmployee.department}\nEmployee ID: ${empID}\n========================\n\n`;

            if(dept === 'English') {
                const d = state; const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK;
                msg += `💵 *EARNINGS (USD)*\nBasic Pay: ${fUSD(d.basicPay)}\nAccumulated: ${fUSD(d.accumulated)}\nIncreased: ${fUSD(d.increase)}\nOthers: ${fUSD(d.earningsOthersUSD)}\n\n⏱️ *OVERTIME (USD)*\nHours: ${d.otHours} | Rate: $${d.otRate}/hr\nPayment: ${fUSD(otPayment)}\n\n🌟 *EXTRA WORK (LAK)*\nIT: ${fLAK(d.itLAK)}\nOthers: ${fLAK(d.extraWorkOthersLAK)}\nStipend: ${fLAK(d.stipendLAK)}\n\nGross Pay: ${fUSD(grossUSD)}\nRate USD to LAK: ${fLAK(d.exchangeRate)}\n\n📉 *DEDUCTIONS*\nProf. Tax: (${fUSD(d.profTax)})\nAbsences: (${fUSD(d.absences)})\nVisa: (${fUSD(d.visa)})\nOthers: (${fUSD(d.deductionsOthersUSD)})\nTOTAL DEDUCTIONS (USD): (${fUSD(dedUSDSum)})\n\nInsurance (LAK): (${fLAK(d.insuranceLAK)})\nOthers (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(loanDed > 0) { const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment"; msg += `${desc} (LAK): (${fLAK(loanDed)})\n`; }
                msg += `Total Deductions (LAK): (${fLAK(dedLAK)})\n\n========================\nNet Pay (USD): ${fUSD(netUSD)}\nCash out: ${fUSD(d.cashOut)}\nConvertible to LAK: ${fUSD(convertible)}\n💰 *SALARY PAY (LAK): ${fLAK(finalLAK)}*\n========================\n`;
                if (d.notes) msg += `\n📝 Notes: ${d.notes}\n`;
            } else {
                let te = 0; let td = 0; msg += `💵 *EARNINGS*\n`;
                const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0;
                    let shouldInclude = false;
                    if (isStandardLaoDept) {
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (currIndex >= 9) shouldInclude = true; } 
                            else if (cfg.earnings.length > 5) { if (currIndex >= 5) shouldInclude = true; } 
                            else { shouldInclude = true; }
                        }
                    } else {
                         if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) { shouldInclude = true; }
                    }

                    if (shouldInclude) te += parseFloat(v);

                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'));
                    const isStart = (isStandardLaoDept && currIndex === 9);
                    const isUSD = (f === 'Basic Pay (USD)');
                    const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');

                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                        const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v));
                        msg += `- ${f}: ${valStr}\n`;
                    }
                });
                
                if (state.overtimeAmount > 0) { te += parseFloat(state.overtimeAmount); msg += `- Overtime (OT): ${formatMoney(state.overtimeAmount)}\n`; }
                msg += `\n*Total Earnings: ${formatMoney(te)}*\n\n📉 *DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => { const v = state[f] || 0; if (v > 0) { td += parseFloat(v); msg += `- ${f}: (${formatMoney(v)})\n`; } });
                
                if (state.loanDeduction > 0) { td += parseFloat(state.loanDeduction); const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment"; msg += `- ${desc}: (${formatMoney(state.loanDeduction)})\n`; }

                msg += `\n*Total Deductions: (${formatMoney(td)})*\n\n========================\n💰 *NET PAY (LAK): ${formatMoney(te - td)}*\n========================\n`;
                
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) { msg += `\nໝາຍເຫດ:\n1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`; }
                if (state.notes) { msg += `\n📝 Additional Notes: ${state.notes}\n`; }
            }
            msg += `\n_Computer Generated message._\n© ${new Date().getFullYear()} Neerada School Payroll System`;
            return msg;
        };

        // 6. CSV Exporter (Immune to label renaming)
        window.exportDepartmentPayslipData = () => { 
            const dept = currentFilter.department; 
            if (dept === 'All') { alert("Please select a specific Department from the sidebar first to export its specific Payslip Data format."); return; } 
            const yr = document.getElementById('editor-year').value; 
            const mn = document.getElementById('editor-month').value; 
            const key = `${yr}-${mn}`; 
            const cfg = departmentConfigs[dept]; 
            if (!cfg) return alert("Configuration not found for this department."); 
            let headers = ["NAME", ...cfg.earnings, ...cfg.deductions, "NET PAY (LAK)"]; 
            let rows = [headers]; 
            const deptEmployees = employees.filter(e => e.department === dept); 
            const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && dept !== 'English' && !GS_DEPTS.includes(dept); 
            
            deptEmployees.forEach(emp => { 
                const payData = (emp.payrollHistory && emp.payrollHistory[key]) ? emp.payrollHistory[key] : {}; 
                let row = [emp.name]; 
                let totalEarnings = 0; 
                let totalDeductions = 0; 
                
                cfg.earnings.forEach((f, i) => { 
                    let val = payData[f] || 0; 
                    if (isStandardLaoDept) { 
                        if (cfg.earnings.length >= 10) { 
                            if (i === 5) { val = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); } 
                            if (i === 9) { const basic = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); val = basic + (parseFloat(payData[cfg.earnings[6]])||0) + (parseFloat(payData[cfg.earnings[7]])||0) + (parseFloat(payData[cfg.earnings[8]])||0); } 
                        } 
                    } 
                    row.push(val); 
                    
                    if (isStandardLaoDept) { 
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (i >= 9) totalEarnings += parseFloat(val); } 
                            else if (cfg.earnings.length > 5) { if (i >= 5) totalEarnings += parseFloat(val); } 
                            else { totalEarnings += parseFloat(val); }
                        }
                    } else { 
                        if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) {
                            totalEarnings += parseFloat(val);
                        }
                    }
                }); 
                
                if (payData.overtimeAmount) totalEarnings += parseFloat(payData.overtimeAmount); 
                cfg.deductions.forEach(f => { const val = payData[f] || 0; row.push(val); totalDeductions += parseFloat(val); }); 
                if (payData.loanDeduction) totalDeductions += parseFloat(payData.loanDeduction); 
                
                const netPay = Math.max(0, totalEarnings - totalDeductions); 
                row.push(netPay); 
                rows.push(row); 
            }); 
            
            const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); 
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement("a"); 
            a.href = url; a.download = `PayslipData_${dept}_${mn}_${yr}.csv`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); 
        };

        // 7. Ensure Edit Staff Modal Opens Safely
        window.editCurrentStaff = () => {
            try {
                if (!selectedEmployee || !selectedEmployee.id) {
                    alert("Please select an employee first from the left panel.");
                    return;
                }
                window.openStaffModal(selectedEmployee.id);
            } catch (e) {
                console.error("Error opening editor:", e);
                alert("Error launching editor: " + e.message);
            }
        };

        // 8. Fix Add Staff & Department Dropdown in Modal
        window.filterModalDepts = (preselectValue = null) => {
            try {
                const campus = document.getElementById('form-campus').value || 'Sibounheuang';
                const deptSelect = document.getElementById('form-department');
                if(!deptSelect) return;

                const currentVal = preselectValue || deptSelect.value;
                
                // Fallbacks in case global arrays are empty or not ready
                const aca = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Academic Head - Kinder', 'Academic Head - Primary', 'Academic Head - HS', 'Vice Principal'];
                const gs = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers (ຄູຮັບເຊີນ)', 'Cooks (ແມ່ຄົວ)', 'Cleaners (ພະນັກງານອະນາໄມ)', 'Drivers (ພະນັກງານຂັບລົດ)', 'Repair (ສ້ອມແປງ)'];
                
                // Get all departments currently configured in the system
                let allDepts = typeof departmentConfigs !== 'undefined' ? Object.keys(departmentConfigs) : [];
                if(allDepts.length === 0) allDepts = [...aca, ...gs];

                const isGS = (campus === 'General Services');

                // Filter options based on Campus
                const filteredOptions = allDepts.filter(d => {
                    const isAcaDef = aca.includes(d);
                    const isGSDef = gs.includes(d);
                    if (isGS) return isGSDef || (!isAcaDef && !isGSDef); // Show GS + custom ones
                    else return isAcaDef || (!isAcaDef && !isGSDef); // Show Aca + custom ones
                });

                deptSelect.innerHTML = filteredOptions.map(d => `<option value="${d}">${d}</option>`).join('');

                // Apply correct selection
                if (preselectValue && filteredOptions.includes(preselectValue)) {
                    deptSelect.value = preselectValue;
                } else if (filteredOptions.includes(currentVal)) {
                    deptSelect.value = currentVal;
                } else if (filteredOptions.length > 0) {
                    deptSelect.value = filteredOptions[0];
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
            } catch (e) {
                console.error("Error filtering depts:", e);
            }
        };

        window.openStaffModal = (id) => {
            try {
                const form = document.getElementById('add-form');
                if(form) form.reset();
                document.getElementById('form-id').value = "";
                if(typeof window.clearModalPhoto === 'function') window.clearModalPhoto();
                
                const warn = document.getElementById('bank-name-warning');
                if(warn) warn.classList.add('hidden');
                const bName = document.getElementById('form-bank-name');
                if(bName) bName.classList.remove('border-red-500');

                if(id && typeof employees !== 'undefined') {
                    // EDIT EXISTING STAFF
                    const emp = employees.find(e => String(e.id) === String(id));
                    if (emp) {
                        document.getElementById('modal-title').innerText = "Edit Staff Details";
                        document.getElementById('form-id').value = emp.id;
                        document.getElementById('form-name').value = emp.name;
                        document.getElementById('form-position').value = emp.position;
                        if(bName) bName.value = emp.bankAccountName || "";

                        const targetCampus = emp.campus || "Sibounheuang";
                        document.getElementById('form-campus').value = targetCampus;

                        window.filterModalDepts(emp.department);
                        
                        document.getElementById('form-bank-lak').value = emp.bankLak || "";
                        const bUsd = document.getElementById('form-bank-usd');
                        if(bUsd) bUsd.value = emp.bankUsd || "";
                        const em = document.getElementById('form-email');
                        if(em) em.value = emp.email || "";
                        const wa = document.getElementById('form-whatsapp');
                        if(wa) wa.value = emp.whatsapp || "";
                        const stat = document.getElementById('form-status');
                        if(stat) stat.value = emp.status || "Active";

                        if(emp.profilePic) {
                            if(typeof tempProfilePic !== 'undefined') tempProfilePic = emp.profilePic;
                            const prev = document.getElementById('form-preview-pic');
                            if(prev) { prev.src = emp.profilePic; prev.classList.remove('hidden'); }
                            const dIcon = document.getElementById('form-default-icon');
                            if(dIcon) dIcon.classList.add('hidden');
                            const dBtn = document.getElementById('delete-modal-photo-btn');
                            if(dBtn) dBtn.classList.remove('hidden');
                        }
                    }
                } else {
                    // ADD NEW STAFF
                    document.getElementById('modal-title').innerText = "Add Staff";
                    document.getElementById('form-campus').value = "Sibounheuang";
                    const stat = document.getElementById('form-status');
                    if(stat) stat.value = "Active";
                    window.filterModalDepts(); // Populate empty dropdowns
                }

                const modal = document.getElementById('add-modal');
                if(modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
                if(typeof window.checkBankName === 'function' && bName) window.checkBankName(bName);

                if (window.lucide && typeof lucide.createIcons === 'function') {
                    lucide.createIcons();
                }
            } catch (e) {
                console.error("Error opening staff modal:", e);
                alert("Error launching modal: " + e.message);
            }
        };

        // 9. Fix Delete Staff, Profile Photo Upload/Removal, and Save Staff Logic
        window.deleteEmployee = async (id) => {
            try {
                if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
                await transact(STORE_EMPLOYEES, 'readwrite', s => s.delete(id));
                employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
                if (selectedEmployee && String(selectedEmployee.id) === String(id)) {
                    selectedEmployee = null;
                    const ea = document.getElementById('editor-area');
                    const es = document.getElementById('empty-state');
                    if(ea) ea.classList.add('hidden');
                    if(es) es.classList.remove('hidden');
                }
                if(typeof window.renderEmployeeList === 'function') window.renderEmployeeList();
                if(typeof window.renderDeptSidebar === 'function') window.renderDeptSidebar();
                if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            } catch (e) {
                console.error("Delete Error:", e);
                alert("Error deleting staff: " + e.message);
            }
        };

        window.handleProfileUpload = (input) => {
            try {
                const file = input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    tempProfilePic = e.target.result;
                    const prev = document.getElementById('form-preview-pic');
                    if(prev) {
                        prev.src = tempProfilePic;
                        prev.classList.remove('hidden');
                    }
                    const icon = document.getElementById('form-default-icon');
                    if(icon) icon.classList.add('hidden');
                    const btn = document.getElementById('delete-modal-photo-btn');
                    if(btn) btn.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } catch(e) {
                console.error("Upload Error:", e);
            }
        };

        window.clearModalPhoto = () => {
            try {
                tempProfilePic = null; // Forces photo to null on save
                const input = document.getElementById('form-profile-pic');
                if(input) input.value = "";
                const prev = document.getElementById('form-preview-pic');
                if(prev) {
                    prev.src = "";
                    prev.classList.add('hidden');
                }
                const icon = document.getElementById('form-default-icon');
                if(icon) icon.classList.remove('hidden'); // Show default blank user icon
                const btn = document.getElementById('delete-modal-photo-btn');
                if(btn) btn.classList.add('hidden'); // Hide the remove button
            } catch(e) {
                console.error("Clear Photo Error:", e);
            }
        };

        window.saveEmployee = async (e) => {
            e.preventDefault();
            try {
                const fd = new FormData(e.target);
                const data = Object.fromEntries(fd.entries());
                const ex = employees.find(x => String(x.id) === String(data.id));
                data.id = data.id || 'EMP_' + Date.now();
                data.payrollHistory = ex ? (ex.payrollHistory || {}) : {};
                
                // Explicitly set the profile pic to the current tempProfilePic
                // If it was cleared using the button, tempProfilePic is null
                data.profilePic = (typeof tempProfilePic !== 'undefined') ? tempProfilePic : null;
                data.lastModified = new Date().toISOString();
                
                if (ex && ex.activeLoans) data.activeLoans = ex.activeLoans;
                if (ex && ex.archivedLoans) data.archivedLoans = ex.archivedLoans;
                if (ex && ex.department !== data.department) {
                    const movementNote = prompt(`Staff movement: ${ex.department} → ${data.department}\n\nEnter a note for this movement (optional):`, '');
                    if (movementNote === null) return;
                    data.movementHistory = Array.isArray(ex.movementHistory) ? ex.movementHistory.slice() : [];
                    data.movementHistory.push({ from: ex.department, to: data.department, date: new Date().toISOString(), note: movementNote.trim() });
                } else if (ex && Array.isArray(ex.movementHistory)) {
                    data.movementHistory = ex.movementHistory.slice();
                }
                if (data.department === 'English') {
                    data.visaTotalCost = Math.max(0, parseFloat(data.visaTotalCost || 0) || 0);
                    data.visaPaidAlready = Math.min(data.visaTotalCost, Math.max(0, parseFloat(data.visaPaidAlready || 0) || 0));
                } else if (ex) {
                    if (ex.visaTotalCost !== undefined) data.visaTotalCost = ex.visaTotalCost;
                    if (ex.visaPaidAlready !== undefined) data.visaPaidAlready = ex.visaPaidAlready;
                    else { delete data.visaTotalCost; delete data.visaPaidAlready; }
                } else {
                    delete data.visaTotalCost;
                    delete data.visaPaidAlready;
                }
                
                await transact(STORE_EMPLOYEES, 'readwrite', (s) => s.put(data));
                employees = await transact(STORE_EMPLOYEES, 'readonly', (s) => s.getAll());
                
                if(typeof window.renderEmployeeList === 'function') window.renderEmployeeList();
                if(typeof window.renderDeptSidebar === 'function') window.renderDeptSidebar();
                if(typeof window.closeModal === 'function') window.closeModal();
                if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
                
                if(selectedEmployee && String(selectedEmployee.id) === String(data.id)) {
                    selectedEmployee = employees.find(x => String(x.id) === String(data.id));
                    if(typeof window.renderPreview === 'function') window.renderPreview();
                }
            } catch (error) {
                console.error("Save Employee Error:", error);
                alert("Error saving staff: " + error.message);
            }
        };

       // ==========================================
        // PASTE ALL THE BUG FIXES & OVERRIDES HERE
        // ==========================================

        // 1. Fully Positional Recalculation (Immune to label renaming)
        window.recalculatePayrollState = function(dept, state) {
            if (dept.includes('Accounts')) { const usd = parseFloat(state['Basic Pay (USD)'] || 0); const rate = parseFloat(state['Exchange Rate (LAK)'] || 0); if (usd > 0 && rate > 0) state['ເງີນເດືອນພື້ນຖານ'] = usd * rate; }
            else if (dept.includes('Invitational Teachers')) { const hrs = parseFloat(state['ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)'] || 0); const rate = parseFloat(state['ອັດຕາຊົ່ວໂມງ (Rate per Hour)'] || 0); if (hrs > 0 && rate > 0) state['ເງີນເດືອນ'] = hrs * rate; }
            else if (dept !== 'English' && !GS_DEPTS.includes(dept)) {
                const cfg = departmentConfigs[dept];
                if (cfg && cfg.earnings.length >= 10) {
                    const earnList = cfg.earnings; 
                    const basicField = earnList[5]; 
                    const startField = earnList[9]; 
                    let bSum = 0; 
                    for(let i=0; i<=4; i++) { if(earnList[i]) bSum += parseFloat(state[earnList[i]]) || 0; }
                    state[basicField] = bSum;
                    let startSum = bSum; 
                    for(let i=6; i<=8; i++) { if(earnList[i]) startSum += parseFloat(state[earnList[i]]) || 0; }
                    state[startField] = startSum;
                }
            }
            return state;
        };

        // 2. Global Total Calculation (Immune to label renaming, avoids double counting)
        window.calculatePayrollFromState = function(emp, state) {
            const d = JSON.parse(JSON.stringify(state)); 
            window.recalculatePayrollState(emp.department, d);
            if (emp.department === 'English') {
                const ot = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const gross = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0) + ot; const dedUSD = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = gross - dedUSD; const convert = netUSD - (parseFloat(d.cashOut)||0); const convLAK = convert * (parseFloat(d.exchangeRate)||0); const extra = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + (parseFloat(d.loanDeduction)||0); 
                return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut)||0 };
            }
            const cfg = departmentConfigs[emp.department] || { earnings: [], deductions: [] }; let te = 0, td = 0;
            const isStandardLaoDept = !emp.department.includes('Accounts') && !emp.department.includes('Invitational Teachers') && !['English'].includes(emp.department) && !GS_DEPTS.includes(emp.department);
            cfg.earnings.forEach((f, currIndex) => {
                const v = parseFloat(d[f] || 0);
                if (isStandardLaoDept) {
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += v; } // Sum Index 9+ (Start Pay + after)
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += v; } 
                        else { te += v; }
                    }
                } else { 
                    if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) te += v; 
                }
            });
            if (d.overtimeAmount) te += parseFloat(d.overtimeAmount); cfg.deductions.forEach(f => td += parseFloat(d[f] || 0)); if (d.loanDeduction) td += parseFloat(d.loanDeduction);
            return { lak: Math.max(0, te - td), usd: 0 };
        };

        // 3. UI Updater Field (Ensures UI values refresh properly after auto-computation)
        window.updatePayrollField = async (f, v) => {
            if(f === 'notes') { currentPayrollState[f] = v; } else { currentPayrollState[f] = parseFloat(String(v).replace(/,/g, '')) || 0; }
            window.recalculatePayrollState(selectedEmployee.department, currentPayrollState);
            const updateUIField = (fieldName) => { const input = document.querySelector(`input[data-field="${fieldName}"]`); if(input) { const val = currentPayrollState[fieldName]; input.value = (val && parseFloat(val) !== 0) ? parseFloat(val).toLocaleString('en-US') : ''; } };
            if (selectedEmployee.department.includes('Accounts')) { updateUIField('ເງີນເດືອນພື້ນຖານ'); } else if (selectedEmployee.department.includes('Invitational Teachers')) { updateUIField('ເງີນເດືອນ'); } else if (selectedEmployee.department !== 'English' && !GS_DEPTS.includes(selectedEmployee.department)) { 
                const c = departmentConfigs[selectedEmployee.department]; 
                if(c && c.earnings.length > 9) { 
                    updateUIField(c.earnings[5]); // Basic
                    updateUIField(c.earnings[9]); // Start Pay
                } 
            }
            window.renderPreview();
        };

        // 4. Preview Window Render (Immune to label renaming)
        window.renderPreview = function() {
            if (!selectedEmployee) return; const dept = selectedEmployee.department;
            document.getElementById('prev-name').innerText = selectedEmployee.name; document.getElementById('prev-pos').innerText = selectedEmployee.position; document.getElementById('prev-dept').innerText = selectedEmployee.department; document.getElementById('prev-date').innerText = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString(); document.getElementById('prev-id').innerText = generateEmployeeID(selectedEmployee, editorMonth, editorYear); document.getElementById('prev-campus').innerText = selectedEmployee.campus;
            const pe = document.getElementById('prev-profile-pic'); if(selectedEmployee.profilePic) { pe.src = selectedEmployee.profilePic; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
            const container = document.getElementById('preview-content'); if (dept === 'English') { renderEnglishPreview(container); return; }
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] }; let te = 0, td = 0; const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

            const er = cfg.earnings.map((f, currIndex) => {
                const v = currentPayrollState[f] || 0; 
                const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === LAO_FIELDS.basic || f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ')); 
                const isStart = (isStandardLaoDept && currIndex === 9); 
                const isUSD = (f === 'Basic Pay (USD)'); 
                const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');
                
                if (isStandardLaoDept) { 
                    if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                        if (cfg.earnings.length > 9) { if (currIndex >= 9) te += parseFloat(v); } 
                        else if (cfg.earnings.length > 5) { if (currIndex >= 5) te += parseFloat(v); } 
                        else { te += parseFloat(v); }
                    }
                } else { 
                    if (!isRate && !isUSD) te += parseFloat(v); 
                }
                
                if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                    let hClass = 'py-1 border-b border-gray-100'; let tClass = 'text-gray-800';
                    if (isBasicResult) { hClass = 'lao-indent bg-green-100 border-green-200'; tClass = 'text-green-900 font-bold'; } 
                    else if (isStart) { hClass = 'lao-indent bg-orange-100 border-orange-200'; tClass = 'text-orange-900 font-bold'; } 
                    else if ((isStandardLaoDept && (currIndex === 10 || currIndex === 11))) { hClass = 'bg-purple-100 border-purple-200'; tClass = 'text-purple-900 font-bold'; }
                    const valStr = isUSD ? formatUSD(v) : (isRate ? parseFloat(v).toLocaleString() : formatMoney(v)); const displayLabel = f === 'ເພີ້ມປະຈຳປີ 2025-2026' ? getAnnualIncreaseDisplayLabel() : f; return `<div class="flex justify-between text-xs transition-all ${hClass}"><span class="${tClass}">${displayLabel}</span><span class="font-mono ${tClass}">${valStr}</span></div>`;
                } return '';
            }).join('');
            
            let extraEarningsHTML = ''; if (currentPayrollState.overtimeAmount > 0) { te += parseFloat(currentPayrollState.overtimeAmount); extraEarningsHTML = `<div class="flex justify-between text-xs transition-all py-1 border-b border-gray-100 bg-yellow-50"><span class="text-gray-800 font-bold">Overtime (OT)</span><span class="font-mono text-gray-800 font-bold">${formatMoney(currentPayrollState.overtimeAmount)}</span></div>`; }
            const dr = cfg.deductions.map(f => { const v = currentPayrollState[f] || 0; td += parseFloat(v); return v > 0 ? `<div class="flex justify-between py-1 border-b text-xs text-red-600 font-medium"><span>${f}</span><span class="font-mono">(${formatMoney(v)})</span></div>` : ''; }).join('');
            let extraDeductionsHTML = ''; if (currentPayrollState.loanDeduction > 0) { td += parseFloat(currentPayrollState.loanDeduction); const desc = currentPayrollState.loanDesc && currentPayrollState.loanDesc.trim() !== "" ? currentPayrollState.loanDesc : "Loan Repayment"; extraDeductionsHTML = `<div class="flex justify-between py-1 border-b text-xs text-red-700 font-bold bg-red-50"><span>${desc}</span><span class="font-mono">(${formatMoney(currentPayrollState.loanDeduction)})</span></div>`; }
            const totalDedRow = `<div class="flex justify-between mt-2 pt-2 bg-red-50 px-2 font-bold text-red-900 border-t border-red-200"><span>TOTAL DEDUCTIONS</span><span>(${formatMoney(td)})</span></div>`;
            const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
            let notesHTML = ''; if (!isGS && dept !== 'English') { notesHTML += `<div class="mt-6 pt-4 border-t-2 border-gray-200"><h4 class="font-bold text-xs text-gray-700 underline mb-2">ໝາຍເຫດ:</h4><ol class="list-decimal list-inside text-[10px] text-gray-600 space-y-1"><li>ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ</li><li>ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ</li><li>ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.</li></ol></div>`; }
            if (currentPayrollState.notes) { const borderClass = notesHTML ? 'mt-2 pt-2 border-t border-gray-100' : 'mt-4 pt-2 border-t-2 border-gray-200'; notesHTML += `<div class="${borderClass} text-[10px]"><p class="font-bold text-gray-700">Additional Notes:</p><p class="whitespace-pre-wrap text-gray-600">${currentPayrollState.notes}</p></div>`; }
            notesHTML += getGlobalPayslipNoteHTML();

            const loanDetailsHTML = renderPayslipLoanSection(selectedEmployee);
            const visaDetailsHTML = renderEnglishVisaSection(selectedEmployee, currentPayrollState);
            container.innerHTML = `<div class="space-y-4"><div><h3 class="font-bold border-b-2 border-blue-200 text-blue-800 text-xs uppercase tracking-tight">Earnings</h3>${er}${extraEarningsHTML}<div class="flex justify-between mt-2 pt-2 bg-yellow-50 px-2 font-bold text-yellow-900 border-t border-yellow-200"><span>Total Earnings</span><span>${formatMoney(te)}</span></div></div><div><h3 class="font-bold border-b-2 border-red-200 text-red-800 text-xs uppercase tracking-tight">Deductions</h3>${dr}${extraDeductionsHTML}${totalDedRow}</div>${loanDetailsHTML}${visaDetailsHTML}<div id="net-pay-block" class="payslip-salary-box bg-blue-900 text-white p-3 rounded flex justify-between items-center font-bold"><span class="text-white">NET PAY (LAK)</span><span class="text-xl font-mono text-white font-bold">${formatMoney(te - td)}</span></div>${notesHTML}</div>`;
        };

        // 5. WhatsApp & Email Generator (Immune to label renaming)
        window.constructPayslipMessage = function() {
            if (!selectedEmployee) return "";
            const dept = selectedEmployee.department;
            const cfg = departmentConfigs[dept] || { earnings: [], deductions: [] };
            const state = currentPayrollState;
            const dateStr = new Date(editorYear, MONTHS.indexOf(editorMonth) + 1, 0).toLocaleDateString();
            const empID = generateEmployeeID(selectedEmployee, editorMonth, editorYear);
            const fUSD = (n) => `$${parseFloat(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const fLAK = (n) => formatMoney(n);

            let msg = `🏫 *NEERADA SCHOOL*\nExcellence in Education\nCampus: ${selectedEmployee.campus || 'N/A'}\n========================\n📄 *PAYSLIP*\nDate: ${dateStr}\n------------------------\n👤 *EMPLOYEE INFO*\nName: ${selectedEmployee.name}\nPosition: ${selectedEmployee.position}\nDepartment: ${selectedEmployee.department}\nEmployee ID: ${empID}\n========================\n\n`;

            if(dept === 'English') {
                const d = state; const otPayment = (parseFloat(d.otHours)||0)*(parseFloat(d.otRate)||0); const earnSum = (parseFloat(d.basicPay)||0)+(parseFloat(d.accumulated)||0)+(parseFloat(d.increase)||0)+(parseFloat(d.earningsOthersUSD)||0); const grossUSD = earnSum + otPayment; const dedUSDSum = (parseFloat(d.profTax)||0)+(parseFloat(d.absences)||0)+(parseFloat(d.visa)||0)+(parseFloat(d.deductionsOthersUSD)||0); const netUSD = grossUSD - dedUSDSum; const convertible = netUSD - (parseFloat(d.cashOut)||0); const convertedLAK = convertible * (parseFloat(d.exchangeRate)||0); const extraLAK = (parseFloat(d.itLAK)||0)+(parseFloat(d.extraWorkOthersLAK)||0)+(parseFloat(d.stipendLAK)||0); const loanDed = parseFloat(d.loanDeduction)||0; const dedLAK = (parseFloat(d.insuranceLAK)||0)+(parseFloat(d.deductionsOthersLAK)||0) + loanDed; const finalLAK = convertedLAK + extraLAK - dedLAK;
                msg += `💵 *EARNINGS (USD)*\nBasic Pay: ${fUSD(d.basicPay)}\nAccumulated: ${fUSD(d.accumulated)}\nIncreased: ${fUSD(d.increase)}\nOthers: ${fUSD(d.earningsOthersUSD)}\n\n⏱️ *OVERTIME (USD)*\nHours: ${d.otHours} | Rate: $${d.otRate}/hr\nPayment: ${fUSD(otPayment)}\n\n🌟 *EXTRA WORK (LAK)*\nIT: ${fLAK(d.itLAK)}\nOthers: ${fLAK(d.extraWorkOthersLAK)}\nStipend: ${fLAK(d.stipendLAK)}\n\nGross Pay: ${fUSD(grossUSD)}\nRate USD to LAK: ${fLAK(d.exchangeRate)}\n\n📉 *DEDUCTIONS*\nProf. Tax: (${fUSD(d.profTax)})\nAbsences: (${fUSD(d.absences)})\nVisa: (${fUSD(d.visa)})\nOthers: (${fUSD(d.deductionsOthersUSD)})\nTOTAL DEDUCTIONS (USD): (${fUSD(dedUSDSum)})\n\nInsurance (LAK): (${fLAK(d.insuranceLAK)})\nOthers (LAK): (${fLAK(d.deductionsOthersLAK)})\n`;
                if(loanDed > 0) { const desc = d.loanDesc && d.loanDesc.trim() !== "" ? d.loanDesc : "Loan Repayment"; msg += `${desc} (LAK): (${fLAK(loanDed)})\n`; }
                msg += `Total Deductions (LAK): (${fLAK(dedLAK)})\n`;
                msg += getEnglishVisaMessage(selectedEmployee, d);
                msg += `\n========================\nNet Pay (USD): ${fUSD(netUSD)}\nCash out: ${fUSD(d.cashOut)}\nConvertible to LAK: ${fUSD(convertible)}\n💰 *SALARY PAY (LAK): ${fLAK(finalLAK)}*\n========================\n`;
                if (d.notes) msg += `\n📝 Notes: ${d.notes}\n`;
            } else {
                let te = 0; let td = 0; msg += `💵 *EARNINGS*\n`;
                const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && !GS_DEPTS.includes(dept);

                cfg.earnings.forEach((f, currIndex) => {
                    const v = state[f] || 0;
                    let shouldInclude = false;
                    if (isStandardLaoDept) {
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (currIndex >= 9) shouldInclude = true; } 
                            else if (cfg.earnings.length > 5) { if (currIndex >= 5) shouldInclude = true; } 
                            else { shouldInclude = true; }
                        }
                    } else {
                         if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) { shouldInclude = true; }
                    }

                    if (shouldInclude) te += parseFloat(v);

                    const isBasicResult = (isStandardLaoDept && currIndex === 5) || (!isStandardLaoDept && (f === 'ເງີນເດືອນພື້ນຖານ' || f === 'ເງີນເດືອນ'));
                    const isStart = (isStandardLaoDept && currIndex === 9);
                    const isUSD = (f === 'Basic Pay (USD)');
                    const isRate = (f === 'Exchange Rate (LAK)' || f === 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)' || f === 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)');

                    if (v > 0 || isBasicResult || isStart || isUSD || isRate) {
                        const valStr = isUSD ? fUSD(v) : (isRate ? parseFloat(v).toLocaleString() : fLAK(v));
                        msg += `- ${f}: ${valStr}\n`;
                    }
                });
                
                if (state.overtimeAmount > 0) { te += parseFloat(state.overtimeAmount); msg += `- Overtime (OT): ${formatMoney(state.overtimeAmount)}\n`; }
                msg += `\n*Total Earnings: ${formatMoney(te)}*\n\n📉 *DEDUCTIONS*\n`;
                cfg.deductions.forEach(f => { const v = state[f] || 0; if (v > 0) { td += parseFloat(v); msg += `- ${f}: (${formatMoney(v)})\n`; } });
                
                if (state.loanDeduction > 0) { td += parseFloat(state.loanDeduction); const desc = state.loanDesc && state.loanDesc.trim() !== "" ? state.loanDesc : "Loan Repayment"; msg += `- ${desc}: (${formatMoney(state.loanDeduction)})\n`; }

                msg += `\n*Total Deductions: (${formatMoney(td)})*\n\n========================\n💰 *NET PAY (LAK): ${formatMoney(te - td)}*\n========================\n`;
                
                const isGS = GS_DEPTS.includes(selectedEmployee.department) || selectedEmployee.campus === 'General Services';
                if (!isGS) { msg += `\nໝາຍເຫດ:\n1. ການຕອບຮັບຈາກ ຜປຄ ຫາຄູທີ່ສອນ/ຄູປະຈຳຫ້ອງ\n2. ຄວາມເປັນລະບຽບໃນຫ້ອງທີ່ສອນ: ຄວາມເປັນລະບຽບຂອງໂຕະຕັ່ງ, ຄວາມສະອາດ ແລະ ອື່ນໆ\n3. ທຸກໆການເຄື່ອນໄຫວໄປປະຊຸມ/ອອກວຽກກິດຈະກຳນອກ ຕ້ອງເຮັດບົດລາຍງານສົ່ງ.\n`; }
                if (state.notes) { msg += `\n📝 Additional Notes: ${state.notes}\n`; }
            }
            msg += getGlobalPayslipNoteMessage();
            msg += getPayslipLoanMessage(selectedEmployee);
            msg += `\n_Computer Generated message._\n© ${new Date().getFullYear()} Neerada School Payroll System`;
            return msg;
        };

        // 6. CSV Exporter (Immune to label renaming)
        window.exportDepartmentPayslipData = () => { 
            const dept = currentFilter.department; 
            if (dept === 'All') { alert("Please select a specific Department from the sidebar first to export its specific Payslip Data format."); return; } 
            const yr = document.getElementById('editor-year').value; 
            const mn = document.getElementById('editor-month').value; 
            const key = `${yr}-${mn}`; 
            const cfg = departmentConfigs[dept]; 
            if (!cfg) return alert("Configuration not found for this department."); 
            let headers = ["NAME", ...cfg.earnings, ...cfg.deductions, "NET PAY (LAK)"]; 
            let rows = [headers]; 
            const deptEmployees = employees.filter(e => e.department === dept); 
            const isStandardLaoDept = !dept.includes('Accounts') && !dept.includes('Invitational Teachers') && dept !== 'English' && !GS_DEPTS.includes(dept); 
            
            deptEmployees.forEach(emp => { 
                const payData = (emp.payrollHistory && emp.payrollHistory[key]) ? emp.payrollHistory[key] : {}; 
                let row = [emp.name]; 
                let totalEarnings = 0; 
                let totalDeductions = 0; 
                
                cfg.earnings.forEach((f, i) => { 
                    let val = payData[f] || 0; 
                    if (isStandardLaoDept) { 
                        if (cfg.earnings.length >= 10) { 
                            if (i === 5) { val = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); } 
                            if (i === 9) { const basic = [0,1,2,3,4].reduce((a, idx) => a + (parseFloat(payData[cfg.earnings[idx]])||0), 0); val = basic + (parseFloat(payData[cfg.earnings[6]])||0) + (parseFloat(payData[cfg.earnings[7]])||0) + (parseFloat(payData[cfg.earnings[8]])||0); } 
                        } 
                    } 
                    row.push(val); 
                    
                    if (isStandardLaoDept) { 
                        if (f !== 'Basic Pay (USD)' && f !== 'Exchange Rate (LAK)') {
                            if (cfg.earnings.length > 9) { if (i >= 9) totalEarnings += parseFloat(val); } 
                            else if (cfg.earnings.length > 5) { if (i >= 5) totalEarnings += parseFloat(val); } 
                            else { totalEarnings += parseFloat(val); }
                        }
                    } else { 
                        if (!['Basic Pay (USD)', 'Exchange Rate (LAK)', 'ຊົ່ວໂມງສອນທັງໝົດ (Total Hours Taught)', 'ອັດຕາຊົ່ວໂມງ (Rate per Hour)'].includes(f)) {
                            totalEarnings += parseFloat(val);
                        }
                    }
                }); 
                
                if (payData.overtimeAmount) totalEarnings += parseFloat(payData.overtimeAmount); 
                cfg.deductions.forEach(f => { const val = payData[f] || 0; row.push(val); totalDeductions += parseFloat(val); }); 
                if (payData.loanDeduction) totalDeductions += parseFloat(payData.loanDeduction); 
                
                const netPay = Math.max(0, totalEarnings - totalDeductions); 
                row.push(netPay); 
                rows.push(row); 
            }); 
            
            const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n"); 
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement("a"); 
            a.href = url; a.download = `PayslipData_${dept}_${mn}_${yr}.csv`; 
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); 
        };

        // 7. Ensure Edit Staff Modal Opens Safely
        window.editCurrentStaff = () => {
            try {
                if (!selectedEmployee || !selectedEmployee.id) {
                    alert("Please select an employee first from the left panel.");
                    return;
                }
                window.openStaffModal(selectedEmployee.id);
            } catch (e) {
                console.error("Error opening editor:", e);
                alert("Error launching editor: " + e.message);
            }
        };

        // 8. Fix Add Staff & Department Dropdown in Modal
        window.filterModalDepts = (preselectValue = null) => {
            try {
                const campus = document.getElementById('form-campus').value || 'Sibounheuang';
                const deptSelect = document.getElementById('form-department');
                if(!deptSelect) return;

                const currentVal = preselectValue || deptSelect.value;
                
                // Fallbacks in case global arrays are empty or not ready
                const aca = ['Kindergarten', 'Primary', 'Secondary', 'English', 'Academic Head - Kinder', 'Academic Head - Primary', 'Academic Head - HS', 'Vice Principal'];
                const gs = ['Accounts (ບັນຊີ)', 'Admin (ບໍລິຫານ)', 'Secretary (ເລຂານຸການ)', 'Invitational Teachers (ຄູຮັບເຊີນ)', 'Cooks (ແມ່ຄົວ)', 'Cleaners (ພະນັກງານອະນາໄມ)', 'Drivers (ພະນັກງານຂັບລົດ)', 'Repair (ສ້ອມແປງ)'];
                
                // Get all departments currently configured in the system
                let allDepts = typeof departmentConfigs !== 'undefined' ? Object.keys(departmentConfigs) : [];
                if(allDepts.length === 0) allDepts = [...aca, ...gs];

                const isGS = (campus === 'General Services');

                // Filter options based on Campus
                const filteredOptions = allDepts.filter(d => {
                    const isAcaDef = aca.includes(d);
                    const isGSDef = gs.includes(d);
                    if (isGS) return isGSDef || (!isAcaDef && !isGSDef); // Show GS + custom ones
                    else return isAcaDef || (!isAcaDef && !isGSDef); // Show Aca + custom ones
                });

                deptSelect.innerHTML = filteredOptions.map(d => `<option value="${d}">${d}</option>`).join('');

                // Apply correct selection
                if (preselectValue && filteredOptions.includes(preselectValue)) {
                    deptSelect.value = preselectValue;
                } else if (filteredOptions.includes(currentVal)) {
                    deptSelect.value = currentVal;
                } else if (filteredOptions.length > 0) {
                    deptSelect.value = filteredOptions[0];
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
            } catch (e) {
                console.error("Error filtering depts:", e);
            }
        };

        window.openStaffModal = (id) => {
            try {
                const form = document.getElementById('add-form');
                if(form) form.reset();
                document.getElementById('form-id').value = "";
                if(typeof window.clearModalPhoto === 'function') window.clearModalPhoto();
                
                const warn = document.getElementById('bank-name-warning');
                if(warn) warn.classList.add('hidden');
                const bName = document.getElementById('form-bank-name');
                if(bName) bName.classList.remove('border-red-500');

                if(id && typeof employees !== 'undefined') {
                    // EDIT EXISTING STAFF
                    const emp = employees.find(e => String(e.id) === String(id));
                    if (emp) {
                        document.getElementById('modal-title').innerText = "Edit Staff Details";
                        document.getElementById('form-id').value = emp.id;
                        document.getElementById('form-name').value = emp.name;
                        document.getElementById('form-position').value = emp.position;
                        if(bName) bName.value = emp.bankAccountName || "";

                        const targetCampus = emp.campus || "Sibounheuang";
                        document.getElementById('form-campus').value = targetCampus;

                        window.filterModalDepts(emp.department);
                        
                        document.getElementById('form-bank-lak').value = emp.bankLak || "";
                        const bUsd = document.getElementById('form-bank-usd');
                        if(bUsd) bUsd.value = emp.bankUsd || "";
                        const em = document.getElementById('form-email');
                        if(em) em.value = emp.email || "";
                        const wa = document.getElementById('form-whatsapp');
                        if(wa) wa.value = emp.whatsapp || "";
                        const stat = document.getElementById('form-status');
                        if(stat) stat.value = emp.status || "Active";
                        const visaTotal = document.getElementById('form-visa-total');
                        if(visaTotal) visaTotal.value = emp.visaTotalCost || '';
                        const visaDate = document.getElementById('form-visa-date');
                        if(visaDate) visaDate.value = emp.visaDate || '';
                        const visaPaid = document.getElementById('form-visa-paid');
                        if(visaPaid) visaPaid.value = emp.visaPaidAlready || '';

                        if(emp.profilePic) {
                            if(typeof tempProfilePic !== 'undefined') tempProfilePic = emp.profilePic;
                            const prev = document.getElementById('form-preview-pic');
                            if(prev) { prev.src = emp.profilePic; prev.classList.remove('hidden'); }
                            const dIcon = document.getElementById('form-default-icon');
                            if(dIcon) dIcon.classList.add('hidden');
                            const dBtn = document.getElementById('delete-modal-photo-btn');
                            if(dBtn) dBtn.classList.remove('hidden');
                        }
                    }
                } else {
                    // ADD NEW STAFF
                    document.getElementById('modal-title').innerText = "Add Staff";
                    document.getElementById('form-campus').value = "Sibounheuang";
                    const stat = document.getElementById('form-status');
                    if(stat) stat.value = "Active";
                    window.filterModalDepts(); // Populate empty dropdowns
                }

                const modal = document.getElementById('add-modal');
                if(modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }

                if(typeof window.toggleBankFields === 'function') window.toggleBankFields();
                if(typeof window.checkBankName === 'function' && bName) window.checkBankName(bName);

                if (window.lucide && typeof lucide.createIcons === 'function') {
                    lucide.createIcons();
                }
            } catch (e) {
                console.error("Error opening staff modal:", e);
                alert("Error launching modal: " + e.message);
            }
        };

        // 9. Fix Delete Staff, Profile Photo Upload/Removal, and Save Staff Logic
        window.deleteEmployee = async (id) => {
            try {
                if (!confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
                await transact(STORE_EMPLOYEES, 'readwrite', s => s.delete(id));
                employees = await transact(STORE_EMPLOYEES, 'readonly', s => s.getAll());
                if (selectedEmployee && String(selectedEmployee.id) === String(id)) {
                    selectedEmployee = null;
                    const ea = document.getElementById('editor-area');
                    const es = document.getElementById('empty-state');
                    if(ea) ea.classList.add('hidden');
                    if(es) es.classList.remove('hidden');
                }
                if(typeof window.renderEmployeeList === 'function') window.renderEmployeeList();
                if(typeof window.renderDeptSidebar === 'function') window.renderDeptSidebar();
                if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
            } catch (e) {
                console.error("Delete Error:", e);
                alert("Error deleting staff: " + e.message);
            }
        };

        window.handleProfileUpload = (input) => {
            try {
                const file = input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    tempProfilePic = e.target.result;
                    const prev = document.getElementById('form-preview-pic');
                    if(prev) {
                        prev.src = tempProfilePic;
                        prev.classList.remove('hidden');
                    }
                    const icon = document.getElementById('form-default-icon');
                    if(icon) icon.classList.add('hidden');
                    const btn = document.getElementById('delete-modal-photo-btn');
                    if(btn) btn.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } catch(e) {
                console.error("Upload Error:", e);
            }
        };

        window.clearModalPhoto = () => {
            try {
                tempProfilePic = null; // Forces photo to null on save
                const input = document.getElementById('form-profile-pic');
                if(input) input.value = "";
                const prev = document.getElementById('form-preview-pic');
                if(prev) {
                    prev.src = "";
                    prev.classList.add('hidden');
                }
                const icon = document.getElementById('form-default-icon');
                if(icon) icon.classList.remove('hidden'); // Show default blank user icon
                const btn = document.getElementById('delete-modal-photo-btn');
                if(btn) btn.classList.add('hidden'); // Hide the remove button
            } catch(e) {
                console.error("Clear Photo Error:", e);
            }
        };

        window.saveEmployee = async (e) => {
            e.preventDefault();
            try {
                const fd = new FormData(e.target);
                const data = Object.fromEntries(fd.entries());
                const ex = employees.find(x => String(x.id) === String(data.id));
                data.id = data.id || 'EMP_' + Date.now();
                data.payrollHistory = ex ? (ex.payrollHistory || {}) : {};
                
                // Explicitly set the profile pic to the current tempProfilePic
                // If it was cleared using the button, tempProfilePic is null
                data.profilePic = (typeof tempProfilePic !== 'undefined') ? tempProfilePic : null;
                data.lastModified = new Date().toISOString();
                
                if (ex && ex.activeLoans) data.activeLoans = ex.activeLoans;
                if (ex && ex.archivedLoans) data.archivedLoans = ex.archivedLoans;
                if (data.department === 'English') {
                    data.visaTotalCost = ex && ex.visaTotalCost !== undefined ? ex.visaTotalCost : 0;
                    data.visaPaidAlready = ex && ex.visaPaidAlready !== undefined ? ex.visaPaidAlready : 0;
                    data.visaDate = ex && ex.visaDate !== undefined ? ex.visaDate : '';
                } else if (ex) {
                    if (ex.visaTotalCost !== undefined) data.visaTotalCost = ex.visaTotalCost;
                    if (ex.visaPaidAlready !== undefined) data.visaPaidAlready = ex.visaPaidAlready;
                    if (ex.visaDate !== undefined) data.visaDate = ex.visaDate;
                }
                
                await transact(STORE_EMPLOYEES, 'readwrite', (s) => s.put(data));
                employees = await transact(STORE_EMPLOYEES, 'readonly', (s) => s.getAll());
                
                if(typeof window.renderEmployeeList === 'function') window.renderEmployeeList();
                if(typeof window.renderDeptSidebar === 'function') window.renderDeptSidebar();
                if(typeof window.closeModal === 'function') window.closeModal();
                if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats();
                
                if(selectedEmployee && String(selectedEmployee.id) === String(data.id)) {
                    selectedEmployee = employees.find(x => String(x.id) === String(data.id));
                    if(typeof window.renderPreview === 'function') window.renderPreview();
                }
            } catch (error) {
                console.error("Save Employee Error:", error);
                alert("Error saving staff: " + error.message);
            }
        };

        // 10. Update Staff Manager Sidebar to show Active/Total staff counts
        window.renderDeptSidebar = () => {
            const tree = document.getElementById('dept-tree'); 
            if(!tree) return;
            
            const currentDepts = typeof getOrderedDepartments === 'function' ? getOrderedDepartments() : Object.keys(departmentConfigs || {});
            
            // Calculate Active and Total for "All Staff"
            const activeCount = employees.filter(e => e.status !== 'Resigned').length;
            const totalCount = employees.length;
            const allStaffBadge = `${activeCount} Active / ${totalCount} Total`;

            let html = `<div onclick="window.setFilter('All', 'All')" class="cursor-pointer px-3 py-2 rounded mb-2 text-sm flex justify-between items-center gap-2 ${currentFilter.campus === 'All' && currentFilter.department === 'All' ? 'bg-blue-100 text-blue-800 font-bold' : 'text-gray-600 hover:bg-gray-200'}"><div class="flex items-center gap-2"><i data-lucide="users" class="w-4 h-4"></i> All Staff</div><span class="text-[10px] bg-black/10 px-2 py-0.5 rounded-full font-bold whitespace-nowrap text-gray-700">${allStaffBadge}</span></div>`; 
            
            CAMPUSES.forEach(campus => { 
                html += `<div class="mt-4 mb-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex justify-between items-center cursor-pointer text-blue-800 bg-blue-100 hover:bg-blue-200 transition-colors shadow-sm" onclick="window.setFilter('${campus}', 'All')">${campus}<i data-lucide="chevron-down" class="w-3 h-3 text-blue-500"></i></div>`; 
                
                let targetDepts = (campus === 'General Services') ? GS_DEPTS : ACADEMIC_DEPTS;
                const deptsToShow = currentDepts.filter(d => targetDepts.includes(d));
                
                deptsToShow.forEach(dept => { 
                    const deptEmps = employees.filter(e => e.campus === campus && e.department === dept);
                    const deptActive = deptEmps.filter(e => e.status !== 'Resigned').length;
                    const deptTotal = deptEmps.length;
                    const isActive = currentFilter.campus === campus && currentFilter.department === dept;
                    
                    // Show Active/Total for individual departments as well (e.g. 5/6)
                    // If everyone is active, it just shows the total number to save space.
                    const deptBadge = deptActive === deptTotal ? deptTotal : `${deptActive}/${deptTotal}`;

                    html += `<div onclick="window.setFilter('${campus}', '${dept}')" class="cursor-pointer px-3 py-1.5 rounded ml-2 text-sm transition-colors flex justify-between items-center ${isActive ? 'bg-white shadow-sm text-blue-700 font-medium border-l-2 border-blue-500' : 'text-gray-500 hover:bg-gray-200 border-l-2 border-transparent'}"><span class="truncate pr-2">${dept}</span><span class="text-[10px] ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'} px-1.5 py-0.5 rounded-full font-mono whitespace-nowrap">${deptBadge}</span></div>`; 
                }); 
            }); 
            
            tree.innerHTML = html;
            
            const bl = document.getElementById('current-filter-label'); 
            if(bl) bl.innerText = currentFilter.department !== 'All' ? `${currentFilter.department} (${currentFilter.campus})` : 'All Staff';
            
            const delBtn = document.getElementById('delete-dept-button');
            if (delBtn) { 
                if (currentFilter.department !== 'All') { 
                    delBtn.disabled = false; 
                    delBtn.classList.remove('opacity-50'); 
                } else { 
                    delBtn.disabled = true; 
                    delBtn.classList.add('opacity-50'); 
                } 
            }
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons();
            }
        };

        // Auto-refresh the UI right now if it's currently loaded
        if (typeof window.renderDeptSidebar === 'function' && document.getElementById('dept-tree')) {
            window.renderDeptSidebar();
        }



/* TARGETED CHANGE: English annual increase label follows the school year each September. */
function getEnglishIncreaseLabel() {
    const now = new Date();
    const schoolYearStart = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${schoolYearStart}-${String(schoolYearStart + 1).slice(-2)}`;
}

function getAnnualIncreaseDisplayLabel(year = editorYear, month = editorMonth) {
    const numericYear = parseInt(year, 10) || new Date().getFullYear();
    const monthIndex = MONTHS.indexOf(month);
    const schoolYearStart = monthIndex >= 8 ? numericYear : numericYear - 1;
    return `ເພີ້ມປະຈຳປີ ${schoolYearStart}-${schoolYearStart + 1}`;
}


function isArounyLoanPeriod(key) {
    const parts = String(key || '').split('-');
    if (parts.length !== 2) return false;
    const year = parseInt(parts[0], 10);
    const monthIndex = MONTHS.indexOf(parts[1]);
    return year > 2026 || (year === 2026 && monthIndex >= 10);
}

function isArounyRasphone(emp) {
    return !!emp && emp.department === 'English' && String(emp.name || '').trim().toUpperCase() === 'AROUNY RASPHONE';
}

function getArounyLoanPayment(emp, key) {
    if (!isArounyRasphone(emp) || !isArounyLoanPeriod(key)) return 0;
    const state = emp.payrollHistory && emp.payrollHistory[key];
    return parseFloat(state && state.loanDeduction || 0) || 0;
}

function getArounyEnglishPayrollState(emp, key, state) {
    return state;
}

/* ============================================================
   TARGETED CHANGES ONLY
   - Movable floating payroll Save button + Ctrl+S
   - Unsaved payroll navigation guard
   - Resigned payroll/earning lock
   - School logo -> landing/header/favicon/apple-touch/payslip/print
   ============================================================ */
(function () {
    let payrollDirty = false;
    let lastLoadedPeriodKey = null;
    let pendingNavigation = null;
    let isSavingPayroll = false;

    function isResigned(emp) {
        return !!emp && emp.status === 'Resigned';
    }

    function setPayrollDirty(value) {
        payrollDirty = !!value;
        const btn = document.getElementById('floating-save-button');
        if (btn) {
            btn.classList.toggle('is-dirty', payrollDirty);
            btn.title = payrollDirty ? 'Save payroll data (Ctrl+S)' : 'Save payroll data (Ctrl+S)';
        }
    }

    function updateFloatingSaveButton() {
        const btn = document.getElementById('floating-save-button');
        if (!btn) return;
        const appVisible = !document.getElementById('app-view')?.classList.contains('hidden');
        const payrollVisible = !document.getElementById('view-payroll')?.classList.contains('hidden');
        const shouldShow = appVisible && payrollVisible && !!selectedEmployee;
        btn.style.display = shouldShow ? 'flex' : 'none';
        const locked = isResigned(selectedEmployee);
        btn.disabled = locked || !selectedEmployee;
        btn.classList.toggle('is-locked', locked);
        btn.classList.toggle('is-dirty', payrollDirty);
    }

    function applyResignedEditorLock() {
        const container = document.getElementById('editor-content');
        if (!container) return;
        const locked = isResigned(selectedEmployee);
        container.classList.toggle('resigned-locked', locked);
        container.querySelectorAll('input, textarea, select, button').forEach(el => {
            // Keep informational buttons disabled too; this prevents any payroll mutation
            // from being reached through the editor while the staff member is resigned.
            el.disabled = locked;
        });
        updateFloatingSaveButton();
    }

    function applyResignedOTLLock() {
        const locked = isResigned(selectedOTLStaff);
        ['ot-management-card', 'loan-management-card'].forEach(id => {
            const card = document.getElementById(id);
            if (!card) return;
            card.querySelectorAll('input, textarea, select').forEach(el => {
                el.disabled = locked;
            });
            card.classList.toggle('opacity-75', locked);
        });
    }

    function ensureUnsavedModal() {
        let modal = document.getElementById('unsaved-changes-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'unsaved-changes-modal';
        modal.className = 'fixed inset-0 bg-black/50 hidden items-center justify-center z-[300] p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h2 class="text-xl font-bold text-blue-900 mb-2">Unsaved Changes</h2>
                <p class="text-sm text-gray-600 mb-6">You have unsaved payroll changes. Save before leaving?</p>
                <div class="flex gap-3">
                    <button id="unsaved-cancel" type="button" class="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                    <button id="unsaved-save" type="button" class="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Save</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#unsaved-cancel').onclick = () => {
            pendingNavigation = null;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
        modal.querySelector('#unsaved-save').onclick = async () => {
            if (!pendingNavigation) return;
            const action = pendingNavigation;
            pendingNavigation = null;
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            try {
                await window.saveEmployeePayrollData();
                if (!payrollDirty) await action();
            } catch (e) {
                console.error('Unsaved-change save failed:', e);
            }
        };
        return modal;
    }

    function requestNavigation(action) {
        if (!payrollDirty) {
            action();
            return;
        }
        pendingNavigation = action;
        const modal = ensureUnsavedModal();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Movable floating Save button.
    (function setupFloatingSave() {
        const btn = document.getElementById('floating-save-button');
        if (!btn) return;
        let dragging = false;
        let moved = false;
        let offsetX = 0;
        let offsetY = 0;
        let downX = 0;
        let downY = 0;

        const savedLeft = parseFloat(localStorage.getItem('neerada_save_btn_left'));
        const savedTop = parseFloat(localStorage.getItem('neerada_save_btn_top'));
        if (Number.isFinite(savedLeft) && Number.isFinite(savedTop)) {
            btn.style.left = `${Math.max(0, Math.min(savedLeft, window.innerWidth - btn.offsetWidth))}px`;
            btn.style.top = `${Math.max(0, Math.min(savedTop, window.innerHeight - btn.offsetHeight))}px`;
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        }

        btn.addEventListener('pointerdown', (e) => {
            if (btn.disabled) return;
            dragging = true;
            moved = false;
            downX = e.clientX;
            downY = e.clientY;
            const rect = btn.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            btn.setPointerCapture?.(e.pointerId);
        });
        btn.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) moved = true;
            const x = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - btn.offsetWidth));
            const y = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - btn.offsetHeight));
            btn.style.left = `${x}px`;
            btn.style.top = `${y}px`;
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
        });
        btn.addEventListener('pointerup', (e) => {
            if (!dragging) return;
            dragging = false;
            if (moved) e.preventDefault();
            const rect = btn.getBoundingClientRect();
            localStorage.setItem('neerada_save_btn_left', String(rect.left));
            localStorage.setItem('neerada_save_btn_top', String(rect.top));
            btn.dataset.dragged = moved ? 'true' : 'false';
            setTimeout(() => { btn.dataset.dragged = 'false'; }, 0);
        });
        window.addEventListener('resize', () => {
            if (btn.style.left) {
                const rect = btn.getBoundingClientRect();
                const x = Math.max(0, Math.min(rect.left, window.innerWidth - btn.offsetWidth));
                const y = Math.max(0, Math.min(rect.top, window.innerHeight - btn.offsetHeight));
                btn.style.left = `${x}px`;
                btn.style.top = `${y}px`;
            }
        });
    })();

    window.handleFloatingSave = async function (event) {
        if (event) event.preventDefault();
        const btn = document.getElementById('floating-save-button');
        if (btn?.dataset.dragged === 'true') return;
        if (!selectedEmployee) return;
        if (isResigned(selectedEmployee)) {
            alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
            return;
        }
        await window.saveEmployeePayrollData();
    };

    // Track direct payroll edits without changing the existing calculation behavior.
    const originalUpdatePayrollField = window.updatePayrollField;
    window.updatePayrollField = async function (f, v) {
        if (isResigned(selectedEmployee)) {
            alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
            return;
        }
        setPayrollDirty(true);
        return originalUpdatePayrollField.apply(this, arguments);
    };

    // Protect the actual persistence operation too, so the lock cannot be bypassed by UI state.
    const originalSaveEmployeePayrollData = window.saveEmployeePayrollData;
    window.saveEmployeePayrollData = async function () {
        if (!selectedEmployee) return;
        if (isResigned(selectedEmployee)) {
            alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
            return;
        }
        if (isSavingPayroll) return;
        isSavingPayroll = true;
        try {
            await originalSaveEmployeePayrollData.apply(this, arguments);
            setPayrollDirty(false);
        } finally {
            isSavingPayroll = false;
            updateFloatingSaveButton();
        }
    };

    // Lock all current editor inputs whenever the payroll editor is rendered.
    const originalRenderEditor = renderEditor;
    renderEditor = function () {
        const result = originalRenderEditor.apply(this, arguments);
        applyResignedEditorLock();
        return result;
    };

    // Period navigation is also protected when there are unsaved changes.
    const originalLoadPeriodData = loadPeriodData;
    loadPeriodData = function () {
        const nextMonth = document.getElementById('editor-month')?.value || '';
        const nextYear = document.getElementById('editor-year')?.value || '';
        const nextKey = `${nextYear}-${nextMonth}`;
        if (payrollDirty && lastLoadedPeriodKey && nextKey !== lastLoadedPeriodKey) {
            const oldKey = lastLoadedPeriodKey;
            requestNavigation(async () => {
                await originalLoadPeriodData.apply(this, arguments);
                lastLoadedPeriodKey = nextKey;
                setPayrollDirty(false);
            });
            return;
        }
        const result = originalLoadPeriodData.apply(this, arguments);
        if (selectedEmployee) lastLoadedPeriodKey = `${editorYear}-${editorMonth}`;
        return result;
    };

    // Staff selection is protected.
    const originalSelectEmployee = window.selectEmployee;
    window.selectEmployee = function (id) {
        if (selectedEmployee && String(selectedEmployee.id) === String(id)) return;
        localStorage.setItem('neerada_selected_staff', String(id));
        requestNavigation(() => {
            originalSelectEmployee.call(this, id);
            setPayrollDirty(false);
            lastLoadedPeriodKey = `${editorYear}-${editorMonth}`;
            updateFloatingSaveButton();
            applyResignedEditorLock();
        });
    };

    // Main tab navigation is protected.
    const originalSwitchView = window.switchView;
    window.switchView = function (v) {
        requestNavigation(() => {
            originalSwitchView.call(this, v);
            updateFloatingSaveButton();
            applyResignedEditorLock();
            applyResignedOTLLock();
        });
    };

    // Leaving the application is protected.
    const originalGoToLanding = window.goToLanding;
    window.goToLanding = function () {
        requestNavigation(() => {
            originalGoToLanding.call(this);
            updateFloatingSaveButton();
        });
    };

    // Lock payroll reset/copy actions for resigned staff.
    const originalLoadPreviousMonthData = window.loadPreviousMonthData;
    window.loadPreviousMonthData = function () {
        if (isResigned(selectedEmployee)) {
            alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
            return;
        }
        setPayrollDirty(true);
        return originalLoadPreviousMonthData.apply(this, arguments);
    };
    const originalResetCurrentPayroll = window.resetCurrentPayroll;
    window.resetCurrentPayroll = function () {
        if (isResigned(selectedEmployee)) {
            alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
            return;
        }
        setPayrollDirty(true);
        return originalResetCurrentPayroll.apply(this, arguments);
    };

    // OT/Loan mutation protection for resigned staff.
    ['saveOTDetails', 'saveLoanRecord', 'saveLoanPayment', 'removeLoan', 'archiveLoan', 'deleteLoanFromHistory', 'editHistoryPayment', 'deleteHistoryPayment', 'restoreArchivedLoan', 'bulkCopyLoanPayments'].forEach(name => {
        if (typeof window[name] !== 'function') return;
        const original = window[name];
        window[name] = function () {
            const target = selectedOTLStaff || selectedEmployee;
            if (isResigned(target)) {
                alert('This staff member is Resigned. Earning data is locked. Set Status to Active to modify it.');
                return;
            }
            return original.apply(this, arguments);
        };
    });

    if (typeof window.selectOTLStaff === 'function') {
        const originalSelectOTLStaff = window.selectOTLStaff;
        window.selectOTLStaff = function () {
            const result = originalSelectOTLStaff.apply(this, arguments);
            applyResignedOTLLock();
            return result;
        };
    }

    // Status changes should immediately unlock/lock the payroll editor for the selected staff member.
    const originalSaveEmployee = window.saveEmployee;
    window.saveEmployee = async function () {
        await originalSaveEmployee.apply(this, arguments);
        if (selectedEmployee) {
            selectedEmployee = employees.find(e => String(e.id) === String(selectedEmployee.id)) || selectedEmployee;
            if (selectedEmployee) {
                loadPeriodData();
                applyResignedEditorLock();
            }
        }
        updateFloatingSaveButton();
    };

    // School logo upload: one image becomes the landing/header/payslip logo,
    // favicon, and Apple touch icon. The existing print view already uses prev-school-logo.
    window.handleLogoUpload = function (input) {
        const file = input?.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file for the school logo.');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const logo = e.target.result;
            localStorage.setItem('neerada_school_logo', logo);
            const ids = ['landing-custom-logo', 'header-custom-logo', 'prev-school-logo'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.src = logo;
                el.classList.remove('hidden');
            });
            const icon = document.getElementById('landing-logo-container');
            if (icon) icon.classList.add('hidden');
            const favicon = document.getElementById('app-favicon');
            if (favicon) favicon.href = logo;
            const apple = document.getElementById('app-apple-touch-icon');
            if (apple) apple.href = logo;
            if (window.lucide) lucide.createIcons();
            input.value = '';
        };
        reader.readAsDataURL(file);
    };

    // Ctrl+S / Cmd+S saves the current payroll editor.
    document.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
        if (!selectedEmployee) return;
        e.preventDefault();
        window.handleFloatingSave(e);
    });

    // Browser/tab close protection for unsaved payroll edits.
    window.addEventListener('beforeunload', (e) => {
        if (!payrollDirty) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // Keep the floating button and lock state synchronized with normal view changes.
    const originalLaunchApp = window.launchApp;
    window.launchApp = function () {
        const result = originalLaunchApp.apply(this, arguments);
        setTimeout(() => {
            updateFloatingSaveButton();
            applyResignedEditorLock();
            applyResignedOTLLock();
        }, 0);
        return result;
    };

    // Initial state.
    setTimeout(() => {
        updateFloatingSaveButton();
        applyResignedEditorLock();
        applyResignedOTLLock();
    }, 0);
})();

/* TARGETED CHANGE: Dashboard CSV loan total, Settings bulk payslip PDF/email tools. */
(function () {
    function getBulkPayslipPeriod() {
        const monthEl = document.getElementById('bulk-month');
        const departmentEl = document.getElementById('bulk-department');
        if (departmentEl) {
            const current = departmentEl.value || 'All';
            const departments = (typeof getOrderedDepartments === 'function' ? getOrderedDepartments() : Array.from(new Set(employees.map(emp => emp.department).filter(Boolean))).sort());
            departmentEl.innerHTML = '<option value="All">All Departments</option>' + departments.map(dept => `<option value="${String(dept).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}">${String(dept).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</option>`).join('');
            departmentEl.value = departments.includes(current) || current === 'All' ? current : 'All';
        }
        const yearEl = document.getElementById('bulk-year');
        return {
            month: monthEl?.value || editorMonth,
            year: yearEl?.value || String(editorYear),
            department: departmentEl?.value || 'All'
        };
    }

    function calculateEnglishReportResult(emp, key, state, totalLoanForPeriod) {
        const d = getArounyEnglishPayrollState(emp, key, state);
        const ot = (parseFloat(d.otHours) || 0) * (parseFloat(d.otRate) || 0);
        const gross = (parseFloat(d.basicPay) || 0) + (parseFloat(d.accumulated) || 0) + (parseFloat(d.increase) || 0) + (parseFloat(d.earningsOthersUSD) || 0) + ot;
        const dedUSD = (parseFloat(d.profTax) || 0) + (parseFloat(d.absences) || 0) + (parseFloat(d.visa) || 0) + (parseFloat(d.deductionsOthersUSD) || 0);
        const netUSD = gross - dedUSD;
        const convert = netUSD - (parseFloat(d.cashOut) || 0);
        const convLAK = convert * (parseFloat(d.exchangeRate) || 0);
        const extra = (parseFloat(d.itLAK) || 0) + (parseFloat(d.extraWorkOthersLAK) || 0) + (parseFloat(d.stipendLAK) || 0);
        const dedLAK = (parseFloat(d.insuranceLAK) || 0) + (parseFloat(d.deductionsOthersLAK) || 0) + (parseFloat(d.loanDeduction) || 0);
        return { lak: Math.max(0, convLAK + extra - dedLAK), usd: parseFloat(d.cashOut) || 0 };
    }

    function calculateReportResult(emp, key, state, totalLoanForPeriod) {
        if (emp.department === 'English') return calculateEnglishReportResult(emp, key, state, totalLoanForPeriod);
        return calculatePayrollFromState(emp, state);
    }

    function loadExternalScript(src, ready) {
        if (ready()) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-payroll-lib="${src}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', reject, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.payrollLib = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Could not load ${src}`));
            document.head.appendChild(script);
        });
    }

    async function ensureBulkPdfLibraries() {
        await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => typeof window.html2canvas === 'function');
        await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!window.jspdf?.jsPDF);
        await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', () => !!window.JSZip);
    }

    function waitForImages(root) {
        const images = Array.from(root.querySelectorAll('img'));
        return Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = img.onerror = resolve; });
        }));
    }

    function safeFileName(name) {
        return String(name || 'Staff').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    }

    window.downloadCurrentPayslipPDF = async () => {
        if (!selectedEmployee) return alert('Please select a staff member first.');
        const month = editorMonth;
        const year = editorYear;
        const key = `${year}-${month}`;
        const originalState = JSON.parse(JSON.stringify(currentPayrollState || {}));
        let host = null;
        try {
            await ensureBulkPdfLibraries();
            host = document.createElement('div');
            host.style.cssText = 'position:fixed;left:-100000px;top:0;width:794px;background:#fff;z-index:-1;';
            document.body.appendChild(host);
            const stored = selectedEmployee.payrollHistory && selectedEmployee.payrollHistory[key];
            currentPayrollState = stored ? JSON.parse(JSON.stringify(stored)) : createInitialState(selectedEmployee.department);
            renderPreview();
            const source = document.getElementById('preview-pane');
            if (!source) return alert('Payslip preview is not available.');
            const clone = source.cloneNode(true);
            clone.style.width = '794px';
            clone.style.maxWidth = '794px';
            clone.style.minHeight = '1123px';
            clone.style.background = '#fff';
            clone.style.boxSizing = 'border-box';
            clone.style.fontFamily = "\"Phetsarath OT\", 'Phetsarath', 'Noto Sans Lao', sans-serif";
            clone.style.lineHeight = '1.6';
            const pdfStyle = document.createElement('style');
            pdfStyle.textContent = `#preview-pane, #preview-pane * { font-family: "Phetsarath OT", "Phetsarath", "Noto Sans Lao", sans-serif !important; } #preview-pane { line-height: 1.6 !important; } #preview-content { margin-top: 12px !important; line-height: 1.6 !important; } #preview-content .flex.justify-between { align-items: center !important; min-height: 27px !important; padding-top: 5px !important; padding-bottom: 5px !important; line-height: 1.6 !important; } #preview-content .flex.justify-between > span { line-height: 1.6 !important; } #preview-content h3, #preview-content h4 { line-height: 1.6 !important; margin-top: 10px !important; margin-bottom: 8px !important; } #preview-content > * { margin-bottom: 10px !important; } .print-info-container { gap: 12px !important; margin-bottom: 16px !important; } #print-footer { margin-top: 16px !important; } #preview-content .payslip-salary-box { display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; } #preview-content .payslip-salary-box > span { display: block !important; margin: 0 !important; }`;
            clone.prepend(pdfStyle);
            host.appendChild(clone);
            await waitForImages(clone);
            const canvas = await html2canvas(clone, { scale: 4, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 8;
            const maxWidth = pageWidth - (margin * 2);
            const maxHeight = pageHeight - (margin * 2);
            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
            const imgWidth = canvas.width * ratio;
            const imgHeight = canvas.height * ratio;
            const image = canvas.toDataURL('image/png');
            pdf.addImage(image, 'PNG', (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight, undefined, 'SLOW');
            pdf.save(`${safeFileName(selectedEmployee.name)}_${month}_${year}.pdf`);
        } catch (e) {
            console.error('Current payslip PDF download failed:', e);
            alert('PDF download could not be completed. Please check your internet connection and try again.');
        } finally {
            if (host) host.remove();
            currentPayrollState = originalState;
            renderPreview();
        }
    };

    window.bulkDownloadPayslipsPDF = async () => {
        const { month, year, department } = getBulkPayslipPeriod();
        if (!month || !year) return alert('Please select the payslip month and year first.');
        if (!employees.length) return alert('No staff records found.');
        const originalEmployee = selectedEmployee;
        const originalState = selectedEmployee ? JSON.parse(JSON.stringify(currentPayrollState || {})) : null;
        const originalMonth = editorMonth;
        const originalYear = editorYear;
        const originalMonthValue = document.getElementById('editor-month')?.value;
        const originalYearValue = document.getElementById('editor-year')?.value;
        let host = null;
        try {
            await ensureBulkPdfLibraries();
            const zip = new JSZip();
            host = document.createElement('div');
            host.style.cssText = 'position:fixed;left:-100000px;top:0;width:794px;background:#fff;z-index:-1;';
            document.body.appendChild(host);
            const { jsPDF } = window.jspdf;
            let count = 0;

            for (const emp of employees) {
                if (department !== 'All' && emp.department !== department) continue;
                const key = `${year}-${month}`;
                selectedEmployee = emp;
                editorMonth = month;
                editorYear = year;
                const stored = emp.payrollHistory && emp.payrollHistory[key];
                currentPayrollState = stored ? JSON.parse(JSON.stringify(stored)) : createInitialState(emp.department);
                renderPreview();
                const source = document.getElementById('preview-pane');
                if (!source) continue;
                const clone = source.cloneNode(true);
                clone.style.width = '794px';
                clone.style.maxWidth = '794px';
                clone.style.minHeight = '1123px';
                clone.style.background = '#fff';
                clone.style.boxSizing = 'border-box';
            clone.style.fontFamily = "\"Phetsarath OT\", 'Phetsarath', 'Noto Sans Lao', sans-serif";
                clone.style.lineHeight = '1.6';
                const pdfStyle = document.createElement('style');
                pdfStyle.textContent = `#preview-pane, #preview-pane * { font-family: "Phetsarath OT", "Phetsarath", "Noto Sans Lao", sans-serif !important; } #preview-pane { line-height: 1.6 !important; } #preview-content { margin-top: 12px !important; line-height: 1.6 !important; } #preview-content .flex.justify-between { align-items: center !important; min-height: 27px !important; padding-top: 5px !important; padding-bottom: 5px !important; line-height: 1.6 !important; } #preview-content .flex.justify-between > span { line-height: 1.6 !important; } #preview-content h3, #preview-content h4 { line-height: 1.6 !important; margin-top: 10px !important; margin-bottom: 8px !important; } #preview-content > * { margin-bottom: 10px !important; } .print-info-container { gap: 12px !important; margin-bottom: 16px !important; } #print-footer { margin-top: 16px !important; } #preview-content .payslip-salary-box { display: flex !important; flex-direction: row !important; justify-content: space-between !important; align-items: center !important; } #preview-content .payslip-salary-box > span { display: block !important; margin: 0 !important; }`;
                clone.prepend(pdfStyle);
                host.innerHTML = '';
                host.appendChild(clone);
                await waitForImages(clone);
                const canvas = await html2canvas(clone, { scale: 4, useCORS: true, backgroundColor: '#ffffff', logging: false });
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pageWidth = 210;
                const pageHeight = 297;
                const margin = 8;
                const maxWidth = pageWidth - (margin * 2);
                const maxHeight = pageHeight - (margin * 2);
                const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
                const imgWidth = canvas.width * ratio;
                const imgHeight = canvas.height * ratio;
                const image = canvas.toDataURL('image/png');
                pdf.addImage(image, 'PNG', (pageWidth - imgWidth) / 2, (pageHeight - imgHeight) / 2, imgWidth, imgHeight, undefined, 'SLOW');
                zip.file(`${safeFileName(emp.name)}_${month}_${year}.pdf`, pdf.output('blob'));
                count++;
            }

            if (!count) return alert('No payslips could be generated for the selected period.');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Neerada_Payslips_${month}_${year}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(`Downloaded ${count} payslips as a ZIP file.`);
        } catch (e) {
            console.error('Bulk PDF export failed:', e);
            alert('Bulk PDF download could not be completed. Please check your internet connection and try again.');
        } finally {
            if (host) host.remove();
            selectedEmployee = originalEmployee;
            currentPayrollState = originalState || {};
            editorMonth = originalMonth;
            editorYear = originalYear;
            if (document.getElementById('editor-month') && originalMonthValue) document.getElementById('editor-month').value = originalMonthValue;
            if (document.getElementById('editor-year') && originalYearValue) document.getElementById('editor-year').value = originalYearValue;
            if (selectedEmployee && typeof renderPreview === 'function') renderPreview();
        }
    };

    window.bulkEmailPayslips = async () => {
        const { month, year } = getBulkPayslipPeriod();
        if (!month || !year) return alert('Please select the payslip month and year first.');
        const recipients = employees.filter(emp => String(emp.email || '').trim());
        if (!recipients.length) return alert('No staff have a registered email address.');
        if (!confirm(`Open email drafts for ${recipients.length} staff for ${month} ${year}? Your email application/browser will require you to confirm each message.`)) return;
        let opened = 0;
        for (const emp of recipients) {
            const key = `${year}-${month}`;
            const state = emp.payrollHistory && emp.payrollHistory[key] ? JSON.parse(JSON.stringify(emp.payrollHistory[key])) : createInitialState(emp.department);
            const originalEmployee = selectedEmployee;
            const originalState = selectedEmployee ? JSON.parse(JSON.stringify(currentPayrollState || {})) : null;
            const originalMonth = editorMonth;
            const originalYear = editorYear;
            selectedEmployee = emp;
            editorMonth = month;
            editorYear = year;
            currentPayrollState = state;
            const message = window.constructPayslipMessage().replace(/\*/g, '').replace(/_/g, '');
            const subject = encodeURIComponent(`Payslip - ${month} ${year} - ${emp.name}`);
            const body = encodeURIComponent(message);
            const popup = window.open(`mailto:${String(emp.email).trim()}?subject=${subject}&body=${body}`, '_blank');
            if (popup) opened++;
            selectedEmployee = originalEmployee;
            currentPayrollState = originalState || {};
            editorMonth = originalMonth;
            editorYear = originalYear;
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (selectedEmployee && typeof renderPreview === 'function') renderPreview();
        alert(`Opened ${opened} email drafts. Each message is addressed to the employee's registered email.`);
    };
})();
