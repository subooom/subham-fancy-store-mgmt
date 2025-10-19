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
  
  sheet.appendRow([
    timestamp,
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

// For dashboard data retrieval
function doGet(e) {
  if (e.parameter.type === 'dashboard') {
    return getDashboardData();
  }
  return HtmlService.createHtmlOutput("API is running");
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const salesSheet = ss.getSheetByName("Sales");
  const expensesSheet = ss.getSheetByName("Expenses");
  const loansSheet = ss.getSheetByName("Loans");
  const duesSheet = ss.getSheetByName("Dues");
  
  const salesData = salesSheet.getRange(2, 1, salesSheet.getLastRow()-1, 5).getValues();
  const totalProfit = salesData.reduce((sum, row) => sum + (row[4] || 0), 0);
  
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
