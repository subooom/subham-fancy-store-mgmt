const SHEET_ID = "17YZz_7_3vuq4vvruglFZMhJSipjmZtDf_IcVsL1cnZU";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { type, locale, ...entryData } = data;

    const ss = SpreadsheetApp.openById(SHEET_ID);

    switch (type) {
      case "sale":
        return addSale(ss, entryData);
      case "expense":
        return addExpense(ss, entryData);
      case "loan":
        return addLoan(ss, entryData);
      case "due":
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

  let payment_method = "split";
  let payment_breakdown = data.payment_method;

  if (typeof data.payment_method === "string") {
    payment_method = data.payment_method;
    payment_breakdown = {
      [payment_method]: data.sellingPrice * data.quantity,
    };
  }

  sheet.appendRow([
    timestamp,
    saleDate,
    data.productName,
    data.costPrice,
    data.sellingPrice,
    data.quantity,
    data.costPrice * data.quantity,
    data.sellingPrice * data.quantity,
    profit,
    profit * data.quantity,
    payment_method,
    JSON.stringify(payment_breakdown),
  ]);

  return successResponse("Sale added successfully!");
}

function addExpense(ss, data) {
  const sheet = ss.getSheetByName("Expenses");
  const timestamp = new Date();

  sheet.appendRow([timestamp, data.description, data.category, data.amount]);

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
    data.notes || "",
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
    data.notes || "",
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
  const { type, locale } = e.parameter;

  switch (type) {
    case "dashboard":
      return getDashboardData();
    case "sales":
      return getSalesData(e.parameter.date, e.parameter.period || "daily");
    case "expenses":
      return getExpensesData(e.parameter.date, e.parameter.period || "daily");
    case "loans":
      return getLoansData(e.parameter.date, e.parameter.period || "daily");
    case "dues":
      return getDuesData(e.parameter.date, e.parameter.period || "daily");
    case "translations":
      return getTranslations(locale || "en");
    case "vault":
      return getVaultAmount();
    default:
      return createJsonResponse({
        status: "error",
        message: "Invalid type parameter",
      });
  }
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const salesSheet = ss.getSheetByName("Sales");
  const expensesSheet = ss.getSheetByName("Expenses");
  const loansSheet = ss.getSheetByName("Loans");
  const duesSheet = ss.getSheetByName("Dues");

  const salesData = salesSheet
    .getRange(2, 1, salesSheet.getLastRow() - 1, 6)
    .getValues();
  const totalProfit = salesData.reduce((sum, row) => sum + (row[5] || 0), 0);

  const dashboardData = {
    totalSales: salesData.length,
    totalProfit: totalProfit,
    savings: totalProfit * 0.4,
    reinvestment: totalProfit * 0.6,
  };

  return ContentService.createTextOutput(
    JSON.stringify(dashboardData)
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSalesData(dateString, period) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const salesSheet = ss.getSheetByName("Sales");

    // Get all sales data (skip header row)
    const salesData = salesSheet
      .getRange(2, 1, salesSheet.getLastRow() - 1, 6)
      .getValues();

    // Parse the target date
    const targetDate = new Date(dateString);

    // Filter sales based on period
    let filteredSales = [];

    switch (period) {
      case "daily":
        const targetDateString = targetDate.toDateString();
        filteredSales = salesData.filter((row) => {
          const saleDate = new Date(row[1]);
          return saleDate.toDateString() === targetDateString;
        });
        break;

      case "weekly":
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        filteredSales = salesData.filter((row) => {
          const saleDate = new Date(row[1]);
          return saleDate >= weekStart && saleDate <= weekEnd;
        });
        break;

      case "monthly":
        filteredSales = salesData.filter((row) => {
          const saleDate = new Date(row[1]);
          return (
            saleDate.getFullYear() === targetDate.getFullYear() &&
            saleDate.getMonth() === targetDate.getMonth()
          );
        });
        break;

      case "annually":
        filteredSales = salesData.filter((row) => {
          const saleDate = new Date(row[1]);
          return saleDate.getFullYear() === targetDate.getFullYear();
        });
        break;
    }

    // Calculate totals
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce(
      (sum, row) => sum + (row[4] || 0),
      0
    );
    const totalProfit = filteredSales.reduce(
      (sum, row) => sum + (row[5] || 0),
      0
    );

    // Format sales data for response
    const formattedSales = filteredSales.map((row) => ({
      productName: row[2] || "",
      costPrice: row[3] || 0,
      sellingPrice: row[4] || 0,
    }));

    const responseData = {
      date: dateString,
      period: period,
      totalSales: totalSales,
      totalRevenue: totalRevenue,
      totalProfit: totalProfit,
      sales: formattedSales,
    };

    return ContentService.createTextOutput(
      JSON.stringify(responseData)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: "Error retrieving sales data: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getExpensesData(dateString, period) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const expensesSheet = ss.getSheetByName("Expenses");

    // Get all expenses data (skip header row)
    const expensesData = expensesSheet
      .getRange(2, 1, expensesSheet.getLastRow() - 1, 4)
      .getValues();

    // Parse the target date
    const targetDate = new Date(dateString);

    // Filter expenses based on period
    let filteredExpenses = [];

    switch (period) {
      case "daily":
        const targetDateString = targetDate.toDateString();
        filteredExpenses = expensesData.filter((row) => {
          const expenseDate = new Date(row[0]);
          return expenseDate.toDateString() === targetDateString;
        });
        break;

      case "weekly":
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        filteredExpenses = expensesData.filter((row) => {
          const expenseDate = new Date(row[0]);
          return expenseDate >= weekStart && expenseDate <= weekEnd;
        });
        break;

      case "monthly":
        filteredExpenses = expensesData.filter((row) => {
          const expenseDate = new Date(row[0]);
          return (
            expenseDate.getFullYear() === targetDate.getFullYear() &&
            expenseDate.getMonth() === targetDate.getMonth()
          );
        });
        break;

      case "annually":
        filteredExpenses = expensesData.filter((row) => {
          const expenseDate = new Date(row[0]);
          return expenseDate.getFullYear() === targetDate.getFullYear();
        });
        break;
    }

    // Calculate totals
    const totalExpenses = filteredExpenses.length;
    const totalAmount = filteredExpenses.reduce(
      (sum, row) => sum + (row[3] || 0),
      0
    );
    const categories = [...new Set(filteredExpenses.map((row) => row[2]))];
    const categoriesCount = categories.length;

    // Format expenses data for response
    const formattedExpenses = filteredExpenses.map((row) => ({
      description: row[1] || "",
      category: row[2] || "",
      amount: row[3] || 0,
    }));

    const responseData = {
      date: dateString,
      period: period,
      totalExpenses: totalExpenses,
      totalAmount: totalAmount,
      categoriesCount: categoriesCount,
      expenses: formattedExpenses,
    };

    return ContentService.createTextOutput(
      JSON.stringify(responseData)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: "Error retrieving expenses data: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getLoansData(dateString, period) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const loansSheet = ss.getSheetByName("Loans");

    // Get all loans data (skip header row)
    const loansData = loansSheet
      .getRange(2, 1, loansSheet.getLastRow() - 1, 6)
      .getValues();

    // Parse the target date
    const targetDate = new Date(dateString);

    // Filter loans based on period
    let filteredLoans = [];

    switch (period) {
      case "daily":
        const targetDateString = targetDate.toDateString();
        filteredLoans = loansData.filter((row) => {
          const loanDate = new Date(row[0]);
          return loanDate.toDateString() === targetDateString;
        });
        break;

      case "weekly":
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        filteredLoans = loansData.filter((row) => {
          const loanDate = new Date(row[0]);
          return loanDate >= weekStart && loanDate <= weekEnd;
        });
        break;

      case "monthly":
        filteredLoans = loansData.filter((row) => {
          const loanDate = new Date(row[0]);
          return (
            loanDate.getFullYear() === targetDate.getFullYear() &&
            loanDate.getMonth() === targetDate.getMonth()
          );
        });
        break;

      case "annually":
        filteredLoans = loansData.filter((row) => {
          const loanDate = new Date(row[0]);
          return loanDate.getFullYear() === targetDate.getFullYear();
        });
        break;
    }

    // Calculate totals
    const totalLoans = filteredLoans.length;
    const loansTaken = filteredLoans
      .filter((row) => row[1] === "Loan Taken")
      .reduce((sum, row) => sum + (row[3] || 0), 0);
    const loansRepaid = filteredLoans
      .filter((row) => row[1] === "Loan Repaid")
      .reduce((sum, row) => sum + (row[3] || 0), 0);

    // Format loans data for response
    const formattedLoans = filteredLoans.map((row) => ({
      type: row[1] || "",
      person: row[2] || "",
      amount: row[3] || 0,
      status: row[4] || "",
      notes: row[5] || "",
    }));

    const responseData = {
      date: dateString,
      period: period,
      totalLoans: totalLoans,
      loansTaken: loansTaken,
      loansRepaid: loansRepaid,
      loans: formattedLoans,
    };

    return ContentService.createTextOutput(
      JSON.stringify(responseData)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: "Error retrieving loans data: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getDuesData(dateString, period) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const duesSheet = ss.getSheetByName("Dues");

    // Get all dues data (skip header row)
    const duesData = duesSheet
      .getRange(2, 1, duesSheet.getLastRow() - 1, 5)
      .getValues();

    // Parse the target date
    const targetDate = new Date(dateString);

    // Filter dues based on period
    let filteredDues = [];

    switch (period) {
      case "daily":
        const targetDateString = targetDate.toDateString();
        filteredDues = duesData.filter((row) => {
          const dueDate = new Date(row[0]);
          return dueDate.toDateString() === targetDateString;
        });
        break;

      case "weekly":
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        filteredDues = duesData.filter((row) => {
          const dueDate = new Date(row[0]);
          return dueDate >= weekStart && dueDate <= weekEnd;
        });
        break;

      case "monthly":
        filteredDues = duesData.filter((row) => {
          const dueDate = new Date(row[0]);
          return (
            dueDate.getFullYear() === targetDate.getFullYear() &&
            dueDate.getMonth() === targetDate.getMonth()
          );
        });
        break;

      case "annually":
        filteredDues = duesData.filter((row) => {
          const dueDate = new Date(row[0]);
          return dueDate.getFullYear() === targetDate.getFullYear();
        });
        break;
    }

    // Calculate totals
    const totalDues = filteredDues.length;
    const pendingDues = filteredDues
      .filter((row) => row[3] === "Pending")
      .reduce((sum, row) => sum + (row[2] || 0), 0);
    const paidDues = filteredDues
      .filter((row) => row[3] === "Paid")
      .reduce((sum, row) => sum + (row[2] || 0), 0);

    // Format dues data for response
    const formattedDues = filteredDues.map((row) => ({
      customerName: row[1] || "",
      amount: row[2] || 0,
      status: row[3] || "",
      notes: row[4] || "",
    }));

    const responseData = {
      date: dateString,
      period: period,
      totalDues: totalDues,
      pendingDues: pendingDues,
      paidDues: paidDues,
      dues: formattedDues,
    };

    return ContentService.createTextOutput(
      JSON.stringify(responseData)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: "Error retrieving dues data: " + error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getVaultAmount() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const salesSheet = ss.getSheetByName("Sales");
    const expensesSheet = ss.getSheetByName("Expenses");

    const salesData = salesSheet
      .getRange(2, 5, salesSheet.getLastRow() - 1, 1)
      .getValues(); // Selling Price
    const expenseData = expensesSheet
      .getRange(2, 4, expensesSheet.getLastRow() - 1, 1)
      .getValues(); // Amount

    const totalIncome = salesData.reduce(
      (sum, [price]) => sum + (price || 0),
      0
    );
    const totalExpenses = expenseData.reduce(
      (sum, [amount]) => sum + (amount || 0),
      0
    );

    const vaultAmount = totalIncome - totalExpenses;

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        totalIncome,
        totalExpenses,
        vaultAmount,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.message,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getTranslations(locale) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName("Translations");
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues(); // skip header

    const translations = {};
    data.forEach((row) => {
      const [key, lang, value] = row;
      if (lang === locale) {
        translations[key] = value;
      }
    });

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", locale, translations })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.message })
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
    sheet
      .getRange("A1:F1")
      .setValues([
        [
          "Timestamp",
          "Sale Date",
          "Product Name",
          "Cost Price",
          "Selling Price",
          "Profit",
        ],
      ]);
  }

  // Initialize Expenses sheet
  sheet = ss.getSheetByName("Expenses");
  if (!sheet) {
    sheet = ss.insertSheet("Expenses");
    sheet
      .getRange("A1:D1")
      .setValues([["Timestamp", "Description", "Category", "Amount"]]);
  }

  // Initialize Loans sheet
  sheet = ss.getSheetByName("Loans");
  if (!sheet) {
    sheet = ss.insertSheet("Loans");
    sheet
      .getRange("A1:F1")
      .setValues([
        [
          "Timestamp",
          "Type",
          "Person/Organization",
          "Amount",
          "Status",
          "Notes",
        ],
      ]);
  }

  // Initialize Dues sheet
  sheet = ss.getSheetByName("Dues");
  if (!sheet) {
    sheet = ss.insertSheet("Dues");
    sheet
      .getRange("A1:E1")
      .setValues([["Timestamp", "Customer Name", "Amount", "Status", "Notes"]]);
  }
}
