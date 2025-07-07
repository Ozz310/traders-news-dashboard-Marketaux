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

// Robust CSV parser
function parseCSV(csv) {
    const lines = csv.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    if (nonEmptyLines.length === 0) return [];

    const headers = nonEmptyLines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < nonEmptyLines.length; i++) {
        const currentLine = parseCSVLine(nonEmptyLines[i]); // Use improved line parser
        if (currentLine.length === headers.length) { // Ensure line has correct number of columns
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = currentLine[j]; // Data is already trimmed by parseCSVLine
            }
            data.push(row);
        }
    }
    return data;
}

// More robust CSV line parser to handle commas within fields if quoted
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


function displayNews(news) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = ''; // Clear loading message

    if (news.length === 0) {
        newsContainer.innerHTML = '<p>No news articles found.</p>';
        return;
    }

    // Sort news by published time descending (most recent first)
    // Filter out articles with no valid headline if they exist
    news.sort((a, b) => {
        const dateA = new Date(a['Published Time']);
        const dateB = new Date(b['Published Time']);
        return isNaN(dateA) ? (isNaN(dateB) ? 0 : 1) : (isNaN(dateB) ? -1 : dateB - dateA); // Handle invalid dates
    }).filter(article => article.Headline && article.Headline.trim() !== '').forEach(article => {
        // Basic validation and default values
        const headline = article.Headline && article.Headline.trim() !== '' ? article.Headline.trim() : 'No Headline';
        const summary = article.Summary && article.Summary.trim() !== '' ? article.Summary.trim() : 'No Summary';
        
        let url = article.URL && article.URL.trim() !== '' ? article.URL.trim() : '#';
        // Add basic URL scheme if missing for relative URLs (unlikely from Marketaux but good practice)
        if (url !== '#' && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        // Basic URL validation
        try {
            new URL(url); // Attempt to construct a URL object to validate
        } catch (e) {
            url = '#'; // Fallback if it's not a valid URL
        }


        const tickers = article.Tickers && article.Tickers.trim() !== '' ? article.Tickers.trim() : 'N/A';
        
        let publishedTimeFormatted = 'N/A';
        if (article['Published Time']) {
            try {
                const articleDate = new Date(article['Published Time']);
                if (!isNaN(articleDate)) { // Check if date is valid
                    const dateOptions = { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Karachi' // PKT timezone
                    };
                    publishedTimeFormatted = articleDate.toLocaleString('en-US', dateOptions);
                } else {
                    publishedTimeFormatted = 'Invalid Date'; // Fallback if parsing fails
                }
            } catch (e) {
                console.error("Error formatting date:", e);
                publishedTimeFormatted = 'Invalid Date'; // Fallback to 'Invalid Date'
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
