class Calendar {
    constructor() {
        this.currentDate = new Date(); // Kullanıcının saat dilimine göre bugünün tarihi
        this.events = this.loadEvents();
        this.selectedDate = null;
        this.draggedEvent = null;
        this.draggedDate = null;
        this.shareId = this.generateShareId();
        this.plans = this.loadPlans();
        this.currentPlanId = 'default';
        this.currentView = 'month'; // 'month', 'week', 'day'
        this.editingPlanId = null; // Düzenlenen planın ID'sini tutar
        
        this.init();
    }
     
    init() {
        this.loadFromURL(); // URL'den veri yükle
        this.renderCalendar();
        this.bindEvents();
        this.checkEditMode();
        this.updatePlanSelector(); // Plan seçiciyi güncelle
        this.bindColorOptions(); // Renk seçeneklerini bağla
        this.applyPlanTheme();
        this.requestNotificationPermission();
        this.checkTodayEventsForNotification();
        // Gün değişimini otomatik algıla
        this.startDayChangeWatcher();
        this.loadTheme(); // Otomatik tema yükle
    }
    
    bindEvents() {
        document.getElementById('prevMonth').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('saveEvent').addEventListener('click', () => this.saveEvent());
        document.getElementById('deleteEvent').addEventListener('click', () => this.deleteEvent());
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        
        // Arama olayları
        document.getElementById('searchBtn').addEventListener('click', () => this.searchEvents());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchEvents();
            }
        });
        
        // Dışa aktarma olayları
        document.getElementById('exportBtn').addEventListener('click', () => this.openExportModal());
        document.getElementById('closeExportModal').addEventListener('click', () => this.closeExportModal());
        document.getElementById('exportPDF').addEventListener('click', () => { this.exportToPDF(); this.closeExportModal(); });
        document.getElementById('exportExcel').addEventListener('click', () => { this.exportToExcel(); this.closeExportModal(); });
        document.getElementById('exportText').addEventListener('click', () => { this.exportToText(); this.closeExportModal(); });

        // Paylaşım olayları
        document.getElementById('shareBtn').addEventListener('click', () => this.openShareModal());
        document.getElementById('closeShareModal').addEventListener('click', () => this.closeShareModal());
        document.getElementById('generateViewLink').addEventListener('click', () => this.generateAndCopyShareLink('view'));
        document.getElementById('generateEditLink').addEventListener('click', () => this.generateAndCopyShareLink('edit'));
        
        // Veri yönetimi
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());
        document.getElementById('exportData').addEventListener('click', () => this.exportAllData());
        document.getElementById('importData').addEventListener('click', () => this.importAllData());
        
        // Tekrarlama bitiş tarihi göster/gizle
        document.getElementById('eventRepeat').addEventListener('change', (e) => {
            const container = document.getElementById('repeat-end-date-container');
            if (e.target.value === 'none') {
                container.style.display = 'none';
            } else {
                container.style.display = 'block';
            }
        });

        // Modal dışına tıklayınca kapat
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
                this.closeShareModal();
                this.closeNewPlanModal();
                this.closePlanManagementModal();
                this.closeExportModal();
            }
            
            const actionsDropdown = document.getElementById('actionsDropdown');
            const actionsBtn = document.getElementById('actionsMenuBtn');
            // Menü dışına tıklayınca kapat
            if (actionsDropdown && actionsBtn && !actionsBtn.contains(e.target) && !actionsDropdown.contains(e.target)) {
                actionsDropdown.style.display = 'none';
            }
        });
        
        // Klavye kısayolları
        document.addEventListener('keydown', (e) => {
            // Modal açıksa ve ESC'ye basılırsa kapat
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeShareModal();
                this.closeNewPlanModal();
                this.closePlanManagementModal();
                document.getElementById('exportOptions').classList.remove('show');
            }
            // Ctrl+F ile arama inputuna odaklan
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            // Ok tuşlarıyla ay/hafta/gün değişimi
            if (e.key === 'ArrowLeft') {
                this.previousMonth();
            }
            if (e.key === 'ArrowRight') {
                this.nextMonth();
            }
            if (e.key === 'ArrowUp') {
                this.switchView('week');
            }
            if (e.key === 'ArrowDown') {
                this.switchView('day');
            }
        });

        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
        document.getElementById('yearViewBtn').addEventListener('click', () => this.openYearModal());
        document.getElementById('closeYearModal').addEventListener('click', () => this.closeYearModal());
        
        // Plan yönetimi olayları
        document.getElementById('newPlanBtn').addEventListener('click', () => this.openNewPlanModal());
        document.getElementById('closeNewPlanModal').addEventListener('click', () => this.closeNewPlanModal());
        document.getElementById('createPlan').addEventListener('click', () => this.savePlan());
        document.getElementById('cancelPlan').addEventListener('click', () => this.closeNewPlanModal());
        document.getElementById('planSelector').addEventListener('change', (e) => this.switchPlan(e.target.value));
        
        // Plan yönetimi modal olayları
        document.getElementById('managePlansBtn').addEventListener('click', () => this.openPlanManagementModal());
        document.getElementById('closePlanManagementModal').addEventListener('click', () => this.closePlanManagementModal());
        document.getElementById('shiftPlanBtn').addEventListener('click', () => this.shiftPlan());

        document.getElementById('exportPlanBtn').addEventListener('click', () => this.exportCurrentPlan());
        document.getElementById('importPlanInput').addEventListener('change', (e) => this.importPlanFromFile(e));
        document.getElementById('eventFile').addEventListener('change', (e) => this.handleEventFile(e));

        document.getElementById('monthViewBtn').addEventListener('click', () => this.switchView('month'));
        document.getElementById('weekViewBtn').addEventListener('click', () => this.switchView('week'));
        document.getElementById('dayViewBtn').addEventListener('click', () => this.switchView('day'));
        document.getElementById('yearViewBtn').addEventListener('click', () => this.openYearModal());

        // Yeni "İşlemler" menüsü
        const actionsBtn = document.getElementById('actionsMenuBtn');
        const actionsDropdown = document.getElementById('actionsDropdown');
        if(actionsBtn) {
            actionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actionsDropdown.style.display = actionsDropdown.style.display === 'block' ? 'none' : 'block';
            });
        }
        // Menü dışına tıklayınca kapat
        window.addEventListener('click', (e) => {
            if (actionsDropdown && !actionsBtn.contains(e.target)) {
                actionsDropdown.style.display = 'none';
            }
        });
    }
    
    // Paylaşım ID oluştur
    generateShareId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    // URL'den veri yükle
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('share');
        
        if (sharedData) {
            try {
                const decodedData = decodeURIComponent(sharedData);
                const parsedEvents = JSON.parse(decodedData);
                
                // Paylaşılan verileri yükle
                this.events = parsedEvents;
                this.saveEvents();
                
                // Başarı mesajı göster
                this.showNotification('Paylaşılan takvim yüklendi!', 'success');
                
                // URL'i temizle
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Paylaşılan veri yüklenirken hata:', error);
                this.showNotification('Paylaşılan veri yüklenirken hata oluştu!', 'error');
            }
        }
    }
    
    // Paylaşım modal'ını aç
    openShareModal() {
        document.getElementById('shareModal').style.display = 'block';
    }
    
    // Paylaşım modal'ını kapat
    closeShareModal() {
        document.getElementById('shareModal').style.display = 'none';
    }
    
    generateAndCopyShareLink(mode) {
        const eventsData = JSON.stringify(this.events);
        const encodedData = encodeURIComponent(eventsData);
        const baseUrl = window.location.origin + window.location.pathname;
        let link = `${baseUrl}?share=${encodedData}`;

        if (mode === 'view') {
            link += '&mode=view';
        } else { // 'edit'
            link += '&mode=edit';
        }

        navigator.clipboard.writeText(link).then(() => {
            const message = mode === 'view'
                ? 'Sadece görüntüleme linki panoya kopyalandı!'
                : 'Düzenleme linki panoya kopyalandı!';
            this.showNotification(message, 'success');
            this.closeShareModal();
        }).catch(err => {
            console.error('Kopyalama hatası:', err);
            this.showNotification('Link kopyalanamadı!', 'error');
        });
    }
    
    // İndirme menüsünü aç/kapat
    toggleExportOptions() {
        // Bu fonksiyon yeni tasarımda kullanılmıyor ama hata vermemesi için kalabilir.
    }
    
    // Etkinlik metnini güvenli şekilde string olarak döndür
    getEventText(event) {
        if (!event) return '';
        if (typeof event.text === 'string') return event.text;
        if (typeof event.text === 'object' && event.text !== null) {
            if ('text' in event.text) return event.text.text;
            return JSON.stringify(event.text);
        }
        return '';
    }
    
    // PDF İndirme
    exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.setFont('courier', 'normal');
            doc.setFontSize(20);
            doc.text('Takvim Etkinlikleri', 20, 20);
            doc.setFontSize(12);
            doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
            const events = this.getEventsForExport();
            if (events.length === 0) {
                doc.text('Henüz etkinlik eklenmemiş.', 20, 50);
            } else {
                const tableData = events.map(event => [
                    event.date,
                    this.getEventText(event)
                ]);
                doc.autoTable({
                    startY: 40,
                    head: [['Tarih', 'Etkinlik']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [79, 172, 254],
                        textColor: 255
                    },
                    styles: {
                        fontSize: 10
                    }
                });
            }
            const fileName = `takvim_etkinlikleri_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            this.showNotification('PDF başarıyla indirildi!');
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            this.showNotification('PDF oluşturulurken hata oluştu!', 'error');
        }
    }
    
    // Excel İndirme
    exportToExcel() {
        try {
            const events = this.getEventsForExport();
            const wb = XLSX.utils.book_new();
            const data = [
                ['Tarih', 'Etkinlik', 'Oluşturulma Tarihi'],
                ...events.map(event => [
                    event.date,
                    this.getEventText(event),
                    new Date().toLocaleDateString('tr-TR')
                ])
            ];
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [
                { width: 15 },
                { width: 50 },
                { width: 20 }
            ];
            XLSX.utils.book_append_sheet(wb, ws, 'Takvim Etkinlikleri');
            const fileName = `takvim_etkinlikleri_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            this.showNotification('Excel dosyası başarıyla indirildi!');
        } catch (error) {
            console.error('Excel oluşturma hatası:', error);
            this.showNotification('Excel dosyası oluşturulurken hata oluştu!', 'error');
        }
    }
    
    // Metin İndirme
    exportToText() {
        try {
            const events = this.getEventsForExport();
            let content = 'TAKVİM ETKİNLİKLERİ\n';
            content += '='.repeat(50) + '\n\n';
            content += `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}\n\n`;
            if (events.length === 0) {
                content += 'Henüz etkinlik eklenmemiş.\n';
            } else {
                events.forEach((event, index) => {
                    let text = this.getEventText(event);
                    content += `${index + 1}. ${event.date}\n`;
                    content += `   ${text}\n\n`;
                });
            }
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `takvim_etkinlikleri_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification('Metin dosyası başarıyla indirildi!');
        } catch (error) {
            console.error('Metin dosyası oluşturma hatası:', error);
            this.showNotification('Metin dosyası oluşturulurken hata oluştu!', 'error');
        }
    }
    
    // İndirme için etkinlik verilerini hazırla
    getEventsForExport(startDate = null, endDate = null) {
        const events = [];
        Object.keys(this.events).forEach(dateKey => {
            const date = new Date(dateKey);
            if (startDate && date < startDate) return;
            if (endDate && date > endDate) return;
            const dateStr = `${date.getDate()} ${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
            events.push({
                date: dateStr,
                text: this.events[dateKey],
                originalDate: date
            });
        });
        // Tarihe göre sırala
        return events.sort((a, b) => a.originalDate - b.originalDate);
    }
    
    // Arama fonksiyonu
    searchEvents() {
        const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
        const resultsContainer = document.getElementById('searchResults');
        
        if (!searchTerm) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        const results = [];
        
        // Tüm etkinliklerde ara
        Object.keys(this.events).forEach(dateKey => {
            const eventObj = this.events[dateKey];
            if (!eventObj || !eventObj.text) return;

            const eventText = eventObj.text.toLowerCase();
            if (eventText.includes(searchTerm)) {
                const date = new Date(dateKey);
                results.push({
                    date: date,
                    dateKey: dateKey,
                    text: eventObj.text,
                    matchIndex: eventText.indexOf(searchTerm)
                });
            }
        });
        
        this.displaySearchResults(results, searchTerm);
    }
    
    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Arama sonucu bulunamadı</div>';
            return;
        }
        
        let html = '';
        results.forEach(result => {
            const highlightedText = this.highlightSearchTerm(result.text, searchTerm);
            const dateStr = `${result.date.getDate()} ${this.getMonthName(result.date.getMonth())} ${result.date.getFullYear()}`;
            
            html += `
                <div class="search-result-item" onclick="calendar.goToDate('${result.dateKey}')">
                    <div class="search-result-date">${dateStr}</div>
                    <div class="search-result-text">${highlightedText}</div>
                </div>
            `;
        });
        
        resultsContainer.innerHTML = html;
    }
    
    highlightSearchTerm(text, searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    goToDate(dateKey) {
        const date = new Date(dateKey);
        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.renderCalendar();
        
        // Arama sonuçlarını temizle
        document.getElementById('searchResults').innerHTML = '';
        document.getElementById('searchInput').value = '';
        
        // Seçili günü vurgula
        setTimeout(() => {
            const dayElements = document.querySelectorAll('.day');
            dayElements.forEach(day => {
                const dayNumber = day.querySelector('.day-number');
                if (dayNumber && parseInt(dayNumber.textContent) === date.getDate()) {
                    day.style.animation = 'pulse 1s ease';
                    setTimeout(() => {
                        day.style.animation = '';
                    }, 1000);
                }
            });
        }, 100);
    }
    
    renderCalendar() {
        if (this.currentView === 'month') {
            this.renderMonthView();
        } else if (this.currentView === 'week') {
            this.renderWeekView();
        } else if (this.currentView === 'day') {
            this.renderDayView();
        }
    }
    
    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Ay adını güncelle
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
        
        // Takvim günlerini oluştur
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Pazartesi başlangıç
        
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) { // 6 hafta x 7 gün
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDate.getDate();
            
            dayElement.appendChild(dayNumber);
            
            // Bugün mü kontrol et
            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }
            
            // Başka ay mı kontrol et
            if (currentDate.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            // Etkinlik var mı kontrol et
            const dateKey = this.formatDate(currentDate);
            let eventObj = this.events[dateKey];
            // Tekrarlayan etkinlikleri kontrol et
            if (!eventObj) {
                eventObj = this.getRepeatingEventForDate(currentDate);
            }
            if (eventObj && eventObj.text) {
                dayElement.classList.add('has-event');
                dayElement.setAttribute('data-category', eventObj.category || 'is');
                
                const eventPreview = document.createElement('div');
                eventPreview.className = 'event-preview';
                eventPreview.textContent = eventObj.text.substring(0, 20) + (eventObj.text.length > 20 ? '...' : '');
                dayElement.appendChild(eventPreview);
                
                // Sürükle-bırak için etkinlik önizlemesini sürüklenebilir yap
                eventPreview.draggable = true;
                eventPreview.addEventListener('dragstart', (e) => this.dragStart(e, currentDate, eventObj.text));
                eventPreview.addEventListener('dragend', (e) => this.dragEnd(e));
            }
            
            // Günlere drop zone ekle
            dayElement.addEventListener('dragover', (e) => this.dragOver(e));
            dayElement.addEventListener('drop', (e) => this.drop(e, currentDate));
            dayElement.addEventListener('dragenter', (e) => this.dragEnter(e));
            dayElement.addEventListener('dragleave', (e) => this.dragLeave(e));
            
            // Tıklama olayı
            dayElement.addEventListener('click', () => this.openEventModal(currentDate));
            
            calendarDays.appendChild(dayElement);
        }
    }
    
    renderWeekView() {
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';
        const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const weekRow = document.createElement('div');
        weekRow.className = 'weekdays';
        weekdays.forEach(day => {
            const wd = document.createElement('div');
            wd.textContent = day;
            weekRow.appendChild(wd);
        });
        calendarDays.appendChild(weekRow);
        // Haftanın ilk günü (Pazartesi)
        const date = new Date(this.currentDate);
        const dayOfWeek = (date.getDay() + 6) % 7; // Pazartesi=0
        const monday = new Date(date);
        monday.setDate(date.getDate() - dayOfWeek);
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(monday);
            currentDate.setDate(monday.getDate() + i);
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDate.getDate();
            dayElement.appendChild(dayNumber);
            // Bugün mü?
            const today = new Date(); today.setHours(0,0,0,0);
            if (currentDate.getTime() === today.getTime()) dayElement.classList.add('today');
            // Ay dışı mı?
            if (currentDate.getMonth() !== this.currentDate.getMonth()) dayElement.classList.add('other-month');
            // Etkinlik var mı?
            let eventObj = this.events[this.formatDate(currentDate)];
            if (!eventObj) eventObj = this.getRepeatingEventForDate(currentDate);
            if (eventObj && eventObj.text) {
                dayElement.classList.add('has-event');
                dayElement.setAttribute('data-category', eventObj.category || 'is');
                const eventPreview = document.createElement('div');
                eventPreview.className = 'event-preview';
                eventPreview.textContent = eventObj.text.substring(0, 20) + (eventObj.text.length > 20 ? '...' : '');
                dayElement.appendChild(eventPreview);
                eventPreview.draggable = true;
                eventPreview.addEventListener('dragstart', (e) => this.dragStart(e, currentDate, eventObj.text));
                eventPreview.addEventListener('dragend', (e) => this.dragEnd(e));
            }
            dayElement.addEventListener('dragover', (e) => this.dragOver(e));
            dayElement.addEventListener('drop', (e) => this.drop(e, currentDate));
            dayElement.addEventListener('dragenter', (e) => this.dragEnter(e));
            dayElement.addEventListener('dragleave', (e) => this.dragLeave(e));
            dayElement.addEventListener('click', () => this.openEventModal(currentDate));
            calendarDays.appendChild(dayElement);
        }
    }
    
    renderDayView() {
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';
        const date = new Date(this.currentDate);
        const dayBox = document.createElement('div');
        dayBox.className = 'day day-detail';
        // Tarih başlığı
        const dayTitle = document.createElement('div');
        dayTitle.className = 'day-title';
        dayTitle.textContent = `${date.getDate()} ${this.getMonthName(date.getMonth())} ${date.getFullYear()} (${['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][date.getDay()]})`;
        dayBox.appendChild(dayTitle);
        // Etkinlik
        let eventObj = this.events[this.formatDate(date)];
        if (!eventObj) eventObj = this.getRepeatingEventForDate(date);
        if (eventObj && eventObj.text) {
            const eventText = (eventObj.text && eventObj.text !== 'undefined') ? eventObj.text : '';
            const eventDetail = document.createElement('div');
            eventDetail.className = 'event-detail';
            eventDetail.innerHTML = `<strong>Etkinlik:</strong> ${eventText}<br><strong>Kategori:</strong> ${this.getCategoryLabel(eventObj.category)}<br><strong>Tekrar:</strong> ${this.getRepeatLabel(eventObj.repeat)}`;
            if (eventObj.filename && eventObj.file) {
                eventDetail.innerHTML += `<br><strong>Dosya:</strong> <a href="${eventObj.file}" download="${eventObj.filename}">${eventObj.filename}</a>`;
            }
            dayBox.appendChild(eventDetail);
        } else {
            const noEvent = document.createElement('div');
            noEvent.className = 'event-detail';
            noEvent.textContent = 'Bu gün için etkinlik yok.';
            dayBox.appendChild(noEvent);
        }
        // Ekle/düzenle butonu
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Etkinlik Ekle/Düzenle';
        editBtn.className = 'month-view-btn';
        editBtn.onclick = () => this.openEventModal(date);
        dayBox.appendChild(editBtn);
        calendarDays.appendChild(dayBox);
    }
    
    // Sürükle-bırak fonksiyonları
    dragStart(e, date, eventText) {
        this.draggedEvent = eventText;
        this.draggedDate = date;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', eventText);
        e.target.style.opacity = '0.5';
    }
    
    dragEnd(e) {
        e.target.style.opacity = '1';
        this.draggedEvent = null;
        this.draggedDate = null;
    }
    
    dragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    dragEnter(e) {
        e.preventDefault();
        e.target.closest('.day').classList.add('drag-over');
    }
    
    dragLeave(e) {
        e.target.closest('.day').classList.remove('drag-over');
    }
    
    drop(e, targetDate) {
        e.preventDefault();
        e.target.closest('.day').classList.remove('drag-over');
        
        if (this.draggedEvent && this.draggedDate) {
            const sourceDateKey = this.formatDate(this.draggedDate);
            const targetDateKey = this.formatDate(targetDate);
            
            // Aynı güne bırakılıyorsa hiçbir şey yapma
            if (sourceDateKey === targetDateKey) return;
            
            // Etkinliği taşı
            this.events[targetDateKey] = this.draggedEvent;
            delete this.events[sourceDateKey];
            
            // Kaydet ve yeniden render et
            this.saveEvents();
            this.renderCalendar();
            
            // Başarı mesajı göster
            this.showNotification(`Etkinlik ${targetDate.getDate()} ${this.getMonthName(targetDate.getMonth())} tarihine taşındı`);
        }
    }
    
    showNotification(message, type = 'success') {
        // Basit bildirim sistemi
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        const bgColor = type === 'error' ? '#e74c3c' : '#4CAF50';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
    
    openEventModal(date) {
        this.selectedDate = date;
        const dateKey = this.formatDate(date);
        const eventObj = this.events[dateKey] || { text: '', category: '', repeat: 'none', file: null, filename: null, repeatEndDate: null };
        document.getElementById('modalDate').textContent = `${date.getDate()} ${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
        document.getElementById('eventText').value = eventObj.text || '';
        document.getElementById('eventCategory').value = eventObj.category || '';
        document.getElementById('eventRepeat').value = eventObj.repeat || 'none';
        
        // Tekrar bitiş tarihi
        const repeatEndDateContainer = document.getElementById('repeat-end-date-container');
        const repeatEndDateInput = document.getElementById('eventRepeatEndDate');
        if (eventObj.repeat && eventObj.repeat !== 'none') {
            repeatEndDateContainer.style.display = 'block';
            repeatEndDateInput.value = eventObj.repeatEndDate || '';
        } else {
            repeatEndDateContainer.style.display = 'none';
            repeatEndDateInput.value = '';
        }

        document.getElementById('eventModal').style.display = 'block';
        document.getElementById('deleteEvent').style.display = eventObj.text ? 'block' : 'none';
        // Dosya göster
        const fileInfo = document.getElementById('eventFileInfo');
        if (eventObj.file && eventObj.filename) {
            fileInfo.innerHTML = `<span>${eventObj.filename}</span> <a href="${eventObj.file}" download="${eventObj.filename}">İndir</a>`;
            fileInfo.dataset.file = eventObj.file;
            fileInfo.dataset.filename = eventObj.filename;
        } else {
            fileInfo.innerHTML = '';
            fileInfo.dataset.file = '';
            fileInfo.dataset.filename = '';
        }
        document.getElementById('eventFile').value = '';
        if (!document.getElementById('copyEventToPlan')) {
            const copyBtn = document.createElement('button');
            copyBtn.id = 'copyEventToPlan';
            copyBtn.textContent = 'Başka Plana Kopyala';
            copyBtn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
            copyBtn.style.color = 'white';
            copyBtn.style.marginLeft = 'auto';
            copyBtn.onclick = () => this.openCopyEventToPlanMenu(dateKey);
            document.querySelector('.modal-buttons').appendChild(copyBtn);
        }
        // Karakter sayacı başlat
        const eventText = document.getElementById('eventText');
        const eventCharCount = document.getElementById('eventCharCount');
        if (eventText && eventCharCount) {
            eventCharCount.textContent = `${eventText.value.length}/500`;
            eventText.maxLength = 500;
            eventText.addEventListener('input', this.updateCharCount);
        }
        // Bitiş tarihi alanını ve değerini sıfırla
        document.getElementById('repeat-end-date-container').style.display = 'none';
        document.getElementById('eventRepeatEndDate').value = '';
    }
    
    updateCharCount() {
        const eventText = document.getElementById('eventText');
        const eventCharCount = document.getElementById('eventCharCount');
        if (eventText && eventCharCount) {
            eventCharCount.textContent = `${eventText.value.length}/500`;
        }
    }
    
    openCopyEventToPlanMenu(dateKey) {
        const planOptions = Object.values(this.plans).filter(p => p.id !== this.currentPlanId);
        if (planOptions.length === 0) {
            this.showNotification('Kopyalanacak başka plan yok!', 'error');
            return;
        }
        const planNames = planOptions.map(p => `${p.name}`).join('\n');
        const selected = prompt(`Etkinliği kopyalamak istediğiniz planı seçin:\n${planNames}`);
        const targetPlan = planOptions.find(p => p.name === selected);
        if (!targetPlan) {
            this.showNotification('Geçersiz plan seçimi!', 'error');
            return;
        }
        // Etkinliği kopyala (kategoriyle birlikte)
        targetPlan.events[dateKey] = this.events[dateKey];
        this.savePlans();
        this.showNotification(`Etkinlik "${targetPlan.name}" planına kopyalandı!`);
    }
    
    closeModal() {
        document.getElementById('eventModal').style.display = 'none';
        this.selectedDate = null;
        // Modal inputlarını sıfırla
        document.getElementById('eventText').value = '';
        document.getElementById('eventCategory').value = '';
        document.getElementById('eventRepeat').value = 'none';
        document.getElementById('eventFile').value = '';
        const fileInfo = document.getElementById('eventFileInfo');
        fileInfo.innerHTML = '';
        fileInfo.dataset.file = '';
        fileInfo.dataset.filename = '';
        // Bitiş tarihi alanını ve değerini sıfırla
        document.getElementById('repeat-end-date-container').style.display = 'none';
        document.getElementById('eventRepeatEndDate').value = '';
    }
    
    saveEvent() {
        if (!this.selectedDate) return;
        let eventText = document.getElementById('eventText').value.trim();
        if (eventText === 'undefined') eventText = '';
        const eventCategory = document.getElementById('eventCategory').value;
        const eventRepeat = document.getElementById('eventRepeat').value;
        const eventRepeatEndDate = document.getElementById('eventRepeatEndDate').value;
        const dateKey = this.formatDate(this.selectedDate);
        let fileData = document.getElementById('eventFileInfo').dataset.file || null;
        let fileName = document.getElementById('eventFileInfo').dataset.filename || null;
        if (eventText) {
            this.events[dateKey] = { 
                text: eventText, 
                category: eventCategory, 
                repeat: eventRepeat, 
                file: fileData, 
                filename: fileName,
                repeatEndDate: eventRepeat === 'none' ? null : eventRepeatEndDate
            };
        } else {
            delete this.events[dateKey];
        }
        this.saveEvents();
        this.renderCalendar();
        this.closeModal();
    }
    
    deleteEvent() {
        if (!this.selectedDate) return;
        
        const confirmDelete = confirm("Bu etkinliği silmek istediğinizden emin misiniz?");
        if (!confirmDelete) {
            return;
        }

        const dateKey = this.formatDate(this.selectedDate);
        delete this.events[dateKey];
        
        this.saveEvents();
        this.renderCalendar();
        this.closeModal();
    }
    
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
    }
    
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
    }
    
    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    getMonthName(month) {
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        return monthNames[month];
    }
    
    saveEvents() {
        // Mevcut planı kaydet
        this.saveCurrentPlan();
        // Eski localStorage uyumluluğu için de kaydet
        localStorage.setItem('calendarEvents', JSON.stringify(this.events));
    }
    
    loadEvents() {
        // Önce mevcut planın etkinliklerini yükle
        if (this.currentPlanId && this.plans[this.currentPlanId]) {
            return this.plans[this.currentPlanId].events || {};
        }
        
        // Eski localStorage uyumluluğu için
        const saved = localStorage.getItem('calendarEvents');
        return saved ? JSON.parse(saved) : {};
    }
    
    // Uygulama açılırken yetki kontrolü
    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        if (mode === 'view') {
            // Tüm düzenleme butonlarını ve inputları devre dışı bırak
            document.querySelectorAll('.day').forEach(day => day.style.pointerEvents = 'none');
            document.getElementById('searchInput').disabled = true;
            document.getElementById('searchBtn').disabled = true;
            document.getElementById('exportBtn').disabled = true;
            document.getElementById('shareBtn').disabled = true;
        }
    }

    // Tema değiştir (manuel override)
    toggleTheme() {
        document.body.classList.toggle('dark');
        // Tercihi localStorage'a kaydet
        localStorage.setItem('calendarTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
        // Toggle ikonunu değiştir
        document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        this.applyPlanTheme();
    }

    // Tema tercihini yükle ve uygula
    loadTheme() {
        let theme = localStorage.getItem('calendarTheme');
        if (!theme) {
            // Sistem temasını algıla
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
        }
        if (theme === 'dark') {
            document.body.classList.add('dark');
            document.getElementById('themeToggle').textContent = '☀️';
        } else {
            document.body.classList.remove('dark');
            document.getElementById('themeToggle').textContent = '🌙';
        }
        this.applyPlanTheme();
    }

    // Anasayfaya dön
    goHome() {
        this.currentDate = new Date(2025, 5, 27);
        this.renderCalendar();
    }

    // 12 Ay Genel Görünüm Modalı
    openYearModal() {
        this.renderYearGrid();
        document.getElementById('yearModal').style.display = 'block';
    }
    closeYearModal() {
        document.getElementById('yearModal').style.display = 'none';
    }
    renderYearGrid() {
        const year = this.currentDate.getFullYear();
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        const yearGrid = document.getElementById('yearGrid');
        yearGrid.innerHTML = '';
        for (let m = 0; m < 12; m++) {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'year-month' + (m === this.currentDate.getMonth() ? ' selected' : '');
            const title = document.createElement('div');
            title.className = 'year-month-title';
            title.textContent = monthNames[m];
            monthDiv.appendChild(title);
            const daysDiv = document.createElement('div');
            daysDiv.className = 'year-month-days';
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayDiv = document.createElement('div');
                dayDiv.className = 'year-month-day';
                if (this.events[dayKey]) dayDiv.classList.add('has-event');
                const today = new Date();
                if (year === today.getFullYear() && m === today.getMonth() && d === today.getDate()) {
                    dayDiv.classList.add('today');
                }
                dayDiv.textContent = d;
                daysDiv.appendChild(dayDiv);
            }
            monthDiv.appendChild(daysDiv);
            monthDiv.addEventListener('click', () => {
                this.currentDate = new Date(year, m, 1);
                this.renderCalendar();
                this.closeYearModal();
            });
            yearGrid.appendChild(monthDiv);
        }
    }

    // Plan yönetimi olayları
    openNewPlanModal() {
        // Form alanlarını temizle
        document.getElementById('planName').value = '';
        document.getElementById('planDescription').value = '';
        
        // Renk seçeneklerini sıfırla ve varsayılanı seç
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector('.color-option[data-color="blue"]').classList.add('selected');
        
        document.getElementById('newPlanModal').style.display = 'block';
    }
    
    closeNewPlanModal() {
        document.getElementById('newPlanModal').style.display = 'none';
        this.editingPlanId = null; // Düzenleme modunu sıfırla
        // Modal başlığını ve buton metnini varsayılana döndür
        document.querySelector('#newPlanModal h3').textContent = 'Yeni Plan Oluştur';
        document.getElementById('createPlan').textContent = 'Plan Oluştur';
    }
    
    savePlan() {
        const planName = document.getElementById('planName').value.trim();
        const planDescription = document.getElementById('planDescription').value.trim();
        const selectedColor = document.querySelector('.color-option.selected')?.dataset.color || 'blue';
        
        if (!planName) {
            this.showNotification('Plan adı gereklidir!', 'error');
            return;
        }

        if (this.editingPlanId) {
            // Mevcut planı güncelle
            const plan = this.plans[this.editingPlanId];
            plan.name = planName;
            plan.description = planDescription;
            plan.color = selectedColor;
            this.showNotification(`"${planName}" planı güncellendi!`);
        } else {
            // Yeni plan oluştur
            const newPlan = {
                id: this.generatePlanId(),
                name: planName,
                description: planDescription,
                color: selectedColor,
                createdAt: new Date().toISOString(),
                events: {}
            };
            this.plans[newPlan.id] = newPlan;
            this.showNotification(`"${planName}" planı oluşturuldu!`);
        }
        
        this.savePlans();
        this.updatePlanSelector();
        this.applyPlanTheme(); // Eğer mevcut plan düzenlendiyse temayı uygula
        this.renderPlansList(); // Yönetim modalındaki listeyi yenile
        this.closeNewPlanModal(); // Modalı kapat ve düzenleme modunu sıfırla
    }
    
    switchPlan(planId) {
        if (planId === this.currentPlanId) return;
        
        // Mevcut planı kaydet
        this.saveCurrentPlan();
        
        // Yeni planı yükle
        this.currentPlanId = planId;
        this.events = this.plans[planId]?.events || {};
        
        // Takvimi yeniden render et
        this.renderCalendar();
        
        // Plan seçiciyi güncelle
        document.getElementById('planSelector').value = planId;
        
        this.showNotification(`"${this.plans[planId]?.name || 'Ana Plan'}" planına geçildi`);
        this.applyPlanTheme();
    }
    
    openPlanManagementModal() {
        this.selectedPlanIdForManage = null; // Seçili planı sıfırla
        this.renderPlansList();
        document.getElementById('planManagementModal').style.display = 'block';
        // Butonları başta pasif yap
        document.getElementById('exportPlanBtn').disabled = true;
        document.getElementById('importPlanInput').disabled = true;
    }
    
    closePlanManagementModal() {
        document.getElementById('planManagementModal').style.display = 'none';
    }
    
    renderPlansList() {
        const plansList = document.getElementById('plansList');
        let html = '';
        Object.values(this.plans).forEach(plan => {
            const eventCount = Object.keys(plan.events || {}).length;
            const isActive = plan.id === this.currentPlanId;
            const isSelected = plan.id === this.selectedPlanIdForManage;
            html += `
                <div class="plan-item ${isActive ? 'active' : ''} ${isSelected ? 'selected-for-manage' : ''}" data-plan-id="${plan.id}" onclick="calendar.selectPlanForManage('${plan.id}')">
                    <div class="plan-info">
                        <div class="plan-name">${plan.name}</div>
                        <div class="plan-description">${plan.description || 'Açıklama yok'}</div>
                        <div class="plan-meta">
                            ${eventCount} etkinlik • ${new Date(plan.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                    <div class="plan-actions">
                        <button class="plan-action-btn edit" onclick="event.stopPropagation();calendar.editPlan('${plan.id}')" title="Düzenle">✏️</button>
                        <button class="plan-action-btn duplicate" onclick="event.stopPropagation();calendar.duplicatePlan('${plan.id}')" title="Kopyala">📋</button>
                        ${plan.id !== 'default' ? `<button class="plan-action-btn delete" onclick="event.stopPropagation();calendar.deletePlan('${plan.id}')" title="Sil">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        });
        plansList.innerHTML = html;
    }
    
    selectPlanForManage(planId) {
        this.selectedPlanIdForManage = planId;
        this.renderPlansList();
        // Butonları aktif yap
        document.getElementById('exportPlanBtn').disabled = false;
        document.getElementById('importPlanInput').disabled = false;
    }
    
    exportCurrentPlan() {
        const planId = this.selectedPlanIdForManage;
        if (!planId || !this.plans[planId]) {
            this.showNotification('Lütfen önce bir plan seçin!', 'error');
            return;
        }
        const plan = this.plans[planId];
        const dataStr = JSON.stringify(plan, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.name.replace(/\s+/g, '_').toLowerCase()}_takvim.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Plan başarıyla dışa aktarıldı!');
    }
    
    importPlanFromFile(e) {
        const planId = this.selectedPlanIdForManage;
        if (!planId || !this.plans[planId]) {
            this.showNotification('Lütfen önce bir plan seçin!', 'error');
            return;
        }
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const importedPlan = JSON.parse(evt.target.result);
                // Sadece etkinlikler güncellensin
                this.plans[planId].events = importedPlan.events || {};
                this.savePlans();
                this.updatePlanSelector();
                this.renderPlansList();
                this.showNotification('Plan etkinlikleri başarıyla içe aktarıldı!');
            } catch (err) {
                this.showNotification('Plan dosyası okunamadı!', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    checkTodayEventsForNotification() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const todayKey = this.formatDate(new Date());
        const eventObj = this.events[todayKey];
        if (eventObj && eventObj.text) {
            const title = 'Bugünkü Etkinlik';
            const body = `${eventObj.text} (${this.getCategoryLabel(eventObj.category)})`;
            this.sendEventNotification(title, body);
        }
    }

    sendEventNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    getCategoryLabel(cat) {
        const map = {
            is: 'İş', kisisel: 'Kişisel', tatil: 'Tatil', dogumgunu: 'Doğum Günü', toplanti: 'Toplantı', diger: 'Diğer'
        };
        return map[cat] || 'Etkinlik';
    }

    handleEventFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            document.getElementById('eventFileInfo').innerHTML =
                `<span>${file.name}</span> <span>(${Math.round(file.size/1024)} KB)</span>`;
            document.getElementById('eventFileInfo').dataset.file = evt.target.result;
            document.getElementById('eventFileInfo').dataset.filename = file.name;
        };
        reader.readAsDataURL(file);
    }

    getRepeatingEventForDate(date) {
        // Tüm etkinliklerde tekrarlayanları kontrol et
        for (const [key, eventObj] of Object.entries(this.events)) {
            if (!eventObj.repeat || eventObj.repeat === 'none') continue;
            
            const [y, m, d] = key.split('-').map(Number);
            const startDate = new Date(y, m - 1, d);
            startDate.setHours(0, 0, 0, 0);

            // Tekrar, ana etkinlik tarihinden önce başlayamaz
            if (date < startDate) continue;

            // Bitiş tarihi kontrolü
            if (eventObj.repeatEndDate) {
                const endDate = new Date(eventObj.repeatEndDate);
                endDate.setHours(23, 59, 59, 999); // Gün sonunu dahil et
                if (date > endDate) continue;
            }

            if (eventObj.repeat === 'daily') {
                // Sadece başlangıç gününden sonraki günler için
                if (date.getTime() > startDate.getTime()) return eventObj;
            } else if (eventObj.repeat === 'weekly') {
                // Aynı haftanın aynı günü mü? (ve aynı gün değil)
                if (date.getDay() === startDate.getDay() && date.getTime() !== startDate.getTime()) return eventObj;
            } else if (eventObj.repeat === 'monthly') {
                // Her ay aynı gün mü? (ve aynı gün değil)
                if (date.getDate() === d && date.getTime() !== startDate.getTime()) return eventObj;
            } else if (eventObj.repeat === 'yearly') {
                // Her yıl aynı ay ve gün mü? (ve aynı gün değil)
                if (date.getDate() === d && date.getMonth() === (m - 1) && date.getTime() !== startDate.getTime()) return eventObj;
            }
        }
        return null;
    }

    switchView(view) {
        this.currentView = view;
        document.getElementById('monthViewBtn').classList.toggle('active', view === 'month');
        document.getElementById('weekViewBtn').classList.toggle('active', view === 'week');
        document.getElementById('dayViewBtn').classList.toggle('active', view === 'day');
        // Her görünüm değişiminde bugüne odaklan
        const now = new Date();
        this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        this.renderCalendar();
    }

    getRepeatLabel(val) {
        const map = { none: 'Tek Seferlik', daily: 'Her Gün', weekly: 'Her Hafta', monthly: 'Her Ay', yearly: 'Her Yıl' };
        return map[val] || 'Tek Seferlik';
    }

    startDayChangeWatcher() {
        this._lastDay = (new Date()).getDate();
        setInterval(() => {
            const now = new Date();
            if (now.getDate() !== this._lastDay) {
                this._lastDay = now.getDate();
                this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                this.renderCalendar();
            }
        }, 60 * 1000); // Her dakika kontrol et
    }

    loadPlans() {
        // localStorage'dan planları yükle
        const saved = localStorage.getItem('calendarPlans');
        if (saved) {
            return JSON.parse(saved);
        }
        // Varsayılan plan
        return {
            default: {
                id: 'default',
                name: 'Ana Plan',
                description: '',
                color: 'blue',
                createdAt: new Date().toISOString(),
                events: {}
            }
        };
    }

    savePlans() {
        localStorage.setItem('calendarPlans', JSON.stringify(this.plans));
    }

    updatePlanSelector() {
        // Plan seçiciyi güncelle
        const selector = document.getElementById('planSelector');
        if (!selector) return;
        selector.innerHTML = '';
        Object.values(this.plans).forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = `📅 ${plan.name}`;
            selector.appendChild(option);
        });
        selector.value = this.currentPlanId;
    }

    saveCurrentPlan() {
        if (this.currentPlanId && this.plans[this.currentPlanId]) {
            this.plans[this.currentPlanId].events = this.events;
            this.savePlans();
        }
    }

    bindColorOptions() {
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.onclick = () => {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            };
        });
    }

    applyPlanTheme() {
        const plan = this.plans[this.currentPlanId];
        if (!plan) return;
        const colorMap = {
            blue: '#4facfe',
            green: '#4CAF50',
            purple: '#9C27B0',
            orange: '#FF9800',
            red: '#F44336',
            pink: '#E91E63'
        };
        document.querySelector('header').style.background = `linear-gradient(135deg, ${colorMap[plan.color] || '#4facfe'} 0%, #00f2fe 100%)`;
    }

    generatePlanId() {
        return 'plan_' + Math.random().toString(36).substr(2, 9);
    }

    shiftPlan() {
        const daysToShift = prompt("Planı kaç gün kaydırmak istiyorsunuz? (Geri kaydırmak için negatif bir sayı girin, örn: -3)");

        if (daysToShift === null || daysToShift.trim() === "") {
            return; // Kullanıcı iptal etti veya boş girdi
        }

        const shiftDays = parseInt(daysToShift, 10);

        if (isNaN(shiftDays)) {
            this.showNotification("Lütfen geçerli bir sayı girin.", "error");
            return;
        }

        if (shiftDays === 0) {
            this.showNotification("Kaydırma miktarı 0 olamaz.", "error");
            return;
        }
        
        const confirmShift = confirm(`Mevcut plandaki tüm etkinlikler ${shiftDays} gün kaydırılacak. Onaylıyor musunuz?`);
        if (!confirmShift) {
            return;
        }

        const currentEvents = this.events;
        const newEvents = {};

        // Etkinlikleri tarihe göre sırala (önce/sonra kaydırmaya göre)
        const sortedKeys = Object.keys(currentEvents).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);
            return shiftDays > 0 ? dateB - dateA : dateA - dateB;
        });

        for (const dateKey of sortedKeys) {
            const eventData = currentEvents[dateKey];
            const parts = dateKey.split('-').map(Number);
            const originalDate = new Date(parts[0], parts[1] - 1, parts[2]);

            const newDate = new Date(originalDate);
            newDate.setDate(originalDate.getDate() + shiftDays);

            const newDateKey = this.formatDate(newDate);
            newEvents[newDateKey] = eventData;
        }

        this.events = newEvents;
        this.saveEvents();
        this.renderCalendar();
        this.showNotification(`Plan başarıyla ${shiftDays} gün kaydırıldı.`, "success");
    }

    editPlan(planId) {
        this.editingPlanId = planId;
        const plan = this.plans[planId];
        if (!plan) return;

        // Modal'ı plan verileriyle doldur
        document.getElementById('planName').value = plan.name;
        document.getElementById('planDescription').value = plan.description;

        // Rengi ayarla
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.color === plan.color);
        });
        
        // Modal başlığını ve buton metnini düzenleme moduna göre değiştir
        document.querySelector('#newPlanModal h3').textContent = 'Planı Düzenle';
        document.getElementById('createPlan').textContent = 'Değişiklikleri Kaydet';

        document.getElementById('newPlanModal').style.display = 'block';
    }

    deletePlan(planId) {
        if (planId === 'default') {
            this.showNotification('Ana plan silinemez!', 'error');
            return;
        }
        if (!confirm(`'${this.plans[planId].name}' planını ve içindeki tüm etkinlikleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            return;
        }
        
        const wasCurrentPlan = this.currentPlanId === planId;
        
        delete this.plans[planId];
        
        if (wasCurrentPlan) {
            this.switchPlan('default');
        }
        
        this.savePlans();
        this.renderPlansList();
        this.updatePlanSelector();
        
        this.showNotification('Plan başarıyla silindi.');
    }

    duplicatePlan(planId) {
        const planToDuplicate = this.plans[planId];
        if (!planToDuplicate) {
            this.showNotification('Kopyalanacak plan bulunamadı!', 'error');
            return;
        }
        
        const newPlan = JSON.parse(JSON.stringify(planToDuplicate)); // Derin kopyalama
        newPlan.id = this.generatePlanId();
        newPlan.name = `${planToDuplicate.name} (Kopya)`;
        newPlan.createdAt = new Date().toISOString();
        
        this.plans[newPlan.id] = newPlan;
        this.savePlans();
        this.renderPlansList();
        this.updatePlanSelector();
        
        this.showNotification(`'${planToDuplicate.name}' planı kopyalandı.`);
    }

    openExportModal() {
        document.getElementById('exportModal').style.display = 'block';
    }

    closeExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'none';
    }

    clearAllData() {
        if (!confirm("TÜM VERİLERİNİZ (tüm planlar ve etkinlikler) kalıcı olarak silinecektir. Bu işlem geri alınamaz. Emin misiniz?")) {
            return;
        }
        localStorage.removeItem('calendarPlans');
        localStorage.removeItem('calendarEvents'); // Eski veriyi de temizle
        
        // Durumu sıfırla
        this.plans = this.loadPlans(); // Varsayılan planı yükler
        this.currentPlanId = 'default';
        this.events = this.plans[this.currentPlanId].events;
        
        this.renderCalendar();
        this.updatePlanSelector();
        this.applyPlanTheme();
        this.showNotification("Tüm veriler başarıyla silindi.", "success");
    }

    exportAllData() {
        const dataStr = JSON.stringify(this.plans, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `takvim_yedek_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification('Tüm veriler başarıyla dışa aktarıldı!');
    }

    importAllData() {
        if (!confirm("Mevcut tüm verileriniz (bütün planlar ve etkinlikler) içe aktarılan dosyadaki verilerle değiştirilecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?")) {
            return;
        }
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.style.display = 'none';

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const importedPlans = JSON.parse(evt.target.result);
                    if (typeof importedPlans === 'object' && importedPlans !== null && Object.keys(importedPlans).length > 0) {
                        this.plans = importedPlans;
                        this.savePlans();
                        
                        this.currentPlanId = 'default';
                        if (!this.plans[this.currentPlanId]) {
                           this.currentPlanId = Object.keys(this.plans)[0];
                        }
                        this.events = this.plans[this.currentPlanId].events;

                        this.updatePlanSelector();
                        this.renderCalendar();
                        this.applyPlanTheme();
                        this.showNotification('Tüm veriler başarıyla içe aktarıldı!', 'success');
                    } else {
                        throw new Error("Geçersiz dosya formatı");
                    }
                } catch (err) {
                    console.error("Veri içe aktarma hatası:", err);
                    this.showNotification('Geçersiz veya bozuk yedek dosyası!', 'error');
                }
            };
            reader.readAsText(file);
        };

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }
}

// Global calendar instance
// let calendar;

document.addEventListener('DOMContentLoaded', () => {
    window.calendar = new Calendar();
    calendar.loadTheme();
}); 