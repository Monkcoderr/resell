// Mobile Inventory Manager JavaScript
class MobileInventoryManager {
    constructor() {
        this.storageKey = 'mobileInventory';
        this.inventory = this.loadInventory();
        this.isEditing = false;
        this.editingId = null;
        this.initializeApp();
    }

    // Initialize the application
    initializeApp() {
        this.bindEventListeners();
        this.displayInventory();
        this.updateInventoryCount();
    }

    // Bind event listeners
    bindEventListeners() {
        // Form submission
        const form = document.getElementById('mobileForm');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Photo upload preview
        const photoInput = document.getElementById('photo');
        photoInput.addEventListener('change', (e) => this.handleImagePreview(e));

        // IMEI input validation (only numbers)
        const imeiInput = document.getElementById('imei');
        imeiInput.addEventListener('input', (e) => this.validateIMEIInput(e));

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.handleSearch(e));

        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => this.exportInventory());

        // Excel export functionality
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        exportExcelBtn.addEventListener('click', () => this.exportInventoryToExcel());

        // Generate test data functionality
        const generateTestDataBtn = document.getElementById('generateTestDataBtn');
        generateTestDataBtn.addEventListener('click', () => this.generateTestData());

        // Cancel edit functionality
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        cancelEditBtn.addEventListener('click', () => this.cancelEdit());

        // Navigation functionality
        const navAddMobile = document.getElementById('navAddMobile');
        const navSearchInventory = document.getElementById('navSearchInventory');
        
        navAddMobile.addEventListener('click', () => this.showPage('addMobile'));
        navSearchInventory.addEventListener('click', () => this.showPage('searchInventory'));
    }

    // Load inventory from LocalStorage
    loadInventory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading inventory:', error);
            return [];
        }
    }

    // Save inventory to LocalStorage
    saveInventory() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.inventory));
        } catch (error) {
            console.error('Error saving inventory:', error);
            this.showError('Failed to save data. Storage might be full.');
        }
    }

    // Validate IMEI input (only allow numbers)
    validateIMEIInput(event) {
        const input = event.target;
        const value = input.value.replace(/\D/g, ''); // Remove non-digits
        input.value = value;
    }

    // Handle image preview
    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('hidden');
            previewImg.src = '';
        }
    }

    // Handle form submission
    async handleFormSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const mobileData = {
            brand: formData.get('brand').trim(),
            model: formData.get('model').trim(),
            imei: formData.get('imei').trim(),
            ram: formData.get('ram'),
            storage: formData.get('storage')
        };

        // Validate IMEI
        if (!this.validateIMEI(mobileData.imei)) {
            this.showError('IMEI must be exactly 15 digits.');
            return;
        }

        // Check for duplicate IMEI (only when adding new, not when editing)
        if (!this.isEditing && this.isDuplicateIMEI(mobileData.imei)) {
            this.showError('A mobile with this IMEI already exists in inventory.');
            return;
        }

        // Handle image
        const photoFile = formData.get('photo');
        if (photoFile && photoFile.size > 0) {
            try {
                mobileData.image = await this.processImage(photoFile);
            } catch (error) {
                console.error('Error processing image:', error);
                this.showError('Failed to process image. Please try again.');
                return;
            }
        } else {
            mobileData.image = null;
        }

        // Add or update mobile
        if (this.isEditing) {
            this.updateMobile(this.editingId, mobileData);
            this.showSuccess('Mobile updated successfully!');
            // Navigate back to inventory after successful edit
            setTimeout(() => {
                this.showPage('searchInventory');
            }, 1000);
        } else {
            this.addMobile(mobileData);
            this.showSuccess('Mobile added to inventory successfully!');
            // Navigate to inventory after successful add
            setTimeout(() => {
                this.showPage('searchInventory');
            }, 1000);
        }
        
        // Reset form and hide preview
        event.target.reset();
        document.getElementById('imagePreview').classList.add('hidden');
        this.hideError();
        this.resetEditMode();
    }

    // Validate IMEI format
    validateIMEI(imei) {
        return /^\d{15}$/.test(imei);
    }

    // Check for duplicate IMEI
    isDuplicateIMEI(imei) {
        return this.inventory.some(mobile => mobile.imei === imei);
    }

    // Process image file to base64
    processImage(file) {
        return new Promise((resolve, reject) => {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                reject(new Error('Image size too large. Please choose a smaller image.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.onerror = function(e) {
                reject(new Error('Failed to read image file.'));
            };
            reader.readAsDataURL(file);
        });
    }

    // Add mobile to inventory
    addMobile(mobileData) {
        const mobile = {
            id: Date.now(), // Simple ID generation using timestamp
            ...mobileData
        };

        this.inventory.push(mobile);
        this.saveInventory();
        this.displayInventory();
        this.updateInventoryCount();
    }

    // Delete mobile from inventory
    deleteMobile(id) {
        if (confirm('Are you sure you want to delete this mobile from inventory?')) {
            this.inventory = this.inventory.filter(mobile => mobile.id !== id);
            this.saveInventory();
            this.displayInventory();
            this.updateInventoryCount();
            this.showSuccess('Mobile deleted from inventory.');
        }
    }

    // Display inventory
    displayInventory() {
        const inventoryList = document.getElementById('inventoryList');
        const emptyState = document.getElementById('emptyState');
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        // Filter inventory based on search term
        let filteredInventory = this.inventory;
        if (searchTerm) {
            filteredInventory = this.inventory.filter(mobile => 
                mobile.brand.toLowerCase().includes(searchTerm) ||
                mobile.model.toLowerCase().includes(searchTerm) ||
                mobile.imei.includes(searchTerm)
            );
        }

        if (filteredInventory.length === 0) {
            inventoryList.innerHTML = '';
            if (this.inventory.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
                inventoryList.innerHTML = '<div class="text-center py-8 text-gray-500"><p>No results found for your search.</p></div>';
            }
            return;
        }

        emptyState.classList.add('hidden');
        
        inventoryList.innerHTML = filteredInventory.map(mobile => this.createMobileCard(mobile)).join('');
        
        // Bind action buttons
        this.bindCardButtons();
    }

    // Create mobile card HTML
    createMobileCard(mobile) {
        const isSold = mobile.sold || false;
        const cardClass = isSold ? 'bg-gray-100 border-gray-300 opacity-75' : 'bg-gray-50 border-gray-200';
        
        const imageHtml = mobile.image ? 
            `<div class="relative">
                <img src="${mobile.image}" alt="${mobile.brand} ${mobile.model}" class="w-full h-32 object-cover rounded-lg mb-3">
                ${isSold ? '<div class="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center"><span class="bg-red-600 text-white px-3 py-1 rounded-full font-bold">SOLD</span></div>' : ''}
            </div>` :
            `<div class="w-full h-32 bg-gray-200 rounded-lg mb-3 flex items-center justify-center text-gray-400 relative">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                ${isSold ? '<div class="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center"><span class="bg-red-600 text-white px-3 py-1 rounded-full font-bold">SOLD</span></div>' : ''}
            </div>`;

        const actionButtons = isSold ? 
            `<div class="flex gap-1">
                <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors" data-id="${mobile.id}">
                    🗑️
                </button>
            </div>` :
            `<div class="flex gap-1">
                <button class="edit-btn bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 transition-colors" data-id="${mobile.id}">
                    ✏️
                </button>
                <button class="sold-btn bg-orange-500 text-white px-2 py-1 rounded text-sm hover:bg-orange-600 transition-colors" data-id="${mobile.id}">
                    💰
                </button>
                <button class="delete-btn bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors" data-id="${mobile.id}">
                    🗑️
                </button>
            </div>`;

        return `
            <div class="${cardClass} border rounded-lg p-4">
                ${imageHtml}
                <div class="space-y-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="font-semibold text-lg text-gray-800">${mobile.brand} ${mobile.model}</h3>
                            ${isSold ? '<span class="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold mt-1">SOLD</span>' : ''}
                        </div>
                        ${actionButtons}
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="bg-white p-2 rounded border">
                            <span class="text-gray-500">IMEI:</span><br>
                            <span class="font-mono text-xs">${mobile.imei}</span>
                        </div>
                        <div class="bg-white p-2 rounded border">
                            <span class="text-gray-500">RAM:</span><br>
                            <span class="font-semibold">${mobile.ram}</span>
                        </div>
                    </div>
                    <div class="bg-white p-2 rounded border text-sm">
                        <span class="text-gray-500">Storage:</span>
                        <span class="font-semibold ml-2">${mobile.storage}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Update inventory count
    updateInventoryCount() {
        const countElement = document.getElementById('inventoryCount');
        const count = this.inventory.length;
        countElement.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }

    // Show error message
    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    // Hide error message
    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.classList.add('hidden');
    }

    // Show success message (temporary)
    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed top-4 left-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-50';
        successDiv.textContent = message;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // ============= NEW FEATURES =============

    // Navigation functionality
    showPage(page) {
        const addMobilePage = document.getElementById('addMobilePage');
        const searchInventoryPage = document.getElementById('searchInventoryPage');
        const navAddMobile = document.getElementById('navAddMobile');
        const navSearchInventory = document.getElementById('navSearchInventory');

        if (page === 'addMobile') {
            // Show add mobile page, hide search inventory page
            addMobilePage.classList.remove('hidden');
            searchInventoryPage.classList.add('hidden');
            
            // Update navigation button styles
            navAddMobile.className = 'flex-1 py-4 px-6 bg-blue-600 text-white font-semibold text-center transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
            navSearchInventory.className = 'flex-1 py-4 px-6 bg-gray-200 text-gray-700 font-semibold text-center transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500';
        } else if (page === 'searchInventory') {
            // Show search inventory page, hide add mobile page
            addMobilePage.classList.add('hidden');
            searchInventoryPage.classList.remove('hidden');
            
            // Update navigation button styles
            navAddMobile.className = 'flex-1 py-4 px-6 bg-gray-200 text-gray-700 font-semibold text-center transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500';
            navSearchInventory.className = 'flex-1 py-4 px-6 bg-blue-600 text-white font-semibold text-center transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
        }
    }

    // Bind action buttons for each card
    bindCardButtons() {
        const inventoryList = document.getElementById('inventoryList');
        
        // Delete buttons
        inventoryList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.deleteMobile(id);
            });
        });

        // Edit buttons
        inventoryList.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.editMobile(id);
            });
        });

        // Mark as sold buttons
        inventoryList.querySelectorAll('.sold-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.markAsSold(id);
            });
        });
    }

    // Handle search functionality
    handleSearch(event) {
        this.displayInventory();
    }

    // Edit mobile functionality
    editMobile(id) {
        const mobile = this.inventory.find(m => m.id === id);
        if (!mobile) return;

        // Set editing mode
        this.isEditing = true;
        this.editingId = id;

        // Pre-fill form
        document.getElementById('brand').value = mobile.brand;
        document.getElementById('model').value = mobile.model;
        document.getElementById('imei').value = mobile.imei;
        document.getElementById('imei').disabled = true; // Disable IMEI editing
        document.getElementById('ram').value = mobile.ram;
        document.getElementById('storage').value = mobile.storage;

        // Handle image preview if exists
        if (mobile.image) {
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            previewImg.src = mobile.image;
            preview.classList.remove('hidden');
        }

        // Update UI for edit mode
        const submitBtn = document.getElementById('submitBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        submitBtn.textContent = '💾 Save Changes';
        submitBtn.className = submitBtn.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-green-600 hover:bg-green-700');
        cancelBtn.classList.remove('hidden');

        // Navigate to Add Mobile page and scroll to form
        this.showPage('addMobile');
        setTimeout(() => {
            document.getElementById('mobileForm').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    // Update mobile in inventory
    updateMobile(id, updatedData) {
        const index = this.inventory.findIndex(m => m.id === id);
        if (index !== -1) {
            // Preserve existing data and update with new data
            this.inventory[index] = { 
                ...this.inventory[index], 
                ...updatedData,
                id // Preserve original ID
            };
            this.saveInventory();
            this.displayInventory();
            this.updateInventoryCount();
        }
    }

    // Cancel edit mode
    cancelEdit() {
        this.resetEditMode();
        document.getElementById('mobileForm').reset();
        document.getElementById('imagePreview').classList.add('hidden');
        this.hideError();
        // Navigate back to inventory page
        this.showPage('searchInventory');
    }

    // Reset edit mode
    resetEditMode() {
        this.isEditing = false;
        this.editingId = null;
        
        // Reset IMEI field
        document.getElementById('imei').disabled = false;
        
        // Reset button styles
        const submitBtn = document.getElementById('submitBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        
        submitBtn.textContent = '📱 Add to Inventory';
        submitBtn.className = submitBtn.className.replace('bg-green-600 hover:bg-green-700', 'bg-blue-600 hover:bg-blue-700');
        cancelBtn.classList.add('hidden');
    }

    // Mark mobile as sold
    markAsSold(id) {
        if (confirm('Mark this mobile as sold?')) {
            const mobile = this.inventory.find(m => m.id === id);
            if (mobile) {
                mobile.sold = true;
                this.saveInventory();
                this.displayInventory();
                this.showSuccess('Mobile marked as sold!');
            }
        }
    }

    // Export inventory to JSON
    exportInventory() {
        if (this.inventory.length === 0) {
            this.showError('No inventory data to export.');
            return;
        }

        try {
            const dataStr = JSON.stringify(this.inventory, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Inventory exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export inventory.');
        }
    }

    // Export inventory to Excel (.xlsx)
    exportInventoryToExcel() {
        if (this.inventory.length === 0) {
            this.showError('No inventory data to export.');
            return;
        }

        try {
            // Prepare data for Excel (remove image data for cleaner output)
            const excelData = this.inventory.map((mobile, index) => ({
                'No.': index + 1,
                'Brand': mobile.brand,
                'Model': mobile.model,
                'IMEI': mobile.imei,
                'RAM': mobile.ram,
                'Storage': mobile.storage,
                'Status': mobile.sold ? 'SOLD' : 'AVAILABLE',
                'Has Image': mobile.image ? 'Yes' : 'No',
                'Date Added': new Date(mobile.id).toLocaleDateString()
            }));

            // Create worksheet from JSON data
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths for better formatting
            const columnWidths = [
                { wch: 5 },   // No.
                { wch: 15 },  // Brand
                { wch: 20 },  // Model
                { wch: 18 },  // IMEI
                { wch: 8 },   // RAM
                { wch: 10 },  // Storage
                { wch: 12 },  // Status
                { wch: 12 },  // Has Image
                { wch: 15 }   // Date Added
            ];
            worksheet['!cols'] = columnWidths;

            // Create workbook and add worksheet
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Mobile Inventory');

            // Generate Excel file and trigger download
            const fileName = `inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            this.showSuccess('Excel file downloaded successfully!');
        } catch (error) {
            console.error('Excel export error:', error);
            this.showError('Failed to export Excel file. Please make sure XLSX library is loaded.');
        }
    }

    // Generate test data for development/testing
    generateTestData() {
        if (confirm('This will add sample mobile inventory data. Continue?')) {
            const testMobiles = [
                {
                    id: Date.now() + 1,
                    brand: 'Samsung',
                    model: 'Galaxy A54',
                    imei: '123456789012345',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 2,
                    brand: 'Apple',
                    model: 'iPhone 13',
                    imei: '234567890123456',
                    ram: '4GB',
                    storage: '128GB',
                    image: null,
                    sold: true
                },
                {
                    id: Date.now() + 3,
                    brand: 'Xiaomi',
                    model: 'Redmi Note 12',
                    imei: '345678901234567',
                    ram: '6GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 4,
                    brand: 'OnePlus',
                    model: 'Nord CE 3',
                    imei: '456789012345678',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 5,
                    brand: 'Google',
                    model: 'Pixel 7a',
                    imei: '567890123456789',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: true
                },
                {
                    id: Date.now() + 6,
                    brand: 'Samsung',
                    model: 'Galaxy S22',
                    imei: '678901234567890',
                    ram: '8GB',
                    storage: '256GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 7,
                    brand: 'Apple',
                    model: 'iPhone 12',
                    imei: '789012345678901',
                    ram: '4GB',
                    storage: '64GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 8,
                    brand: 'Realme',
                    model: 'GT Neo 3',
                    imei: '890123456789012',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: true
                },
                {
                    id: Date.now() + 9,
                    brand: 'Vivo',
                    model: 'V27 Pro',
                    imei: '901234567890123',
                    ram: '8GB',
                    storage: '256GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 10,
                    brand: 'Oppo',
                    model: 'Reno 8',
                    imei: '012345678901234',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 11,
                    brand: 'Apple',
                    model: 'iPhone 14',
                    imei: '112345678901234',
                    ram: '6GB',
                    storage: '128GB',
                    image: null,
                    sold: true
                },
                {
                    id: Date.now() + 12,
                    brand: 'Samsung',
                    model: 'Galaxy A34',
                    imei: '212345678901234',
                    ram: '6GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 13,
                    brand: 'Xiaomi',
                    model: 'Mi 11',
                    imei: '312345678901234',
                    ram: '8GB',
                    storage: '256GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 14,
                    brand: 'Motorola',
                    model: 'Edge 30',
                    imei: '412345678901234',
                    ram: '8GB',
                    storage: '128GB',
                    image: null,
                    sold: false
                },
                {
                    id: Date.now() + 15,
                    brand: 'Nothing',
                    model: 'Phone (2)',
                    imei: '512345678901234',
                    ram: '12GB',
                    storage: '256GB',
                    image: null,
                    sold: true
                }
            ];

            // Add test mobiles to inventory
            testMobiles.forEach(mobile => {
                // Check if IMEI already exists to avoid duplicates
                if (!this.isDuplicateIMEI(mobile.imei)) {
                    this.inventory.push(mobile);
                }
            });

            // Save to localStorage and refresh display
            this.saveInventory();
            this.displayInventory();
            this.updateInventoryCount();
            
            this.showSuccess(`Generated ${testMobiles.length} test mobiles in inventory!`);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new MobileInventoryManager();
}); 