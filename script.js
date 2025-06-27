class Calendar {
    constructor() {
        this.currentDate = new Date(2025, 5, 27); // 27 Haziran 2025
        this.events = this.loadEvents();
        this.selectedDate = null;
        this.draggedEvent = null;
        this.draggedDate = null;
        this.shareId = this.generateShareId();
        this.plans = this.loadPlans();
        this.currentPlanId = 'default';
        this.currentView = 'month'; // 'month', 'week', 'day'
        
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
        
        // İndirme olayları
        document.getElementById('exportBtn').addEventListener('click', () => this.toggleExportOptions());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportText').addEventListener('click', () => this.exportToText());
        
        // Paylaşım olayları
        document.getElementById('shareBtn').addEventListener('click', () => this.openShareModal());
        document.getElementById('closeShareModal').addEventListener('click', () => this.closeShareModal());
        document.getElementById('copyLink').addEventListener('click', () => this.copyShareLink());
        document.getElementById('generateViewLink').addEventListener('click', () => this.generateShareLinkWithMode('view'));
        document.getElementById('generateEditLink').addEventListener('click', () => this.generateShareLinkWithMode('edit'));
        
        // Modal dışına tıklayınca kapat
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
                this.closeShareModal();
                this.closeNewPlanModal();
                this.closePlanManagementModal();
            }
            // İndirme menüsünü kapat
            if (!e.target.closest('.export-controls')) {
                document.getElementById('exportOptions').classList.remove('show');
            }
        });
        
        // ESC tuşu ile modal kapatma
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeShareModal();
                this.closeNewPlanModal();
                this.closePlanManagementModal();
                document.getElementById('exportOptions').classList.remove('show');
            }
        });

        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('homeBtn').addEventListener('click', () => this.goHome());
        document.getElementById('yearViewBtn').addEventListener('click', () => this.openYearModal());
        document.getElementById('closeYearModal').addEventListener('click', () => this.closeYearModal());
        
        // Plan yönetimi olayları
        document.getElementById('newPlanBtn').addEventListener('click', () => this.openNewPlanModal());
        document.getElementById('closeNewPlanModal').addEventListener('click', () => this.closeNewPlanModal());
        document.getElementById('createPlan').addEventListener('click', () => this.createNewPlan());
        document.getElementById('cancelPlan').addEventListener('click', () => this.closeNewPlanModal());
        document.getElementById('planSelector').addEventListener('change', (e) => this.switchPlan(e.target.value));
        
        // Plan yönetimi modal olayları
        document.getElementById('managePlansBtn').addEventListener('click', () => this.openPlanManagementModal());
        document.getElementById('closePlanManagementModal').addEventListener('click', () => this.closePlanManagementModal());

        document.getElementById('exportPlanBtn').addEventListener('click', () => this.exportCurrentPlan());
        document.getElementById('importPlanInput').addEventListener('change', (e) => this.importPlanFromFile(e));
        document.getElementById('eventFile').addEventListener('change', (e) => this.handleEventFile(e));

        document.getElementById('monthViewBtn').addEventListener('click', () => this.switchView('month'));
        document.getElementById('weekViewBtn').addEventListener('click', () => this.switchView('week'));
        document.getElementById('dayViewBtn').addEventListener('click', () => this.switchView('day'));
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
        // Varsayılan olarak düzenleme linki gösterilsin
        this.generateShareLinkWithMode('edit');
        document.getElementById('shareModal').style.display = 'block';
    }
    
    // Paylaşım modal'ını kapat
    closeShareModal() {
        document.getElementById('shareModal').style.display = 'none';
    }
    
    // Paylaşım linki oluştur (yetki ile)
    generateShareLinkWithMode(mode) {
        const eventsData = JSON.stringify(this.events);
        const encodedData = encodeURIComponent(eventsData);
        const baseUrl = window.location.origin + window.location.pathname;
        let link = `${baseUrl}?share=${encodedData}`;
        if (mode === 'view') link += '&mode=view';
        else link += '&mode=edit';
        document.getElementById('shareLink').value = link;
        this.showNotification(mode === 'view' ? 'Sadece görüntüleme linki oluşturuldu!' : 'Düzenleme linki oluşturuldu!');
    }
    
    // Linki kopyala
    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        shareLink.setSelectionRange(0, 99999); // Mobil için
        
        try {
            document.execCommand('copy');
            this.showNotification('Link panoya kopyalandı!');
        } catch (err) {
            // Modern tarayıcılar için
            navigator.clipboard.writeText(shareLink.value).then(() => {
                this.showNotification('Link panoya kopyalandı!');
            }).catch(() => {
                this.showNotification('Link kopyalanamadı!', 'error');
            });
        }
    }
    
    // İndirme menüsünü aç/kapat
    toggleExportOptions() {
        const options = document.getElementById('exportOptions');
        options.classList.toggle('show');
    }
    
    // PDF İndirme
    exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Başlık
            doc.setFontSize(20);
            doc.text('Takvim Etkinlikleri', 20, 20);
            
            // Tarih
            doc.setFontSize(12);
            doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
            
            // Etkinlikleri tablo halinde ekle
            const events = this.getEventsForExport();
            if (events.length === 0) {
                doc.text('Henüz etkinlik eklenmemiş.', 20, 50);
            } else {
                const tableData = events.map(event => [
                    event.date,
                    event.text
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
            
            // PDF'i indir
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
            
            // Excel çalışma kitabı oluştur
            const wb = XLSX.utils.book_new();
            
            // Veri hazırla
            const data = [
                ['Tarih', 'Etkinlik', 'Oluşturulma Tarihi'],
                ...events.map(event => [
                    event.date,
                    event.text,
                    new Date().toLocaleDateString('tr-TR')
                ])
            ];
            
            // Çalışma sayfası oluştur
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Sütun genişliklerini ayarla
            ws['!cols'] = [
                { width: 15 }, // Tarih
                { width: 50 }, // Etkinlik
                { width: 20 }  // Oluşturulma tarihi
            ];
            
            // Çalışma sayfasını kitaba ekle
            XLSX.utils.book_append_sheet(wb, ws, 'Takvim Etkinlikleri');
            
            // Excel dosyasını indir
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
                    content += `${index + 1}. ${event.date}\n`;
                    content += `   ${event.text}\n\n`;
                });
            }
            
            // Metin dosyasını indir
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
    getEventsForExport() {
        const events = [];
        
        Object.keys(this.events).forEach(dateKey => {
            const date = new Date(dateKey);
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
            const eventText = this.events[dateKey].toLowerCase();
            if (eventText.includes(searchTerm)) {
                const date = new Date(dateKey);
                results.push({
                    date: date,
                    dateKey: dateKey,
                    text: this.events[dateKey],
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
            const eventDetail = document.createElement('div');
            eventDetail.className = 'event-detail';
            eventDetail.innerHTML = `<strong>Etkinlik:</strong> ${eventObj.text}<br><strong>Kategori:</strong> ${this.getCategoryLabel(eventObj.category)}<br><strong>Tekrar:</strong> ${this.getRepeatLabel(eventObj.repeat)}`;
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
        const eventObj = this.events[dateKey] || { text: '', category: 'is', repeat: 'none', file: null, filename: null };
        document.getElementById('modalDate').textContent = `${date.getDate()} ${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
        document.getElementById('eventText').value = eventObj.text;
        document.getElementById('eventCategory').value = eventObj.category || 'is';
        document.getElementById('eventRepeat').value = eventObj.repeat || 'none';
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
    }
    
    saveEvent() {
        if (!this.selectedDate) return;
        const eventText = document.getElementById('eventText').value.trim();
        const eventCategory = document.getElementById('eventCategory').value;
        const eventRepeat = document.getElementById('eventRepeat').value;
        const dateKey = this.formatDate(this.selectedDate);
        let fileData = document.getElementById('eventFileInfo').dataset.file || null;
        let fileName = document.getElementById('eventFileInfo').dataset.filename || null;
        if (eventText) {
            this.events[dateKey] = { text: eventText, category: eventCategory, repeat: eventRepeat, file: fileData, filename: fileName };
        } else {
            delete this.events[dateKey];
        }
        this.saveEvents();
        this.renderCalendar();
        this.closeModal();
    }
    
    deleteEvent() {
        if (!this.selectedDate) return;
        
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

    // Tema değiştir
    toggleTheme() {
        document.body.classList.toggle('dark');
        // Tercihi localStorage'a kaydet
        localStorage.setItem('calendarTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
        // Toggle ikonunu değiştir
        document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
        this.applyPlanTheme();
    }

    // Tema tercihini yükle
    loadTheme() {
        const theme = localStorage.getItem('calendarTheme');
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
        // Renk seçeneklerini sıfırla
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        // Varsayılan olarak mavi rengi seç
        document.querySelector('.color-option[data-color="blue"]').classList.add('selected');
        
        // Form alanlarını temizle
        document.getElementById('planName').value = '';
        document.getElementById('planDescription').value = '';
        
        document.getElementById('newPlanModal').style.display = 'block';
    }
    
    closeNewPlanModal() {
        document.getElementById('newPlanModal').style.display = 'none';
    }
    
    createNewPlan() {
        const planName = document.getElementById('planName').value.trim();
        const planDescription = document.getElementById('planDescription').value.trim();
        const selectedColor = document.querySelector('.color-option.selected')?.dataset.color || 'blue';
        
        if (!planName) {
            this.showNotification('Plan adı gereklidir!', 'error');
            return;
        }
        
        // Yeni plan oluştur
        const newPlan = {
            id: this.generatePlanId(),
            name: planName,
            description: planDescription,
            color: selectedColor,
            createdAt: new Date().toISOString(),
            events: {}
        };
        
        // Planı kaydet
        this.plans[newPlan.id] = newPlan;
        this.savePlans();
        
        // Plan seçiciyi güncelle
        this.updatePlanSelector();
        
        // Yeni planı seç
        this.switchPlan(newPlan.id);
        
        this.closeNewPlanModal();
        this.showNotification(`"${planName}" planı oluşturuldu!`);
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
        this.renderPlansList();
        document.getElementById('planManagementModal').style.display = 'block';
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
            
            html += `
                <div class="plan-item ${isActive ? 'active' : ''}" data-plan-id="${plan.id}">
                    <div class="plan-info">
                        <div class="plan-name">${plan.name}</div>
                        <div class="plan-description">${plan.description || 'Açıklama yok'}</div>
                        <div class="plan-meta">
                            ${eventCount} etkinlik • ${new Date(plan.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                    </div>
                    <div class="plan-actions">
                        <button class="plan-action-btn edit" onclick="calendar.editPlan('${plan.id}')" title="Düzenle">✏️</button>
                        <button class="plan-action-btn duplicate" onclick="calendar.duplicatePlan('${plan.id}')" title="Kopyala">📋</button>
                        ${plan.id !== 'default' ? `<button class="plan-action-btn delete" onclick="calendar.deletePlan('${plan.id}')" title="Sil">🗑️</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        plansList.innerHTML = html;
    }
    
    editPlan(planId) {
        const plan = this.plans[planId];
        if (!plan) return;
        
        // Form alanlarını doldur
        document.getElementById('planName').value = plan.name;
        document.getElementById('planDescription').value = plan.description || '';
        
        // Renk seçeneğini işaretle
        document.querySelectorAll('.color-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`.color-option[data-color="${plan.color}"]`).classList.add('selected');
        
        // Modal'ı düzenleme modunda aç
        document.getElementById('newPlanModal').style.display = 'block';
        document.getElementById('createPlan').textContent = '✅ Güncelle';
        document.getElementById('createPlan').onclick = () => this.updatePlan(planId);
    }
    
    updatePlan(planId) {
        const planName = document.getElementById('planName').value.trim();
        const planDescription = document.getElementById('planDescription').value.trim();
        const selectedColor = document.querySelector('.color-option.selected')?.dataset.color || 'blue';
        
        if (!planName) {
            this.showNotification('Plan adı gereklidir!', 'error');
            return;
        }
        
        // Planı güncelle
        this.plans[planId].name = planName;
        this.plans[planId].description = planDescription;
        this.plans[planId].color = selectedColor;
        
        this.savePlans();
        this.updatePlanSelector();
        this.closeNewPlanModal();
        
        // Butonu eski haline getir
        document.getElementById('createPlan').textContent = '✅ Plan Oluştur';
        document.getElementById('createPlan').onclick = () => this.createNewPlan();
        
        this.showNotification(`"${planName}" planı güncellendi!`);
        this.applyPlanTheme();
    }
    
    duplicatePlan(planId) {
        const originalPlan = this.plans[planId];
        if (!originalPlan) return;
        
        const newPlan = {
            ...originalPlan,
            id: this.generatePlanId(),
            name: `${originalPlan.name} (Kopya)`,
            createdAt: new Date().toISOString()
        };
        
        this.plans[newPlan.id] = newPlan;
        this.savePlans();
        this.updatePlanSelector();
        
        this.showNotification(`"${originalPlan.name}" planı kopyalandı!`);
    }
    
    deletePlan(planId) {
        const plan = this.plans[planId];
        if (!plan || planId === 'default') return;
        
        if (confirm(`"${plan.name}" planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            delete this.plans[planId];
            this.savePlans();
            
            // Eğer silinen plan aktifse, ana plana geç
            if (this.currentPlanId === planId) {
                this.switchPlan('default');
            }
            
            this.updatePlanSelector();
            this.showNotification(`"${plan.name}" planı silindi!`);
        }
    }
    
    generatePlanId() {
        return 'plan_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    
    updatePlanSelector() {
        const selector = document.getElementById('planSelector');
        selector.innerHTML = '';
        
        Object.values(this.plans).forEach(plan => {
            const option = document.createElement('option');
            option.value = plan.id;
            option.textContent = `${this.getPlanColorIcon(plan.color)} ${plan.name}`;
            if (plan.id === this.currentPlanId) {
                option.selected = true;
            }
            selector.appendChild(option);
        });
    }
    
    getPlanColorIcon(color) {
        const colorIcons = {
            blue: '🔵',
            green: '🟢', 
            purple: '🟣',
            orange: '🟠',
            red: '🔴',
            pink: '🩷'
        };
        return colorIcons[color] || '🔵';
    }
    
    saveCurrentPlan() {
        if (this.currentPlanId && this.plans[this.currentPlanId]) {
            this.plans[this.currentPlanId].events = { ...this.events };
            this.savePlans();
        }
    }
    
    savePlans() {
        localStorage.setItem('calendarPlans', JSON.stringify(this.plans));
    }
    
    loadPlans() {
        const saved = localStorage.getItem('calendarPlans');
        if (saved) {
            const plans = JSON.parse(saved);
            // Varsayılan plan yoksa oluştur
            if (!plans.default) {
                plans.default = {
                    id: 'default',
                    name: 'Ana Plan',
                    description: 'Varsayılan takvim planı',
                    color: 'blue',
                    createdAt: new Date().toISOString(),
                    events: {}
                };
            }
            return plans;
        } else {
            // İlk kez açılıyorsa varsayılan planı oluştur
            return {
                default: {
                    id: 'default',
                    name: 'Ana Plan',
                    description: 'Varsayılan takvim planı',
                    color: 'blue',
                    createdAt: new Date().toISOString(),
                    events: {}
                }
            };
        }
    }

    bindColorOptions() {
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                // Önceki seçimi kaldır
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Yeni seçimi işaretle
                option.classList.add('selected');
            });
        });
    }

    getPlanMainColor(plan) {
        // Plan renk ana kodları
        const colorMap = {
            blue:   { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', solid: '#4facfe' },
            green:  { bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', solid: '#43e97b' },
            purple: { bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', solid: '#a18cd1' },
            orange: { bg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', solid: '#f7971e' },
            red:    { bg: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', solid: '#f857a6' },
            pink:   { bg: 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)', solid: '#f953c6' },
        };
        return colorMap[plan?.color] || colorMap.blue;
    }

    applyPlanTheme() {
        const plan = this.plans[this.currentPlanId];
        const color = this.getPlanMainColor(plan);
        
        // Header arka planı
        const header = document.querySelector('header');
        header.style.background = color.bg;
        
        // Takvim arka planı - daha hafif bir renk
        const calendar = document.querySelector('.calendar');
        calendar.style.background = `linear-gradient(135deg, ${color.solid}15 0%, ${color.solid}25 100%)`;
        calendar.style.border = `2px solid ${color.solid}30`;
        
        // Plan seçici arka planı
        const planSelector = document.getElementById('planSelector');
        if (planSelector) {
            planSelector.style.background = `${color.solid}20`;
            planSelector.style.border = `1px solid ${color.solid}40`;
        }
        
        // Butonların renklerini güncelle
        const newPlanBtn = document.getElementById('newPlanBtn');
        if (newPlanBtn) {
            newPlanBtn.style.background = color.bg;
        }
        
        const managePlansBtn = document.getElementById('managePlansBtn');
        if (managePlansBtn) {
            managePlansBtn.style.background = color.bg;
        }
    }

    exportCurrentPlan() {
        const plan = this.plans[this.currentPlanId];
        if (!plan) {
            this.showNotification('Plan bulunamadı!', 'error');
            return;
        }
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
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const importedPlan = JSON.parse(evt.target.result);
                if (!importedPlan.id || !importedPlan.name) {
                    this.showNotification('Geçersiz plan dosyası!', 'error');
                    return;
                }
                // ID çakışmasın diye yeni bir ID ver
                importedPlan.id = this.generatePlanId();
                importedPlan.name = importedPlan.name + ' (İçe Aktarılan)';
                importedPlan.createdAt = new Date().toISOString();
                this.plans[importedPlan.id] = importedPlan;
                this.savePlans();
                this.updatePlanSelector();
                this.renderPlansList();
                this.showNotification('Plan başarıyla içe aktarıldı!');
            } catch (err) {
                this.showNotification('Plan dosyası okunamadı!', 'error');
            }
        };
        reader.readAsText(file);
        // input'u sıfırla
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
            if (eventObj.repeat === 'weekly') {
                // Aynı haftanın aynı günü mü?
                if (date.getDay() === new Date(y, m - 1, d).getDay()) return eventObj;
            } else if (eventObj.repeat === 'monthly') {
                // Her ay aynı gün mü?
                if (date.getDate() === d) return eventObj;
            } else if (eventObj.repeat === 'yearly') {
                // Her yıl aynı ay ve gün mü?
                if (date.getDate() === d && date.getMonth() + 1 === m) return eventObj;
            }
        }
        return null;
    }

    switchView(view) {
        this.currentView = view;
        document.getElementById('monthViewBtn').classList.toggle('active', view === 'month');
        document.getElementById('weekViewBtn').classList.toggle('active', view === 'week');
        document.getElementById('dayViewBtn').classList.toggle('active', view === 'day');
        this.renderCalendar();
    }

    getRepeatLabel(val) {
        const map = { none: 'Tek Seferlik', weekly: 'Her Hafta', monthly: 'Her Ay', yearly: 'Her Yıl' };
        return map[val] || 'Tek Seferlik';
    }
}

// Global calendar instance
let calendar;

// Takvimi başlat
document.addEventListener('DOMContentLoaded', () => {
    calendar = new Calendar();
    calendar.loadTheme();
}); 