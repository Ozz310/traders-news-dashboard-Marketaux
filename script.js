// script.js
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbylYi9QCz7vd8PU-9VjeRQ7h4LiAE9Y3_LX10D0faduCtwIfFLU9d1-ep48JLsGJl4L/exec'; // <--- THIS IS THE NEW, CORRECT URL

let allNewsArticles = []; // To store all fetched news
let autoRefreshIntervalId; // Used for setInterval
const AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes

// --- Helper Functions ---

// Robust CSV parser (keep this as is, it's good!)
function parseCSV(csv) {
    const lines = csv.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    if (nonEmptyLines.length === 0) return [];

    // Assuming the first non-empty line is headers
    const headersLine = nonEmptyLines[0];
    const headers = parseCSVLine(headersLine).map(header => header.trim());

    const data = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const currentLine = parseCSVLine(nonEmptyLines[i]);
        if (currentLine.length === headers.length) { // Ensure line has correct number of columns
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = currentLine[j] !== undefined ? currentLine[j] : '';
            }
            data.push(row);
        } else {
            console.warn(`Skipping malformed CSV row: "${nonEmptyLines[i]}" - Expected ${headers.length} columns, got ${currentLine.length}`);
        }
    }
    return data;
}

// More robust CSV line parser to handle quoted commas (keep this as is, it's good!)
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

// Format date for display (keep this as is)
function formatNewspaperDateline(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date)) throw new Error('Invalid Date');

        const options = { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        return `${date.toLocaleString('en-US', options)}`;
    } catch (e) {
        console.error("Date parsing error:", e);
        return 'Invalid Date';
    }
}

// --- Main Fetch & Display Functions (keep as is) ---

async function fetchNews() {
    const newsContainer = document.getElementById('news-columns');
    const skeletonWrapper = document.querySelector('.skeleton-wrapper');

    if (!newsContainer) {
        console.error("Error: #news-columns element not found. Cannot load news.");
        return;
    }

    if (skeletonWrapper) {
        skeletonWrapper.style.display = 'block';
    }
    newsContainer.innerHTML = ''; // Clear previous content

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();

        const newsData = parseCSV(csvText);
        allNewsArticles = newsData.filter(article => article.Headline && article.Headline.trim() !== '');
        displayNews(allNewsArticles);

    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = '<p>Failed to retrieve news. Please try refreshing.</p>';
        if (skeletonWrapper) {
            skeletonWrapper.style.display = 'none';
        }
    }
}

function displayNews(articlesToDisplay) {
    const newsContainer = document.getElementById('news-columns');
    const skeletonWrapper = document.querySelector('.skeleton-wrapper');

    if (!newsContainer) {
        console.error("Error: #news-columns element not found in displayNews.");
        return;
    }

    newsContainer.innerHTML = ''; // Clear everything, including skeleton if present

    if (skeletonWrapper) {
        skeletonWrapper.style.display = 'none';
    }

    if (articlesToDisplay.length === 0) {
        newsContainer.innerHTML = '<p>No news articles found.</p>';
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
        const imageUrl = article['Image URL'] || '';

        // URL Validation
        if (url !== '') {
            url = url.replace(/^"|"$/g, '').trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            try { new URL(url); } catch (e) { url = '#'; }
        } else { url = '#'; }

        // Determine if BREAKING ribbon is needed (e.g., first article)
        const isBreaking = index === 0;
        const breakingRibbonHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';

        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');

        const summaryHtml = summary ? `<p>${summary.substring(0, 300)}...</p>` : '<p>No summary available.</p>';
        const readMoreHtml = summary.length > 300 && url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="read-more-button">Read More</a>` : '';

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

// Auto-Refresh: STARTING BY DEFAULT
function startAutoRefresh() {
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = setInterval(fetchNews, AUTO_REFRESH_INTERVAL_MS);
    console.log(`Auto-refresh started (every ${AUTO_REFRESH_INTERVAL_MS / 60000} minutes).`);
}

function stopAutoRefresh() { // This function is not called but remains for completeness
    if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
        autoRefreshIntervalId = null;
        console.log('Auto-refresh stopped.');
    }
}

// --- Initial Load ---
window.onload = () => {
    fetchNews(); // Initial fetch
    startAutoRefresh(); // Start auto-refresh by default
};
