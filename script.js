class Calendar {
    constructor() {
        this.currentDate = new Date(2025, 5, 27); // 27 Haziran 2025
        this.events = this.loadEvents();
        this.selectedDate = null;
        this.draggedEvent = null;
        this.draggedDate = null;
        this.shareId = this.generateShareId();
        
        this.init();
    }
    
    init() {
        this.loadFromURL(); // URL'den veri yükle
        this.renderCalendar();
        this.bindEvents();
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
        document.getElementById('generateNewLink').addEventListener('click', () => this.generateNewShareLink());
        
        // Modal dışına tıklayınca kapat
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
                this.closeShareModal();
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
                document.getElementById('exportOptions').classList.remove('show');
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
        const shareLink = this.generateShareLink();
        document.getElementById('shareLink').value = shareLink;
        document.getElementById('shareModal').style.display = 'block';
    }
    
    // Paylaşım modal'ını kapat
    closeShareModal() {
        document.getElementById('shareModal').style.display = 'none';
    }
    
    // Paylaşım linki oluştur
    generateShareLink() {
        const eventsData = JSON.stringify(this.events);
        const encodedData = encodeURIComponent(eventsData);
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?share=${encodedData}`;
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
    
    // Yeni paylaşım linki oluştur
    generateNewShareLink() {
        this.shareId = this.generateShareId();
        const shareLink = this.generateShareLink();
        document.getElementById('shareLink').value = shareLink;
        this.showNotification('Yeni paylaşım linki oluşturuldu!');
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
            if (this.events[dateKey]) {
                dayElement.classList.add('has-event');
                
                const eventPreview = document.createElement('div');
                eventPreview.className = 'event-preview';
                eventPreview.textContent = this.events[dateKey].substring(0, 20) + (this.events[dateKey].length > 20 ? '...' : '');
                dayElement.appendChild(eventPreview);
                
                // Sürükle-bırak için etkinlik önizlemesini sürüklenebilir yap
                eventPreview.draggable = true;
                eventPreview.addEventListener('dragstart', (e) => this.dragStart(e, currentDate, this.events[dateKey]));
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
        const eventText = this.events[dateKey] || '';
        
        document.getElementById('modalDate').textContent = `${date.getDate()} ${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
        document.getElementById('eventText').value = eventText;
        document.getElementById('eventModal').style.display = 'block';
        
        // Sil butonunu göster/gizle
        document.getElementById('deleteEvent').style.display = eventText ? 'block' : 'none';
    }
    
    closeModal() {
        document.getElementById('eventModal').style.display = 'none';
        this.selectedDate = null;
    }
    
    saveEvent() {
        if (!this.selectedDate) return;
        
        const eventText = document.getElementById('eventText').value.trim();
        const dateKey = this.formatDate(this.selectedDate);
        
        if (eventText) {
            this.events[dateKey] = eventText;
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
        localStorage.setItem('calendarEvents', JSON.stringify(this.events));
    }
    
    loadEvents() {
        const saved = localStorage.getItem('calendarEvents');
        return saved ? JSON.parse(saved) : {};
    }
}

// Global calendar instance
let calendar;

// Takvimi başlat
document.addEventListener('DOMContentLoaded', () => {
    calendar = new Calendar();
}); 