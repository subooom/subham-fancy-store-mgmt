const SHEET_ID = "YOUR_SHEET_ID_HERE"; // You'll get this after creating the sheet

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { type, ...entryData } = data;
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    switch(type) {
      case 'sale':
        return addSale(ss, entryData);
      case 'expense':
        return addExpense(ss, entryData);
      case 'loan':
        return addLoan(ss, entryData);
      case 'due':
        return addDue(ss, entryData);
      default:
        throw new Error("Invalid type");
    }
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function addSale(ss, data) {
  const sheet = ss.getSheetByName("Sales");
  const timestamp = new Date();
  const profit = data.sellingPrice - data.costPrice;
  
  // Use provided date or current date
  const saleDate = data.date ? new Date(data.date) : timestamp;
  
  sheet.appendRow([
    timestamp,
    saleDate,
    data.productName,
    data.costPrice,
    data.sellingPrice,
    profit
  ]);
  
  return successResponse("Sale added successfully!");
}

function addExpense(ss, data) {
  const sheet = ss.getSheetByName("Expenses");
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    data.description,
    data.category,
    data.amount
  ]);
  
  return successResponse("Expense added successfully!");
}

function addLoan(ss, data) {
  const sheet = ss.getSheetByName("Loans");
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    data.type,
    data.person,
    data.amount,
    data.status,
    data.notes || ""
  ]);
  
  return successResponse("Loan entry added successfully!");
}

function addDue(ss, data) {
  const sheet = ss.getSheetByName("Dues");
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    data.customerName,
    data.amount,
    data.status,
    data.notes || ""
  ]);
  
  return successResponse("Due entry added successfully!");
}

function successResponse(message) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "success", message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}

// For data retrieval
function doGet(e) {
  if (e.parameter.type === 'dashboard') {
    return getDashboardData();
  } else if (e.parameter.type === 'dailySales') {
    return getDailySales(e.parameter.date);
  }
  return HtmlService.createHtmlOutput("API is running");
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const salesSheet = ss.getSheetByName("Sales");
  const expensesSheet = ss.getSheetByName("Expenses");
  const loansSheet = ss.getSheetByName("Loans");
  const duesSheet = ss.getSheetByName("Dues");
  
  const salesData = salesSheet.getRange(2, 1, salesSheet.getLastRow()-1, 6).getValues();
  const totalProfit = salesData.reduce((sum, row) => sum + (row[5] || 0), 0);
  
  const dashboardData = {
    totalSales: salesData.length,
    totalProfit: totalProfit,
    savings: totalProfit * 0.4,
    reinvestment: totalProfit * 0.6
  };
  
  return ContentService.createTextOutput(
    JSON.stringify(dashboardData)
  ).setMimeType(ContentService.MimeType.JSON);
}

function getDailySales(dateString) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const salesSheet = ss.getSheetByName("Sales");
    
    // Get all sales data (skip header row)
    const salesData = salesSheet.getRange(2, 1, salesSheet.getLastRow()-1, 6).getValues();
    
    // Parse the target date
    const targetDate = new Date(dateString);
    const targetDateString = targetDate.toDateString();
    
    // Filter sales for the specific date
    const dailySales = salesData.filter(row => {
      const saleDate = new Date(row[1]); // Column B (index 1) is the sale date
      return saleDate.toDateString() === targetDateString;
    });
    
    // Calculate totals
    const totalSales = dailySales.length;
    const totalRevenue = dailySales.reduce((sum, row) => sum + (row[4] || 0), 0); // Selling price
    const totalProfit = dailySales.reduce((sum, row) => sum + (row[5] || 0), 0); // Profit
    
    // Format sales data for response
    const formattedSales = dailySales.map(row => ({
      productName: row[2] || '', // Column C
      costPrice: row[3] || 0,    // Column D
      sellingPrice: row[4] || 0  // Column E
    }));
    
    const responseData = {
      date: dateString,
      totalSales: totalSales,
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      sales: formattedSales
    };
    
    return ContentService.createTextOutput(
      JSON.stringify(responseData)
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ 
        status: "error", 
        message: "Error retrieving daily sales: " + error.message 
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// Optional: Helper function to initialize the spreadsheet with proper headers
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Initialize Sales sheet with headers including sale date
  let sheet = ss.getSheetByName("Sales");
  if (!sheet) {
    sheet = ss.insertSheet("Sales");
    sheet.getRange("A1:F1").setValues([[
      "Timestamp", "Sale Date", "Product Name", "Cost Price", "Selling Price", "Profit"
    ]]);
  }
  
  // Initialize Expenses sheet
  sheet = ss.getSheetByName("Expenses");
  if (!sheet) {
    sheet = ss.insertSheet("Expenses");
    sheet.getRange("A1:D1").setValues([[
      "Timestamp", "Description", "Category", "Amount"
    ]]);
  }
  
  // Initialize Loans sheet
  sheet = ss.getSheetByName("Loans");
  if (!sheet) {
    sheet = ss.insertSheet("Loans");
    sheet.getRange("A1:F1").setValues([[
      "Timestamp", "Type", "Person/Organization", "Amount", "Status", "Notes"
    ]]);
  }
  
  // Initialize Dues sheet
  sheet = ss.getSheetByName("Dues");
  if (!sheet) {
    sheet = ss.insertSheet("Dues");
    sheet.getRange("A1:E1").setValues([[
      "Timestamp", "Customer Name", "Amount", "Status", "Notes"
    ]]);
  }
}
