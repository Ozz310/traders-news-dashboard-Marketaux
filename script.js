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
                // Data is already trimmed by parseCSVLine, handle potential missing fields
                row[headers[j]] = currentLine[j] !== undefined ? currentLine[j] : ''; 
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
    news.sort((a, b) => {
        const dateA = new Date(a['Published Time']);
        const dateB = new Date(b['Published Time']);
        // Handle invalid dates for sorting: invalid dates are pushed to the end
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA; // Descending order
    }).filter(article => article.Headline && article.Headline.trim() !== '').forEach(article => {
        // Basic validation and default values
        const headline = article.Headline && article.Headline.trim() !== '' ? article.Headline.trim() : 'No Headline';
        const summary = article.Summary && article.Summary.trim() !== '' ? article.Summary.trim() : 'No Summary';
        
        let url = article.URL && article.URL.trim() !== '' ? article.URL.trim() : ''; // Default to empty string
        // Strip any potential leading/trailing quotes from the URL
        url = url.replace(/^"|"$/g, '');

        // Add basic URL scheme if missing AND validate if it looks like a URL
        if (url !== '') { // Only process if URL is not empty
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url; // Prepend https if scheme is missing
            }
            // Attempt to construct a URL object to validate
            try {
                new URL(url); 
            } catch (e) {
                console.warn(`Invalid URL detected: "${url}" for headline "${headline}"`);
                url = '#'; // Fallback if it's not a valid URL
            }
        } else {
            url = '#'; // If empty, make it non-clickable
        }


        let tickersHtml = ''; // Initialize as empty
        const tickers = article.Tickers && article.Tickers.trim() !== '' ? article.Tickers.trim() : 'N/A';
        // Only display tickers if they are not 'N/A'
        if (tickers !== 'N/A') {
            tickersHtml = `<span>Tickers: ${tickers}</span>`;
        }
        
        let publishedTimeFormatted = 'N/A';
        if (article['Published Time']) {
            try {
                // Clean the date string: remove extra leading/trailing whitespace, quotes, and excessive trailing zeros
                const cleanDateString = article['Published Time'].trim().replace(/^"|"$/g, '').replace(/\.0+Z$/, 'Z');
                const articleDate = new Date(cleanDateString);

                if (!isNaN(articleDate)) { // Check if date is valid
                    const dateOptions = { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true, // For 12-hour format as per Notion setting
                        timeZone: 'Asia/Karachi' // Pakistan time zone (PKT)
                    };
                    publishedTimeFormatted = articleDate.toLocaleString('en-US', dateOptions);
                } else {
                    console.warn(`Could not parse date: "${article['Published Time']}" for headline "${headline}"`);
                    publishedTimeFormatted = 'Invalid Date'; // Fallback if parsing fails
                }
            } catch (e) {
                console.error("Error formatting date:", e);
                publishedTimeFormatted = 'Invalid Date'; // Fallback to 'Invalid Date'
            }
        }

        const articleDiv = document.createElement('div');
        articleDiv.classList.add('news-article');

        // Conditionally render headline as a link or just text
        const headlineHtml = url !== '#' ? `<h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>` : `<h2>${headline}</h2>`;

        articleDiv.innerHTML = `
            ${headlineHtml}
            <p>${summary}</p>
            <div class="news-meta">
                <span>Published: ${publishedTimeFormatted}</span>
                ${tickersHtml} 
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
