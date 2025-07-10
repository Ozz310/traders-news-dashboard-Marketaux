const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAJhMLSkrHlICOabG493SP5WSQ1kUbbCnoAIgJGdD3TUzhBY1Fyn5-PQ9LuVKzf5YO6LHAlQkW3Dos/pub?output=csv';
let allNewsArticles = []; // To store all fetched news for search/filtering
let autoRefreshIntervalId; // To store the interval ID for auto-refresh

const AUTO_REFRESH_KEY = 'tradersGazette_autoRefresh'; // Key for localStorage

// --- Helper Functions ---

// Robust CSV parser
function parseCSV(csv) {
    const lines = csv.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    if (nonEmptyLines.length === 0) return [];

    const headers = nonEmptyLines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const currentLine = parseCSVLine(nonEmptyLines[i]);
        if (currentLine.length === headers.length) { // Ensure line has correct number of columns
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = currentLine[j] !== undefined ? currentLine[j] : '';
            }
            data.push(row);
        }
    }
    return data;
}

// More robust CSV line parser
function parseCSVLine(line) {
    const result = [];
    let inQuote = false;
    let currentField = '';
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    result.push(currentField.trim()); // Add the last field
    return result;
}

// Format date for newspaper dateline (re-using old functionality)
function formatNewspaperDateline(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) throw new Error('Invalid Date');

        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleString('en-US', options)}`; 
    } catch (e) {
        console.error("Date parsing error:", e);
        return 'Invalid Date';
    }
}

// Format current date for masthead dateline (re-using old functionality)
function formatMastheadDateline() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleString('en-US', options) + ' · Rawalpindi, PK'; 
}

// --- Main Fetch & Display Functions ---

async function fetchNews() {
    const newsContainer = document.getElementById('news-columns'); // Target the news columns container
    // --- THIS IS THE LINE THAT WAS FAILING ---
    if (!newsContainer) { 
        console.error("Error: #news-columns element not found. Cannot load news.");
        return; // Exit if element is not found
    }
    // --- END FIX ---

    newsContainer.innerHTML = '<p>Loading the latest dispatch...</p>'; // Loading message

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();

        const newsData = parseCSV(csvText);
        allNewsArticles = newsData.filter(article => article.Headline && article.Headline.trim() !== ''); // Store and filter out empty headlines
        displayNews(allNewsArticles); // Display all fetched news
        updateMastheadDateline(); // Update the main masthead date

    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = '<p>Failed to retrieve the latest dispatch. Please try refreshing.</p>';
    }
}

function displayNews(articlesToDisplay) {
    const newsContainer = document.getElementById('news-columns');
    if (!newsContainer) { 
        console.error("Error: #news-columns element not found in displayNews.");
        return; 
    }
    newsContainer.innerHTML = ''; // Clear loading message

    if (articlesToDisplay.length === 0) {
        newsContainer.innerHTML = '<p>No news articles found in this dispatch.</p>';
        return;
    }

    // Sort news by published time descending (most recent first)
    articlesToDisplay.sort((a, b) => {
        const dateA = new Date(a['Published Time']);
        const dateB = new Date(b['Published Time']);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    }).forEach((article, index) => {
        const headline = article.Headline || '';
        const summary = article.Summary || '';
        let url = article.URL || '#';
        const publishedTime = article['Published Time'] || 'N/A';
        const tickers = article.Tickers || 'N/A';

        // URL Validation
        if (url !== '') {
            url = url.replace(/^"|"$/g, '').trim(); // Remove quotes and trim
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            try { new URL(url); } catch (e) { url = '#'; } // Validate again
        } else { url = '#'; }

        // Determine if BREAKING ribbon is needed (Example: first article, or based on keywords)
        // This logic needs to be simplified as there's no specific 'BREAKING' tag from Marketaux API
        // For demonstration, let's mark the very first article as BREAKING.
        const isBreaking = index === 0; // Mark the very first article as BREAKING for demonstration
        const breakingRibbonHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';

        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');
        // No 'column-item' class as the CSS grid handles it differently now.

        const summaryHtml = summary ? `<p>${summary.substring(0, 300)}...</p>` : '<p>No summary available.</p>'; // Truncate summary for initial view
        const readMoreHtml = summary.length > 300 && url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="read-more-link">Read More</a>` : '';


        // Build the HTML for a single news article
        articleDiv.innerHTML = `
            ${breakingRibbonHtml}
            <h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>
            <span class="article-dateline">${formatNewspaperDateline(publishedTime)}</span>
            ${summaryHtml}
            ${readMoreHtml}
            ${tickers !== 'N/A' && tickers.trim() !== '' ? `<div class="news-meta"><span>Tickers: ${tickers}</span></div>` : ''}
        `;
        newsContainer.appendChild(articleDiv);
    });
}

// --- Functionality & Event Listeners ---

// Masthead Dateline Update
function updateMastheadDateline() {
    const datelineSpan = document.getElementById('current-dateline');
    if (datelineSpan) { // Check if element exists before setting text
        datelineSpan.textContent = formatMastheadDateline();
    }
}

// Auto-Refresh Toggle
function setupAutoRefresh() {
    const toggle = document.getElementById('autoRefreshToggle');
    if (!toggle) { // Check if element exists
        console.error("Error: #autoRefreshToggle element not found.");
        return;
    }
    // Load saved state
    const savedState = localStorage.getItem(AUTO_REFRESH_KEY);
    if (savedState === 'true') {
        toggle.checked = true;
        startAutoRefresh();
    } else {
        toggle.checked = false;
        stopAutoRefresh();
    }

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            startAutoRefresh();
            localStorage.setItem(AUTO_REFRESH_KEY, 'true');
        } else {
            stopAutoRefresh();
            localStorage.setItem(AUTO_REFRESH_KEY, 'false');
        }
    });
}

function startAutoRefresh() {
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId); // Clear any existing interval
    autoRefreshIntervalId = setInterval(fetchNews, 300000); // 5 minutes (300000ms)
    console.log('Auto-refresh started (every 5 minutes).'); 
}

function stopAutoRefresh() {
    if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
        autoRefreshIntervalId = null;
        console.log('Auto-refresh stopped.');
    }
}

// Search Bar Functionality
function setupSearchBar() {
    const searchBar = document.getElementById('searchBar');
    if (!searchBar) { // Check if element exists
        console.error("Error: #searchBar element not found.");
        return;
    }
    searchBar.addEventListener('input', (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filteredNews = allNewsArticles.filter(article => {
            const headline = (article.Headline || '').toLowerCase();
            const summary = (article.Summary || '').toLowerCase();
            const tickers = (article.Tickers || '').toLowerCase();
            return headline.includes(searchTerm) || summary.includes(searchTerm) || tickers.includes(searchTerm);
        });
        displayNews(filteredNews); // Re-display filtered news
    });
}


// --- Initial Load - Use window.onload for absolute certainty ---
window.onload = () => {
    // Attach event listener for Refresh Button
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) { // Check if element exists
        refreshButton.addEventListener('click', fetchNews);
    } else {
        console.error("Error: #refreshButton element not found.");
    }

    // Call setup functions
    updateMastheadDateline();
    fetchNews(); // Initial fetch
    setupAutoRefresh(); // Setup auto-refresh
    setupSearchBar(); // Setup search bar
};
