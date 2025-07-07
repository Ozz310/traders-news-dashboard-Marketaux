const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAJhMLSkrHlICOabG493SP5WSQ1kUbbCnoAIgJGdD3TUzhBY1Fyn5-PQ9LuVKzf5YO6LHAlQkW3Dos/pub?output=csv';

async function fetchNews() {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = '<p>Loading news...</p>'; // Show loading message

    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        const csvText = await response.text();

        const newsData = parseCSV(csvText); // Parse the CSV data
        displayNews(newsData);

    } catch (error) {
        console.error('Error fetching news:', error);
        newsContainer.innerHTML = '<p>Failed to load news. Please try again later.</p>';
    }
}

// Simple CSV parser (assumes first row is headers)
function parseCSV(csv) {
    const lines = csv.split('\n');
    // Filter out empty lines that might come from spreadsheet
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    if (nonEmptyLines.length === 0) return [];

    const headers = nonEmptyLines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const currentLine = nonEmptyLines[i].split(',');
        // Basic check to ensure row has data for headers
        if (currentLine.length >= headers.length) { 
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                // Use ternary operator to handle potential undefined if currentLine is shorter than headers
                row[headers[j]] = currentLine[j] ? currentLine[j].trim() : ''; 
            }
            data.push(row);
        }
    }
    return data;
}

function displayNews(news) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = ''; // Clear loading message

    if (news.length === 0) {
        newsContainer.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    // Display news in reverse order (most recent first, assuming new rows are appended)
    // Filter out articles with no valid headline if they exist
    news.reverse().filter(article => article.Headline && article.Headline.trim() !== '').forEach(article => {
        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');

        const headline = article.Headline || 'No Headline';
        const summary = article.Summary || 'No Summary';
        const url = article.URL || '#';
        const publishedTime = article['Published Time'] || 'N/A'; // Use bracket notation for spaces
        const tickers = article.Tickers || 'N/A';

        articleDiv.innerHTML = `
            <h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>
            <p>${summary}</p>
            <div class="news-meta">
                <span>Published: ${publishedTime}</span>
                <span>Tickers: ${tickers}</span>
            </div>
        `;
        newsContainer.appendChild(articleDiv);
    });
}

// Event listener for the refresh button
document.getElementById('refreshButton').addEventListener('click', fetchNews);

// Initial fetch when the page loads
fetchNews();

// Optional: Auto-refresh every 5 minutes (300000 milliseconds)
// Uncomment the line below to enable auto-refresh
// setInterval(fetchNews, 300000);