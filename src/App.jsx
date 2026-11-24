import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
  import { initializeApp } from 'firebase/app';
  import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    signOut,
  } from 'firebase/auth';
  import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot,
  } from 'firebase/firestore';
  import {
    Home, MessageSquare, FileSpreadsheet, Receipt, Package, PieChart, BookOpen, LayoutGrid,
    Menu, Search, HelpCircle, Store, ChevronDown, ChevronRight, ChevronLeft, Plus, MoreVertical,
    MapPin, CheckCircle2, Printer, X, RefreshCw, Pencil, List, Grid, Database,
    Upload, Download, Copy, Mail, Trash2, Info, ArrowUpDown, Send
  } from 'lucide-react';

  // ============================================================================
  // 0. FIREBASE INITIALIZATION (VITE .ENV.LOCAL + SANDBOX SUPPORT)
  // ============================================================================

  const getEnvConfig = () => {
    try {
      return (typeof import.meta !== 'undefined' && import.meta && import.meta.env) ? import.meta.env : {};
    } catch (e) {
      return {};
    }
  };

  const envConfig = getEnvConfig();

  const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {
        apiKey: envConfig.VITE_FIREBASE_API_KEY || 'demo-api-key',
        authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN || 'demo-iven.firebaseapp.com',
        projectId: envConfig.VITE_FIREBASE_PROJECT_ID || 'demo-iven',
        storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: envConfig.VITE_FIREBASE_APP_ID || '',
      };

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'iven-prod';

  // ============================================================================
  // 1. CHART OF ACCOUNTS, COUNTRY CURRENCY MAP & STATE BUILDERS
  // ============================================================================

  const LOCATIONS = ['Main Warehouse', 'Retail Store', 'Transit / Van'];

  const COUNTRY_OPTIONS = [
    { name: 'India', currency: '₹', code: 'INR', taxRate: 18 },
    { name: 'United States', currency: '$', code: 'USD', taxRate: 8.5 },
    { name: 'United Kingdom', currency: '£', code: 'GBP', taxRate: 20 },
    { name: 'European Union', currency: '€', code: 'EUR', taxRate: 20 },
    { name: 'Canada', currency: 'CA$', code: 'CAD', taxRate: 13 },
    { name: 'Australia', currency: 'A$', code: 'AUD', taxRate: 10 },
    { name: 'United Arab Emirates', currency: 'AED ', code: 'AED', taxRate: 5 },
  ];

  const CHART_OF_ACCOUNTS = [
    { code: '1000', name: 'Checking Account', type: 'Asset', normalBalance: 'debit', description: 'Primary Business Checking Account' },
    { code: '1100', name: 'Accounts Receivable', type: 'Asset', normalBalance: 'debit', description: 'Unpaid customer invoices' },
    { code: '1200', name: 'Inventory Asset', type: 'Asset', normalBalance: 'debit', description: 'Value of stock on hand across locations' },
    { code: '2000', name: 'Accounts Payable', type: 'Liability', normalBalance: 'credit', description: 'Unpaid supplier bills' },
    { code: '2100', name: 'Sales Tax / VAT Payable', type: 'Liability', normalBalance: 'credit', description: 'Collected tax owed to authorities' },
    { code: '3000', name: "Owner's Equity", type: 'Equity', normalBalance: 'credit', description: 'Initial capital & retained earnings' },
    { code: '4000', name: 'Sales Revenue', type: 'Revenue', normalBalance: 'credit', description: 'Product and wholesale sales income' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'Expense', normalBalance: 'debit', description: 'Direct cost of inventory sold' },
    { code: '6100', name: 'Operating Expenses', type: 'Expense', normalBalance: 'debit', description: 'Rent, software, shipping & utilities' },
  ];

  const DEFAULT_USER_SETTINGS = {
    profilePhotoDataUrl: '',
    notifications: {
      tipsAndAnnouncements: true,
      masterEnabled: true,
      opportunity: { enabled: true, value: 5, unit: 'days', timing: 'before' },
      task: { enabled: true, value: 1, unit: 'days', timing: 'before' },
      call: { enabled: true, value: 1, unit: 'days', timing: 'before' },
      customerInvoicePayment: { enabled: true, value: 5, unit: 'days', timing: 'after' },
    },
    preferences: {
      dateFormat: '25/12/2016',
      language: 'English (UK)',
      startWeekOn: 'Monday',
      exportAs: 'Microsoft Excel',
      shorterAmounts: false,
      contactInfoPreviewer: true,
      accountantMode: false,
    },
  };

const DEFAULT_AUTO_NUMBERING = {
  accounting_transaction: { label: 'Accounting Transaction', prefix: 'JE-', nextNumber: 1001, digits: 4 },
  bank_deposit: { label: 'Bank Deposit', prefix: 'DEP-', nextNumber: 101, digits: 3 },
  bill: { label: 'Bill', prefix: 'BILL-', nextNumber: 801, digits: 3 },
  customer: { label: 'Customer', prefix: 'CUS-', nextNumber: 1, digits: 3 },
  customer_credit_memo: { label: 'Customer Credit Memo', prefix: 'CN-', nextNumber: 101, digits: 3 },
  delivery_note: { label: 'Delivery Note', prefix: 'DN-', nextNumber: 401, digits: 3 },
  employee: { label: 'Employee', prefix: 'EMP-', nextNumber: 1, digits: 2 },
  expense: { label: 'Expense', prefix: 'EXP-', nextNumber: 901, digits: 3 },
  inventory_entry: { label: 'Inventory Entry', prefix: 'INE-', nextNumber: 101, digits: 3 },
  inventory_transfer: { label: 'Inventory Transfer', prefix: 'TRF-', nextNumber: 101, digits: 3 },
  inventory_withdrawal: { label: 'Inventory Withdrawal', prefix: 'INW-', nextNumber: 101, digits: 3 },
  invoice: { label: 'Invoice', prefix: 'INV-', nextNumber: 3091, digits: 4 },
  picking_list: { label: 'Picking List', prefix: 'PCK-', nextNumber: 101, digits: 3 },
  product_or_service: { label: 'Product or Service', prefix: 'PRD-', nextNumber: 1, digits: 2 },
  purchase_order: { label: 'Purchase Order', prefix: 'PO-', nextNumber: 501, digits: 3 },
  purchase_return: { label: 'Purchase Return', prefix: 'PR-', nextNumber: 101, digits: 3 },
  quote: { label: 'Quote', prefix: 'QT-', nextNumber: 1041, digits: 4 },
  receiving_note: { label: 'Receiving Note', prefix: 'RCV-', nextNumber: 201, digits: 3 },
  sales_order: { label: 'Sales Order', prefix: 'SO-', nextNumber: 2081, digits: 4 },
};

const DEFAULT_DOC_TYPE_OVERRIDES = {
  invoice: {
    title: 'INVOICE',
    showProjectName: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    showInstallments: false,
    notes: '',
  },
  deliveryNote: {
    title: 'DELIVERY NOTE',
    showProjectName: true,
    notes: '',
  },
  pickingList: {
    title: 'PICKING LIST',
    showProjectName: false,
    notes: '',
  },
  purchaseOrder: {
    title: 'PURCHASE ORDER',
    showProjectName: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    notes: '',
  },
  quote: {
    title: 'QUOTE',
    showProjectName: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    notes: '',
  },
  salesReceipt: {
    title: 'SALES RECEIPT',
    showProjectName: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    notes: '',
  },
  salesOrder: {
    title: 'SALES ORDER',
    showProjectName: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    notes: '',
  },
};

const DEFAULT_DOCUMENT_TEMPLATE = {
  id: 'main-template',
  name: 'Main Template',
  global: {
    colorScheme: '#EFEFEF',
    fontFamily: 'Arial',
    fontSize: 'Medium', // 'Small' | 'Medium' | 'Large'
    fontColor: '#000000',
    logoPlacement: 'Above', // 'Above' | 'Left'
    logoWidth: 165,
    logoHeight: 110,
    showCompanyName: true,
    showCompanyAddress: true,
    showBillingAddress: true,
    showShippingAddress: true,
    showTaxpayerId: true,
    itemColLabel: 'Item name & description',
    qtyColLabel: 'Qty.',
    showQty: true,
    unitPriceColLabel: 'Unit price',
    showUnitPrice: true,
    showMeasurementUnit: true,
    showProductNumber: true,
    notes: '',
  },
  docs: DEFAULT_DOC_TYPE_OVERRIDES,
};
const INITIAL_COMPANY = {
  name: 'Roast & Craft Supply Co.',
  workspaceSlug: 'roastcraft',
  logoDataUrl: '',
  userFirstName: 'Wendel',
  userFullName: 'Wendel Crasta',
  userInitials: 'WC',
  avatarColor: '#8B5CF6',
  currency: '₹',
  defaultTaxRate: 18,
  address: '42 Residency Road',
  addressLine2: 'Ashok Nagar',
  addressLine3: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  postCode: '560025',
  country: 'India',
  email: 'wendel@roastandcraft.io',
  phone: '+91 80 4120 8890',
  fax: '',
  website: '',
  taxId: '29AABCR4821M1Z5',
  internationalTaxId: '',
  incorporationStatus: 'None',
  documentLanguage: 'English (United Kingdom)',
  documentFormat: 'A4',
  documentTemplates: [DEFAULT_DOCUMENT_TEMPLATE],
  documentTemplate: DEFAULT_DOCUMENT_TEMPLATE,
  allowLockedInvoiceCustomization: false,
  draftModeDocuments: false,
  autoNumbering: DEFAULT_AUTO_NUMBERING,
  cashDrawerManagement: false,
  accountingBasis: 'Accrual',
  vatRegistered: true,
  salesTaxLabel: 'GST',
  vatScheme: 'Standard',
  vatBasis: 'Cash',
  trackCustomerSupplier: true,
  doYouExport: false,
  accountingWindowStart: '2026-04-01',
  accountingWindowEnd: '2027-03-31',
  packUnits: false,
  defaultStorageLocation: 'Main Warehouse',
  fiscalYearStart: 'April',
  onboardingCompleted: true,
};

  const calcDocTotals = (items, products, discountPct = 0) => {
    let subtotal = 0;
    let rawTaxBase = 0;
    const lineTaxDetails = [];

    items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const rate = item.taxRate !== undefined ? Number(item.taxRate) : (prod ? Number(prod.taxRate) : 0);
      const lineDisc = Number(item.discPct) || 0;
      const lineRaw = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
      const lineNet = lineRaw * (1 - lineDisc / 100);
      subtotal += lineNet;
      lineTaxDetails.push({ lineNet, rate });
    });

    const docDiscRate = Number(discountPct) || 0;
    const discountAmount = Number((subtotal * (docDiscRate / 100)).toFixed(2));
    const discountedSubtotal = Number((subtotal - discountAmount).toFixed(2));

    let taxTotal = 0;
    lineTaxDetails.forEach(({ lineNet, rate }) => {
      const netAfterDocDisc = lineNet * (1 - docDiscRate / 100);
      rawTaxBase += netAfterDocDisc;
      taxTotal += netAfterDocDisc * (rate / 100);
    });

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount,
      discountedSubtotal,
      taxTotal: Number(taxTotal.toFixed(2)),
      total: Number((discountedSubtotal + taxTotal).toFixed(2)),
    };
  };

  const computeDueDateFromTerms = (dateStr, paymentTerms = 'Due on receipt') => {
    const base = dateStr ? new Date(dateStr) : new Date();
    if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
    const daysMap = {
      'Due on receipt': 0,
      'Net 15': 15,
      'Net 30': 30,
      'Net 45': 45,
      'Net 60': 60,
    };
    const addDays = daysMap[paymentTerms] ?? 0;
    base.setDate(base.getDate() + addDays);
    return base.toISOString().slice(0, 10);
  };

  // Option B Default: Clean Blank Workspace with New-Login Onboarding Flag
  function buildEmptyState(userOverrides = {}) {
    const firstName = userOverrides.userFirstName || 'Wendel';
    const fullName = userOverrides.userFullName || 'Wendel Crasta';
    const initials = userOverrides.userInitials || 'WC';
    const email = userOverrides.email || 'wendel@iven.app';
    const slugBase = email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'workspace';

    return {
      seededMode: 'blank',
      company: {
        ...INITIAL_COMPANY,
        name: userOverrides.companyName || '',
        workspaceSlug: userOverrides.workspaceSlug || slugBase,
        userFirstName: firstName,
        userFullName: fullName,
        userInitials: initials,
        email,
        country: 'India',
        currency: '₹',
        defaultTaxRate: 18,
        fiscalYearStart: 'April',
        address: '',
        taxId: '',
        onboardingCompleted: userOverrides.onboardingCompleted ?? false,
      },
      userSettings: JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)),
      teamUsers: [
        { id: 'USR-01', name: fullName, email, role: 'Admin', status: 'Active' },
      ],
      employees: [
        { id: 'EMP-01', name: fullName, title: 'Founder & Managing Director', department: 'Executive', email, hourlyRate: 75.00, status: 'Active' },
      ],
      uploadedFiles: [],
      priceFamilies: [],
      leads: [],
      opportunities: [],
      crmTasks: [],
      crmCalls: [],
      vendors: [
        { id: 'SUP-001', name: 'Miscellaneous Supplier', email: 'misc@supplier.local', phone: '', location: 'India', address: 'India', taxId: '', paymentTerms: 'Net 30', discountTier: 0 },
        { id: 'SUP-002', name: 'VAT Agency', email: 'filing@vatagency.gov', phone: '', location: 'India', address: 'India', taxId: 'VAT-REG-001', paymentTerms: 'Due on Receipt', discountTier: 0 },
      ],
      customers: [],
      products: [],
      quotes: [],
      salesOrders: [],
      deliveryNotes: [],
      invoices: [],
      paymentsReceived: [],
      purchaseOrders: [],
      vendorBills: [],
      expenses: [],
      stockTransfers: [],
      receivingLog: [],
      journalEntries: [],
      bankTransactions: [],
      integrations: [
        { id: 'INT-SQ', name: 'Square POS', category: 'Point of Sale', location: 'Retail Store', connected: false, lastSync: 'Not connected', ordersSynced: 0, description: 'Real-time register sales, tax mapping & retail stock deduction.' },
        { id: 'INT-SHP', name: 'Shopify Plus', category: 'E-Commerce', location: 'Main Warehouse', connected: false, lastSync: 'Not connected', ordersSynced: 0, description: 'Syncs online storefront orders, SKUs & available warehouse inventory.' },
        { id: 'INT-WOO', name: 'WooCommerce B2B', category: 'Wholesale Portal', location: 'Main Warehouse', connected: false, lastSync: 'Not connected', ordersSynced: 0, description: 'Wholesale buyer portal with net-terms invoicing & tier pricing.' },
        { id: 'INT-BNK', name: 'Business Bank Feed', category: 'Banking', location: 'All Locations', connected: false, lastSync: 'Not connected', ordersSynced: 0, description: 'Direct bank feed for 1-click auto-reconciliation.' },
      ],
      syncLogs: [],
    };
  }

  // Optional Sample ERP Dataset (loadable via Company Settings)
  function buildSampleState(userOverrides = {}) {
    const base = buildEmptyState({ ...userOverrides, onboardingCompleted: true });
    const vendors = [
      { id: 'SUP-001', name: 'Pacific Origin Roasters', email: 'orders@pacificorigin.com', phone: '(503) 555-0112', location: 'Bengaluru, IN', address: '1200 Industrial Layout, Bengaluru', taxId: '29AABCP1029M1Z1', paymentTerms: 'Net 30', discountTier: 0 },
      { id: 'SUP-002', name: 'Kinto & Aero Hardware Dist.', email: 'wholesale@kintoaero.com', phone: '(206) 555-0188', location: 'Mumbai, IN', address: '4800 Lower Parel, Mumbai', taxId: '27AABCK4829M1Z2', paymentTerms: 'Net 15', discountTier: 5 },
      { id: 'SUP-003', name: 'Cascade Ceramic & Glass', email: 'sales@cascadeceramics.co', phone: '(415) 555-0149', location: 'Delhi, IN', address: '890 Okhla Phase III, New Delhi', taxId: '07AABCC8372M1Z3', paymentTerms: 'Net 30', discountTier: 0 },
    ];
    const customers = [
      { id: 'CUS-001', name: 'Bluebird Cafe Group', email: 'purchasing@bluebirdcafe.com', phone: '98450-11220', location: 'Bengaluru, IN', billingAddress: '412 Indiranagar 100ft Rd, Bengaluru', shippingAddress: '412 Indiranagar 100ft Rd, Bengaluru', taxId: '29AABCB4411M1Z8', paymentTerms: 'Net 30', discountTier: 10 },
      { id: 'CUS-002', name: 'Monocle Hospitality LLC', email: 'ap@monoclehotels.com', phone: '98201-77223', location: 'Mumbai, IN', billingAddress: '1100 Bandra West, Mumbai', shippingAddress: '1105 Bandra West, Mumbai', taxId: '27AABCM7722M1Z9', paymentTerms: 'Net 15', discountTier: 15 },
      { id: 'CUS-003', name: 'Alder Street Provisions', email: 'hello@alderprovisions.com', phone: '98450-88291', location: 'Bengaluru, IN', billingAddress: '920 Koramangala 4th Block, Bengaluru', shippingAddress: '920 Koramangala 4th Block, Bengaluru', taxId: '29AABCA8829M1Z4', paymentTerms: 'Due on Receipt', discountTier: 0 },
    ];
    const products = [
      { id: 'PRD-01', sku: 'COF-ETH-01', barcode: '8901001001', name: 'Ethiopia Yirgacheffe Whole Bean (5lb)', category: 'Coffee Beans', vendorId: 'SUP-001', cost: 2400, price: 4200, taxRate: 5, reorderPoint: 20, salesVelocity30d: 48, stockByLocation: { 'Main Warehouse': 12, 'Retail Store': 4, 'Transit / Van': 0 } },
      { id: 'PRD-02', sku: 'COF-COL-02', barcode: '8901001002', name: 'Colombia Huila Reserve (5lb)', category: 'Coffee Beans', vendorId: 'SUP-001', cost: 2200, price: 3900, taxRate: 5, reorderPoint: 25, salesVelocity30d: 62, stockByLocation: { 'Main Warehouse': 34, 'Retail Store': 10, 'Transit / Van': 4 } },
      { id: 'PRD-03', sku: 'BRW-V60-05', barcode: '8901001005', name: 'Ceramic V60 Dripper Size 02 - White', category: 'Brewing Gear', vendorId: 'SUP-002', cost: 850, price: 1650, taxRate: 18, reorderPoint: 25, salesVelocity30d: 40, stockByLocation: { 'Main Warehouse': 10, 'Retail Store': 5, 'Transit / Van': 0 } },
      { id: 'PRD-04', sku: 'BRW-KTL-06', barcode: '8901001006', name: 'Stagg EKG Electric Gooseneck Kettle', category: 'Brewing Gear', vendorId: 'SUP-002', cost: 6800, price: 11500, taxRate: 18, reorderPoint: 10, salesVelocity30d: 18, stockByLocation: { 'Main Warehouse': 16, 'Retail Store': 5, 'Transit / Van': 0 } },
      { id: 'PRD-05', sku: 'CER-MUG-10', barcode: '8901001010', name: 'Speckled Stoneware Diner Mug (12oz)', category: 'Drinkware', vendorId: 'SUP-003', cost: 480, price: 1150, taxRate: 18, reorderPoint: 30, salesVelocity30d: 52, stockByLocation: { 'Main Warehouse': 45, 'Retail Store': 18, 'Transit / Van': 0 } },
    ];

    const invItems = [{ productId: 'PRD-02', qty: 15, unitPrice: 3900, taxRate: 5 }, { productId: 'PRD-04', qty: 6, unitPrice: 11500, taxRate: 18 }];
    const invTotals = calcDocTotals(invItems, products, 0);
    const openInvItems = [{ productId: 'PRD-01', qty: 8, unitPrice: 4200, taxRate: 5 }];
    const openInvTotals = calcDocTotals(openInvItems, products, 0);

    return {
      ...base,
      seededMode: 'sample',
      company: {
        ...base.company,
        name: userOverrides.companyName || 'Roast & Craft Supply Co.',
        address: '42 Residency Road, Ashok Nagar, Bengaluru, Karnataka 560025',
        taxId: '29AABCR4821M1Z5',
        onboardingCompleted: true,
      },
      vendors,
      customers,
      products,
      quotes: [
        { id: 'QT-1041', customerId: 'CUS-002', date: '2026-11-14', expiryDate: '2026-12-14', status: 'Sent', discountPct: 10, notes: 'Boutique hotel room setup', items: openInvItems },
      ],
      salesOrders: [
        { id: 'SO-2081', customerId: 'CUS-001', date: '2026-11-15', location: 'Main Warehouse', fulfillmentStatus: 'To Pick', invoiced: false, invoiceId: null, discountPct: 0, items: openInvItems },
      ],
      deliveryNotes: [
        { id: 'DN-401', orderId: 'SO-2081', customerId: 'CUS-001', date: '2026-11-15', location: 'Main Warehouse', status: 'To Pick', tracking: '', items: openInvItems },
      ],
      invoices: [
        { id: 'INV-3091', orderId: null, customerId: 'CUS-001', date: '2026-11-05', dueDate: '2026-12-05', status: 'Paid', discountPct: 0, items: invItems, ...invTotals, amountPaid: invTotals.total },
        { id: 'INV-3092', orderId: null, customerId: 'CUS-002', date: '2026-11-12', dueDate: '2026-11-27', status: 'Open', discountPct: 0, items: openInvItems, ...openInvTotals, amountPaid: 0 },
      ],
      paymentsReceived: [
        { id: 'PAY-701', invoiceId: 'INV-3091', customerId: 'CUS-001', date: '2026-11-08', method: 'NEFT / Bank Transfer', amount: invTotals.total, reference: 'UTR-884920' },
      ],
      expenses: [
        { id: 'EXP-901', date: '2026-11-02', vendorName: 'Brigade Commercial Spaces', category: 'Facility Rent', amount: 45000, method: 'Bank Auto-Debit', notes: 'November Warehouse Lease' },
      ],
      journalEntries: [
        {
          id: 'JE-1001',
          date: '2026-11-01',
          ref: 'OPENING-BAL',
          description: 'Opening Capital & Inventory Asset Valuation',
          lines: [
            { accountCode: '1000', debit: 250000, credit: 0 },
            { accountCode: '1200', debit: 243600, credit: 0 },
            { accountCode: '3000', debit: 0, credit: 493600 },
          ],
        },
        {
          id: 'JE-1002',
          date: '2026-11-05',
          ref: 'INV-3091',
          description: 'Invoice Paid - Bluebird Cafe Group',
          lines: [
            { accountCode: '1000', debit: invTotals.total, credit: 0 },
            { accountCode: '4000', debit: 0, credit: invTotals.subtotal },
            { accountCode: '2100', debit: 0, credit: invTotals.taxTotal },
          ],
        },
        {
          id: 'JE-1003',
          date: '2026-11-12',
          ref: 'INV-3092',
          description: 'Invoice Issued - Monocle Hospitality LLC',
          lines: [
            { accountCode: '1100', debit: openInvTotals.total, credit: 0 },
            { accountCode: '4000', debit: 0, credit: openInvTotals.subtotal },
            { accountCode: '2100', debit: 0, credit: openInvTotals.taxTotal },
          ],
        },
        {
          id: 'JE-1004',
          date: '2026-11-02',
          ref: 'EXP-901',
          description: 'Facility Rent Paid',
          lines: [
            { accountCode: '6100', debit: 45000, credit: 0 },
            { accountCode: '1000', debit: 0, credit: 45000 },
          ],
        },
      ],
      bankTransactions: [
        { id: 'BNK-01', date: '2026-11-17', description: 'NEFT IN - MONOCLE HOSPITALITY LLC', amount: openInvTotals.total, type: 'credit', status: 'Unreconciled', suggestedMatchType: 'invoice', suggestedMatchId: 'INV-3092' },
      ],
    };
  }

  function getInitials(name = 'WC') {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'WC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ============================================================================
  // 2. CLOUD FIRESTORE + IN-MEMORY DETERMINISTIC ERP STORE
  // ============================================================================

  const ERPContext = createContext(null);

  export function ERPProvider({ user, isDemoSession, children }) {
    const [state, setState] = useState(null);
    const [loadingWorkspace, setLoadingWorkspace] = useState(true);
    const [syncStatus, setSyncStatus] = useState('synced');

    const [toast, setToast] = useState(null);
    const notify = useCallback((message, type = 'success') => {
      setToast({ id: Date.now(), message, type });
    }, []);

    useEffect(() => {
      if (!toast) return;
      const t = setTimeout(() => setToast(null), 3800);
      return () => clearTimeout(t);
    }, [toast]);

    const getWorkspaceDocRef = useCallback((uid) => {
      return doc(db, 'artifacts', appId, 'users', uid, 'erp', 'workspace');
    }, []);

    // Option B: Every new login starts with a clean blank workspace + Company Setup onboarding
    useEffect(() => {
      if (!user) {
        setState(null);
        setLoadingWorkspace(false);
        return;
      }

      const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Wendel Crasta');
      const firstName = displayName.split(' ')[0] || 'Wendel';
      const userOverrides = {
        userFirstName: firstName,
        userFullName: displayName,
        userInitials: getInitials(displayName),
        email: user.email || 'wendel@iven.app',
      };

      if (isDemoSession) {
        setState(buildEmptyState(userOverrides));
        setSyncStatus('demo');
        setLoadingWorkspace(false);
        return;
      }

      setLoadingWorkspace(true);
      const ref = getWorkspaceDocRef(user.uid);

      const unsubscribe = onSnapshot(
        ref,
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setState({
              ...data,
              userSettings: {
                ...DEFAULT_USER_SETTINGS,
                ...(data.userSettings || {}),
                notifications: {
                  ...DEFAULT_USER_SETTINGS.notifications,
                  ...(data.userSettings?.notifications || {}),
                },
                preferences: {
                  ...DEFAULT_USER_SETTINGS.preferences,
                  ...(data.userSettings?.preferences || {}),
                },
              },
              company: {
                ...data.company,
                userFullName: data.company?.userFullName || displayName,
                userFirstName: data.company?.userFirstName || firstName,
                userInitials: data.company?.userInitials || getInitials(displayName),
                email: user.email || data.company?.email,
                onboardingCompleted: data.company?.onboardingCompleted ?? true,
              },
            });
            setSyncStatus('synced');
            setLoadingWorkspace(false);
          } else {
            const freshBlank = buildEmptyState({ ...userOverrides, onboardingCompleted: false });
            try {
              await setDoc(ref, freshBlank);
              setState(freshBlank);
              setSyncStatus('synced');
            } catch (err) {
              console.error('Error initializing Firestore workspace:', err);
              setState(freshBlank);
              setSyncStatus('offline');
            } finally {
              setLoadingWorkspace(false);
            }
          }
        },
        (err) => {
          console.error('Firestore listener error:', err);
          setState((prev) => prev || buildEmptyState({ ...userOverrides, onboardingCompleted: false }));
          setSyncStatus('offline');
          setLoadingWorkspace(false);
        }
      );

      return () => unsubscribe();
    }, [user, isDemoSession, getWorkspaceDocRef]);

    const commitState = useCallback(
      (updater) => {
        setState((prev) => {
          if (!prev) return prev;
          const next = typeof updater === 'function' ? updater(prev) : updater;
          if (user && !isDemoSession) {
            setSyncStatus('saving');
            const ref = getWorkspaceDocRef(user.uid);
            setDoc(ref, next)
              .then(() => setSyncStatus('synced'))
              .catch((err) => {
                console.error('Firestore save error:', err);
                setSyncStatus('offline');
              });
          }
          return next;
        });
      },
      [user, isDemoSession, getWorkspaceDocRef]
    );

    // Money formatter supporting Shorter Amounts preference (e.g. ₹137,320 -> ₹137 K)
    const formatAmount = useCallback(
      (val) => {
        const currency = state?.company?.currency || '₹';
        const shorter = state?.userSettings?.preferences?.shorterAmounts || false;
        const num = Number(val) || 0;
        const sign = num < 0 ? '-' : '';
        const abs = Math.abs(num);

        if (shorter && abs >= 1000) {
          if (abs >= 1000000) {
            return `${sign}${currency}${Math.round(abs / 1000000)} M`;
          }
          return `${sign}${currency}${Math.round(abs / 1000)} K`;
        }
        return `${sign}${currency}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },
      [state?.company?.currency, state?.userSettings?.preferences?.shorterAmounts]
    );

    const enrichedProducts = useMemo(() => {
      if (!state) return [];
      const committedMap = {};
      state.salesOrders.forEach((so) => {
        if (so.fulfillmentStatus === 'To Pick' || so.fulfillmentStatus === 'Packed') {
          so.items.forEach((item) => {
            committedMap[item.productId] = (committedMap[item.productId] || 0) + item.qty;
          });
        }
      });

      return state.products.map((p) => {
        const onHand = Object.values(p.stockByLocation).reduce((sum, q) => sum + q, 0);
        const committed = committedMap[p.id] || 0;
        const available = onHand - committed;
        const isLowStock = available <= p.reorderPoint;
        return {
          ...p,
          onHand,
          committed,
          available,
          isLowStock,
          totalValue: Number((onHand * p.cost).toFixed(2)),
        };
      });
    }, [state]);

    const accountBalances = useMemo(() => {
      const map = {};
      CHART_OF_ACCOUNTS.forEach((acc) => {
        map[acc.code] = 0;
      });
      if (!state) return map;
      state.journalEntries.forEach((je) => {
        je.lines.forEach((line) => {
          const acc = CHART_OF_ACCOUNTS.find((a) => a.code === line.accountCode);
          if (!acc) return;
          if (acc.normalBalance === 'debit') {
            map[acc.code] = Number((map[acc.code] + line.debit - line.credit).toFixed(2));
          } else {
            map[acc.code] = Number((map[acc.code] + line.credit - line.debit).toFixed(2));
          }
        });
      });
      return map;
    }, [state]);

    const createJournalEntry = (prevState, { ref, description, lines, date }) => {
      const cleanLines = lines
        .map((l) => ({
          accountCode: l.accountCode,
          debit: Number((l.debit || 0).toFixed(2)),
          credit: Number((l.credit || 0).toFixed(2)),
        }))
        .filter((l) => l.debit > 0 || l.credit > 0);
      if (cleanLines.length === 0) return prevState.journalEntries;
      const nextNum = 1001 + prevState.journalEntries.length;
      const entry = {
        id: `JE-${nextNum}`,
        date: date || new Date().toISOString().slice(0, 10),
        ref,
        description,
        lines: cleanLines,
      };
      return [entry, ...prevState.journalEntries];
    };

    // Company, Onboarding & User Settings Actions
    const updateCompany = (updates) => {
      commitState((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          ...updates,
          userInitials: updates.userFullName ? getInitials(updates.userFullName) : prev.company.userInitials,
          userFirstName: updates.userFullName ? updates.userFullName.split(' ')[0] : (updates.userFirstName || prev.company.userFirstName),
        },
      }));
      notify('Company settings saved.');
    };

    const completeOnboarding = (setupData) => {
      commitState((prev) => {
        const openingBal = Number(setupData.openingCashBalance) || 0;
        const updatedJE =
          openingBal > 0
            ? createJournalEntry(prev, {
                ref: 'OPENING-CASH',
                description: 'Initial Opening Bank Balance',
                lines: [
                  { accountCode: '1000', debit: openingBal, credit: 0 },
                  { accountCode: '3000', debit: 0, credit: openingBal },
                ],
              })
            : prev.journalEntries;

        return {
          ...prev,
          company: {
            ...prev.company,
            name: setupData.companyName,
            userFullName: setupData.userFullName || prev.company.userFullName,
            userFirstName: (setupData.userFullName || prev.company.userFullName).split(' ')[0],
            userInitials: getInitials(setupData.userFullName || prev.company.userFullName),
            country: setupData.country,
            currency: setupData.currency,
            defaultTaxRate: Number(setupData.defaultTaxRate) || 0,
            fiscalYearStart: setupData.fiscalYearStart,
            address: setupData.address,
            taxId: setupData.taxId || '',
            onboardingCompleted: true,
          },
          journalEntries: updatedJE,
        };
      });
      notify(`Welcome to Iven! Workspace "${setupData.companyName}" is ready.`);
    };

    const updateUserSettings = (sectionUpdates) => {
      commitState((prev) => ({
        ...prev,
        userSettings: {
          ...prev.userSettings,
          ...sectionUpdates,
          notifications: {
            ...prev.userSettings.notifications,
            ...(sectionUpdates.notifications || {}),
          },
          preferences: {
            ...prev.userSettings.preferences,
            ...(sectionUpdates.preferences || {}),
          },
        },
      }));
    };

    const resetDemoData = (mode = 'blank') => {
      const userOverrides = state
        ? {
            userFirstName: state.company.userFirstName,
            userFullName: state.company.userFullName,
            userInitials: state.company.userInitials,
            email: state.company.email,
            companyName: state.company.name,
            onboardingCompleted: true,
          }
        : { onboardingCompleted: true };
      const next = mode === 'blank' ? buildEmptyState(userOverrides) : buildSampleState(userOverrides);
      commitState(next);
      notify(mode === 'blank' ? 'Workspace cleared to blank starter state.' : 'Loaded sample ERP dataset.');
    };

    const inviteTeamUser = ({ name, email, role }) => {
      commitState((prev) => ({
        ...prev,
        teamUsers: [
          ...prev.teamUsers,
          { id: `USR-${String(prev.teamUsers.length + 1).padStart(2, '0')}`, name, email, role, status: 'Invited' },
        ],
      }));
      notify(`Invited ${name} (${role}) to workspace.`);
    };

    const addEmployee = ({ name, title, department, email, hourlyRate }) => {
      commitState((prev) => ({
        ...prev,
        employees: [
          ...prev.employees,
          {
            id: `EMP-${String(prev.employees.length + 1).padStart(2, '0')}`,
            name,
            title,
            department,
            email,
            hourlyRate: Number(hourlyRate) || 35,
            status: 'Active',
          },
        ],
      }));
      notify(`Added employee ${name}.`);
    };

    const uploadVaultFile = ({ name, category, size }) => {
      commitState((prev) => ({
        ...prev,
        uploadedFiles: [
          {
            id: `FIL-${String(prev.uploadedFiles.length + 1).padStart(2, '0')}`,
            name,
            category: category || 'Document',
            size: size || '128 KB',
            uploadedAt: new Date().toISOString().slice(0, 10),
            uploadedBy: prev.company.userFullName,
          },
          ...prev.uploadedFiles,
        ],
      }));
      notify(`Uploaded "${name}".`);
    };

    // CRM Leads & Opportunities
    const addLead = (lead) => {
      const createdLeadId = `LD-${String((state?.leads?.length || 0) + 1).padStart(3, '0')}`;
      const newLead = {
        id: createdLeadId,
        company: lead.company,
        contact: lead.contact,
        email: lead.email,
        phone: lead.phone || '',
        location: lead.location || state?.company?.country || 'India',
        source: lead.source || 'Direct',
        status: 'New',
      };
      commitState((prev) => ({
        ...prev,
        leads: [newLead, ...prev.leads],
      }));
      notify(`Lead "${lead.company}" saved.`);
      return createdLeadId;
    };

    const convertLeadToCustomer = (leadId) => {
      commitState((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        if (!lead) return prev;
        const newCust = {
          id: `CUS-${String(prev.customers.length + 1).padStart(3, '0')}`,
          name: lead.company,
          email: lead.email,
          phone: lead.phone,
          location: lead.location,
          billingAddress: lead.location,
          shippingAddress: lead.location,
          taxId: '',
          paymentTerms: 'Net 30',
          discountTier: 0,
        };
        return {
          ...prev,
          leads: prev.leads.filter((l) => l.id !== leadId),
          customers: [newCust, ...prev.customers],
        };
      });
      notify('Lead converted to Customer in Sales!');
    };

    const addOpportunity = (opp) => {
      commitState((prev) => ({
        ...prev,
        opportunities: [
          {
            id: `OPP-${101 + prev.opportunities.length}`,
            title: opp.title,
            company: opp.company,
            value: Number(opp.value) || 0,
            stage: opp.stage || 'Qualification',
            probability: Number(opp.probability) || 50,
            closeDate: opp.closeDate || new Date().toISOString().slice(0, 10),
          },
          ...prev.opportunities,
        ],
      }));
      notify('Opportunity added.');
    };

    const addTask = (task) => {
      commitState((prev) => ({
        ...prev,
        crmTasks: [
          {
            id: `TSK-${String(prev.crmTasks.length + 1).padStart(2, '0')}`,
            title: task.title,
            relatedTo: task.relatedTo || 'General',
            dueDate: task.dueDate || new Date().toISOString().slice(0, 10),
            done: false,
          },
          ...prev.crmTasks,
        ],
      }));
      notify('Task added.');
    };

    const toggleTask = (id) => {
      commitState((prev) => ({
        ...prev,
        crmTasks: prev.crmTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }));
    };

    const addCall = (call) => {
      commitState((prev) => ({
        ...prev,
        crmCalls: [
          {
            id: `CLL-${String(prev.crmCalls.length + 1).padStart(2, '0')}`,
            subject: call.subject,
            contact: call.contact,
            date: new Date().toISOString().slice(0, 10),
            duration: call.duration || '15 mins',
            outcome: call.outcome || 'Completed',
          },
          ...prev.crmCalls,
        ],
      }));
      notify('Call logged.');
    };

    // Products & Inventory
    // Products & Inventory
    const addProduct = (prodData) => {
      const existingCount = state?.products?.length || 0;
      const nextId = `PRD-${String(existingCount + 1).padStart(2, '0')}`;
      const newProd = {
        id: nextId,
        sku: prodData.sku || `SKU-${100 + existingCount}`,
        barcode: prodData.barcode || `8901001${100 + existingCount}`,
        name: prodData.name,
        description: prodData.description || '',
        type: prodData.type || 'Product',
        unit: prodData.unit || (prodData.type === 'Service' ? 'Day' : 'Unit'),
        category: prodData.category || prodData.family || 'Miscellaneous',
        vendorId: prodData.vendorId || state?.vendors?.[0]?.id || 'SUP-001',
        cost: Number(prodData.cost) || 0,
        price: Number(prodData.price) || 0,
        taxRate:
          prodData.taxRate !== undefined
            ? Number(prodData.taxRate)
            : (state?.company?.defaultTaxRate ?? 18),
        reorderPoint: Number(prodData.reorderPoint) || 10,
        privateNote: prodData.privateNote || '',
        incomeAccount: prodData.incomeAccount || 'Sales - Miscellaneous (41005)',
        salesVelocity30d: 20,
        stockByLocation: {
          'Main Warehouse': Number(prodData.mainWarehouseQty) || 0,
          'Retail Store': Number(prodData.retailStoreQty) || 0,
          'Transit / Van': Number(prodData.transitQty) || 0,
        },
      };

      const initialQty = Object.values(newProd.stockByLocation).reduce((a, b) => a + b, 0);
      const initialVal = Number((initialQty * newProd.cost).toFixed(2));

      commitState((prev) => {
        const updatedJE =
          initialVal > 0
            ? createJournalEntry(prev, {
                ref: newProd.sku,
                description: `Initial Stock Added: ${newProd.name} (${initialQty} units)`,
                lines: [
                  { accountCode: '1200', debit: initialVal, credit: 0 },
                  { accountCode: '3000', debit: 0, credit: initialVal },
                ],
              })
            : prev.journalEntries;

        return { ...prev, products: [newProd, ...prev.products], journalEntries: updatedJE };
      });

      notify(`${prodData.type || 'Product'} "${prodData.name}" added.`);
      return newProd;
    };

    const transferStock = ({ productId, qty, fromLocation, toLocation, notes }) => {
      const numQty = Number(qty);
      if (!productId || numQty <= 0 || fromLocation === toLocation) return;
      commitState((prev) => {
        const prod = prev.products.find((p) => p.id === productId);
        if (!prod) return prev;
        const moveQty = Math.min(numQty, prod.stockByLocation[fromLocation] || 0);
        if (moveQty <= 0) return prev;
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  stockByLocation: {
                    ...p.stockByLocation,
                    [fromLocation]: p.stockByLocation[fromLocation] - moveQty,
                    [toLocation]: (p.stockByLocation[toLocation] || 0) + moveQty,
                  },
                }
              : p
          ),
          stockTransfers: [
            {
              id: `TRF-${101 + prev.stockTransfers.length}`,
              date: new Date().toISOString().slice(0, 10),
              productId,
              qty: moveQty,
              fromLocation,
              toLocation,
              notes: notes || 'Stock transfer',
            },
            ...prev.stockTransfers,
          ],
        };
      });
      notify(`Moved ${numQty} units from ${fromLocation} to ${toLocation}.`);
    };

    const generateNextCustomerCode = (customersList) => {
      let maxNum = 0;
      (customersList || []).forEach((c) => {
        const match = String(c.id || '').match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      return `CUS-${String(maxNum + 1).padStart(3, '0')}`;
    };

    const formatCustomerLocation = (cust, fallbackCountry = 'India') => {
      const parts = [
        cust.billingAddress,
        cust.addressLine2,
        cust.city,
        cust.postCode,
        cust.state,
        cust.country || fallbackCountry,
      ].filter((v) => v && String(v).trim() !== '');
      return parts.length > 0 ? parts.join(', ') : (cust.location || fallbackCountry);
    };

    const addCustomer = (cust) => {
      const existingCustomers = state?.customers || [];
      const fallbackCountry = state?.company?.country || 'India';
      const customCode = cust.code && cust.code.trim() ? cust.code.trim() : '';
      const codeExists =
        customCode && existingCustomers.some((c) => c.id.toLowerCase() === customCode.toLowerCase());
      const createdId =
        customCode && !codeExists ? customCode : generateNextCustomerCode(existingCustomers);

      const matchedFamily = (state?.priceFamilies || []).find((f) => f.name === cust.priceFamily);
      const discountTier = matchedFamily
        ? Number(matchedFamily.discountPct) || 0
        : (Number(cust.discountTier) || 0);
      const locationStr = formatCustomerLocation(cust, fallbackCountry);
      const sameAsBilling = cust.sameAsBilling !== undefined ? Boolean(cust.sameAsBilling) : true;

      const newCustomer = {
        id: createdId,
        customerType: cust.customerType || 'Company',
        name: cust.name,
        email: cust.email || '',
        phone: cust.phone || '',
        website: cust.website || '',
        taxId: cust.taxId || '',
        location: locationStr,
        billingAddress: cust.billingAddress || cust.location || '',
        addressLine2: cust.addressLine2 || '',
        city: cust.city || '',
        state: cust.state || '',
        postCode: cust.postCode || '',
        country: cust.country || fallbackCountry,
        sameAsBilling,
        shippingAddress: sameAsBilling ? (cust.billingAddress || '') : (cust.shippingAddress || ''),
        shippingLine2: sameAsBilling ? (cust.addressLine2 || '') : (cust.shippingLine2 || ''),
        shippingCity: sameAsBilling ? (cust.city || '') : (cust.shippingCity || ''),
        shippingState: sameAsBilling ? (cust.state || '') : (cust.shippingState || ''),
        shippingPostCode: sameAsBilling ? (cust.postCode || '') : (cust.shippingPostCode || ''),
        shippingCountry: sameAsBilling
          ? (cust.country || fallbackCountry)
          : (cust.shippingCountry || fallbackCountry),
        contacts: Array.isArray(cust.contacts) ? cust.contacts : [],
        paymentTerms: cust.paymentTerms || 'Due on receipt',
        priceFamily: cust.priceFamily || 'None',
        salesTax: cust.salesTax || 'None',
        priorityVat: Boolean(cust.priorityVat),
        employeeCount: Number(cust.employeeCount) || 1,
        industry: cust.industry || 'None',
        incorporationStatus: cust.incorporationStatus || 'None',
        optInEmails: Boolean(cust.optInEmails),
        baseAccount: cust.baseAccount || '11100 (Accounts Receivable:Miscellaneous Customer)',
        notes: cust.notes || '',
        discountTier,
        createdAt: cust.createdAt || new Date().toISOString().slice(0, 10),
      };

      commitState((prev) => ({
        ...prev,
        customers: [newCustomer, ...prev.customers],
      }));
      notify(`Customer "${cust.name}" (${createdId}) saved.`);
      return createdId;
    };

    const updateCustomer = (customerId, updates) => {
      commitState((prev) => {
        const matchedFamily = (prev.priceFamilies || []).find((f) => f.name === updates.priceFamily);
        const discountTier = matchedFamily
          ? Number(matchedFamily.discountPct) || 0
          : (Number(updates.discountTier) || 0);

        return {
          ...prev,
          customers: prev.customers.map((c) => {
            if (c.id !== customerId) return c;
            const merged = { ...c, ...updates, discountTier };
            const sameAsBilling = merged.sameAsBilling !== false;
            return {
              ...merged,
              location: formatCustomerLocation(merged, prev.company.country || 'India'),
              shippingAddress: sameAsBilling ? merged.billingAddress : merged.shippingAddress,
              shippingLine2: sameAsBilling ? merged.addressLine2 : merged.shippingLine2,
              shippingCity: sameAsBilling ? merged.city : merged.shippingCity,
              shippingState: sameAsBilling ? merged.state : merged.shippingState,
              shippingPostCode: sameAsBilling ? merged.postCode : merged.shippingPostCode,
              shippingCountry: sameAsBilling ? merged.country : merged.shippingCountry,
            };
          }),
        };
      });
      notify(`Customer "${updates.name}" updated.`);
    };

    const deleteCustomer = (customerId) => {
      commitState((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== customerId),
      }));
      notify('Customer deleted.');
    };

    const importCustomers = (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      commitState((prev) => {
        const existing = [...prev.customers];
        const added = [];
        rows.forEach((r) => {
          if (!r.name || !r.name.trim()) return;
          const requestedCode = r.code && r.code.trim() ? r.code.trim() : '';
          const exists = requestedCode && [...existing, ...added].some((c) => c.id.toLowerCase() === requestedCode.toLowerCase());
          const id = requestedCode && !exists ? requestedCode : generateNextCustomerCode([...existing, ...added]);
          const custObj = {
            id,
            customerType: r.customerType === 'Individual' ? 'Individual' : 'Company',
            name: r.name.trim(),
            email: r.email || '',
            phone: r.phone || '',
            website: r.website || '',
            taxId: r.taxId || '',
            billingAddress: r.billingAddress || '',
            addressLine2: r.addressLine2 || '',
            city: r.city || '',
            state: r.state || '',
            postCode: r.postCode || '',
            country: r.country || prev.company.country || 'India',
            sameAsBilling: true,
            shippingAddress: r.billingAddress || '',
            contacts: [],
            paymentTerms: r.paymentTerms || 'Due on receipt',
            priceFamily: r.priceFamily || 'None',
            salesTax: 'None',
            priorityVat: false,
            employeeCount: Number(r.employeeCount) || 1,
            industry: r.industry || 'None',
            incorporationStatus: 'None',
            optInEmails: false,
            baseAccount: '11100 (Accounts Receivable:Miscellaneous Customer)',
            notes: r.notes || '',
            discountTier: 0,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          custObj.location = formatCustomerLocation(custObj, prev.company.country || 'India');
          added.push(custObj);
        });
        return {
          ...prev,
          customers: [...added, ...prev.customers],
        };
      });
      notify(`Imported ${rows.length} customer(s) successfully.`);
    };

    const savePriceFamilies = (families) => {
      commitState((prev) => ({
        ...prev,
        priceFamilies: families,
        customers: prev.customers.map((c) => {
          const match = families.find((f) => f.name === c.priceFamily);
          return match ? { ...c, discountTier: Number(match.discountPct) || 0 } : c;
        }),
      }));
      notify('Price families saved.');
    };

    const addVendor = (vnd) => {
      commitState((prev) => ({
        ...prev,
        vendors: [
          {
            id: `SUP-${String(prev.vendors.length + 1).padStart(3, '0')}`,
            name: vnd.name,
            email: vnd.email || '',
            phone: vnd.phone || '',
            location: vnd.location || prev.company.country || 'India',
            address: vnd.address || vnd.location || '',
            taxId: vnd.taxId || '',
            paymentTerms: vnd.paymentTerms || 'Net 30',
            discountTier: Number(vnd.discountTier) || 0,
          },
          ...prev.vendors,
        ],
      }));
      notify(`Supplier "${vnd.name}" added.`);
    };

const createQuote = (payload) => {
   const rule = state.company?.autoNumbering?.quote || {
     prefix: 'QOT-',
     nextNumber: 1 + (state.quotes?.length || 0),
     digits: 3,
   };
   const docCode = payload.code?.trim()
     ? payload.code.trim()
     : formatDocNumber(rule, 'QOT-', 1 + (state.quotes?.length || 0));
   const docDisc = Number(payload.discountRate ?? payload.discountPct) || 0;
   const totals = calcDocTotals(payload.items || [], state.products, docDisc);
   const today = new Date().toISOString().slice(0, 10);
   const qtDate = payload.date || today;
   const newQuote = {
     ...payload,
     id: docCode,
     number: docCode,
     date: qtDate,
     expiryDate:
       payload.expiryDate ||
       new Date(new Date(qtDate).getTime() + 30 * 86400000).toISOString().slice(0, 10),
     paymentTerms: payload.paymentTerms || 'Due on receipt',
     status: payload.status || 'Open',
     recipient: payload.recipient || 'None',
     billingAddress: payload.billingAddress || '',
     discountPct: docDisc,
     discountRate: docDisc,
     discountAmount: totals.discountAmount,
     subtotal: totals.subtotal,
     taxTotal: totals.taxTotal,
     total: totals.total,
     documentNote: payload.documentNote || payload.notes || '',
     deliveryDate: payload.deliveryDate || '',
     deliveryContact: payload.deliveryContact || '',
     deliveryAddress: payload.deliveryAddress || '',
     poNumber: payload.poNumber || '',
     project: payload.project || '',
     privateNote: payload.privateNote || '',
     attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
     sentDate: payload.sentDate || '',
   };

   commitState((prev) => ({
     ...prev,
     quotes: [newQuote, ...(prev.quotes || [])],
     company: {
       ...prev.company,
       autoNumbering: {
         ...prev.company?.autoNumbering,
         quote: {
           ...rule,
           nextNumber: (Number(rule.nextNumber) || 1) + 1,
         },
       },
     },
   }));
   notify(`Quote ${docCode} saved.`);
   return newQuote;
 };

 const updateQuote = (quoteId, updates) => {
   commitState((prev) => {
     const existing = prev.quotes.find((q) => q.id === quoteId);
     if (!existing) return prev;
     const merged = { ...existing, ...updates };
     const docDisc = Number(merged.discountRate ?? merged.discountPct) || 0;
     const totals = calcDocTotals(merged.items || [], prev.products, docDisc);
     const updatedQt = {
       ...merged,
       discountPct: docDisc,
       discountRate: docDisc,
       discountAmount: totals.discountAmount,
       subtotal: totals.subtotal,
       taxTotal: totals.taxTotal,
       total: totals.total,
     };
     return {
       ...prev,
       quotes: prev.quotes.map((q) => (q.id === quoteId ? updatedQt : q)),
     };
   });
   notify(`Quote ${quoteId} updated.`);
 };

 const cancelQuote = (quoteId) => {
   commitState((prev) => ({
     ...prev,
     quotes: prev.quotes.map((q) => (q.id === quoteId ? { ...q, status: 'Cancelled' } : q)),
   }));
   notify(`Quote ${quoteId} cancelled.`);
 };

 const duplicateQuote = (quoteId) => {
   const src = state.quotes.find((q) => q.id === quoteId);
   if (!src) return null;
   const today = new Date().toISOString().slice(0, 10);
   return createQuote({
     ...src,
     id: undefined,
     number: undefined,
     code: undefined,
     date: today,
     expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
     status: 'Open',
     sentDate: '',
     items: (src.items || []).map((line) => ({ ...line })),
   });
 };

 const deleteQuote = (quoteId) => {
   commitState((prev) => ({
     ...prev,
     quotes: prev.quotes.filter((q) => q.id !== quoteId),
   }));
   notify(`Quote ${quoteId} deleted.`);
 };

 const markQuoteSent = (quoteId) => {
   const today = new Date().toISOString().slice(0, 10);
   commitState((prev) => ({
     ...prev,
     quotes: prev.quotes.map((q) => (q.id === quoteId ? { ...q, sentDate: today } : q)),
   }));
   notify(`Quote ${quoteId} emailed.`);
 };

 const convertQuoteToOrder = (quoteId) => {
   commitState((prev) => {
     const quote = prev.quotes.find((q) => q.id === quoteId);
     if (!quote || quote.status === 'Converted') return prev;
     let targetCustId = quote.customerId;
     let updatedLeads = prev.leads;
     let updatedCustomers = prev.customers;

     if (String(targetCustId).startsWith('LD-')) {
       const lead = prev.leads.find((l) => l.id === targetCustId);
       if (lead) {
         targetCustId = generateNextCustomerCode(prev.customers);
         updatedLeads = prev.leads.filter((l) => l.id !== lead.id);
         updatedCustomers = [
           {
             id: targetCustId,
             name: lead.company,
             email: lead.email,
             phone: lead.phone,
             location: lead.location,
             billingAddress: lead.location,
             shippingAddress: lead.location,
             taxId: '',
             paymentTerms: quote.paymentTerms || 'Net 30',
             discountTier: 0,
           },
           ...prev.customers,
         ];
       }
     }

     const soId = `SO-${2081 + prev.salesOrders.length}`;
     const dnId = `DN-${401 + prev.deliveryNotes.length}`;
     const today = new Date().toISOString().slice(0, 10);
     return {
       ...prev,
       leads: updatedLeads,
       customers: updatedCustomers,
       quotes: prev.quotes.map((q) =>
         q.id === quoteId
           ? { ...q, customerId: targetCustId, status: 'Converted', convertedOrderId: soId }
           : q
       ),
       salesOrders: [
         {
           id: soId,
           customerId: targetCustId,
           date: today,
           location: 'Main Warehouse',
           fulfillmentStatus: 'To Pick',
           invoiced: false,
           invoiceId: null,
           discountPct: quote.discountPct,
           items: quote.items,
         },
         ...prev.salesOrders,
       ],
       deliveryNotes: [
         {
           id: dnId,
           orderId: soId,
           customerId: targetCustId,
           date: today,
           location: 'Main Warehouse',
           status: 'To Pick',
           tracking: '',
           items: quote.items,
         },
         ...prev.deliveryNotes,
       ],
     };
   });
   notify(`Quote ${quoteId} converted to Sales Order!`);
 };

 const convertQuoteToInvoice = (quoteId) => {
   const quote = state.quotes.find((q) => q.id === quoteId);
   if (!quote) return null;
   let targetCustId = quote.customerId;
   if (String(targetCustId).startsWith('LD-')) {
     const lead = state.leads.find((l) => l.id === targetCustId);
     if (lead) {
       targetCustId = addCustomer({
         name: lead.company,
         email: lead.email,
         phone: lead.phone,
         billingAddress: lead.location,
         paymentTerms: quote.paymentTerms || 'Due on receipt',
       });
     }
   }
   const createdInv = createInvoice({
     customerId: targetCustId,
     recipient: quote.recipient || 'None',
     billingAddress: quote.billingAddress || '',
     paymentTerms: quote.paymentTerms || 'Due on receipt',
     discountRate: Number(quote.discountRate ?? quote.discountPct) || 0,
     documentNote: quote.documentNote || '',
     deliveryDate: quote.deliveryDate || '',
     deliveryContact: quote.deliveryContact || '',
     deliveryAddress: quote.deliveryAddress || '',
     poNumber: quote.poNumber || '',
     project: quote.project || '',
     items: (quote.items || []).map((line) => ({ ...line })),
   });
   if (createdInv) {
     updateQuote(quoteId, { status: 'Converted', convertedInvoiceId: createdInv.id });
   }
   return createdInv;
 };

    const createSalesOrder = ({ customerId, location = 'Main Warehouse', items, discountPct = 0 }) => {
      commitState((prev) => {
        const soId = `SO-${2081 + prev.salesOrders.length}`;
        const dnId = `DN-${401 + prev.deliveryNotes.length}`;
        const today = new Date().toISOString().slice(0, 10);
        return {
          ...prev,
          salesOrders: [
            {
              id: soId,
              customerId,
              date: today,
              location,
              fulfillmentStatus: 'To Pick',
              invoiced: false,
              invoiceId: null,
              discountPct: Number(discountPct) || 0,
              items,
            },
            ...prev.salesOrders,
          ],
          deliveryNotes: [
            {
              id: dnId,
              orderId: soId,
              customerId,
              date: today,
              location,
              status: 'To Pick',
              tracking: '',
              items,
            },
            ...prev.deliveryNotes,
          ],
        };
      });
      notify('Sales Order created & stock reserved.');
    };

    const advanceFulfillment = (orderId, targetStatus) => {
      commitState((prev) => {
        const so = prev.salesOrders.find((o) => o.id === orderId);
        if (!so || so.fulfillmentStatus === targetStatus) return prev;
        let updatedProducts = prev.products;
        let updatedJE = prev.journalEntries;

        const wasCommitted = so.fulfillmentStatus === 'To Pick' || so.fulfillmentStatus === 'Packed';
        const nowShipped = targetStatus === 'Shipped' || targetStatus === 'Delivered';

        if (wasCommitted && nowShipped) {
          let totalCogs = 0;
          updatedProducts = prev.products.map((p) => {
            const line = so.items.find((i) => i.productId === p.id);
            if (!line) return p;
            totalCogs += line.qty * p.cost;
            const loc = so.location || 'Main Warehouse';
            return {
              ...p,
              stockByLocation: {
                ...p.stockByLocation,
                [loc]: Math.max(0, (p.stockByLocation[loc] || 0) - line.qty),
              },
            };
          });
          totalCogs = Number(totalCogs.toFixed(2));
          if (totalCogs > 0) {
            updatedJE = createJournalEntry(prev, {
              ref: so.id,
              description: `Fulfillment Shipped (${so.id}) — Cost of Goods Sold`,
              lines: [
                { accountCode: '5000', debit: totalCogs, credit: 0 },
                { accountCode: '1200', debit: 0, credit: totalCogs },
              ],
            });
          }
        }

        return {
          ...prev,
          products: updatedProducts,
          journalEntries: updatedJE,
          salesOrders: prev.salesOrders.map((o) => (o.id === orderId ? { ...o, fulfillmentStatus: targetStatus } : o)),
          deliveryNotes: prev.deliveryNotes.map((dn) =>
            dn.orderId === orderId
              ? {
                  ...dn,
                  status: targetStatus,
                  tracking: targetStatus === 'Shipped' && !dn.tracking ? `AWB-${Math.floor(100000000 + Math.random() * 899999999)}` : dn.tracking,
                }
              : dn
          ),
        };
      });
      notify(`Order ${orderId} updated to ${targetStatus}.`);
    };

    const formatDocNumber = (rule, fallbackPrefix, fallbackSeq) => {
  const prefix = rule?.prefix ?? fallbackPrefix;
  const nextNum = Number(rule?.nextNumber) || fallbackSeq;
  const digits = Number(rule?.digits ?? rule?.padding) || 4;
  return `${prefix}${String(nextNum).padStart(digits, '0')}`;
};

    const createInvoice = (payload) => {
      const rule = state.company?.autoNumbering?.invoice || {
        prefix: 'CINV-',
        nextNumber: 1 + state.invoices.length,
        digits: 3,
      };
      const docCode = payload.code?.trim()
        ? payload.code.trim()
        : formatDocNumber(rule, 'CINV-', 1 + state.invoices.length);
      const docDisc = Number(payload.discountRate ?? payload.discountPct) || 0;
      const totals = calcDocTotals(payload.items || [], state.products, docDisc);
      const today = new Date().toISOString().slice(0, 10);
      const invDate = payload.date || today;
      const terms = payload.paymentTerms || 'Due on receipt';
      const isReceipt = Boolean(payload.isSalesReceipt);
      const isSettled = isReceipt || payload.status === 'Paid';
      const isDraft = payload.status === 'Draft';
      const cust = state.customers.find((c) => c.id === payload.customerId);

      const newInvoice = {
        ...payload,
        id: docCode,
        number: docCode,
        date: invDate,
        paymentTerms: terms,
        dueDate: payload.dueDate || (isReceipt ? invDate : computeDueDateFromTerms(invDate, terms)),
        status: isDraft ? 'Draft' : isSettled ? 'Paid' : 'Open',
        recipient: payload.recipient || 'None',
        billingAddress: payload.billingAddress ?? cust?.location ?? '',
        discountPct: docDisc,
        discountRate: docDisc,
        discountAmount: totals.discountAmount,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        total: totals.total,
        amountPaid: isSettled ? totals.total : (Number(payload.amountPaid) || 0),
        documentNote: payload.documentNote || '',
        deliveryDate: payload.deliveryDate || '',
        deliveryContact: payload.deliveryContact || '',
        deliveryAddress: payload.deliveryAddress ?? cust?.shippingAddress ?? cust?.location ?? '',
        poNumber: payload.poNumber || '',
        project: payload.project || '',
        privateNote: payload.privateNote || '',
        attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
        sentDate: payload.sentDate || '',
      };

      commitState((prev) => {
        const updatedJE = isDraft
          ? prev.journalEntries
          : createJournalEntry(prev, {
              ref: docCode,
              description: `${isReceipt ? 'Sales Receipt' : 'Invoice'} ${docCode} — ${cust?.name || payload.customerId}`,
              date: invDate,
              lines: [
                { accountCode: isSettled ? '1000' : '1100', debit: totals.total, credit: 0 },
                { accountCode: '4000', debit: 0, credit: totals.discountedSubtotal },
                { accountCode: '2100', debit: 0, credit: totals.taxTotal },
              ],
            });

        const updatedPayments =
          isSettled && totals.total > 0
            ? [
                {
                  id: `PAY-${701 + prev.paymentsReceived.length}`,
                  invoiceId: docCode,
                  customerId: payload.customerId,
                  date: invDate,
                  method: isReceipt ? 'Sales Receipt' : 'Bank Transfer',
                  amount: totals.total,
                  reference: docCode,
                  bankAccount: '1000 Checking Account',
                },
                ...prev.paymentsReceived,
              ]
            : prev.paymentsReceived;

        return {
          ...prev,
          invoices: [newInvoice, ...prev.invoices],
          paymentsReceived: updatedPayments,
          salesOrders: payload.orderId
            ? prev.salesOrders.map((o) => (o.id === payload.orderId ? { ...o, invoiced: true, invoiceId: docCode } : o))
            : prev.salesOrders,
          journalEntries: updatedJE,
          company: {
            ...prev.company,
            autoNumbering: {
              ...prev.company?.autoNumbering,
              invoice: {
                ...rule,
                nextNumber: (Number(rule.nextNumber) || 1) + 1,
              },
            },
          },
        };
      });
      notify(`${isReceipt ? 'Sales Receipt' : 'Invoice'} ${docCode} saved.`);
      return newInvoice;
    };

    const updateInvoice = (invoiceId, updates) => {
      commitState((prev) => {
        const existing = prev.invoices.find((i) => i.id === invoiceId);
        if (!existing) return prev;

        const merged = { ...existing, ...updates };
        const docDisc = Number(merged.discountRate ?? merged.discountPct) || 0;
        const totals = calcDocTotals(merged.items || [], prev.products, docDisc);
        const dueDate =
          updates.dueDate ||
          computeDueDateFromTerms(merged.date, merged.paymentTerms || 'Due on receipt');

        let amountPaid = Number(merged.amountPaid) || 0;
        let status = merged.status;

        if (status === 'Paid' && amountPaid < totals.total) {
          amountPaid = totals.total;
        } else if (status === 'Open' && amountPaid >= totals.total && totals.total > 0) {
          status = 'Paid';
        }

        const cust = prev.customers.find((c) => c.id === merged.customerId);
        const newlySettled = existing.status !== 'Paid' && status === 'Paid' && totals.total > 0;
        const diffPaid = Math.max(0, Number((amountPaid - (Number(existing.amountPaid) || 0)).toFixed(2)));

        let updatedPayments = prev.paymentsReceived;
        let updatedJE = prev.journalEntries;

        if (newlySettled && diffPaid > 0) {
          const payId = `PAY-${701 + prev.paymentsReceived.length}`;
          updatedPayments = [
            {
              id: payId,
              invoiceId,
              customerId: merged.customerId,
              date: new Date().toISOString().slice(0, 10),
              method: 'Bank Transfer',
              amount: diffPaid,
              reference: invoiceId,
              bankAccount: '1000 Checking Account',
            },
            ...prev.paymentsReceived,
          ];
          updatedJE = createJournalEntry(prev, {
            ref: `${payId} / ${invoiceId}`,
            description: `Invoice Settled — ${cust?.name || merged.customerId}`,
            lines: [
              { accountCode: '1000', debit: diffPaid, credit: 0 },
              { accountCode: '1100', debit: 0, credit: diffPaid },
            ],
          });
        }

        const updatedInv = {
          ...merged,
          dueDate,
          status,
          discountPct: docDisc,
          discountRate: docDisc,
          discountAmount: totals.discountAmount,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          amountPaid,
        };

        return {
          ...prev,
          invoices: prev.invoices.map((i) => (i.id === invoiceId ? updatedInv : i)),
          paymentsReceived: updatedPayments,
          journalEntries: updatedJE,
        };
      });
      notify(`Invoice ${invoiceId} updated.`);
    };

    const cancelInvoice = (invoiceId) => {
      commitState((prev) => {
        const inv = prev.invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === 'Cancelled') return prev;
        const openBal = Math.max(0, Number(((inv.total || 0) - (inv.amountPaid || 0)).toFixed(2)));
        const updatedJE =
          openBal > 0 && inv.status !== 'Draft'
            ? createJournalEntry(prev, {
                ref: `CANCEL-${inv.id}`,
                description: `Invoice Cancelled (${inv.id})`,
                lines: [
                  { accountCode: '4000', debit: Number(inv.subtotal || openBal), credit: 0 },
                  { accountCode: '2100', debit: Number(inv.taxTotal || 0), credit: 0 },
                  { accountCode: '1100', debit: 0, credit: Number(inv.total || openBal) },
                ],
              })
            : prev.journalEntries;

        return {
          ...prev,
          invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'Cancelled' } : i)),
          journalEntries: updatedJE,
        };
      });
      notify(`Invoice ${invoiceId} cancelled.`);
    };

    const duplicateInvoice = (invoiceId) => {
      const src = state.invoices.find((i) => i.id === invoiceId);
      if (!src) return null;
      const today = new Date().toISOString().slice(0, 10);
      return createInvoice({
        ...src,
        id: undefined,
        number: undefined,
        code: undefined,
        date: today,
        dueDate: computeDueDateFromTerms(today, src.paymentTerms || 'Due on receipt'),
        status: 'Open',
        amountPaid: 0,
        sentDate: '',
        items: (src.items || []).map((line) => ({ ...line })),
      });
    };

    const deleteInvoice = (invoiceId) => {
      commitState((prev) => ({
        ...prev,
        invoices: prev.invoices.filter((i) => i.id !== invoiceId),
      }));
      notify(`Invoice ${invoiceId} deleted.`);
    };

    const markInvoiceSent = (invoiceId) => {
      const today = new Date().toISOString().slice(0, 10);
      commitState((prev) => ({
        ...prev,
        invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, sentDate: today } : i)),
      }));
      notify(`Invoice ${invoiceId} emailed to customer.`);
    };

    const convertDeliveryNoteToInvoice = (dnId) => {
      const dn = state.deliveryNotes.find((d) => d.id === dnId);
      if (!dn) return null;
      return createInvoice({
        customerId: dn.customerId,
        orderId: dn.orderId || null,
        items: dn.items || [],
        discountPct: 0,
      });
    };

    const createSalesReceipt = (payload) => {
      createInvoice({ ...payload, isSalesReceipt: true });
    };

    const recordInvoicePayment = ({
      invoiceId,
      amount,
      date,
      method = 'Bank Transfer',
      bankReference = '',
      bankAccount = '1000 Checking Account',
    }) => {
      const payAmt = Number(amount);
      if (payAmt <= 0) return;
      commitState((prev) => {
        const inv = prev.invoices.find((i) => i.id === invoiceId);
        if (!inv) return prev;
        const applied = Math.min(payAmt, Number((inv.total - inv.amountPaid).toFixed(2)));
        if (applied <= 0) return prev;
        const newPaid = Number((inv.amountPaid + applied).toFixed(2));
        const newStatus = newPaid >= inv.total - 0.01 ? 'Paid' : inv.status;
        const payId = `PAY-${701 + prev.paymentsReceived.length}`;
        const payDate = date || new Date().toISOString().slice(0, 10);
        const cust = prev.customers.find((c) => c.id === inv.customerId);

        const updatedJE = createJournalEntry(prev, {
          ref: `${payId} / ${invoiceId}`,
          description: `Payment Received from ${cust ? cust.name : inv.customerId}`,
          date: payDate,
          lines: [
            { accountCode: '1000', debit: applied, credit: 0 },
            { accountCode: '1100', debit: 0, credit: applied },
          ],
        });

        return {
          ...prev,
          invoices: prev.invoices.map((i) =>
            i.id === invoiceId ? { ...i, amountPaid: newPaid, status: newStatus } : i
          ),
          paymentsReceived: [
            {
              id: payId,
              invoiceId,
              customerId: inv.customerId,
              date: payDate,
              method,
              amount: applied,
              reference: bankReference || `PMT-${Math.floor(100000 + Math.random() * 900000)}`,
              bankAccount,
            },
            ...prev.paymentsReceived,
          ],
          journalEntries: updatedJE,
        };
      });
      notify('Payment recorded.');
    };

    const issueCreditNote = (invoiceOrId) => {
      const invoiceId = typeof invoiceOrId === 'string' ? invoiceOrId : invoiceOrId?.id;
      if (!invoiceId) return;
      commitState((prev) => {
        const inv = prev.invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === 'Credited') return prev;
        const cust = prev.customers.find((c) => c.id === inv.customerId);
        const updatedProducts = prev.products.map((prod) => {
          const line = (inv.items || []).find((l) => l.productId === prod.id);
          if (!line) return prod;
          return {
            ...prod,
            stockByLocation: {
              ...prod.stockByLocation,
              'Main Warehouse': (prod.stockByLocation['Main Warehouse'] || 0) + (Number(line.qty) || 0),
            },
          };
        });
        const updatedJE = createJournalEntry(prev, {
          ref: `CN-${inv.id}`,
          description: `Credit Note Issued — ${cust?.name || inv.customerId}`,
          lines: [
            { accountCode: '4000', debit: Number(inv.discountedSubtotal ?? inv.subtotal ?? 0), credit: 0 },
            { accountCode: '2100', debit: Number(inv.taxTotal || 0), credit: 0 },
            { accountCode: '1100', debit: 0, credit: Number(inv.total || 0) },
          ],
        });
        return {
          ...prev,
          products: updatedProducts,
          invoices: prev.invoices.map((i) => (i.id === invoiceId ? { ...i, status: 'Credited' } : i)),
          journalEntries: updatedJE,
        };
      });
      notify(`Credit note CN-${invoiceId} issued.`);
    };

  const createPurchaseOrder = (payload) => {
      const fallbackSeq = 501 + (state?.purchaseOrders?.length || 0);
      const rule = state?.company?.autoNumbering?.purchase_order || {
        prefix: 'PO-',
        nextNumber: fallbackSeq,
        digits: 3,
      };
      const poCode = formatDocNumber(rule, 'PO-', fallbackSeq);

      const newPO = {
        ...payload,
        id: poCode,
        number: poCode,
        status: payload.status || 'Ordered',
        date: payload.date || new Date().toISOString().slice(0, 10),
      };

      commitState((prev) => ({
        ...prev,
        purchaseOrders: [newPO, ...(prev.purchaseOrders || [])],
        company: {
          ...prev.company,
          autoNumbering: {
            ...prev.company?.autoNumbering,
            purchase_order: {
              ...rule,
              nextNumber: (Number(rule.nextNumber) || 501) + 1,
            },
          },
        },
      }));
      notify(`Purchase Order ${poCode} created.`);
      return newPO;
    };

    const generateAutoReplenishmentPOs = (vendorGroups) => {
      commitState((prev) => {
        let currentPOs = [...prev.purchaseOrders];
        let seq = 501 + currentPOs.length;
        vendorGroups.forEach((group) => {
          const validItems = group.items.filter((i) => Number(i.orderQty) > 0);
          if (validItems.length === 0) return;
          currentPOs.unshift({
            id: `PO-${seq++}`,
            vendorId: group.vendorId,
            date: new Date().toISOString().slice(0, 10),
            expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            status: 'Sent',
            billId: null,
            items: validItems.map((i) => ({ productId: i.productId, qty: Number(i.orderQty), receivedQty: 0, unitCost: Number(i.unitCost) })),
          });
        });
        return { ...prev, purchaseOrders: currentPOs };
      });
      notify(`Generated & sent ${vendorGroups.length} Purchase Order(s)!`);
    };

    const receivePurchaseOrder = ({ poId, location = 'Main Warehouse', receivedLines }) => {
      commitState((prev) => {
        const po = prev.purchaseOrders.find((p) => p.id === poId);
        if (!po) return prev;
        const updatedProducts = prev.products.map((prod) => {
          const recLine = receivedLines.find((r) => r.productId === prod.id);
          if (!recLine || recLine.qtyToReceive <= 0) return prod;
          return {
            ...prod,
            stockByLocation: {
              ...prod.stockByLocation,
              [location]: (prod.stockByLocation[location] || 0) + Number(recLine.qtyToReceive),
            },
          };
        });
        const updatedItems = po.items.map((item) => {
          const recLine = receivedLines.find((r) => r.productId === item.productId);
          const addQty = recLine ? Number(recLine.qtyToReceive) : 0;
          return { ...item, receivedQty: Math.min(item.qty, item.receivedQty + addQty) };
        });
        const allReceived = updatedItems.every((i) => i.receivedQty >= i.qty);
        const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
        const newStatus = allReceived ? 'Received' : anyReceived ? 'Partially Received' : po.status;
        const rcvEntry = {
          id: `RCV-${201 + prev.receivingLog.length}`,
          date: new Date().toISOString().slice(0, 10),
          poId: po.id,
          vendorId: po.vendorId,
          location,
          items: receivedLines.filter((r) => r.qtyToReceive > 0).map((r) => ({ productId: r.productId, qty: Number(r.qtyToReceive) })),
          notes: `Received into ${location}`,
        };
        return {
          ...prev,
          products: updatedProducts,
          purchaseOrders: prev.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: newStatus, items: updatedItems } : p)),
          receivingLog: [rcvEntry, ...prev.receivingLog],
        };
      });
      notify(`Items received into ${location} & live stock updated.`);
    };

    const convertPOToBill = (poId) => {
      commitState((prev) => {
        const po = prev.purchaseOrders.find((p) => p.id === poId);
        if (!po || po.billId) return prev;
        const billTotal = Number(po.items.reduce((sum, item) => sum + (item.receivedQty || item.qty) * item.unitCost, 0).toFixed(2));
        const billId = `BILL-${801 + prev.vendorBills.length}`;
        const vendor = prev.vendors.find((v) => v.id === po.vendorId);
        const updatedJE = createJournalEntry(prev, {
          ref: `${billId} / ${po.id}`,
          description: `Supplier Bill Posted (${vendor ? vendor.name : po.vendorId})`,
          lines: [
            { accountCode: '1200', debit: billTotal, credit: 0 },
            { accountCode: '2000', debit: 0, credit: billTotal },
          ],
        });
        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((p) => (p.id === poId ? { ...p, status: 'Billed', billId } : p)),
          vendorBills: [
            {
              id: billId,
              poId: po.id,
              vendorId: po.vendorId,
              date: new Date().toISOString().slice(0, 10),
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              status: 'Open',
              total: billTotal,
              amountPaid: 0,
              description: `Supplier Bill from ${po.id}`,
            },
            ...prev.vendorBills,
          ],
          journalEntries: updatedJE,
        };
      });
      notify(`PO ${poId} converted to Bill.`);
    };

    const payVendorBill = (billId) => {
      commitState((prev) => {
        const bill = prev.vendorBills.find((b) => b.id === billId);
        if (!bill || bill.status === 'Paid') return prev;
        const balance = Number((bill.total - bill.amountPaid).toFixed(2));
        const vendor = prev.vendors.find((v) => v.id === bill.vendorId);
        const updatedJE = createJournalEntry(prev, {
          ref: bill.id,
          description: `Supplier Bill Paid (${vendor ? vendor.name : bill.vendorId})`,
          lines: [
            { accountCode: '2000', debit: balance, credit: 0 },
            { accountCode: '1000', debit: 0, credit: balance },
          ],
        });
        return {
          ...prev,
          vendorBills: prev.vendorBills.map((b) => (b.id === billId ? { ...b, status: 'Paid', amountPaid: b.total } : b)),
          journalEntries: updatedJE,
        };
      });
      notify(`Bill ${billId} paid.`);
    };

    const createExpense = ({ vendorName, category, amount, method = 'Business Debit Card', notes = '' }) => {
      const amt = Number(amount);
      if (amt <= 0) return;
      commitState((prev) => {
        const expId = `EXP-${901 + prev.expenses.length}`;
        const updatedJE = createJournalEntry(prev, {
          ref: expId,
          description: `Expense Recorded: ${vendorName} (${category})`,
          lines: [
            { accountCode: '6100', debit: amt, credit: 0 },
            { accountCode: '1000', debit: 0, credit: amt },
          ],
        });
        return {
          ...prev,
          expenses: [
            { id: expId, date: new Date().toISOString().slice(0, 10), vendorName, category, amount: amt, method, notes },
            ...prev.expenses,
          ],
          journalEntries: updatedJE,
        };
      });
      notify(`Expense posted to ledger.`);
    };

    const createManualJournalEntry = ({ description, debitAccount, creditAccount, amount }) => {
      const amt = Number(amount);
      if (amt <= 0 || debitAccount === creditAccount) return;
      commitState((prev) => ({
        ...prev,
        journalEntries: createJournalEntry(prev, {
          ref: 'MANUAL-JE',
          description: description || 'Manual Journal Adjustment',
          lines: [
            { accountCode: debitAccount, debit: amt, credit: 0 },
            { accountCode: creditAccount, debit: 0, credit: amt },
          ],
        }),
      }));
      notify('Balanced manual journal entry posted.');
    };

    const reconcileBankTransaction = ({ bankTxId, matchType, matchId, accountCode }) => {
      commitState((prev) => {
        const tx = prev.bankTransactions.find((b) => b.id === bankTxId);
        if (!tx || tx.status === 'Reconciled') return prev;
        let updatedInvoices = prev.invoices;
        let updatedPayments = prev.paymentsReceived;
        let updatedBills = prev.vendorBills;
        let updatedJE = prev.journalEntries;
        const absAmt = Math.abs(tx.amount);

        if (matchType === 'invoice' && matchId) {
          const inv = prev.invoices.find((i) => i.id === matchId);
          if (inv) {
            const payId = `PAY-${701 + prev.paymentsReceived.length}`;
            updatedInvoices = prev.invoices.map((i) => (i.id === matchId ? { ...i, status: 'Paid', amountPaid: i.total } : i));
            updatedPayments = [
              { id: payId, invoiceId: inv.id, customerId: inv.customerId, date: tx.date, method: 'Bank Feed Match', amount: absAmt, reference: tx.id },
              ...prev.paymentsReceived,
            ];
            updatedJE = createJournalEntry(prev, {
              ref: `${tx.id} ↔ ${inv.id}`,
              description: `Bank Feed Matched to Customer Invoice ${inv.id}`,
              date: tx.date,
              lines: [
                { accountCode: '1000', debit: absAmt, credit: 0 },
                { accountCode: '1100', debit: 0, credit: absAmt },
              ],
            });
          }
        } else if (matchType === 'bill' && matchId) {
          const bill = prev.vendorBills.find((b) => b.id === matchId);
          if (bill) {
            updatedBills = prev.vendorBills.map((b) => (b.id === matchId ? { ...b, status: 'Paid', amountPaid: b.total } : b));
            updatedJE = createJournalEntry(prev, {
              ref: `${tx.id} ↔ ${bill.id}`,
              description: `Bank Feed Matched to Supplier Bill ${bill.id}`,
              date: tx.date,
              lines: [
                { accountCode: '2000', debit: absAmt, credit: 0 },
                { accountCode: '1000', debit: 0, credit: absAmt },
              ],
            });
          }
        } else {
          const code = accountCode || (tx.amount > 0 ? '4000' : '6100');
          const lines =
            tx.amount > 0
              ? [
                  { accountCode: '1000', debit: absAmt, credit: 0 },
                  { accountCode: code, debit: 0, credit: absAmt },
                ]
              : [
                  { accountCode: code, debit: absAmt, credit: 0 },
                  { accountCode: '1000', debit: 0, credit: absAmt },
                ];
          updatedJE = createJournalEntry(prev, {
            ref: tx.id,
            description: `Bank Feed Categorized: ${tx.description}`,
            date: tx.date,
            lines,
          });
        }

        return {
          ...prev,
          invoices: updatedInvoices,
          paymentsReceived: updatedPayments,
          vendorBills: updatedBills,
          journalEntries: updatedJE,
          bankTransactions: prev.bankTransactions.map((b) => (b.id === bankTxId ? { ...b, status: 'Reconciled' } : b)),
        };
      });
      notify(`Bank transaction ${bankTxId} validated & reconciled!`);
    };

    const toggleIntegration = (id) => {
      commitState((prev) => ({
        ...prev,
        integrations: prev.integrations.map((intg) =>
          intg.id === id ? { ...intg, connected: !intg.connected, lastSync: !intg.connected ? 'Just now' : 'Paused' } : intg
        ),
      }));
      notify('App connection updated.');
    };

    const triggerChannelSync = () => {
      if (!state?.products || state.products.length === 0) {
        notify('Add at least one product before syncing channels.', 'error');
        return;
      }

      const nowIso = new Date().toISOString();
      const connectedNames = (state.integrations || [])
        .filter((i) => i.connected)
        .map((i) => i.name);

      commitState((prev) => ({
        ...prev,
        products: prev.products.map((p) => ({
          ...p,
          lastSyncedAt: nowIso,
        })),
        integrations: (prev.integrations || []).map((intg) =>
          intg.connected
            ? {
                ...intg,
                lastSync: 'Just now',
                ordersSynced: (Number(intg.ordersSynced) || 0) + 1,
              }
            : intg
        ),
        syncLogs: [
          {
            id: `SYNC-${101 + (prev.syncLogs?.length || 0)}`,
            date: nowIso.slice(0, 10),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: connectedNames.length > 0 ? connectedNames.join(', ') : 'All Sales Channels',
            status: 'Success',
            message: `Synced ${prev.products.length} product(s) & stock levels`,
          },
          ...(prev.syncLogs || []),
        ],
      }));

      notify('Channel synced!');
    };

    return (
      <ERPContext.Provider
        value={{
          state,
          loadingWorkspace,
          syncStatus,
          formatAmount,
          enrichedProducts,
          accountBalances,
          toast,
          notify,
          updateCompany,
          completeOnboarding,
          updateUserSettings,
          resetDemoData,
          inviteTeamUser,
          addEmployee,
          uploadVaultFile,
          addLead,
          convertLeadToCustomer,
          addOpportunity,
          addTask,
          toggleTask,
          addCall,
          addProduct,
          transferStock,
          addCustomer,
          updateCustomer,
          deleteCustomer,
          importCustomers,
          savePriceFamilies,
          addVendor,
          createQuote,
          updateQuote,
          cancelQuote,
          duplicateQuote,
          deleteQuote,
          markQuoteSent,
          convertQuoteToOrder,
          convertQuoteToInvoice,
          createSalesOrder,
          advanceFulfillment,
          createInvoice,
          updateInvoice,
          cancelInvoice,
          duplicateInvoice,
          deleteInvoice,
          markInvoiceSent,
          convertDeliveryNoteToInvoice,
          createSalesReceipt,
          recordInvoicePayment,
          issueCreditNote,
          createPurchaseOrder,
          generateAutoReplenishmentPOs,
          receivePurchaseOrder,
          convertPOToBill,
          payVendorBill,
          createExpense,
          createManualJournalEntry,
          reconcileBankTransaction,
          toggleIntegration,
          triggerChannelSync,
        }}
      >
        {children}
      </ERPContext.Provider>
    );
  }

  const useERP = () => useContext(ERPContext);

  // ============================================================================
  // 2B. CLEAN SIGN-IN / SIGN-UP SCREEN (ALL 30-DAY TRIAL TEXT REMOVED)
  // ============================================================================

  function AuthScreen({ onEnterDemo }) {
    const [mode, setMode] = useState('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleGoogleSignIn = async () => {
      setError('');
      setBusy(true);
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      } catch (err) {
        if (
          err.code === 'auth/unauthorized-domain' ||
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/invalid-api-key'
        ) {
          try {
            await signInAnonymously(auth);
          } catch {
            onEnterDemo();
          }
        } else if (err.code !== 'auth/popup-closed-by-user') {
          setError(err.message?.replace('Firebase: ', '') || 'Unable to sign in with Google.');
        }
      } finally {
        setBusy(false);
      }
    };

    const handleEmailSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setBusy(true);
      try {
        if (mode === 'signup') {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          if (fullName.trim()) {
            await updateProfile(cred.user, { displayName: fullName.trim() });
          }
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      } catch (err) {
        setError(err.message?.replace('Firebase: ', '') || 'Authentication failed.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center p-4">
        <div className="w-full max-w-[410px] bg-white border border-gray-200 rounded-[4px] shadow-[0_2px_10px_rgba(0,0,0,0.05)] p-8">
          <div className="text-center mb-6">
            <div className="text-[32px] font-black text-[#E11D48] tracking-[-0.06em] leading-none mb-2">
              IVEN
            </div>
            <h1 className="text-[19px] font-normal text-gray-800">
              {mode === 'login' ? 'Sign in to your workspace' : 'Create your Iven account'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Small Business Invoicing, Inventory & Automated Accounting
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="w-full h-10 bg-white hover:bg-gray-50 border border-gray-300 rounded-[4px] shadow-2xs flex items-center justify-center gap-3 text-[13px] font-medium text-gray-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
              <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-white px-3 text-gray-400">or with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Wendel Crasta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                />
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 mb-1">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wendel@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-10 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-gray-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-[#4285F4] hover:underline font-medium cursor-pointer">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an Iven account?{' '}
                <button onClick={() => setMode('login')} className="text-[#4285F4] hover:underline font-medium cursor-pointer">
                  Sign in
                </button>
              </>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={onEnterDemo}
              className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
            >
              Skip login & launch instant Demo Workspace →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2C. OFFICIAL ONEUP-STYLE NEW LOGIN COMPANY ONBOARDING WIZARD
  // ============================================================================

  function CompanyOnboardingModal() {
    const { state, completeOnboarding } = useERP();
    const [form, setForm] = useState({
      userFullName: state?.company?.userFullName || 'Wendel Crasta',
      companyName: '',
      country: 'India',
      currency: '₹',
      defaultTaxRate: 18,
      fiscalYearStart: 'April',
      address: '',
      taxId: '',
      openingCashBalance: '0',
    });

    useEffect(() => {
      if (state?.company?.userFullName) {
        setForm((prev) => ({ ...prev, userFullName: state.company.userFullName }));
      }
    }, [state?.company?.userFullName]);

    const handleCountryChange = (countryName) => {
      const found = COUNTRY_OPTIONS.find((c) => c.name === countryName);
      setForm((prev) => ({
        ...prev,
        country: countryName,
        currency: found ? found.currency : prev.currency,
        defaultTaxRate: found ? found.taxRate : prev.defaultTaxRate,
        fiscalYearStart: countryName === 'India' ? 'April' : 'January',
      }));
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#F5F6F8] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-[560px] bg-white border border-gray-200 rounded-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-8 my-8">
          <div className="text-center mb-6">
            <div className="text-[28px] font-black text-[#E11D48] tracking-[-0.06em] leading-none mb-2">
              IVEN
            </div>
            <h1 className="text-[21px] font-normal text-gray-800">
              Tell us about your company
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Let's set up your workspace, currency, and accounting defaults before you begin.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              completeOnboarding(form);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Your Full Name *</label>
                <input
                  required
                  value={form.userFullName}
                  onChange={(e) => setForm({ ...form, userFullName: e.target.value })}
                  placeholder="Wendel Crasta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  required
                  autoFocus
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="e.g. Acme Trading Pvt. Ltd."
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Country *</label>
                <select
                  value={form.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Currency *</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.currency}>{c.currency.trim()} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Fiscal Year Start</label>
                <select
                  value={form.fiscalYearStart}
                  onChange={(e) => setForm({ ...form, fiscalYearStart: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                >
                  <option>January</option>
                  <option>April</option>
                  <option>July</option>
                  <option>October</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Company Address *</label>
              <input
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street address, City, State, Postal Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">GSTIN / VAT / Tax ID (Optional)</label>
                <input
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  placeholder="e.g. 29AABCA1234M1Z5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Opening Bank Balance ({form.currency.trim()})</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingCashBalance}
                  onChange={(e) => setForm({ ...form, openingCashBalance: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] focus:outline-none focus:border-[#4285F4]"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer"
              >
                Get Started →
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ONEUP UI PRIMITIVES (SUB-TAB BAR, SEGMENTED ON/OFF SWITCH, MODALS)
  // ============================================================================

  const STATUS_BADGE_MAP = {
    Draft: 'bg-gray-100 text-gray-600 border-gray-200',
    Sent: 'bg-sky-50 text-sky-700 border-sky-200',
    Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'To Pick': 'bg-amber-50 text-amber-700 border-amber-200',
    Packed: 'bg-blue-50 text-blue-700 border-blue-200',
    Shipped: 'bg-purple-50 text-purple-700 border-purple-200',
    Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Partially Received': 'bg-amber-50 text-amber-700 border-amber-200',
    Received: 'bg-teal-50 text-teal-700 border-teal-200',
    Billed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Open: 'bg-amber-50 text-amber-700 border-amber-200',
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
    Credited: 'bg-gray-100 text-gray-600 border-gray-200',
    'Low Stock': 'bg-rose-50 text-rose-700 border-rose-200',
    'In Stock': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Unreconciled: 'bg-amber-50 text-amber-700 border-amber-200',
    Reconciled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Warning: 'bg-amber-50 text-amber-700 border-amber-200',
    Qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    New: 'bg-blue-50 text-blue-700 border-blue-200',
    Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  function StatusBadge({ status }) {
    const cls = STATUS_BADGE_MAP[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${cls}`}>
        {status}
      </span>
    );
  }

  // Exact OneUp Segmented [ On | Off ] Switch
  function OneUpOnOffToggle({ value, onChange }) {
    return (
      <div className="inline-flex border border-gray-300 rounded-[3px] overflow-hidden text-xs shrink-0">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3.5 py-1.5 transition-colors cursor-pointer ${
            value ? 'bg-[#4285F4] text-white font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          On
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3.5 py-1.5 border-l border-gray-300 transition-colors cursor-pointer ${
            !value ? 'bg-[#4285F4] text-white font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          Off
        </button>
      </div>
    );
  }

  function OneUpSubTabBar({ tabs, moreTabs = [], activeTab, onSelect, accentColor = '#3B82F6', rightActions = null }) {
    const [moreOpen, setMoreOpen] = useState(false);
    const isMoreActive = moreTabs.some((m) => m.id === activeTab);

    return (
      <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between min-h-[46px] relative">
        <div className="w-16 hidden md:block" />
        <div className="flex items-center justify-center gap-7 flex-wrap mx-auto">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelect(tab.id)}
                className={`relative py-3 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  active ? 'font-semibold text-gray-900' : 'font-normal text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-700 font-semibold">
                    {tab.badge}
                  </span>
                )}
                {active && (
                  <span
                    style={{ backgroundColor: accentColor }}
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t"
                  />
                )}
              </button>
            );
          })}

          {moreTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={`relative py-3 text-[13px] flex items-center gap-1 transition-colors cursor-pointer ${
                  isMoreActive ? 'font-semibold text-gray-900' : 'font-normal text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5" />
                {isMoreActive && (
                  <span
                    style={{ backgroundColor: accentColor }}
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t"
                  />
                )}
              </button>
              {moreOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md border border-gray-200 shadow-lg py-1 z-40 text-xs">
                    {moreTabs.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelect(m.id);
                          setMoreOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center justify-between ${
                          activeTab === m.id ? 'font-semibold text-blue-600 bg-blue-50/40' : 'text-gray-700'
                        }`}
                      >
                        <span>{m.label}</span>
                        {m.badge > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
                            {m.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">{rightActions}</div>
      </div>
    );
  }

  function OneUpPageHeader({ title, primaryButtonLabel, onPrimaryClick, secondaryActions = [] }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[22px] font-normal text-gray-800 tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {primaryButtonLabel && (
            <button
              onClick={onPrimaryClick}
              className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer"
            >
              {primaryButtonLabel}
            </button>
          )}
          {secondaryActions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 bg-white border border-gray-200 hover:bg-gray-50 rounded-[4px] flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-md border border-gray-200 shadow-lg py-1 z-40 text-xs">
                    {secondaryActions.map((act, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setMenuOpen(false);
                          act.onClick();
                        }}
                        className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  function Modal({ open, onClose, title, subtitle, maxWidth = 'max-w-xl', children }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
        <div className={`bg-white rounded-md border border-gray-200 shadow-xl w-full ${maxWidth} overflow-hidden my-8`}>
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. HOME VIEW (CLEAN ONEUP APP LAUNCHER — SIDE MESSAGE/TIPS BOX REMOVED)
  // ============================================================================

  function HomeView({ navigate, globalQuery, setGlobalQuery }) {
    const { state } = useERP();
    const QUICK_ACTIONS = [
    { label: 'New Opportunity / Lead', module: 'opportunities', keywords: 'deal crm prospect' },
    { label: 'New Invoice or Quote', module: 'sales', keywords: 'bill customer estimate' },
    { label: 'New Purchase Order', module: 'purchasing', keywords: 'supplier vendor buy' },
    { label: 'Manage Products & Stock', module: 'inventory', keywords: 'item sku warehouse' },
    { label: 'Accounting & Journal Entries', module: 'accounting', keywords: 'ledger expense bank' },
    { label: 'View Financial Reports', module: 'reports', keywords: 'pnl balance sheet trial' },
  ];

  const trimmedQuery = (globalQuery || '').trim().toLowerCase();
  const filteredActions = trimmedQuery
    ? QUICK_ACTIONS.filter(
        (a) => a.label.toLowerCase().includes(trimmedQuery) || a.keywords.includes(trimmedQuery)
      )
    : [];

  const runQuickAction = (action) => {
    navigate(action.module);
    setGlobalQuery('');
  };

    const tiles = [
      { id: 'opportunities', label: 'Opportunities', icon: MessageSquare, bg: '#62D835' },
      { id: 'sales', label: 'Sales', icon: FileSpreadsheet, bg: '#00BFA5' },
      { id: 'purchasing', label: 'Purchasing', icon: Receipt, bg: '#03A9F4' },
      { id: 'inventory', label: 'Inventory', icon: Package, bg: '#F59E0B' },
      { id: 'accounting', label: 'Accounting', icon: PieChart, bg: '#7C3AED' },
      { id: 'reports', label: 'Reports', icon: BookOpen, bg: '#F43F5E' },
    ];

    return (
      <div className="max-w-[760px] mx-auto px-6 pt-10 pb-8">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-normal text-gray-700 tracking-tight mb-5">
            {(() => {
              const hr = new Date().getHours();
              const greeting = hr < 12 ? 'Good Morning' : hr < 18 ? 'Good Afternoon' : 'Good Evening';
              return `${greeting} ${state.company.userFirstName}!`;
            })()}
          </h1>

          <div className="relative max-w-[440px] mx-auto">
          <div className="bg-white border border-gray-200 rounded-[4px] shadow-xs flex items-center px-3.5 py-2.5">
            <Search className="w-4 h-4 text-gray-400 mr-3 shrink-0" />
            <input
              value={globalQuery}
              onChange={(e) => setGlobalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredActions.length > 0) {
                  runQuickAction(filteredActions[0]);
                }
              }}
              placeholder="What do you want to do?"
              className="w-full text-[13.5px] text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
            />
          </div>

          {filteredActions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[4px] shadow-lg z-30 divide-y divide-gray-100 text-left">
              {filteredActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => runQuickAction(action)}
                  className="w-full px-3.5 py-2.5 text-[13px] hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-700">{action.label}</span>
                  <span className="text-[11px] uppercase text-gray-400">{action.module}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        </div>

        <div>
          <h2 className="text-[20px] font-normal text-gray-400 mb-4">Apps</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.id}
                  onClick={() => navigate(tile.id)}
                  style={{ backgroundColor: tile.bg }}
                  className="h-[142px] rounded-[4px] shadow-[0_2px_4px_rgba(0,0,0,0.08)] hover:brightness-105 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-3 text-white cursor-pointer"
                >
                  <Icon className="w-10 h-10 stroke-[1.5]" />
                  <span className="text-[14px] font-normal tracking-wide">{tile.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. FULL-PAGE 3-TAB USER SETTINGS VIEW (PROFILE, NOTIFICATIONS, PREFERENCES)
  // ============================================================================

  function UserSettingsView({ firebaseUser, onBack }) {
    const { state, updateCompany, updateUserSettings, notify } = useERP();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile State
    const [fullName, setFullName] = useState(state.company.userFullName || '');
    const [email, setEmail] = useState(firebaseUser?.email || state.company.email || '');
    const [avatarColor, setAvatarColor] = useState(state.company.avatarColor || '#8B5CF6');
    const [photoPreview, setPhotoPreview] = useState(state.userSettings?.profilePhotoDataUrl || firebaseUser?.photoURL || '');
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [pwdBusy, setPwdBusy] = useState(false);

    // Notifications State
    const [notif, setNotif] = useState(state.userSettings.notifications);

    // Preferences State
    const [prefs, setPrefs] = useState(state.userSettings.preferences);

    const handleImageFile = (file) => {
      if (!file) return;
      if (file.size > 1024 * 1024) {
        notify('Image must be less than 1 MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setPhotoPreview(dataUrl);
        updateUserSettings({ profilePhotoDataUrl: dataUrl });
        notify('Profile picture updated.');
      };
      reader.readAsDataURL(file);
    };

    const handleSaveEmail = async (e) => {
      e.preventDefault();
      updateCompany({ email, userFullName: fullName, avatarColor });
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        try {
          await updateProfile(auth.currentUser, { displayName: fullName });
          if (email !== auth.currentUser.email) {
            await updateEmail(auth.currentUser, email);
          }
        } catch (err) {
          console.warn('Firebase Auth email sync:', err.message);
        }
      }
      notify('Profile & email saved.');
    };

    const handleSavePassword = async (e) => {
      e.preventDefault();
      if (newPwd.length < 6) {
        notify('New password must be at least 6 characters.');
        return;
      }
      if (newPwd !== confirmPwd) {
        notify('New password and confirmation do not match.');
        return;
      }
      setPwdBusy(true);
      try {
        if (auth.currentUser && auth.currentUser.email && currentPwd) {
          const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPwd);
          await reauthenticateWithCredential(auth.currentUser, cred);
          await updatePassword(auth.currentUser, newPwd);
          notify('Password updated successfully.');
          setCurrentPwd('');
          setNewPwd('');
          setConfirmPwd('');
        } else {
          notify('Password change requires an Email/Password login session.');
        }
      } catch (err) {
        notify(err.message?.replace('Firebase: ', '') || 'Could not update password.');
      } finally {
        setPwdBusy(false);
      }
    };

    const avatarColors = ['#8B5CF6', '#4285F4', '#00BFA5', '#E11D48', '#F59E0B', '#03A9F4'];

    return (
      <div className="max-w-[920px] mx-auto px-6 pt-7 pb-12">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-xs text-[#4285F4] hover:underline cursor-pointer">
            ← Back to Workspace
          </button>
        </div>

        {/* Main White Card with Centered Top Sub-Tabs (Profile | Notifications | Preferences) */}
        <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-[#FAFAFB] border-b border-gray-200 flex items-center justify-center gap-10">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'preferences', label: 'Preferences' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative py-3.5 text-[13px] transition-colors cursor-pointer ${
                    active ? 'font-semibold text-gray-900' : 'font-normal text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4285F4]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="p-8 space-y-10 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 text-[15px] font-normal text-gray-700">
                  Profile Image
                </div>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleImageFile(e.dataTransfer.files?.[0]);
                  }}
                  className="md:col-span-9 flex flex-col sm:flex-row items-start sm:items-center gap-7"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt={fullName} className="w-24 h-24 rounded-full object-cover border border-gray-200 shrink-0" />
                  ) : (
                    <div
                      style={{ backgroundColor: avatarColor }}
                      className="w-24 h-24 rounded-full text-white text-[28px] font-normal flex items-center justify-center shrink-0"
                    >
                      {getInitials(fullName)}
                    </div>
                  )}

                  <div className="space-y-2 max-w-sm">
                    <div className="text-[13.5px] text-gray-600">You can upload a new profile picture here</div>
                    <p className="text-[11.5px] text-gray-400 leading-relaxed">
                      You can also drag and drop a picture from your computer. Recommended file types: .GIF, .PNG, or .JPG less than 1 MB.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <label className="px-3.5 py-1.5 border border-gray-300 rounded-[3px] text-[#4285F4] hover:bg-gray-50 cursor-pointer inline-block">
                        Change
                        <input
                          type="file"
                          accept=".gif,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => handleImageFile(e.target.files?.[0])}
                        />
                      </label>
                      <div className="flex items-center gap-1.5">
                        {avatarColors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setPhotoPreview('');
                              setAvatarColor(c);
                              updateUserSettings({ profilePhotoDataUrl: '' });
                              updateCompany({ avatarColor: c });
                            }}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full cursor-pointer ${!photoPreview && avatarColor === c ? 'ring-2 ring-offset-1 ring-gray-700' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveEmail} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 text-[15px] font-normal text-gray-700">
                  Change Email
                </div>
                <div className="md:col-span-9 max-w-[360px] space-y-3">
                  <div className="border border-gray-300 rounded-[3px] px-3 py-1.5">
                    <div className="text-[10.5px] text-gray-400">Display Name</div>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-[13px] text-gray-800 focus:outline-none mt-0.5"
                    />
                  </div>
                  <div className="border border-gray-300 rounded-[3px] px-3 py-1.5">
                    <div className="text-[10.5px] text-gray-400">Email</div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-[13px] text-gray-800 focus:outline-none mt-0.5"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    Save Email
                  </button>
                </div>
              </form>

              <form onSubmit={handleSavePassword} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-3 text-[15px] font-normal text-gray-700">
                  Change Password
                </div>
                <div className="md:col-span-9 max-w-[360px] space-y-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-[3px] text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4]"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-[3px] text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4]"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-[3px] text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4]"
                  />
                  <button
                    type="submit"
                    disabled={pwdBusy}
                    className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {pwdBusy ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="p-8 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pb-6 border-b border-gray-200">
                <div className="md:col-span-3 font-semibold text-gray-700 pt-1">
                  Tips and Announcements
                </div>
                <div className="md:col-span-9 space-y-2">
                  <OneUpOnOffToggle
                    value={notif.tipsAndAnnouncements}
                    onChange={(val) => setNotif({ ...notif, tipsAndAnnouncements: val })}
                  />
                  <p className="text-gray-400">Getting started, tips and features presentation.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-3 font-semibold text-gray-700 pt-1">
                  Notifications
                </div>
                <div className="md:col-span-9 space-y-3">
                  <OneUpOnOffToggle
                    value={notif.masterEnabled}
                    onChange={(val) => setNotif({ ...notif, masterEnabled: val })}
                  />
                  <p className="text-gray-500">
                    Enable and disable all email notifications for this user account.{' '}
                    <strong className="text-gray-700">{email}</strong>
                  </p>
                  <div className="bg-[#DDF0FF] border border-[#B8DFFA] rounded-[3px] p-3.5 text-[#1E6091] max-w-xl leading-relaxed">
                    Iven automatically sends you notifications when due dates or expiration dates are approaching. Here you can turn notifications on and off and set when you will be reminded.
                  </div>
                </div>
              </div>

              {[
                { key: 'opportunity', label: 'Opportunity', desc: 'Notify me by email when an opportunity is expiring.', target: 'the expiration date.' },
                { key: 'task', label: 'Task', desc: 'Notify me by email when a task is due.', target: 'the due date.' },
                { key: 'call', label: 'Call', desc: 'Notify me by email when a call is due.', target: 'the due date.' },
                { key: 'customerInvoicePayment', label: 'Customer Invoice Payment', desc: 'Notify me by email when a customer invoice payment is due.', target: 'the due date.' },
              ].map((row) => {
                const rule = notif[row.key];
                return (
                  <div key={row.key} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                    <div className="md:col-span-3 font-semibold text-gray-700 pt-1.5">
                      {row.label}
                    </div>
                    <div className="md:col-span-9 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3 text-gray-600">
                        <OneUpOnOffToggle
                          value={rule.enabled}
                          onChange={(val) =>
                            setNotif({ ...notif, [row.key]: { ...rule, enabled: val } })
                          }
                        />
                        <span>Send</span>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={rule.value}
                          onChange={(e) =>
                            setNotif({ ...notif, [row.key]: { ...rule, value: Number(e.target.value) || 1 } })
                          }
                          className="w-12 text-center border-b border-gray-300 py-1 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                        />
                        <select
                          value={rule.unit}
                          onChange={(e) =>
                            setNotif({ ...notif, [row.key]: { ...rule, unit: e.target.value } })
                          }
                          className="border-b border-gray-300 py-1 pr-2 bg-transparent text-gray-800 focus:outline-none"
                        >
                          <option value="days">days</option>
                          <option value="hours">hours</option>
                        </select>
                        <select
                          value={rule.timing}
                          onChange={(e) =>
                            setNotif({ ...notif, [row.key]: { ...rule, timing: e.target.value } })
                          }
                          className="border-b border-gray-300 py-1 pr-2 bg-transparent text-gray-800 focus:outline-none"
                        >
                          <option value="before">before</option>
                          <option value="after">after</option>
                        </select>
                        <span>{row.target}</span>
                      </div>
                      <p className="text-gray-400">{row.desc}</p>
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3">
                <div className="md:col-span-3" />
                <div className="md:col-span-9">
                  <button
                    type="button"
                    onClick={() => {
                      updateUserSettings({ notifications: notif });
                      notify('Notifications settings saved.');
                    }}
                    className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    Save Notifications Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="p-8 space-y-9 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4 text-[15px] font-normal text-gray-700">
                  Local Settings
                </div>
                <div className="md:col-span-8 max-w-[420px] space-y-5">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Date format</label>
                    <select
                      value={prefs.dateFormat}
                      onChange={(e) => setPrefs({ ...prefs, dateFormat: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 bg-transparent text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    >
                      <option value="25/12/2016">25/12/2016 (DD/MM/YYYY)</option>
                      <option value="12/25/2016">12/25/2016 (MM/DD/YYYY)</option>
                      <option value="2016-12-25">2016-12-25 (YYYY-MM-DD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Language</label>
                    <select
                      value={prefs.language}
                      onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 bg-transparent text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    >
                      <option>English (UK)</option>
                      <option>English (US)</option>
                      <option>Français</option>
                      <option>Español</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Start week on</label>
                    <select
                      value={prefs.startWeekOn}
                      onChange={(e) => setPrefs({ ...prefs, startWeekOn: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 bg-transparent text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    >
                      <option>Monday</option>
                      <option>Sunday</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4 text-[15px] font-normal text-gray-700">
                  Export Settings
                </div>
                <div className="md:col-span-8 max-w-[420px]">
                  <label className="block font-semibold text-gray-700 mb-1">Export as</label>
                  <select
                    value={prefs.exportAs}
                    onChange={(e) => setPrefs({ ...prefs, exportAs: e.target.value })}
                    className="w-full border-b border-gray-300 py-1.5 bg-transparent text-gray-800 focus:outline-none focus:border-[#4285F4]"
                  >
                    <option>Microsoft Excel</option>
                    <option>CSV (Comma Separated)</option>
                    <option>PDF Document</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4 text-[15px] font-normal text-gray-700">
                  User Interface
                </div>
                <div className="md:col-span-8 max-w-[420px] space-y-5">
                  <div className="space-y-1.5">
                    <div className="font-semibold text-gray-700">Shorter Amounts</div>
                    <OneUpOnOffToggle
                      value={prefs.shorterAmounts}
                      onChange={(val) => {
                        const next = { ...prefs, shorterAmounts: val };
                        setPrefs(next);
                        updateUserSettings({ preferences: next });
                      }}
                    />
                    <p className="text-gray-400 leading-relaxed">
                      Amount in filters and dashboards will be rounded. i.e. {state.company.currency}137,320 will be replaced by {state.company.currency}137 K
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-gray-700">Contact Info Previewer</div>
                    <OneUpOnOffToggle
                      value={prefs.contactInfoPreviewer}
                      onChange={(val) => {
                        const next = { ...prefs, contactInfoPreviewer: val };
                        setPrefs(next);
                        updateUserSettings({ preferences: next });
                      }}
                    />
                    <p className="text-gray-400">Preview your contacts’ information when hovering over their name</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-semibold text-gray-700">Accountant Mode</div>
                    <OneUpOnOffToggle
                      value={prefs.accountantMode}
                      onChange={(val) => {
                        const next = { ...prefs, accountantMode: val };
                        setPrefs(next);
                        updateUserSettings({ preferences: next });
                      }}
                    />
                    <p className="text-gray-400">Display accounting account information within categories and other features</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateUserSettings({ preferences: prefs });
                        notify('Preferences saved.');
                      }}
                      className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 6. OPPORTUNITIES VIEW (LEADS, OPPORTUNITIES, TASKS, CALLS)
  // ============================================================================

  function OpportunitiesView({ subTab, setSubTab, quickAction }) {
    const { state, formatAmount, addLead, convertLeadToCustomer, addOpportunity, addTask, toggleTask, addCall } = useERP();
    const [modalType, setModalType] = useState(null);
    const [leadForm, setLeadForm] = useState({ company: '', contact: '', email: '', phone: '', location: '', source: 'Inbound Web' });
    const [oppForm, setOppForm] = useState({ title: '', company: '', value: '2500', stage: 'Qualification', probability: '50' });
    const [taskForm, setTaskForm] = useState({ title: '', relatedTo: '', dueDate: new Date().toISOString().slice(0, 10) });
    const [callForm, setCallForm] = useState({ subject: '', contact: '', duration: '15 mins', outcome: 'Follow-up scheduled' });

    useEffect(() => {
      if (quickAction === 'lead') setModalType('lead');
    }, [quickAction]);

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#62D835"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'leads', label: 'Leads' },
            { id: 'opportunities', label: 'Opportunities' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'calls', label: 'Calls' },
          ]}
        />

        <div className="max-w-[1160px] mx-auto px-6 pt-6">
          {subTab === 'leads' && (
            <>
              <OneUpPageHeader
                title="Leads"
                primaryButtonLabel="New Lead"
                onPrimaryClick={() => setModalType('lead')}
              />
              {state.leads.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <Pencil className="w-11 h-11 text-gray-400 stroke-[1.25] mb-4" />
                  <p className="text-[15px] text-gray-500 max-w-md leading-relaxed">
                    You haven't entered any Leads. Create your first one with ‘New Lead’. You can also import leads from your prior solution.
                  </p>
                  <div className="mt-7 max-w-[440px] bg-white border border-gray-200 rounded-[4px] p-4 flex items-start gap-3.5 text-left">
                    <HelpCircle className="w-7 h-7 text-gray-400 stroke-[1.3] shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-gray-500 leading-relaxed">
                      A lead is a potential customer you are establishing a business relationship with. Leads will be automatically converted into customers when you invoice them.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {state.leads.map((lead) => (
                    <div key={lead.id} className="bg-white border border-gray-200 rounded-[4px] shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[14px] font-medium text-[#4285F4]">{lead.company}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{lead.contact} • {lead.email}</div>
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">{lead.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{lead.location}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <StatusBadge status={lead.status} />
                        <button
                          onClick={() => convertLeadToCustomer(lead.id)}
                          className="text-xs text-[#4285F4] hover:underline font-medium cursor-pointer"
                        >
                          Convert to Customer →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {subTab === 'opportunities' && (
            <>
              <OneUpPageHeader title="Opportunities" primaryButtonLabel="New Opportunity" onPrimaryClick={() => setModalType('opp')} />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/60">
                      <th className="py-3 px-4 font-medium">ID</th>
                      <th className="py-3 px-4 font-medium">Opportunity</th>
                      <th className="py-3 px-4 font-medium">Company</th>
                      <th className="py-3 px-4 font-medium">Stage</th>
                      <th className="py-3 px-4 font-medium text-right">Est. Value</th>
                      <th className="py-3 px-4 font-medium">Close Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.opportunities.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono text-gray-500">{o.id}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{o.title}</td>
                        <td className="py-3 px-4 text-gray-600">{o.company}</td>
                        <td className="py-3 px-4"><StatusBadge status={o.stage} /></td>
                        <td className="py-3 px-4 text-right font-semibold">{formatAmount(o.value)}</td>
                        <td className="py-3 px-4 text-gray-500">{o.closeDate}</td>
                      </tr>
                    ))}
                    {state.opportunities.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-400">No opportunities yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'tasks' && (
            <>
              <OneUpPageHeader title="Tasks" primaryButtonLabel="New Task" onPrimaryClick={() => setModalType('task')} />
              <div className="bg-white border border-gray-200 rounded-[4px] divide-y divide-gray-100">
                {state.crmTasks.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer text-xs">
                      <input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                      <span className={t.done ? 'line-through text-gray-400' : 'font-medium text-gray-800'}>{t.title}</span>
                      <span className="text-gray-400">({t.relatedTo})</span>
                    </label>
                    <span className="text-xs text-gray-400">Due {t.dueDate}</span>
                  </div>
                ))}
                {state.crmTasks.length === 0 && <div className="p-10 text-center text-xs text-gray-400">No open tasks.</div>}
              </div>
            </>
          )}

          {subTab === 'calls' && (
            <>
              <OneUpPageHeader title="Calls" primaryButtonLabel="Log Call" onPrimaryClick={() => setModalType('call')} />
              <div className="bg-white border border-gray-200 rounded-[4px] divide-y divide-gray-100">
                {state.crmCalls.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-gray-900">{c.subject}</div>
                      <div className="text-gray-500 mt-0.5">{c.contact} • {c.outcome}</div>
                    </div>
                    <div className="text-right text-gray-400">
                      <div>{c.date}</div>
                      <div>{c.duration}</div>
                    </div>
                  </div>
                ))}
                {state.crmCalls.length === 0 && <div className="p-10 text-center text-xs text-gray-400">No calls logged.</div>}
              </div>
            </>
          )}
        </div>

        <Modal open={modalType === 'lead'} onClose={() => setModalType(null)} title="New Lead">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addLead(leadForm);
              setLeadForm({ company: '', contact: '', email: '', phone: '', location: '', source: 'Inbound Web' });
              setModalType(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Company Name</label>
              <input required value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Contact Name</label>
                <input required value={leadForm.contact} onChange={(e) => setLeadForm({ ...leadForm, contact: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input type="email" required value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Phone</label>
                <input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Location</label>
                <input value={leadForm.location} onChange={(e) => setLeadForm({ ...leadForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Lead</button>
            </div>
          </form>
        </Modal>

        <Modal open={modalType === 'opp'} onClose={() => setModalType(null)} title="New Opportunity">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addOpportunity(oppForm);
              setModalType(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Opportunity Title</label>
              <input required value={oppForm.title} onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Company</label>
                <input required value={oppForm.company} onChange={(e) => setOppForm({ ...oppForm, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Estimated Value</label>
                <input type="number" required value={oppForm.value} onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Opportunity</button>
            </div>
          </form>
        </Modal>

        <Modal open={modalType === 'task'} onClose={() => setModalType(null)} title="New Task">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTask(taskForm);
              setModalType(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Task Description</label>
              <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div>
              <label className="block font-medium mb-1">Related Company</label>
              <input value={taskForm.relatedTo} onChange={(e) => setTaskForm({ ...taskForm, relatedTo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Task</button>
            </div>
          </form>
        </Modal>

        <Modal open={modalType === 'call'} onClose={() => setModalType(null)} title="Log Call">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCall(callForm);
              setModalType(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Call Subject</label>
              <input required value={callForm.subject} onChange={(e) => setCallForm({ ...callForm, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div>
              <label className="block font-medium mb-1">Contact</label>
              <input required value={callForm.contact} onChange={(e) => setCallForm({ ...callForm, contact: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Call</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // 7. SALES VIEW (CUSTOMERS, QUOTES, INVOICES, PAYMENTS, CREDIT NOTES)
  // ============================================================================

  function SalesView({ subTab, setSubTab, quickAction, onOpenCompanySettings }) {
    const {
      state,
      formatAmount,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      importCustomers,
      savePriceFamilies,
      createQuote,
      updateQuote,
      cancelQuote,
      duplicateQuote,
      deleteQuote,
      markQuoteSent,
      convertQuoteToOrder,
      convertQuoteToInvoice,
      createSalesOrder,
      createInvoice,
      updateInvoice,
      cancelInvoice,
      duplicateInvoice,
      deleteInvoice,
      markInvoiceSent,
      convertDeliveryNoteToInvoice,
      createSalesReceipt,
      recordInvoicePayment,
      issueCreditNote,
      addProduct,
      addLead,
      addTask,
      addCall,
      addOpportunity,
      notify,
    } = useERP(); 

    const INDIAN_STATES = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
      'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal',
    ];

    const emptyCustomerForm = useCallback(
      () => ({
        customerType: 'Company',
        name: '',
        email: '',
        phone: '',
        website: '',
        taxId: '',
        billingAddress: '',
        addressLine2: '',
        city: '',
        state: '',
        postCode: '',
        country: state.company?.country || 'India',
        sameAsBilling: true,
        shippingAddress: '',
        shippingLine2: '',
        shippingCity: '',
        shippingState: '',
        shippingPostCode: '',
        shippingCountry: state.company?.country || 'India',
        contacts: [],
        paymentTerms: 'Due on receipt',
        priceFamily: 'None',
        salesTax: 'None',
        priorityVat: false,
        employeeCount: 1,
        industry: 'None',
        incorporationStatus: 'None',
        optInEmails: false,
        baseAccount: '11100 (Accounts Receivable:Miscellaneous Customer)',
        notes: '',
        code: '',
      }),
      [state.company?.country]
    );

    // Sub-screens inside Customers tab: 'list' | 'new' | 'edit' | 'detail' | 'statement' | 'import' | 'duplicate'
    const [customerScreen, setCustomerScreen] = useState('list');
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    // List filters & sorting
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name-asc');
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [openCardMenuId, setOpenCardMenuId] = useState(null);

    // New / Edit Customer form state
    const [custForm, setCustForm] = useState(emptyCustomerForm);
    const [showAdvanced, setShowAdvanced] = useState(true);

    // Customer Detail view state
    const [detailTab, setDetailTab] = useState('activity');
    const [detailSearch, setDetailSearch] = useState('');
    const [newActionOpen, setNewActionOpen] = useState(false);

    // Customer Statement state
    const [showStmtFilters, setShowStmtFilters] = useState(false);
    const [stmtFromDate, setStmtFromDate] = useState('');
    const [stmtToDate, setStmtToDate] = useState('');
    const [stmtOnlyOpen, setStmtOnlyOpen] = useState(false);

    // Import Customers state
    const [importFileName, setImportFileName] = useState('');
    const [importRows, setImportRows] = useState([]);
    const [showImportGuide, setShowImportGuide] = useState(false);

    // Duplicate Customer state
    const [dupCodeMode, setDupCodeMode] = useState('Automatically');
    const [dupSourceId, setDupSourceId] = useState('');
    const [dupManualCode, setDupManualCode] = useState('');
    const [dupQueue, setDupQueue] = useState([]);

    // Price Families modal state
    const [pfList, setPfList] = useState([]);
    const [newPfName, setNewPfName] = useState('');
    const [newPfDiscount, setNewPfDiscount] = useState('10');

    // Document & CRM Modals
    const [modal, setModal] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [docCustomerId, setDocCustomerId] = useState('');
    const [docItems, setDocItems] = useState([]);
    const [crmQuickForm, setCrmQuickForm] = useState({
      title: '',
      contact: '',
      value: '5000',
      dueDate: new Date().toISOString().slice(0, 10),
    });

    const activeCustomer = useMemo(
      () => state.customers.find((c) => c.id === selectedCustomerId) || null,
      [state.customers, selectedCustomerId]
    );

    useEffect(() => {
      const validCustomer = state.customers.some((c) => c.id === docCustomerId);
      if (!validCustomer) {
        setDocCustomerId(state.customers[0]?.id || '');
      }
    }, [state.customers, docCustomerId]);

    useEffect(() => {
      if (state.products.length === 0) {
        setDocItems([]);
        return;
      }
      setDocItems((prevItems) => {
        const hasStaleProduct =
          prevItems.length === 0 ||
          prevItems.some((line) => !state.products.some((p) => p.id === line.productId));
        if (!hasStaleProduct) return prevItems;
        const first = state.products[0];
        return [
          {
            productId: first.id,
            description: first.name,
            qty: 1,
            unitPrice: Number(first.price ?? first.sellPrice ?? 0),
            taxRate: Number(first.taxRate ?? 0),
          },
        ];
      });
    }, [state.products]);

    useEffect(() => {
      if (quickAction === 'quote') setModal('quote');
      if (quickAction === 'invoice') setModal('invoice');
    }, [quickAction]);

    // Reset sub-screen when switching away from Customers tab
    useEffect(() => {
      if (subTab !== 'customers') {
        setCustomerScreen('list');
      }
    }, [subTab]);

    const formatShortDate = (isoStr) => {
      if (!isoStr) return '';
      const parts = String(isoStr).split('-');
      if (parts.length !== 3) return isoStr;
      return `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    };

    const getDaysLate = (dueDateStr, status) => {
      if (
        !dueDateStr ||
        status === 'Paid' ||
        status === 'Credited' ||
        status === 'Draft' ||
        status === 'Cancelled'
      ) {
        return 0;
      }
      const due = new Date(dueDateStr);
      const now = new Date();
      const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    };

    const getCustomerOpenBalance = useCallback(
      (custId) =>
        state.invoices
          .filter(
            (i) =>
              i.customerId === custId &&
              i.status !== 'Paid' &&
              i.status !== 'Credited' &&
              i.status !== 'Draft' &&
              i.status !== 'Cancelled'
          )
          .reduce((s, i) => s + Math.max(0, (Number(i.total) || 0) - (Number(i.amountPaid) || 0)), 0),
      [state.invoices]
    );

    // Filtered & sorted customers for List view
    const filteredCustomers = useMemo(() => {
      const q = searchTerm.trim().toLowerCase();
      const now = new Date();

      const list = state.customers.filter((c) => {
        const matchesQuery =
          !q ||
          (c.name || '').toLowerCase().includes(q) ||
          (c.id || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.location || '').toLowerCase().includes(q);

        if (!matchesQuery) return false;
        if (dateFilter === 'all' || !c.createdAt) return true;

        const created = new Date(c.createdAt);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        if (dateFilter === 'today') return diffDays <= 1;
        if (dateFilter === '7d') return diffDays <= 7;
        if (dateFilter === '30d') return diffDays <= 30;
        if (dateFilter === 'year') return created.getFullYear() === now.getFullYear();
        return true;
      });

      return [...list].sort((a, b) => {
        if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
        if (sortBy === 'code') return (a.id || '').localeCompare(b.id || '');
        if (sortBy === 'balance') return getCustomerOpenBalance(b.id) - getCustomerOpenBalance(a.id);
        return (a.name || '').localeCompare(b.name || '');
      });
    }, [state.customers, searchTerm, dateFilter, sortBy, getCustomerOpenBalance]);

    // Navigation helpers for Customer screens
    const openNewCustomerForm = () => {
      setCustForm(emptyCustomerForm());
      setShowAdvanced(true);
      setCustomerScreen('new');
    };

    const openEditCustomerForm = (cust) => {
      setSelectedCustomerId(cust.id);
      setCustForm({
        ...emptyCustomerForm(),
        ...cust,
        code: cust.id,
        contacts: Array.isArray(cust.contacts) ? cust.contacts.map((ct) => ({ ...ct })) : [],
      });
      setShowAdvanced(true);
      setCustomerScreen('edit');
    };

    const openCustomerDetail = (cust) => {
      setSelectedCustomerId(cust.id);
      setDetailTab('activity');
      setDetailSearch('');
      setCustomerScreen('detail');
    };

    const openDuplicateScreen = (preselectId = '') => {
      setDupCodeMode('Automatically');
      setDupSourceId(preselectId || state.customers[0]?.id || '');
      setDupManualCode('');
      setDupQueue([]);
      setCustomerScreen('duplicate');
    };

    const handleExportCustomersCSV = () => {
      if (state.customers.length === 0) {
        notify('No customers to export.', 'error');
        return;
      }
      const headers = [
        'Code', 'Type', 'Name', 'Email', 'Phone', 'Website', 'VAT Number',
        'Billing Address', 'Line 2', 'City', 'State', 'Post Code', 'Country',
        'Payment Terms', 'Price Family', 'Industry', 'Notes',
      ];
      const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
      const csvLines = [
        headers.join(','),
        ...state.customers.map((c) =>
          [
            c.id,
            c.customerType || 'Company',
            c.name,
            c.email,
            c.phone,
            c.website,
            c.taxId,
            c.billingAddress,
            c.addressLine2,
            c.city,
            c.state,
            c.postCode,
            c.country,
            c.paymentTerms,
            c.priceFamily || 'None',
            c.industry || 'None',
            c.notes,
          ]
            .map(escapeCSV)
            .join(',')
        ),
      ];
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify(`Exported ${state.customers.length} customer(s) to CSV.`);
    };

    const handleDownloadImportTemplate = () => {
      const sample = [
        'Code,Type,Name,Email,Phone,Website,VAT Number,Billing Address,Line 2,City,State,Post Code,Country,Payment Terms,Industry,Notes',
        ',Company,"Acme Retail Pvt Ltd","accounts@acmeretail.in","+91 98450 12345","https://acmeretail.in","29AABCA1234M1Z5","12 MG Road","Floor 2","Bengaluru","Karnataka","560001","India","Net 30","Retail","Key wholesale account"',
      ].join('\n');
      const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'iven_customer_import_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImportFileUpload = (file) => {
      if (!file) return;
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || '');
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length < 2) {
          notify('CSV file must include a header row and at least one customer row.', 'error');
          return;
        }
        const parseCSVLine = (line) => {
          const result = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === ',' && !inQuotes) {
              result.push(cur.trim());
              cur = '';
            } else {
              cur += ch;
            }
          }
          result.push(cur.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
        const getCol = (cols, candidates) => {
          const idx = headers.findIndex((h) => candidates.includes(h));
          return idx >= 0 ? (cols[idx] || '') : '';
        };

        const parsed = lines
          .slice(1)
          .map((line) => {
            const cols = parseCSVLine(line);
            return {
              code: getCol(cols, ['code', 'id', 'customer code']),
              customerType: getCol(cols, ['type', 'customer type']) || 'Company',
              name: getCol(cols, ['name', 'company name', 'customer', 'customer name']),
              email: getCol(cols, ['email', 'e-mail']),
              phone: getCol(cols, ['phone', 'phone number', 'mobile']),
              website: getCol(cols, ['website', 'url']),
              taxId: getCol(cols, ['vat number', 'vat', 'gst', 'gstin', 'tax id']),
              billingAddress: getCol(cols, ['billing address', 'address', 'street']),
              addressLine2: getCol(cols, ['line 2', 'address line 2']),
              city: getCol(cols, ['city']),
              state: getCol(cols, ['state', 'province']),
              postCode: getCol(cols, ['post code', 'postcode', 'zip', 'pincode']),
              country: getCol(cols, ['country']) || state.company?.country || 'India',
              paymentTerms: getCol(cols, ['payment terms', 'terms']) || 'Due on receipt',
              industry: getCol(cols, ['industry']) || 'None',
              notes: getCol(cols, ['notes', 'note']),
            };
          })
          .filter((r) => r.name);

        setImportRows(parsed);
        if (parsed.length === 0) {
          notify('No valid customer names found in file.', 'error');
        }
      };
      reader.readAsText(file);
    };

    const getNextAutoDupCode = () => {
      let maxNum = 0;
      [...state.customers, ...dupQueue.map((d) => ({ id: d.code }))].forEach((c) => {
        const m = String(c.id || '').match(/(\d+)$/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      return `CUS-${String(maxNum + 1).padStart(3, '0')}`;
    };

    // Build chronological Customer Statement rows
    const customerStatementData = useMemo(() => {
      if (!activeCustomer) return { rows: [], closingBalance: 0 };
      const rawEvents = [];

      state.invoices
        .filter((inv) => inv.customerId === activeCustomer.id && inv.status !== 'Draft')
        .forEach((inv) => {
          rawEvents.push({
            id: inv.id,
            date: inv.date || '2026-11-18',
            sortKey: `${inv.date || '2026-11-18'}-1`,
            description: `Invoice ${inv.id}`,
            linkType: 'invoice',
            amount: Number(inv.total) || 0,
            isOpen:
              inv.status !== 'Paid' &&
              inv.status !== 'Credited' &&
              inv.status !== 'Cancelled',
          });
          if (inv.status === 'Credited') {
            rawEvents.push({
              id: `CN-${inv.id}`,
              date: inv.date || '2026-11-18',
              sortKey: `${inv.date || '2026-11-18'}-3`,
              description: `Credit Note CN-${inv.id}`,
              linkType: 'credit',
              amount: -(Number(inv.total) || 0),
              isOpen: false,
            });
          }
          if (inv.status === 'Cancelled') {
            rawEvents.push({
              id: `CANCEL-${inv.id}`,
              date: inv.date || '2026-11-18',
              sortKey: `${inv.date || '2026-11-18'}-3`,
              description: `Cancelled Invoice ${inv.id}`,
              linkType: 'cancelled',
              amount: -(Number(inv.total) || 0),
              isOpen: false,
            });
          }
        });

      state.paymentsReceived
        .filter((pay) => pay.customerId === activeCustomer.id)
        .forEach((pay) => {
          rawEvents.push({
            id: pay.id,
            date: pay.date || '2026-11-18',
            sortKey: `${pay.date || '2026-11-18'}-2`,
            description: `Payment ${pay.id} (${pay.invoiceId})`,
            linkType: 'payment',
            amount: -(Number(pay.amount) || 0),
            isOpen: false,
          });
        });

      rawEvents.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      let running = 0;
      const computedRows = [
        {
          id: 'bal-fwd',
          date: activeCustomer.createdAt || new Date().toISOString().slice(0, 10),
          description: 'Balance Forward',
          linkType: null,
          amount: 0,
          balance: 0,
          isOpen: false,
        },
        ...rawEvents.map((ev) => {
          running = Number((running + ev.amount).toFixed(2));
          return { ...ev, balance: running };
        }),
      ];

      const filteredRows = computedRows.filter((r) => {
        if (r.id === 'bal-fwd') return true;
        if (stmtFromDate && r.date < stmtFromDate) return false;
        if (stmtToDate && r.date > stmtToDate) return false;
        if (stmtOnlyOpen && !r.isOpen) return false;
        return true;
      });

      return { rows: filteredRows, closingBalance: Math.max(0, running) };
    }, [activeCustomer, state.invoices, state.paymentsReceived, stmtFromDate, stmtToDate, stmtOnlyOpen]);

    // Build Activity & Invoice items for Customer Detail View
    const customerDetailItems = useMemo(() => {
      if (!activeCustomer) return { allActivity: [], invoicesOnly: [] };
      const q = detailSearch.trim().toLowerCase();

      const invItems = state.invoices
        .filter((i) => i.customerId === activeCustomer.id)
        .map((i) => ({
          kind: 'invoice',
          id: i.id,
          title: `Invoice ${i.id}`,
          date: i.date,
          dueDate: i.dueDate,
          status: i.status,
          amount: Number(i.total) || 0,
          balance: Math.max(0, (Number(i.total) || 0) - (Number(i.amountPaid) || 0)),
          raw: i,
        }));

      const quoteItems = state.quotes
        .filter((qt) => qt.customerId === activeCustomer.id)
        .map((qt) => {
          const totals = calcDocTotals(qt.items || [], state.products, qt.discountPct || 0);
          return {
            kind: 'quote',
            id: qt.id,
            title: `Quote ${qt.id}`,
            date: qt.date,
            status: qt.status,
            amount: totals.total,
            raw: qt,
          };
        });

      const soItems = state.salesOrders
        .filter((so) => so.customerId === activeCustomer.id)
        .map((so) => {
          const totals = calcDocTotals(so.items || [], state.products, so.discountPct || 0);
          return {
            kind: 'salesOrder',
            id: so.id,
            title: `Sales Order ${so.id}`,
            date: so.date,
            status: so.fulfillmentStatus,
            amount: totals.total,
            raw: so,
          };
        });

      const payItems = state.paymentsReceived
        .filter((p) => p.customerId === activeCustomer.id)
        .map((p) => ({
          kind: 'payment',
          id: p.id,
          title: `Payment ${p.id} (${p.invoiceId})`,
          date: p.date,
          status: 'Paid',
          amount: Number(p.amount) || 0,
          raw: p,
        }));

      const matchesSearch = (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        activeCustomer.name.toLowerCase().includes(q);

      return {
        allActivity: [...invItems, ...quoteItems, ...soItems, ...payItems].filter(matchesSearch),
        invoicesOnly: invItems.filter(matchesSearch),
      };
    }, [activeCustomer, state.invoices, state.quotes, state.salesOrders, state.paymentsReceived, state.products, detailSearch]);

    const openDocModalForCustomer = (type, customerId = '') => {
      const targetId = customerId || state.customers[0]?.id || '';
      setDocCustomerId(targetId);
      if (state.products.length > 0) {
        const first = state.products[0];
        setDocItems([
          {
            productId: first.id,
            description: first.name,
            qty: 1,
            unitPrice: Number(first.price ?? first.sellPrice ?? 0),
            taxRate: Number(first.taxRate ?? 0),
          },
        ]);
      } else {
        setDocItems([]);
      }
      setModal(type);
    };

    const segBtnCls = (active) =>
      `px-5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
        active
          ? 'bg-[#4285F4] text-white border-[#4285F4]'
          : 'bg-white text-[#4285F4] border-gray-300 hover:bg-gray-50'
      }`;

    const underlineInputCls =
      'w-full border border-gray-200 rounded-[3px] px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4] bg-white';
      // Invoices Sub-screens: 'list' | 'editor'
    const [invoiceScreen, setInvoiceScreen] = useState('list');
    const [editingInvoiceId, setEditingInvoiceId] = useState(null);
    const [invoicePage, setInvoicePage] = useState(1); // 1 = Document Form, 2 = Payments & Balance
    const [invoiceStatusTab, setInvoiceStatusTab] = useState('all'); // 'all' | 'draft' | 'unpaid' | 'paid' | 'cancelled'
    const [invSearch, setInvSearch] = useState('');
    const [invDateFilter, setInvDateFilter] = useState('all');
    const [invSortBy, setInvSortBy] = useState('dueDate');
    const [invViewMode, setInvViewMode] = useState('grid');
    const [invHeaderMenuOpen, setInvHeaderMenuOpen] = useState(false);
    const [openInvCardMenuId, setOpenInvCardMenuId] = useState(null);
    const [previewInvoiceId, setPreviewInvoiceId] = useState(null);
    const [convertModalType, setConvertModalType] = useState(null); // 'quotes' | 'orders' | 'deliveryNotes' | null
    const [showAdvancedInv, setShowAdvancedInv] = useState(true);
    const [paymentForm, setPaymentForm] = useState({
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      method: 'Bank Transfer',
      bankReference: '',
      bankAccount: '1000 Checking Account',
    });

    const buildBlankInvoiceForm = useCallback(
      (customerId = '') => {
        const cust = state.customers.find((c) => c.id === customerId) || state.customers[0];
        const today = new Date().toISOString().slice(0, 10);
        const rule = state.company?.autoNumbering?.invoice || {
          prefix: 'CINV-',
          nextNumber: 1 + state.invoices.length,
          digits: 3,
        };
        const previewCode = `${rule.prefix || 'CINV-'}${String(Number(rule.nextNumber) || 1).padStart(
          Number(rule.digits) || 3,
          '0'
        )}`;
        const terms = cust?.paymentTerms || 'Due on receipt';
        const firstProd = state.products[0];

        return {
          code: previewCode,
          customerId: cust?.id || '',
          recipient: 'None',
          billingAddress: cust?.location || '',
          date: today,
          paymentTerms: terms,
          dueDate: computeDueDateFromTerms(today, terms),
          status: 'Open', // 'Open' | 'Paid' | 'Draft' | 'Cancelled'
          items: firstProd
            ? [
                {
                  productId: firstProd.id,
                  code: firstProd.sku || firstProd.id,
                  description: firstProd.name,
                  qty: 1,
                  unitPrice: Number(firstProd.price) || 0,
                  discPct: 0,
                  taxRate: Number(firstProd.taxRate ?? state.company?.defaultTaxRate ?? 20),
                },
              ]
            : [],
          documentNote: '',
          discountRate: Number(cust?.discountTier) || 0,
          deliveryDate: '',
          deliveryContact: '',
          deliveryAddress: cust?.shippingAddress || cust?.location || '',
          poNumber: '',
          project: '',
          privateNote: '',
          attachments: [],
        };
      },
      [state.customers, state.products, state.invoices.length, state.company]
    );

    const [invoiceForm, setInvoiceForm] = useState(() => buildBlankInvoiceForm());

    useEffect(() => {
      if (subTab !== 'invoices') {
        setInvoiceScreen('list');
      }
    }, [subTab]);

    const openNewInvoiceEditor = (preselectedCustomerId = '') => {
      setEditingInvoiceId(null);
      setInvoicePage(1);
      setShowAdvancedInv(true);
      setInvoiceForm(buildBlankInvoiceForm(preselectedCustomerId));
      setSubTab('invoices');
      setInvoiceScreen('editor');
    };

    const openExistingInvoiceEditor = (inv, startPage = 1) => {
      const cust = state.customers.find((c) => c.id === inv.customerId);
      setEditingInvoiceId(inv.id);
      setInvoicePage(startPage);
      setShowAdvancedInv(true);
      setInvoiceForm({
        code: inv.id,
        customerId: inv.customerId || '',
        recipient: inv.recipient || 'None',
        billingAddress: inv.billingAddress ?? cust?.location ?? '',
        date: inv.date || new Date().toISOString().slice(0, 10),
        paymentTerms: inv.paymentTerms || 'Due on receipt',
        dueDate: inv.dueDate || inv.date || new Date().toISOString().slice(0, 10),
        status: inv.status || 'Open',
        items: (inv.items || []).map((line) => {
          const prod = state.products.find((p) => p.id === line.productId);
          return {
            productId: line.productId || prod?.id || '',
            code: line.code || prod?.sku || '',
            description: line.description || prod?.name || '',
            qty: Number(line.qty) || 1,
            unitPrice: Number(line.unitPrice) || 0,
            discPct: Number(line.discPct) || 0,
            taxRate: line.taxRate !== undefined ? Number(line.taxRate) : Number(prod?.taxRate ?? 20),
          };
        }),
        documentNote: inv.documentNote || '',
        discountRate: Number(inv.discountRate ?? inv.discountPct) || 0,
        deliveryDate: inv.deliveryDate || '',
        deliveryContact: inv.deliveryContact || '',
        deliveryAddress: inv.deliveryAddress ?? cust?.shippingAddress ?? cust?.location ?? '',
        poNumber: inv.poNumber || '',
        project: inv.project || '',
        privateNote: inv.privateNote || '',
        attachments: Array.isArray(inv.attachments) ? inv.attachments : [],
      });
      setSubTab('invoices');
      setInvoiceScreen('editor');
    };

    // Live computed totals for the Invoice Editor
    const editorTotals = useMemo(
      () => calcDocTotals(invoiceForm.items || [], state.products, invoiceForm.discountRate || 0),
      [invoiceForm.items, invoiceForm.discountRate, state.products]
    );

    // Status tab counts & totals for the Invoices page
    const invoiceSummary = useMemo(() => {
      const summary = {
        all: { count: 0, total: 0 },
        draft: { count: 0, total: 0 },
        unpaid: { count: 0, total: 0 },
        paid: { count: 0, total: 0 },
        cancelled: { count: 0, total: 0 },
      };

      state.invoices.forEach((inv) => {
        const amt = Number(inv.total) || 0;
        summary.all.count += 1;
        summary.all.total += amt;

        if (inv.status === 'Draft') {
          summary.draft.count += 1;
          summary.draft.total += amt;
        } else if (inv.status === 'Cancelled') {
          summary.cancelled.count += 1;
          summary.cancelled.total += amt;
        } else if (inv.status === 'Paid' || inv.status === 'Credited') {
          summary.paid.count += 1;
          summary.paid.total += amt;
        } else {
          summary.unpaid.count += 1;
          summary.unpaid.total += amt;
        }
      });

      return summary;
    }, [state.invoices]);

    const filteredInvoices = useMemo(() => {
      const q = invSearch.trim().toLowerCase();
      const now = new Date();

      const list = state.invoices.filter((inv) => {
        if (invoiceStatusTab === 'draft' && inv.status !== 'Draft') return false;
        if (invoiceStatusTab === 'cancelled' && inv.status !== 'Cancelled') return false;
        if (invoiceStatusTab === 'paid' && inv.status !== 'Paid' && inv.status !== 'Credited')
          return false;
        if (
          invoiceStatusTab === 'unpaid' &&
          (inv.status === 'Draft' ||
            inv.status === 'Cancelled' ||
            inv.status === 'Paid' ||
            inv.status === 'Credited')
        ) {
          return false;
        }

        const cust = state.customers.find((c) => c.id === inv.customerId);
        const matchesQuery =
          !q ||
          (inv.id || '').toLowerCase().includes(q) ||
          (cust?.name || '').toLowerCase().includes(q) ||
          (inv.poNumber || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;

        if (invDateFilter === 'all' || !inv.date) return true;
        const d = new Date(inv.date);
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        if (invDateFilter === 'today') return diffDays <= 1;
        if (invDateFilter === '7d') return diffDays <= 7;
        if (invDateFilter === '30d') return diffDays <= 30;
        if (invDateFilter === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });

      return [...list].sort((a, b) => {
        if (invSortBy === 'date') return (b.date || '').localeCompare(a.date || '');
        if (invSortBy === 'number') return (a.id || '').localeCompare(b.id || '');
        if (invSortBy === 'total') return (Number(b.total) || 0) - (Number(a.total) || 0);
        if (invSortBy === 'customer') {
          const ca = state.customers.find((c) => c.id === a.customerId)?.name || '';
          const cb = state.customers.find((c) => c.id === b.customerId)?.name || '';
          return ca.localeCompare(cb);
        }
        return (a.dueDate || a.date || '').localeCompare(b.dueDate || b.date || '');
      });
    }, [state.invoices, state.customers, invoiceStatusTab, invSearch, invDateFilter, invSortBy]);

    const handleExportInvoicesCSV = (lineLevel = false) => {
      if (state.invoices.length === 0) {
        notify('No invoices to export.', 'error');
        return;
      }
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      let csvRows = [];

      if (!lineLevel) {
        csvRows.push('Invoice Code,Customer,Date,Due Date,Payment Terms,Status,Subtotal,VAT,Total,Paid,Balance Due');
        state.invoices.forEach((inv) => {
          const cust = state.customers.find((c) => c.id === inv.customerId);
          const bal = ['Paid', 'Credited', 'Cancelled'].includes(inv.status)
            ? 0
            : Math.max(0, (Number(inv.total) || 0) - (Number(inv.amountPaid) || 0));
          csvRows.push(
            [
              inv.id,
              cust?.name || inv.customerId,
              inv.date,
              inv.dueDate,
              inv.paymentTerms || 'Due on receipt',
              inv.status,
              (Number(inv.subtotal) || 0).toFixed(2),
              (Number(inv.taxTotal) || 0).toFixed(2),
              (Number(inv.total) || 0).toFixed(2),
              (Number(inv.amountPaid) || 0).toFixed(2),
              bal.toFixed(2),
            ]
              .map(esc)
              .join(',')
          );
        });
      } else {
        csvRows.push('Invoice Code,Customer,Date,Item Code,Description,Qty,Unit Price,Disc %,VAT %,Line Total');
        state.invoices.forEach((inv) => {
          const cust = state.customers.find((c) => c.id === inv.customerId);
          (inv.items || []).forEach((line) => {
            const lineTotal =
              (Number(line.qty) || 0) *
              (Number(line.unitPrice) || 0) *
              (1 - (Number(line.discPct) || 0) / 100);
            csvRows.push(
              [
                inv.id,
                cust?.name || inv.customerId,
                inv.date,
                line.code || line.productId,
                line.description,
                line.qty,
                line.unitPrice,
                line.discPct || 0,
                line.taxRate || 0,
                lineTotal.toFixed(2),
              ]
                .map(esc)
                .join(',')
            );
          });
        });
      }

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lineLevel ? 'invoice_lines' : 'invoices'}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify(`Exported ${lineLevel ? 'invoice lines' : 'invoices'} to CSV.`);
    };

    const previewInvoice = useMemo(
      () => state.invoices.find((i) => i.id === previewInvoiceId) || null,
      [state.invoices, previewInvoiceId]
    );
    // Quotes Sub-screens: 'list' | 'editor'
 const [quoteScreen, setQuoteScreen] = useState('list');
 const [editingQuoteId, setEditingQuoteId] = useState(null);
 const [quoteStatusTab, setQuoteStatusTab] = useState('all'); // 'all' | 'draft' | 'open' | 'converted' | 'cancelled'
 const [qtSearch, setQtSearch] = useState('');
 const [qtDateFilter, setQtDateFilter] = useState('all');
 const [qtSortBy, setQtSortBy] = useState('date');
 const [qtViewMode, setQtViewMode] = useState('grid');
 const [qtHeaderMenuOpen, setQtHeaderMenuOpen] = useState(false);
 const [openQtCardMenuId, setOpenQtCardMenuId] = useState(null);
 const [previewQuoteId, setPreviewQuoteId] = useState(null);
 const [showAdvancedQt, setShowAdvancedQt] = useState(false);

 // Lead or Customer search dropdown & picker inside Quote Editor
 const [qtEntityQuery, setQtEntityQuery] = useState('');
 const [qtEntityDropdownOpen, setQtEntityDropdownOpen] = useState(false);
 const [entityPickerModalOpen, setEntityPickerModalOpen] = useState(false);
 const [entityPickerSearch, setEntityPickerSearch] = useState('');

 // Shared Modals: Add Product/Service Picker, New Product/Service, New Lead/Customer, Customise Document
 const [productPickerTarget, setProductPickerTarget] = useState(null); // 'quote' | 'invoice' | null
 const [pickerSearch, setPickerSearch] = useState('');
 const [pickerSelectedIds, setPickerSelectedIds] = useState([]);
 const [newProdModalOpen, setNewProdModalOpen] = useState(false);
 const [newProdForm, setNewProdForm] = useState({
   type: 'Service',
   name: '',
   unit: 'Day',
   price: '0.00',
   cost: '0.00',
   sku: '',
   description: '',
   family: 'Miscellaneous',
   privateNote: '',
   incomeAccount: 'Sales - Miscellaneous (41005)',
   taxRate: 20,
   mainWarehouseQty: 0,
 });

 const [newLeadCustModalOpen, setNewLeadCustModalOpen] = useState(false);
 const [newLeadCustForm, setNewLeadCustForm] = useState({
   recordRole: 'Customer', // 'Customer' | 'Lead'
   entityType: 'Company', // 'Company' | 'Individual'
   companyName: '',
   firstName: '',
   lastName: '',
   middleName: '',
   email: '',
   phone: '',
   website: '',
   taxId: '',
   pickupOnly: false,
   billingAddress: '',
   addressLine2: '',
   city: '',
   state: '',
   postCode: '',
   country: state.company?.country || 'India',
   sameAsBilling: true,
   contacts: [],
 });

 // Per-Document Customise Modal ({ type: 'invoice' | 'quote', id: string } | null)
 const [customiseTarget, setCustomiseTarget] = useState(null);
 const [customiseOpenSection, setCustomiseOpenSection] = useState('global-appearance');
 const [customiseDraft, setCustomiseDraft] = useState(null);

 const buildBlankQuoteForm = useCallback(
   (customerId = '') => {
     const cust = state.customers.find((c) => c.id === customerId) || null;
     const today = new Date().toISOString().slice(0, 10);
     const expiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
     const rule = state.company?.autoNumbering?.quote || {
       prefix: 'QOT-',
       nextNumber: 1 + state.quotes.length,
       digits: 3,
     };
     const previewCode = `${rule.prefix || 'QOT-'}${String(Number(rule.nextNumber) || 1).padStart(
       Number(rule.digits) || 3,
       '0'
     )}`;

     return {
       code: previewCode,
       customerId: cust?.id || '',
       customerName: cust?.name || '',
       recipient: 'None',
       billingAddress: cust?.location || '',
       date: today,
       status: 'Open',
       expiryDate: expiry,
       paymentTerms: cust?.paymentTerms || 'Due on receipt',
       items: [],
       documentNote: '',
       discountRate: Number(cust?.discountTier) || 0,
       deliveryDate: '',
       deliveryContact: '',
       deliveryAddress: cust?.shippingAddress || cust?.location || '',
       poNumber: '',
       project: '',
       privateNote: '',
       attachments: [],
     };
   },
   [state.customers, state.quotes.length, state.company]
 );

 const [quoteForm, setQuoteForm] = useState(() => buildBlankQuoteForm());

 useEffect(() => {
   if (subTab !== 'quotes') {
     setQuoteScreen('list');
   }
 }, [subTab]);

 const openNewQuoteEditor = (preselectedCustomerId = '') => {
   const blank = buildBlankQuoteForm(preselectedCustomerId);
   setEditingQuoteId(null);
   setShowAdvancedQt(false);
   setQuoteForm(blank);
   setQtEntityQuery(blank.customerName || '');
   setSubTab('quotes');
   setQuoteScreen('editor');
 };

 const openExistingQuoteEditor = (qt) => {
   const cust = state.customers.find((c) => c.id === qt.customerId);
   const lead = state.leads.find((l) => l.id === qt.customerId);
   const resolvedName = cust?.name || lead?.company || qt.customerName || '';
   setEditingQuoteId(qt.id);
   setShowAdvancedQt(false);
   setQtEntityQuery(resolvedName);
   setQuoteForm({
     code: qt.id,
     customerId: qt.customerId || '',
     customerName: resolvedName,
     recipient: qt.recipient || 'None',
     billingAddress: qt.billingAddress ?? cust?.location ?? lead?.location ?? '',
     date: qt.date || new Date().toISOString().slice(0, 10),
     status: qt.status || 'Open',
     expiryDate:
       qt.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
     paymentTerms: qt.paymentTerms || 'Due on receipt',
     items: (qt.items || []).map((line) => {
       const prod = state.products.find((p) => p.id === line.productId);
       return {
         productId: line.productId || prod?.id || '',
         code: line.code || prod?.sku || '',
         description: line.description || prod?.name || '',
         qty: Number(line.qty) || 1,
         unitPrice: Number(line.unitPrice) || 0,
         discPct: Number(line.discPct) || 0,
         taxRate:
           line.taxRate !== undefined ? Number(line.taxRate) : Number(prod?.taxRate ?? 20),
       };
     }),
     documentNote: qt.documentNote || qt.notes || '',
     discountRate: Number(qt.discountRate ?? qt.discountPct) || 0,
     deliveryDate: qt.deliveryDate || '',
     deliveryContact: qt.deliveryContact || '',
     deliveryAddress: qt.deliveryAddress ?? cust?.shippingAddress ?? cust?.location ?? '',
     poNumber: qt.poNumber || '',
     project: qt.project || '',
     privateNote: qt.privateNote || '',
     attachments: Array.isArray(qt.attachments) ? qt.attachments : [],
   });
   setSubTab('quotes');
   setQuoteScreen('editor');
 };

 const quoteEditorTotals = useMemo(
   () => calcDocTotals(quoteForm.items || [], state.products, quoteForm.discountRate || 0),
   [quoteForm.items, quoteForm.discountRate, state.products]
 );

 const quoteSummary = useMemo(() => {
   const s = {
     all: { count: 0, total: 0 },
     draft: { count: 0, total: 0 },
     open: { count: 0, total: 0 },
     converted: { count: 0, total: 0 },
     cancelled: { count: 0, total: 0 },
   };
   state.quotes.forEach((qt) => {
     const amt =
       qt.total !== undefined
         ? Number(qt.total) || 0
         : calcDocTotals(qt.items || [], state.products, qt.discountPct || 0).total;
     s.all.count += 1;
     s.all.total += amt;
     if (qt.status === 'Draft') {
       s.draft.count += 1;
       s.draft.total += amt;
     } else if (qt.status === 'Cancelled' || qt.status === 'Rejected') {
       s.cancelled.count += 1;
       s.cancelled.total += amt;
     } else if (qt.status === 'Converted' || qt.status === 'Accepted') {
       s.converted.count += 1;
       s.converted.total += amt;
     } else {
       s.open.count += 1;
       s.open.total += amt;
     }
   });
   return s;
 }, [state.quotes, state.products]);

 const filteredQuotes = useMemo(() => {
   const q = qtSearch.trim().toLowerCase();
   const now = new Date();
   const list = state.quotes.filter((qt) => {
     if (quoteStatusTab === 'draft' && qt.status !== 'Draft') return false;
     if (
       quoteStatusTab === 'cancelled' &&
       qt.status !== 'Cancelled' &&
       qt.status !== 'Rejected'
     )
       return false;
     if (
       quoteStatusTab === 'converted' &&
       qt.status !== 'Converted' &&
       qt.status !== 'Accepted'
     )
       return false;
     if (
       quoteStatusTab === 'open' &&
       ['Draft', 'Cancelled', 'Rejected', 'Converted', 'Accepted'].includes(qt.status)
     )
       return false;

     const cust = state.customers.find((c) => c.id === qt.customerId);
     const lead = state.leads.find((l) => l.id === qt.customerId);
     const name = cust?.name || lead?.company || qt.customerName || '';
     const matchesQuery =
       !q ||
       (qt.id || '').toLowerCase().includes(q) ||
       name.toLowerCase().includes(q) ||
       (qt.poNumber || '').toLowerCase().includes(q);
     if (!matchesQuery) return false;

     if (qtDateFilter === 'all' || !qt.date) return true;
     const d = new Date(qt.date);
     const diffDays = (now - d) / (1000 * 60 * 60 * 24);
     if (qtDateFilter === 'today') return diffDays <= 1;
     if (qtDateFilter === '7d') return diffDays <= 7;
     if (qtDateFilter === '30d') return diffDays <= 30;
     if (qtDateFilter === 'year') return d.getFullYear() === now.getFullYear();
     return true;
   });

   return [...list].sort((a, b) => {
     if (qtSortBy === 'number') return (a.id || '').localeCompare(b.id || '');
     if (qtSortBy === 'expiry') return (a.expiryDate || '').localeCompare(b.expiryDate || '');
     if (qtSortBy === 'total') {
       const ta =
         a.total ?? calcDocTotals(a.items || [], state.products, a.discountPct || 0).total;
       const tb =
         b.total ?? calcDocTotals(b.items || [], state.products, b.discountPct || 0).total;
       return tb - ta;
     }
     return (b.date || '').localeCompare(a.date || '');
   });
 }, [
   state.quotes,
   state.customers,
   state.leads,
   state.products,
   quoteStatusTab,
   qtSearch,
   qtDateFilter,
   qtSortBy,
 ]);

 const handleExportQuotesCSV = () => {
   if (state.quotes.length === 0) {
     notify('No quotes to export.', 'error');
     return;
   }
   const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
   const rows = ['Quote Code,Lead or Customer,Date,Expiration Date,Status,Subtotal,VAT,Total'];
   state.quotes.forEach((qt) => {
     const cust = state.customers.find((c) => c.id === qt.customerId);
     const lead = state.leads.find((l) => l.id === qt.customerId);
     const totals = calcDocTotals(qt.items || [], state.products, qt.discountPct || 0);
     rows.push(
       [
         qt.id,
         cust?.name || lead?.company || qt.customerName || qt.customerId,
         qt.date,
         qt.expiryDate || '',
         qt.status,
         totals.subtotal.toFixed(2),
         totals.taxTotal.toFixed(2),
         totals.total.toFixed(2),
       ]
         .map(esc)
         .join(',')
     );
   });
   const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `quotes_${new Date().toISOString().slice(0, 10)}.csv`;
   a.click();
   URL.revokeObjectURL(url);
   notify('Exported quotes to CSV.');
 };

 const previewQuote = useMemo(
   () => state.quotes.find((q) => q.id === previewQuoteId) || null,
   [state.quotes, previewQuoteId]
 );

 const openProductPicker = (target) => {
   setPickerSearch('');
   setPickerSelectedIds([]);
   setProductPickerTarget(target);
 };

 const openCustomiseDocumentModal = (type, docObj) => {
   const baseGlobal = {
     ...DEFAULT_DOCUMENT_TEMPLATE.global,
     ...(state.company?.documentTemplate?.global || {}),
   };
   const baseDoc = {
     ...(DEFAULT_DOC_TYPE_OVERRIDES[type] || DEFAULT_DOC_TYPE_OVERRIDES.invoice),
     ...(state.company?.documentTemplate?.docs?.[type] || {}),
   };
   const existingCustom = docObj?.customTemplate || {};
   setCustomiseDraft({
     global: { ...baseGlobal, ...(existingCustom.global || {}) },
     doc: { ...baseDoc, ...(existingCustom.doc || {}) },
   });
   setCustomiseOpenSection('global-appearance');
   setCustomiseTarget({ type, id: docObj.id });
 };
    return (
      <div>
        <OneUpSubTabBar
          accentColor="#00BFA5"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'customers', label: 'Customers' },
            { id: 'quotes', label: 'Quotes' },
            { id: 'invoices', label: 'Invoices' },
            { id: 'payments', label: 'Payments' },
          ]}
          moreTabs={[{ id: 'credits', label: 'Credit Notes & Returns' }]}
        />

        {/* =================================================================== */}
        {/* CUSTOMERS SUB-TAB (7 COMPLETE WORKFLOW VIEWS)                       */}
        {/* =================================================================== */}
        {subTab === 'customers' && (
          <>
            {/* 1. CUSTOMERS LIST VIEW (Screenshot 1) */}
            {customerScreen === 'list' && (
              <div className="max-w-[1160px] mx-auto px-6 pt-6">
                <div className="flex items-center justify-between mb-5">
                  <h1 className="text-[22px] font-normal text-gray-800 tracking-tight">Customers</h1>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openNewCustomerForm}
                      className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer"
                    >
                      New Customer
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                        title="More Customer Actions"
                        className="w-9 h-9 bg-gray-200/70 hover:bg-gray-200 border border-gray-300 rounded-[4px] flex items-center justify-center text-gray-600 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {headerMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setHeaderMenuOpen(false)} />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                            <button
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setImportFileName('');
                                setImportRows([]);
                                setShowImportGuide(false);
                                setCustomerScreen('import');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Import Customers
                            </button>
                            <button
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                openDuplicateScreen();
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Duplicate Customer
                            </button>
                            <button
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setPfList([...(state.priceFamilies || [])]);
                                setModal('price-families');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Edit Price Families
                            </button>
                            <button
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                handleExportCustomersCSV();
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Export Customers
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search + Date Filter + Sort + View Toggle Bar */}
                <div className="bg-white border border-gray-200 rounded-[4px] mb-5 flex flex-wrap items-center justify-between px-3.5 min-h-[44px] gap-2">
                  <div className="flex items-center flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search in Customers"
                      className="w-full text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1.5">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="h-8 px-2.5 border border-gray-200 rounded-[3px] text-xs text-gray-600 bg-white focus:outline-none focus:border-[#4285F4] cursor-pointer"
                    >
                      <option value="all">Any Date</option>
                      <option value="today">Today</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="year">This Year</option>
                    </select>

                    <div className="relative flex items-center border border-gray-200 rounded-[3px] h-8 px-2.5 bg-white">
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs text-gray-600 bg-transparent focus:outline-none cursor-pointer"
                      >
                        <option value="name-asc">Sorted by Name</option>
                        <option value="name-desc">Name (Z → A)</option>
                        <option value="code">Sorted by Code</option>
                        <option value="balance">Balance Due</option>
                      </select>
                    </div>

                    <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden">
                      <button
                        onClick={() => setViewMode('grid')}
                        title="Grid View"
                        className={`p-1.5 cursor-pointer ${viewMode === 'grid' ? 'bg-blue-50 text-[#4285F4]' : 'text-gray-400 hover:bg-gray-50'}`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        title="List View"
                        className={`p-1.5 cursor-pointer ${viewMode === 'list' ? 'bg-blue-50 text-[#4285F4]' : 'text-gray-400 hover:bg-gray-50'}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400">
                    No customers found. Click <strong>New Customer</strong> to add one.
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredCustomers.map((c) => {
                      const openBal = getCustomerOpenBalance(c.id);
                      return (
                        <div
                          key={c.id}
                          className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 transition-colors flex flex-col justify-between"
                        >
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => openCustomerDetail(c)}
                                className="text-[14.5px] font-normal text-[#4285F4] hover:underline text-left cursor-pointer"
                              >
                                {c.name}
                              </button>
                              <span className="text-[11px] text-gray-400 shrink-0">{c.id}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{c.location}</span>
                            </div>
                          </div>

                          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <div>
                              {openBal > 0 ? (
                                <span>
                                  Due: <strong className="text-rose-600">{formatAmount(openBal)}</strong>
                                </span>
                              ) : (
                                <span className="text-gray-400">{c.paymentTerms || 'Due on receipt'}</span>
                              )}
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenCardMenuId(openCardMenuId === c.id ? null : c.id)}
                                className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openCardMenuId === c.id && (
                                <>
                                  <div className="fixed inset-0 z-30" onClick={() => setOpenCardMenuId(null)} />
                                  <div className="absolute right-0 bottom-7 w-44 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1 z-40 text-xs text-gray-700">
                                    <button
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        openCustomerDetail(c);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                    >
                                      Open Customer
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        openEditCustomerForm(c);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                    >
                                      Edit Customer
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        setSelectedCustomerId(c.id);
                                        setCustomerScreen('statement');
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                    >
                                      View Statement
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        openDuplicateScreen(c.id);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        deleteCustomer(c.id);
                                      }}
                                      className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 border-t border-gray-100 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                          <th className="py-3 px-4 font-medium">Code</th>
                          <th className="py-3 px-4 font-medium">Customer</th>
                          <th className="py-3 px-4 font-medium">Email</th>
                          <th className="py-3 px-4 font-medium">Location</th>
                          <th className="py-3 px-4 font-medium">Terms</th>
                          <th className="py-3 px-4 font-medium text-right">Balance Due</th>
                          <th className="py-3 px-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredCustomers.map((c) => {
                          const openBal = getCustomerOpenBalance(c.id);
                          return (
                            <tr key={c.id} className="hover:bg-gray-50/60">
                              <td className="py-3 px-4 text-gray-400">{c.id}</td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => openCustomerDetail(c)}
                                  className="text-[#4285F4] font-medium hover:underline cursor-pointer"
                                >
                                  {c.name}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{c.email || '—'}</td>
                              <td className="py-3 px-4 text-gray-600">{c.location}</td>
                              <td className="py-3 px-4 text-gray-600">{c.paymentTerms}</td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {formatAmount(openBal)}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openEditCustomerForm(c)}
                                  className="text-[#4285F4] hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomerId(c.id);
                                    setCustomerScreen('statement');
                                  }}
                                  className="text-gray-600 hover:underline cursor-pointer"
                                >
                                  Statement
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. IMPORT CUSTOMERS FULL-SCREEN VIEW (Screenshot 2) */}
            {customerScreen === 'import' && (
              <div>
                <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCustomerScreen('list')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-[17px] font-normal text-gray-700">Import Customers</h2>
                  <div className="w-12" />
                </div>

                <div className="max-w-[960px] mx-auto px-6 pt-6">
                  <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                    <div className="p-6 space-y-6">
                      <div className="bg-[#DDF0FF] border border-[#B8DFFA] rounded-[3px] p-4 text-[13px] text-[#31708F] space-y-2.5">
                        <p>Iven requires your customer list to be in a special format.</p>
                        <p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowImportGuide(!showImportGuide);
                              handleDownloadImportTemplate();
                            }}
                            className="text-[#2563EB] font-semibold underline hover:text-blue-800 cursor-pointer"
                          >
                            Use this guide
                          </button>{' '}
                          to prepare your customer list for importing.
                        </p>
                        {showImportGuide && (
                          <div className="pt-2 text-xs text-gray-700 bg-white/80 p-3 rounded border border-blue-200">
                            Downloaded <strong>iven_customer_import_template.csv</strong>. Supported columns:{' '}
                            <code>Code, Type, Name, Email, Phone, Website, VAT Number, Billing Address, Line 2, City, State, Post Code, Country, Payment Terms, Industry, Notes</code>.
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-6 px-4 py-2">
                        <span className="text-[13px] font-semibold text-gray-600">File to import</span>
                        <label className="px-4 py-2 bg-[#E5E7EB] hover:bg-gray-300 border border-gray-300 rounded-[3px] text-xs font-medium text-[#2563EB] cursor-pointer">
                          Upload files
                          <input
                            type="file"
                            accept=".csv,.txt"
                            className="hidden"
                            onChange={(e) => handleImportFileUpload(e.target.files?.[0])}
                          />
                        </label>
                        {importFileName && (
                          <span className="text-xs text-gray-600">
                            Selected: <strong>{importFileName}</strong> ({importRows.length} valid customer(s) ready)
                          </span>
                        )}
                      </div>

                      {importRows.length > 0 && (
                        <div className="border border-gray-200 rounded overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                                <th className="py-2.5 px-3">Code</th>
                                <th className="py-2.5 px-3">Name</th>
                                <th className="py-2.5 px-3">Email</th>
                                <th className="py-2.5 px-3">City / Country</th>
                                <th className="py-2.5 px-3">Terms</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {importRows.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-mono text-gray-400">{row.code || 'Auto'}</td>
                                  <td className="py-2 px-3 font-medium text-gray-800">{row.name}</td>
                                  <td className="py-2 px-3 text-gray-600">{row.email || '—'}</td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {[row.city, row.country].filter(Boolean).join(', ')}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">{row.paymentTerms}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/40 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomerScreen('list')}
                        className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      {importRows.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            importCustomers(importRows);
                            setCustomerScreen('list');
                          }}
                          className="px-5 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                        >
                          Import {importRows.length} Customer(s)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DUPLICATE CUSTOMER FULL-SCREEN VIEW (Screenshot 3) */}
            {customerScreen === 'duplicate' && (
              <div>
                <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCustomerScreen('list')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-[17px] font-normal text-gray-700">Duplicate Customer</h2>
                  <div className="w-12" />
                </div>

                <div className="max-w-[960px] mx-auto px-6 pt-6">
                  <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
                    <div className="p-6 space-y-5 text-xs">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Info className="w-4 h-4 text-gray-700 shrink-0" />
                        <span>
                          Once you've selected the Account to duplicate and saved this window, you can access your new Duplicated Account in View my Accounts.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-1">
                        <label className="sm:col-span-4 sm:text-right font-semibold text-gray-700">
                          How do you want the Code to be generated?<span className="text-rose-500">*</span>
                        </label>
                        <div className="sm:col-span-7">
                          <select
                            value={dupCodeMode}
                            onChange={(e) => setDupCodeMode(e.target.value)}
                            className="w-full border-b-2 border-[#4285F4] py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none"
                          >
                            <option value="Automatically">Automatically</option>
                            <option value="Manually">Manually</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center border border-gray-300 rounded-[3px] bg-white px-2.5 py-1.5">
                          <Search className="w-3.5 h-3.5 text-[#4285F4] mr-2" />
                          <select
                            value={dupSourceId}
                            onChange={(e) => setDupSourceId(e.target.value)}
                            className="text-xs font-medium text-[#4285F4] bg-transparent focus:outline-none cursor-pointer min-w-[180px]"
                          >
                            <option value="">Select Account...</option>
                            {state.customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.id} — {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {dupCodeMode === 'Manually' && (
                          <input
                            value={dupManualCode}
                            onChange={(e) => setDupManualCode(e.target.value)}
                            placeholder="Enter Custom Code (e.g. CUS-009)"
                            className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-xs w-56 focus:outline-none focus:border-[#4285F4]"
                          />
                        )}
                      </div>

                      <div className="border-t border-gray-200 pt-3">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-700">
                              <th className="py-2.5 px-2 font-semibold w-1/3">Code</th>
                              <th className="py-2.5 px-2 font-semibold">Name</th>
                              <th className="py-2.5 px-2 w-12" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {dupQueue.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="py-4 px-2 text-gray-400">
                                  No items to show
                                </td>
                              </tr>
                            ) : (
                              dupQueue.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="py-2.5 px-2 font-mono text-gray-700">{item.code}</td>
                                  <td className="py-2.5 px-2">
                                    <input
                                      value={item.name}
                                      onChange={(e) =>
                                        setDupQueue((prev) =>
                                          prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                                        )
                                      }
                                      className="px-2 py-1 border border-gray-200 rounded text-xs w-full max-w-sm"
                                    />
                                  </td>
                                  <td className="py-2.5 px-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setDupQueue((prev) => prev.filter((_, i) => i !== idx))}
                                      className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            const src = state.customers.find((c) => c.id === dupSourceId);
                            if (!src) {
                              notify('Select a customer account first.', 'error');
                              return;
                            }
                            const nextCode =
                              dupCodeMode === 'Manually' && dupManualCode.trim()
                                ? dupManualCode.trim()
                                : getNextAutoDupCode();
                            setDupQueue((prev) => [
                              ...prev,
                              {
                                code: nextCode,
                                name: `${src.name} (Copy)`,
                                sourceId: src.id,
                              },
                            ]);
                            setDupManualCode('');
                          }}
                          className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate Account</span>
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50/40 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomerScreen('list')}
                        className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (dupQueue.length === 0) {
                            notify('Click "Duplicate Account" first to add a copy.', 'error');
                            return;
                          }
                          dupQueue.forEach((item) => {
                            const src = state.customers.find((c) => c.id === item.sourceId);
                            if (src) {
                              addCustomer({
                                ...src,
                                code: item.code,
                                name: item.name,
                                createdAt: new Date().toISOString().slice(0, 10),
                              });
                            }
                          });
                          setCustomerScreen('list');
                        }}
                        className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CUSTOMER DETAIL VIEW (Screenshots 4 & 5) */}
            {customerScreen === 'detail' && activeCustomer && (
              <div>
                {/* Top Sub-Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCustomerScreen('list')}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <h2 className="text-[17px] font-normal text-gray-700">
                    Customer {activeCustomer.name}
                  </h2>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNewActionOpen(!newActionOpen)}
                      className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <span>New Action</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {newActionOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setNewActionOpen(false)} />
                        <div className="absolute right-0 mt-1 w-52 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              openNewInvoiceEditor(activeCustomer.id);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Invoice
                          </button>
                          <button
                         onClick={() => {
                           setNewActionOpen(false);
                           openNewQuoteEditor(activeCustomer.id);
                         }}
                         className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                       >
                         New Quote
                       </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              openDocModalForCustomer('sales-order', activeCustomer.id);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Sales Order
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              const openInv = state.invoices.find(
                                (i) =>
                                  i.customerId === activeCustomer.id &&
                                  i.status !== 'Paid' &&
                                  i.status !== 'Credited' &&
                                  i.status !== 'Draft' &&
                                  i.status !== 'Cancelled'
                              );
                              if (!openInv) {
                                notify('No open invoices due for this customer.');
                                return;
                              }
                              setSelectedInvoice(openInv);
                              setPayAmount(String(Math.max(0, (openInv.total - openInv.amountPaid).toFixed(2))));
                              setModal('payment');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            Receive Customer Payment
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              openDocModalForCustomer('sales-receipt', activeCustomer.id);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Sales Receipt
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              const targetInv = state.invoices.find(
                                (i) =>
                                  i.customerId === activeCustomer.id &&
                                  i.status !== 'Credited' &&
                                  i.status !== 'Draft' &&
                                  i.status !== 'Cancelled'
                              );
                              if (!targetInv) {
                                notify('No invoice available to credit for this customer.');
                                return;
                              }
                              issueCreditNote(targetInv);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Credit Memo
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              setCrmQuickForm({
                                title: '',
                                contact: activeCustomer.name,
                                value: '5000',
                                dueDate: new Date().toISOString().slice(0, 10),
                              });
                              setModal('task');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Task
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              setCrmQuickForm({
                                title: '',
                                contact: activeCustomer.name,
                                value: '5000',
                                dueDate: new Date().toISOString().slice(0, 10),
                              });
                              setModal('call');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Call
                          </button>
                          <button
                            onClick={() => {
                              setNewActionOpen(false);
                              setCrmQuickForm({
                                title: `${activeCustomer.name} Expansion`,
                                contact: activeCustomer.name,
                                value: '10000',
                                dueDate: new Date().toISOString().slice(0, 10),
                              });
                              setModal('opportunity');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                          >
                            New Opportunity
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Two-Column Body */}
                <div className="max-w-[1220px] mx-auto px-6 pt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* LEFT SIDEBAR: Info & Balance Due Card */}
                  <div className="lg:col-span-3 bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-4 space-y-5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-[15px] font-normal text-gray-800">Info</h3>
                        <button
                          type="button"
                          onClick={() => openEditCustomerForm(activeCustomer)}
                          title="Edit Customer Info"
                          className="p-1 text-[#4285F4] hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2 text-gray-600">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{activeCustomer.location}</span>
                        </div>
                        {activeCustomer.email && (
                          <div className="text-gray-500 pl-5">{activeCustomer.email}</div>
                        )}
                        {activeCustomer.phone && (
                          <div className="text-gray-500 pl-5">{activeCustomer.phone}</div>
                        )}
                        {activeCustomer.taxId && (
                          <div className="text-gray-400 pl-5">VAT/Tax: {activeCustomer.taxId}</div>
                        )}
                        {activeCustomer.priceFamily && activeCustomer.priceFamily !== 'None' && (
                          <div className="pl-5">
                            <span className="px-2 py-0.5 bg-blue-50 text-[#4285F4] rounded text-[11px]">
                              {activeCustomer.priceFamily}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-[15px] font-normal text-gray-800 mb-1">Balance Due</h3>
                      {getCustomerOpenBalance(activeCustomer.id) > 0 && (
                        <div className="text-sm font-semibold text-gray-900 mb-1.5">
                          {formatAmount(getCustomerOpenBalance(activeCustomer.id))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowStmtFilters(false);
                          setStmtFromDate('');
                          setStmtToDate('');
                          setStmtOnlyOpen(false);
                          setCustomerScreen('statement');
                        }}
                        className="text-[#4285F4] hover:underline font-normal cursor-pointer"
                      >
                        View Customer Statement
                      </button>
                    </div>
                  </div>

                  {/* RIGHT CONTENT: Activity / Invoice Tabs + Search + Cards */}
                  <div className="lg:col-span-9 space-y-4">
                    <div className="bg-white border border-gray-200 rounded-[4px] flex items-center px-2">
                      <button
                        type="button"
                        onClick={() => setDetailTab('activity')}
                        className={`relative px-5 py-3 text-[13px] flex items-center gap-2 cursor-pointer ${
                          detailTab === 'activity' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <span>Activity</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            detailTab === 'activity'
                              ? 'bg-[#4285F4] text-white'
                              : 'border border-gray-300 text-gray-500'
                          }`}
                        >
                          {customerDetailItems.allActivity.length}
                        </span>
                        {detailTab === 'activity' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4285F4]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailTab('invoice')}
                        className={`relative px-5 py-3 text-[13px] flex items-center gap-2 cursor-pointer ${
                          detailTab === 'invoice' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <span>Invoice</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] ${
                            detailTab === 'invoice'
                              ? 'bg-[#4285F4] text-white'
                              : 'border border-gray-300 text-gray-500'
                          }`}
                        >
                          {customerDetailItems.invoicesOnly.length}
                        </span>
                        {detailTab === 'invoice' && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4285F4]" />
                        )}
                      </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-[4px] px-3.5 h-11 flex items-center">
                      <Search className="w-4 h-4 text-gray-400 mr-2.5" />
                      <input
                        value={detailSearch}
                        onChange={(e) => setDetailSearch(e.target.value)}
                        placeholder="Search results"
                        className="w-full text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
                      />
                    </div>

                    {(() => {
                      const items =
                        detailTab === 'activity'
                          ? customerDetailItems.allActivity
                          : customerDetailItems.invoicesOnly;

                      if (items.length === 0) {
                        return (
                          <div className="bg-white border border-gray-200 rounded-[4px] p-10 text-center text-xs text-gray-400">
                            No {detailTab === 'activity' ? 'activity' : 'invoices'} found for {activeCustomer.name}. Use{' '}
                            <strong>New Action</strong> above to create one.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((item) => {
                            const lateDays =
                              item.kind === 'invoice' ? getDaysLate(item.dueDate, item.status) : 0;
                            const isUnpaid =
                              item.kind === 'invoice' &&
                              item.status !== 'Paid' &&
                              item.status !== 'Credited' &&
                              item.status !== 'Draft' &&
                              item.status !== 'Cancelled';

                            return (
                              <div
                                key={`${item.kind}-${item.id}`}
                                className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between"
                              >
                                <div className="p-4 space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    {item.kind === 'invoice' ? (
                                      <button
                                        type="button"
                                        onClick={() => openExistingInvoiceEditor(item.raw, 1)}
                                        className="text-[14px] text-[#4285F4] hover:underline font-normal text-left cursor-pointer"
                                      >
                                        {item.title}
                                      </button>
                                    ) : (
                                      <span className="text-[14px] text-[#4285F4] font-normal">
                                        {item.title}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-gray-400">
                                      {formatShortDate(item.date)}
                                    </span>
                                  </div>

                                  <div className="text-[11.5px] text-gray-500 uppercase">
                                    {activeCustomer.name}
                                  </div>

                                  <div className="pt-2 flex items-center justify-between">
                                    <div>
                                      {lateDays > 0 ? (
                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-medium rounded">
                                          {lateDays} {lateDays === 1 ? 'day' : 'days'} late
                                        </span>
                                      ) : (
                                        <StatusBadge status={item.status} />
                                      )}
                                    </div>
                                    <span
                                      className={`text-[14px] font-semibold ${
                                        isUnpaid ? 'text-rose-600' : 'text-gray-800'
                                      }`}
                                    >
                                      {formatAmount(item.amount)}
                                    </span>
                                  </div>
                                </div>

                                <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                  <div className="flex items-center gap-3">
                                    {item.kind === 'invoice' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isUnpaid) {
                                            setSelectedInvoice(item.raw);
                                            setPayAmount(String(item.balance));
                                            setModal('payment');
                                          } else {
                                            notify(`Delivery note prepared for ${item.id}.`);
                                          }
                                        }}
                                        className="flex items-center gap-1 hover:text-gray-800 font-medium uppercase cursor-pointer"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>{isUnpaid ? 'DELIVER / PAY' : 'DELIVER'}</span>
                                      </button>
                                    )}
                                    {item.kind === 'quote' && item.status !== 'Converted' && (
                                      <button
                                        type="button"
                                        onClick={() => convertQuoteToOrder(item.id)}
                                        className="text-[#4285F4] hover:underline font-medium cursor-pointer"
                                      >
                                        CONVERT TO ORDER
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-gray-400">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (item.kind === 'invoice') {
                                          setSubTab('invoices');
                                          setPreviewInvoiceId(item.id);
                                        } else {
                                          notify(
                                            `Sent ${item.title} to ${activeCustomer.email || activeCustomer.name}.`
                                          );
                                        }
                                      }}
                                      title="Preview / Email Document"
                                      className="hover:text-gray-700 cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 5. CUSTOMER STATEMENT VIEW (Screenshot 6) */}
            {customerScreen === 'statement' && activeCustomer && (
              <div>
                <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCustomerScreen('detail')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-[17px] font-normal text-gray-700">Customer Statement</h2>
                  <div className="w-12" />
                </div>

                <div className="max-w-[1140px] mx-auto px-6 pt-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowStmtFilters(!showStmtFilters)}
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                    >
                      {showStmtFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          notify(
                            `Customer Statement emailed to ${activeCustomer.email || activeCustomer.name}.`
                          )
                        }
                        className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                      >
                        Download as PDF
                      </button>
                    </div>
                  </div>

                  {showStmtFilters && (
                    <div className="bg-white border border-gray-200 rounded-[4px] p-4 flex flex-wrap items-end gap-4 text-xs">
                      <div>
                        <label className="block text-gray-500 mb-1">From Date</label>
                        <input
                          type="date"
                          value={stmtFromDate}
                          onChange={(e) => setStmtFromDate(e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 mb-1">To Date</label>
                        <input
                          type="date"
                          value={stmtToDate}
                          onChange={(e) => setStmtToDate(e.target.value)}
                          className="px-2.5 py-1.5 border border-gray-300 rounded"
                        />
                      </div>
                      <label className="flex items-center gap-2 pb-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stmtOnlyOpen}
                          onChange={(e) => setStmtOnlyOpen(e.target.checked)}
                        />
                        <span>Open / Unpaid items only</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setStmtFromDate('');
                          setStmtToDate('');
                          setStmtOnlyOpen(false);
                        }}
                        className="text-[#4285F4] hover:underline pb-1.5 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {/* Blue Customer Balance Banner */}
                  <div className="bg-[#4285F4] text-white rounded-[4px] px-5 py-4 shadow-2xs">
                    <div className="text-[14px] font-semibold uppercase tracking-wide">
                      {activeCustomer.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider opacity-90 mt-2">
                      BALANCE:
                    </div>
                    <div className="text-[20px] font-normal mt-0.5">
                      {formatAmount(customerStatementData.closingBalance)}
                    </div>
                  </div>

                  {/* Statement Transactions Table */}
                  <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500">
                          <th className="py-3.5 px-5 font-medium w-40">Date</th>
                          <th className="py-3.5 px-5 font-medium">Description</th>
                          <th className="py-3.5 px-5 font-medium text-right w-36">Amount</th>
                          <th className="py-3.5 px-5 font-medium text-right w-36">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customerStatementData.rows.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/60">
                            <td className="py-3.5 px-5 text-gray-700">{formatShortDate(r.date)}</td>
                            <td className="py-3.5 px-5">
                              {r.linkType === 'invoice' ? (
                                <button
                                  type="button"
                                  onClick={() => setCustomerScreen('detail')}
                                  className="text-[#4285F4] hover:underline cursor-pointer"
                                >
                                  {r.description}
                                </button>
                              ) : (
                                <span className="text-gray-700">{r.description}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right text-gray-700">
                              {r.amount.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-right text-gray-700">
                              {r.balance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 6. NEW / EDIT CUSTOMER FULL-SCREEN FORM (Screenshots 7 & 8) */}
            {(customerScreen === 'new' || customerScreen === 'edit') && (
              <div>
                <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setCustomerScreen(customerScreen === 'edit' && activeCustomer ? 'detail' : 'list')
                    }
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-[17px] font-normal text-gray-700">
                    {customerScreen === 'edit' ? 'Edit Customer' : 'New Customer'}
                  </h2>
                  <div className="w-12" />
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customerScreen === 'edit' && activeCustomer) {
                      updateCustomer(activeCustomer.id, custForm);
                      setCustomerScreen('detail');
                    } else {
                      addCustomer(custForm);
                      setCustomerScreen('list');
                    }
                  }}
                  className="max-w-[1000px] mx-auto px-6 pt-5 pb-12"
                >
                  <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-gray-200">
                    {/* OVERVIEW SECTION */}
                    <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                        Overview
                      </div>
                      <div className="md:col-span-8 space-y-3.5">
                        <div className="inline-flex rounded-[3px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setCustForm({ ...custForm, customerType: 'Company' })}
                            className={segBtnCls(custForm.customerType === 'Company')}
                          >
                            Company
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustForm({ ...custForm, customerType: 'Individual' })}
                            className={`${segBtnCls(custForm.customerType === 'Individual')} border-l-0`}
                          >
                            Individual
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            required
                            placeholder={
                              custForm.customerType === 'Company' ? 'Company Name' : 'Full Name'
                            }
                            value={custForm.name}
                            onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                            className={`${underlineInputCls} pr-6`}
                          />
                          <span className="absolute right-2.5 top-2.5 text-[#4285F4] text-xs font-bold">
                            *
                          </span>
                        </div>

                        <div>
                          <input
                            type="email"
                            placeholder="Email"
                            value={custForm.email}
                            onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                            className={underlineInputCls}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <input
                            placeholder="Phone Number"
                            value={custForm.phone}
                            onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                            className={underlineInputCls}
                          />
                          <input
                            placeholder="Website"
                            value={custForm.website}
                            onChange={(e) => setCustForm({ ...custForm, website: e.target.value })}
                            className={underlineInputCls}
                          />
                        </div>

                        <div>
                          <input
                            placeholder="VAT Number"
                            value={custForm.taxId}
                            onChange={(e) => setCustForm({ ...custForm, taxId: e.target.value })}
                            className={underlineInputCls}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ADDRESS SECTION */}
                    <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                        Address
                      </div>
                      <div className="md:col-span-8 space-y-3.5">
                        <input
                          placeholder="Billing address"
                          value={custForm.billingAddress}
                          onChange={(e) =>
                            setCustForm({ ...custForm, billingAddress: e.target.value })
                          }
                          className={underlineInputCls}
                        />
                        <input
                          placeholder="Line 2"
                          value={custForm.addressLine2}
                          onChange={(e) =>
                            setCustForm({ ...custForm, addressLine2: e.target.value })
                          }
                          className={underlineInputCls}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          <input
                            placeholder="City"
                            value={custForm.city}
                            onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
                            className={underlineInputCls}
                          />
                          {custForm.country === 'India' ? (
                            <select
                              value={custForm.state}
                              onChange={(e) => setCustForm({ ...custForm, state: e.target.value })}
                              className={underlineInputCls}
                            >
                              <option value="">State</option>
                              {INDIAN_STATES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              placeholder="State"
                              value={custForm.state}
                              onChange={(e) => setCustForm({ ...custForm, state: e.target.value })}
                              className={underlineInputCls}
                            />
                          )}
                          <input
                            placeholder="Post Code"
                            value={custForm.postCode}
                            onChange={(e) => setCustForm({ ...custForm, postCode: e.target.value })}
                            className={underlineInputCls}
                          />
                        </div>

                        <div className="max-w-[240px]">
                          <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                            <div className="text-[10.5px] text-gray-400">Country</div>
                            <select
                              value={custForm.country}
                              onChange={(e) => setCustForm({ ...custForm, country: e.target.value })}
                              className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                            >
                              {COUNTRY_OPTIONS.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 pt-1 text-xs text-gray-700">
                          <span className="max-w-[140px] leading-snug">
                            Use same address for delivery
                          </span>
                          <div className="inline-flex rounded-[3px] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setCustForm({ ...custForm, sameAsBilling: true })}
                              className={`px-3.5 py-1.5 text-xs border cursor-pointer ${
                                custForm.sameAsBilling
                                  ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                  : 'bg-white text-[#4285F4] border-gray-300'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustForm({ ...custForm, sameAsBilling: false })}
                              className={`px-3.5 py-1.5 text-xs border border-l-0 cursor-pointer ${
                                !custForm.sameAsBilling
                                  ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                  : 'bg-white text-[#4285F4] border-gray-300'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {!custForm.sameAsBilling && (
                          <div className="pt-3 mt-2 border-t border-gray-100 space-y-3">
                            <div className="text-xs font-semibold text-gray-600">
                              Delivery Address
                            </div>
                            <input
                              placeholder="Delivery address"
                              value={custForm.shippingAddress}
                              onChange={(e) =>
                                setCustForm({ ...custForm, shippingAddress: e.target.value })
                              }
                              className={underlineInputCls}
                            />
                            <input
                              placeholder="Line 2"
                              value={custForm.shippingLine2}
                              onChange={(e) =>
                                setCustForm({ ...custForm, shippingLine2: e.target.value })
                              }
                              className={underlineInputCls}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                              <input
                                placeholder="City"
                                value={custForm.shippingCity}
                                onChange={(e) =>
                                  setCustForm({ ...custForm, shippingCity: e.target.value })
                                }
                                className={underlineInputCls}
                              />
                              <input
                                placeholder="State"
                                value={custForm.shippingState}
                                onChange={(e) =>
                                  setCustForm({ ...custForm, shippingState: e.target.value })
                                }
                                className={underlineInputCls}
                              />
                              <input
                                placeholder="Post Code"
                                value={custForm.shippingPostCode}
                                onChange={(e) =>
                                  setCustForm({ ...custForm, shippingPostCode: e.target.value })
                                }
                                className={underlineInputCls}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CONTACTS SECTION */}
                    <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                        Contacts
                      </div>
                      <div className="md:col-span-9 space-y-3">
                        {custForm.contacts.length === 0 ? (
                          <div className="text-xs text-gray-400">No items to show</div>
                        ) : (
                          <div className="space-y-2.5">
                            {custForm.contacts.map((ct, idx) => (
                              <div
                                key={ct.id || idx}
                                className="grid grid-cols-12 gap-2 items-center"
                              >
                                <input
                                  placeholder="First Name"
                                  value={ct.firstName}
                                  onChange={(e) => {
                                    const copy = [...custForm.contacts];
                                    copy[idx] = { ...copy[idx], firstName: e.target.value };
                                    setCustForm({ ...custForm, contacts: copy });
                                  }}
                                  className={`col-span-3 ${underlineInputCls}`}
                                />
                                <div className="col-span-3 relative">
                                  <input
                                    required
                                    placeholder="Last Name"
                                    value={ct.lastName}
                                    onChange={(e) => {
                                      const copy = [...custForm.contacts];
                                      copy[idx] = { ...copy[idx], lastName: e.target.value };
                                      setCustForm({ ...custForm, contacts: copy });
                                    }}
                                    className={`${underlineInputCls} pr-5`}
                                  />
                                  <span className="absolute right-2 top-2.5 text-[#4285F4] text-xs font-bold">
                                    *
                                  </span>
                                </div>
                                <input
                                  type="email"
                                  placeholder="Email"
                                  value={ct.email}
                                  onChange={(e) => {
                                    const copy = [...custForm.contacts];
                                    copy[idx] = { ...copy[idx], email: e.target.value };
                                    setCustForm({ ...custForm, contacts: copy });
                                  }}
                                  className={`col-span-3 ${underlineInputCls}`}
                                />
                                <input
                                  placeholder="Phone"
                                  value={ct.phone}
                                  onChange={(e) => {
                                    const copy = [...custForm.contacts];
                                    copy[idx] = { ...copy[idx], phone: e.target.value };
                                    setCustForm({ ...custForm, contacts: copy });
                                  }}
                                  className={`col-span-2 ${underlineInputCls}`}
                                />
                                <div className="col-span-1 flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCustForm({
                                        ...custForm,
                                        contacts: custForm.contacts.filter((_, i) => i !== idx),
                                      })
                                    }
                                    title="Remove Contact"
                                    className="p-1.5 border border-rose-300 text-rose-500 hover:bg-rose-50 rounded-[3px] cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              setCustForm({
                                ...custForm,
                                contacts: [
                                  ...custForm.contacts,
                                  {
                                    id: `CNT-${Date.now()}`,
                                    firstName: '',
                                    lastName: '',
                                    email: '',
                                    phone: '',
                                  },
                                ],
                              })
                            }
                            className="px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] text-xs font-medium cursor-pointer"
                          >
                            New Customer Contact
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ADVANCED COLLAPSIBLE SECTION */}
                    <div className="divide-y divide-gray-200">
                      <div className="px-7 py-4">
                        <button
                          type="button"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4285F4] hover:underline cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              showAdvanced ? '' : '-rotate-90'
                            }`}
                          />
                          <span>Advanced</span>
                        </button>
                      </div>

                      {showAdvanced && (
                        <>
                          {/* FINANCE SUB-SECTION */}
                          <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                              Finance
                            </div>
                            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                <div className="text-[10.5px] text-gray-400">Payment Terms</div>
                                <select
                                  value={custForm.paymentTerms}
                                  onChange={(e) =>
                                    setCustForm({ ...custForm, paymentTerms: e.target.value })
                                  }
                                  className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                                >
                                  <option value="Due on receipt">Due on receipt</option>
                                  <option value="Net 15">Net 15</option>
                                  <option value="Net 30">Net 30</option>
                                  <option value="Net 45">Net 45</option>
                                  <option value="Net 60">Net 60</option>
                                </select>
                              </div>

                              <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                <div className="text-[10.5px] text-gray-400">Price Family</div>
                                <select
                                  value={custForm.priceFamily}
                                  onChange={(e) =>
                                    setCustForm({ ...custForm, priceFamily: e.target.value })
                                  }
                                  className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                                >
                                  <option value="None">None</option>
                                  {(state.priceFamilies || []).map((pf) => (
                                    <option key={pf.id} value={pf.name}>
                                      {pf.name} ({pf.discountPct}% off)
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                <div className="text-[10.5px] text-gray-400">Sales Tax</div>
                                <select
                                  value={custForm.salesTax}
                                  onChange={(e) =>
                                    setCustForm({ ...custForm, salesTax: e.target.value })
                                  }
                                  className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                                >
                                  <option value="None">None</option>
                                  <option value="GST 5%">GST 5%</option>
                                  <option value="GST 12%">GST 12%</option>
                                  <option value="GST 18%">GST 18%</option>
                                  <option value="Tax Exempt">Tax Exempt</option>
                                </select>
                              </div>

                              <div className="flex items-center justify-between gap-3 px-1 text-xs text-gray-700">
                                <span className="leading-snug">
                                  Priority VAT on the product VAT
                                </span>
                                <div className="inline-flex rounded-[3px] overflow-hidden shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setCustForm({ ...custForm, priorityVat: true })}
                                    className={`px-3 py-1.5 text-xs border cursor-pointer ${
                                      custForm.priorityVat
                                        ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                        : 'bg-white text-[#4285F4] border-gray-300'
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustForm({ ...custForm, priorityVat: false })}
                                    className={`px-3 py-1.5 text-xs border border-l-0 cursor-pointer ${
                                      !custForm.priorityVat
                                        ? 'bg-[#93C5FD] text-white border-[#93C5FD]'
                                        : 'bg-white text-[#4285F4] border-gray-300'
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* BUSINESS SUB-SECTION */}
                          <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                              Business
                            </div>
                            <div className="md:col-span-8 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                  placeholder="Code (auto-generated if blank)"
                                  disabled={customerScreen === 'edit'}
                                  value={custForm.code}
                                  onChange={(e) =>
                                    setCustForm({ ...custForm, code: e.target.value })
                                  }
                                  className={`${underlineInputCls} disabled:bg-gray-50 disabled:text-gray-400`}
                                />

                                <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                  <div className="text-[10.5px] text-gray-400">Employee Count</div>
                                  <input
                                    type="number"
                                    min={1}
                                    value={custForm.employeeCount}
                                    onChange={(e) =>
                                      setCustForm({
                                        ...custForm,
                                        employeeCount: Number(e.target.value) || 1,
                                      })
                                    }
                                    className="w-full text-[13px] text-gray-800 focus:outline-none"
                                  />
                                </div>

                                <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                  <div className="text-[10.5px] text-gray-400">Industry</div>
                                  <select
                                    value={custForm.industry}
                                    onChange={(e) =>
                                      setCustForm({ ...custForm, industry: e.target.value })
                                    }
                                    className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                                  >
                                    <option value="None">None</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Hospitality">Hospitality</option>
                                    <option value="Manufacturing">Manufacturing</option>
                                    <option value="Wholesale">Wholesale</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Services">Services</option>
                                  </select>
                                </div>

                                <div className="border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                  <div className="text-[10.5px] text-gray-400">
                                    Incorporation Status
                                  </div>
                                  <select
                                    value={custForm.incorporationStatus}
                                    onChange={(e) =>
                                      setCustForm({
                                        ...custForm,
                                        incorporationStatus: e.target.value,
                                      })
                                    }
                                    className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                                  >
                                    <option value="None">None</option>
                                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                                    <option value="Partnership">Partnership</option>
                                    <option value="LLP">LLP</option>
                                    <option value="Private Limited">Private Limited</option>
                                    <option value="Corporation">Corporation</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center gap-12 text-xs text-gray-700 pt-1">
                                <span>Opt-in to Emails</span>
                                <div className="inline-flex rounded-[3px] overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => setCustForm({ ...custForm, optInEmails: true })}
                                    className={`px-3.5 py-1.5 text-xs border cursor-pointer ${
                                      custForm.optInEmails
                                        ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                        : 'bg-white text-[#4285F4] border-gray-300'
                                    }`}
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setCustForm({ ...custForm, optInEmails: false })}
                                    className={`px-3.5 py-1.5 text-xs border border-l-0 cursor-pointer ${
                                      !custForm.optInEmails
                                        ? 'bg-[#4285F4] text-white border-[#4285F4]'
                                        : 'bg-white text-[#4285F4] border-gray-300'
                                    }`}
                                  >
                                    No
                                  </button>
                                </div>
                              </div>

                              <div className="max-w-[340px] border border-gray-200 rounded-[3px] px-3 py-1.5 bg-white">
                                <div className="text-[10.5px] text-gray-400">
                                  Create an account based on another account
                                </div>
                                <select
                                  value={custForm.baseAccount}
                                  onChange={(e) =>
                                    setCustForm({ ...custForm, baseAccount: e.target.value })
                                  }
                                  className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none truncate"
                                >
                                  <option value="11100 (Accounts Receivable:Miscellaneous Customer)">
                                    11100 (Accounts Receivable:Miscellaneous Customer)
                                  </option>
                                  {state.customers.map((c) => (
                                    <option
                                      key={c.id}
                                      value={`11100 (Accounts Receivable:${c.name})`}
                                    >
                                      11100 (Accounts Receivable:{c.name})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* NOTES SUB-SECTION */}
                          <div className="p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                              Notes
                            </div>
                            <div className="md:col-span-8">
                              <textarea
                                rows={4}
                                placeholder="Notes"
                                value={custForm.notes}
                                onChange={(e) =>
                                  setCustForm({ ...custForm, notes: e.target.value })
                                }
                                className={underlineInputCls}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* FOOTER CANCEL / DONE */}
                    <div className="px-7 py-3.5 bg-gray-50/40 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setCustomerScreen(
                            customerScreen === 'edit' && activeCustomer ? 'detail' : 'list'
                          )
                        }
                        className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* =================================================================== */}
        {/* QUOTES, INVOICES, PAYMENTS, CREDITS TABS                            */}
        {/* =================================================================== */}
        {subTab !== 'customers' && (
          <div className="max-w-[1160px] mx-auto px-6 pt-6">
            {subTab === 'quotes' && (
              <>
                {/* 1. QUOTES LIST & GRID VIEW */}
                {quoteScreen === 'list' && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h1 className="text-[22px] font-normal text-gray-800 tracking-tight">
                        Quotes
                      </h1>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openNewQuoteEditor()}
                          className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer"
                        >
                          New Quote
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setQtHeaderMenuOpen(!qtHeaderMenuOpen)}
                            className="w-9 h-9 bg-white hover:bg-gray-50 border border-gray-200 rounded-[4px] flex items-center justify-center text-gray-500 cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {qtHeaderMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setQtHeaderMenuOpen(false)}
                              />
                              <div className="absolute right-0 mt-1 w-52 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQtHeaderMenuOpen(false);
                                    handleExportQuotesCSV();
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  Export Quotes
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Search + Date + Sort + View Bar */}
                    <div className="bg-white border border-gray-200 rounded-[4px] mb-4 flex flex-wrap items-center justify-between px-3.5 min-h-[44px] gap-2">
                      <div className="flex items-center flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                        <input
                          value={qtSearch}
                          onChange={(e) => setQtSearch(e.target.value)}
                          placeholder="Search in Quotes"
                          className="w-full text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-1.5">
                        <select
                          value={qtDateFilter}
                          onChange={(e) => setQtDateFilter(e.target.value)}
                          className="h-8 px-2.5 border border-gray-200 rounded-[3px] text-xs text-gray-600 bg-white focus:outline-none focus:border-[#4285F4] cursor-pointer"
                        >
                          <option value="all">Any Date</option>
                          <option value="today">Today</option>
                          <option value="7d">Last 7 Days</option>
                          <option value="30d">Last 30 Days</option>
                          <option value="year">This Year</option>
                        </select>

                        <div className="relative flex items-center border border-gray-200 rounded-[3px] h-8 px-2.5 bg-white">
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
                          <select
                            value={qtSortBy}
                            onChange={(e) => setQtSortBy(e.target.value)}
                            className="text-xs text-gray-600 bg-transparent focus:outline-none cursor-pointer"
                          >
                            <option value="date">Sorted by Date</option>
                            <option value="expiry">Sorted by Expiration</option>
                            <option value="number">Sorted by Number</option>
                            <option value="total">Sorted by Amount</option>
                          </select>
                        </div>

                        <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setQtViewMode('grid')}
                            className={`p-1.5 cursor-pointer ${
                              qtViewMode === 'grid'
                                ? 'bg-blue-50 text-[#4285F4]'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <Grid className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQtViewMode('list')}
                            className={`p-1.5 cursor-pointer ${
                              qtViewMode === 'list'
                                ? 'bg-blue-50 text-[#4285F4]'
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Status Tabs: All | Draft | Open | Converted | Cancelled */}
                    <div className="bg-white border border-gray-200 rounded-[4px] mb-5 flex items-stretch overflow-x-auto">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'draft', label: 'Draft' },
                        { key: 'open', label: 'Open' },
                        { key: 'converted', label: 'Converted' },
                        { key: 'cancelled', label: 'Cancelled' },
                      ].map((tab) => {
                        const active = quoteStatusTab === tab.key;
                        const stat = quoteSummary[tab.key];
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setQuoteStatusTab(tab.key)}
                            className={`relative min-w-[116px] px-5 py-3 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                              active ? 'text-gray-900' : 'text-gray-500 hover:bg-gray-50/70'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className={active ? 'font-semibold' : 'font-normal'}>
                                {tab.label}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                                  active
                                    ? 'bg-[#4285F4] text-white font-medium'
                                    : 'border border-gray-300 text-gray-500'
                                }`}
                              >
                                {stat.count}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {state.company?.currency || '₹'}
                              {Math.round(stat.total).toLocaleString('en-US')}
                            </div>
                            {active && (
                              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4285F4]" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quotes Grid / List */}
                    {filteredQuotes.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-[4px] py-14 text-center text-sm text-gray-400">
                        No quotes found in this view. Click <strong>New Quote</strong> to create one.
                      </div>
                    ) : qtViewMode === 'grid' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {filteredQuotes.map((qt) => {
                          const cust = state.customers.find((c) => c.id === qt.customerId);
                          const lead = state.leads.find((l) => l.id === qt.customerId);
                          const entityName =
                            cust?.name || lead?.company || qt.customerName || qt.customerId;
                          const totals = calcDocTotals(
                            qt.items || [],
                            state.products,
                            qt.discountPct || 0
                          );
                          const totalAmt = qt.total !== undefined ? Number(qt.total) : totals.total;

                          return (
                            <div
                              key={qt.id}
                              className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 transition-colors flex flex-col justify-between"
                            >
                              <div className="p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openExistingQuoteEditor(qt)}
                                    className="text-[14.5px] font-normal text-[#4285F4] hover:underline text-left cursor-pointer"
                                  >
                                    Quote {qt.id}
                                  </button>
                                  <span className="text-[11.5px] text-gray-400">
                                    {formatShortDate(qt.date)}
                                  </span>
                                </div>

                                <div className="text-[11.5px] text-gray-500 uppercase">
                                  {entityName}
                                </div>

                                <div className="pt-3 flex items-center justify-between">
                                  <StatusBadge status={qt.status || 'Open'} />
                                  <span className="text-[14px] font-semibold text-gray-800">
                                    {formatAmount(totalAmt)}
                                  </span>
                                </div>
                              </div>

                              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[11.5px] text-gray-500">
                                {qt.status !== 'Converted' && qt.status !== 'Cancelled' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inv = convertQuoteToInvoice(qt.id);
                                      if (inv) openExistingInvoiceEditor(inv, 1);
                                    }}
                                    className="text-[#4285F4] hover:underline font-medium uppercase cursor-pointer"
                                  >
                                    CONVERT TO INVOICE
                                  </button>
                                ) : (
                                  <span className="text-gray-400 uppercase">
                                    {qt.convertedInvoiceId
                                      ? `→ ${qt.convertedInvoiceId}`
                                      : qt.convertedOrderId
                                      ? `→ ${qt.convertedOrderId}`
                                      : qt.status}
                                  </span>
                                )}

                                <div className="flex items-center gap-2.5 text-gray-400">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewQuoteId(qt.id)}
                                    title="Preview / Email Quote"
                                    className="hover:text-gray-700 cursor-pointer"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </button>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenQtCardMenuId(
                                          openQtCardMenuId === qt.id ? null : qt.id
                                        )
                                      }
                                      className="p-0.5 hover:text-gray-700 rounded cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {openQtCardMenuId === qt.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-30"
                                          onClick={() => setOpenQtCardMenuId(null)}
                                        />
                                        <div className="absolute right-0 bottom-7 w-44 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenQtCardMenuId(null);
                                              convertQuoteToOrder(qt.id);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                          >
                                            Convert to Sales Order
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenQtCardMenuId(null);
                                              cancelQuote(qt.id);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenQtCardMenuId(null);
                                              setPreviewQuoteId(qt.id);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                          >
                                            Print / Customise
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenQtCardMenuId(null);
                                              const cloned = duplicateQuote(qt.id);
                                              if (cloned) openExistingQuoteEditor(cloned);
                                            }}
                                            className="w-full text-left px-3.5 py-2 hover:bg-gray-50 cursor-pointer"
                                          >
                                            Duplicate
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenQtCardMenuId(null);
                                              deleteQuote(qt.id);
                                            }}
                                            className="w-full text-left px-3.5 py-2 text-rose-500 hover:bg-rose-50 border-t border-gray-100 cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                              <th className="py-3 px-4 font-medium">Quote #</th>
                              <th className="py-3 px-4 font-medium">Lead or Customer</th>
                              <th className="py-3 px-4 font-medium">Date</th>
                              <th className="py-3 px-4 font-medium">Expiration</th>
                              <th className="py-3 px-4 font-medium">Status</th>
                              <th className="py-3 px-4 font-medium text-right">Total</th>
                              <th className="py-3 px-4 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredQuotes.map((qt) => {
                              const cust = state.customers.find((c) => c.id === qt.customerId);
                              const lead = state.leads.find((l) => l.id === qt.customerId);
                              const totals = calcDocTotals(
                                qt.items || [],
                                state.products,
                                qt.discountPct || 0
                              );
                              return (
                                <tr key={qt.id} className="hover:bg-gray-50/60">
                                  <td className="py-3 px-4">
                                    <button
                                      type="button"
                                      onClick={() => openExistingQuoteEditor(qt)}
                                      className="font-medium text-[#4285F4] hover:underline cursor-pointer"
                                    >
                                      {qt.id}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-gray-800">
                                    {cust?.name || lead?.company || qt.customerName || qt.customerId}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500">{qt.date}</td>
                                  <td className="py-3 px-4 text-gray-500">{qt.expiryDate || '—'}</td>
                                  <td className="py-3 px-4">
                                    <StatusBadge status={qt.status || 'Open'} />
                                  </td>
                                  <td className="py-3 px-4 text-right font-semibold">
                                    {formatAmount(qt.total ?? totals.total)}
                                  </td>
                                  <td className="py-3 px-4 text-right space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewQuoteId(qt.id)}
                                      className="text-gray-600 hover:underline cursor-pointer"
                                    >
                                      Print
                                    </button>
                                    {qt.status !== 'Converted' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const inv = convertQuoteToInvoice(qt.id);
                                          if (inv) openExistingInvoiceEditor(inv, 1);
                                        }}
                                        className="text-[#4285F4] font-medium hover:underline cursor-pointer"
                                      >
                                        Convert to Invoice
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. FULL-SCREEN NEW / EDIT QUOTE EDITOR (Screenshot 1) */}
                {quoteScreen === 'editor' && (
                  <div className="-mx-6 -mt-6">
                    {/* Top Sub-Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setQuoteScreen('list')}
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <h2 className="text-[17px] font-normal text-gray-700">
                        {editingQuoteId ? `Quote ${editingQuoteId}` : 'New Quote'}
                      </h2>
                      <div className="flex items-center gap-2">
                        {editingQuoteId && (
                          <button
                            type="button"
                            onClick={() => setPreviewQuoteId(editingQuoteId)}
                            className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-[3px] text-xs text-gray-600 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print / Customise</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-w-[1000px] mx-auto px-6 pt-5 pb-12">
                      <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="p-7 space-y-6 text-xs">
                          {/* Top 2-Column Header */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                            {/* Left Column: Lead or Customer*, Recipient, Address */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Lead or Customer<span className="text-rose-500">*</span>
                                </label>
                                <div className="col-span-8 relative">
                                  <input
                                    value={qtEntityQuery}
                                    onFocus={() => setQtEntityDropdownOpen(true)}
                                    onChange={(e) => {
                                      setQtEntityQuery(e.target.value);
                                      setQtEntityDropdownOpen(true);
                                    }}
                                    placeholder="Customer name or code"
                                    className="w-full border-b-2 border-[#4285F4] py-1.5 text-[13px] text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none"
                                  />

                                  {qtEntityDropdownOpen && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setQtEntityDropdownOpen(false)}
                                      />
                                      <div className="absolute left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-[2px] shadow-lg z-40 overflow-hidden text-[13px]">
                                        {(() => {
                                          const q = qtEntityQuery.trim().toLowerCase();
                                          const allEntities = [
                                            ...state.customers.map((c) => ({
                                              id: c.id,
                                              name: c.name,
                                              kind: 'Customer',
                                              address: c.location || '',
                                              shipping: c.shippingAddress || c.location || '',
                                              terms: c.paymentTerms || 'Due on receipt',
                                              discount: Number(c.discountTier) || 0,
                                            })),
                                            ...state.leads.map((l) => ({
                                              id: l.id,
                                              name: l.company,
                                              kind: 'Lead',
                                              address: l.location || '',
                                              shipping: l.location || '',
                                              terms: 'Due on receipt',
                                              discount: 0,
                                            })),
                                          ].filter(
                                            (ent) =>
                                              !q ||
                                              ent.name.toLowerCase().includes(q) ||
                                              ent.id.toLowerCase().includes(q)
                                          );

                                          return (
                                            <>
                                              {allEntities.slice(0, 6).map((ent) => (
                                                <button
                                                  key={ent.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setQtEntityQuery(ent.name);
                                                    setQtEntityDropdownOpen(false);
                                                    setQuoteForm((prev) => ({
                                                      ...prev,
                                                      customerId: ent.id,
                                                      customerName: ent.name,
                                                      recipient: 'None',
                                                      billingAddress: ent.address,
                                                      deliveryAddress: ent.shipping,
                                                      paymentTerms: ent.terms,
                                                      discountRate: ent.discount,
                                                    }));
                                                  }}
                                                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 flex items-center justify-between text-gray-800 cursor-pointer"
                                                >
                                                  <span>{ent.name}</span>
                                                  <span className="text-[11px] text-gray-400">
                                                    {ent.id} ({ent.kind})
                                                  </span>
                                                </button>
                                              ))}

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setQtEntityDropdownOpen(false);
                                                  setEntityPickerSearch('');
                                                  setEntityPickerModalOpen(true);
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 bg-[#4285F4] text-white font-normal cursor-pointer"
                                              >
                                                View all Leads and Customers
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setQtEntityDropdownOpen(false);
                                                  setNewLeadCustForm({
                                                    recordRole: 'Customer',
                                                    entityType: 'Company',
                                                    companyName: '',
                                                    firstName: '',
                                                    lastName: '',
                                                    middleName: '',
                                                    email: '',
                                                    phone: '',
                                                    website: '',
                                                    taxId: '',
                                                    pickupOnly: false,
                                                    billingAddress: '',
                                                    addressLine2: '',
                                                    city: '',
                                                    state: '',
                                                    postCode: '',
                                                    country: state.company?.country || 'India',
                                                    sameAsBilling: true,
                                                    contacts: [],
                                                  });
                                                  setNewLeadCustModalOpen(true);
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border-t border-gray-100 cursor-pointer"
                                              >
                                                Create a Lead or Customer
                                              </button>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Recipient
                                </label>
                                <div className="col-span-8">
                                  {(() => {
                                    const cust = state.customers.find(
                                      (c) => c.id === quoteForm.customerId
                                    );
                                    const contacts = cust?.contacts || [];
                                    return (
                                      <select
                                        value={quoteForm.recipient}
                                        onChange={(e) =>
                                          setQuoteForm({ ...quoteForm, recipient: e.target.value })
                                        }
                                        className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                      >
                                        <option value="None">None</option>
                                        {contacts.map((ct) => {
                                          const full = `${ct.firstName} ${ct.lastName}`.trim();
                                          return (
                                            <option key={ct.id || full} value={full}>
                                              {full}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    );
                                  })()}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-start gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600 pt-2">
                                  Address
                                </label>
                                <div className="col-span-8">
                                  <textarea
                                    rows={3}
                                    value={quoteForm.billingAddress}
                                    onChange={(e) =>
                                      setQuoteForm({
                                        ...quoteForm,
                                        billingAddress: e.target.value,
                                      })
                                    }
                                    className="w-full bg-gray-100/70 border border-gray-200 rounded-[2px] p-2 text-[12.5px] text-gray-700 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Date*, Status, Expiration Date*, Payment Terms */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Date<span className="text-rose-500">*</span>
                                </label>
                                <div className="col-span-8">
                                  <input
                                    type="date"
                                    value={quoteForm.date}
                                    onChange={(e) =>
                                      setQuoteForm({ ...quoteForm, date: e.target.value })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Status
                                </label>
                                <div className="col-span-8">
                                  <select
                                    value={quoteForm.status}
                                    onChange={(e) =>
                                      setQuoteForm({ ...quoteForm, status: e.target.value })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                  >
                                    <option value="Open">Open</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Sent">Sent</option>
                                    <option value="Accepted">Accepted</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Converted">Converted</option>
                                    <option value="Cancelled">Cancelled</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Expiration Date<span className="text-rose-500">*</span>
                                </label>
                                <div className="col-span-8">
                                  <input
                                    type="date"
                                    value={quoteForm.expiryDate}
                                    onChange={(e) =>
                                      setQuoteForm({ ...quoteForm, expiryDate: e.target.value })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Payment Terms
                                </label>
                                <div className="col-span-8">
                                  <select
                                    value={quoteForm.paymentTerms}
                                    onChange={(e) =>
                                      setQuoteForm({
                                        ...quoteForm,
                                        paymentTerms: e.target.value,
                                      })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                  >
                                    <option value="Due on receipt">Due on receipt</option>
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 45">Net 45</option>
                                    <option value="Net 60">Net 60</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Line Items Table (Screenshot 1) */}
                          <div className="overflow-x-auto pt-2">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-gray-300 text-gray-700">
                                  <th className="py-2 px-2 font-semibold w-24">Code</th>
                                  <th className="py-2 px-2 font-semibold">Description</th>
                                  <th className="py-2 px-2 font-semibold w-20 text-right">Qty</th>
                                  <th className="py-2 px-2 font-semibold w-24 text-right">Price</th>
                                  <th className="py-2 px-2 font-semibold w-20 text-right">
                                    Disc.%
                                  </th>
                                  <th className="py-2 px-2 font-semibold w-24 text-right">Total</th>
                                  <th className="py-2 px-2 font-semibold w-36">VAT%</th>
                                  <th className="py-2 px-1 w-8" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {quoteForm.items.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="py-4 px-2 text-gray-400">
                                      No items to show
                                    </td>
                                  </tr>
                                ) : (
                                  quoteForm.items.map((line, idx) => {
                                    const lineTotal =
                                      (Number(line.qty) || 0) *
                                      (Number(line.unitPrice) || 0) *
                                      (1 - (Number(line.discPct) || 0) / 100);
                                    return (
                                      <tr key={idx}>
                                        <td className="py-2.5 px-2 text-gray-600">
                                          {line.code || 'ITEM'}
                                        </td>
                                        <td className="py-2.5 px-2">
                                          <input
                                            value={line.description}
                                            onChange={(e) => {
                                              const copy = [...quoteForm.items];
                                              copy[idx] = {
                                                ...copy[idx],
                                                description: e.target.value,
                                              };
                                              setQuoteForm({ ...quoteForm, items: copy });
                                            }}
                                            className="w-full text-xs text-gray-800 focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-2.5 px-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            value={line.qty}
                                            onChange={(e) => {
                                              const copy = [...quoteForm.items];
                                              copy[idx] = {
                                                ...copy[idx],
                                                qty: Number(e.target.value) || 0,
                                              };
                                              setQuoteForm({ ...quoteForm, items: copy });
                                            }}
                                            className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-2.5 px-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={line.unitPrice}
                                            onChange={(e) => {
                                              const copy = [...quoteForm.items];
                                              copy[idx] = {
                                                ...copy[idx],
                                                unitPrice: Number(e.target.value) || 0,
                                              };
                                              setQuoteForm({ ...quoteForm, items: copy });
                                            }}
                                            className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-2.5 px-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            max={100}
                                            value={line.discPct || 0}
                                            onChange={(e) => {
                                              const copy = [...quoteForm.items];
                                              copy[idx] = {
                                                ...copy[idx],
                                                discPct: Number(e.target.value) || 0,
                                              };
                                              setQuoteForm({ ...quoteForm, items: copy });
                                            }}
                                            className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-medium text-gray-800">
                                          {lineTotal.toFixed(2)}
                                        </td>
                                        <td className="py-2.5 px-2">
                                          <select
                                            value={line.taxRate}
                                            onChange={(e) => {
                                              const copy = [...quoteForm.items];
                                              copy[idx] = {
                                                ...copy[idx],
                                                taxRate: Number(e.target.value),
                                              };
                                              setQuoteForm({ ...quoteForm, items: copy });
                                            }}
                                            className="w-full text-xs text-gray-700 bg-transparent focus:outline-none"
                                          >
                                            <option value={0}>0.0% Exempt</option>
                                            <option value={5}>5.0% Reduced</option>
                                            <option value={12}>12.0% GST</option>
                                            <option value={18}>18.0% GST</option>
                                            <option value={20}>20.0% Standard</option>
                                          </select>
                                        </td>
                                        <td className="py-2.5 px-1 text-right">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setQuoteForm({
                                                ...quoteForm,
                                                items: quoteForm.items.filter((_, i) => i !== idx),
                                              })
                                            }
                                            className="text-gray-400 hover:text-rose-500 font-bold cursor-pointer"
                                          >
                                            ×
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* + Add Product or Service Button (Opens Screenshot 2 Modal) */}
                          <div>
                            <button
                              type="button"
                              onClick={() => openProductPicker('quote')}
                              className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>Add Product or Service</span>
                            </button>
                          </div>

                          {/* Document Note + Totals */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
                            <div className="md:col-span-6 grid grid-cols-12 gap-3 items-start">
                              <label className="col-span-4 text-right font-semibold text-gray-600 pt-1">
                                Document Note
                              </label>
                              <div className="col-span-8">
                                <textarea
                                  rows={3}
                                  value={quoteForm.documentNote}
                                  onChange={(e) =>
                                    setQuoteForm({ ...quoteForm, documentNote: e.target.value })
                                  }
                                  className="w-full border-b border-gray-300 focus:border-[#4285F4] p-1.5 text-xs text-gray-700 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="md:col-span-6 space-y-2.5">
                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-5 text-right font-semibold text-gray-600">
                                  Subtotal
                                </span>
                                <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                  {quoteEditorTotals.subtotal.toFixed(2)}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-5 text-right font-semibold text-gray-600">
                                  Discount Rate
                                </span>
                                <div className="col-span-7 border-b border-gray-300 px-3 py-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={100}
                                    value={quoteForm.discountRate}
                                    onChange={(e) =>
                                      setQuoteForm({
                                        ...quoteForm,
                                        discountRate: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full text-right text-gray-800 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-5 text-right font-semibold text-gray-600">
                                  Discount Amount
                                </span>
                                <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                  {quoteEditorTotals.discountAmount.toFixed(2)}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-5 text-right font-semibold text-gray-600">
                                  VAT
                                </span>
                                <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                  {quoteEditorTotals.taxTotal.toFixed(2)}
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-3">
                                <span className="col-span-5 text-right font-semibold text-gray-700">
                                  Total
                                </span>
                                <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right font-semibold text-gray-900 rounded-[2px]">
                                  {quoteEditorTotals.total.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Advanced Section */}
                          <div className="border-t border-gray-200 pt-4 space-y-4">
                            <button
                              type="button"
                              onClick={() => setShowAdvancedQt(!showAdvancedQt)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4285F4] hover:underline cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  showAdvancedQt ? '' : '-rotate-90'
                                }`}
                              />
                              <span>Advanced</span>
                            </button>

                            {showAdvancedQt && (
                              <div className="max-w-[740px] mx-auto space-y-4 pt-1">
                                <div className="grid grid-cols-12 items-center gap-4">
                                  <label className="col-span-4 text-right font-semibold text-gray-600">
                                    PO Number
                                  </label>
                                  <div className="col-span-8">
                                    <input
                                      value={quoteForm.poNumber}
                                      onChange={(e) =>
                                        setQuoteForm({ ...quoteForm, poNumber: e.target.value })
                                      }
                                      className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-12 items-center gap-4">
                                  <label className="col-span-4 text-right font-semibold text-gray-600">
                                    Project
                                  </label>
                                  <div className="col-span-8">
                                    <input
                                      value={quoteForm.project}
                                      onChange={(e) =>
                                        setQuoteForm({ ...quoteForm, project: e.target.value })
                                      }
                                      className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-12 items-start gap-4">
                                  <label className="col-span-4 text-right font-semibold text-gray-600 pt-2">
                                    Shipping Address
                                  </label>
                                  <div className="col-span-8">
                                    <textarea
                                      rows={2}
                                      value={quoteForm.deliveryAddress}
                                      onChange={(e) =>
                                        setQuoteForm({
                                          ...quoteForm,
                                          deliveryAddress: e.target.value,
                                        })
                                      }
                                      className="w-full bg-gray-100/70 border border-gray-200 rounded-[2px] p-2 text-gray-700 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Footer Cancel / Done */}
                        <div className="px-7 py-3.5 border-t border-gray-200 bg-gray-50/40 flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setQuoteScreen('list')}
                            className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!quoteForm.customerId) {
                                notify('Please select or create a Lead or Customer first.', 'error');
                                return;
                              }
                              if (editingQuoteId) {
                                updateQuote(editingQuoteId, quoteForm);
                              } else {
                                createQuote(quoteForm);
                              }
                              setQuoteScreen('list');
                            }}
                            className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. QUOTE DOCUMENT PREVIEW / PRINT / EMAIL / CUSTOMISE MODAL */}
                {previewQuote && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto">
                    <div className="bg-white rounded-[4px] border border-gray-200 shadow-2xl w-full max-w-[920px] p-6 relative my-8">
                      <button
                        type="button"
                        onClick={() => setPreviewQuoteId(null)}
                        className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                        <div className="md:col-span-8 border border-gray-300 bg-white p-7 shadow-inner max-h-[75vh] overflow-y-auto text-xs text-gray-800 space-y-6">
                          {(() => {
                            const cust = state.customers.find(
                              (c) => c.id === previewQuote.customerId
                            );
                            const lead = state.leads.find((l) => l.id === previewQuote.customerId);
                            const entityName =
                              cust?.name ||
                              lead?.company ||
                              previewQuote.customerName ||
                              previewQuote.customerId;
                            const tplGlobal = {
                              ...(state.company?.documentTemplate?.global || {}),
                              ...(previewQuote.customTemplate?.global || {}),
                            };
                            const tplDoc = {
                              ...(DEFAULT_DOC_TYPE_OVERRIDES.quote || {}),
                              ...(state.company?.documentTemplate?.docs?.quote || {}),
                              ...(previewQuote.customTemplate?.doc || {}),
                            };
                            const headerBg = tplGlobal.colorScheme || '#EFEFEF';
                            const currency = state.company?.currency || '₹';
                            const totals = calcDocTotals(
                              previewQuote.items || [],
                              state.products,
                              previewQuote.discountRate ?? previewQuote.discountPct ?? 0
                            );

                            return (
                              <div
                                style={{
                                  fontFamily: tplGlobal.fontFamily || 'Arial',
                                  color: tplGlobal.fontColor || '#000000',
                                }}
                                className="space-y-6"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-2">
                                    {state.company?.logoDataUrl ? (
                                      <img
                                        src={state.company.logoDataUrl}
                                        alt="Logo"
                                        style={{
                                          width: `${tplGlobal.logoWidth || 165}px`,
                                          height: `${tplGlobal.logoHeight || 110}px`,
                                        }}
                                        className="object-cover rounded-[2px]"
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: `${tplGlobal.logoWidth || 165}px`,
                                          height: `${tplGlobal.logoHeight || 100}px`,
                                        }}
                                        className="bg-gradient-to-tr from-indigo-900 via-purple-700 to-amber-500 rounded-[2px] flex items-center justify-center text-white font-bold text-sm tracking-wider"
                                      >
                                        {state.company?.name || 'COMPANY'}
                                      </div>
                                    )}
                                    {tplGlobal.showCompanyName !== false && (
                                      <div className="text-[15px] font-bold">
                                        {state.company?.name || 'Company Name'}
                                      </div>
                                    )}
                                    {tplGlobal.showCompanyAddress !== false && (
                                      <div className="text-[11px] opacity-80 whitespace-pre-line">
                                        {[
                                          state.company?.address,
                                          [
                                            state.company?.city,
                                            state.company?.state,
                                            state.company?.postCode,
                                          ]
                                            .filter(Boolean)
                                            .join(', '),
                                        ]
                                          .filter(Boolean)
                                          .join('\n')}
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right space-y-1">
                                    <div className="text-[20px] font-bold tracking-tight">
                                      {tplDoc.title || 'QUOTE'}
                                    </div>
                                    <div className="text-[11.5px]">no. {previewQuote.id}</div>
                                    <div className="text-[11.5px] opacity-80">
                                      {formatShortDate(previewQuote.date)}
                                    </div>
                                    {previewQuote.expiryDate && (
                                      <div className="pt-2 font-bold">
                                        Expires on {formatShortDate(previewQuote.expiryDate)}
                                      </div>
                                    )}
                                    <div className="font-semibold">
                                      {previewQuote.paymentTerms || 'Due on receipt'}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-2">
                                  {tplGlobal.showBillingAddress !== false && (
                                    <div>
                                      <div className="font-semibold underline mb-1">
                                        Billing address
                                      </div>
                                      <div className="font-bold uppercase">{entityName}</div>
                                      <div className="text-[11px] opacity-85 whitespace-pre-line">
                                        {previewQuote.billingAddress || cust?.location || ''}
                                      </div>
                                    </div>
                                  )}
                                  {tplGlobal.showShippingAddress !== false && (
                                    <div>
                                      <div className="font-semibold underline mb-1">
                                        Shipping address
                                      </div>
                                      <div className="font-bold uppercase">{entityName}</div>
                                      <div className="text-[11px] opacity-85 whitespace-pre-line">
                                        {previewQuote.deliveryAddress ||
                                          cust?.shippingAddress ||
                                          previewQuote.billingAddress ||
                                          ''}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                      <tr
                                        style={{ backgroundColor: headerBg }}
                                        className="font-bold"
                                      >
                                        <th className="py-1.5 px-2">
                                          {tplDoc.itemColLabel || 'Item name & description'}
                                        </th>
                                        {tplDoc.showQty !== false && (
                                          <th className="py-1.5 px-2 text-right">
                                            {tplDoc.qtyColLabel || 'Qty.'}
                                          </th>
                                        )}
                                        {tplDoc.showUnitPrice !== false && (
                                          <th className="py-1.5 px-2 text-right">
                                            {tplDoc.unitPriceColLabel || 'Unit price'}
                                          </th>
                                        )}
                                        <th className="py-1.5 px-2 text-right">Amount</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {(previewQuote.items || []).map((line, idx) => {
                                        const amt =
                                          (Number(line.qty) || 0) *
                                          (Number(line.unitPrice) || 0) *
                                          (1 - (Number(line.discPct) || 0) / 100);
                                        return (
                                          <tr key={idx}>
                                            <td className="py-2 px-2 font-semibold">
                                              {tplDoc.showProductNumber !== false && line.code
                                                ? `${line.code} `
                                                : ''}
                                              {line.description}
                                            </td>
                                            {tplDoc.showQty !== false && (
                                              <td className="py-2 px-2 text-right">
                                                {Number(line.qty) || 1}
                                              </td>
                                            )}
                                            {tplDoc.showUnitPrice !== false && (
                                              <td className="py-2 px-2 text-right">
                                                {currency}
                                                {(Number(line.unitPrice) || 0).toFixed(2)}
                                              </td>
                                            )}
                                            <td className="py-2 px-2 text-right font-medium">
                                              {currency}
                                              {amt.toFixed(2)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  <div className="mt-2 flex justify-end">
                                    <div className="w-60 space-y-1.5 text-[11px]">
                                      <div className="flex justify-between px-2 font-semibold">
                                        <span>Subtotal</span>
                                        <span>
                                          {currency}
                                          {totals.subtotal.toFixed(2)}
                                        </span>
                                      </div>
                                      {totals.discountAmount > 0 && (
                                        <div className="flex justify-between px-2 text-rose-600">
                                          <span>Discount</span>
                                          <span>
                                            -{currency}
                                            {totals.discountAmount.toFixed(2)}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between px-2">
                                        <span>VAT</span>
                                        <span>
                                          {currency}
                                          {totals.taxTotal.toFixed(2)}
                                        </span>
                                      </div>
                                      <div
                                        style={{ backgroundColor: headerBg }}
                                        className="flex justify-between px-2 py-1.5 text-[13px] font-bold"
                                      >
                                        <span>Total</span>
                                        <span>
                                          {currency}
                                          {totals.total.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {(tplDoc.notes || tplGlobal.notes || previewQuote.documentNote) && (
                                  <div className="pt-3 border-t border-gray-200 text-[11px] whitespace-pre-line">
                                    {previewQuote.documentNote || tplDoc.notes || tplGlobal.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="md:col-span-4 space-y-3 pt-1">
                          <button
                            type="button"
                            onClick={() => markQuoteSent(previewQuote.id)}
                            className="w-full py-2.5 px-4 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 shadow-2xs cursor-pointer"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>

                          <div className="border-t border-gray-200 my-3" />

                          <button
                            type="button"
                            onClick={() => openCustomiseDocumentModal('quote', previewQuote)}
                            className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Customise this document</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* =================================================================== */}
            {/* SHARED MODAL A: VIEW ALL LEADS AND CUSTOMERS PICKER                 */}
            {/* =================================================================== */}
            <Modal
              open={entityPickerModalOpen}
              onClose={() => setEntityPickerModalOpen(false)}
              title="Select Lead or Customer"
              maxWidth="max-w-2xl"
            >
              <div className="space-y-4 text-xs">
                <input
                  autoFocus
                  value={entityPickerSearch}
                  onChange={(e) => setEntityPickerSearch(e.target.value)}
                  placeholder="Search by name, code, or email..."
                  className="w-full border-b-2 border-[#4285F4] py-1.5 text-[13px] focus:outline-none"
                />
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded">
                  {[
                    ...state.customers.map((c) => ({
                      id: c.id,
                      name: c.name,
                      role: 'Customer',
                      email: c.email || '',
                      address: c.location || '',
                      shipping: c.shippingAddress || c.location || '',
                      terms: c.paymentTerms || 'Due on receipt',
                      discount: Number(c.discountTier) || 0,
                    })),
                    ...state.leads.map((l) => ({
                      id: l.id,
                      name: l.company,
                      role: 'Lead',
                      email: l.email || '',
                      address: l.location || '',
                      shipping: l.location || '',
                      terms: 'Due on receipt',
                      discount: 0,
                    })),
                  ]
                    .filter((item) => {
                      const q = entityPickerSearch.trim().toLowerCase();
                      return (
                        !q ||
                        item.name.toLowerCase().includes(q) ||
                        item.id.toLowerCase().includes(q) ||
                        item.email.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setQtEntityQuery(item.name);
                          setQuoteForm((prev) => ({
                            ...prev,
                            customerId: item.id,
                            customerName: item.name,
                            recipient: 'None',
                            billingAddress: item.address,
                            deliveryAddress: item.shipping,
                            paymentTerms: item.terms,
                            discountRate: item.discount,
                          }));
                          setEntityPickerModalOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50/50 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold text-gray-800">{item.name}</div>
                          <div className="text-gray-400">
                            {item.id} {item.email ? `• ${item.email}` : ''}
                          </div>
                        </div>
                        <StatusBadge status={item.role} />
                      </button>
                    ))}
                </div>
              </div>
            </Modal>

            {/* =================================================================== */}
            {/* SHARED MODAL B: NEW LEAD OR CUSTOMER (Screenshots 5, 6 & 7)         */}
            {/* =================================================================== */}
            <Modal
              open={newLeadCustModalOpen}
              onClose={() => setNewLeadCustModalOpen(false)}
              title="New Lead or Customer"
              maxWidth="max-w-3xl"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const displayName =
                    newLeadCustForm.entityType === 'Company'
                      ? newLeadCustForm.companyName.trim()
                      : [
                          newLeadCustForm.firstName,
                          newLeadCustForm.middleName,
                          newLeadCustForm.lastName,
                        ]
                          .filter(Boolean)
                          .join(' ')
                          .trim();

                  if (!displayName) return;

                  const fullAddr = [
                    newLeadCustForm.billingAddress,
                    newLeadCustForm.addressLine2,
                    newLeadCustForm.city,
                    newLeadCustForm.state,
                    newLeadCustForm.postCode,
                    newLeadCustForm.country,
                  ]
                    .filter(Boolean)
                    .join(', ');

                  if (newLeadCustForm.recordRole === 'Lead') {
                    const newLeadId = addLead({
                      company: displayName,
                      contact: displayName,
                      email: newLeadCustForm.email,
                      phone: newLeadCustForm.phone,
                      location: fullAddr || newLeadCustForm.country,
                    });
                    setQtEntityQuery(displayName);
                    setQuoteForm((prev) => ({
                      ...prev,
                      customerId: newLeadId,
                      customerName: displayName,
                      billingAddress: fullAddr,
                      deliveryAddress: fullAddr,
                    }));
                  } else {
                    const newCustId = addCustomer({
                      customerType: newLeadCustForm.entityType,
                      name: displayName,
                      email: newLeadCustForm.email,
                      phone: newLeadCustForm.phone,
                      website: newLeadCustForm.website,
                      taxId: newLeadCustForm.taxId,
                      billingAddress: newLeadCustForm.billingAddress,
                      addressLine2: newLeadCustForm.addressLine2,
                      city: newLeadCustForm.city,
                      state: newLeadCustForm.state,
                      postCode: newLeadCustForm.postCode,
                      country: newLeadCustForm.country,
                      sameAsBilling: newLeadCustForm.sameAsBilling,
                      contacts: newLeadCustForm.contacts,
                    });
                    setQtEntityQuery(displayName);
                    setQuoteForm((prev) => ({
                      ...prev,
                      customerId: newCustId,
                      customerName: displayName,
                      billingAddress: fullAddr,
                      deliveryAddress: fullAddr,
                    }));
                  }
                  setNewLeadCustModalOpen(false);
                }}
                className="space-y-6 text-xs"
              >
                {/* Overview Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                    Overview
                  </div>
                  <div className="md:col-span-9 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="inline-flex rounded-[3px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setNewLeadCustForm({ ...newLeadCustForm, recordRole: 'Customer' })
                          }
                          className={segBtnCls(newLeadCustForm.recordRole === 'Customer')}
                        >
                          Customer
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewLeadCustForm({ ...newLeadCustForm, recordRole: 'Lead' })
                          }
                          className={`${segBtnCls(
                            newLeadCustForm.recordRole === 'Lead'
                          )} border-l-0`}
                        >
                          Lead
                        </button>
                      </div>

                      <div className="inline-flex rounded-[3px] overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setNewLeadCustForm({ ...newLeadCustForm, entityType: 'Company' })
                          }
                          className={segBtnCls(newLeadCustForm.entityType === 'Company')}
                        >
                          Company
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewLeadCustForm({ ...newLeadCustForm, entityType: 'Individual' })
                          }
                          className={`${segBtnCls(
                            newLeadCustForm.entityType === 'Individual'
                          )} border-l-0`}
                        >
                          Individual
                        </button>
                      </div>
                    </div>

                    {newLeadCustForm.entityType === 'Company' ? (
                      <div className="relative">
                        <input
                          required
                          placeholder="Company Name"
                          value={newLeadCustForm.companyName}
                          onChange={(e) =>
                            setNewLeadCustForm({
                              ...newLeadCustForm,
                              companyName: e.target.value,
                            })
                          }
                          className={`${underlineInputCls} pr-6`}
                        />
                        <span className="absolute right-2.5 top-2.5 text-[#4285F4] font-bold">
                          *
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          placeholder="First Name"
                          value={newLeadCustForm.firstName}
                          onChange={(e) =>
                            setNewLeadCustForm({ ...newLeadCustForm, firstName: e.target.value })
                          }
                          className={underlineInputCls}
                        />
                        <div className="relative">
                          <input
                            required
                            placeholder="Last Name"
                            value={newLeadCustForm.lastName}
                            onChange={(e) =>
                              setNewLeadCustForm({
                                ...newLeadCustForm,
                                lastName: e.target.value,
                              })
                            }
                            className={`${underlineInputCls} pr-5`}
                          />
                          <span className="absolute right-2 top-2.5 text-[#4285F4] font-bold">
                            *
                          </span>
                        </div>
                        <input
                          placeholder="Middle Name"
                          value={newLeadCustForm.middleName}
                          onChange={(e) =>
                            setNewLeadCustForm({
                              ...newLeadCustForm,
                              middleName: e.target.value,
                            })
                          }
                          className={underlineInputCls}
                        />
                      </div>
                    )}

                    <input
                      type="email"
                      placeholder="Email"
                      value={newLeadCustForm.email}
                      onChange={(e) =>
                        setNewLeadCustForm({ ...newLeadCustForm, email: e.target.value })
                      }
                      className={underlineInputCls}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        placeholder="Phone Number"
                        value={newLeadCustForm.phone}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, phone: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                      <input
                        placeholder="Website"
                        value={newLeadCustForm.website}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, website: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                    </div>

                    {newLeadCustForm.entityType === 'Company' && (
                      <input
                        placeholder="VAT Number"
                        value={newLeadCustForm.taxId}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, taxId: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="border-t border-gray-200 pt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  <div className="md:col-span-3 md:text-right text-[14px] font-semibold text-gray-700 pt-1">
                    Address
                  </div>
                  <div className="md:col-span-9 space-y-3">
                    <input
                      placeholder="Billing address"
                      value={newLeadCustForm.billingAddress}
                      onChange={(e) =>
                        setNewLeadCustForm({
                          ...newLeadCustForm,
                          billingAddress: e.target.value,
                        })
                      }
                      className={underlineInputCls}
                    />
                    <input
                      placeholder="Line 2"
                      value={newLeadCustForm.addressLine2}
                      onChange={(e) =>
                        setNewLeadCustForm({ ...newLeadCustForm, addressLine2: e.target.value })
                      }
                      className={underlineInputCls}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        placeholder="City"
                        value={newLeadCustForm.city}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, city: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                      <input
                        placeholder="State"
                        value={newLeadCustForm.state}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, state: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                      <input
                        placeholder="Post Code"
                        value={newLeadCustForm.postCode}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, postCode: e.target.value })
                        }
                        className={underlineInputCls}
                      />
                    </div>
                    <div className="max-w-[220px] border border-gray-200 rounded-[3px] px-3 py-1.5">
                      <div className="text-[10.5px] text-gray-400">Country</div>
                      <select
                        value={newLeadCustForm.country}
                        onChange={(e) =>
                          setNewLeadCustForm({ ...newLeadCustForm, country: e.target.value })
                        }
                        className="w-full text-[13px] text-gray-800 bg-transparent focus:outline-none"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNewLeadCustModalOpen(false)}
                    className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] font-medium rounded-[3px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </form>
            </Modal>

            {/* =================================================================== */}
            {/* SHARED MODAL C: ADD PRODUCT OR SERVICE PICKER (Screenshot 2)        */}
            {/* =================================================================== */}
            <Modal
              open={Boolean(productPickerTarget)}
              onClose={() => setProductPickerTarget(null)}
              title="Add Product or Service"
              maxWidth="max-w-4xl"
            >
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdForm({
                        type: 'Service',
                        name: '',
                        unit: 'Day',
                        price: '0.00',
                        cost: '0.00',
                        sku: '',
                        description: '',
                        family: 'Miscellaneous',
                        privateNote: '',
                        incomeAccount: 'Sales - Miscellaneous (41005)',
                        taxRate: state.company?.defaultTaxRate ?? 20,
                        mainWarehouseQty: 0,
                      });
                      setNewProdModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    New
                  </button>
                </div>

                <div className="max-w-md">
                  <input
                    autoFocus
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search this list"
                    className="w-full border-b-2 border-[#4285F4] py-1.5 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none"
                  />
                </div>

                {(() => {
                  const q = pickerSearch.trim().toLowerCase();
                  const filteredProds = state.products.filter(
                    (p) =>
                      !q ||
                      (p.name || '').toLowerCase().includes(q) ||
                      (p.sku || '').toLowerCase().includes(q) ||
                      (p.description || '').toLowerCase().includes(q) ||
                      (p.category || '').toLowerCase().includes(q)
                  );

                  return (
                    <>
                      <div className="border border-gray-200 rounded-[2px] overflow-x-auto max-h-72">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-700 font-semibold">
                              <th className="py-2.5 px-3 w-10" />
                              <th className="py-2.5 px-3">Product Code</th>
                              <th className="py-2.5 px-3">Name</th>
                              <th className="py-2.5 px-3">Description</th>
                              <th className="py-2.5 px-3 text-right">Sales Price</th>
                              <th className="py-2.5 px-3 text-right">Purchase Price</th>
                              <th className="py-2.5 px-3">Type</th>
                              <th className="py-2.5 px-3">Unit</th>
                              <th className="py-2.5 px-3">Product Family</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredProds.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="py-6 text-center text-gray-400">
                                  No products or services match your search. Click{' '}
                                  <strong>New</strong> above to create one.
                                </td>
                              </tr>
                            ) : (
                              filteredProds.map((p) => {
                                const checked = pickerSelectedIds.includes(p.id);
                                return (
                                  <tr
                                    key={p.id}
                                    onClick={() =>
                                      setPickerSelectedIds((prev) =>
                                        checked
                                          ? prev.filter((id) => id !== p.id)
                                          : [...prev, p.id]
                                      )
                                    }
                                    className={`cursor-pointer ${
                                      checked ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {}}
                                        className="rounded border-gray-300"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">{p.sku}</td>
                                    <td className="py-2.5 px-3 font-medium text-gray-900">
                                      {p.name}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-500">
                                      {p.description || ''}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-gray-800">
                                      {(Number(p.price) || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-gray-500">
                                      {(Number(p.cost) || 0).toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {p.type || 'Product'}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {p.unit || 'Unit'}
                                    </td>
                                    <td className="py-2.5 px-3 text-gray-700">
                                      {p.category || 'Miscellaneous'}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="text-center text-gray-500 py-1">
                        {filteredProds.length > 0
                          ? `1-${filteredProds.length} of ${filteredProds.length}`
                          : '0 of 0'}
                      </div>
                    </>
                  );
                })()}

                <div className="border-t border-gray-200 pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setProductPickerTarget(null)}
                    className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] font-medium rounded-[3px] cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pickerSelectedIds.length === 0) {
                        notify('Select at least one product or service.', 'error');
                        return;
                      }
                      const newLines = pickerSelectedIds
                        .map((pid) => state.products.find((p) => p.id === pid))
                        .filter(Boolean)
                        .map((p) => ({
                          productId: p.id,
                          code: p.sku || p.id,
                          description: p.name,
                          qty: 1,
                          unitPrice: Number(p.price) || 0,
                          discPct: 0,
                          taxRate: Number(p.taxRate ?? state.company?.defaultTaxRate ?? 20),
                        }));

                      if (productPickerTarget === 'quote') {
                        setQuoteForm((prev) => ({
                          ...prev,
                          items: [...prev.items, ...newLines],
                        }));
                      } else if (productPickerTarget === 'invoice') {
                        setInvoiceForm((prev) => ({
                          ...prev,
                          items: [...prev.items, ...newLines],
                        }));
                      }
                      setProductPickerTarget(null);
                    }}
                    className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    Select
                  </button>
                </div>
              </div>
            </Modal>

            {/* =================================================================== */}
            {/* SHARED MODAL D: NEW PRODUCT OR SERVICE (Screenshots 3 & 4)          */}
            {/* =================================================================== */}
            <Modal
              open={newProdModalOpen}
              onClose={() => setNewProdModalOpen(false)}
              title="New Product or Service"
              maxWidth="max-w-2xl"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const created = addProduct({
                    ...newProdForm,
                    category: newProdForm.family,
                  });
                  if (created) {
                    setPickerSelectedIds((prev) => [...prev, created.id]);
                  }
                  setNewProdModalOpen(false);
                }}
                className="space-y-4 text-xs"
              >
                <div className="flex justify-center pb-2">
                  <div className="inline-flex rounded-[3px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setNewProdForm({ ...newProdForm, type: 'Service', unit: 'Day' })
                      }
                      className={`px-12 py-2 text-xs font-medium border cursor-pointer ${
                        newProdForm.type === 'Service'
                          ? 'bg-[#4285F4] text-white border-[#4285F4]'
                          : 'bg-white text-[#4285F4] border-gray-300'
                      }`}
                    >
                      Service
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewProdForm({ ...newProdForm, type: 'Product', unit: 'Unit' })
                      }
                      className={`px-12 py-2 text-xs font-medium border border-l-0 cursor-pointer ${
                        newProdForm.type === 'Product'
                          ? 'bg-[#4285F4] text-white border-[#4285F4]'
                          : 'bg-white text-[#4285F4] border-gray-300'
                      }`}
                    >
                      Product
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-4">
                  <label className="col-span-4 text-right font-semibold text-gray-600">
                    Name<span className="text-rose-500">*</span>
                  </label>
                  <div className="col-span-8">
                    <input
                      required
                      value={newProdForm.name}
                      onChange={(e) => setNewProdForm({ ...newProdForm, name: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-4">
                  <label className="col-span-4 text-right font-semibold text-gray-600">Unit</label>
                  <div className="col-span-8">
                    <input
                      value={newProdForm.unit}
                      onChange={(e) => setNewProdForm({ ...newProdForm, unit: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center gap-4">
                  <label className="col-span-4 text-right font-semibold text-gray-600">
                    Sales Price
                  </label>
                  <div className="col-span-8">
                    <input
                      type="number"
                      step="0.01"
                      value={newProdForm.price}
                      onChange={(e) => setNewProdForm({ ...newProdForm, price: e.target.value })}
                      className="w-full border-b border-gray-300 py-1.5 text-right text-gray-800 focus:outline-none focus:border-[#4285F4]"
                    />
                  </div>
                </div>

                {newProdForm.type === 'Product' && (
                  <div className="grid grid-cols-12 items-center gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600">
                      Purchase Price
                    </label>
                    <div className="col-span-8">
                      <input
                        type="number"
                        step="0.01"
                        value={newProdForm.cost}
                        onChange={(e) => setNewProdForm({ ...newProdForm, cost: e.target.value })}
                        className="w-full border-b border-gray-300 py-1.5 text-right text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="grid grid-cols-12 items-center gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600">
                      Item Number
                    </label>
                    <div className="col-span-8">
                      <input
                        value={newProdForm.sku}
                        onChange={(e) => setNewProdForm({ ...newProdForm, sku: e.target.value })}
                        className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-start gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600 pt-1">
                      Description
                    </label>
                    <div className="col-span-8">
                      <textarea
                        rows={2}
                        value={newProdForm.description}
                        onChange={(e) =>
                          setNewProdForm({ ...newProdForm, description: e.target.value })
                        }
                        className="w-full border-b border-gray-300 p-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600">
                      Family
                    </label>
                    <div className="col-span-8">
                      <input
                        value={newProdForm.family}
                        onChange={(e) =>
                          setNewProdForm({ ...newProdForm, family: e.target.value })
                        }
                        className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Section (Screenshot 4) */}
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="text-xs font-medium text-[#4285F4]">▾ Advanced</div>

                  <div className="grid grid-cols-12 items-start gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600 pt-1">
                      Private Note
                    </label>
                    <div className="col-span-8">
                      <textarea
                        rows={2}
                        value={newProdForm.privateNote}
                        onChange={(e) =>
                          setNewProdForm({ ...newProdForm, privateNote: e.target.value })
                        }
                        className="w-full border-b border-gray-300 p-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600">
                      Income Account<span className="text-rose-500">*</span>
                    </label>
                    <div className="col-span-8">
                      <input
                        required
                        value={newProdForm.incomeAccount}
                        onChange={(e) =>
                          setNewProdForm({ ...newProdForm, incomeAccount: e.target.value })
                        }
                        className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 items-center gap-4">
                    <label className="col-span-4 text-right font-semibold text-gray-600">
                      VAT on Sales
                    </label>
                    <div className="col-span-8">
                      <select
                        value={newProdForm.taxRate}
                        onChange={(e) =>
                          setNewProdForm({ ...newProdForm, taxRate: Number(e.target.value) })
                        }
                        className="w-full border-b border-gray-300 py-1.5 text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                      >
                        <option value={20}>20.0% Standard rate (Sales)</option>
                        <option value={18}>18.0% GST</option>
                        <option value={12}>12.0% GST</option>
                        <option value={5}>5.0% Reduced rate</option>
                        <option value={0}>0.0% Exempt</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setNewProdModalOpen(false)}
                    className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] font-medium rounded-[3px] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium rounded-[3px] shadow-2xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </form>
            </Modal>

            {/* =================================================================== */}
            {/* SHARED MODAL E: CUSTOMISE DOCUMENT (INVOICE & QUOTE — Shots 8 & 9)  */}
            {/* =================================================================== */}
            {customiseTarget && customiseDraft && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                <div className="bg-white rounded-[4px] border border-gray-200 shadow-2xl w-full max-w-[1040px] overflow-hidden my-6 flex flex-col max-h-[90vh]">
                  {/* Top Header Bar: Customise Quote/Invoice no. XXX + Cancel / Save */}
                  <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
                    <h3 className="text-[17px] font-normal text-gray-700">
                      Customise {customiseTarget.type === 'quote' ? 'Quote' : 'Invoice'} no.{' '}
                      {customiseTarget.id}
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setCustomiseTarget(null)}
                        className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (customiseTarget.type === 'quote') {
                            updateQuote(customiseTarget.id, { customTemplate: customiseDraft });
                          } else {
                            updateInvoice(customiseTarget.id, { customTemplate: customiseDraft });
                          }
                          setCustomiseTarget(null);
                        }}
                        className="px-5 py-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Two-Column Body: Live Paper Preview (Left) + Settings Accordions (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden bg-[#F8F9FA]">
                    {/* Left Live Paper Preview */}
                    <div className="md:col-span-7 p-6 overflow-y-auto flex justify-center">
                      {(() => {
                        const docObj =
                          customiseTarget.type === 'quote'
                            ? state.quotes.find((q) => q.id === customiseTarget.id)
                            : state.invoices.find((i) => i.id === customiseTarget.id);
                        if (!docObj) return null;
                        const cust = state.customers.find((c) => c.id === docObj.customerId);
                        const lead = state.leads.find((l) => l.id === docObj.customerId);
                        const entityName =
                          cust?.name || lead?.company || docObj.customerName || docObj.customerId;
                        const g = customiseDraft.global;
                        const d = customiseDraft.doc;
                        const currency = state.company?.currency || '₹';
                        const totals = calcDocTotals(
                          docObj.items || [],
                          state.products,
                          docObj.discountRate ?? docObj.discountPct ?? 0
                        );
                        const sizeClass =
                          g.fontSize === 'Small'
                            ? 'text-[10.5px]'
                            : g.fontSize === 'Large'
                            ? 'text-[13px]'
                            : 'text-[11.5px]';

                        return (
                          <div
                            style={{
                              fontFamily: g.fontFamily || 'Arial',
                              color: g.fontColor || '#000000',
                            }}
                            className={`w-full max-w-[560px] bg-white border border-gray-300 shadow-sm p-7 space-y-6 ${sizeClass}`}
                          >
                            {/* Header with Above / Left Logo placement */}
                            <div className="flex items-start justify-between gap-4">
                              <div
                                className={
                                  g.logoPlacement === 'Left'
                                    ? 'flex items-start gap-3.5'
                                    : 'space-y-2'
                                }
                              >
                                {state.company?.logoDataUrl ? (
                                  <img
                                    src={state.company.logoDataUrl}
                                    alt="Logo"
                                    style={{
                                      width: `${g.logoWidth}px`,
                                      height: `${g.logoHeight}px`,
                                    }}
                                    className="object-cover rounded-[2px] shrink-0"
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: `${g.logoWidth}px`,
                                      height: `${g.logoHeight}px`,
                                    }}
                                    className="bg-gradient-to-tr from-indigo-900 via-purple-700 to-amber-500 rounded-[2px] flex items-center justify-center text-white font-bold text-xs tracking-wider shrink-0"
                                  >
                                    {state.company?.name || 'COMPANY'}
                                  </div>
                                )}
                                <div className="space-y-0.5">
                                  {g.showCompanyName && (
                                    <div className="text-[15px] font-bold">
                                      {state.company?.name || 'Company Name'}
                                    </div>
                                  )}
                                  {g.showCompanyAddress && (
                                    <div className="opacity-80 whitespace-pre-line">
                                      {[
                                        state.company?.address,
                                        [
                                          state.company?.city,
                                          state.company?.state,
                                          state.company?.postCode,
                                        ]
                                          .filter(Boolean)
                                          .join(', '),
                                      ]
                                        .filter(Boolean)
                                        .join('\n')}
                                    </div>
                                  )}
                                  {g.showTaxpayerId && state.company?.taxId && (
                                    <div className="opacity-75">Tax ID: {state.company.taxId}</div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right space-y-1 shrink-0">
                                <div className="text-[20px] font-bold tracking-tight">
                                  {d.title ||
                                    (customiseTarget.type === 'quote' ? 'QUOTE' : 'INVOICE')}
                                </div>
                                <div>no. {docObj.id}</div>
                                <div className="opacity-80">{formatShortDate(docObj.date)}</div>
                                {customiseTarget.type === 'quote' && docObj.expiryDate && (
                                  <div className="pt-2 font-bold">
                                    Expires on {formatShortDate(docObj.expiryDate)}
                                  </div>
                                )}
                                <div className="font-semibold">
                                  {docObj.paymentTerms || 'Due on receipt'}
                                </div>
                                {d.showProjectName && docObj.project && (
                                  <div className="opacity-80">Project: {docObj.project}</div>
                                )}
                              </div>
                            </div>

                            {/* Billing & Shipping Addresses */}
                            <div className="grid grid-cols-2 gap-6 pt-1">
                              {g.showBillingAddress && (
                                <div>
                                  <div className="font-semibold underline mb-1">
                                    Billing address
                                  </div>
                                  <div className="font-bold uppercase">{entityName}</div>
                                  <div className="opacity-85 whitespace-pre-line">
                                    {docObj.billingAddress || cust?.location || ''}
                                  </div>
                                </div>
                              )}
                              {g.showShippingAddress && (
                                <div>
                                  <div className="font-semibold underline mb-1">
                                    Shipping address
                                  </div>
                                  <div className="font-bold uppercase">{entityName}</div>
                                  <div className="opacity-85 whitespace-pre-line">
                                    {docObj.deliveryAddress ||
                                      cust?.shippingAddress ||
                                      docObj.billingAddress ||
                                      ''}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Line Items Table */}
                            <div>
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr
                                    style={{ backgroundColor: g.colorScheme || '#EFEFEF' }}
                                    className="font-bold"
                                  >
                                    <th className="py-1.5 px-2">
                                      {d.itemColLabel || 'Item name & description'}
                                    </th>
                                    {d.showQty && (
                                      <th className="py-1.5 px-2 text-right">
                                        {d.qtyColLabel || 'Qty.'}
                                      </th>
                                    )}
                                    {d.showUnitPrice && (
                                      <th className="py-1.5 px-2 text-right">
                                        {d.unitPriceColLabel || 'Unit price'}
                                      </th>
                                    )}
                                    <th className="py-1.5 px-2 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(docObj.items || []).map((line, idx) => {
                                    const amt =
                                      (Number(line.qty) || 0) *
                                      (Number(line.unitPrice) || 0) *
                                      (1 - (Number(line.discPct) || 0) / 100);
                                    return (
                                      <tr key={idx}>
                                        <td className="py-2 px-2 font-semibold">
                                          {d.showProductNumber && line.code ? `${line.code} ` : ''}
                                          {line.description}
                                        </td>
                                        {d.showQty && (
                                          <td className="py-2 px-2 text-right">
                                            {Number(line.qty) || 1}
                                          </td>
                                        )}
                                        {d.showUnitPrice && (
                                          <td className="py-2 px-2 text-right">
                                            {currency}
                                            {(Number(line.unitPrice) || 0).toFixed(2)}
                                          </td>
                                        )}
                                        <td className="py-2 px-2 text-right font-medium">
                                          {currency}
                                          {amt.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Totals Block */}
                              <div className="mt-2 flex justify-end">
                                <div className="w-60 space-y-1.5">
                                  <div className="flex justify-between px-2 font-semibold">
                                    <span>Subtotal</span>
                                    <span>
                                      {currency}
                                      {totals.subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                  {totals.discountAmount > 0 && (
                                    <div className="flex justify-between px-2 text-rose-600">
                                      <span>Discount</span>
                                      <span>
                                        -{currency}
                                        {totals.discountAmount.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between px-2">
                                    <span>VAT</span>
                                    <span>
                                      {currency}
                                      {totals.taxTotal.toFixed(2)}
                                    </span>
                                  </div>
                                  <div
                                    style={{ backgroundColor: g.colorScheme || '#EFEFEF' }}
                                    className="flex justify-between px-2 py-1.5 text-[13px] font-bold"
                                  >
                                    <span>Total</span>
                                    <span>
                                      {currency}
                                      {totals.total.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Payment Information & Footer Notes */}
                            <div className="pt-3 border-t border-gray-200 space-y-1.5">
                              <div>Payment Information</div>
                              {(d.notes || g.notes) && (
                                <div className="opacity-80 whitespace-pre-line">
                                  {d.notes || g.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right Settings Sidebar (Screenshots 8 & 9) */}
                    <div className="md:col-span-5 bg-white border-l border-gray-200 p-5 overflow-y-auto space-y-5 text-xs">
                      {/* Yellow Heads Up Callout */}
                      <div className="bg-[#FEF9E7] border border-[#F5E1A4] rounded-[3px] p-3.5 text-[#8A6D3B] space-y-2">
                        <div className="font-bold">Heads up!</div>
                        <p>
                          These changes will only be applied to this{' '}
                          {customiseTarget.type === 'quote' ? 'quote' : 'invoice'}.
                        </p>
                        <p>
                          To edit your template, go to{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomiseTarget(null);
                              if (onOpenCompanySettings) onOpenCompanySettings();
                            }}
                            className="underline font-medium cursor-pointer"
                          >
                            Company Settings &gt; Document Settings
                          </button>
                          .
                        </p>
                      </div>

                      {/* Global Documents Settings */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[16px] font-normal text-gray-800">
                            Global documents settings
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomiseDraft((prev) => ({
                                ...prev,
                                global: { ...DEFAULT_DOCUMENT_TEMPLATE.global },
                              }))
                            }
                            className="text-[#4285F4] hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="border border-gray-200 rounded-[3px] divide-y divide-gray-200 overflow-hidden">
                          {/* Appearance Accordion */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'global-appearance'
                                    ? ''
                                    : 'global-appearance'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'global-appearance'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Appearance</span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                  customiseOpenSection === 'global-appearance' ? '' : '-rotate-90'
                                }`}
                              />
                            </button>

                            {customiseOpenSection === 'global-appearance' && (
                              <div className="p-4 space-y-4 bg-white">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-700">Color scheme</span>
                                  <input
                                    type="color"
                                    value={customiseDraft.global.colorScheme}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          colorScheme: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-12 h-7 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-700">Font</span>
                                  <select
                                    value={customiseDraft.global.fontFamily}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          fontFamily: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-36 px-2.5 py-1.5 border border-gray-300 rounded-[3px] bg-white"
                                  >
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Courier New">Courier New</option>
                                  </select>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-700">Font size</span>
                                  <select
                                    value={customiseDraft.global.fontSize}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          fontSize: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-36 px-2.5 py-1.5 border border-gray-300 rounded-[3px] bg-white"
                                  >
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                  </select>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-gray-700">Font color</span>
                                  <input
                                    type="color"
                                    value={customiseDraft.global.fontColor}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          fontColor: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-12 h-7 border border-gray-300 rounded cursor-pointer"
                                  />
                                </div>

                                <div className="flex items-start justify-between">
                                  <span className="text-gray-700 pt-0.5">Logo placement</span>
                                  <div className="space-y-1.5 w-36">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={customiseDraft.global.logoPlacement === 'Above'}
                                        onChange={() =>
                                          setCustomiseDraft({
                                            ...customiseDraft,
                                            global: {
                                              ...customiseDraft.global,
                                              logoPlacement: 'Above',
                                            },
                                          })
                                        }
                                      />
                                      <span>Above</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={customiseDraft.global.logoPlacement === 'Left'}
                                        onChange={() =>
                                          setCustomiseDraft({
                                            ...customiseDraft,
                                            global: {
                                              ...customiseDraft.global,
                                              logoPlacement: 'Left',
                                            },
                                          })
                                        }
                                      />
                                      <span>Left</span>
                                    </label>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-700">Logo Width</span>
                                  <input
                                    type="range"
                                    min={80}
                                    max={240}
                                    value={customiseDraft.global.logoWidth}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          logoWidth: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-36 accent-[#4285F4]"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-gray-700">Logo Height</span>
                                  <input
                                    type="range"
                                    min={50}
                                    max={180}
                                    value={customiseDraft.global.logoHeight}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          logoHeight: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-36 accent-[#4285F4]"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-gray-700">Company Name</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.global.showCompanyName}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          showCompanyName: val,
                                        },
                                      })
                                    }
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-gray-700">Company Address</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.global.showCompanyAddress}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          showCompanyAddress: val,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Global Header Accordion */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'global-header' ? '' : 'global-header'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'global-header'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Header</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {customiseOpenSection === 'global-header' && (
                              <div className="p-4 space-y-3 bg-white">
                                <div className="flex items-center justify-between">
                                  <span>Billing Address</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.global.showBillingAddress}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          showBillingAddress: val,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Shipping Address</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.global.showShippingAddress}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          showShippingAddress: val,
                                        },
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Taxpayer ID</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.global.showTaxpayerId}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        global: {
                                          ...customiseDraft.global,
                                          showTaxpayerId: val,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Global Bottom Accordion */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'global-bottom' ? '' : 'global-bottom'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'global-bottom'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Bottom</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {customiseOpenSection === 'global-bottom' && (
                              <div className="p-4 bg-white">
                                <label className="block font-medium text-gray-600 mb-1">
                                  Footer Notes
                                </label>
                                <textarea
                                  rows={3}
                                  value={customiseDraft.global.notes || ''}
                                  onChange={(e) =>
                                    setCustomiseDraft({
                                      ...customiseDraft,
                                      global: { ...customiseDraft.global, notes: e.target.value },
                                    })
                                  }
                                  className="w-full border border-gray-300 rounded p-2 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quote / Invoice Specific Settings */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[16px] font-normal text-gray-800">
                            {customiseTarget.type === 'quote'
                              ? 'Quote settings'
                              : 'Invoice settings'}
                          </h4>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomiseDraft((prev) => ({
                                ...prev,
                                doc: {
                                  ...(DEFAULT_DOC_TYPE_OVERRIDES[customiseTarget.type] ||
                                    DEFAULT_DOC_TYPE_OVERRIDES.invoice),
                                },
                              }))
                            }
                            className="text-[#4285F4] hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>

                        <div className="border border-gray-200 rounded-[3px] divide-y divide-gray-200 overflow-hidden">
                          {/* Doc Header */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'doc-header' ? '' : 'doc-header'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'doc-header'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Header</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {customiseOpenSection === 'doc-header' && (
                              <div className="p-4 space-y-3 bg-white">
                                <div>
                                  <label className="block text-gray-600 mb-1">Title</label>
                                  <input
                                    value={customiseDraft.doc.title || ''}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: { ...customiseDraft.doc, title: e.target.value },
                                      })
                                    }
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Show Project Name</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.doc.showProjectName}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: { ...customiseDraft.doc, showProjectName: val },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Doc Table */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'doc-table' ? '' : 'doc-table'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'doc-table'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Table</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {customiseOpenSection === 'doc-table' && (
                              <div className="p-4 space-y-3 bg-white">
                                <div>
                                  <label className="block text-gray-600 mb-1">
                                    Item column label
                                  </label>
                                  <input
                                    value={customiseDraft.doc.itemColLabel || ''}
                                    onChange={(e) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: {
                                          ...customiseDraft.doc,
                                          itemColLabel: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full border border-gray-300 rounded px-2.5 py-1.5"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Show Qty</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.doc.showQty}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: { ...customiseDraft.doc, showQty: val },
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Show Unit Price</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.doc.showUnitPrice}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: { ...customiseDraft.doc, showUnitPrice: val },
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Show Product Number</span>
                                  <OneUpOnOffToggle
                                    value={customiseDraft.doc.showProductNumber}
                                    onChange={(val) =>
                                      setCustomiseDraft({
                                        ...customiseDraft,
                                        doc: { ...customiseDraft.doc, showProductNumber: val },
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Doc Bottom */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setCustomiseOpenSection(
                                  customiseOpenSection === 'doc-bottom' ? '' : 'doc-bottom'
                                )
                              }
                              className={`w-full px-4 py-2.5 flex items-center justify-between text-[13px] cursor-pointer ${
                                customiseOpenSection === 'doc-bottom'
                                  ? 'bg-[#4285F4] text-white font-medium'
                                  : 'bg-white text-[#4285F4] hover:bg-gray-50'
                              }`}
                            >
                              <span>Bottom</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            {customiseOpenSection === 'doc-bottom' && (
                              <div className="p-4 bg-white">
                                <label className="block font-medium text-gray-600 mb-1">
                                  Document-specific Notes
                                </label>
                                <textarea
                                  rows={3}
                                  value={customiseDraft.doc.notes || ''}
                                  onChange={(e) =>
                                    setCustomiseDraft({
                                      ...customiseDraft,
                                      doc: { ...customiseDraft.doc, notes: e.target.value },
                                    })
                                  }
                                  className="w-full border border-gray-300 rounded p-2 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'invoices' && (
          <>
            {/* 1. INVOICES LIST & GRID VIEW */}
            {invoiceScreen === 'list' && (
              <div className="max-w-[1160px] mx-auto px-6 pt-6">
                <div className="flex items-center justify-between mb-5">
                  <h1 className="text-[22px] font-normal text-gray-800 tracking-tight">Invoices</h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openNewInvoiceEditor()}
                      className="px-4 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[13px] font-medium rounded-[4px] shadow-2xs transition-colors cursor-pointer"
                    >
                      New Invoice
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setInvHeaderMenuOpen(!invHeaderMenuOpen)}
                        title="More Invoice Actions"
                        className="w-9 h-9 bg-white hover:bg-gray-50 border border-gray-200 rounded-[4px] flex items-center justify-center text-gray-500 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {invHeaderMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setInvHeaderMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-1 w-60 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                            <button
                              type="button"
                              onClick={() => {
                                setInvHeaderMenuOpen(false);
                                setConvertModalType('quotes');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Convert Quotes to Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInvHeaderMenuOpen(false);
                                setConvertModalType('orders');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Convert Sales Orders to Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInvHeaderMenuOpen(false);
                                setConvertModalType('deliveryNotes');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Convert Delivery Notes to Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInvHeaderMenuOpen(false);
                                handleExportInvoicesCSV(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Export Invoices
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInvHeaderMenuOpen(false);
                                handleExportInvoicesCSV(true);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer"
                            >
                              Export Invoice Lines
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Search + Date + Sort + View Switcher Bar */}
                <div className="bg-white border border-gray-200 rounded-[4px] mb-4 flex flex-wrap items-center justify-between px-3.5 min-h-[44px] gap-2">
                  <div className="flex items-center flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      placeholder="Search in Invoices"
                      className="w-full text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1.5">
                    <select
                      value={invDateFilter}
                      onChange={(e) => setInvDateFilter(e.target.value)}
                      className="h-8 px-2.5 border border-gray-200 rounded-[3px] text-xs text-gray-600 bg-white focus:outline-none focus:border-[#4285F4] cursor-pointer"
                    >
                      <option value="all">Any Date</option>
                      <option value="today">Today</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="year">This Year</option>
                    </select>

                    <div className="relative flex items-center border border-gray-200 rounded-[3px] h-8 px-2.5 bg-white">
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
                      <select
                        value={invSortBy}
                        onChange={(e) => setInvSortBy(e.target.value)}
                        className="text-xs text-gray-600 bg-transparent focus:outline-none cursor-pointer"
                      >
                        <option value="dueDate">Sorted by Due Date</option>
                        <option value="date">Sorted by Date</option>
                        <option value="number">Sorted by Number</option>
                        <option value="customer">Sorted by Customer</option>
                        <option value="total">Sorted by Amount</option>
                      </select>
                    </div>

                    <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setInvViewMode('grid')}
                        title="Grid View"
                        className={`p-1.5 cursor-pointer ${
                          invViewMode === 'grid'
                            ? 'bg-blue-50 text-[#4285F4]'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvViewMode('list')}
                        title="List View"
                        className={`p-1.5 cursor-pointer ${
                          invViewMode === 'list'
                            ? 'bg-blue-50 text-[#4285F4]'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Filter Summary Tabs: All | Draft | Unpaid | Paid | Cancelled */}
                <div className="bg-white border border-gray-200 rounded-[4px] mb-5 flex items-stretch overflow-x-auto">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'draft', label: 'Draft' },
                    { key: 'unpaid', label: 'Unpaid' },
                    { key: 'paid', label: 'Paid' },
                    { key: 'cancelled', label: 'Cancelled' },
                  ].map((tab) => {
                    const active = invoiceStatusTab === tab.key;
                    const stat = invoiceSummary[tab.key];
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setInvoiceStatusTab(tab.key)}
                        className={`relative min-w-[116px] px-5 py-3 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                          active ? 'text-gray-900' : 'text-gray-500 hover:bg-gray-50/70'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={active ? 'font-semibold' : 'font-normal'}>
                            {tab.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                              active
                                ? 'bg-[#4285F4] text-white font-medium'
                                : 'border border-gray-300 text-gray-500'
                            }`}
                          >
                            {stat.count}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {state.company?.currency || '₹'}
                          {Math.round(stat.total).toLocaleString('en-US')}
                        </div>
                        {active && (
                          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4285F4]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Invoices Grid / List Content */}
                {filteredInvoices.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-[4px] py-14 text-center text-sm text-gray-400">
                    No invoices found in this view. Click <strong>New Invoice</strong> to create one.
                  </div>
                ) : invViewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {filteredInvoices.map((inv) => {
                      const cust = state.customers.find((c) => c.id === inv.customerId);
                      const lateDays =
                        inv.status === 'Cancelled' || inv.status === 'Draft'
                          ? 0
                          : getDaysLate(inv.dueDate, inv.status);
                      const isUnpaid =
                        inv.status !== 'Paid' &&
                        inv.status !== 'Credited' &&
                        inv.status !== 'Cancelled' &&
                        inv.status !== 'Draft';

                      return (
                        <div
                          key={inv.id}
                          className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-gray-300 transition-colors flex flex-col justify-between"
                        >
                          <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => openExistingInvoiceEditor(inv, 1)}
                                className="text-[14.5px] font-normal text-[#4285F4] hover:underline text-left cursor-pointer"
                              >
                                Invoice {inv.id}
                              </button>
                              <span className="text-[11.5px] text-gray-400">
                                {formatShortDate(inv.date)}
                              </span>
                            </div>

                            <div className="text-[11.5px] text-gray-500 uppercase">
                              {cust?.name || inv.customerId}
                            </div>

                            <div className="pt-3 flex items-center justify-between">
                              <div>
                                {lateDays > 0 ? (
                                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-medium rounded-[3px]">
                                    {lateDays} {lateDays === 1 ? 'day' : 'days'} late
                                  </span>
                                ) : (
                                  <StatusBadge
                                    status={inv.status === 'Open' ? 'Unpaid' : inv.status}
                                  />
                                )}
                              </div>

                              <span
                                className={`text-[14px] font-semibold ${
                                  isUnpaid ? 'text-rose-600' : 'text-gray-800'
                                }`}
                              >
                                {formatAmount(inv.total)}
                              </span>
                            </div>
                          </div>

                          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-[11.5px] text-gray-500">
                            <button
                              type="button"
                              onClick={() => {
                                createSalesOrder({
                                  customerId: inv.customerId,
                                  items: inv.items || [],
                                  discountPct: inv.discountPct || 0,
                                });
                                notify(`Delivery Note created for Invoice ${inv.id}.`);
                              }}
                              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 font-medium uppercase cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>DELIVER</span>
                            </button>

                            <div className="flex items-center gap-2.5 text-gray-400">
                              <button
                                type="button"
                                onClick={() => setPreviewInvoiceId(inv.id)}
                                title="Preview / Email Invoice"
                                className="hover:text-gray-700 cursor-pointer"
                              >
                                <Mail className="w-4 h-4" />
                              </button>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenInvCardMenuId(
                                      openInvCardMenuId === inv.id ? null : inv.id
                                    )
                                  }
                                  className="p-0.5 hover:text-gray-700 rounded cursor-pointer"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {openInvCardMenuId === inv.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-30"
                                      onClick={() => setOpenInvCardMenuId(null)}
                                    />
                                    <div className="absolute right-0 bottom-7 w-40 bg-white rounded-[4px] border border-gray-200 shadow-lg py-1.5 z-40 text-[13px] text-gray-700">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInvCardMenuId(null);
                                          cancelInvoice(inv.id);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Send className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Cancel</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInvCardMenuId(null);
                                          setPreviewInvoiceId(inv.id);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Print</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInvCardMenuId(null);
                                          const cloned = duplicateInvoice(inv.id);
                                          if (cloned) openExistingInvoiceEditor(cloned, 1);
                                        }}
                                        className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                                        <span>Duplicate</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenInvCardMenuId(null);
                                          deleteInvoice(inv.id);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-rose-500 hover:bg-rose-50 border-t border-gray-100 flex items-center gap-2.5 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                          <th className="py-3 px-4 font-medium">Invoice #</th>
                          <th className="py-3 px-4 font-medium">Customer</th>
                          <th className="py-3 px-4 font-medium">Date</th>
                          <th className="py-3 px-4 font-medium">Due Date</th>
                          <th className="py-3 px-4 font-medium">Status</th>
                          <th className="py-3 px-4 font-medium text-right">Total</th>
                          <th className="py-3 px-4 font-medium text-right">Balance</th>
                          <th className="py-3 px-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredInvoices.map((inv) => {
                          const cust = state.customers.find((c) => c.id === inv.customerId);
                          const bal = Math.max(
                            0,
                            Number(((inv.total || 0) - (inv.amountPaid || 0)).toFixed(2))
                          );
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/60">
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => openExistingInvoiceEditor(inv, 1)}
                                  className="font-medium text-[#4285F4] hover:underline cursor-pointer"
                                >
                                  {inv.id}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-gray-800">
                                {cust?.name || inv.customerId}
                              </td>
                              <td className="py-3 px-4 text-gray-500">{inv.date}</td>
                              <td className="py-3 px-4 text-gray-500">{inv.dueDate}</td>
                              <td className="py-3 px-4">
                                <StatusBadge
                                  status={inv.status === 'Open' ? 'Unpaid' : inv.status}
                                />
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {formatAmount(inv.total)}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                {formatAmount(bal)}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewInvoiceId(inv.id)}
                                  className="text-gray-600 hover:underline cursor-pointer"
                                >
                                  Print
                                </button>
                                {bal > 0 && inv.status !== 'Cancelled' && (
                                  <button
                                    type="button"
                                    onClick={() => openExistingInvoiceEditor(inv, 2)}
                                    className="text-emerald-600 font-medium hover:underline cursor-pointer"
                                  >
                                    Receive Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. FULL-SCREEN 2-PAGE INVOICE EDITOR / DETAIL (Screenshots 6, 7 & 8) */}
            {invoiceScreen === 'editor' && (
              <div>
                {/* Top Sub-Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setInvoiceScreen('list')}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <h2 className="text-[17px] font-normal text-gray-700">
                    {editingInvoiceId ? `Invoice ${editingInvoiceId}` : 'New Invoice'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {editingInvoiceId && (
                      <button
                        type="button"
                        onClick={() => setPreviewInvoiceId(editingInvoiceId)}
                        className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-[3px] text-xs text-gray-600 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / Email</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-w-[1000px] mx-auto px-6 pt-5 pb-12">
                  <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {/* PAGE 1: INVOICE HEADER, LINE ITEMS, TOTALS, ADVANCED & ATTACHMENTS */}
                    {invoicePage === 1 && (
                      <div className="p-7 space-y-6 text-xs">
                        {/* Top 2-Column Header Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
                          {/* Left Column: Customer, Recipient, Address */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-12 items-center gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600">
                                Customer<span className="text-rose-500">*</span>
                              </label>
                              <div className="col-span-8">
                                <select
                                  value={invoiceForm.customerId}
                                  onChange={(e) => {
                                    const nextCust = state.customers.find(
                                      (c) => c.id === e.target.value
                                    );
                                    const terms = nextCust?.paymentTerms || invoiceForm.paymentTerms;
                                    setInvoiceForm((prev) => ({
                                      ...prev,
                                      customerId: e.target.value,
                                      recipient: 'None',
                                      billingAddress: nextCust?.location || '',
                                      deliveryAddress:
                                        nextCust?.shippingAddress || nextCust?.location || '',
                                      paymentTerms: terms,
                                      dueDate: computeDueDateFromTerms(prev.date, terms),
                                      discountRate: Number(nextCust?.discountTier) || 0,
                                    }));
                                  }}
                                  className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                >
                                  <option value="">Select Customer...</option>
                                  {state.customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.id})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600">
                                Recipient
                              </label>
                              <div className="col-span-8">
                                {(() => {
                                  const cust = state.customers.find(
                                    (c) => c.id === invoiceForm.customerId
                                  );
                                  const contacts = cust?.contacts || [];
                                  return (
                                    <select
                                      value={invoiceForm.recipient}
                                      onChange={(e) =>
                                        setInvoiceForm({ ...invoiceForm, recipient: e.target.value })
                                      }
                                      className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                    >
                                      <option value="None">None</option>
                                      {contacts.map((ct) => {
                                        const full = `${ct.firstName} ${ct.lastName}`.trim();
                                        return (
                                          <option key={ct.id || full} value={full}>
                                            {full} {ct.email ? `(${ct.email})` : ''}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-start gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600 pt-2">
                                Address
                              </label>
                              <div className="col-span-8">
                                <textarea
                                  rows={3}
                                  value={invoiceForm.billingAddress}
                                  onChange={(e) =>
                                    setInvoiceForm({
                                      ...invoiceForm,
                                      billingAddress: e.target.value,
                                    })
                                  }
                                  className="w-full bg-gray-100/70 border border-gray-200 rounded-[2px] p-2 text-[12.5px] text-gray-700 focus:outline-none focus:border-[#4285F4]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Date, Payment Terms, Code */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-12 items-center gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600">
                                Date
                              </label>
                              <div className="col-span-8">
                                <input
                                  type="date"
                                  value={invoiceForm.date}
                                  onChange={(e) =>
                                    setInvoiceForm((prev) => ({
                                      ...prev,
                                      date: e.target.value,
                                      dueDate: computeDueDateFromTerms(
                                        e.target.value,
                                        prev.paymentTerms
                                      ),
                                    }))
                                  }
                                  className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600">
                                Payment Terms
                              </label>
                              <div className="col-span-8">
                                <select
                                  value={invoiceForm.paymentTerms}
                                  onChange={(e) =>
                                    setInvoiceForm((prev) => ({
                                      ...prev,
                                      paymentTerms: e.target.value,
                                      dueDate: computeDueDateFromTerms(prev.date, e.target.value),
                                    }))
                                  }
                                  className="w-full border-b border-gray-300 py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
                                >
                                  <option value="Due on receipt">Due on receipt</option>
                                  <option value="Net 15">Net 15</option>
                                  <option value="Net 30">Net 30</option>
                                  <option value="Net 45">Net 45</option>
                                  <option value="Net 60">Net 60</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <label className="col-span-4 text-right font-semibold text-gray-600">
                                Code
                              </label>
                              <div className="col-span-8">
                                <input
                                  value={invoiceForm.code}
                                  readOnly={Boolean(editingInvoiceId)}
                                  onChange={(e) =>
                                    setInvoiceForm({ ...invoiceForm, code: e.target.value })
                                  }
                                  className="w-full bg-gray-100/70 border border-gray-200 rounded-[2px] px-2.5 py-1.5 text-[13px] text-gray-700 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Unpaid / Settled Full-Width Segmented Toggle */}
                        <div className="grid grid-cols-2 border border-gray-200 rounded-[3px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setInvoiceForm({ ...invoiceForm, status: 'Open' })}
                            className={`py-2.5 text-center text-[13px] font-medium transition-colors cursor-pointer ${
                              invoiceForm.status !== 'Paid'
                                ? 'bg-[#4285F4] text-white'
                                : 'bg-white text-[#4285F4] hover:bg-gray-50'
                            }`}
                          >
                            Unpaid
                          </button>
                          <button
                            type="button"
                            onClick={() => setInvoiceForm({ ...invoiceForm, status: 'Paid' })}
                            className={`py-2.5 text-center text-[13px] font-medium border-l border-gray-200 transition-colors cursor-pointer ${
                              invoiceForm.status === 'Paid'
                                ? 'bg-[#4285F4] text-white'
                                : 'bg-white text-[#4285F4] hover:bg-gray-50'
                            }`}
                          >
                            Settled
                          </button>
                        </div>

                        {/* Line Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-300 text-gray-700">
                                <th className="py-2 px-2 font-semibold w-24">Code</th>
                                <th className="py-2 px-2 font-semibold">Description</th>
                                <th className="py-2 px-2 font-semibold w-20 text-right">Qty</th>
                                <th className="py-2 px-2 font-semibold w-24 text-right">Price</th>
                                <th className="py-2 px-2 font-semibold w-20 text-right">Disc.%</th>
                                <th className="py-2 px-2 font-semibold w-24 text-right">Total</th>
                                <th className="py-2 px-2 font-semibold w-36">VAT%</th>
                                <th className="py-2 px-1 w-8" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {invoiceForm.items.map((line, idx) => {
                                const lineTotal =
                                  (Number(line.qty) || 0) *
                                  (Number(line.unitPrice) || 0) *
                                  (1 - (Number(line.discPct) || 0) / 100);
                                return (
                                  <tr key={idx} className="align-top">
                                    <td className="py-2.5 px-2">
                                      <select
                                        value={line.productId}
                                        onChange={(e) => {
                                          const prod = state.products.find(
                                            (p) => p.id === e.target.value
                                          );
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            productId: prod?.id || '',
                                            code: prod?.sku || '',
                                            description: prod?.name || copy[idx].description,
                                            unitPrice: prod
                                              ? Number(prod.price) || 0
                                              : copy[idx].unitPrice,
                                            taxRate: prod
                                              ? Number(prod.taxRate ?? 20)
                                              : copy[idx].taxRate,
                                          };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-xs text-gray-700 bg-transparent focus:outline-none"
                                      >
                                        {state.products.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.sku}
                                          </option>
                                        ))}
                                        {!state.products.some((p) => p.id === line.productId) && (
                                          <option value={line.productId}>
                                            {line.code || 'ITEM'}
                                          </option>
                                        )}
                                      </select>
                                    </td>

                                    <td className="py-2.5 px-2">
                                      <input
                                        value={line.description}
                                        onChange={(e) => {
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = { ...copy[idx], description: e.target.value };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-xs text-gray-800 focus:outline-none"
                                      />
                                    </td>

                                    <td className="py-2.5 px-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        value={line.qty}
                                        onChange={(e) => {
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            qty: Number(e.target.value) || 0,
                                          };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                      />
                                    </td>

                                    <td className="py-2.5 px-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={line.unitPrice}
                                        onChange={(e) => {
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            unitPrice: Number(e.target.value) || 0,
                                          };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                      />
                                    </td>

                                    <td className="py-2.5 px-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        max={100}
                                        value={line.discPct || 0}
                                        onChange={(e) => {
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            discPct: Number(e.target.value) || 0,
                                          };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-right text-xs text-gray-800 focus:outline-none"
                                      />
                                    </td>

                                    <td className="py-2.5 px-2 text-right font-medium text-gray-800">
                                      {lineTotal.toFixed(2)}
                                    </td>

                                    <td className="py-2.5 px-2">
                                      <select
                                        value={line.taxRate}
                                        onChange={(e) => {
                                          const copy = [...invoiceForm.items];
                                          copy[idx] = {
                                            ...copy[idx],
                                            taxRate: Number(e.target.value),
                                          };
                                          setInvoiceForm({ ...invoiceForm, items: copy });
                                        }}
                                        className="w-full text-xs text-gray-700 bg-transparent focus:outline-none"
                                      >
                                        <option value={0}>0.0% Exempt</option>
                                        <option value={5}>5.0% Reduced</option>
                                        <option value={12}>12.0% GST</option>
                                        <option value={18}>18.0% GST</option>
                                        <option value={20}>20.0% Standard</option>
                                      </select>
                                    </td>

                                    <td className="py-2.5 px-1 text-right">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setInvoiceForm({
                                            ...invoiceForm,
                                            items: invoiceForm.items.filter((_, i) => i !== idx),
                                          })
                                        }
                                        className="text-gray-400 hover:text-rose-500 font-bold cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* + Add Product or Service Button */}
                        {/* + Add Product or Service Button */}
                     <div>
                       <button
                         type="button"
                         onClick={() => openProductPicker('invoice')}
                         className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                       >
                         <Search className="w-3.5 h-3.5" />
                         <span>Add Product or Service</span>
                       </button>
                     </div>

                        {/* Document Note (Left) + Subtotal / Discount / VAT / Total (Right) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
                          <div className="md:col-span-6 grid grid-cols-12 gap-3 items-start">
                            <label className="col-span-4 text-right font-semibold text-gray-600 pt-1">
                              Document Note
                            </label>
                            <div className="col-span-8">
                              <textarea
                                rows={3}
                                value={invoiceForm.documentNote}
                                onChange={(e) =>
                                  setInvoiceForm({ ...invoiceForm, documentNote: e.target.value })
                                }
                                className="w-full border-b border-gray-300 focus:border-[#4285F4] p-1.5 text-xs text-gray-700 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-6 space-y-2.5">
                            <div className="grid grid-cols-12 items-center gap-3">
                              <span className="col-span-5 text-right font-semibold text-gray-600">
                                Subtotal
                              </span>
                              <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                {editorTotals.subtotal.toFixed(2)}
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <span className="col-span-5 text-right font-semibold text-gray-600">
                                Discount Rate
                              </span>
                              <div className="col-span-7 border-b border-gray-300 px-3 py-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  max={100}
                                  value={invoiceForm.discountRate}
                                  onChange={(e) =>
                                    setInvoiceForm({
                                      ...invoiceForm,
                                      discountRate: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full text-right text-gray-800 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <span className="col-span-5 text-right font-semibold text-gray-600">
                                Discount Amount
                              </span>
                              <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                {editorTotals.discountAmount.toFixed(2)}
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <span className="col-span-5 text-right font-semibold text-gray-600">
                                VAT
                              </span>
                              <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right text-gray-800 rounded-[2px]">
                                {editorTotals.taxTotal.toFixed(2)}
                              </div>
                            </div>

                            <div className="grid grid-cols-12 items-center gap-3">
                              <span className="col-span-5 text-right font-semibold text-gray-700">
                                Total
                              </span>
                              <div className="col-span-7 bg-gray-100/70 px-3 py-2 text-right font-semibold text-gray-900 rounded-[2px]">
                                {editorTotals.total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Advanced Section (Screenshot 7) */}
                        <div className="border-t border-gray-200 pt-4 space-y-4">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedInv(!showAdvancedInv)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4285F4] hover:underline cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                showAdvancedInv ? '' : '-rotate-90'
                              }`}
                            />
                            <span>Advanced</span>
                          </button>

                          {showAdvancedInv && (
                            <div className="max-w-[740px] mx-auto space-y-4 pt-1">
                              <div className="grid grid-cols-12 items-center gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Delivery Date
                                </label>
                                <div className="col-span-8">
                                  <input
                                    type="date"
                                    value={invoiceForm.deliveryDate}
                                    onChange={(e) =>
                                      setInvoiceForm({
                                        ...invoiceForm,
                                        deliveryDate: e.target.value,
                                      })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Delivery Contact
                                </label>
                                <div className="col-span-8">
                                  <input
                                    placeholder="Contact name"
                                    value={invoiceForm.deliveryContact}
                                    onChange={(e) =>
                                      setInvoiceForm({
                                        ...invoiceForm,
                                        deliveryContact: e.target.value,
                                      })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-start gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600 pt-2">
                                  Delivery Address
                                </label>
                                <div className="col-span-8">
                                  <textarea
                                    rows={3}
                                    value={invoiceForm.deliveryAddress}
                                    onChange={(e) =>
                                      setInvoiceForm({
                                        ...invoiceForm,
                                        deliveryAddress: e.target.value,
                                      })
                                    }
                                    className="w-full bg-gray-100/70 border border-gray-200 rounded-[2px] p-2 text-gray-700 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  PO Number
                                </label>
                                <div className="col-span-8">
                                  <input
                                    value={invoiceForm.poNumber}
                                    onChange={(e) =>
                                      setInvoiceForm({ ...invoiceForm, poNumber: e.target.value })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-gray-800 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-center gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600">
                                  Project
                                </label>
                                <div className="col-span-8">
                                  <input
                                    placeholder="Project name"
                                    value={invoiceForm.project}
                                    onChange={(e) =>
                                      setInvoiceForm({ ...invoiceForm, project: e.target.value })
                                    }
                                    className="w-full border-b border-gray-300 py-1.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-12 items-start gap-4">
                                <label className="col-span-4 text-right font-semibold text-gray-600 pt-1">
                                  Private Note
                                </label>
                                <div className="col-span-8">
                                  <textarea
                                    rows={2}
                                    value={invoiceForm.privateNote}
                                    onChange={(e) =>
                                      setInvoiceForm({
                                        ...invoiceForm,
                                        privateNote: e.target.value,
                                      })
                                    }
                                    className="w-full border-b border-gray-300 p-1.5 text-gray-700 focus:outline-none focus:border-[#4285F4]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Attachments Section */}
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                          <div className="font-semibold text-gray-700">Attachments</div>
                          <label className="border border-dashed border-gray-300 rounded-[4px] py-4 px-4 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50/70 cursor-pointer">
                            <span>
                              Drag files to attach, or{' '}
                              <span className="text-[#4285F4] hover:underline">
                                Browse files from your device
                              </span>
                            </span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const picked = Array.from(e.target.files || []).map((f) => ({
                                  name: f.name,
                                  size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
                                }));
                                if (picked.length > 0) {
                                  setInvoiceForm((prev) => ({
                                    ...prev,
                                    attachments: [...(prev.attachments || []), ...picked],
                                  }));
                                }
                              }}
                            />
                          </label>

                          {invoiceForm.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {invoiceForm.attachments.map((att, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-2 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700"
                                >
                                  <span>
                                    {att.name} ({att.size})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInvoiceForm((prev) => ({
                                        ...prev,
                                        attachments: prev.attachments.filter((_, i) => i !== idx),
                                      }))
                                    }
                                    className="text-gray-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PAGE 2: PAYMENTS & BALANCE DUE (Screenshot 8) */}
                    {invoicePage === 2 && (
                      <div className="p-7 space-y-5 text-xs">
                        {(() => {
                          const existingInv = editingInvoiceId
                            ? state.invoices.find((i) => i.id === editingInvoiceId)
                            : null;
                          const totalAmt = editorTotals.total;
                          const paidAmt =
                            invoiceForm.status === 'Paid'
                              ? totalAmt
                              : Number(existingInv?.amountPaid) || 0;
                          const balanceDue = Math.max(0, Number((totalAmt - paidAmt).toFixed(2)));
                          const invPayments = editingInvoiceId
                            ? state.paymentsReceived.filter((p) => p.invoiceId === editingInvoiceId)
                            : [];

                          return (
                            <>
                              {/* Column Labels */}
                              <div className="grid grid-cols-4 gap-4 px-3 font-semibold text-gray-700">
                                <div>Date</div>
                                <div>Total Amount</div>
                                <div>Paid Amount</div>
                                <div>Balance Due</div>
                              </div>

                              {/* Blue Highlighted Summary Row */}
                              <div className="bg-[#4285F4] rounded-[2px] p-2.5 grid grid-cols-4 gap-4 items-center text-white">
                                <div className="bg-white text-gray-800 px-3 py-2 rounded-[2px]">
                                  {formatShortDate(invoiceForm.date)}
                                </div>
                                <div className="font-medium text-[13px]">
                                  {totalAmt.toFixed(2)}
                                </div>
                                <div className="font-medium text-[13px]">
                                  {paidAmt.toFixed(2)}
                                </div>
                                <div className="font-medium text-[13px]">
                                  {balanceDue.toFixed(2)}
                                </div>
                              </div>

                              {/* 3 Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!editingInvoiceId) {
                                      if (!invoiceForm.customerId) {
                                        notify('Please select a Customer first.', 'error');
                                        return;
                                      }
                                      const created = createInvoice(invoiceForm);
                                      if (created) {
                                        setEditingInvoiceId(created.id);
                                      }
                                    }
                                    }
                                    setPaymentForm({
                                      date: new Date().toISOString().slice(0, 10),
                                      amount: String(balanceDue || totalAmt),
                                      method: 'Bank Transfer',
                                      bankReference: '',
                                      bankAccount: '1000 Checking Account',
                                    });
                                    setModal('receive-due-page2');
                                  }}
                                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Receive Payment due</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    notify('No unallocated customer deposits found for this account.')
                                  }
                                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  <span>Allocate a payment deposit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!editingInvoiceId || balanceDue <= 0) {
                                      notify('No open balance to apply a credit note to.');
                                      return;
                                    }
                                    issueCreditNote(editingInvoiceId);
                                    setInvoiceForm((prev) => ({ ...prev, status: 'Credited' }));
                                  }}
                                  className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-300 rounded-[3px] bg-white hover:bg-gray-50 text-[#4285F4] font-medium cursor-pointer"
                                >
                                  <Search className="w-3.5 h-3.5" />
                                  <span>Use a Credit Note</span>
                                </button>
                              </div>

                              {/* Payments Table */}
                              <div className="pt-2 overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-300 text-gray-700">
                                      <th className="py-2.5 px-2 font-semibold">Date</th>
                                      <th className="py-2.5 px-2 font-semibold">Payment Method</th>
                                      <th className="py-2.5 px-2 font-semibold">Paid Amount</th>
                                      <th className="py-2.5 px-2 font-semibold">Bank Reference</th>
                                      <th className="py-2.5 px-2 font-semibold">Days Late</th>
                                      <th className="py-2.5 px-2 font-semibold">Bank Account</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {invPayments.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-4 px-2 text-gray-400">
                                          No items to show
                                        </td>
                                      </tr>
                                    ) : (
                                      invPayments.map((pmt) => (
                                        <tr key={pmt.id}>
                                          <td className="py-2.5 px-2 text-gray-700">
                                            {formatShortDate(pmt.date)}
                                          </td>
                                          <td className="py-2.5 px-2 text-gray-700">{pmt.method}</td>
                                          <td className="py-2.5 px-2 font-medium text-emerald-700">
                                            {Number(pmt.amount).toFixed(2)}
                                          </td>
                                          <td className="py-2.5 px-2 text-gray-600">
                                            {pmt.reference || '—'}
                                          </td>
                                          <td className="py-2.5 px-2 text-gray-500">0</td>
                                          <td className="py-2.5 px-2 text-gray-600">
                                            {pmt.bankAccount || '1000 Checking Account'}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Bottom Pagination (« 1 2 ») + Cancel / Done Footer */}
                    <div className="px-7 py-3.5 border-t border-gray-200 bg-gray-50/40 flex items-center justify-between">
                      <div className="inline-flex border border-gray-300 rounded-[3px] overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setInvoicePage(1)}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-500 cursor-pointer"
                        >
                          «
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePage(1)}
                          className={`px-3 py-1.5 border-l border-gray-300 cursor-pointer ${
                            invoicePage === 1
                              ? 'bg-[#4285F4] text-white font-medium'
                              : 'bg-white text-[#4285F4] hover:bg-gray-50'
                          }`}
                        >
                          1
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePage(2)}
                          className={`px-3 py-1.5 border-l border-gray-300 cursor-pointer ${
                            invoicePage === 2
                              ? 'bg-[#4285F4] text-white font-medium'
                              : 'bg-white text-[#4285F4] hover:bg-gray-50'
                          }`}
                        >
                          2
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePage(2)}
                          className="px-2.5 py-1.5 border-l border-gray-300 bg-white hover:bg-gray-50 text-[#4285F4] cursor-pointer"
                        >
                          »
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setInvoiceScreen('list')}
                          className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-[#4285F4] text-xs font-medium rounded-[3px] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!invoiceForm.customerId) {
                              notify('Please select a Customer first.', 'error');
                              return;
                            }
                            if (editingInvoiceId) {
                              updateInvoice(editingInvoiceId, invoiceForm);
                            } else {
                              createInvoice(invoiceForm);
                            }
                            setInvoiceScreen('list');
                          }}
                          className="px-6 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. INVOICE DOCUMENT PREVIEW / PRINT / EMAIL MODAL (Screenshot 9) */}
            {previewInvoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 overflow-y-auto">
                <div className="bg-white rounded-[4px] border border-gray-200 shadow-2xl w-full max-w-[920px] p-6 relative my-8">
                  <button
                    type="button"
                    onClick={() => setPreviewInvoiceId(null)}
                    className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                    {/* Left Paper Document Preview */}
                    <div className="md:col-span-8 border border-gray-300 bg-white p-7 shadow-inner max-h-[75vh] overflow-y-auto text-xs text-gray-800 space-y-6">
                      {(() => {
                        const cust = state.customers.find(
                       (c) => c.id === previewInvoice.customerId
                     );
                     const tplGlobal = {
                       ...(state.company?.documentTemplate?.global || {}),
                       ...(previewInvoice.customTemplate?.global || {}),
                     };
                     const tplDoc = {
                       ...(DEFAULT_DOC_TYPE_OVERRIDES.invoice || {}),
                       ...(state.company?.documentTemplate?.docs?.invoice || {}),
                       ...(previewInvoice.customTemplate?.doc || {}),
                     };
                     const headerBg = tplGlobal.colorScheme || '#EFEFEF';
                        const currency = state.company?.currency || '₹';
                        const balDue = Math.max(
                          0,
                          Number(
                            (
                              (Number(previewInvoice.total) || 0) -
                              (Number(previewInvoice.amountPaid) || 0)
                            ).toFixed(2)
                          )
                        );
                        const invPayments = state.paymentsReceived.filter(
                          (p) => p.invoiceId === previewInvoice.id
                        );

                        return (
                          <div
                            style={{
                              fontFamily: tplGlobal.fontFamily || 'Arial',
                              color: tplGlobal.fontColor || '#000000',
                            }}
                            className="space-y-6"
                          >
                            {/* Top Company Info & Invoice Meta */}
                            <div className="flex items-start justify-between gap-4">
                              <div
                                className={
                                  tplGlobal.logoPlacement === 'Left'
                                    ? 'flex items-start gap-3.5'
                                    : 'space-y-2'
                                }
                              >
                                {state.company?.logoDataUrl ? (
                                  <img
                                    src={state.company.logoDataUrl}
                                    alt="Company Logo"
                                    style={{
                                      width: `${tplGlobal.logoWidth || 165}px`,
                                      height: `${tplGlobal.logoHeight || 110}px`,
                                    }}
                                    className="object-cover rounded-[2px] shrink-0"
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: `${tplGlobal.logoWidth || 165}px`,
                                      height: `${tplGlobal.logoHeight || 100}px`,
                                    }}
                                    className="bg-gradient-to-tr from-indigo-900 via-purple-700 to-amber-500 rounded-[2px] flex items-center justify-center text-white font-bold text-sm tracking-wider shrink-0"
                                  >
                                    {state.company?.name || 'COMPANY'}
                                  </div>
                                )}
                                <div>
                                  {tplGlobal.showCompanyName !== false && (
                                    <div className="text-[15px] font-bold">
                                      {state.company?.name || 'Company Name'}
                                    </div>
                                  )}
                                  {tplGlobal.showCompanyAddress !== false && (
                                    <div className="text-[11px] opacity-80 whitespace-pre-line">
                                      {[
                                        state.company?.address,
                                        [
                                          state.company?.city,
                                          state.company?.state,
                                          state.company?.postCode,
                                        ]
                                          .filter(Boolean)
                                          .join(', '),
                                      ]
                                        .filter(Boolean)
                                        .join('\n')}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-right space-y-1">
                                <div className="text-[20px] font-bold tracking-tight">
                                  {tplDoc.title || 'INVOICE'}
                                </div>
                                <div className="text-[11.5px]">
                                  no. {previewInvoice.id}
                                </div>
                                <div className="text-[11.5px] opacity-80">
                                  {formatShortDate(previewInvoice.date)}
                                </div>
                                <div className="pt-2 font-bold">
                                  {previewInvoice.paymentTerms || 'Due on receipt'}
                                </div>
                                <div className="font-semibold">
                                  Amount due: {currency}
                                  {balDue.toFixed(2)}
                                </div>
                                {previewInvoice.sentDate && (
                                  <div className="text-[11px] font-semibold opacity-85">
                                    Sent on {formatShortDate(previewInvoice.sentDate)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Billing & Shipping Addresses */}
                            <div className="grid grid-cols-2 gap-6 pt-2">
                              {tplGlobal.showBillingAddress !== false && (
                                <div>
                                  <div className="font-semibold underline mb-1">
                                    Billing address
                                  </div>
                                  <div className="font-bold uppercase">
                                    {cust?.name || previewInvoice.customerId}
                                  </div>
                                  <div className="text-[11px] opacity-85 whitespace-pre-line">
                                    {previewInvoice.billingAddress || cust?.location || ''}
                                  </div>
                                </div>
                              )}

                              {tplGlobal.showShippingAddress !== false && (
                                <div>
                                  <div className="font-semibold underline mb-1">
                                    Shipping address
                                  </div>
                                  <div className="font-bold uppercase">
                                    {cust?.name || previewInvoice.customerId}
                                  </div>
                                  <div className="text-[11px] opacity-85 whitespace-pre-line">
                                    {previewInvoice.deliveryAddress ||
                                      cust?.shippingAddress ||
                                      cust?.location ||
                                      ''}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Line Items Table */}
                            <div>
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr
                                    style={{ backgroundColor: headerBg }}
                                    className="font-bold"
                                  >
                                    <th className="py-1.5 px-2">
                                      {tplDoc.itemColLabel || 'Item name & description'}
                                    </th>
                                    <th className="py-1.5 px-2 text-right">VAT</th>
                                    {tplDoc.showQty !== false && (
                                      <th className="py-1.5 px-2 text-right">
                                        {tplDoc.qtyColLabel || 'Qty.'}
                                      </th>
                                    )}
                                    {tplDoc.showUnitPrice !== false && (
                                      <th className="py-1.5 px-2 text-right">
                                        {tplDoc.unitPriceColLabel || 'Unit price'}
                                      </th>
                                    )}
                                    <th className="py-1.5 px-2 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {(previewInvoice.items || []).map((line, idx) => {
                                    const prod = state.products.find(
                                      (p) => p.id === line.productId
                                    );
                                    const amt =
                                      (Number(line.qty) || 0) *
                                      (Number(line.unitPrice) || 0) *
                                      (1 - (Number(line.discPct) || 0) / 100);
                                    const codeText = line.code || prod?.sku || '';
                                    return (
                                      <tr key={idx}>
                                        <td className="py-2 px-2 font-semibold">
                                          {tplDoc.showProductNumber !== false && codeText
                                            ? `${codeText} `
                                            : ''}
                                          {line.description || prod?.name || ''}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          {Number(line.taxRate ?? 20)}%
                                        </td>
                                        {tplDoc.showQty !== false && (
                                          <td className="py-2 px-2 text-right">
                                            {Number(line.qty) || 1}
                                          </td>
                                        )}
                                        {tplDoc.showUnitPrice !== false && (
                                          <td className="py-2 px-2 text-right">
                                            {currency}
                                            {(Number(line.unitPrice) || 0).toFixed(2)}
                                          </td>
                                        )}
                                        <td className="py-2 px-2 text-right font-medium">
                                          {currency}
                                          {amt.toFixed(2)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              {/* Totals Block */}
                              <div className="mt-2 flex justify-end">
                                <div className="w-64 space-y-1.5 text-[11px]">
                                  <div className="flex justify-between px-2 font-semibold">
                                    <span>Subtotal</span>
                                    <span>
                                      {currency}
                                      {(Number(previewInvoice.subtotal) || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  {Number(previewInvoice.discountAmount) > 0 && (
                                    <div className="flex justify-between px-2 opacity-85">
                                      <span>Discount ({previewInvoice.discountRate || 0}%)</span>
                                      <span>
                                        -{currency}
                                        {Number(previewInvoice.discountAmount).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between px-2">
                                    <span>VAT</span>
                                    <span>
                                      {currency}
                                      {(Number(previewInvoice.taxTotal) || 0).toFixed(2)}
                                    </span>
                                  </div>
                                  <div
                                    style={{ backgroundColor: headerBg }}
                                    className="flex justify-between px-2 py-1.5 text-[13px] font-bold"
                                  >
                                    <span>Total</span>
                                    <span>
                                      {currency}
                                      {(Number(previewInvoice.total) || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Payment Information & Notes */}
                            <div className="pt-3 border-t border-gray-200 space-y-1.5">
                              <div className="text-[12.5px] font-normal">
                                Payment Information
                              </div>
                              {invPayments.length > 0 ? (
                                <ul className="list-disc pl-5 text-[11px] font-semibold space-y-1">
                                  {invPayments.map((p) => (
                                    <li key={p.id}>
                                      {currency}
                                      {Number(p.amount).toFixed(2)} on {formatShortDate(p.date)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-[11px] opacity-75">
                                  No payments recorded yet ({previewInvoice.paymentTerms || 'Due on receipt'}).
                                </div>
                              )}
                              {(previewInvoice.documentNote || tplDoc.notes || tplGlobal.notes) && (
                                <div className="pt-2 text-[11px] whitespace-pre-line opacity-85">
                                  {previewInvoice.documentNote || tplDoc.notes || tplGlobal.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );

                    {/* Right Action Sidebar (Email, Print, Download, Customise) */}
                    <div className="md:col-span-4 space-y-3 pt-1">
                      <button
                        type="button"
                        onClick={() => markInvoiceSent(previewInvoice.id)}
                        className="w-full py-2.5 px-4 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 shadow-2xs cursor-pointer"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>

                      <div className="border-t border-gray-200 my-3" />

                      <button
                     type="button"
                     onClick={() => openCustomiseDocumentModal('invoice', previewInvoice)}
                     className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-[#4285F4] text-xs font-medium rounded-[3px] flex items-center justify-center gap-3 cursor-pointer"
                   >
                     <Pencil className="w-4 h-4" />
                     <span>Customise this document</span>
                   </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. RECEIVE PAYMENT DUE MODAL (FROM EDITOR PAGE 2) */}
            <Modal
              open={modal === 'receive-due-page2'}
              onClose={() => setModal(null)}
              title={`Receive Payment — ${editingInvoiceId || ''}`}
              maxWidth="max-w-md"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editingInvoiceId) return;
                  recordInvoicePayment({
                    invoiceId: editingInvoiceId,
                    amount: paymentForm.amount,
                    date: paymentForm.date,
                    method: paymentForm.method,
                    bankReference: paymentForm.bankReference,
                    bankAccount: paymentForm.bankAccount,
                  });
                  const existingInv = state.invoices.find((i) => i.id === editingInvoiceId);
                  const newTotalPaid =
                    (Number(existingInv?.amountPaid) || 0) + (Number(paymentForm.amount) || 0);
                  setInvoiceForm((prev) => ({
                    ...prev,
                    status: newTotalPaid >= editorTotals.total - 0.01 ? 'Paid' : 'Partial',
                  }));
                  setModal(null);
                }}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Paid Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium mb-1">Payment Method</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI / NEFT">UPI / NEFT</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Bank Account</label>
                    <select
                      value={paymentForm.bankAccount}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, bankAccount: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="1000 Checking Account">1000 Checking Account</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium mb-1">Bank Reference</label>
                  <input
                    placeholder="UTR / Transaction Ref"
                    value={paymentForm.bankReference}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, bankReference: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                  >
                    Save Payment
                  </button>
                </div>
              </form>
            </Modal>

            {/* 5. CONVERT QUOTES / SALES ORDERS / DELIVERY NOTES TO INVOICES MODAL */}
            <Modal
              open={Boolean(convertModalType)}
              onClose={() => setConvertModalType(null)}
              title={
                convertModalType === 'quotes'
                  ? 'Convert Quotes to Invoices'
                  : convertModalType === 'orders'
                  ? 'Convert Sales Orders to Invoices'
                  : 'Convert Delivery Notes to Invoices'
              }
            >
              <div className="space-y-3 text-xs">
                {convertModalType === 'quotes' &&
                  (state.quotes.filter((qt) => qt.status !== 'Converted' && qt.status !== 'Cancelled')
                    .length === 0 ? (
                    <div className="py-6 text-center text-gray-400">
                      No open quotes available to convert.
                    </div>
                  ) : (
                    state.quotes
                      .filter((qt) => qt.status !== 'Converted' && qt.status !== 'Cancelled')
                      .map((qt) => {
                        const cust = state.customers.find((c) => c.id === qt.customerId);
                        const lead = state.leads.find((l) => l.id === qt.customerId);
                        return (
                          <div
                            key={qt.id}
                            className="p-3 border border-gray-200 rounded flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-gray-800">
                                {qt.id} — {cust?.name || lead?.company || qt.customerName || qt.customerId}
                              </div>
                              <div className="text-gray-400">{qt.date}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const created = convertQuoteToInvoice(qt.id);
                                setConvertModalType(null);
                                if (created) openExistingInvoiceEditor(created, 1);
                              }}
                              className="px-3 py-1.5 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                            >
                              Convert to Invoice
                            </button>
                          </div>
                        );
                      })
                  ))}

                {convertModalType === 'orders' &&
                  (state.salesOrders.filter((so) => !so.invoiced).length === 0 ? (
                    <div className="py-6 text-center text-gray-400">
                      No un-invoiced Sales Orders available.
                    </div>
                  ) : (
                    state.salesOrders
                      .filter((so) => !so.invoiced)
                      .map((so) => {
                        const cust = state.customers.find((c) => c.id === so.customerId);
                        return (
                          <div
                            key={so.id}
                            className="p-3 border border-gray-200 rounded flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-gray-800">
                                {so.id} — {cust?.name || so.customerId}
                              </div>
                              <div className="text-gray-400">{so.date}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const created = createInvoice({
                                  customerId: so.customerId,
                                  orderId: so.id,
                                  items: so.items || [],
                                  discountPct: so.discountPct || 0,
                                });
                                setConvertModalType(null);
                                if (created) openExistingInvoiceEditor(created, 1);
                              }}
                              className="px-3 py-1.5 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                            >
                              Convert to Invoice
                            </button>
                          </div>
                        );
                      })
                  ))}

                {convertModalType === 'deliveryNotes' &&
                  (state.deliveryNotes.length === 0 ? (
                    <div className="py-6 text-center text-gray-400">
                      No Delivery Notes available.
                    </div>
                  ) : (
                    state.deliveryNotes.map((dn) => {
                      const cust = state.customers.find((c) => c.id === dn.customerId);
                      return (
                        <div
                          key={dn.id}
                          className="p-3 border border-gray-200 rounded flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-gray-800">
                              {dn.id} — {cust?.name || dn.customerId}
                            </div>
                            <div className="text-gray-400">{dn.date}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const created = convertDeliveryNoteToInvoice(dn.id);
                              setConvertModalType(null);
                              if (created) openExistingInvoiceEditor(created, 1);
                            }}
                            className="px-3 py-1.5 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                          >
                            Convert to Invoice
                          </button>
                        </div>
                      );
                    })
                  ))}
              </div>
            </Modal>
          </>
        )}

            {subTab === 'payments' && (
              <>
                <OneUpPageHeader title="Payments Received" />
                <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                        <th className="py-3 px-4 font-medium">Payment #</th>
                        <th className="py-3 px-4 font-medium">Invoice</th>
                        <th className="py-3 px-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium">Method</th>
                        <th className="py-3 px-4 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {state.paymentsReceived.map((p) => {
                        const cust = state.customers.find((c) => c.id === p.customerId);
                        return (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-medium text-gray-800">{p.id}</td>
                            <td className="py-3 px-4 text-[#4285F4]">{p.invoiceId}</td>
                            <td className="py-3 px-4 text-gray-700">{cust?.name || p.customerId}</td>
                            <td className="py-3 px-4 text-gray-500">{p.date}</td>
                            <td className="py-3 px-4 text-gray-600">{p.method}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                              {formatAmount(p.amount)}
                            </td>
                          </tr>
                        );
                      })}
                      {state.paymentsReceived.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-gray-400">
                            No payments recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {subTab === 'credits' && (
              <>
                <OneUpPageHeader title="Credit Notes & Returns" />
                <div className="bg-white border border-gray-200 rounded-[4px] p-6 text-xs text-gray-600">
                  Credited Invoices automatically reverse Revenue/Tax in the General Ledger and
                  restock returned items into your Main Warehouse.
                  <div className="mt-4 divide-y divide-gray-100 border border-gray-200 rounded">
                    {state.invoices
                      .filter((i) => i.status === 'Credited')
                      .map((i) => (
                        <div key={i.id} className="p-3 flex justify-between">
                          <span className="font-medium text-gray-800">CN-{i.id}</span>
                          <span>{formatAmount(i.total)}</span>
                        </div>
                      ))}
                    {state.invoices.filter((i) => i.status === 'Credited').length === 0 && (
                      <div className="p-6 text-center text-gray-400">
                        No credit notes issued yet.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* MODALS (QUOTE / INVOICE / SALES RECEIPT / SALES ORDER / PAYMENT)    */}
        {/* =================================================================== */}
        <Modal
          open={
            modal === 'quote' ||
            modal === 'invoice' ||
            modal === 'sales-receipt' ||
            modal === 'sales-order'
          }
          onClose={() => setModal(null)}
          title={
            modal === 'quote'
              ? 'New Quote'
              : modal === 'sales-receipt'
              ? 'New Sales Receipt'
              : modal === 'sales-order'
              ? 'New Sales Order'
              : 'New Customer Invoice'
          }
        >
          {state.customers.length === 0 || state.products.length === 0 ? (
            <div className="text-xs text-gray-600 space-y-3">
              <p>
                Please add at least one Customer and one Product in Inventory before creating a{' '}
                {modal}.
              </p>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 bg-[#4285F4] text-white rounded"
              >
                OK
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const selectedCust = state.customers.find((c) => c.id === docCustomerId);
                const discountPct = Number(selectedCust?.discountTier) || 0;
                if (modal === 'quote') {
                  createQuote({ customerId: docCustomerId, items: docItems, discountPct });
                } else if (modal === 'sales-receipt') {
                  createSalesReceipt({ customerId: docCustomerId, items: docItems, discountPct });
                } else if (modal === 'sales-order') {
                  createSalesOrder({ customerId: docCustomerId, items: docItems, discountPct });
                } else {
                  createInvoice({ customerId: docCustomerId, items: docItems, discountPct });
                }
                setModal(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-medium mb-1">Customer</label>
                <select
                  value={docCustomerId}
                  onChange={(e) => setDocCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {state.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.discountTier > 0 ? `(${c.discountTier}% Price Family)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-medium">Line Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      const p = state.products[0];
                      if (!p) return;
                      setDocItems([
                        ...docItems,
                        { productId: p.id, qty: 1, unitPrice: p.price, taxRate: p.taxRate },
                      ]);
                    }}
                    className="text-[#4285F4] hover:underline font-medium cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>
                {docItems.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={line.productId}
                      onChange={(e) => {
                        const p = state.products.find((x) => x.id === e.target.value);
                        const copy = [...docItems];
                        copy[idx] = {
                          productId: p.id,
                          qty: line.qty,
                          unitPrice: p.price,
                          taxRate: p.taxRate,
                        };
                        setDocItems(copy);
                      }}
                      className="col-span-6 px-2.5 py-2 border border-gray-300 rounded"
                    >
                      {state.products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.qty}
                      onChange={(e) => {
                        const copy = [...docItems];
                        copy[idx].qty = Number(e.target.value) || 1;
                        setDocItems(copy);
                      }}
                      className="col-span-2 px-2 py-2 border border-gray-300 rounded text-right"
                    />
                    <div className="col-span-3 text-right font-semibold">
                      {formatAmount(line.qty * line.unitPrice)}
                    </div>
                    <button
                      type="button"
                      disabled={docItems.length === 1}
                      onClick={() => setDocItems(docItems.filter((_, i) => i !== idx))}
                      className="col-span-1 text-right text-gray-400 hover:text-red-500 disabled:opacity-30 font-bold px-1"
                      title="Remove line"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-2.5 space-y-1 text-right">
                <div className="text-gray-500">
                  Subtotal:{' '}
                  <span className="font-medium text-gray-800">
                    {formatAmount(docItems.reduce((sum, l) => sum + l.qty * l.unitPrice, 0))}
                  </span>
                </div>
                <div className="text-gray-500">
                  Tax:{' '}
                  <span className="font-medium text-gray-800">
                    {formatAmount(
                      docItems.reduce(
                        (sum, l) => sum + l.qty * l.unitPrice * ((Number(l.taxRate) || 0) / 100),
                        0
                      )
                    )}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  Total:{' '}
                  {formatAmount(
                    docItems.reduce(
                      (sum, l) =>
                        sum + l.qty * l.unitPrice * (1 + (Number(l.taxRate) || 0) / 100),
                      0
                    )
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                >
                  {modal === 'quote'
                    ? 'Save Quote'
                    : modal === 'sales-receipt'
                    ? 'Save Sales Receipt'
                    : modal === 'sales-order'
                    ? 'Create Sales Order'
                    : 'Issue Invoice'}
                </button>
              </div>
            </form>
          )}
        </Modal>

        <Modal
          open={modal === 'payment'}
          onClose={() => setModal(null)}
          title={`Record Payment for ${selectedInvoice?.id || ''}`}
          maxWidth="max-w-sm"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              recordInvoicePayment({ invoiceId: selectedInvoice.id, amount: payAmount });
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Amount Received</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </Modal>

        {/* EDIT PRICE FAMILIES MODAL */}
        <Modal
          open={modal === 'price-families'}
          onClose={() => setModal(null)}
          title="Edit Price Families"
          subtitle="Create customer pricing tiers that automatically apply discounts on Quotes, Orders, and Invoices"
        >
          <div className="space-y-4 text-xs">
            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
              {pfList.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No price families configured yet. Add one below (e.g., Wholesale — 15%).
                </div>
              ) : (
                pfList.map((pf) => (
                  <div key={pf.id} className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800">{pf.name}</span>
                      <span className="ml-2 text-emerald-700 font-medium">
                        {pf.discountPct}% discount
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPfList((prev) => prev.filter((x) => x.id !== pf.id))}
                      className="text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-12 gap-2">
              <input
                placeholder="Price Family Name (e.g. Wholesale)"
                value={newPfName}
                onChange={(e) => setNewPfName(e.target.value)}
                className="col-span-7 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Discount %"
                value={newPfDiscount}
                onChange={(e) => setNewPfDiscount(e.target.value)}
                className="col-span-3 px-3 py-2 border border-gray-300 rounded"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPfName.trim()) return;
                  setPfList((prev) => [
                    ...prev,
                    {
                      id: `PF-${Date.now()}`,
                      name: newPfName.trim(),
                      discountPct: Number(newPfDiscount) || 0,
                    },
                  ]);
                  setNewPfName('');
                  setNewPfDiscount('10');
                }}
                className="col-span-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded cursor-pointer"
              >
                + Add
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  savePriceFamilies(pfList);
                  setModal(null);
                }}
                className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
              >
                Save Price Families
              </button>
            </div>
          </div>
        </Modal>

        {/* QUICK CRM TASK / CALL / OPPORTUNITY FROM CUSTOMER DETAIL */}
        <Modal
          open={modal === 'task' || modal === 'call' || modal === 'opportunity'}
          onClose={() => setModal(null)}
          title={
            modal === 'task'
              ? `New Task — ${activeCustomer?.name || ''}`
              : modal === 'call'
              ? `Log Call — ${activeCustomer?.name || ''}`
              : `New Opportunity — ${activeCustomer?.name || ''}`
          }
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (modal === 'task') {
                addTask({
                  title: crmQuickForm.title,
                  relatedTo: activeCustomer?.name || 'Customer',
                  dueDate: crmQuickForm.dueDate,
                });
              } else if (modal === 'call') {
                addCall({
                  subject: crmQuickForm.title,
                  contact: activeCustomer?.name || 'Customer',
                });
              } else {
                addOpportunity({
                  title: crmQuickForm.title,
                  company: activeCustomer?.name || 'Customer',
                  value: crmQuickForm.value,
                });
              }
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">
                {modal === 'task'
                  ? 'Task Description'
                  : modal === 'call'
                  ? 'Call Subject'
                  : 'Opportunity Title'}
              </label>
              <input
                required
                value={crmQuickForm.title}
                onChange={(e) => setCrmQuickForm({ ...crmQuickForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            {modal === 'opportunity' && (
              <div>
                <label className="block font-medium mb-1">Estimated Value</label>
                <input
                  type="number"
                  required
                  value={crmQuickForm.value}
                  onChange={(e) => setCrmQuickForm({ ...crmQuickForm, value: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // 8. PURCHASING VIEW (SUPPLIERS, EXPENSES, SUPPLIER BILLS, AUTO-REPLENISH)
  // ============================================================================

  function PurchasingView({ subTab, setSubTab, quickAction }) {
    const {
      state, formatAmount, enrichedProducts, addVendor, createExpense, payVendorBill, generateAutoReplenishmentPOs,
    } = useERP();

    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [modal, setModal] = useState(null);
    const [vndForm, setVndForm] = useState({ name: '', email: '', phone: '', location: '', paymentTerms: 'Net 30' });
    const [expForm, setExpForm] = useState({ vendorName: '', category: 'Operating Expenses', amount: '', notes: '' });

    useEffect(() => {
      if (quickAction === 'expense') setModal('expense');
    }, [quickAction]);

    const filteredVendors = state.vendors.filter(
      (v) => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const lowStockGroups = useMemo(() => {
      const lowItems = enrichedProducts.filter((p) => p.isLowStock);
      const map = {};
      lowItems.forEach((p) => {
        const vId = p.vendorId || state.vendors[0]?.id || 'SUP-001';
        if (!map[vId]) {
          const v = state.vendors.find((x) => x.id === vId);
          map[vId] = { vendorId: vId, vendorName: v?.name || vId, items: [] };
        }
        const suggested = Math.max(p.reorderPoint * 2 - p.available, 10);
        map[vId].items.push({ productId: p.id, sku: p.sku, name: p.name, available: p.available, reorderPoint: p.reorderPoint, orderQty: suggested, unitCost: p.cost });
      });
      return Object.values(map);
    }, [enrichedProducts, state.vendors]);

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#03A9F4"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'expenses', label: 'Expenses' },
          ]}
          moreTabs={[
            { id: 'bills', label: 'Supplier Bills' },
            { id: 'replenish', label: 'Auto-Replenishment', badge: lowStockGroups.length },
          ]}
        />

        <div className="max-w-[1160px] mx-auto px-6 pt-6">
          {subTab === 'suppliers' && (
            <>
              <OneUpPageHeader title="Suppliers" primaryButtonLabel="New Supplier" onPrimaryClick={() => setModal('vendor')} />
              <div className="bg-white border border-gray-200 rounded-[4px] mb-5 flex items-center justify-between px-3.5 h-11">
                <div className="flex items-center flex-1">
                  <Search className="w-4 h-4 text-gray-400 mr-2.5" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in Suppliers"
                    className="w-full text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 cursor-pointer ${viewMode === 'grid' ? 'bg-blue-50 text-[#4285F4]' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 cursor-pointer ${viewMode === 'list' ? 'bg-blue-50 text-[#4285F4]' : 'text-gray-400 hover:bg-gray-50'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filteredVendors.map((v) => (
                    <div key={v.id} className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <span className="text-[14.5px] font-normal text-[#4285F4]">{v.name}</span>
                          <span className="text-[11px] text-gray-400">{v.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{v.location}</span>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>{v.paymentTerms}</span>
                        <MoreVertical className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                        <th className="py-3 px-4 font-medium">ID</th>
                        <th className="py-3 px-4 font-medium">Supplier</th>
                        <th className="py-3 px-4 font-medium">Location</th>
                        <th className="py-3 px-4 font-medium">Terms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendors.map((v) => (
                        <tr key={v.id}>
                          <td className="py-3 px-4 text-gray-400">{v.id}</td>
                          <td className="py-3 px-4 text-[#4285F4] font-medium">{v.name}</td>
                          <td className="py-3 px-4 text-gray-600">{v.location}</td>
                          <td className="py-3 px-4 text-gray-600">{v.paymentTerms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {subTab === 'expenses' && (
            <>
              <OneUpPageHeader title="Expenses" primaryButtonLabel="New Expense" onPrimaryClick={() => setModal('expense')} />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Expense #</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Payee / Vendor</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="py-3 px-4 font-medium text-gray-700">{e.id}</td>
                        <td className="py-3 px-4 text-gray-500">{e.date}</td>
                        <td className="py-3 px-4 text-gray-900">{e.vendorName}</td>
                        <td className="py-3 px-4 text-gray-600">{e.category}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatAmount(e.amount)}</td>
                      </tr>
                    ))}
                    {state.expenses.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No expenses recorded.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'bills' && (
            <>
              <OneUpPageHeader title="Supplier Bills (Accounts Payable)" />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Bill #</th>
                      <th className="py-3 px-4 font-medium">Supplier</th>
                      <th className="py-3 px-4 font-medium">Due Date</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Total</th>
                      <th className="py-3 px-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.vendorBills.map((b) => {
                      const v = state.vendors.find((x) => x.id === b.vendorId);
                      return (
                        <tr key={b.id}>
                          <td className="py-3 px-4 font-medium text-[#4285F4]">{b.id}</td>
                          <td className="py-3 px-4 text-gray-800">{v?.name || b.vendorId}</td>
                          <td className="py-3 px-4 text-gray-500">{b.dueDate}</td>
                          <td className="py-3 px-4"><StatusBadge status={b.status} /></td>
                          <td className="py-3 px-4 text-right font-semibold">{formatAmount(b.total)}</td>
                          <td className="py-3 px-4 text-right">
                            {b.status !== 'Paid' && (
                              <button
                                onClick={() => payVendorBill(b.id)}
                                className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-medium cursor-pointer"
                              >
                                Pay Bill
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {state.vendorBills.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-400">No supplier bills yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'replenish' && (
            <>
              <OneUpPageHeader
                title="Automatic Inventory Replenishment"
                primaryButtonLabel={lowStockGroups.length > 0 ? 'Validate & Send All Orders' : null}
                onPrimaryClick={() => generateAutoReplenishmentPOs(lowStockGroups)}
              />
              {lowStockGroups.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-[4px] p-12 text-center text-xs text-gray-500">
                  All SKUs are currently above their reorder threshold.
                </div>
              ) : (
                <div className="space-y-4">
                  {lowStockGroups.map((grp) => (
                    <div key={grp.vendorId} className="bg-white border border-gray-200 rounded-[4px] overflow-hidden">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-800">Supplier: {grp.vendorName}</span>
                        <span className="text-gray-500">{grp.items.length} item(s) below reorder point</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400">
                            <th className="py-2.5 px-4">SKU</th>
                            <th className="py-2.5 px-4">Product</th>
                            <th className="py-2.5 px-4 text-right">Available</th>
                            <th className="py-2.5 px-4 text-right">Reorder Pt</th>
                            <th className="py-2.5 px-4 text-right">Suggested Order</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {grp.items.map((it) => (
                            <tr key={it.productId}>
                              <td className="py-2.5 px-4 font-mono">{it.sku}</td>
                              <td className="py-2.5 px-4 font-medium text-gray-800">{it.name}</td>
                              <td className="py-2.5 px-4 text-right text-rose-600 font-semibold">{it.available}</td>
                              <td className="py-2.5 px-4 text-right text-gray-500">{it.reorderPoint}</td>
                              <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">+{it.orderQty} units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <Modal open={modal === 'vendor'} onClose={() => setModal(null)} title="New Supplier">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addVendor(vndForm);
              setVndForm({ name: '', email: '', phone: '', location: '', paymentTerms: 'Net 30' });
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Supplier Name</label>
              <input required value={vndForm.name} onChange={(e) => setVndForm({ ...vndForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Email</label>
                <input type="email" value={vndForm.email} onChange={(e) => setVndForm({ ...vndForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Location</label>
                <input value={vndForm.location} onChange={(e) => setVndForm({ ...vndForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Supplier</button>
            </div>
          </form>
        </Modal>

        <Modal open={modal === 'expense'} onClose={() => setModal(null)} title="Record Expense">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createExpense(expForm);
              setExpForm({ vendorName: '', category: 'Operating Expenses', amount: '', notes: '' });
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Payee / Vendor</label>
              <input required value={expForm.vendorName} onChange={(e) => setExpForm({ ...expForm, vendorName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Category</label>
                <input value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Amount</label>
                <input type="number" step="0.01" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Post Expense</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // 9. INVENTORY VIEW (STOCK, PURCHASE ORDERS, SALES ORDERS, RECEIVING, DELIVERY)
  // ============================================================================

  function InventoryView({ subTab, setSubTab, quickAction }) {
    const {
      state, formatAmount, notify, enrichedProducts, addProduct, transferStock, createPurchaseOrder, receivePurchaseOrder, convertPOToBill,
      createSalesOrder, advanceFulfillment, createInvoice,
    } = useERP();

    const [modal, setModal] = useState(null);
    const [poModalOpen, setPoModalOpen] = useState(false);
const [poVendorId, setPoVendorId] = useState('');
const [poProductId, setPoProductId] = useState('');
const [poQty, setPoQty] = useState(10);
const [poUnitCost, setPoUnitCost] = useState(0);

const openNewPOModal = () => {
  const vendor = state.vendors[0];
  const product = state.products[0];
  setPoVendorId(vendor?.id || '');
  setPoProductId(product?.id || '');
  setPoQty(10);
  setPoUnitCost(Number(product?.cost ?? product?.buyPrice ?? 0));
  setPoModalOpen(true);
};

const submitPurchaseOrder = (e) => {
  e.preventDefault();
  const vendor = state.vendors.find(v => v.id === poVendorId);
  const product = state.products.find(p => p.id === poProductId);

  if (!vendor || !product || Number(poQty) <= 0) {
    notify('Select a supplier, product, and valid quantity.');
    return;
  }

  createPurchaseOrder({
    vendorId: vendor.id,
    vendorName: vendor.name,
    items: [
      {
        productId: product.id,
        name: product.name,
        qty: Number(poQty),
        unitCost: Number(poUnitCost),
      },
    ],
    total: Number(poQty) * Number(poUnitCost),
  });

  setPoModalOpen(false);
  notify('Purchase Order created.');
};
    const [prodForm, setProdForm] = useState({ name: '', sku: '', category: 'General', cost: '200', price: '450', reorderPoint: '15', mainWarehouseQty: '25' });
    const [trfForm, setTrfForm] = useState({ productId: '', qty: '5', fromLocation: 'Main Warehouse', toLocation: 'Retail Store', notes: '' });
    const [soCustomerId, setSoCustomerId] = useState('');
    const [soProductId, setSoProductId] = useState('');
    const [soQty, setSoQty] = useState(2);

    useEffect(() => {
      if (enrichedProducts.length > 0 && !trfForm.productId) setTrfForm((f) => ({ ...f, productId: enrichedProducts[0].id }));
      if (state.customers.length > 0 && !soCustomerId) setSoCustomerId(state.customers[0].id);
      if (state.products.length > 0 && !soProductId) setSoProductId(state.products[0].id);
    }, [enrichedProducts, state.customers, state.products, trfForm.productId, soCustomerId, soProductId]);

    useEffect(() => {
      if (quickAction === 'product') setModal('product');
      if (quickAction === 'po') openNewPOModal();
    }, [quickAction]);

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#F59E0B"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'stock', label: 'Stock' },
            { id: 'po', label: 'Purchase Orders' },
            { id: 'so', label: 'Sales Orders' },
            { id: 'receiving', label: 'Receiving Notes' },
            { id: 'delivery', label: 'Delivery Notes' },
          ]}
          moreTabs={[{ id: 'transfers', label: 'Stock Transfers' }]}
        />

        <div className="max-w-[1160px] mx-auto px-6 pt-6">
          {subTab === 'stock' && (
            <>
              <OneUpPageHeader
                title="Products & Stock"
                primaryButtonLabel="New Product"
                onPrimaryClick={() => setModal('product')}
                secondaryActions={[{ label: 'Transfer Stock Between Locations', onClick: () => setModal('transfer') }]}
              />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">SKU</th>
                      <th className="py-3 px-4 font-medium">Product Name</th>
                      <th className="py-3 px-4 font-medium">Category</th>
                      <th className="py-3 px-4 font-medium text-right">Cost</th>
                      <th className="py-3 px-4 font-medium text-right">Sales Price</th>
                      <th className="py-3 px-4 font-medium text-right">On-Hand</th>
                      <th className="py-3 px-4 font-medium text-right">Committed</th>
                      <th className="py-3 px-4 font-medium text-right">Available</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {enrichedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-mono text-gray-500">{p.sku}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{p.name}</td>
                        <td className="py-3 px-4 text-gray-500">{p.category}</td>
                        <td className="py-3 px-4 text-right text-gray-600">{formatAmount(p.cost)}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatAmount(p.price)}</td>
                        <td className="py-3 px-4 text-right">{p.onHand}</td>
                        <td className="py-3 px-4 text-right text-amber-600">{p.committed}</td>
                        <td className="py-3 px-4 text-right font-semibold">{p.available}</td>
                        <td className="py-3 px-4"><StatusBadge status={p.isLowStock ? 'Low Stock' : 'In Stock'} /></td>
                      </tr>
                    ))}
                    {enrichedProducts.length === 0 && (
                      <tr><td colSpan={9} className="py-12 text-center text-gray-400">No products in inventory yet. Click <strong>New Product</strong> to add your first item.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'po' && (
            <>
              <OneUpPageHeader title="Purchase Orders" primaryButtonLabel="New Purchase Order" onPrimaryClick={openNewPOModal} />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">PO #</th>
                      <th className="py-3 px-4 font-medium">Supplier</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.purchaseOrders.map((po) => {
                      const v = state.vendors.find((x) => x.id === po.vendorId);
                      return (
                        <tr key={po.id}>
                          <td className="py-3 px-4 font-medium text-[#4285F4]">{po.id}</td>
                          <td className="py-3 px-4 text-gray-800">{v?.name || po.vendorId}</td>
                          <td className="py-3 px-4 text-gray-500">{po.date}</td>
                          <td className="py-3 px-4"><StatusBadge status={po.status} /></td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {(po.status === 'Sent' || po.status === 'Draft' || po.status === 'Partially Received') && (
                              <button
                                onClick={() =>
                                  receivePurchaseOrder({
                                    poId: po.id,
                                    location: 'Main Warehouse',
                                    receivedLines: po.items.map((i) => ({ productId: i.productId, qtyToReceive: i.qty - i.receivedQty })),
                                  })
                                }
                                className="px-2.5 py-1 bg-teal-600 text-white rounded text-[11px] font-medium cursor-pointer"
                              >
                                Receive All
                              </button>
                            )}
                            {po.status === 'Received' && !po.billId && (
                              <button
                                onClick={() => convertPOToBill(po.id)}
                                className="px-2.5 py-1 bg-[#4285F4] text-white rounded text-[11px] font-medium cursor-pointer"
                              >
                                Convert to Bill
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {state.purchaseOrders.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No purchase orders yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'so' && (
            <>
              <OneUpPageHeader title="Sales Orders" primaryButtonLabel="New Sales Order" onPrimaryClick={() => setModal('so')} />
              {state.salesOrders.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center">
                  <Pencil className="w-11 h-11 text-gray-400 stroke-[1.25] mb-4" />
                  <p className="text-[15px] text-gray-500 max-w-md leading-relaxed">
                    You haven't entered any Sales Orders. Create your first one with ‘New Sales Order’.
                  </p>
                  <div className="mt-7 max-w-[440px] bg-white border border-gray-200 rounded-[4px] p-4 flex items-start gap-3.5 text-left">
                    <HelpCircle className="w-7 h-7 text-gray-400 stroke-[1.3] shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-gray-500 leading-relaxed">
                      A Sales Order is a record of products or services your customer has ordered. Sales Orders can be converted into Invoices for billing, Delivery Notes for delivery or Picking Lists for preparation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                        <th className="py-3 px-4 font-medium">Order #</th>
                        <th className="py-3 px-4 font-medium">Customer</th>
                        <th className="py-3 px-4 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium">Fulfillment</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {state.salesOrders.map((so) => {
                        const cust = state.customers.find((c) => c.id === so.customerId);
                        return (
                          <tr key={so.id}>
                            <td className="py-3 px-4 font-medium text-[#4285F4]">{so.id}</td>
                            <td className="py-3 px-4 text-gray-800">{cust?.name || so.customerId}</td>
                            <td className="py-3 px-4 text-gray-500">{so.date}</td>
                            <td className="py-3 px-4"><StatusBadge status={so.fulfillmentStatus} /></td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {so.fulfillmentStatus === 'To Pick' && (
                                <button onClick={() => advanceFulfillment(so.id, 'Packed')} className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] cursor-pointer">Mark Packed</button>
                              )}
                              {so.fulfillmentStatus === 'Packed' && (
                                <button onClick={() => advanceFulfillment(so.id, 'Shipped')} className="px-2.5 py-1 bg-purple-600 text-white rounded text-[11px] cursor-pointer">Ship Order</button>
                              )}
                              {!so.invoiced && (
                                <button
                                  onClick={() => createInvoice({ customerId: so.customerId, orderId: so.id, items: so.items, discountPct: so.discountPct })}
                                  className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] cursor-pointer"
                                >
                                  Create Invoice
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {subTab === 'receiving' && (
            <>
              <OneUpPageHeader title="Receiving Notes" />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Receipt #</th>
                      <th className="py-3 px-4 font-medium">PO #</th>
                      <th className="py-3 px-4 font-medium">Location</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.receivingLog.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-medium text-gray-800">{r.id}</td>
                        <td className="py-3 px-4 text-[#4285F4]">{r.poId}</td>
                        <td className="py-3 px-4 text-gray-600">{r.location}</td>
                        <td className="py-3 px-4 text-gray-500">{r.date}</td>
                        <td className="py-3 px-4 text-gray-500">{r.notes}</td>
                      </tr>
                    ))}
                    {state.receivingLog.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No receiving notes yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'delivery' && (
            <>
              <OneUpPageHeader title="Delivery Notes" />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Delivery Note #</th>
                      <th className="py-3 px-4 font-medium">Sales Order</th>
                      <th className="py-3 px-4 font-medium">Customer</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.deliveryNotes.map((dn) => {
                      const cust = state.customers.find((c) => c.id === dn.customerId);
                      return (
                        <tr key={dn.id}>
                          <td className="py-3 px-4 font-medium text-[#4285F4]">{dn.id}</td>
                          <td className="py-3 px-4 text-gray-700">{dn.orderId}</td>
                          <td className="py-3 px-4 text-gray-800">{cust?.name || dn.customerId}</td>
                          <td className="py-3 px-4"><StatusBadge status={dn.status} /></td>
                          <td className="py-3 px-4 font-mono text-gray-500">{dn.tracking || '—'}</td>
                        </tr>
                      );
                    })}
                    {state.deliveryNotes.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No delivery notes yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'transfers' && (
            <>
              <OneUpPageHeader title="Stock Transfers" primaryButtonLabel="New Transfer" onPrimaryClick={() => setModal('transfer')} />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Transfer #</th>
                      <th className="py-3 px-4 font-medium">Date</th>
                      <th className="py-3 px-4 font-medium">From</th>
                      <th className="py-3 px-4 font-medium">To</th>
                      <th className="py-3 px-4 font-medium text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {state.stockTransfers.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 px-4 font-medium">{t.id}</td>
                        <td className="py-3 px-4 text-gray-500">{t.date}</td>
                        <td className="py-3 px-4">{t.fromLocation}</td>
                        <td className="py-3 px-4">{t.toLocation}</td>
                        <td className="py-3 px-4 text-right font-semibold">{t.qty}</td>
                      </tr>
                    ))}
                    {state.stockTransfers.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-400">No stock transfers logged.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <Modal open={modal === 'product'} onClose={() => setModal(null)} title="New Product / Service">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addProduct(prodForm);
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Product Name</label>
                <input required value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">SKU</label>
                <input required value={prodForm.sku} onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Purchase Cost</label>
                <input type="number" step="0.01" required value={prodForm.cost} onChange={(e) => setProdForm({ ...prodForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Sales Price</label>
                <input type="number" step="0.01" required value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Opening Qty</label>
                <input type="number" required value={prodForm.mainWarehouseQty} onChange={(e) => setProdForm({ ...prodForm, mainWarehouseQty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Save Product</button>
            </div>
          </form>
        </Modal>

        <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="Stock Transfer">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              transferStock(trfForm);
              setModal(null);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Product</label>
              <select value={trfForm.productId} onChange={(e) => setTrfForm({ ...trfForm, productId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                {enrichedProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">From</label>
                <select value={trfForm.fromLocation} onChange={(e) => setTrfForm({ ...trfForm, fromLocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">To</label>
                <select value={trfForm.toLocation} onChange={(e) => setTrfForm({ ...trfForm, toLocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Quantity</label>
                <input type="number" min={1} value={trfForm.qty} onChange={(e) => setTrfForm({ ...trfForm, qty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Transfer Stock</button>
            </div>
          </form>
        </Modal>

        <Modal open={modal === 'so'} onClose={() => setModal(null)} title="New Sales Order">
          {state.customers.length === 0 || state.products.length === 0 ? (
            <div className="text-xs text-gray-600">Add a customer and product first to create a Sales Order.</div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const prod = state.products.find((p) => p.id === soProductId) || state.products[0];
                createSalesOrder({
                  customerId: soCustomerId,
                  items: [{ productId: prod.id, qty: Number(soQty) || 1, unitPrice: prod.price, taxRate: prod.taxRate }],
                });
                setModal(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium mb-1">Customer</label>
                <select value={soCustomerId} onChange={(e) => setSoCustomerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
                  {state.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium mb-1">Product</label>
                  <select value={soProductId} onChange={(e) => setSoProductId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded">
                    {state.products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Qty</label>
                  <input type="number" min={1} value={soQty} onChange={(e) => setSoQty(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Create Sales Order</button>
              </div>
            </form>
          )}
        </Modal>

        <Modal open={poModalOpen} onClose={() => setPoModalOpen(false)} title="New Purchase Order">
          {state.products.length === 0 || state.vendors.length === 0 ? (
            <div className="text-xs text-gray-600">
              Add at least one Supplier and one Product first to create a Purchase Order.
            </div>
          ) : (
            <form onSubmit={submitPurchaseOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Supplier</label>
                <select
                  value={poVendorId}
                  onChange={(e) => setPoVendorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  {state.vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <label className="block font-medium mb-1">Product</label>
                  <select
                    value={poProductId}
                    onChange={(e) => {
                      const prod = state.products.find((p) => p.id === e.target.value);
                      setPoProductId(e.target.value);
                      if (prod) setPoUnitCost(Number(prod.cost ?? prod.buyPrice ?? 0));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    {state.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block font-medium mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block font-medium mb-1">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={poUnitCost}
                    onChange={(e) => setPoUnitCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPoModalOpen(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded cursor-pointer"
                >
                  Send Purchase Order
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // 10. ACCOUNTING VIEW (PURPLE THEME, DUAL-ARC P&L, CASH FLOW, BANK ACTIVITY)
  // ============================================================================

  function AccountingView({ subTab, setSubTab, onNavigateReport }) {
    const { state, formatAmount, accountBalances, reconcileBankTransaction, createManualJournalEntry } = useERP();
    const [jeModal, setJeModal] = useState(false);
    const [jeForm, setJeForm] = useState({ description: '', debitAccount: '6100', creditAccount: '1000', amount: '100' });

    const incomeTotal = accountBalances['4000'] || 0;
    const expenseTotal = Number(((accountBalances['5000'] || 0) + (accountBalances['6100'] || 0)).toFixed(2));
    const profitTotal = Number((incomeTotal - expenseTotal).toFixed(2));
    const cashBalance = accountBalances['1000'] || 0;

    const depositsTotal = state.paymentsReceived.reduce((s, p) => s + p.amount, 0);
    const paymentsOutTotal = state.expenses.reduce((s, e) => s + e.amount, 0);

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#7C3AED"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'bank', label: 'Bank Activity', badge: state.bankTransactions.filter((b) => b.status === 'Unreconciled').length },
          ]}
          moreTabs={[
            { id: 'coa', label: 'Chart of Accounts' },
            { id: 'journal', label: 'General Ledger / Journal' },
          ]}
        />

        <div className="max-w-[1160px] mx-auto px-6 pt-6">
          {subTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit & Loss Dual-Arc Card */}
              <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-normal text-[#7C3AED]">Profit & Loss</h2>
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-right text-[11.5px] text-gray-500 space-y-1">
                    <div>Exclude unreviewed transactions ▾</div>
                    <div>Last 3 Months ▾</div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="relative w-48 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 180 180" className="w-full h-full">
                      <path d="M 42 145 A 68 68 0 1 1 138 145" fill="none" stroke={incomeTotal > 0 ? '#3B82F6' : '#E5E7EB'} strokeWidth="11" strokeLinecap="round" />
                      <path d="M 55 133 A 50 50 0 1 1 125 133" fill="none" stroke={expenseTotal > 0 ? '#F59E0B' : '#E5E7EB'} strokeWidth="11" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[20px] font-semibold text-gray-700">
                      {formatAmount(profitTotal)}
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    <button
                      onClick={() => onNavigateReport('pnl')}
                      className="w-full p-3 border border-gray-200 rounded-[4px] hover:bg-gray-50 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                          <span>{formatAmount(incomeTotal)}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">INCOME</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    <button
                      onClick={() => onNavigateReport('pnl')}
                      className="w-full p-3 border border-gray-200 rounded-[4px] hover:bg-gray-50 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                          <span>{formatAmount(expenseTotal)}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">EXPENSE</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    <button
                      onClick={() => onNavigateReport('pnl')}
                      className="w-full p-3 border border-gray-200 rounded-[4px] hover:bg-gray-50 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                          <span>{formatAmount(profitTotal)}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">PROFIT</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cash Flow Card */}
              <div className="bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-normal text-[#7C3AED]">Cash Flow</h2>
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex items-center gap-4 text-[11.5px] text-gray-500">
                    <span>All Bank Accounts ▾</span>
                    <span>Last 3 Months ▾</span>
                  </div>
                </div>

                <div className="text-center my-6">
                  <div className="text-[22px] font-semibold text-gray-700">{formatAmount(cashBalance)}</div>
                </div>

                {state.journalEntries.length === 0 ? (
                  <p className="text-xs text-gray-500 my-4">There are no transactions during this period.</p>
                ) : (
                  <div className="h-24 flex items-end gap-3 px-4">
                    {[35, 52, 44, 68, 61, 84, 79].map((h, idx) => (
                      <div key={idx} className="flex-1 bg-purple-100 rounded-t relative h-full flex items-end">
                        <div style={{ height: `${h}%` }} className="w-full bg-[#7C3AED]/80 rounded-t" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div>
                    <div className="font-semibold text-gray-800">{formatAmount(depositsTotal)}</div>
                    <div className="text-[10px] text-gray-400 uppercase mt-0.5">DEPOSITS</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{formatAmount(paymentsOutTotal)}</div>
                    <div className="text-[10px] text-gray-400 uppercase mt-0.5">PAYMENTS</div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{formatAmount(cashBalance)}</div>
                    <div className="text-[10px] text-gray-400 uppercase mt-0.5">ENDING CASH</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {subTab === 'bank' && (
            <>
              <OneUpPageHeader title="Bank Activity & Auto-Reconciliation" />
              <div className="bg-white border border-gray-200 rounded-[4px] divide-y divide-gray-100">
                {state.bankTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-400">{tx.date}</span>
                        <span className="font-semibold text-gray-900">{tx.description}</span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <div className="text-gray-500 mt-1">
                        Suggested Match: <strong>{tx.suggestedMatchId || `Account ${tx.suggestedAccountCode}`}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-gray-800'}`}>
                        {formatAmount(tx.amount)}
                      </span>
                      {tx.status === 'Unreconciled' && (
                        <button
                          onClick={() =>
                            reconcileBankTransaction({
                              bankTxId: tx.id,
                              matchType: tx.suggestedMatchType,
                              matchId: tx.suggestedMatchId,
                              accountCode: tx.suggestedAccountCode,
                            })
                          }
                          className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-[4px] cursor-pointer"
                        >
                          Validate / Match
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {state.bankTransactions.length === 0 && (
                  <div className="p-10 text-center text-xs text-gray-400">No bank feed transactions imported yet.</div>
                )}
              </div>
            </>
          )}

          {subTab === 'coa' && (
            <>
              <OneUpPageHeader title="Chart of Accounts" />
              <div className="bg-white border border-gray-200 rounded-[4px] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-500">
                      <th className="py-3 px-4 font-medium">Code</th>
                      <th className="py-3 px-4 font-medium">Account Name</th>
                      <th className="py-3 px-4 font-medium">Type</th>
                      <th className="py-3 px-4 font-medium text-right">Live Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {CHART_OF_ACCOUNTS.map((acc) => (
                      <tr key={acc.code}>
                        <td className="py-3 px-4 font-mono text-gray-500">{acc.code}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{acc.name}</td>
                        <td className="py-3 px-4 text-gray-600">{acc.type}</td>
                        <td className="py-3 px-4 text-right font-semibold">{formatAmount(accountBalances[acc.code])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {subTab === 'journal' && (
            <>
              <OneUpPageHeader title="Automated General Ledger / Journal" primaryButtonLabel="New Journal Entry" onPrimaryClick={() => setJeModal(true)} />
              <div className="space-y-3">
                {state.journalEntries.map((je) => (
                  <div key={je.id} className="bg-white border border-gray-200 rounded-[4px] p-4 text-xs">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                      <div>
                        <span className="font-mono font-semibold text-[#7C3AED] mr-2">{je.id}</span>
                        <span className="font-medium text-gray-900">{je.description}</span>
                      </div>
                      <span className="text-gray-400">{je.date} • Ref: {je.ref}</span>
                    </div>
                    <div className="space-y-1">
                      {je.lines.map((l, idx) => {
                        const acc = CHART_OF_ACCOUNTS.find((a) => a.code === l.accountCode);
                        return (
                          <div key={idx} className="flex justify-between text-gray-600">
                            <span>{l.accountCode} — {acc?.name}</span>
                            <div className="space-x-6 font-mono">
                              <span>{l.debit > 0 ? `Dr ${formatAmount(l.debit)}` : ''}</span>
                              <span>{l.credit > 0 ? `Cr ${formatAmount(l.credit)}` : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {state.journalEntries.length === 0 && (
                  <div className="bg-white border border-gray-200 rounded-[4px] p-10 text-center text-xs text-gray-400">No journal entries recorded yet.</div>
                )}
              </div>
            </>
          )}
        </div>

        <Modal open={jeModal} onClose={() => setJeModal(false)} title="New Manual Journal Entry">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createManualJournalEntry(jeForm);
              setJeModal(false);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium mb-1">Memo / Description</label>
              <input required value={jeForm.description} onChange={(e) => setJeForm({ ...jeForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1">Debit Account</label>
                <select value={jeForm.debitAccount} onChange={(e) => setJeForm({ ...jeForm, debitAccount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  {CHART_OF_ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Credit Account</label>
                <select value={jeForm.creditAccount} onChange={(e) => setJeForm({ ...jeForm, creditAccount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded">
                  {CHART_OF_ACCOUNTS.map((a) => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Amount</label>
                <input type="number" step="0.01" required value={jeForm.amount} onChange={(e) => setJeForm({ ...jeForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setJeModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#7C3AED] text-white font-medium rounded">Post Entry</button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ============================================================================
  // 11. REPORTS VIEW (BOOK-ICON CARDS + LIVE DRILL-DOWN)
  // ============================================================================

function ReportsView({ subTab, setSubTab, initialReport }) {
    const { state, formatAmount, accountBalances, enrichedProducts } = useERP();
    const [selectedReport, setSelectedReport] = useState(initialReport || null);

    const reportRows = useMemo(() => {
      if (selectedReport === 'sales-cust') {
        const map = {};
        (state?.invoices || [])
          .filter((inv) => inv.status !== 'Cancelled')
          .forEach((inv) => {
          const cust = (state?.customers || []).find((c) => c.id === inv.customerId);
          const key = inv.customerName || cust?.name || 'Walk-in Customer';
          const invTotal =
            Number(inv.total) ||
            (inv.items || []).reduce(
              (sum, item) =>
                sum +
                (Number(item.qty) || 0) *
                  (Number(item.unitPrice) || 0) *
                  (1 + (Number(item.taxRate) || 0) / 100),
              0
            );
          const openBal =
            inv.status === 'Paid' || inv.status === 'Credited'
              ? 0
              : inv.balanceDue !== undefined
              ? Number(inv.balanceDue) || 0
              : Math.max(0, invTotal - (Number(inv.amountPaid) || 0));

          if (!map[key]) map[key] = { name: key, count: 0, total: 0, openBalance: 0 };
          map[key].count += 1;
          map[key].total += invTotal;
          map[key].openBalance += openBal;
        });
        return Object.values(map);
      }

      if (selectedReport === 'purch-vnd') {
        const map = {};
        const docs = [...(state?.purchaseOrders || []), ...(state?.vendorBills || [])];
        docs.forEach((po) => {
          const vend = (state?.vendors || []).find((v) => v.id === po.vendorId);
          const key = po.vendorName || vend?.name || 'Unknown Supplier';
          const poTotal =
            Number(po.total) ||
            (po.items || []).reduce(
              (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
              0
            );

          if (!map[key]) map[key] = { name: key, count: 0, total: 0 };
          map[key].count += 1;
          map[key].total += poTotal;
        });
        return Object.values(map);
      }

      if (selectedReport === 'gl') {
        return (state?.journalEntries || []).flatMap((entry) =>
          (entry.lines || []).map((line, i) => ({
            id: `${entry.id}-${i}`,
            date: entry.date,
            memo: entry.description || entry.memo || '',
            accountCode: line.accountCode,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          }))
        );
      }

      if (selectedReport === 'tb') {
        const map = {};
        (state?.journalEntries || []).forEach((entry) => {
          (entry.lines || []).forEach((line) => {
            const code = line.accountCode;
            const acct = CHART_OF_ACCOUNTS.find((a) => a.code === code);
            if (!map[code]) {
              map[code] = { accountCode: code, name: acct?.name || 'Account', debit: 0, credit: 0 };
            }
            map[code].debit += Number(line.debit) || 0;
            map[code].credit += Number(line.credit) || 0;
          });
        });
        return Object.values(map);
      }

      return CHART_OF_ACCOUNTS;
    }, [selectedReport, state]);

    useEffect(() => {
      if (initialReport) setSelectedReport(initialReport);
    }, [initialReport]);

    const accountingCards = [
      { id: 'pnl', title: 'Profit and Loss', desc: 'See your net income and breakdown of revenues, costs and expenses.' },
      { id: 'bs', title: 'Balance Sheet', desc: 'See the financial balance of your company.' },
      { id: 'gl', title: 'General Ledger', desc: 'See your complete record of financial transactions.' },
      { id: 'tb', title: 'Trial Balance', desc: 'See the balance of all the General ledger accounts.' },
      { id: 'vat', title: 'VAT report', desc: 'See your closed VAT periods and generate a report for VAT filing.' },
    ];

    const salesCards = [
      { id: 'sales-cust', title: 'Sales by Customer', desc: 'See total invoiced revenue and open balances per customer.' },
      { id: 'sales-item', title: 'Inventory Valuation Summary', desc: 'See on-hand quantities, unit costs, and total asset value across locations.' },
    ];

    const purchasingCards = [
      { id: 'purch-vnd', title: 'Purchases by Supplier', desc: 'See total purchase orders and bills grouped by vendor.' },
    ];

    const activeCards = subTab === 'accounting' ? accountingCards : subTab === 'sales' ? salesCards : purchasingCards;

    const revenue = accountBalances['4000'] || 0;
    const cogs = accountBalances['5000'] || 0;
    const opEx = accountBalances['6100'] || 0;
    const netIncome = Number((revenue - cogs - opEx).toFixed(2));

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#F43F5E"
          activeTab={subTab}
          onSelect={(t) => {
            setSelectedReport(null);
            setSubTab(t);
          }}
          tabs={[
            { id: 'accounting', label: 'Accounting' },
            { id: 'sales', label: 'Sales' },
            { id: 'purchasing', label: 'Purchasing' },
          ]}
        />

        <div className="max-w-[820px] mx-auto px-6 pt-8">
          {!selectedReport ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedReport(card.id)}
                  className="bg-white border border-gray-200 hover:border-gray-300 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex items-start gap-5 text-left transition-all cursor-pointer"
                >
                  <BookOpen className="w-10 h-10 text-gray-500 stroke-[1.2] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[16px] font-normal text-[#4285F4]">{card.title}</div>
                    <p className="text-[12.5px] text-gray-500 mt-1.5 leading-relaxed">{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-[4px] shadow-2xs p-6 text-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
                <div>
                  <button onClick={() => setSelectedReport(null)} className="text-[#4285F4] hover:underline mb-1 cursor-pointer">
                    ← Back to Reports
                  </button>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {accountingCards.concat(salesCards, purchasingCards).find((c) => c.id === selectedReport)?.title}
                  </h2>
                </div>
                <button onClick={() => window.print()} className="px-3 py-1.5 border border-gray-200 rounded flex items-center gap-1.5 text-gray-600 hover:bg-gray-50 cursor-pointer">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>

              {selectedReport === 'pnl' && (
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100"><span>Sales Revenue (4000)</span><span className="font-semibold">{formatAmount(revenue)}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span>Cost of Goods Sold (5000)</span><span>-{formatAmount(cogs)}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100 font-medium"><span>Gross Profit</span><span>{formatAmount(revenue - cogs)}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span>Operating Expenses (6100)</span><span>-{formatAmount(opEx)}</span></div>
                  <div className="flex justify-between py-3 text-sm font-bold text-gray-900 bg-gray-50 px-3 rounded"><span>Net Income</span><span>{formatAmount(netIncome)}</span></div>
                </div>
              )}

              {selectedReport === 'bs' && (
                <div className="space-y-3">
                  <div className="font-semibold text-gray-500 uppercase">Assets</div>
                  <div className="flex justify-between py-1.5"><span>Checking Account (1000)</span><span>{formatAmount(accountBalances['1000'])}</span></div>
                  <div className="flex justify-between py-1.5"><span>Accounts Receivable (1100)</span><span>{formatAmount(accountBalances['1100'])}</span></div>
                  <div className="flex justify-between py-1.5 border-b border-gray-200"><span>Inventory Asset (1200)</span><span>{formatAmount(accountBalances['1200'])}</span></div>
                  <div className="font-semibold text-gray-500 uppercase pt-2">Liabilities & Equity</div>
                  <div className="flex justify-between py-1.5"><span>Accounts Payable (2000)</span><span>{formatAmount(accountBalances['2000'])}</span></div>
                  <div className="flex justify-between py-1.5"><span>Sales Tax / VAT Payable (2100)</span><span>{formatAmount(accountBalances['2100'])}</span></div>
                  <div className="flex justify-between py-1.5"><span>Owner's Equity + Net Income</span><span>{formatAmount((accountBalances['3000'] || 0) + netIncome)}</span></div>
                </div>
              )}

              {selectedReport === 'sales-item' && (
                <div className="space-y-2">
                  {enrichedProducts.map((p) => (
                    <div key={p.id} className="flex justify-between py-2 border-b border-gray-100">
                      <span>{p.sku} — {p.name} ({p.onHand} units)</span>
                      <span className="font-semibold">{formatAmount(p.totalValue)}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedReport === 'vat' && (
                <div className="flex justify-between py-3 bg-gray-50 px-3 rounded font-semibold">
                  <span>Net Sales Tax / VAT Payable (Account 2100)</span>
                  <span>{formatAmount(accountBalances['2100'])}</span>
                </div>
              )}

              {(selectedReport === 'sales-cust' || selectedReport === 'purch-vnd' || selectedReport === 'gl' || selectedReport === 'tb') && (
                <div className="space-y-2">
                  {reportRows.length === 0 ? (
                    <div className="py-4 text-center text-gray-400">No records found for this report.</div>
                  ) : (
                    reportRows.map((row, idx) => {
                      if (selectedReport === 'sales-cust') {
                        return (
                          <div key={row.name || idx} className="flex justify-between py-2 border-b border-gray-100">
                            <span>
                              {row.name} <span className="text-gray-400">({row.count} invoices)</span>
                            </span>
                            <span className="font-semibold">
                              {formatAmount(row.total)}{' '}
                              <span className="text-gray-400 font-normal">
                                (Open: {formatAmount(row.openBalance)})
                              </span>
                            </span>
                          </div>
                        );
                      }

                      if (selectedReport === 'purch-vnd') {
                        return (
                          <div key={row.name || idx} className="flex justify-between py-2 border-b border-gray-100">
                            <span>
                              {row.name} <span className="text-gray-400">({row.count} orders)</span>
                            </span>
                            <span className="font-semibold">{formatAmount(row.total)}</span>
                          </div>
                        );
                      }

                      if (selectedReport === 'gl') {
                        return (
                          <div key={row.id || idx} className="flex justify-between py-2 border-b border-gray-100">
                            <span>
                              <span className="text-gray-400 mr-2">{row.date}</span>
                              <span className="font-mono mr-2">{row.accountCode}</span>
                              {row.memo}
                            </span>
                            <span className="font-semibold">
                              {row.debit > 0 ? `Dr ${formatAmount(row.debit)}` : `Cr ${formatAmount(row.credit)}`}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={row.accountCode || idx} className="flex justify-between py-2 border-b border-gray-100">
                          <span>{row.accountCode} — {row.name}</span>
                          <span className="font-semibold">
                            Dr {formatAmount(row.debit)} / Cr {formatAmount(row.credit)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 12. APPS & SYNC VIEW
  // ============================================================================

  function AppsView({ subTab, setSubTab }) {
    const { state, toggleIntegration, triggerChannelSync } = useERP();

    return (
      <div>
        <OneUpSubTabBar
          accentColor="#64748B"
          activeTab={subTab}
          onSelect={setSubTab}
          tabs={[
            { id: 'connected', label: 'Connected Apps' },
            { id: 'logs', label: 'Sync Logs' },
          ]}
        />

        <div className="max-w-[1160px] mx-auto px-6 pt-6">
          {subTab === 'connected' && (
            <>
              <OneUpPageHeader title="Apps & Channel Integrations" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.integrations.map((intg) => (
                  <div key={intg.id} className="bg-white border border-gray-200 rounded-[4px] p-5 flex flex-col justify-between text-xs">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{intg.name}</h3>
                          <span className="text-[11px] text-gray-400">{intg.category} • {intg.location}</span>
                        </div>
                        <StatusBadge status={intg.connected ? 'Success' : 'Draft'} />
                      </div>
                      <p className="text-gray-600 mt-2.5 leading-relaxed">{intg.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-gray-400">Last sync: {intg.lastSync} ({intg.ordersSynced} events)</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleIntegration(intg.id)}
                          className="px-3 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 cursor-pointer"
                        >
                          {intg.connected ? 'Disconnect' : 'Connect'}
                        </button>
                        {intg.connected && (
                          <button
                            onClick={() => triggerChannelSync(intg.id)}
                            className="px-3 py-1.5 bg-[#4285F4] text-white font-medium rounded flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Sync Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {subTab === 'logs' && (
            <>
              <OneUpPageHeader title="Real-Time Sync Activity Log" />
              <div className="bg-white border border-gray-200 rounded-[4px] divide-y divide-gray-100 text-xs">
                {state.syncLogs.map((l) => (
                  <div key={l.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 mr-2">[{l.channel}]</span>
                      <span className="text-gray-600">{l.event}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{l.timestamp}</span>
                      <StatusBadge status={l.status} />
                    </div>
                  </div>
                ))}
                {state.syncLogs.length === 0 && <div className="p-10 text-center text-gray-400">No sync events recorded yet.</div>}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 13. COMPANY SETTINGS & ADMIN MODALS (SUBSCRIPTION REMOVED)
  // ============================================================================

  function SegmentedChoice({ options, value, onChange }) {
  return (
    <div className="inline-flex border border-gray-300 rounded-[3px] overflow-hidden text-xs">
      {options.map((opt, idx) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-1.5 transition-colors cursor-pointer ${
              idx > 0 ? 'border-l border-gray-300' : ''
            } ${
              active ? 'bg-[#4285F4] text-white font-medium' : 'bg-white text-[#4285F4] hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CompanySettingsView({ onBack }) {
  const { state, updateCompany, resetDemoData, toast, notify } = useERP();

  const hydrateTemplate = useCallback((tpl) => {
    const base = tpl || {};
    const mergedDocs = Object.keys(DEFAULT_DOC_TYPE_OVERRIDES).reduce((acc, key) => {
      acc[key] = {
        ...DEFAULT_DOC_TYPE_OVERRIDES[key],
        ...(base.docs?.[key] || {}),
      };
      return acc;
    }, {});
    return {
      ...DEFAULT_DOCUMENT_TEMPLATE,
      ...base,
      global: {
        ...DEFAULT_DOCUMENT_TEMPLATE.global,
        ...(base.global || {}),
      },
      docs: mergedDocs,
    };
  }, []);

  const [form, setForm] = useState(() => ({
    ...INITIAL_COMPANY,
    ...(state?.company || {}),
    documentTemplate: hydrateTemplate(state?.company?.documentTemplate),
    autoNumbering: { ...DEFAULT_AUTO_NUMBERING, ...(state?.company?.autoNumbering || {}) },
  }));

  const [autoNumObject, setAutoNumObject] = useState('invoice');
  const [showTemplatesPage, setShowTemplatesPage] = useState(false);
  const [templatesList, setTemplatesList] = useState(() =>
    state?.company?.documentTemplates?.length
      ? state.company.documentTemplates.map(hydrateTemplate)
      : [hydrateTemplate(state?.company?.documentTemplate)]
  );
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [draftTemplate, setDraftTemplate] = useState(null);
  const [activeDocType, setActiveDocType] = useState('global');
  const [openAccordion, setOpenAccordion] = useState('Appearance');

  useEffect(() => {
    if (state?.company) {
      const hydratedActive = hydrateTemplate(state.company.documentTemplate);
      const hydratedList = state.company.documentTemplates?.length
        ? state.company.documentTemplates.map(hydrateTemplate)
        : [hydratedActive];
      setTemplatesList(hydratedList);
      setForm((prev) => ({
        ...prev,
        ...state.company,
        documentTemplates: hydratedList,
        documentTemplate: hydratedActive,
        autoNumbering: { ...DEFAULT_AUTO_NUMBERING, ...(state.company.autoNumbering || {}) },
      }));
    }
  }, [state?.company, hydrateTemplate]);

  const handleLogoFile = (file) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      notify('Logo must be less than 1 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, logoDataUrl: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCountryChange = (countryName) => {
    const found = COUNTRY_OPTIONS.find((c) => c.name === countryName);
    setForm((prev) => ({
      ...prev,
      country: countryName,
      currency: found ? found.currency : prev.currency,
      defaultTaxRate: found ? found.taxRate : prev.defaultTaxRate,
      salesTaxLabel:
        countryName === 'India' ? 'GST' : countryName === 'United States' ? 'Sales Tax' : 'VAT',
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateCompany({
      ...form,
      documentTemplates: templatesList,
    });
    onBack();
  };

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Dadra and Nagar Haveli',
    'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
    'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  ];

  const rowCls = 'grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-center';
  const labelCls = 'md:col-span-4 md:text-right text-[12.5px] text-gray-600';
  const inputCls =
    'w-full border-b border-gray-300 focus:border-[#4285F4] py-1.5 text-[13px] text-gray-800 bg-transparent focus:outline-none';
  const currentAutoNum = form.autoNumbering?.[autoNumObject] || DEFAULT_AUTO_NUMBERING.invoice;

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col">
      {/* Top Bar */}
      <div className="h-[52px] bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <span className="text-base leading-none">‹</span>
          <span>Back</span>
        </button>
        <div className="text-[16px] font-normal text-gray-700">Company Settings</div>
        <button
          type="submit"
          form="company-settings-form"
          className="px-4 py-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
        >
          Done
        </button>
      </div>

      {/* Main White Sheet */}
      <form
        id="company-settings-form"
        onSubmit={handleSave}
        className="max-w-[880px] w-full mx-auto my-7 bg-white border border-gray-200 rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-gray-200"
      >
        {/* SECTION 1: COMPANY INFORMATION */}
        <div className="p-8 space-y-5">
          <h2 className="text-[17px] font-normal text-gray-800 mb-4">Company Information</h2>

          <div className={rowCls}>
            <div className={labelCls}>Company Logo</div>
            <div className="md:col-span-8 flex items-center gap-4">
              {form.logoDataUrl ? (
                <img
                  src={form.logoDataUrl}
                  alt="Company Logo"
                  className="h-14 max-w-[140px] object-contain border border-gray-200 rounded p-1 bg-white"
                />
              ) : (
                <div className="h-14 w-28 border border-dashed border-gray-300 rounded flex items-center justify-center text-[11px] text-gray-400">
                  No logo
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <label className="px-3 py-1.5 border border-gray-300 rounded-[3px] text-[#4285F4] hover:bg-gray-50 cursor-pointer">
                  Upload Logo
                  <input
                    type="file"
                    accept=".gif,.png,.jpg,.jpeg,.svg"
                    className="hidden"
                    onChange={(e) => handleLogoFile(e.target.files?.[0])}
                  />
                </label>
                {form.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, logoDataUrl: '' }))}
                    className="px-2.5 py-1.5 text-gray-500 hover:text-rose-600 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Company Name *</label>
            <div className="md:col-span-8 max-w-md">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Workspace URL Slug</label>
            <div className="md:col-span-8 max-w-md flex items-center gap-1 text-xs text-gray-400">
              <span>iven.app/</span>
              <input
                value={form.workspaceSlug || ''}
                onChange={(e) => setForm({ ...form, workspaceSlug: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Address</label>
            <div className="md:col-span-8 max-w-md space-y-2">
              <input
                placeholder="Street address"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Address line 2"
                value={form.addressLine2 || ''}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Address line 3"
                value={form.addressLine3 || ''}
                onChange={(e) => setForm({ ...form, addressLine3: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>City / State / Post Code</label>
            <div className="md:col-span-8 max-w-md grid grid-cols-3 gap-3">
              <input
                placeholder="City"
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={inputCls}
              />
              {form.country === 'India' ? (
                <select
                  value={form.state || ''}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={inputCls}
                >
                  <option value="">State</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="State / Province"
                  value={form.state || ''}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={inputCls}
                />
              )}
              <input
                placeholder="Post Code"
                value={form.postCode || ''}
                onChange={(e) => setForm({ ...form, postCode: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Country</label>
            <div className="md:col-span-8 max-w-md">
              <select
                value={form.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className={inputCls}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Email / Phone</label>
            <div className="md:col-span-8 max-w-md grid grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Company email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Phone"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Website / Fax</label>
            <div className="md:col-span-8 max-w-md grid grid-cols-2 gap-3">
              <input
                placeholder="https://..."
                value={form.website || ''}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="Fax"
                value={form.fax || ''}
                onChange={(e) => setForm({ ...form, fax: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>{form.salesTaxLabel || 'Tax'} ID / International Tax ID</label>
            <div className="md:col-span-8 max-w-md grid grid-cols-2 gap-3">
              <input
                placeholder="GSTIN / Tax ID"
                value={form.taxId || ''}
                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                className={inputCls}
              />
              <input
                placeholder="International Tax ID"
                value={form.internationalTaxId || ''}
                onChange={(e) => setForm({ ...form, internationalTaxId: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DOCUMENTS & TEMPLATES */}
        <div className="p-8 space-y-5">
          <h2 className="text-[17px] font-normal text-gray-800 mb-4">Documents & Templates</h2>

          <div className={rowCls}>
            <label className={labelCls}>Document Templates</label>
            <div className="md:col-span-8 flex flex-wrap items-center gap-3">
              <select
                value={form.documentTemplate?.id || templatesList[0]?.id || 'main-template'}
                onChange={(e) => {
                  const chosen = templatesList.find((t) => t.id === e.target.value);
                  if (chosen) setForm((prev) => ({ ...prev, documentTemplate: chosen }));
                }}
                className="border-b border-gray-300 py-1.5 pr-6 text-[13px] text-gray-800 bg-transparent focus:outline-none focus:border-[#4285F4]"
              >
                {templatesList.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowTemplatesPage(true)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-[3px] text-xs font-medium text-[#4285F4] hover:bg-gray-50 cursor-pointer"
              >
                Edit Templates
              </button>
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Document Language</label>
            <div className="md:col-span-8 max-w-md">
              <select
                value={form.documentLanguage || 'English (United Kingdom)'}
                onChange={(e) => setForm({ ...form, documentLanguage: e.target.value })}
                className={inputCls}
              >
                <option>English (United Kingdom)</option>
                <option>English (United States)</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Paper Format</label>
            <div className="md:col-span-8">
              <SegmentedChoice
                value={form.documentFormat || 'A4'}
                onChange={(val) => setForm({ ...form, documentFormat: val })}
                options={[
                  { label: 'A4', value: 'A4' },
                  { label: 'Letter', value: 'Letter' },
                ]}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Draft Mode for Documents</label>
            <div className="md:col-span-8">
              <OneUpOnOffToggle
                value={Boolean(form.draftModeDocuments)}
                onChange={(val) => setForm({ ...form, draftModeDocuments: val })}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Allow Locked Invoice Customization</label>
            <div className="md:col-span-8">
              <OneUpOnOffToggle
                value={Boolean(form.allowLockedInvoiceCustomization)}
                onChange={(val) => setForm({ ...form, allowLockedInvoiceCustomization: val })}
              />
            </div>
          </div>

          {/* Auto-Numbering */}
          <div className={rowCls}>
            <label className={labelCls}>Auto-Numbering</label>
            <div className="md:col-span-8 max-w-md space-y-3">
              <select
                value={autoNumObject}
                onChange={(e) => setAutoNumObject(e.target.value)}
                className={inputCls}
              >
                {Object.entries(DEFAULT_AUTO_NUMBERING).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10.5px] text-gray-400">Prefix</div>
                  <input
                    value={currentAutoNum.prefix}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        autoNumbering: {
                          ...prev.autoNumbering,
                          [autoNumObject]: { ...currentAutoNum, prefix: e.target.value },
                        },
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="text-[10.5px] text-gray-400">Next Number</div>
                  <input
                    type="number"
                    min={1}
                    value={currentAutoNum.nextNumber}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        autoNumbering: {
                          ...prev.autoNumbering,
                          [autoNumObject]: {
                            ...currentAutoNum,
                            nextNumber: Number(e.target.value) || 1,
                          },
                        },
                      }))
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <div className="text-[10.5px] text-gray-400">Digits</div>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={currentAutoNum.digits}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        autoNumbering: {
                          ...prev.autoNumbering,
                          [autoNumObject]: {
                            ...currentAutoNum,
                            digits: Number(e.target.value) || 3,
                          },
                        },
                      }))
                    }
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="text-[11px] text-gray-400">
                Preview:{' '}
                <strong className="text-gray-700 font-mono">
                  {currentAutoNum.prefix}
                  {String(currentAutoNum.nextNumber).padStart(
                    Number(currentAutoNum.digits) || 3,
                    '0'
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: ACCOUNTING, TAX & INVENTORY */}
        <div className="p-8 space-y-5">
          <h2 className="text-[17px] font-normal text-gray-800 mb-4">
            Accounting, Taxes & Inventory
          </h2>

          <div className={rowCls}>
            <label className={labelCls}>Currency & Default Tax Rate (%)</label>
            <div className="md:col-span-8 max-w-md grid grid-cols-2 gap-3">
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className={inputCls}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.currency}>
                    {c.currency.trim()} ({c.code})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                value={form.defaultTaxRate}
                onChange={(e) =>
                  setForm({ ...form, defaultTaxRate: Number(e.target.value) || 0 })
                }
                className={inputCls}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Accounting Basis</label>
            <div className="md:col-span-8">
              <SegmentedChoice
                value={form.accountingBasis || 'Accrual'}
                onChange={(val) => setForm({ ...form, accountingBasis: val })}
                options={[
                  { label: 'Accrual', value: 'Accrual' },
                  { label: 'Cash', value: 'Cash' },
                ]}
              />
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>VAT / GST Registered</label>
            <div className="md:col-span-8 flex items-center gap-4">
              <OneUpOnOffToggle
                value={Boolean(form.vatRegistered)}
                onChange={(val) => setForm({ ...form, vatRegistered: val })}
              />
              {form.vatRegistered && (
                <input
                  placeholder="Tax Label (GST / VAT)"
                  value={form.salesTaxLabel || 'GST'}
                  onChange={(e) => setForm({ ...form, salesTaxLabel: e.target.value })}
                  className="w-28 border-b border-gray-300 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#4285F4]"
                />
              )}
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Default Storage Location</label>
            <div className="md:col-span-8 max-w-md">
              <select
                value={form.defaultStorageLocation || 'Main Warehouse'}
                onChange={(e) => setForm({ ...form, defaultStorageLocation: e.target.value })}
                className={inputCls}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={rowCls}>
            <label className={labelCls}>Pack Units</label>
            <div className="md:col-span-8">
              <OneUpOnOffToggle
                value={Boolean(form.packUnits)}
                onChange={(val) => setForm({ ...form, packUnits: val })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: WORKSPACE DATA & SAVE FOOTER */}
        <div className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => resetDemoData('sample')}
              className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-[3px] cursor-pointer"
            >
              Load Sample ERP Data
            </button>
            <button
              type="button"
              onClick={() => resetDemoData('blank')}
              className="px-3.5 py-2 border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 rounded-[3px] cursor-pointer"
            >
              Reset to Blank Workspace
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-medium rounded-[3px] shadow-2xs cursor-pointer"
            >
              Save Settings
            </button>
          </div>
        </div>
      </form>

      {/* ==================== DOCUMENT TEMPLATES MANAGER VIEW ==================== */}
      {showTemplatesPage && (
        <div className="fixed inset-0 z-40 bg-[#F5F7FA] overflow-y-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTemplatesPage(false)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
            >
              <span>&lsaquo;</span> Back
            </button>
            <h2 className="text-lg font-medium text-gray-800">Document Templates</h2>
            <div className="w-16" />
          </div>

          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => {
                  const newTpl = hydrateTemplate({
                    ...JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_TEMPLATE)),
                    id: `tpl-${Date.now()}`,
                    name: `Template ${templatesList.length + 1}`,
                  });
                  setTemplatesList((prev) => [...prev, newTpl]);
                  setDraftTemplate(newTpl);
                  setEditingTemplateId(newTpl.id);
                  setActiveDocType('global');
                  setOpenAccordion('Appearance');
                }}
                className="px-4 py-2 bg-[#4A90E2] hover:bg-blue-600 text-white text-sm font-medium rounded shadow-sm cursor-pointer"
              >
                New Template
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                    <th className="py-3.5 px-6 w-1/2">Name</th>
                    <th className="py-3.5 px-6 w-1/3">Notes</th>
                    <th className="py-3.5 px-6 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {templatesList.map((tpl) => {
                    const notePreview =
                      tpl.docs?.invoice?.notes ||
                      tpl.global?.notes ||
                      'Default document template notes';
                    const isActive = form.documentTemplate?.id === tpl.id;
                    return (
                      <tr key={tpl.id} className="hover:bg-gray-50/60">
                        <td className="py-4 px-6 text-gray-800 flex items-center gap-2.5">
                          <span>{tpl.name}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-[#4A90E2] border border-blue-200 rounded">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            title={notePreview}
                            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-[#4A90E2]"
                          >
                            💬
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {templatesList.length > 1 && !isActive && (
                            <button
                              type="button"
                              onClick={() =>
                                setTemplatesList((prev) => prev.filter((item) => item.id !== tpl.id))
                              }
                              className="px-3 py-1.5 border border-gray-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold tracking-wide rounded cursor-pointer"
                            >
                              DELETE
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setDraftTemplate(hydrateTemplate(JSON.parse(JSON.stringify(tpl))));
                              setEditingTemplateId(tpl.id);
                              setActiveDocType('global');
                              setOpenAccordion('Appearance');
                            }}
                            className="px-4 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-[#4A90E2] text-xs font-semibold tracking-wide rounded cursor-pointer"
                          >
                            EDIT
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT TEMPLATE MODAL ==================== */}
      {editingTemplateId &&
        draftTemplate &&
        (() => {
          const DOC_TYPES = [
            { key: 'global', label: 'Global settings', settingsTitle: 'Global documents settings' },
            { key: 'invoice', label: 'Invoice', settingsTitle: 'Invoice settings' },
            { key: 'deliveryNote', label: 'Delivery Note', settingsTitle: 'Delivery note settings' },
            { key: 'pickingList', label: 'Picking List', settingsTitle: 'Picking list settings' },
            {
              key: 'purchaseOrder',
              label: 'Purchase Order',
              settingsTitle: 'Purchase order settings',
            },
            { key: 'quote', label: 'Quote', settingsTitle: 'Quote settings' },
            { key: 'salesReceipt', label: 'Sales Receipt', settingsTitle: 'Sales receipt settings' },
            { key: 'salesOrder', label: 'Sales Order', settingsTitle: 'Sales order settings' },
          ];

          const currentDocMeta = DOC_TYPES.find((d) => d.key === activeDocType) || DOC_TYPES[0];
          const g = draftTemplate.global;
          const activeDocKey = activeDocType === 'global' ? 'invoice' : activeDocType;
          const d = draftTemplate.docs[activeDocKey] || DEFAULT_DOC_TYPE_OVERRIDES[activeDocKey];

          const updateGlobal = (patch) =>
            setDraftTemplate((prev) => ({
              ...prev,
              global: { ...prev.global, ...patch },
            }));

          const updateDoc = (docKey, patch) =>
            setDraftTemplate((prev) => ({
              ...prev,
              docs: {
                ...prev.docs,
                [docKey]: { ...prev.docs[docKey], ...patch },
              },
            }));

          const handleResetSection = () => {
            if (activeDocType === 'global') {
              updateGlobal({ ...DEFAULT_DOCUMENT_TEMPLATE.global });
            } else {
              updateDoc(activeDocType, { ...DEFAULT_DOC_TYPE_OVERRIDES[activeDocType] });
            }
          };

          const handleSaveTemplate = () => {
            const exists = templatesList.some((t) => t.id === draftTemplate.id);
            const updatedList = exists
              ? templatesList.map((t) => (t.id === draftTemplate.id ? draftTemplate : t))
              : [...templatesList, draftTemplate];

            const nextActiveTemplate =
              form.documentTemplate?.id === draftTemplate.id
                ? draftTemplate
                : updatedList.find((t) => t.id === form.documentTemplate?.id) ||
                  updatedList[0] ||
                  draftTemplate;

            setTemplatesList(updatedList);
            setForm((prev) => ({
              ...prev,
              documentTemplates: updatedList,
              documentTemplate: nextActiveTemplate,
            }));
            updateCompany({
              ...form,
              documentTemplates: updatedList,
              documentTemplate: nextActiveTemplate,
            });
            setEditingTemplateId(null);
            setDraftTemplate(null);
            notify('Document template saved.');
          };
          const currencySymbol = (form.currency || '₹').trim();
          const fontSizePx =
            g.fontSize === 'Small' ? '11px' : g.fontSize === 'Large' ? '14px' : '12.5px';
          const isFinancialDoc = !['deliveryNote', 'pickingList'].includes(activeDocKey);
          const colCfg = activeDocType === 'global' ? g : d;
          const setColCfg = (patch) =>
            activeDocType === 'global' ? updateGlobal(patch) : updateDoc(activeDocKey, patch);

          const PillToggle = ({ checked, onChange }) => (
            <button
              type="button"
              onClick={() => onChange(!checked)}
              className={`relative inline-flex items-center w-14 h-7 rounded border transition-colors cursor-pointer ${
                checked ? 'bg-white border-gray-400' : 'bg-gray-200 border-gray-300'
              }`}
            >
              {checked ? (
                <>
                  <span className="w-7 h-full bg-[#4A90E2] text-white text-[10px] font-bold flex items-center justify-center rounded-l">
                    ON
                  </span>
                  <span className="w-7 h-full bg-white rounded-r" />
                </>
              ) : (
                <>
                  <span className="w-7 h-full bg-white rounded-l" />
                  <span className="w-7 h-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center rounded-r">
                    OFF
                  </span>
                </>
              )}
            </button>
          );

          const previewMeta = {
            invoice: {
              docNo: 'DOC-001',
              extraTop: [
                { label: 'Amount due:', value: `${currencySymbol}233.00`, bold: true },
                { label: 'Sent on', value: '01/01/19', bold: false },
              ],
            },
            deliveryNote: { docNo: 'DN-002', extraTop: [] },
            pickingList: { docNo: 'PL-002', extraTop: [] },
            purchaseOrder: {
              docNo: 'PO-001',
              extraTop: [{ label: 'Expected on', value: '20/12/12', bold: false }],
            },
            quote: {
              docNo: 'QOT-001',
              extraTop: [{ label: 'Expires on', value: '01/06/13', bold: true }],
            },
            salesReceipt: {
              docNo: 'SR-001',
              extraTop: [{ label: 'Paid on', value: '13/12/12', bold: true }],
            },
            salesOrder: { docNo: 'CORD-001', extraTop: [] },
          }[activeDocKey];

          const accordions =
            activeDocType === 'global'
              ? ['Appearance', 'Header', 'Table', 'Bottom']
              : isFinancialDoc
              ? ['Header', 'Table', 'Bottom']
              : ['Header', 'Bottom'];

          return (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-6xl h-[92vh] rounded shadow-2xl flex flex-col overflow-hidden">
                {/* Modal Top Title Bar */}
                <div className="relative px-6 py-4 border-b border-gray-200 flex items-center justify-center">
                  <input
                    value={draftTemplate.name}
                    onChange={(e) =>
                      setDraftTemplate((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="text-lg font-medium text-gray-800 text-center border-b border-transparent hover:border-gray-300 focus:border-[#4A90E2] focus:outline-none px-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplateId(null);
                      setDraftTemplate(null);
                    }}
                    className="absolute right-5 text-gray-400 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                {/* Modal Sub-Header Controls Bar */}
                <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="w-24" />
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700">Document type:</label>
                    <select
                      value={activeDocType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setActiveDocType(nextType);
                        setOpenAccordion(nextType === 'global' ? 'Appearance' : 'Header');
                      }}
                      className="border-b border-gray-300 py-1.5 pr-8 pl-1 text-sm text-gray-700 bg-transparent focus:outline-none focus:border-[#4A90E2] min-w-[190px]"
                    >
                      {DOC_TYPES.map((dt) => (
                        <option key={dt.key} value={dt.key}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="px-5 py-2 bg-[#4A90E2] hover:bg-blue-600 text-white text-sm font-medium rounded shadow-sm cursor-pointer"
                  >
                    Save Template
                  </button>
                </div>

                {/* Main Split Workspace: Left Document Preview + Right Settings Panel */}
                <div className="flex-1 flex overflow-hidden bg-[#FAFAFA]">
                  {/* LEFT: Live Document Preview */}
                  <div className="flex-1 overflow-y-auto p-6 flex justify-center">
                    <div
                      style={{
                        fontFamily: g.fontFamily,
                        fontSize: fontSizePx,
                        color: g.fontColor,
                      }}
                      className="bg-white w-full max-w-[680px] min-h-[820px] border border-gray-200 shadow-sm p-8 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-6">
                          <div
                            className={`flex ${
                              g.logoPlacement === 'Left'
                                ? 'flex-row items-start gap-4'
                                : 'flex-col items-start'
                            }`}
                          >
                            <div
                              style={{
                                width: `${g.logoWidth}px`,
                                height: `${g.logoHeight}px`,
                              }}
                              className="mb-3 overflow-hidden flex items-center justify-center bg-gradient-to-tr from-indigo-900 via-purple-600 to-amber-300"
                            >
                              {form.logoDataUrl ? (
                                <img
                                  src={form.logoDataUrl}
                                  alt="Logo"
                                  className="w-full h-full object-contain bg-white"
                                />
                              ) : (
                                <div className="w-full h-full opacity-90 bg-[radial-gradient(circle_at_70%_75%,#fde047,transparent_45%),radial-gradient(circle_at_30%_30%,#38bdf8,transparent_55%)]" />
                              )}
                            </div>

                            <div>
                              {g.showCompanyName && (
                                <div className="text-xl font-bold leading-tight mb-1">
                                  {form.name || 'Your Company'}
                                </div>
                              )}
                              {g.showCompanyAddress && (
                                <div className="text-xs leading-relaxed">
                                  <div>{form.address || '123 Business Street'}</div>
                                  <div>
                                    {[
                                      form.city || 'Bengaluru',
                                      form.state || 'KA',
                                      form.postCode || '560001',
                                    ]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </div>
                                  <div className="uppercase">{form.country || 'INDIA'}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-2xl font-bold tracking-tight uppercase">
                              {d.title}
                            </div>
                            <div className="text-sm mt-0.5">no. {previewMeta.docNo}</div>
                            {(d.showProjectName ?? true) && (
                              <div className="text-xs mt-0.5">Project name</div>
                            )}
                            <div className="text-xs mt-2">13/12/12</div>
                            {previewMeta.extraTop.map((item, idx) => (
                              <div
                                key={idx}
                                className={`text-xs mt-1 ${item.bold ? 'font-bold text-sm' : ''}`}
                              >
                                {item.label} {item.value}
                              </div>
                            ))}
                          </div>
                        </div>

                        {(g.showBillingAddress || g.showShippingAddress) && (
                          <div className="grid grid-cols-2 gap-8 mt-6 text-xs leading-relaxed">
                            <div>
                              {g.showBillingAddress && (
                                <>
                                  <div className="underline font-medium mb-1">Billing address</div>
                                  <div>John Doe</div>
                                  <div className="font-bold">ACME Company</div>
                                  <div>2239 Union St.</div>
                                  <div>San Francisco CA 94123</div>
                                  <div>UNITED STATES</div>
                                  {g.showTaxpayerId && <div>Taxpayer ID : 1235</div>}
                                </>
                              )}
                            </div>
                            <div>
                              {g.showShippingAddress && (
                                <>
                                  <div className="underline font-medium mb-1">Shipping address</div>
                                  <div>Jane Doe</div>
                                  <div className="font-bold">ACME Company</div>
                                  <div>101 Van Ness</div>
                                  <div>San Francisco CA 94103</div>
                                  <div>UNITED STATES</div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {activeDocKey === 'deliveryNote' && (
                          <div className="text-right text-[11px] font-bold mt-5 mb-1">PO#: 123</div>
                        )}
                        {activeDocKey === 'pickingList' && (
                          <div className="text-right text-[11px] font-bold mt-5 mb-1 leading-tight">
                            <div>PO#: 123</div>
                            <div>Sales order: 1</div>
                          </div>
                        )}
                        {activeDocKey === 'salesOrder' && (
                          <div className="text-right text-[11px] font-bold mt-5 mb-1">PO#: 144</div>
                        )}

                        {activeDocKey === 'deliveryNote' ? (
                          <div className="mt-1">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr style={{ backgroundColor: g.colorScheme }}>
                                  <th className="py-2 px-2.5 text-left font-bold">
                                    Item name &amp; description
                                  </th>
                                  <th className="py-2 px-2.5 text-right font-bold">Unit</th>
                                  <th className="py-2 px-2.5 text-right font-bold">Qty. Ordered</th>
                                  <th className="py-2 px-2.5 text-right font-bold">
                                    Qty. Delivered
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100">
                                  <td className="py-2.5 px-2.5">
                                    <div className="font-bold">P-001 Product name</div>
                                    <div className="text-[11px] opacity-80 pl-1">
                                      Product description
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2.5 text-right">kg</td>
                                  <td className="py-2.5 px-2.5 text-right">4</td>
                                  <td className="py-2.5 px-2.5 text-right">4</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="flex justify-end mt-3">
                              <div
                                style={{ backgroundColor: g.colorScheme }}
                                className="w-1/2 px-3 py-2 flex justify-between font-bold text-sm"
                              >
                                <span>Total items</span>
                                <span>4</span>
                              </div>
                            </div>
                            <div className="mt-6 text-xs">
                              <div className="text-sm mb-2">Delivery Information</div>
                              <div>
                                <span className="font-bold">Expected Delivery:</span> 15/12/12
                              </div>
                              <div>
                                <span className="font-bold">Total Weight:</span> 5.0 Kg
                              </div>
                            </div>
                          </div>
                        ) : activeDocKey === 'pickingList' ? (
                          <div className="mt-1">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr style={{ backgroundColor: g.colorScheme }}>
                                  <th className="py-2 px-2 text-left font-bold">
                                    Item name &amp; description
                                  </th>
                                  <th className="py-2 px-2 text-right font-bold">Unit</th>
                                  <th className="py-2 px-2 text-right font-bold">Qty. ordered</th>
                                  <th className="py-2 px-2 text-right font-bold">
                                    Qty. already prepared
                                  </th>
                                  <th className="py-2 px-2 text-right font-bold">
                                    Qty. to be prepared
                                  </th>
                                  <th className="py-2 px-2 text-right font-bold">Picked</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-100">
                                  <td className="py-2.5 px-2">
                                    <div className="font-bold">PS-002 Product name</div>
                                    <div className="text-[11px] opacity-80 pl-1">
                                      Product description
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right">kg</td>
                                  <td className="py-2.5 px-2 text-right">5</td>
                                  <td className="py-2.5 px-2 text-right">1</td>
                                  <td className="py-2.5 px-2 text-right">4</td>
                                  <td className="py-2.5 px-2 text-right font-bold">_______</td>
                                </tr>
                              </tbody>
                            </table>
                            <div className="flex justify-end mt-3">
                              <div
                                style={{ backgroundColor: g.colorScheme }}
                                className="w-1/2 px-3 py-2 flex justify-between font-bold text-sm"
                              >
                                <span>Total items</span>
                                <span>______</span>
                              </div>
                            </div>
                            <div className="mt-6 text-xs">
                              <div className="text-sm mb-2">Picking Information</div>
                              <div>
                                <span className="font-bold">Due Delivery:</span> 15/12/12
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-6">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr style={{ backgroundColor: g.colorScheme }}>
                                  <th className="py-2 px-2.5 text-left font-bold">
                                    {colCfg.itemColLabel || 'Item name & description'}
                                  </th>
                                  <th className="py-2 px-2 text-right font-bold">VAT</th>
                                  {colCfg.showQty && (
                                    <th className="py-2 px-2 text-right font-bold">
                                      {colCfg.qtyColLabel || 'Qty.'}
                                    </th>
                                  )}
                                  {colCfg.showUnitPrice && (
                                    <th className="py-2 px-2 text-right font-bold">
                                      {colCfg.unitPriceColLabel || 'Unit price'}
                                    </th>
                                  )}
                                  <th className="py-2 px-2.5 text-right font-bold">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                <tr>
                                  <td className="py-2.5 px-2.5">
                                    <div className="font-bold">
                                      {colCfg.showProductNumber ? 'PS-001 ' : ''}Service Name
                                    </div>
                                    <div className="text-[11px] opacity-80 pl-1">
                                      Service description
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right" />
                                  {colCfg.showQty && <td className="py-2.5 px-2 text-right">2</td>}
                                  {colCfg.showUnitPrice && (
                                    <td className="py-2.5 px-2 text-right">
                                      {currencySymbol}8.00
                                      {colCfg.showMeasurementUnit ? ' /hour' : ''}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-2.5 text-right">
                                    {currencySymbol}16.00
                                  </td>
                                </tr>
                                <tr>
                                  <td className="py-2.5 px-2.5">
                                    <div className="font-bold">
                                      {colCfg.showProductNumber ? 'P-001 ' : ''}Product name
                                    </div>
                                    <div className="text-[11px] opacity-80 pl-1">
                                      Product description
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-right">8.5%</td>
                                  {colCfg.showQty && <td className="py-2.5 px-2 text-right">10</td>}
                                  {colCfg.showUnitPrice && (
                                    <td className="py-2.5 px-2 text-right">
                                      {currencySymbol}20.00
                                      {colCfg.showMeasurementUnit ? ' /piece' : ''}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-2.5 text-right">
                                    {currencySymbol}200.00
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <div className="flex justify-end mt-3">
                              <div className="w-1/2 text-xs">
                                <div className="flex justify-between py-1.5 px-2.5 border-t border-gray-200">
                                  <span className="font-bold">Subtotal</span>
                                  <span className="font-bold">{currencySymbol}216.00</span>
                                </div>
                                <div className="flex justify-between py-1.5 px-2.5">
                                  <span>VAT ({currencySymbol}20.00 @ 8.5%)</span>
                                  <span>{currencySymbol}17.00</span>
                                </div>
                                <div
                                  style={{ backgroundColor: g.colorScheme }}
                                  className="flex justify-between py-2 px-2.5 mt-1 font-bold text-sm"
                                >
                                  <span>Total</span>
                                  <span>{currencySymbol}233.00</span>
                                </div>
                              </div>
                            </div>

                            {activeDocKey === 'invoice' && d.showInstallments && (
                              <div className="mt-6 text-xs">
                                <div className="font-bold mb-1.5">Installments</div>
                                <div className="border border-gray-200 rounded divide-y divide-gray-200">
                                  <div className="flex justify-between px-3 py-1.5">
                                    <span>Installment 1 — Due 01/01/19</span>
                                    <span className="font-semibold">{currencySymbol}116.50</span>
                                  </div>
                                  <div className="flex justify-between px-3 py-1.5">
                                    <span>Installment 2 — Due 01/02/19</span>
                                    <span className="font-semibold">{currencySymbol}116.50</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {(d.notes || g.notes) && (
                        <div className="mt-8 pt-4 border-t border-gray-200 text-xs whitespace-pre-line">
                          {d.notes || g.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Settings Accordion Sidebar */}
                  <div className="w-[340px] border-l border-gray-200 bg-white overflow-y-auto p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-normal text-gray-800">
                        {currentDocMeta.settingsTitle}
                      </h4>
                      <button
                        type="button"
                        onClick={handleResetSection}
                        className="text-xs text-[#4A90E2] hover:underline font-medium cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="border border-gray-200 rounded overflow-hidden divide-y divide-gray-200">
                      {accordions.map((section) => {
                        const isOpen = openAccordion === section;
                        return (
                          <div key={section}>
                            <button
                              type="button"
                              onClick={() => setOpenAccordion(isOpen ? '' : section)}
                              className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors cursor-pointer ${
                                isOpen
                                  ? 'bg-[#4A90E2] text-white'
                                  : 'bg-white text-[#4A90E2] hover:bg-gray-50'
                              }`}
                            >
                              <span>{section}</span>
                              <span className="text-xs">{isOpen ? '⌄' : '›'}</span>
                            </button>

                            {isOpen && section === 'Appearance' && (
                              <div className="p-4 space-y-4 text-sm text-gray-700 bg-white">
                                <div className="flex items-center justify-between">
                                  <span>Color scheme</span>
                                  <input
                                    type="color"
                                    value={g.colorScheme}
                                    onChange={(e) => updateGlobal({ colorScheme: e.target.value })}
                                    className="w-16 h-8 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Font</span>
                                  <select
                                    value={g.fontFamily}
                                    onChange={(e) => updateGlobal({ fontFamily: e.target.value })}
                                    className="w-32 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white"
                                  >
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Courier New">Courier New</option>
                                  </select>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Font size</span>
                                  <select
                                    value={g.fontSize}
                                    onChange={(e) => updateGlobal({ fontSize: e.target.value })}
                                    className="w-32 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white"
                                  >
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                  </select>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Font color</span>
                                  <input
                                    type="color"
                                    value={g.fontColor}
                                    onChange={(e) => updateGlobal({ fontColor: e.target.value })}
                                    className="w-16 h-8 rounded border border-gray-300 cursor-pointer p-0.5 bg-white"
                                  />
                                </div>

                                <div className="flex items-start justify-between pt-1">
                                  <span>Logo placement</span>
                                  <div className="space-y-2 w-32">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="logoPlacement"
                                        checked={g.logoPlacement === 'Above'}
                                        onChange={() => updateGlobal({ logoPlacement: 'Above' })}
                                        className="accent-[#4A90E2]"
                                      />
                                      <span>Above</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="logoPlacement"
                                        checked={g.logoPlacement === 'Left'}
                                        onChange={() => updateGlobal({ logoPlacement: 'Left' })}
                                        className="accent-[#4A90E2]"
                                      />
                                      <span>Left</span>
                                    </label>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Logo Width</span>
                                  <input
                                    type="range"
                                    min={60}
                                    max={260}
                                    value={g.logoWidth}
                                    onChange={(e) =>
                                      updateGlobal({ logoWidth: Number(e.target.value) })
                                    }
                                    className="w-32 accent-[#4A90E2]"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Logo Height</span>
                                  <input
                                    type="range"
                                    min={40}
                                    max={180}
                                    value={g.logoHeight}
                                    onChange={(e) =>
                                      updateGlobal({ logoHeight: Number(e.target.value) })
                                    }
                                    className="w-32 accent-[#4A90E2]"
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Company Name</span>
                                  <PillToggle
                                    checked={g.showCompanyName}
                                    onChange={(v) => updateGlobal({ showCompanyName: v })}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span>Company Address</span>
                                  <PillToggle
                                    checked={g.showCompanyAddress}
                                    onChange={(v) => updateGlobal({ showCompanyAddress: v })}
                                  />
                                </div>
                              </div>
                            )}

                            {isOpen && section === 'Header' && (
                              <div className="p-4 space-y-4 text-sm text-gray-700 bg-white">
                                {activeDocType === 'global' ? (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <span>Billing address</span>
                                      <PillToggle
                                        checked={g.showBillingAddress}
                                        onChange={(v) => updateGlobal({ showBillingAddress: v })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Shipping address</span>
                                      <PillToggle
                                        checked={g.showShippingAddress}
                                        onChange={(v) => updateGlobal({ showShippingAddress: v })}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Taxpayer ID</span>
                                      <PillToggle
                                        checked={g.showTaxpayerId}
                                        onChange={(v) => updateGlobal({ showTaxpayerId: v })}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <input
                                        type="text"
                                        value={d.title}
                                        onChange={(e) =>
                                          updateDoc(activeDocType, { title: e.target.value })
                                        }
                                        placeholder="Document title"
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#4A90E2]"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Project name</span>
                                      <PillToggle
                                        checked={d.showProjectName ?? true}
                                        onChange={(v) =>
                                          updateDoc(activeDocType, { showProjectName: v })
                                        }
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {isOpen && section === 'Table' && (
                              <div className="p-4 space-y-3.5 text-sm text-gray-700 bg-white">
                                <div>
                                  <input
                                    type="text"
                                    value={colCfg.itemColLabel}
                                    onChange={(e) => setColCfg({ itemColLabel: e.target.value })}
                                    className="w-44 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#4A90E2]"
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={colCfg.qtyColLabel}
                                    onChange={(e) => setColCfg({ qtyColLabel: e.target.value })}
                                    className="w-44 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#4A90E2]"
                                  />
                                  <PillToggle
                                    checked={colCfg.showQty}
                                    onChange={(v) => setColCfg({ showQty: v })}
                                  />
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    value={colCfg.unitPriceColLabel}
                                    onChange={(e) =>
                                      setColCfg({ unitPriceColLabel: e.target.value })
                                    }
                                    className="w-44 border border-gray-300 rounded px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#4A90E2]"
                                  />
                                  <PillToggle
                                    checked={colCfg.showUnitPrice}
                                    onChange={(v) => setColCfg({ showUnitPrice: v })}
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span>Measurement unit</span>
                                  <PillToggle
                                    checked={colCfg.showMeasurementUnit}
                                    onChange={(v) => setColCfg({ showMeasurementUnit: v })}
                                  />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span>Product number</span>
                                  <PillToggle
                                    checked={colCfg.showProductNumber}
                                    onChange={(v) => setColCfg({ showProductNumber: v })}
                                  />
                                </div>
                              </div>
                            )}

                            {isOpen && section === 'Bottom' && (
                              <div className="p-4 space-y-4 text-sm text-gray-700 bg-white">
                                {activeDocType === 'invoice' && (
                                  <div className="flex items-center justify-between">
                                    <span>Installments</span>
                                    <PillToggle
                                      checked={Boolean(d.showInstallments)}
                                      onChange={(v) => updateDoc('invoice', { showInstallments: v })}
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="block text-sm text-gray-700 mb-2">
                                    {activeDocType === 'global'
                                      ? 'Global document notes'
                                      : `Global ${currentDocMeta.label} notes`}
                                  </label>
                                  <textarea
                                    rows={4}
                                    value={activeDocType === 'global' ? g.notes : d.notes}
                                    onChange={(e) =>
                                      activeDocType === 'global'
                                        ? updateGlobal({ notes: e.target.value })
                                        : updateDoc(activeDocType, { notes: e.target.value })
                                    }
                                    className="w-full border border-gray-300 rounded p-2.5 text-sm focus:outline-none focus:border-[#4A90E2]"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

  function AdminDrawerModal({ activeAdminModal, onClose }) {
    const { state, inviteTeamUser, addEmployee, uploadVaultFile } = useERP();
    const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Sales' });
    const [empForm, setEmpForm] = useState({ name: '', title: '', department: 'Sales', email: '', hourlyRate: '35' });
    const [fileForm, setFileForm] = useState({ name: '', category: 'Supplier Bill PDF' });

    if (!activeAdminModal || !state) return null;

    return (
      <>
        <Modal open={activeAdminModal === 'users'} onClose={onClose} title="Manage Users" subtitle="Invite team members and assign role-based ERP permissions">
          <div className="space-y-4 text-xs">
            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
              {(state.teamUsers || []).map((u) => (
                <div key={u.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{u.name}</div>
                    <div className="text-gray-500">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={u.role} />
                    <StatusBadge status={u.status === 'Active' ? 'Success' : 'Open'} />
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                inviteTeamUser(userForm);
                setUserForm({ name: '', email: '', role: 'Sales' });
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2"
            >
              <input required placeholder="Full name" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="px-2.5 py-2 border border-gray-300 rounded" />
              <input type="email" required placeholder="Email address" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="px-2.5 py-2 border border-gray-300 rounded" />
              <div className="flex gap-2">
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="flex-1 px-2 py-2 border border-gray-300 rounded">
                  <option>Admin</option>
                  <option>Accountant</option>
                  <option>Sales</option>
                  <option>Warehouse</option>
                </select>
                <button type="submit" className="px-3 py-2 bg-[#4285F4] text-white font-medium rounded">Invite</button>
              </div>
            </form>
          </div>
        </Modal>

        <Modal open={activeAdminModal === 'employees'} onClose={onClose} title="Employees Directory" subtitle="Staff records for expense tracking & warehouse operations">
          <div className="space-y-4 text-xs">
            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
              {(state.employees || []).map((emp) => (
                <div key={emp.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{emp.name} <span className="text-gray-400 font-normal">• {emp.title}</span></div>
                    <div className="text-gray-500">{emp.department} • {emp.email}</div>
                  </div>
                  <span className="font-semibold text-gray-800">{state.company.currency}{emp.hourlyRate}/hr</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addEmployee(empForm);
                setEmpForm({ name: '', title: '', department: 'Sales', email: '', hourlyRate: '35' });
              }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2"
            >
              <input required placeholder="Name" value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} className="px-2.5 py-2 border border-gray-300 rounded" />
              <input required placeholder="Job Title" value={empForm.title} onChange={(e) => setEmpForm({ ...empForm, title: e.target.value })} className="px-2.5 py-2 border border-gray-300 rounded" />
              <input required placeholder="Email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} className="px-2.5 py-2 border border-gray-300 rounded" />
              <button type="submit" className="px-3 py-2 bg-[#4285F4] text-white font-medium rounded">+ Add Employee</button>
            </form>
          </div>
        </Modal>

        <Modal open={activeAdminModal === 'files'} onClose={onClose} title="Uploaded Files" subtitle="Attached receipts, supplier bills, BOLs, and CSV imports">
          <div className="space-y-4 text-xs">
            <div className="divide-y divide-gray-100 border border-gray-200 rounded">
              {(state.uploadedFiles || []).length === 0 ? (
                <div className="p-4 text-center text-gray-400">No files uploaded yet.</div>
              ) : (
                (state.uploadedFiles || []).map((f) => (
                  <div key={f.id} className="px-3.5 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#4285F4]">{f.name}</div>
                      <div className="text-gray-400">{f.category} • {f.size} • Uploaded {f.uploadedAt}</div>
                    </div>
                    <StatusBadge status="Success" />
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                uploadVaultFile({ name: fileForm.name, category: fileForm.category, size: '214 KB' });
                setFileForm({ name: '', category: 'Supplier Bill PDF' });
              }}
              className="flex gap-2 pt-2"
            >
              <input required placeholder="Document filename (e.g. Receipt_Nov18.pdf)" value={fileForm.name} onChange={(e) => setFileForm({ ...fileForm, name: e.target.value })} className="flex-1 px-3 py-2 border border-gray-300 rounded" />
              <button type="submit" className="px-4 py-2 bg-[#4285F4] text-white font-medium rounded">Upload File</button>
            </form>
          </div>
        </Modal>
      </>
    );
  }

  // ============================================================================
  // 14. MAIN ONEUP SHELL
  // ============================================================================

  const SIDEBAR_MODULES = [
    { id: 'home', label: 'Home', icon: Home, accent: '#3B82F6', defaultSub: 'launcher' },
    { id: 'opportunities', label: 'Opportunities', icon: MessageSquare, accent: '#62D835', defaultSub: 'leads' },
    { id: 'sales', label: 'Sales', icon: FileSpreadsheet, accent: '#00BFA5', defaultSub: 'customers' },
    { id: 'purchasing', label: 'Purchasing', icon: Receipt, accent: '#03A9F4', defaultSub: 'suppliers' },
    { id: 'inventory', label: 'Inventory', icon: Package, accent: '#F59E0B', defaultSub: 'stock' },
    { id: 'accounting', label: 'Accounting', icon: PieChart, accent: '#7C3AED', defaultSub: 'dashboard' },
    { id: 'reports', label: 'Reports', icon: BookOpen, accent: '#F43F5E', defaultSub: 'accounting' },
    { id: 'apps', label: 'Apps', icon: LayoutGrid, accent: '#64748B', defaultSub: 'connected' },
  ];

  function ERPShell({ firebaseUser, onSignOut }) {
    const { state, loadingWorkspace, syncStatus, toast } = useERP();
    const [activeModule, setActiveModule] = useState('home');
    const [subTabs, setSubTabs] = useState({
      home: 'launcher',
      opportunities: 'leads',
      sales: 'customers',
      purchasing: 'suppliers',
      inventory: 'stock',
      accounting: 'dashboard',
      reports: 'accounting',
      apps: 'connected',
    });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [globalQuery, setGlobalQuery] = useState('');
    const [quickCreateOpen, setQuickCreateOpen] = useState(false);
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [companySettingsOpen, setCompanySettingsOpen] = useState(false);
    const [activeAdminModal, setActiveAdminModal] = useState(null);
    const [quickAction, setQuickAction] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);

    if (loadingWorkspace || !state) {
      return (
        <div className="min-h-screen bg-[#F5F6F8] flex flex-col items-center justify-center gap-3">
          <div className="text-[28px] font-black text-[#E11D48] tracking-[-0.06em]">IVEN</div>
          <div className="text-xs text-gray-500">Syncing your workspace with Google Cloud Firestore...</div>
        </div>
      );
    }

    // Show OneUp-style Company Onboarding Setup for first-time users
    if (state.company && state.company.onboardingCompleted === false) {
      return <CompanyOnboardingModal />;
    }

    const navigate = (modId, targetSub = null, action = null) => {
      setActiveModule(modId);
      if (targetSub) setSubTabs((prev) => ({ ...prev, [modId]: targetSub }));
      if (action) {
        setQuickAction(action);
        setTimeout(() => setQuickAction(null), 300);
      }
    };

    const currentMod = SIDEBAR_MODULES.find((m) => m.id === activeModule) || SIDEBAR_MODULES[0];
    const photoUrl = state.userSettings?.profilePhotoDataUrl || firebaseUser?.photoURL || '';
    if (activeModule === 'company-settings') {
      return <CompanySettingsView onBack={() => navigate('home')} />;
    }
    return (
      <div className="min-h-screen flex bg-[#F5F6F8] text-gray-800 font-sans antialiased">
        {/* LEFT WHITE COLLAPSIBLE SIDEBAR */}
        <aside
          className={`bg-white border-r border-gray-200 flex flex-col justify-between shrink-0 transition-all duration-200 z-30 ${
            sidebarOpen ? 'w-[196px]' : 'w-[58px]'
          }`}
        >
          <div>
            <div className="h-[54px] flex items-center justify-center border-b border-gray-100">
              <button onClick={() => navigate('home')} className="cursor-pointer flex items-center gap-1.5">
                {sidebarOpen ? (
                  <span className="text-[26px] font-black text-[#E11D48] tracking-[-0.06em] leading-none">
                    IVEN
                  </span>
                ) : (
                  <span className="text-[22px] font-black text-[#E11D48]">I</span>
                )}
              </button>
            </div>

            <nav className="py-2 space-y-0.5">
              {SIDEBAR_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() => navigate(mod.id)}
                    title={!sidebarOpen ? mod.label : undefined}
                    className={`w-full relative flex items-center gap-3.5 px-4 py-2.5 text-[13px] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#EEF5FD] text-gray-900 font-semibold'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-normal'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#3B82F6]" />
                    )}
                    <Icon
                      style={{ color: isActive ? mod.accent : '#6B7280' }}
                      className="w-[18px] h-[18px] shrink-0 stroke-[1.75]"
                    />
                    {sidebarOpen && <span className="truncate">{mod.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Workspace Slug + Cloud Sync Indicator */}
          {sidebarOpen && (
            <div className="p-3.5 border-t border-gray-100 space-y-1">
              <div className="text-[11px] font-mono text-gray-400 truncate">
                {state.company.workspaceSlug || 'workspace'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500'
                      : syncStatus === 'saving'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="text-gray-400">
                  {syncStatus === 'synced'
                    ? 'Firestore Cloud Synced'
                    : syncStatus === 'saving'
                    ? 'Saving to cloud...'
                    : syncStatus === 'demo'
                    ? 'Local Demo Session'
                    : 'Offline Cache'}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT CONTENT SHELL */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOP HEADER BAR */}
          <header className="h-[54px] bg-white border-b border-gray-200 px-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-[16px] font-normal text-gray-700">
                {activeModule === 'user-settings' ? 'User Settings' : currentMod.label}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* + Create Menu */}
              <div className="relative">
                <button
                  onClick={() => setQuickCreateOpen(!quickCreateOpen)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline font-medium">Create</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {quickCreateOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setQuickCreateOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-md border border-gray-200 shadow-lg py-1.5 z-40 text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase text-gray-400">Quick Create</div>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('sales', 'invoices', 'invoice'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ Customer Invoice</button>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('sales', 'quotes', 'quote'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ Customer Quote</button>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('purchasing', 'expenses', 'expense'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ Expense Entry</button>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('inventory', 'po', 'po'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ Purchase Order</button>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('inventory', 'stock', 'product'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ Product / Service</button>
                      <button onClick={() => { setQuickCreateOpen(false); navigate('opportunities', 'leads', 'lead'); }} className="w-full text-left px-3.5 py-2 hover:bg-gray-50 text-gray-700">+ CRM Lead</button>
                    </div>
                  </>
                )}
              </div>

              {/* Help Button */}
              <button
                onClick={() => navigate('reports', 'accounting')}
                title="Reports & Documentation"
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <HelpCircle className="w-[19px] h-[19px] stroke-[1.6]" />
              </button>

              {/* Company Settings Gear Dropdown (Manage Subscription Removed) */}
              <div className="relative">
                <button
                  onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  title="Company Settings & Administration"
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <Store className="w-[19px] h-[19px] stroke-[1.6]" />
                </button>
                {settingsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSettingsMenuOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-[3px] border border-gray-200 shadow-lg py-2 z-40 text-[13px] text-gray-700">
                      <button onClick={() => { setSettingsMenuOpen(false); navigate('company-settings'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer">Company Settings</button>
                      <button onClick={() => { setSettingsMenuOpen(false); setActiveAdminModal('users'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer">Manage Users</button>
                      <button onClick={() => { setSettingsMenuOpen(false); setActiveAdminModal('employees'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer">Employees</button>
                      <button onClick={() => { setSettingsMenuOpen(false); setActiveAdminModal('files'); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 cursor-pointer">Uploaded Files</button>
                    </div>
                  </>
                )}
              </div>

              {/* User Profile Avatar Circle */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{ backgroundColor: state.company.avatarColor || '#8B5CF6' }}
                  className="w-8 h-8 rounded-full text-white text-xs font-semibold flex items-center justify-center shadow-2xs cursor-pointer overflow-hidden"
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt={state.company.userFullName} className="w-full h-full object-cover" />
                  ) : (
                    state.company.userInitials
                  )}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-md border border-gray-200 shadow-lg py-1.5 z-40 text-xs">
                      <div className="px-3.5 py-2 border-b border-gray-100">
                        <div className="font-semibold text-gray-900">{state.company.userFullName}</div>
                        <div className="text-[11px] text-gray-400 truncate">{firebaseUser?.email || state.company.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setActiveModule('user-settings');
                        }}
                        className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        User Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('company-settings');
                        }}
                        className="w-full text-left px-3.5 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Company Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 border-t border-gray-100 font-medium cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* MODULE BODY */}
          <main className="flex-1 overflow-y-auto pb-12">
            {activeModule === 'home' && (
              <HomeView navigate={navigate} globalQuery={globalQuery} setGlobalQuery={setGlobalQuery} />
            )}
            {activeModule === 'user-settings' && (
              <UserSettingsView firebaseUser={firebaseUser} onBack={() => navigate('home')} />
            )}
            {activeModule === 'opportunities' && (
              <OpportunitiesView subTab={subTabs.opportunities} setSubTab={(t) => setSubTabs((p) => ({ ...p, opportunities: t }))} quickAction={quickAction} />
            )}
            {activeModule === 'sales' && (
              <SalesView subTab={subTabs.sales} setSubTab={(t) => setSubTabs((p) => ({ ...p, sales: t }))} quickAction={quickAction} />
            )}
            {activeModule === 'purchasing' && (
              <PurchasingView subTab={subTabs.purchasing} setSubTab={(t) => setSubTabs((p) => ({ ...p, purchasing: t }))} quickAction={quickAction} />
            )}
            {activeModule === 'inventory' && (
              <InventoryView subTab={subTabs.inventory} setSubTab={(t) => setSubTabs((p) => ({ ...p, inventory: t }))} quickAction={quickAction} />
            )}
            {activeModule === 'accounting' && (
              <AccountingView
                subTab={subTabs.accounting}
                setSubTab={(t) => setSubTabs((p) => ({ ...p, accounting: t }))}
                onNavigateReport={(repId) => {
                  setReportTarget(repId);
                  navigate('reports', 'accounting');
                }}
              />
            )}
            {activeModule === 'reports' && (
              <ReportsView subTab={subTabs.reports} setSubTab={(t) => setSubTabs((p) => ({ ...p, reports: t }))} initialReport={reportTarget} />
            )}
            {activeModule === 'apps' && (
              <AppsView subTab={subTabs.apps} setSubTab={(t) => setSubTabs((p) => ({ ...p, apps: t }))} />
            )}
          </main>
        </div>

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-md shadow-xl flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* MODALS */}
        
        <AdminDrawerModal activeAdminModal={activeAdminModal} onClose={() => setActiveAdminModal(null)} />
      </div>
    );
  }

  export default function App() {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [isDemoSession, setIsDemoSession] = useState(false);

    useEffect(() => {
      const initSandboxAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            console.warn('Custom token sign-in skipped:', e);
          }
        }
      };
      initSandboxAuth();

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) setIsDemoSession(false);
        setAuthReady(true);
      });
      return () => unsubscribe();
    }, []);

    const handleEnterDemo = async () => {
      try {
        await signInAnonymously(auth);
      } catch {
        setIsDemoSession(true);
        setUser({ uid: 'demo-local-user', displayName: 'Wendel Crasta', email: 'wendel@iven.app' });
      }
    };

    const handleSignOut = async () => {
      setIsDemoSession(false);
      setUser(null);
      try {
        await signOut(auth);
      } catch {
        // Ignore if local demo session
      }
    };

    if (!authReady) {
      return (
        <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
          <div className="text-[28px] font-black text-[#E11D48] tracking-[-0.06em]">IVEN</div>
        </div>
      );
    }

    if (!user) {
      return <AuthScreen onEnterDemo={handleEnterDemo} />;
    }

    return (
      <ERPProvider user={user} isDemoSession={isDemoSession}>
        <ERPShell firebaseUser={user} onSignOut={handleSignOut} />
      </ERPProvider>
    );
  }