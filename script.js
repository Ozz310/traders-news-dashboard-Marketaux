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
        newsContainer.innerHTML = '<p>Failed to load news. Please try again later. (Check browser console for details)</p>';
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
        // Basic check to ensure row has at least as many columns as headers
        if (currentLine.length >= headers.length) { 
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                // Use ternary operator to handle potential undefined if currentLine is shorter than headers, default to empty string
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

    // Sort news by published time descending (most recent first)
    // Assuming 'Published Time' is parseable by Date constructor
    news.sort((a, b) => {
        const dateA = new Date(a['Published Time']);
        const dateB = new Date(b['Published Time']);
        return dateB - dateA; // Descending order
    }).forEach(article => {
        // Basic validation and default values
        const headline = article.Headline && article.Headline.trim() !== '' ? article.Headline.trim() : 'No Headline';
        const summary = article.Summary && article.Summary.trim() !== '' ? article.Summary.trim() : 'No Summary';
        
        let url = article.URL && article.URL.trim() !== '' ? article.URL.trim() : '#';
        // Add basic URL scheme if missing for relative URLs (unlikely from Marketaux but good practice)
        if (url !== '#' && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        const tickers = article.Tickers && article.Tickers.trim() !== '' ? article.Tickers.trim() : 'N/A';
        
        let publishedTimeFormatted = 'N/A';
        if (article['Published Time']) {
            try {
                // Assuming current location is Rawalpindi, Punjab, Pakistan (PKT)
                // Adjusting options for PKT timezone formatting (UTC+5)
                const dateOptions = { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true, // For 12-hour format as per Notion setting
                    timeZone: 'Asia/Karachi' // Pakistan time zone
                };
                const articleDate = new Date(article['Published Time']);
                publishedTimeFormatted = articleDate.toLocaleString('en-US', dateOptions);
            } catch (e) {
                console.error("Error formatting date:", e);
                publishedTimeFormatted = article['Published Time']; // Fallback to raw
            }
        }

        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');

        articleDiv.innerHTML = `
            <h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>
            <p>${summary}</p>
            <div class="news-meta">
                <span>Published: ${publishedTimeFormatted}</span>
                <span>Tickers: ${tickers}</span>
            </div>
        `;
        // Only append if headline is not 'No Headline' (filter out completely empty rows)
        if (headline !== 'No Headline') {
            newsContainer.appendChild(articleDiv);
        }
    });
}

// Event listener for the refresh button
document.getElementById('refreshButton').addEventListener('click', fetchNews);

// Initial fetch when the page loads
fetchNews();

// Optional: Auto-refresh every 5 minutes (300000 milliseconds)
// Uncomment the line below to enable auto-refresh
// setInterval(fetchNews, 300000);