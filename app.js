/**
 * Luminous Reservation Manager - Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // State Management & Constants
    // ==========================================================================
    
    // Default Price Settings
    const DEFAULT_SETTINGS = {
        price60: 12000,
        price90: 17000,
        price120: 22000,
        price150: 27000,
        price180: 32000,
        priceCustomMin: 200 // Yen per minute for custom duration
    };

    // Default Meetup Places
    const DEFAULT_PLACES = ['FM', 'アストン前', 'ステラ P', 'AI P'];

    // Load reservations, settings, and places from localStorage
    let reservations = JSON.parse(localStorage.getItem('luminous_reservations')) || [];
    let settings = JSON.parse(localStorage.getItem('luminous_settings')) || { ...DEFAULT_SETTINGS };
    let meetupPlaces = JSON.parse(localStorage.getItem('luminous_meetup_places')) || [...DEFAULT_PLACES];

    // Active Date Filter (Default to today's date)
    const todayStr = getLocalDateString(new Date());
    let activeFilterDate = todayStr; // Defaults to today

    // ==========================================================================
    // DOM Element Selectors
    // ==========================================================================
    
    // Forms
    const reservationForm = document.getElementById('reservation-form');
    const settingsForm = document.getElementById('settings-form');
    
    // Form Inputs (Existing)
    const inputEditIndex = document.getElementById('edit-index');
    const inputDate = document.getElementById('res-date');
    const inputTime = document.getElementById('res-time');
    const inputCustName = document.getElementById('customer-name');
    const inputCustPhone = document.getElementById('customer-phone');
    const inputStaffName = document.getElementById('staff-name');
    const selectCourse = document.getElementById('course-duration');
    const groupCustomDuration = document.getElementById('custom-duration-group');
    const inputCustomDuration = document.getElementById('custom-duration-input');
    const inputAdjTransport = document.getElementById('adj-transport');
    const inputAdjDiscount = document.getElementById('adj-discount');
    const inputAdjMemo = document.getElementById('adj-memo');
    
    // Form Inputs (New)
    const radioCustType = document.getElementsByName('customer-type');
    const groupMedia = document.getElementById('media-group');
    const selectMedia = document.getElementById('media-select');
    const radioNomination = document.getElementsByName('nomination-type');
    const radioResType = document.getElementsByName('res-type');
    
    const groupMeetup = document.getElementById('meetup-place-group');
    const selectMeetup = document.getElementById('meetup-place-select');
    const groupMeetupCustom = document.getElementById('meetup-place-custom-group');
    const inputMeetupCustom = document.getElementById('meetup-place-custom');
    
    const inputOp = document.getElementById('info-op');
    const inputPrev = document.getElementById('info-prev');
    
    // Displays
    const baseFeeDisplay = document.getElementById('base-fee-display');
    const totalFeeDisplay = document.getElementById('total-fee-display');
    const formTitle = document.getElementById('form-title');
    const submitText = document.getElementById('submit-text');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    
    // Metrics
    const metricTodayCount = document.getElementById('metric-today-count');
    const metricTodaySales = document.getElementById('metric-today-sales');
    const metricTotalCount = document.getElementById('metric-total-count');
    const metricTotalSales = document.getElementById('metric-total-sales');
    const visibleTotalSales = document.getElementById('visible-total-sales');
    
    // Table & Filters
    const reservationTableBody = document.getElementById('reservation-list-body');
    const filterDateInput = document.getElementById('filter-date');
    const btnFilterToday = document.getElementById('btn-filter-today');
    const btnFilterClear = document.getElementById('btn-filter-clear');
    
    // Action Buttons & Modal
    const btnCSV = document.getElementById('btn-csv');
    const btnPrint = document.getElementById('btn-print');
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('settings-modal');
    const btnModalClose = document.getElementById('modal-close');
    const btnResetSettings = document.getElementById('btn-reset-settings');
    
    // Settings Tabs Elements
    const btnTabRates = document.getElementById('tab-btn-rates');
    const btnTabPlaces = document.getElementById('tab-btn-places');
    const contentTabRates = document.getElementById('tab-rates-content');
    const contentTabPlaces = document.getElementById('tab-places-content');
    
    // Places Management Elements
    const inputNewPlace = document.getElementById('new-place-input');
    const btnAddPlace = document.getElementById('btn-add-place');
    const listPlaces = document.getElementById('places-list');
    
    // Toast Container
    const toastContainer = document.getElementById('toast-container');
    const printCardsContainer = document.getElementById('print-cards-container');

    // ==========================================================================
    // Initialization & Form Setup
    // ==========================================================================
    
    // Set default filter input value to today
    filterDateInput.value = activeFilterDate;
    
    // Setup Settings Tab Switching
    btnTabRates.addEventListener('click', () => switchTab('rates'));
    btnTabPlaces.addEventListener('click', () => switchTab('places'));
    
    // Setup Places Manager Click Event
    btnAddPlace.addEventListener('click', handleAddPlace);
    
    // Set default form state
    resetForm();
    
    // Load Settings Inputs
    loadSettingsInputs();
    
    // Render everything
    renderAll();

    // ==========================================================================
    // Form Dynamic Toggle Handlers
    // ==========================================================================
    
    // Handle Customer Type Change (New vs Repeater)
    function handleCustomerTypeChange() {
        const selectedType = getSelectedRadioValue(radioCustType);
        if (selectedType === 'new') {
            groupMedia.classList.remove('hidden');
            selectMedia.setAttribute('required', 'true');
        } else {
            groupMedia.classList.add('hidden');
            selectMedia.removeAttribute('required');
            selectMedia.value = ''; // Reset value
        }
    }
    
    // Handle Reservation Type Change (Meetup vs Delivery)
    function handleResTypeChange() {
        const selectedType = getSelectedRadioValue(radioResType);
        if (selectedType === 'meetup') {
            groupMeetup.classList.remove('hidden');
            selectMeetup.setAttribute('required', 'true');
            handleMeetupPlaceChange(); // Evaluate custom input visibility
        } else {
            groupMeetup.classList.add('hidden');
            selectMeetup.removeAttribute('required');
            groupMeetupCustom.classList.add('hidden');
            inputMeetupCustom.removeAttribute('required');
        }
    }
    
    // Handle Meetup Place Selection Change
    function handleMeetupPlaceChange() {
        if (selectMeetup.value === 'custom') {
            groupMeetupCustom.classList.remove('hidden');
            inputMeetupCustom.setAttribute('required', 'true');
            inputMeetupCustom.focus();
        } else {
            groupMeetupCustom.classList.add('hidden');
            inputMeetupCustom.removeAttribute('required');
            inputMeetupCustom.value = '';
        }
    }

    // Attach Toggle Listeners
    for (let radio of radioCustType) {
        radio.addEventListener('change', handleCustomerTypeChange);
    }
    
    for (let radio of radioResType) {
        radio.addEventListener('change', handleResTypeChange);
    }
    
    selectMeetup.addEventListener('change', handleMeetupPlaceChange);

    // ==========================================================================
    // Helper Functions
    // ==========================================================================
    
    // Get date string YYYY-MM-DD for local timezone
    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Parse date into local "M/D" slash string (e.g. 5/31)
    function getSlashDateString(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        return `${month}/${day}`;
    }

    // Format currency to JPY style (e.g., ¥12,000)
    function formatCurrency(value) {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', currencyDisplay: 'symbol' }).format(value);
    }

    // Parse currency format back to integer
    function formatNumber(value) {
        return new Intl.NumberFormat('ja-JP').format(value);
    }

    // Display toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '✨';
        if (type === 'error') icon = '❌';
        if (type === 'info') icon = 'ℹ️';
        
        toast.innerHTML = `
            <span>${icon} ${message}</span>
            <button style="background:none;border:none;color:inherit;cursor:pointer;margin-left:10px;font-weight:bold;">&times;</button>
        `;
        
        toast.querySelector('button').addEventListener('click', () => {
            toast.remove();
        });
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Save states and trigger redraw
    function saveState() {
        localStorage.setItem('luminous_reservations', JSON.stringify(reservations));
        renderAll();
    }

    // Calculate current fee based on duration and adjustment inputs
    function calculateFees() {
        const durationType = selectCourse.value;
        let baseFee = 0;

        if (durationType === '60') baseFee = settings.price60;
        else if (durationType === '90') baseFee = settings.price90;
        else if (durationType === '120') baseFee = settings.price120;
        else if (durationType === '150') baseFee = settings.price150;
        else if (durationType === '180') baseFee = settings.price180;
        else if (durationType === 'custom') {
            const minutes = parseInt(inputCustomDuration.value) || 0;
            baseFee = minutes * settings.priceCustomMin;
        }

        const transport = parseInt(inputAdjTransport.value) || 0;
        const discount = parseInt(inputAdjDiscount.value) || 0;
        
        // Final total calculation (Total fee cannot be negative)
        const totalFee = Math.max(0, baseFee + transport - discount);

        // Update UI preview
        baseFeeDisplay.textContent = formatNumber(baseFee);
        totalFeeDisplay.textContent = formatNumber(totalFee);

        return { baseFee, totalFee };
    }

    // Reset reservation form to default state
    function resetForm() {
        reservationForm.reset();
        inputEditIndex.value = '';
        
        // Default date to today
        inputDate.value = getLocalDateString(new Date());
        
        // Default time to current time
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        inputTime.value = `${hours}:${minutes}`;

        // Reset adjustments to zero
        inputAdjTransport.value = 0;
        inputAdjDiscount.value = 0;
        inputAdjMemo.value = '';
        
        // Reset dynamic details
        inputOp.value = '';
        inputPrev.value = '';
        inputMeetupCustom.value = '';

        // Reset Radio button defaults
        setRadioSelectedValue(radioCustType, 'new');
        setRadioSelectedValue(radioNomination, 'main');
        setRadioSelectedValue(radioResType, 'meetup');

        // Reload Meetup place select options
        populateMeetupSelect();

        // Update input visibility based on radio defaults
        handleCustomerTypeChange();
        handleResTypeChange();

        // Hide custom duration input group
        groupCustomDuration.classList.add('hidden');
        inputCustomDuration.removeAttribute('required');

        // Reset text
        formTitle.textContent = '📝 新規予約登録';
        submitText.textContent = '予約を追加する';
        btnCancelEdit.classList.add('hidden');

        calculateFees();
    }

    // Populate dynamic places select box in the form
    function populateMeetupSelect() {
        selectMeetup.innerHTML = '<option value="" disabled selected>場所を選択してください</option>';
        meetupPlaces.forEach(place => {
            const opt = document.createElement('option');
            opt.value = place;
            opt.textContent = place;
            selectMeetup.appendChild(opt);
        });
        
        // Append static "custom" option
        const customOpt = document.createElement('option');
        customOpt.value = 'custom';
        customOpt.textContent = 'その他 (自由入力)';
        selectMeetup.appendChild(customOpt);
    }

    // Load Settings Inputs inside settings modal
    function loadSettingsInputs() {
        document.getElementById('price-60').value = settings.price60;
        document.getElementById('price-90').value = settings.price90;
        document.getElementById('price-120').value = settings.price120;
        document.getElementById('price-150').value = settings.price150;
        document.getElementById('price-180').value = settings.price180;
        document.getElementById('price-custom-min').value = settings.priceCustomMin;
        
        renderPlacesList();
    }

    // Helper to get selected radio button value
    function getSelectedRadioValue(radioList) {
        for (let radio of radioList) {
            if (radio.checked) return radio.value;
        }
        return '';
    }

    // Helper to set selected radio button value
    function setRadioSelectedValue(radioList, value) {
        for (let radio of radioList) {
            radio.checked = (radio.value === value);
        }
    }

    // Abbreviate advertising medium names
    function abbreviateMedia(media) {
        if (!media) return '';
        const mapping = {
            'シティヘヴン': 'ヘヴン',
            'ぴゅあらば': 'ぴゅあ',
            '口コミ情報局': '口コミ',
            '風俗じゃぱん': '風じゃ',
            'デリヘルじゃぱん': 'デリじゃ'
        };
        return mapping[media] || media;
    }

    // Get staff nomination shorthand mark
    function getNominationMark(type) {
        const mapping = {
            'main': '本',
            'net': 'N',
            'free': 'F'
        };
        return mapping[type] || '本';
    }

    // ==========================================================================
    // Render Functions
    // ==========================================================================
    
    function renderAll() {
        renderMetrics();
        renderTable();
    }

    // Calculate and render dashboard metrics
    function renderMetrics() {
        const todayStr = getLocalDateString(new Date());
        
        // Calculations
        let todayCount = 0;
        let todaySales = 0;
        let totalCount = reservations.length;
        let totalSales = 0;

        reservations.forEach(res => {
            totalSales += res.totalFee;
            if (res.date === todayStr) {
                todayCount++;
                todaySales += res.totalFee;
            }
        });

        // Update DOM
        metricTodayCount.innerHTML = `${todayCount} <span class="unit">件</span>`;
        metricTodaySales.textContent = formatCurrency(todaySales);
        metricTotalCount.innerHTML = `${totalCount} <span class="unit">件</span>`;
        metricTotalSales.textContent = formatCurrency(totalSales);
    }

    // Render reservation table based on active filter
    function renderTable() {
        reservationTableBody.innerHTML = '';
        
        // Filter reservations
        let filtered = reservations;
        if (activeFilterDate) {
            filtered = reservations.filter(res => res.date === activeFilterDate);
        }

        // Sort by date then start time ascending
        filtered.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return a.time.localeCompare(b.time);
        });

        // Update list sales summary
        let visibleTotal = filtered.reduce((sum, res) => sum + res.totalFee, 0);
        visibleTotalSales.textContent = formatCurrency(visibleTotal);

        if (filtered.length === 0) {
            reservationTableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty-state">
                        <div class="empty-message">
                            <div class="empty-icon">📁</div>
                            <p>${activeFilterDate ? `${activeFilterDate} の` : ''}予約データがありません。</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((res) => {
            // Find index in original array
            const originalIndex = reservations.findIndex(r => r.id === res.id);
            
            const tr = document.createElement('tr');
            
            // Format course description
            const courseText = res.isCustomDuration ? `カスタム (${res.courseDuration}分)` : `${res.courseDuration}分`;
            
            // Compact customer type + media string
            let customerTypeHTML = '';
            if (res.customerType === 'new') {
                const abbrevMedia = abbreviateMedia(res.leadSource);
                if (abbrevMedia === 'その他') {
                    customerTypeHTML = `<span class="badge-adj badge-plus" style="font-size:11px;">新:その他</span>`;
                } else {
                    customerTypeHTML = `<span class="badge-adj badge-plus" style="font-size:11px;">新:${escapeHTML(abbrevMedia)}</span>`;
                }
            } else {
                customerTypeHTML = `<span class="badge-adj badge-minus" style="font-size:11px;">Ｒ</span>`;
            }

            // Compact nomination type mark
            const nomMark = getNominationMark(res.nominationType);
            let nominationBadgeClass = 'badge-plus';
            if (nomMark === 'N') nominationBadgeClass = 'badge-plus';
            if (nomMark === 'F') nominationBadgeClass = 'badge-minus';

            // Compact meetup / delivery location display
            let locationHTML = '';
            if (res.resType === 'delivery') {
                locationHTML = `<span class="badge-adj badge-minus">デリ</span>`;
            } else {
                const locName = res.meetupPlace === 'custom' ? res.meetupPlaceCustom : res.meetupPlace;
                locationHTML = `<span class="badge-adj badge-plus">${escapeHTML(locName)}</span>`;
            }

            // Format adjustments column
            let adjHTML = '';
            if (res.adjTransport > 0) {
                adjHTML += `<span class="badge-adj badge-plus">+${formatNumber(res.adjTransport)}</span>`;
            }
            if (res.adjDiscount > 0) {
                adjHTML += `<span class="badge-adj badge-minus">-${formatNumber(res.adjDiscount)}</span>`;
            }
            if (res.adjMemo) {
                adjHTML += `<span class="adj-text">${escapeHTML(res.adjMemo)}</span>`;
            }
            if (!adjHTML) {
                adjHTML = '<span style="color:var(--text-muted)">-</span>';
            }

            // Highlight if reservation date matches today's date
            const todayStr = getLocalDateString(new Date());
            if (res.date === todayStr) {
                tr.style.borderLeft = '3px solid var(--primary)';
            }

            tr.innerHTML = `
                <td><strong>${escapeHTML(res.date)}</strong></td>
                <td><span style="font-weight: 500;">${escapeHTML(res.time)}</span></td>
                <td>
                    <div>${escapeHTML(res.customerName)}</div>
                    <div style="margin-top: 4px;">${customerTypeHTML}</div>
                </td>
                <td class="no-print-col">${escapeHTML(res.customerPhone)}</td>
                <td>
                    <span style="color: var(--primary-hover); font-weight:500;">${escapeHTML(res.staffName)}</span>
                    <span class="badge-adj ${nominationBadgeClass}" style="margin-left:4px; font-size:10px; padding:1px 4px;">${nomMark}</span>
                </td>
                <td>
                    <div>${courseText}</div>
                    <div style="margin-top: 4px;">${locationHTML}</div>
                </td>
                <td>¥${formatNumber(res.baseFee)}</td>
                <td>${adjHTML}</td>
                <td><strong>¥${formatNumber(res.totalFee)}</strong></td>
                <td class="col-actions no-print">
                    <div class="action-btns">
                        <button class="btn-edit-outline" data-index="${originalIndex}">編集</button>
                        <button class="btn-primary btn-sm" style="padding: 4px 8px; font-size: 11px;" data-print-index="${originalIndex}">伝票</button>
                        <button class="btn-danger-outline" data-index="${originalIndex}">削除</button>
                    </div>
                </td>
            `;

            // Event Listeners for row actions
            tr.querySelector('.btn-edit-outline').addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                editReservation(idx);
            });

            tr.querySelector('[data-print-index]').addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-print-index');
                printSingleSlip(idx);
            });

            tr.querySelector('.btn-danger-outline').addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                deleteReservation(idx);
            });

            reservationTableBody.appendChild(tr);
        });
    }

    // Escape HTML to prevent XSS bugs
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ==========================================================================
    // Event Listeners & Core Operations
    // ==========================================================================

    // Auto calculate fee when inputs change
    selectCourse.addEventListener('change', () => {
        if (selectCourse.value === 'custom') {
            groupCustomDuration.classList.remove('hidden');
            inputCustomDuration.setAttribute('required', 'true');
            inputCustomDuration.focus();
        } else {
            groupCustomDuration.classList.add('hidden');
            inputCustomDuration.removeAttribute('required');
            inputCustomDuration.value = '';
        }
        calculateFees();
    });

    inputCustomDuration.addEventListener('input', calculateFees);
    inputAdjTransport.addEventListener('input', calculateFees);
    inputAdjDiscount.addEventListener('input', calculateFees);

    // Form Submission (Add or Update)
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Manual validation check for custom elements
        if (!reservationForm.checkValidity()) {
            reservationForm.reportValidity();
            return;
        }

        const date = inputDate.value;
        const time = inputTime.value;
        const customerName = inputCustName.value.trim();
        const customerPhone = inputCustPhone.value.trim();
        const staffName = inputStaffName.value.trim();
        const courseType = selectCourse.value;
        
        let courseDuration = courseType;
        let isCustomDuration = false;

        if (courseType === 'custom') {
            courseDuration = parseInt(inputCustomDuration.value);
            isCustomDuration = true;
            if (!courseDuration || courseDuration <= 0) {
                showToast('カスタム時間を正しく入力してください。', 'error');
                return;
            }
        }

        const transport = parseInt(inputAdjTransport.value) || 0;
        const discount = parseInt(inputAdjDiscount.value) || 0;
        const memo = inputAdjMemo.value.trim();
        
        // Get new fields data
        const customerType = getSelectedRadioValue(radioCustType);
        const leadSource = customerType === 'new' ? selectMedia.value : '';
        const nominationType = getSelectedRadioValue(radioNomination);
        const resType = getSelectedRadioValue(radioResType);
        
        let meetupPlace = '';
        let meetupPlaceCustom = '';
        
        if (resType === 'meetup') {
            meetupPlace = selectMeetup.value;
            if (meetupPlace === 'custom') {
                meetupPlaceCustom = inputMeetupCustom.value.trim();
                if (!meetupPlaceCustom) {
                    showToast('カスタム待ち合わせ場所を入力してください。', 'error');
                    return;
                }
            }
        }

        const op = inputOp.value.trim();
        const previousInfo = inputPrev.value.trim();

        // Extra Validation: if customerType is 'new', media must be selected
        if (customerType === 'new' && !leadSource) {
            showToast('広告媒体を選択してください。', 'error');
            return;
        }

        // Calculate final amounts
        const { baseFee, totalFee } = calculateFees();

        const reservationData = {
            id: inputEditIndex.value ? reservations[inputEditIndex.value].id : Date.now().toString(),
            date,
            time,
            customerName,
            customerPhone,
            staffName,
            courseDuration,
            isCustomDuration,
            baseFee,
            adjTransport: transport,
            adjDiscount: discount,
            adjMemo: memo,
            totalFee,
            
            // New details
            customerType,
            leadSource,
            nominationType,
            resType,
            meetupPlace,
            meetupPlaceCustom,
            op,
            previousInfo
        };

        const editIdx = inputEditIndex.value;
        
        if (editIdx !== '') {
            // Update mode
            reservations[editIdx] = reservationData;
            showToast('予約情報を更新しました。', 'success');
        } else {
            // Add mode
            reservations.push(reservationData);
            showToast('新規予約を登録しました。', 'success');
        }

        saveState();
        resetForm();
    });

    // Edit Reservation handler
    function editReservation(index) {
        const res = reservations[index];
        if (!res) return;

        inputEditIndex.value = index;
        inputDate.value = res.date;
        inputTime.value = res.time;
        inputCustName.value = res.customerName;
        inputCustPhone.value = res.customerPhone;
        inputStaffName.value = res.staffName;

        if (res.isCustomDuration) {
            selectCourse.value = 'custom';
            groupCustomDuration.classList.remove('hidden');
            inputCustomDuration.setAttribute('required', 'true');
            inputCustomDuration.value = res.courseDuration;
        } else {
            selectCourse.value = res.courseDuration;
            groupCustomDuration.classList.add('hidden');
            inputCustomDuration.removeAttribute('required');
            inputCustomDuration.value = '';
        }

        inputAdjTransport.value = res.adjTransport;
        inputAdjDiscount.value = res.adjDiscount;
        inputAdjMemo.value = res.adjMemo || '';

        // New fields filling
        setRadioSelectedValue(radioCustType, res.customerType || 'new');
        handleCustomerTypeChange();
        if (res.customerType === 'new') {
            selectMedia.value = res.leadSource || '';
        }

        setRadioSelectedValue(radioNomination, res.nominationType || 'main');
        setRadioSelectedValue(radioResType, res.resType || 'meetup');
        handleResTypeChange();

        if (res.resType === 'meetup') {
            selectMeetup.value = res.meetupPlace || '';
            handleMeetupPlaceChange();
            if (res.meetupPlace === 'custom') {
                inputMeetupCustom.value = res.meetupPlaceCustom || '';
            }
        }

        inputOp.value = res.op || '';
        inputPrev.value = res.previousInfo || '';

        // Update fee calculations
        calculateFees();

        // Update form visual status
        formTitle.textContent = '✏️ 予約内容の編集';
        submitText.textContent = '変更を保存する';
        btnCancelEdit.classList.remove('hidden');

        // Scroll form into view if on mobile
        document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth' });
    }

    // Cancel Edit operation
    btnCancelEdit.addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
        showToast('編集をキャンセルしました。', 'info');
    });

    // Delete Reservation handler
    function deleteReservation(index) {
        const res = reservations[index];
        if (!res) return;

        const confirmMsg = `${res.date} ${res.time}の ${res.customerName} 様 (女の子: ${res.staffName}) の予約を削除しますか？`;
        if (confirm(confirmMsg)) {
            reservations.splice(index, 1);
            showToast('予約を削除しました。', 'success');
            saveState();
            
            // If we deleted the item we were currently editing, reset the form
            const currentEditIndex = inputEditIndex.value;
            if (currentEditIndex === index) {
                resetForm();
            }
        }
    }

    // ==========================================================================
    // Filter controls
    // ==========================================================================

    filterDateInput.addEventListener('change', (e) => {
        activeFilterDate = e.target.value;
        renderTable();
    });

    btnFilterToday.addEventListener('click', () => {
        const today = getLocalDateString(new Date());
        filterDateInput.value = today;
        activeFilterDate = today;
        renderTable();
    });

    btnFilterClear.addEventListener('click', () => {
        filterDateInput.value = '';
        activeFilterDate = '';
        renderTable();
    });

    // ==========================================================================
    // Settings modal & dynamic places management
    // ==========================================================================
    
    // Tab switching inside settings modal
    function switchTab(tab) {
        if (tab === 'rates') {
            btnTabRates.classList.add('active');
            btnTabPlaces.classList.remove('active');
            contentTabRates.classList.remove('hidden');
            contentTabPlaces.classList.add('hidden');
        } else {
            btnTabRates.classList.remove('active');
            btnTabPlaces.classList.add('active');
            contentTabRates.classList.add('hidden');
            contentTabPlaces.classList.remove('hidden');
            renderPlacesList();
        }
    }

    // Render list of places in settings modal
    function renderPlacesList() {
        listPlaces.innerHTML = '';
        if (meetupPlaces.length === 0) {
            listPlaces.innerHTML = '<li class="place-item" style="color:var(--text-muted);">登録されている場所がありません。</li>';
            return;
        }
        
        meetupPlaces.forEach((place, index) => {
            const li = document.createElement('li');
            li.className = 'place-item';
            li.innerHTML = `
                <span>${escapeHTML(place)}</span>
                <button type="button" class="btn-delete-place" data-index="${index}">&times;</button>
            `;
            
            li.querySelector('.btn-delete-place').addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                handleDeletePlace(idx);
            });
            
            listPlaces.appendChild(li);
        });
    }

    // Add place to master database
    function handleAddPlace() {
        const name = inputNewPlace.value.trim();
        if (!name) {
            showToast('場所名を入力してください。', 'error');
            return;
        }
        
        if (meetupPlaces.includes(name)) {
            showToast('すでに登録されている場所です。', 'error');
            return;
        }
        
        meetupPlaces.push(name);
        localStorage.setItem('luminous_meetup_places', JSON.stringify(meetupPlaces));
        inputNewPlace.value = '';
        renderPlacesList();
        populateMeetupSelect();
        showToast('新しい待ち合わせ場所を追加しました。', 'success');
    }

    // Delete place from master database
    function handleDeletePlace(index) {
        const deletedName = meetupPlaces[index];
        if (confirm(`「${deletedName}」を削除しますか？`)) {
            meetupPlaces.splice(index, 1);
            localStorage.setItem('luminous_meetup_places', JSON.stringify(meetupPlaces));
            renderPlacesList();
            populateMeetupSelect();
            showToast('待ち合わせ場所を削除しました。', 'success');
        }
    }

    btnSettings.addEventListener('click', () => {
        loadSettingsInputs();
        switchTab('rates'); // Default to rates tab
        modalSettings.classList.remove('hidden');
    });

    btnModalClose.addEventListener('click', () => {
        modalSettings.classList.add('hidden');
    });

    // Close modal when clicking background overlay
    modalSettings.addEventListener('click', (e) => {
        if (e.target === modalSettings) {
            modalSettings.classList.add('hidden');
        }
    });

    // Reset pricing settings to defaults
    btnResetSettings.addEventListener('click', () => {
        if (confirm('料金設定を標準の初期値に戻しますか？')) {
            settings = { ...DEFAULT_SETTINGS };
            loadSettingsInputs();
            showToast('設定を初期値に戻しました。(保存ボタンを押すと適用されます)', 'info');
        }
    });

    // Save pricing settings
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        settings.price60 = parseInt(document.getElementById('price-60').value) || 0;
        settings.price90 = parseInt(document.getElementById('price-90').value) || 0;
        settings.price120 = parseInt(document.getElementById('price-120').value) || 0;
        settings.price150 = parseInt(document.getElementById('price-150').value) || 0;
        settings.price180 = parseInt(document.getElementById('price-180').value) || 0;
        settings.priceCustomMin = parseInt(document.getElementById('price-custom-min').value) || 0;

        localStorage.setItem('luminous_settings', JSON.stringify(settings));
        
        // Recalculate current form fees since settings changed
        calculateFees();
        
        // Re-render table
        renderAll();
        
        modalSettings.classList.add('hidden');
        showToast('料金設定を保存・更新しました。', 'success');
    });

    // ==========================================================================
    // CSV Export
    // ==========================================================================

    btnCSV.addEventListener('click', () => {
        let filtered = reservations;
        if (activeFilterDate) {
            filtered = reservations.filter(res => res.date === activeFilterDate);
        }

        // Sort chronological
        filtered.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        if (filtered.length === 0) {
            showToast('エクスポートする予約データがありません。', 'error');
            return;
        }

        // CSV Header (Japanese - updated for new fields)
        const headers = [
            '日付',
            '開始時間',
            'お客様名',
            '電話番号',
            '顧客区分',
            '広告媒体',
            '女の子の名前',
            '指名区分',
            'コース時間',
            '予約タイプ',
            '待ち合わせ場所',
            'OP(オプション)',
            'デリ詳細/場所',
            '前回情報',
            '基本料金(円)',
            '交通費(円)',
            '割引額(円)',
            '合計料金(円)'
        ];

        // Format CSV rows
        const rows = filtered.map(res => {
            const courseText = res.isCustomDuration ? `カスタム(${res.courseDuration}分)` : `${res.courseDuration}分`;
            const custTypeStr = res.customerType === 'new' ? '新規(新)' : 'リピーター(Ｒ)';
            const nomStr = res.nominationType === 'main' ? '本指名' : res.nominationType === 'net' ? 'ネット指名' : 'フリー';
            const resTypeStr = res.resType === 'delivery' ? 'デリバリー' : '待ち合わせ';
            
            let meetupStr = '';
            if (res.resType === 'meetup') {
                meetupStr = res.meetupPlace === 'custom' ? res.meetupPlaceCustom : res.meetupPlace;
            }
            
            return [
                res.date,
                res.time,
                res.customerName,
                res.customerPhone,
                custTypeStr,
                res.customerType === 'new' ? res.leadSource : '',
                res.staffName,
                nomStr,
                courseText,
                resTypeStr,
                meetupStr,
                res.op || '',
                res.resType === 'delivery' ? res.adjMemo : '', // For delivery, location is stored in memo
                res.previousInfo || '',
                res.baseFee,
                res.adjTransport,
                res.adjDiscount,
                res.totalFee
            ].map(val => {
                // Escape value for CSV: double quotes, commas, and line breaks
                let escaped = String(val).replace(/"/g, '""');
                if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
                    escaped = `"${escaped}"`;
                }
                return escaped;
            });
        });

        // Combine Header and Rows
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        // Add UTF-8 BOM so Excel opens it correctly without Japanese scrambling
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = activeFilterDate 
            ? `予約一覧_${activeFilterDate.replace(/-/g, '')}.csv` 
            : `予約一覧_全期間_${timestamp}.csv`;
            
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('CSVファイルをエクスポートしました。', 'success');
    });

    // ==========================================================================
    // Print Slip Rendering Logic (Calc Grid Layout)
    // ==========================================================================

    // Generate Calc-style slip HTML for a single reservation
    function generateSlipHTML(res) {
        const slashDate = getSlashDateString(res.date);
        const nominationMark = getNominationMark(res.nominationType);
        
        // Format Customer & Nomination cell content
        let customerNominationHTML = '';
        if (res.customerType === 'new') {
            const mediaAbbrev = abbreviateMedia(res.leadSource);
            if (mediaAbbrev === 'その他') {
                customerNominationHTML = `${escapeHTML(res.customerName)} 様 (新・<span class="print-small">その他</span> / ${nominationMark})`;
            } else {
                customerNominationHTML = `${escapeHTML(res.customerName)} 様 (新・${escapeHTML(mediaAbbrev)} / ${nominationMark})`;
            }
        } else {
            customerNominationHTML = `${escapeHTML(res.customerName)} 様 (Ｒ / ${nominationMark})`;
        }

        // Meetup place cell content
        let meetupPlaceCellClass = 'val';
        let meetupPlaceContent = '';
        
        if (res.resType === 'delivery') {
            // Draw a strike-through line on printing
            meetupPlaceCellClass = 'val line-through-cell';
            meetupPlaceContent = '&nbsp;';
        } else {
            meetupPlaceContent = escapeHTML(res.meetupPlace === 'custom' ? res.meetupPlaceCustom : res.meetupPlace);
        }

        // Delivery location cell content (from memo field if type is delivery)
        let deliveryLocationHTML = '';
        if (res.resType === 'delivery') {
            deliveryLocationHTML = escapeHTML(res.adjMemo); // e.g. "堺区デリ"
        } else {
            // If meetup, it is blank or we can output optional delivery info if they filled it
            deliveryLocationHTML = '&nbsp;';
        }

        // Format outputs
        const courseText = res.isCustomDuration ? `${res.courseDuration}` : `${res.courseDuration}`;
        const feeText = formatNumber(res.totalFee);
        const opContent = res.op ? escapeHTML(res.op) : '&nbsp;';
        const prevContent = res.previousInfo ? escapeHTML(res.previousInfo) : '&nbsp;';

        const now = new Date();
        const timestampStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        return `
            <div class="print-card-wrapper">
                <div class="print-card-meta">
                    <div>Luminous Reservation Slip</div>
                    <div>出力日時: ${timestampStr}</div>
                </div>
                <table class="print-card-table">
                    <colgroup>
                        <col style="width: 33%;">
                        <col style="width: 33%;">
                        <col style="width: 34%;">
                    </colgroup>
                    <tr>
                        <td class="hdr">日付</td>
                        <td class="hdr">顧客・指名</td>
                        <td class="hdr">女の子</td>
                    </tr>
                    <tr>
                        <td class="val text-center date-val">${escapeHTML(slashDate)}</td>
                        <td class="val cust-val">${customerNominationHTML}</td>
                        <td class="val staff-val text-center">${escapeHTML(res.staffName)}</td>
                    </tr>
                    <tr>
                        <td class="hdr">コース分数</td>
                        <td class="hdr">料金</td>
                        <td class="hdr">予約時刻</td>
                    </tr>
                    <tr>
                        <td class="val text-center course-val">${escapeHTML(courseText)}</td>
                        <td class="val text-right fee-val">${escapeHTML(feeText)}</td>
                        <td class="val text-center time-val">${escapeHTML(res.time)}</td>
                    </tr>
                    <tr>
                        <td class="hdr" colspan="2">待ち合わせ場所</td>
                        <td class="hdr">OP</td>
                    </tr>
                    <tr>
                        <td class="${meetupPlaceCellClass}" colspan="2">${meetupPlaceContent}</td>
                        <td class="val text-center">${opContent}</td>
                    </tr>
                    <tr>
                        <td class="hdr" colspan="2">デリ詳細</td>
                        <td class="hdr">前回</td>
                    </tr>
                    <tr>
                        <td class="val" colspan="2">${deliveryLocationHTML}</td>
                        <td class="val">${prevContent}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    // Print all slips (chronological, filtered)
    function printAllSlips() {
        let filtered = reservations;
        if (activeFilterDate) {
            filtered = reservations.filter(res => res.date === activeFilterDate);
        }

        if (filtered.length === 0) {
            showToast('印刷する予約データがありません。', 'error');
            return;
        }

        // Sort chronological
        filtered.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        // Generate and append cards
        printCardsContainer.innerHTML = '';
        filtered.forEach((res, index) => {
            let cardHTML = generateSlipHTML(res);
            
            // Add page break after every card except the last
            if (index < filtered.length - 1) {
                cardHTML = `<div class="page-break">${cardHTML}</div>`;
            }
            
            printCardsContainer.innerHTML += cardHTML;
        });

        // Trigger native print dialog
        window.print();
    }

    // Print a single specific slip
    function printSingleSlip(index) {
        const res = reservations[index];
        if (!res) return;

        printCardsContainer.innerHTML = generateSlipHTML(res);

        // Trigger native print dialog
        window.print();
    }

    // Toolbar printing triggers "Print All"
    btnPrint.addEventListener('click', printAllSlips);
});
