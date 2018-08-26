// Declare required modules
const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const json2csv = require('json2csv').parse;

// Initialize variables
let shirts = [];

/**
 * This function is used to add a "0" to value less than 10.
 * Useful for formatting date and time values less than 10
 * @param {string} val [value to check/format]
 * @return {string}      [formatted/unformatted value depending on state]
 */
function addZeroToValue(val) {
  if ( parseInt(val) < 10 ) {
    return `0${val}`;
  } else {
    return val;
  }
}

/**
 * This function is used to a request page
 * Takes the URL to request and a callback function is parameters.
 * The function checks errors and runs a callback if the request is successful
 * @param  {string}   url      [url of page to request]
 * @param  {Function} callback [callback function to run on successful request, takes two parameters, the body and the url for the request]
 */
function requestPage(url, callback) {
  request(url, function (error, response, body) {
    if ( error ) {
      if (error.errno.toLowerCase() === 'enotfound' ) {
        console.error('There’s been a 404 error. Cannot connect to http://shirts4mike.com.');
        writeToErrorLog(error);
      } else {
        console.error(error);
        writeToErrorLog(error);
      }
    } else if ( response.statusCode === 404 ) {
      console.error('There’s been a 404 error. Cannot connect to http://shirts4mike.com.');
      writeToErrorLog(error);
    } else if ( response.statusCode === 200 ) {
      callback(body, url);
    }
  });
}

checkDir('./data/'); // check if data directory exists
requestPage('http://shirts4mike.com/shirts.php', scrapePageUrls); // scrape page urls from shirts page


/**
 * This function is used to scrape the subpage urls from each t shirt in the store
 * @param  {string} html [HTML to scrape]
 */
function scrapePageUrls(html) {
  const $ = cheerio.load(html);
  let ul = $( 'ul.products' ),
      listItems = ul.find( 'li' );

  listItems.each( (index, item) => {
    let link = $(item).find('a').attr("href");
    requestPage(`http://shirts4mike.com/${link}`, scrapeShirtDetails);
  })
}

/**
 * This function is used to scrape the content from the shirt details page
 * @param  {string} html [HTML to scrape]
 * @param  {string} link [link of the shirt details page being scraped]
 * @return {[type]}      [description]
 */
function scrapeShirtDetails(html, link) {
  const $ = cheerio.load(html);
  let picture = $( '.shirt-picture' ).find('img').attr("src");
  let price = parseFloat($( '.shirt-details' ).find('.price').text().replace("$", ""));
  let titlePrep = $( '.shirt-details h1 span' ).remove();
  let title = $( '.shirt-details h1' ).text().trim();

  let date = new Date();
  let formattedTime = `${addZeroToValue(date.getHours())}:${addZeroToValue(date.getMinutes() + 1)}:${addZeroToValue(date.getSeconds())}`;

  let shirt = {
    Title: title,
    Price: price,
    ImageURL: `http://shirts4mike.com/${picture}`,
    "URL": link,
    Time: formattedTime
  }
  shirts.push(shirt);
  createCSV(shirts);
}

/**
 * This function is used to create a CSV file from the scraped data
 * It used the json2csv node module to generate the csv
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function createCSV(data) {
  const fields = ['Title', 'Price', 'ImageURL', 'URL', 'Time'];
  const opts = { fields };

  try {
    const csv = json2csv(data, opts);
    let date = new Date();
    let formattedDate = `${date.getFullYear()}-${addZeroToValue(date.getMonth() + 1)}-${addZeroToValue(date.getDate())}`;
    fs.writeFileSync(`./data/${formattedDate}.csv`, csv, (err) => {
      if (err) throw err;
      console.log('CSV successfully saved.')
    })
  } catch (err) {
    console.error(err);
    writeToErrorLog(error);
  }
}

/**
 * This function is used to check if a directory exists
 * If the specified directory does not exist it is created
 * @param  {string} dir [name of directory to check for]
 */
function checkDir(dir, callback) {
  fs.open(dir, 'r', (err, fd) => {
    if (err) {
      if (err.code === 'ENOENT') {
        createDirectory(dir);
        return;
      }
    }
  });
}

/**
 * This function is used to create a directory
 * @param  {string} dir [name of directory to create]
 */
function createDirectory(dir) {
  fs.mkdir(dir, err => {
    if (err) {
      if (err.code === 'ENOENT') {
        console.error('The directory could not be created.');
        writeToErrorLog(error);
        return;
      }
      throw err;
    }
  })
}

/**
 * This function is used to write an error to the error log
 * The error message is appended with a timestamp to scraper-error.log
 * @param  {string} error [error to log]
 */
function writeToErrorLog(error) {
  let message = `[${new Date()}] ${error}\n`;
  fs.appendFile('./log/scraper-error.log', message, (err) => {
    if (err) throw err;
  });
}
