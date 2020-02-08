// Check date equality ignoring milliseconds
const dateEqualsNoMilliseconds = (date1, date2) => 
  Math.floor(date1.getTime() / 1000) === Math.floor(date2.getTime() / 1000);

// Check date equality ignoring time
const dateEqualsNoTime = (date1, date2) =>
  Math.floor(date1.getTime() / 86400000) === Math.floor(date2.getTime() / 86400000);

module.exports = { dateEqualsNoMilliseconds, dateEqualsNoTime };
